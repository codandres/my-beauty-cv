import { describe, expect, it } from 'vitest';
import { getIn, insertAt, keyOf, move, removeAt, setIn } from './path';

const sample = () => ({ a: { b: [{ x: 1 }, { x: 2 }, { x: 3 }] }, c: { d: 1 } });

describe('path updates', () => {
  it('sets a nested value without mutating or copying unrelated branches', () => {
    const root = sample();
    const next = setIn(root, ['a', 'b', 1, 'x'], 20);
    expect(getIn(next, ['a', 'b', 1, 'x'])).toBe(20);
    expect(root.a.b[1]!.x).toBe(2);
    expect(next.c).toBe(root.c);
    expect(next.a.b[0]).toBe(root.a.b[0]);
  });

  it('keeps item keys stable across edits', () => {
    const root = sample();
    const next = setIn(root, ['a', 'b', 1, 'x'], 20);
    expect(keyOf(next.a.b[1]!)).toBe(keyOf(root.a.b[1]!));
    expect(keyOf(next.a.b)).toBe(keyOf(root.a.b));
  });

  it('deletes object keys set to undefined', () => {
    expect('d' in setIn(sample(), ['c', 'd'], undefined).c).toBe(false);
  });

  it('inserts, removes and moves list items', () => {
    const root = sample();
    const ids = root.a.b.map(keyOf);
    expect(insertAt(root, ['a', 'b'], 1, { x: 9 }).a.b.map((i) => i.x)).toEqual([1, 9, 2, 3]);
    expect(removeAt(root, ['a', 'b'], 0).a.b.map((i) => i.x)).toEqual([2, 3]);
    const moved = move(root, ['a', 'b'], 0, 2);
    expect(moved.a.b.map((i) => i.x)).toEqual([2, 3, 1]);
    expect(moved.a.b.map(keyOf)).toEqual([ids[1], ids[2], ids[0]]);
  });
});
