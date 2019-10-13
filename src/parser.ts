import * as T from './tokens';
import * as N from './nodes';
import * as P from './parser-combinators';

export class SyntaxError extends Error {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SyntaxError);
    }
  }
}

export function parse(tokens: T.Token[]): N.ProgramNode {
  const program = parseProgram(tokens);
  if (program === null) throw new SyntaxError('Syntax error');
  return parseProgram(tokens).value;
}

function parseProgram(tokens: T.Token[]): ParseResult<N.ProgramNode> {
  // P = S*
  const statements: N.StatementNode[] = [];
  while (true) {
    const statement = parseStatement(tokens);
    if (statement === null) break;
    statements.push(statement.value);
    tokens = statement.nextTokens;
  }
  return {
    value: {
      tag: N.NodeTag.Program,
      statements,
    },
    nextTokens: tokens,
  };
}

type ParseResult<T> = { value: T, nextTokens: T.Token[] } | null;

function parseStatement(tokens: T.Token[]): ParseResult<N.StatementNode> {
  // S = E ("=" E ";")?
  const left = parseExpression(tokens);
  if (left === null) return null;
  tokens = left.nextTokens;
  if (tokens.length === 0) return null;
  switch (tokens[0].tag) {
    case T.TokenTag.Equal:
      const right = parseExpression(left.nextTokens.slice(1));
      if (right === null) return null;
      tokens = right.nextTokens;
      if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Semicolon) return null;
      return {
        value: {
          tag: N.NodeTag.Assign,
          left: left.value,
          right: right.value,
        },
        nextTokens: tokens.slice(1),
      };
    case T.TokenTag.Semicolon:
      return {
        value: {
          tag: N.NodeTag.Eval,
          expr: left.value,
        },
        nextTokens: left.nextTokens.slice(1),
      };
    default:
      return null;
  }
}

const identifierParser = token(T.TokenTag.Identifier)
  .map<N.IdentifierNode>((token: T.IdentifierToken) => ({ tag: N.NodeTag.Identifier, identifier: token.identifier }))
  .error(new SyntaxError('Expected an identifier'));

const numberParser = token(T.TokenTag.Number)
  .map<N.NumberNode>((token: T.NumberToken) => ({ tag: N.NodeTag.Number, number: token.number }))
  .error(new SyntaxError('Expected a number'));

const stringParser = token(T.TokenTag.String)
  .map<N.StringNode>((token: T.StringToken) => ({ tag: N.NodeTag.String, string: token.string }))
  .error(new SyntaxError('Expected a string'));

const arrayParser = token(T.TokenTag.OpenSquareBracket).then(_interop(parseExpression).sepBy(token(T.TokenTag.Comma))).skip(token(T.TokenTag.CloseSquareBracket))
  .map<N.ArrayNode>(exprs => ({
    tag: N.NodeTag.Array,
    items: exprs,
  }))
  .error(new SyntaxError('Expected an array'));

const blockParser = token(T.TokenTag.OpenBrace).then(_interop(parseProgram)).skip(token(T.TokenTag.CloseBrace))
  .error(new SyntaxError('Expected a block'));

const paramsParser = P.alt(
  identifierParser.map(identifier => [identifier]),
  token(T.TokenTag.OpenParenthesis).then(identifierParser.sepBy(token(T.TokenTag.Comma))).skip(token(T.TokenTag.CloseParenthesis))
);

const functionParser = P.seq(token(T.TokenTag.BackSlash).then(paramsParser), token(T.TokenTag.Arrow).then(_interop(parseExpression)))
  .map<N.FunctionNode>(([parameters, body]) => ({
    tag: N.NodeTag.Function,
    parameters: parameters.map(parameter => parameter.identifier),
    body,
  }))
  .error(new SyntaxError('Expected a function'));

