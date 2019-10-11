import { Context, Store } from './evaluater';

export enum NodeTag {
  Program,
  Assign,
  Eval,
  Number,
  String,
  Array,
  Function,
  NativeFunction,
  Identifier,
  Unary,
  Binary,
  IndexAccess,
  If,
  Call,
}

export enum UnaryOperator {
  Not,
}

export enum BinaryOperator {
  Equal,
  NotEqual,
  LessThan,
  LessThanEqual,
  GreaterThan,
  GreaterThanEqual,
  And,
  Or,
  Add,
  Sub,
  Mul,
  Div,
  Mod,
  IndexAccess,
}

export type ProgramNode = {
  tag: NodeTag.Program,
  statements: StatementNode[],
};

export type AssignNode = {
  tag: NodeTag.Assign,
  left: ExpressionNode,
  right: ExpressionNode,
};

export type EvalNode = {
  tag: NodeTag.Eval,
  expr: ExpressionNode,
};

export type NumberNode = {
  tag: NodeTag.Number,
  number: number,
};

export type StringNode = {
  tag: NodeTag.String,
  string: string,
}

export type ArrayNode = {
  tag: NodeTag.Array,
  items: ExpressionNode[]
}

export type FunctionNode = {
  tag: NodeTag.Function,
  parameters: string[],
  body: ExpressionNode,
};

export type NativeFunction = (argumentExpressions: ExpressionNode[], store: Store) => Context;

export type NativeFunctionNode = {
  tag: NodeTag.NativeFunction,
  funciton: NativeFunction,
}

export type IdentifierNode = {
  tag: NodeTag.Identifier,
  identifier: string,
};

export type UnaryNode = {
  tag: NodeTag.Unary,
  target: ExpressionNode,
  op: UnaryOperator,
};

export type BinaryNode = {
  tag: NodeTag.Binary,
  left: ExpressionNode,
  right: ExpressionNode,
  op: BinaryOperator
};

export type IndexAccessNode = {
  tag: NodeTag.IndexAccess,
  ref: RefNode,
  index: NumberNode,
}

export type IfNode = {
  tag: NodeTag.If,
  condition: ExpressionNode,
  thenExpression: ExpressionNode,
  elseExpression: ExpressionNode,
}

export type CallNode = {
  tag: NodeTag.Call,
  function: ExpressionNode,
  argumentExpressions: ExpressionNode[],
};

export type StatementNode
  = AssignNode
  | EvalNode;

export type ValueNode
  = NumberNode
  | StringNode
  | ArrayNode
  | FunctionNode
  | NativeFunctionNode;

export type RefNode
  = IdentifierNode
  | IndexAccessNode

export type ExpressionNode
  = ValueNode
  | ProgramNode
  | AssignNode
  | EvalNode
  | IdentifierNode
  | UnaryNode
  | BinaryNode
  | IndexAccessNode
  | IfNode
  | CallNode;

export type Node
  = ProgramNode
  | AssignNode
  | EvalNode
  | NumberNode
  | StringNode
  | ArrayNode
  | FunctionNode
  | NativeFunctionNode
  | IdentifierNode
  | UnaryNode
  | BinaryNode
  | IndexAccessNode
  | IfNode
  | CallNode;

export function isValueNode(node: Node): node is ValueNode {
  return node.tag === NodeTag.Number
    || node.tag === NodeTag.String
    || node.tag === NodeTag.Array
    || node.tag === NodeTag.Function
    || node.tag === NodeTag.NativeFunction;
}

export function isRefNode(node: Node): node is RefNode {
  return node.tag === NodeTag.Identifier
    || node.tag === NodeTag.IndexAccess;
}
