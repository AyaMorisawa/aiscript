import * as T from './tokens';
import * as N from './nodes';

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

function parseIdentifier(tokens: T.Token[]): ParseResult<N.IdentifierNode> {
  if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Identifier) return null;
  return {
    value: {
      tag: N.NodeTag.Identifier,
      identifier: tokens[0].identifier,
    },
    nextTokens: tokens.slice(1),
  };
}

function parseNumber(tokens: T.Token[]): ParseResult<N.NumberNode> {
  if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Number) return null;
  return {
    value: {
      tag: N.NodeTag.Number,
      number: tokens[0].number,
    },
    nextTokens: tokens.slice(1),
  };
}

function parseString(tokens: T.Token[]): ParseResult<N.StringNode> {
  if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.String) return null;
  return {
    value: {
      tag: N.NodeTag.String,
      string: tokens[0].string,
    },
    nextTokens: tokens.slice(1),
  };
}

function parseExpression(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
  return parseExpression0(tokens);

  function parseExpression0(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
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
    const expr9 = parseExpression9(tokens);
    if (expr9 === null) return null;
    tokens = expr9.nextTokens;


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

  function parseExpression9(tokens: T.Token[]): ParseResult<N.ExpressionNode> {
    if (tokens.length === 0) return null;
    if (tokens[0].tag === T.TokenTag.OpenSquareBracket) {
      tokens = tokens.slice(1);
      const items: N.ExpressionNode[] = []

      if (tokens[0].tag === T.TokenTag.CloseSquareBracket) {
        tokens = tokens.slice(1);
      } else {
        const firstItem = parseExpression0(tokens);
        if (firstItem === null) return null;
        items.push(firstItem.value);
        tokens = firstItem.nextTokens;
        while (tokens.length !== 0 && tokens[0].tag === T.TokenTag.Comma) {
          const item = parseExpression0(tokens.slice(1));
          if (item === null) return null;
          items.push(item.value);
          tokens = item.nextTokens;
        }
        if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.CloseSquareBracket) return null;
        tokens = tokens.slice(1);
      }
      return {
        value: {
          tag: N.NodeTag.Array,
          items,
        },
        nextTokens: tokens
      };
    } else if (tokens[0].tag === T.TokenTag.BackSlash) {
      tokens = tokens.slice(1);
      if (tokens.length === 0) return null;
      if (tokens[0].tag === T.TokenTag.OpenParenthesis) {
        tokens = tokens.slice(1);
        if (tokens.length === 0) return null;
        if (tokens[0].tag === T.TokenTag.CloseParenthesis) {
          tokens = tokens.slice(1);
          if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Arrow) return null;
          const expr = parseExpression0(tokens.slice(1));
          if (expr === null) return null;
          return {
            value: {
              tag: N.NodeTag.Function,
              parameters: [],
              body: expr.value,
            },
            nextTokens: expr.nextTokens,
          }
        } else if (tokens[0].tag === T.TokenTag.Identifier) {
          const parameters = [tokens[0].identifier];
          tokens = tokens.slice(1);
          while (tokens.length > 0 && tokens[0].tag !== T.TokenTag.CloseParenthesis) {
            if (tokens[0].tag !== T.TokenTag.Comma) return null;
            const identifier = parseIdentifier(tokens.slice(1));
            if (identifier === null) return null;
            tokens = identifier.nextTokens;
            parameters.push(identifier.value.identifier);
          }
          tokens = tokens.slice(1);
          if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Arrow) return null;
          const expr = parseExpression0(tokens.slice(1));
          if (expr === null) return null;
          return {
            value: {
              tag: N.NodeTag.Function,
              parameters: parameters,
              body: expr.value,
            },
            nextTokens: expr.nextTokens,
          }
        } else {
          return null;
        }
      } else if (tokens[0].tag === T.TokenTag.Identifier) {
        const parameter = tokens[0].identifier;
        tokens = tokens.slice(1);
        if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.Arrow) return null;
        const expr = parseExpression0(tokens.slice(1));
        if (expr === null) return null;
        return {
          value: {
            tag: N.NodeTag.Function,
            parameters: [parameter],
            body: expr.value,
          },
          nextTokens: expr.nextTokens,
        }
      } else {
        return null;
      }
    } else if (tokens[0].tag === T.TokenTag.OpenParenthesis) {
      const expr = parseExpression0(tokens.slice(1));
      if (expr === null) return null;
      tokens = expr.nextTokens;
      if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.CloseParenthesis) return null;
      return {
        value: expr.value,
        nextTokens: tokens.slice(1),
      }
    } else if (tokens[0].tag === T.TokenTag.OpenBrace) {
      const program = parseProgram(tokens.slice(1));
      if (program === null) return null;
      tokens = program.nextTokens;
      if (tokens.length === 0 || tokens[0].tag !== T.TokenTag.CloseBrace) return null;
      return {
        value: program.value,
        nextTokens: tokens.slice(1),
      }
    } else {
      const identifier = parseIdentifier(tokens);
      if (identifier !== null) return identifier;
      const number = parseNumber(tokens);
      if (number !== null) return number;
      const string = parseString(tokens);
      if (string !== null) return string;
      return null;
    }
  }
}

