import * as N from './nodes';

export type Store = Map<string, N.ValueNode>;

export type Context = {
  node: N.Node,
  store: Store,
};

export function evaluate(program: N.ProgramNode, stepLimit: number): Store {
  let context: Context = { node: program, store: new Map() };
  for (let steps = 0; !N.isValueNode(context.node) && steps < stepLimit; steps++) {
    context = evaluateOneStep(context);
  }
  return context.store;
}

export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RuntimeError);
    }
  }
}

export class UndefinedVariableError extends RuntimeError {
  public identifier: string;

  constructor(message: string, identifier: string) {
    super(message);
    this.identifier = identifier;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UndefinedVariableError);
    }
  }
}

export class TypeMismatchError extends RuntimeError {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TypeMismatchError);
    }
  }
}

export class NotComparableError extends RuntimeError {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotComparableError);
    }
  }
}

export class IndexOutOfRangeError extends RuntimeError {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IndexOutOfRangeError);
    }
  }
}

export class DivisionByZeroError extends RuntimeError {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DivisionByZeroError);
    }
  }
}

export class NonReferenceError extends RuntimeError {
  constructor(message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NonReferenceError);
    }
  }
}

export function evaluateOneStep(context: Context): Context {
  const { node, store } = context;
  switch (node.tag) {
    case N.NodeTag.Program:
      if (node.statements.length === 0) {
        return { node: { tag: N.NodeTag.Number, number: 0 }, store };
      } else {
        const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.statements[0], store });
        if (N.isValueNode(nextNode)) {
          node.statements.shift();
        } else {
          node.statements[0] = nextNode as N.StatementNode;
        }
        if (node.statements.length === 0) {
          return { node: nextNode, store: nextStore };
        } else {
          return { node, store: nextStore };
        }
      }
    case N.NodeTag.Assign:
      if (N.isRefNode(node.left)) {
        if (N.isValueNode(node.right)) {
          const targetArray = (n: N.RefNode): N.ArrayNode => {
            switch (n.tag) {
              case N.NodeTag.Identifier: {
                const v = context.store.get(n.identifier);
                if (v.tag !== N.NodeTag.Array) throw new TypeMismatchError('Index access target must be an array');
                return v;
              }
              case N.NodeTag.IndexAccess: {
                const v = targetArray(n.ref);
                if (v.items.length <= n.index.number) throw new IndexOutOfRangeError('Index out of range');
                const v2 = v.items[n.index.number];
                if (v2.tag !== N.NodeTag.Array) throw new TypeMismatchError('Index access target must be an array');
                return v2;
              }
            }
          };

          switch (node.left.tag) {
            case N.NodeTag.Identifier:
              store.set(node.left.identifier, node.right);
              break;
            case N.NodeTag.IndexAccess:
              const array = targetArray(node.left.ref);
              array.items[node.left.index.number] = node.right;
              break;
          }
          return { node: node.right, store };
        } else {
          const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.right, store });
          return {
            node: {
              tag: N.NodeTag.Assign,
              left: node.left,
              right: nextNode as N.ExpressionNode,
            },
            store: nextStore,
          };
        }
      } else if (N.isValueNode(node.left)) {
        throw new NonReferenceError('Left hand of assign shoule be a reference');
      } else {
        const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.left, store });
        return {
          node: {
            tag: N.NodeTag.Assign,
            left: nextNode as N.ExpressionNode,
            right: node.right,
          },
          store: nextStore,
        };
      }
    case N.NodeTag.Eval:
      if (N.isValueNode(node.expr)) {
        return { node: node.expr, store };
      } else {
        const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.expr, store });
        return {
          node: {
            tag: N.NodeTag.Eval,
            expr: nextNode
          },
          store: nextStore,
        };
      }
    case N.NodeTag.Identifier:
      if (context.store.has(node.identifier)) {
        return { node: context.store.get(node.identifier), store };
      } else {
        throw new UndefinedVariableError(`Undefined variable: ${node.identifier}`, node.identifier);
      }
    case N.NodeTag.Unary:
      if (N.isValueNode(node.target)) {
        switch (node.op) {
          case N.UnaryOperator.Not:
            if (node.target.tag !== N.NodeTag.Number) throw new TypeMismatchError('A operand of "!" must be a number');
            return {
              node: {
                tag: N.NodeTag.Number,
                number: node.target.number === 0 ? 1 : 0,
              },
              store,
            }
          default:
            throw new Error(`Undefined operator ${N.UnaryOperator[node.op].toLowerCase()}. This may be a bug with AiScript.`);
        }
      } else {
        const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.target, store });
        return {
          node: {
            tag: N.NodeTag.Unary,
            target: nextNode as N.ExpressionNode,
            op: node.op
          },
          store: nextStore,
        };
      }
    case N.NodeTag.Binary:
      switch (node.op) {
        case N.BinaryOperator.Equal:
          return evaluateToValuesThen(node, () => ({
            tag: N.NodeTag.Number,
            number: compare(node.left, node.right) ? 1 : 0,
          }));
        case N.BinaryOperator.NotEqual:
          return evaluateToValuesThen(node, () => ({
            tag: N.NodeTag.Number,
            number: compare(node.left, node.right) ? 0 : 1,
          }));
        case N.BinaryOperator.LessThan:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "<" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "<" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number < node.right.number ? 1 : 0,
            };
          });
        case N.BinaryOperator.LessThanEqual:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "<=" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "<=" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number <= node.right.number ? 1 : 0,
            };
          });
        case N.BinaryOperator.GreaterThan:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of ">" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of ">" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number > node.right.number ? 1 : 0,
            };
          });
        case N.BinaryOperator.GreaterThanEqual:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of ">=" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of ">=" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number >= node.right.number ? 1 : 0,
            };
          });
        case N.BinaryOperator.And:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "&&" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "&&" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number == 0 ? 0 : node.right.number,
            };
          });
        case N.BinaryOperator.Or:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "||" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "||" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number == 1 ? 1 : node.right.number,
            };
          });
        case N.BinaryOperator.Add:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== node.right.tag) throw new TypeMismatchError('Operands of "+" must have same type');
            switch (node.left.tag) {
              case N.NodeTag.Number:
                return {
                  tag: N.NodeTag.Number,
                  number: node.left.number + (node.right as N.NumberNode).number,
                };
              case N.NodeTag.String:
                return {
                  tag: N.NodeTag.String,
                  string: node.left.string + (node.right as N.StringNode).string,
                };
              default:
                throw new TypeMismatchError('Operands of "+" must be numbers or strings');
            }
          });
        case N.BinaryOperator.Sub:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "-" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "-" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number - node.right.number,
            };
          });
        case N.BinaryOperator.Mul:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "*" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "*" must be numbers');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number * node.right.number,
            };
          });
        case N.BinaryOperator.Div:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "/" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "/" must be numbers');
            if (node.right.number === 0) throw new DivisionByZeroError('Cannot divide by zero');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number / node.right.number,
            };
          });
        case N.BinaryOperator.Mod:
          return evaluateToValuesThen(node, () => {
            if (node.left.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "%" must be numbers');
            if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Operands of "%" must be numbers');
            if (node.right.number === 0) throw new DivisionByZeroError('Cannot divide by zero');
            return {
              tag: N.NodeTag.Number,
              number: node.left.number % node.right.number,
            };
          });
        case N.BinaryOperator.IndexAccess:
          if (N.isValueNode(node.left)) {
            if (N.isValueNode(node.right)) { // val[val]
              if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Index must be a number');
              switch (node.left.tag) {
                case N.NodeTag.String:
                  if (node.left.string.length <= node.right.number) throw new IndexOutOfRangeError('Index out of range');
                  return {
                    node: {
                      tag: N.NodeTag.String,
                      string: node.left.string[node.right.number],
                    },
                    store,
                  }
                case N.NodeTag.Array:
                  if (node.left.items.length <= node.right.number) throw new IndexOutOfRangeError('Index out of range');
                  return {
                    node: node.left.items[node.right.number],
                    store,
                  };
                default:
                  throw new TypeMismatchError('Index access target must be a string or an array');
              }
            } else {
              const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.right, store });
              return {
                node: {
                  tag: N.NodeTag.Binary,
                  left: node.left,
                  right: nextNode as N.ExpressionNode,
                  op: node.op
                },
                store: nextStore,
              };
            }
          } else if (N.isRefNode(node.left)) {
            if (N.isValueNode(node.right)) { // ref[val]
              if (node.right.tag !== N.NodeTag.Number) throw new TypeMismatchError('Index must be a number');
              return {
                node: {
                  tag: N.NodeTag.IndexAccess,
                  ref: node.left,
                  index: node.right,
                },
                store,
              };
            } else {
              const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.right, store });
              return {
                node: {
                  tag: N.NodeTag.Binary,
                  left: node.left,
                  right: nextNode as N.ExpressionNode,
                  op: node.op
                },
                store: nextStore,
              };
            }
          } else {
            const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.left, store });
            return {
              node: {
                tag: N.NodeTag.Binary,
                left: nextNode as N.ExpressionNode,
                right: node.right,
                op: node.op
              },
              store: nextStore,
            };
          }
        default:
          throw new Error(`Undefined operator ${N.BinaryOperator[node.op].toLowerCase()}. This may be a bug with AiScript.`);
      }
    case N.NodeTag.IndexAccess:
      const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.ref, store });
      return {
        node: {
          tag: N.NodeTag.Binary,
          left: nextNode as N.ExpressionNode,
          right: node.index,
          op: N.BinaryOperator.IndexAccess,
        },
        store: nextStore,
      };
    case N.NodeTag.If:
      if (N.isValueNode(node.condition)) {
        if (node.condition.tag !== N.NodeTag.Number) throw new TypeMismatchError('A condition of if-statement must be a number');
        return {
          node: node.condition.number !== 0 ? node.thenExpression : node.elseExpression,
          store,
        };
      } else {
        const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.condition, store });
        return {
          node: {
            tag: N.NodeTag.If,
            condition: nextNode as N.ExpressionNode,
            thenExpression: node.thenExpression,
            elseExpression: node.elseExpression,
          },
          store: nextStore,
        }
      }
    case N.NodeTag.Call:
      if (N.isValueNode(node.function)) {
        for (let i = 0; i < node.argumentExpressions.length; i++) {
          const expr = node.argumentExpressions[i];
          if (!N.isValueNode(expr)) {
            const { node: nextNode, store: nextStore } = evaluateOneStep({ node: expr, store });
            node.argumentExpressions[i] = nextNode as N.ExpressionNode;
            return {
              node: {
                tag: N.NodeTag.Call,
                function: node.function,
                argumentExpressions: node.argumentExpressions,
              },
              store: nextStore,
            }
          }
        }
        switch (node.function.tag) {
          case N.NodeTag.Function:
            const mapping = new Map(node.function.parameters.map((p, i) => [p, node.argumentExpressions[i] as N.ValueNode]));
            return {
              node: substitute(node.function.body, mapping),
              store,
            };
          case N.NodeTag.NativeFunction:
            return node.function.funciton(node.argumentExpressions, store);
          default:
            throw new TypeMismatchError('A callee must be a function');
        }
      } else {
        const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.function, store });
        return {
          node: {
            tag: N.NodeTag.Call,
            function: nextNode as N.ExpressionNode,
            argumentExpressions: node.argumentExpressions,
          },
          store: nextStore,
        }
      }
    default:
      throw new Error(`Undefined node ${N.NodeTag[node.tag].toLowerCase()}. This may be a bug with AiScript.`);
  }

  function evaluateToValuesThen(node: N.BinaryNode, f: () => N.ExpressionNode): Context {
    if (N.isValueNode(node.left)) {
      if (N.isValueNode(node.right)) {
        return { node: f(), store };
      } else {
        const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.right, store });
        return {
          node: {
            tag: N.NodeTag.Binary,
            left: node.left,
            right: nextNode as N.ExpressionNode,
            op: node.op
          },
          store: nextStore,
        };
      }
    } else {
      const { node: nextNode, store: nextStore } = evaluateOneStep({ node: node.left, store });
      return {
        node: {
          tag: N.NodeTag.Binary,
          left: nextNode as N.ExpressionNode,
          right: node.right,
          op: node.op
        },
        store: nextStore,
      };
    }
  }
}

