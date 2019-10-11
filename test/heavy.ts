import * as assert from 'assert';
import * as N from '../src/nodes';
import { run } from '../src';

describe('evaluate heavy', () => {
  it('sort', () => {
    assert.deepStrictEqual(
      run('a = [9, 3, 8, 6, 2];\
\
sort = \\(i, j) -> {\
  if i < 4 then {\
    if j > i then {\
      if a[j] < a[j - 1] then {\
        t = a[j - 1];\
        a[j - 1] = a[j];\
        a[j] = t;\
      } else {};\
      sort(i, j - 1);\
    } else {\
      sort(i + 1, 4);\
    };\
  } else {};\
};\
\
sort(0, 4);').get('a'),
      {
        tag: N.NodeTag.Array,
        items: [
          { tag: N.NodeTag.Number, number: 2 },
          { tag: N.NodeTag.Number, number: 3 },
          { tag: N.NodeTag.Number, number: 6 },
          { tag: N.NodeTag.Number, number: 8 },
          { tag: N.NodeTag.Number, number: 9 },
        ]
      },
    );
  });

  it('fibonacci', () => {
    assert.deepStrictEqual(
      run('f = \\n -> if n <= 2 then 1 else f(n - 1) + f(n - 2); a = f(10);').get('a'),
      { tag: N.NodeTag.Number, number: 55 },
    );
  });
})