function parseExpression(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
  const expr9Parser = P.alt(
    token(T.TokenTag.OpenParenthesis).then(_interop(parseExpression)).skip(token(T.TokenTag.CloseParenthesis)),
    functionParser,
    arrayParser,
    blockParser,
    identifierParser,
    numberParser,
    stringParser,
  );

  return parseExpression0(tokens);

  function parseExpression0(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E0 = "if" E "then" E "else" E | E1
    if (tokens.length === 0) return null;
    if (tokens[0].tag === T.TokenTag.If) {
      const condition = parseExpression0(tokens.slice(1));
      if (condition === null) return null;
      tokens = condition.nextTokens;
      if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Then) return null;
      const thenExpr = parseExpression0(tokens.slice(1));
      if (thenExpr === null) return null;
      tokens = thenExpr.nextTokens;
      if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Else) return null;
      const elseExpr = parseExpression0(tokens.slice(1));
      if (elseExpr === null) return null;
      tokens = elseExpr.nextTokens;
      return {
        value: {
          tag: N.NodeTag.If,
          condition: condition.value,
          thenExpression: thenExpr.value,
          elseExpression: elseExpr.value,
        },
        nextTokens: tokens,
      };
    } else {
      return parseExpression1(tokens);
    }
  }

  function parseExpression1(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E1 = E2 ("&&" E2)*
    const expr2 = parseExpression2(tokens);
    if (expr2 === null) return null;
    tokens = expr2.nextTokens;
    const actions: N.ExpressionNode[] = [];
    while (tokens.length !== 0 && tokens[0].tag === T.TokenTag.Or) {
      const expr = parseExpression2(tokens.slice(1));
      if (expr === null) return null;
      tokens = expr.nextTokens;
      actions.push(expr.value);
    }
    return {
      value: actions.reduce((left, right) => ({
        tag: N.NodeTag.Binary,
        left,
        right,
        op: N.BinaryOperator.Or
      }), expr2.value),
      nextTokens: tokens,
    };
  }

  function parseExpression2(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E2 = E3 ("&&" E3)*
    const expr3 = parseExpression3(tokens);
    if (expr3 === null) return null;
    tokens = expr3.nextTokens;
    const actions: N.ExpressionNode[] = [];
    while (tokens.length !== 0 && tokens[0].tag === T.TokenTag.And) {
      const expr = parseExpression3(tokens.slice(1));
      if (expr === null) return null;
      tokens = expr.nextTokens;
      actions.push(expr.value);
    }
    return {
      value: actions.reduce((left, right) => ({
        tag: N.NodeTag.Binary,
        left,
        right,
        op: N.BinaryOperator.And
      }), expr3.value),
      nextTokens: tokens,
    };
  }

  function parseExpression3(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E3 = E4 ("==" E4 | "!=" E4)*
    const expr4 = parseExpression4(tokens);
    if (expr4 === null) return null;
    tokens = expr4.nextTokens;
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && (tokens[0].tag === T.TokenTag.EqualEqual || tokens[0].tag === T.TokenTag.NotEqual)) {
      const op = tokens[0];
      const expr = parseExpression4(tokens.slice(1));
      if (expr === null) return null;
      tokens = expr.nextTokens;
      switch (op.tag) {
        case T.TokenTag.EqualEqual:
          actions.push([N.BinaryOperator.Equal, expr.value]);
          break;
        case T.TokenTag.NotEqual:
          actions.push([N.BinaryOperator.NotEqual, expr.value]);
          break;
      }
    }
    return {
      value: actions.reduce((left, [op, right]) => ({
        tag: N.NodeTag.Binary,
        left,
        right,
        op
      }), expr4.value),
      nextTokens: tokens,
    };
  }

  function parseExpression4(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E4 = E5 ("<" E5 | "<=" E5 | ">" E5 | ">=" E5)*
    const expr5 = parseExpression5(tokens);
    if (expr5 === null) return null;
    tokens = expr5.nextTokens;
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && [T.TokenTag.LessThan, T.TokenTag.LessThanEqual, T.TokenTag.GreaterThan, T.TokenTag.GreaterThanEqual].includes(tokens[0].tag)) {
      const op = tokens[0];
      const expr = parseExpression5(tokens.slice(1));
      if (expr === null) return null;
      tokens = expr.nextTokens;
      switch (op.tag) {
        case T.TokenTag.LessThan:
          actions.push([N.BinaryOperator.LessThan, expr.value]);
          break;
        case T.TokenTag.LessThanEqual:
          actions.push([N.BinaryOperator.LessThanEqual, expr.value]);
          break;
        case T.TokenTag.GreaterThan:
          actions.push([N.BinaryOperator.GreaterThan, expr.value]);
          break;
        case T.TokenTag.GreaterThanEqual:
          actions.push([N.BinaryOperator.GreaterThanEqual, expr.value]);
          break;
      }
    }
    return {
      value: actions.reduce((left, [op, right]) => ({
        tag: N.NodeTag.Binary,
        left,
        right,
        op
      }), expr5.value),
      nextTokens: tokens,
    };
  }

  function parseExpression5(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E5 = E6 ("+" E6 | "-" E6)*
    const expr6 = parseExpression6(tokens);
    if (expr6 === null) return null;
    tokens = expr6.nextTokens;
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && (tokens[0].tag === T.TokenTag.Plus || tokens[0].tag === T.TokenTag.Minus)) {
      const op = tokens[0];
      const expr = parseExpression6(tokens.slice(1));
      if (expr === null) return null;
      tokens = expr.nextTokens;
      switch (op.tag) {
        case T.TokenTag.Plus:
          actions.push([N.BinaryOperator.Add, expr.value]);
          break;
        case T.TokenTag.Minus:
          actions.push([N.BinaryOperator.Sub, expr.value]);
          break;
      }
    }
    return {
      value: actions.reduce((left, [op, right]) => ({
        tag: N.NodeTag.Binary,
        left,
        right,
        op
      }), expr6.value),
      nextTokens: tokens,
    };
  }

  function parseExpression6(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E6 = E7 ("*" E7 | "/" E7 | "%" E7)*
    const expr7 = parseExpression7(tokens);
    if (expr7 === null) return null;
    tokens = expr7.nextTokens;
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && [T.TokenTag.Asterisk, T.TokenTag.Slash, T.TokenTag.Percent].includes(tokens[0].tag)) {
      const op = tokens[0];
      const expr = parseExpression7(tokens.slice(1));
      if (expr === null) return null;
      tokens = expr.nextTokens;
      switch (op.tag) {
        case T.TokenTag.Asterisk:
          actions.push([N.BinaryOperator.Mul, expr.value]);
          break;
        case T.TokenTag.Slash:
          actions.push([N.BinaryOperator.Div, expr.value]);
          break;
        case T.TokenTag.Percent:
          actions.push([N.BinaryOperator.Mod, expr.value]);
          break;
      }
    }
    return {
      value: actions.reduce((left, [op, right]) => ({
        tag: N.NodeTag.Binary,
        left,
        right,
        op
      }), expr7.value),
      nextTokens: tokens,
    };
  }

  function parseExpression7(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E7 = "!" E7 | E8
    if (tokens.length === 0) return null;
    if (tokens[0].tag === T.TokenTag.Not) {
      const expr = parseExpression7(tokens.slice(1));
      return {
        value: {
          tag: N.NodeTag.Unary,
          target: expr.value,
          op: N.UnaryOperator.Not,
        },
        nextTokens: expr.nextTokens,
      };
    } else {
      return parseExpression8(tokens);
    }
  }

  function parseExpression8(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    // E8 = E9 ("(" (E ("," E)*)? ")" | "[" E "]")*
    const expr9 = expr9Parser.parse(new P.Source(tokens, 0));
    if (expr9.tag === P.ParseResultTag.Failure) return null;
    tokens = expr9.source.tokens.slice(expr9.source.offset);
    const argsList: [T.TokenTag.OpenParenthesis | T.TokenTag.OpenSquareBracket, N.ExpressionNode[]][] = [];
    while (tokens.length !== 0 && (tokens[0].tag === T.TokenTag.OpenParenthesis || tokens[0].tag === T.TokenTag.OpenSquareBracket)) {
      switch (tokens[0].tag) {
        case T.TokenTag.OpenParenthesis:
          tokens = tokens.slice(1);
          if (tokens.length === 0) return null;
          if (tokens[0].tag === T.TokenTag.CloseParenthesis) {
            argsList.push([T.TokenTag.OpenParenthesis, []]);
            tokens = tokens.slice(1);
          } else {
            const firstArg = parseExpression0(tokens);
            if (firstArg === null) return null;
            const args = [firstArg.value];
            tokens = firstArg.nextTokens;

            while (tokens.length !== 0 && tokens[0].tag === T.TokenTag.Comma) {
              const arg = parseExpression0(tokens.slice(1));
              if (arg === null) return null;
              tokens = arg.nextTokens;
              args.push(arg.value);
            }
            if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.CloseParenthesis) return null;
            tokens = tokens.slice(1);
            argsList.push([T.TokenTag.OpenParenthesis, args]);
          }
          break;
        case T.TokenTag.OpenSquareBracket:
          tokens = tokens.slice(1);
          if (tokens.length === 0) return null;
          const index = parseExpression0(tokens);
          if (index === null) return null;
          tokens = index.nextTokens;
          if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.CloseSquareBracket) return null;
          tokens = tokens.slice(1);
          argsList.push([T.TokenTag.OpenSquareBracket, [index.value]]);
          break;
      }
    }
    return {
      value: argsList.reduce<N.ExpressionNode>((acc, [tag, args]) => {
        switch (tag) {
          case T.TokenTag.OpenParenthesis:
            return {
              tag: N.NodeTag.Call,
              function: acc,
              argumentExpressions: args
            };
          case T.TokenTag.OpenSquareBracket:
            return {
              tag: N.NodeTag.Binary,
              left: acc,
              right: args[0],
              op: N.BinaryOperator.IndexAccess,
            };
        }
      }, expr9.value),
      nextTokens: tokens,
    };
  }
}

function token(tag: T.TokenTag): P.Parser<T.Token, T.Token, null> {
  return P.when(token => token.tag === tag);
}

// TODO: eliminate this
function _interop<T>(f: (tokens: T.Token[]) => ParseResult<T>): P.Parser<T.Token, T, null> {
  return new P.Parser(source => {
    const program = f(source.tokens.slice(source.offset));
    if (program === null) {
      return { tag: P.ParseResultTag.Failure, error: null };
    } else {
      return { tag: P.ParseResultTag.Success, value: program.value, source: new P.Source(program.nextTokens, 0) };
    }
  })
}