function compare(value1: N.ExpressionNode, value2: N.ExpressionNode): boolean {
  if (value1.tag !== value2.tag) return false;

  switch (value1.tag) {
    case N.NodeTag.Number:
      return value1.number === (value2 as N.NumberNode).number;
    case N.NodeTag.String:
      return value1.string === (value2 as N.StringNode).string;
    case N.NodeTag.Array:
      if (value1.items.length !== (value2 as N.ArrayNode).items.length) return false;
      for (let i = 0; i < value1.items.length; i++) {
        if (!compare(value1.items[i], (value2 as N.ArrayNode).items[i])) return false;
      }
      return true;
    case N.NodeTag.Function:
    case N.NodeTag.NativeFunction:
      throw new NotComparableError('Functions cannot be compared');
    default:
      throw new Error(`Undefined comparation for ${N.NodeTag[value1.tag]}. This may be a bug with AiScript.`);
  }
}

function substitute(expr: N.ExpressionNode, mapping: Map<string, N.ExpressionNode>): N.ExpressionNode {
  switch (expr.tag) {
    case N.NodeTag.Number:
    case N.NodeTag.String:
    case N.NodeTag.NativeFunction:
      return expr;
    case N.NodeTag.Array:
      return {
        tag: N.NodeTag.Array,
        items: expr.items.map(item => substitute(item, mapping)),
      };
    case N.NodeTag.Function:
      const usedIdentifiers = new Set<string>(mapping.keys());
      for (const e of Array.from(mapping.values())) {
        for (const v of Array.from(freeVariables(e))) usedIdentifiers.add(v);
      }
      const alphaConversions: [string, string][] = expr.parameters
        .map(from => {
          let to = from;
          while (usedIdentifiers.has(to)) to += '#';
          return [from, to];
        });
      const alphaMapping = new Map(alphaConversions
        .filter(([from, to]) => from !== to)
        .map(([from, to]) => [from, {
          tag: N.NodeTag.Identifier,
          identifier: to,
        } as N.ExpressionNode])
      );
      return {
        tag: N.NodeTag.Function,
        parameters: alphaConversions.map(([from, to]) => to),
        body: substitute(substitute(expr.body, alphaMapping), mapping),
      };
    case N.NodeTag.Program:
      return {
        tag: N.NodeTag.Program,
        statements: expr.statements.map(s => substitute(s, mapping) as N.StatementNode),
      };
    case N.NodeTag.Assign:
      return {
        tag: N.NodeTag.Assign,
        left: substitute(expr.left, mapping),
        right: substitute(expr.right, mapping),
      };
    case N.NodeTag.Eval:
      return {
        tag: N.NodeTag.Eval,
        expr: substitute(expr.expr, mapping),
      };
    case N.NodeTag.Identifier:
      return mapping.has(expr.identifier) ? mapping.get(expr.identifier) : expr;
    case N.NodeTag.Unary:
      return {
        tag: N.NodeTag.Unary,
        target: substitute(expr.target, mapping),
        op: expr.op,
      };
    case N.NodeTag.Binary:
      return {
        tag: N.NodeTag.Binary,
        left: substitute(expr.left, mapping),
        right: substitute(expr.right, mapping),
        op: expr.op,
      };
    case N.NodeTag.IndexAccess:
      return {
        tag: N.NodeTag.IndexAccess,
        ref: substitute(expr.ref, mapping) as N.RefNode,
        index: expr.index,
      };
    case N.NodeTag.If:
      return {
        tag: N.NodeTag.If,
        condition: substitute(expr.condition, mapping),
        thenExpression: substitute(expr.thenExpression, mapping),
        elseExpression: substitute(expr.elseExpression, mapping),
      };
    case N.NodeTag.Call:
      return {
        tag: N.NodeTag.Call,
        function: substitute(expr.function, mapping),
        argumentExpressions: expr.argumentExpressions.map(e => substitute(e, mapping)),
      }
    default:
      throw new Error(`Undefined substitution for ${expr}. This may be a bug with AiScript.`);
  }
}

