import * as assert from 'assert';
import * as N from '../src/nodes';
import { run } from '../src';

describe('evaluate basics', () => {
  it('assign', () => {
    assert.deepStrictEqual(
      run('foo = 3;'),
      new Map([
        ['foo', { tag: N.NodeTag.Number, number: 3 }],
      ]),
    );
  });

  it('multiline', () => {
    assert.deepStrictEqual(
      run('foo = 3;\nbar = 5;'),
      new Map([
        ['foo', { tag: N.NodeTag.Number, number: 3 }],
        ['bar', { tag: N.NodeTag.Number, number: 5 }],
      ]),
    );
  });

  it('identifier on rhs of assign', () => {
    assert.deepStrictEqual(
      run('foo = 3; bar = foo + 2;'),
      new Map([
        ['foo', { tag: N.NodeTag.Number, number: 3 }],
        ['bar', { tag: N.NodeTag.Number, number: 5 }],
      ]),
    );
  });

  it('eval', () => {
    assert.deepStrictEqual(
      run('3 + 5;'),
      new Map([]),
    );
  });

  it('equal', () => {
    assert.deepStrictEqual(
      run('foo = 6 == 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 0 },
    );
  });

  it('not equal', () => {
    assert.deepStrictEqual(
      run('foo = 6 != 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 1 },
    );
  });

  it('less than', () => {
    assert.deepStrictEqual(
      run('foo = 3 < 4;').get('foo'),
      { tag: N.NodeTag.Number, number: 1 },
    );
  });

  it('less than equal', () => {
    assert.deepStrictEqual(
      run('foo = 3 <= 4;').get('foo'),
      { tag: N.NodeTag.Number, number: 1 },
    );
  });


  it('greater than', () => {
    assert.deepStrictEqual(
      run('foo = 3 > 4;').get('foo'),
      { tag: N.NodeTag.Number, number: 0 },
    );
  });

  it('greater than equal', () => {
    assert.deepStrictEqual(
      run('foo = 3 >= 4;').get('foo'),
      { tag: N.NodeTag.Number, number: 0 },
    );
  });

  it('and', () => {
    assert.deepStrictEqual(
      run('foo = 1 && 0;').get('foo'),
      { tag: N.NodeTag.Number, number: 0 },
    );
  });

  it('or', () => {
    assert.deepStrictEqual(
      run('foo = 0 || 1;').get('foo'),
      { tag: N.NodeTag.Number, number: 1 },
    );
  });

  it('not', () => {
    assert.deepStrictEqual(
      run('foo = !0;').get('foo'),
      { tag: N.NodeTag.Number, number: 1 },
    );
  });

  it('addition', () => {
    assert.deepStrictEqual(
      run('foo = 6 + 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 9 },
    );
  });

  it('subtraction', () => {
    assert.deepStrictEqual(
      run('foo = 6 - 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 3 },
    );
  });

  it('multiplication', () => {
    assert.deepStrictEqual(
      run('foo = 6 * 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 18 },
    );
  });

  it('division', () => {
    assert.deepStrictEqual(
      run('foo = 6 / 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 2 },
    );
  });

  it('modulus', () => {
    assert.deepStrictEqual(
      run('foo = 7 % 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 1 },
    );
  });

  it('if true', () => {
    assert.deepStrictEqual(
      run('foo = if 1 then 3 else 5;').get('foo'),
      { tag: N.NodeTag.Number, number: 3 },
    );
  });

  it('if false', () => {
    assert.deepStrictEqual(
      run('foo = if 0 then 3 else 5;').get('foo'),
      { tag: N.NodeTag.Number, number: 5 },
    );
  });

  it('subtraction is left associative', () => {
    assert.deepStrictEqual(
      run('foo = 6 - 1 - 2;').get('foo'),
      { tag: N.NodeTag.Number, number: 3 },
    );
  });

  it('operator precedence', () => {
    assert.deepStrictEqual(
      run('foo = 1 + 2 * 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 7 },
    );
  });

  it('operator precedence with parens', () => {
    assert.deepStrictEqual(
      run('foo = (1 + 2) * 3;').get('foo'),
      { tag: N.NodeTag.Number, number: 9 },
    );
  });

  it('nullary function', () => {
    assert.deepStrictEqual(
      run('f = \\() -> 5; foo = f();'),
      new Map([
        ['f', { tag: N.NodeTag.Function, parameters: [], body: { tag: N.NodeTag.Number, number: 5 } }],
        ['foo', { tag: N.NodeTag.Number, number: 5 }],
      ]),
    );
  });

  it('unary function', () => {
    assert.deepStrictEqual(
      run('f = \\x -> x + 3; foo = f(2);'),
      new Map([
        ['f', {
          tag: N.NodeTag.Function,
          parameters: ['x'],
          body: { tag: N.NodeTag.Binary, left: { tag: N.NodeTag.Identifier, identifier: 'x' }, right: { tag: N.NodeTag.Number, number: 3 }, op: N.BinaryOperator.Add }
        }],
        ['foo', { tag: N.NodeTag.Number, number: 5 }],
      ]),
    );
  });

  it('unary function with parens on a param', () => {
    assert.deepStrictEqual(
      run('f = \\(x) -> x + 3; foo = f(2);'),
      new Map([
        ['f', {
          tag: N.NodeTag.Function,
          parameters: ['x'],
          body: { tag: N.NodeTag.Binary, left: { tag: N.NodeTag.Identifier, identifier: 'x' }, right: { tag: N.NodeTag.Number, number: 3 }, op: N.BinaryOperator.Add }
        }],
        ['foo', { tag: N.NodeTag.Number, number: 5 }],
      ]),
    );
  });

  it('binary function', () => {
    assert.deepStrictEqual(
      run('f = \\(a, b) -> a + b; foo = f(2, 3);'),
      new Map([
        ['f', {
          tag: N.NodeTag.Function,
          parameters: ['a', 'b'],
          body: { tag: N.NodeTag.Binary, left: { tag: N.NodeTag.Identifier, identifier: 'a' }, right: { tag: N.NodeTag.Identifier, identifier: 'b' }, op: N.BinaryOperator.Add }
        }],
        ['foo', { tag: N.NodeTag.Number, number: 5 }],
      ]),
    );
  });

  it('higher order function', () => {
    assert.deepStrictEqual(
      run('foo = (\\x -> x)(\\y -> y)(5);').get('foo'),
      { tag: N.NodeTag.Number, number: 5 },
    );
  });

  it('recursion', () => {
    assert.deepStrictEqual(
      run('f = \\n -> if n == 0 then 0 else f(0) + n; a = f(10);').get('a'),
      { tag: N.NodeTag.Number, number: 10 },
    );
  });

  it('curried function', () => {
    assert.deepStrictEqual(
      run('f = \\x -> \\y -> x + y; a = f(3)(5);'),
      new Map([
        ['f', {
          tag: N.NodeTag.Function,
          parameters: ['x'],
          body: {
            tag: N.NodeTag.Function,
            parameters: ['y'],
            body: {
              tag: N.NodeTag.Binary,
              left: { tag: N.NodeTag.Identifier, identifier: 'x' },
              right: { tag: N.NodeTag.Identifier, identifier: 'y' },
              op: N.BinaryOperator.Add,
            }
          }
        }],
        ['a', { tag: N.NodeTag.Number, number: 8 }],
      ]),
    );
  });

  it('rename params when collision', () => {
    assert.deepStrictEqual(
      run('b = 3; foo = (\\a -> (\\a -> a))(\\b -> b);').get('foo'),
      {
        tag: N.NodeTag.Function,
        parameters: ['a#'],
        body: {
          tag: N.NodeTag.Identifier,
          identifier: 'a#'
        }
      }
    );
  });

  it('rename params when collision 2', () => {
    assert.deepStrictEqual(
      run('b = 3; foo = (\\a -> (\\b -> a(b)))(\\c -> b);').get('foo'),
      {
        tag: N.NodeTag.Function,
        parameters: ['b#'],
        body: {
          tag: N.NodeTag.Call,
          function: {
            tag: N.NodeTag.Function,
            parameters: ['c'],
            body: {
              tag: N.NodeTag.Identifier,
              identifier: 'b'
            },
          },
          argumentExpressions: [{
            tag: N.NodeTag.Identifier,
            identifier: 'b#'
          }]
        }
      }
    );
  });

  it('native function', () => {
    assert.deepStrictEqual(
      run('a = f(3, 2);', {
        store: new Map([
          ['f', {
            tag: N.NodeTag.NativeFunction, funciton: (args, store) => {
              if (args.length !== 2) throw 'mismatch args length';
              if (args[0].tag !== N.NodeTag.Number) throw 'first arg must be number';
              if (args[1].tag !== N.NodeTag.Number) throw 'second arg must be number';
              return {
                node: {
                  tag: N.NodeTag.Number,
                  number: args[0].number + args[1].number
                },
                store
              };
            }
          }],
        ]),
      }).get('a'),
      { tag: N.NodeTag.Number, number: 5 }
    );
  });

  it('step limit', () => {
    assert.deepStrictEqual(
      run('a = 3; b = 4; c = 5;', {
        stepLimit: 2,
      }),
      new Map([
        ['a', { tag: N.NodeTag.Number, number: 3 }],
        ['b', { tag: N.NodeTag.Number, number: 4 }],
      ]),
    );
  });

  it('string', () => {
    assert.deepStrictEqual(
      run('foo = "abc";').get('foo'),
      { tag: N.NodeTag.String, string: 'abc' },
    );
  });

  it('string escape', () => {
    assert.deepStrictEqual(
      run('foo = "ab\\ncd";').get('foo'),
      { tag: N.NodeTag.String, string: 'ab\ncd' },
    );
  });

  it('string escape 2', () => {
    assert.deepStrictEqual(
      run('foo = "ab\\"cd";').get('foo'),
      { tag: N.NodeTag.String, string: 'ab"cd' },
    );
  });

  it('string escape 3', () => {
    assert.deepStrictEqual(
      run('foo = "ab\\\\";').get('foo'),
      { tag: N.NodeTag.String, string: 'ab\\' },
    );
  });

  it('string append', () => {
    assert.deepStrictEqual(
      run('foo = "abc" + "def";').get('foo'),
      { tag: N.NodeTag.String, string: 'abcdef' },
    );
  });

  it('string index access', () => {
    assert.deepStrictEqual(
      run('foo = "abcd"[1];').get('foo'),
      { tag: N.NodeTag.String, string: 'b' },
    );
  });

  it('array', () => {
    assert.deepStrictEqual(
      run('foo = [1, 2, 3];').get('foo'),
      {
        tag: N.NodeTag.Array,
        items: [
          { tag: N.NodeTag.Number, number: 1 },
          { tag: N.NodeTag.Number, number: 2 },
          { tag: N.NodeTag.Number, number: 3 },
        ]
      },
    );
  });

  it('empty array', () => {
    assert.deepStrictEqual(
      run('foo = [];').get('foo'),
      {
        tag: N.NodeTag.Array,
        items: [],
      },
    );
  });

  it('array of array', () => {
    assert.deepStrictEqual(
      run('foo = [[3, 1], [4], [1, 5, 9]];').get('foo'),
      {
        tag: N.NodeTag.Array,
        items: [
          {
            tag: N.NodeTag.Array,
            items: [
              { tag: N.NodeTag.Number, number: 3 },
              { tag: N.NodeTag.Number, number: 1 },
            ]
          },
          {
            tag: N.NodeTag.Array,
            items: [
              { tag: N.NodeTag.Number, number: 4 },
            ]
          },
          {
            tag: N.NodeTag.Array,
            items: [
              { tag: N.NodeTag.Number, number: 1 },
              { tag: N.NodeTag.Number, number: 5 },
              { tag: N.NodeTag.Number, number: 9 },
            ]
          },
        ]
      },
    );
  });

  it('array index access', () => {
    assert.deepStrictEqual(
      run('foo = [3, 1, 4, 1][2];').get('foo'),
      { tag: N.NodeTag.Number, number: 4 },
    );
  });

  it('array index access 2', () => {
    assert.deepStrictEqual(
      run('a = [3, 1, 4, 1]; foo = a[2];').get('foo'),
      { tag: N.NodeTag.Number, number: 4 },
    );
  });


  it('array update', () => {
    assert.deepStrictEqual(
      run('foo = [3, 1, 4, 1]; foo[1] = 100;').get('foo'),
      {
        tag: N.NodeTag.Array,
        items: [
          { tag: N.NodeTag.Number, number: 3 },
          { tag: N.NodeTag.Number, number: 100 },
          { tag: N.NodeTag.Number, number: 4 },
          { tag: N.NodeTag.Number, number: 1 },
        ]
      },
    );
  });

  it('array of array update', () => {
    assert.deepStrictEqual(
      run('foo = [[3, 1], [4], [1, 5, 9]]; foo[2][1] = 7;').get('foo'),
      {
        tag: N.NodeTag.Array,
        items: [
          {
            tag: N.NodeTag.Array,
            items: [
              { tag: N.NodeTag.Number, number: 3 },
              { tag: N.NodeTag.Number, number: 1 },
            ]
          },
          {
            tag: N.NodeTag.Array,
            items: [
              { tag: N.NodeTag.Number, number: 4 },
            ]
          },
          {
            tag: N.NodeTag.Array,
            items: [
              { tag: N.NodeTag.Number, number: 1 },
              { tag: N.NodeTag.Number, number: 7 },
              { tag: N.NodeTag.Number, number: 9 },
            ]
          },
        ]
      },
    );
  });

  it('hetero array', () => {
    assert.deepStrictEqual(
      run('foo = [3, "abc", \\x -> x + 2];').get('foo'),
      {
        tag: N.NodeTag.Array,
        items: [
          { tag: N.NodeTag.Number, number: 3 },
          { tag: N.NodeTag.String, string: "abc" },
          {
            tag: N.NodeTag.Function,
            parameters: ['x'],
            body: {
              tag: N.NodeTag.Binary,
              left: { tag: N.NodeTag.Identifier, identifier: 'x' },
              right: { tag: N.NodeTag.Number, number: 2 },
              op: N.BinaryOperator.Add
            },
          },
        ]
      },
    );
  });
});
