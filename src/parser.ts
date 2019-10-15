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
  // S = E ("=" E)? ";"
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

type Parser<N> = P.Parser<T.Token, N, null>;

const parsers = P.lazy<{
  program: Parser<N.ProgramNode>,
  ident: Parser<N.IdentifierNode>,
  number: Parser<N.NumberNode>,
  string: Parser<N.StringNode>,
  array: Parser<N.ArrayNode>,
  block: Parser<N.ExpressionNode>,
  params: Parser<N.IdentifierNode[]>,
  args: Parser<N.ExpressionNode[]>,
  indexAccess: Parser<N.ExpressionNode>,
  func: Parser<N.FunctionNode>,
  expr: Parser<N.ExpressionNode>,
  expr9: Parser<N.ExpressionNode>,
  expr8: Parser<N.ExpressionNode>,
  expr7: Parser<N.ExpressionNode>,
  expr6: Parser<N.ExpressionNode>,
  expr5: Parser<N.ExpressionNode>,
  expr4: Parser<N.ExpressionNode>,
  expr3: Parser<N.ExpressionNode>,
  expr2: Parser<N.ExpressionNode>,
  expr1: Parser<N.ExpressionNode>,
  expr0: Parser<N.ExpressionNode>,
}>({
  program: r => _interop(parseProgram),
  ident: r => token(T.TokenTag.Identifier)
    .map((token: T.IdentifierToken) => ({ tag: N.NodeTag.Identifier, identifier: token.identifier })),
  number: r => token(T.TokenTag.Number)
    .map((token: T.NumberToken) => ({ tag: N.NodeTag.Number, number: token.number })),
  string: r => token(T.TokenTag.String)
    .map((token: T.StringToken) => ({ tag: N.NodeTag.String, string: token.string })),
  array: r => token(T.TokenTag.OpenSquareBracket).then(r.expr.sepBy(token(T.TokenTag.Comma))).skip(token(T.TokenTag.CloseSquareBracket))
    .map(exprs => ({ tag: N.NodeTag.Array, items: exprs })),
  block: r => token(T.TokenTag.OpenBrace).then(r.program).skip(token(T.TokenTag.CloseBrace)),
  params: r => P.alt(
    r.ident.map(identifier => [identifier]),
    token(T.TokenTag.OpenParenthesis).then(r.ident.sepBy(token(T.TokenTag.Comma))).skip(token(T.TokenTag.CloseParenthesis))
  ),
  func: r => P.seq(token(T.TokenTag.BackSlash).then(r.params), token(T.TokenTag.Arrow).then(r.expr))
    .map(([parameters, body]) => ({ tag: N.NodeTag.Function, parameters: parameters.map(parameter => parameter.identifier), body })),
  args: r => token(T.TokenTag.OpenParenthesis).then(r.expr.sepBy(token(T.TokenTag.Comma))).skip(token(T.TokenTag.CloseParenthesis)),
  indexAccess: r => token(T.TokenTag.OpenSquareBracket).then(r.expr).skip(token(T.TokenTag.CloseSquareBracket)),
  expr: r => _interop(parseExpression),
  expr9: r => P.alt(
    token(T.TokenTag.OpenParenthesis).then(r.expr).skip(token(T.TokenTag.CloseParenthesis)),
    r.func,
    r.array,
    r.block,
    r.ident,
    r.number,
    r.string,
  ),
  expr8: r => P.seq(r.expr9,
    P.alt(
      r.args.map<(expr: N.ExpressionNode) => N.ExpressionNode>(args => expr => ({
        tag: N.NodeTag.Call,
        function: expr,
        argumentExpressions: args,
      })),
      r.indexAccess.map<(expr: N.ExpressionNode) => N.ExpressionNode>(index => expr => ({
        tag: N.NodeTag.Binary,
        left: expr,
        right: index,
        op: N.BinaryOperator.IndexAccess,
      }))
    ).many())
    .map(([base, actions]) => actions.reduce((acc, action) => action(acc), base)),
  expr7: r => P.seq(token(T.TokenTag.Not).many(), r.expr8)
    .map<N.ExpressionNode>(([ops, expr]) => ops.length % 2 == 0 ? expr : {
      tag: N.NodeTag.Unary,
      target: expr,
      op: N.UnaryOperator.Not,
    }),
  expr6: r => _interop((tokens: T.Token[]) => {
    const expr7 = r.expr7.parse(new P.Source(tokens, 0));
    if (expr7.tag === P.ParseResultTag.Failure) return null;
    tokens = expr7.source.tokens.slice(expr7.source.offset);
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && [T.TokenTag.Asterisk, T.TokenTag.Slash, T.TokenTag.Percent].includes(tokens[0].tag)) {
      const op = tokens[0];
      const expr = r.expr7.parse(new P.Source(tokens, 1));
      if (expr.tag === P.ParseResultTag.Failure) return null;
      tokens = expr.source.tokens.slice(expr.source.offset);
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
  }),
  expr5: r => _interop((tokens: T.Token[]) => {
    const expr6 = _binterop(r.expr6)(tokens);
    if (expr6 === null) return null;
    tokens = expr6.nextTokens;
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && (tokens[0].tag === T.TokenTag.Plus || tokens[0].tag === T.TokenTag.Minus)) {
      const op = tokens[0];
      const expr = _binterop(r.expr6)(tokens.slice(1));
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
  }),
  expr4: r => _interop((tokens: T.Token[]) => {
    const expr5 = _binterop(r.expr5)(tokens);
    if (expr5 === null) return null;
    tokens = expr5.nextTokens;
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && [T.TokenTag.LessThan, T.TokenTag.LessThanEqual, T.TokenTag.GreaterThan, T.TokenTag.GreaterThanEqual].includes(tokens[0].tag)) {
      const op = tokens[0];
      const expr = _binterop(r.expr5)(tokens.slice(1));
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
  }),
  expr3: r => _interop((tokens: T.Token[]) => {
    const expr4 = _binterop(r.expr4)(tokens);
    if (expr4 === null) return null;
    tokens = expr4.nextTokens;
    const actions: [N.BinaryOperator, N.ExpressionNode][] = [];
    while (tokens.length !== 0 && (tokens[0].tag === T.TokenTag.EqualEqual || tokens[0].tag === T.TokenTag.NotEqual)) {
      const op = tokens[0];
      const expr = _binterop(r.expr4)(tokens.slice(1));
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
  }),
  expr2: r => _interop((tokens: T.Token[]) => {
    const expr3 = _binterop(r.expr3)(tokens);
    if (expr3 === null) return null;
    tokens = expr3.nextTokens;
    const actions: N.ExpressionNode[] = [];
    while (tokens.length !== 0 && tokens[0].tag === T.TokenTag.And) {
      const expr = _binterop(r.expr3)(tokens.slice(1));
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
  }),
  expr1: r => _interop((tokens: T.Token[]) => {
    const expr2 = _binterop(r.expr2)(tokens);
    if (expr2 === null) return null;
    tokens = expr2.nextTokens;
    const actions: N.ExpressionNode[] = [];
    while (tokens.length !== 0 && tokens[0].tag === T.TokenTag.Or) {
      const expr = _binterop(r.expr2)(tokens.slice(1));
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
  }),
  expr0: r => _interop((tokens: T.Token[]) => {
    if (tokens.length === 0) return null;
    if (tokens[0].tag === T.TokenTag.If) {
      const condition = _binterop(r.expr)(tokens.slice(1));
      if (condition === null) return null;
      tokens = condition.nextTokens;
      if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Then) return null;
      const thenExpr = _binterop(r.expr)(tokens.slice(1));
      if (thenExpr === null) return null;
      tokens = thenExpr.nextTokens;
      if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Else) return null;
      const elseExpr = _binterop(r.expr)(tokens.slice(1));
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
      return _binterop(r.expr1)(tokens);
    }
  }),
});

function parseExpression(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
  return _binterop(parsers.expr0)(tokens);
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

// TODO: eliminate this
function _binterop<T>(p: P.Parser<T.Token, T, null>): (tokens: T.Token[]) => ParseResult<T> {
  return tokens => {
    const r = p.parse(new P.Source(tokens, 0));
    if (r.tag === P.ParseResultTag.Failure) return null;
    return { value: r.value, nextTokens: r.source.tokens.slice(r.source.offset) };
  };
}