function freeVariables(expr: N.ExpressionNode): Set<string> {
  const variables = new Set<string>();
  switch (expr.tag) {
    case N.NodeTag.Number:
    case N.NodeTag.String:
    case N.NodeTag.NativeFunction:
      break;
    case N.NodeTag.Array:
      for (const item of expr.items) {
        for (const v of Array.from(freeVariables(item).values())) variables.add(v);
      }
      break;
    case N.NodeTag.Function:
      for (const v of Array.from(freeVariables(expr.body).values())) {
        if (!expr.parameters.includes(v)) variables.add(v);
      }
      break;
    case N.NodeTag.Program:
      for (const s of expr.statements) {
        for (const v of Array.from(freeVariables(s).values())) variables.add(v);
      }
      break;
    case N.NodeTag.Assign:
      for (const v of Array.from(freeVariables(expr.left).values())) variables.add(v);
      for (const v of Array.from(freeVariables(expr.right).values())) variables.add(v);
      break;
    case N.NodeTag.Eval:
      for (const v of Array.from(freeVariables(expr.expr).values())) variables.add(v);
      break;
    case N.NodeTag.Identifier:
      variables.add(expr.identifier);
      break;
    case N.NodeTag.Unary:
      for (const v of Array.from(freeVariables(expr.target).values())) variables.add(v);
      break;
    case N.NodeTag.Binary:
      for (const v of Array.from(freeVariables(expr.left).values())) variables.add(v);
      for (const v of Array.from(freeVariables(expr.right).values())) variables.add(v);
      break;
    case N.NodeTag.IndexAccess:
      for (const v of Array.from(freeVariables(expr.ref).values())) variables.add(v);
      break;
    case N.NodeTag.If:
      for (const v of Array.from(freeVariables(expr.condition).values())) variables.add(v);
      for (const v of Array.from(freeVariables(expr.thenExpression).values())) variables.add(v);
      for (const v of Array.from(freeVariables(expr.elseExpression).values())) variables.add(v);
      break;
    case N.NodeTag.Call:
      for (const v of Array.from(freeVariables(expr.function).values())) variables.add(v);
      for (const e of expr.argumentExpressions) {
        for (const v of Array.from(freeVariables(e).values())) variables.add(v);
      }
      break;
    default:
      throw new Error(`Undefined free variables for ${expr}. This may be a bug with AiScript.`);
  }
  return variables;
}
