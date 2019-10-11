import * as N from './nodes';
import { evaluate, Store } from './evaluater';
import { parse } from './parser';
import { scan } from './scanner';

export type RunOption = {
  store?: Store,
  stepLimit?: number;
};

export function run(source: string): Store;
export function run(source: string, options: RunOption): Store;
export function run(source: string, options?: RunOption): Store {
  if (typeof options === 'undefined') options = {};
  if (typeof options.store === 'undefined') options.store = new Map();
  if (typeof options.stepLimit === 'undefined') options.stepLimit = Infinity;
  const program = parse(scan(source));
  const storeAssigns = Array.from(options.store.entries()).map<N.AssignNode>(([k, v]) => ({
    tag: N.NodeTag.Assign,
    left: {
      tag: N.NodeTag.Identifier,
      identifier: k
    },
    right: v
  }));
  program.statements = (storeAssigns as N.StatementNode[]).concat(program.statements);
  return evaluate(program, options.stepLimit);
}
