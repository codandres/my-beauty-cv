/**
 * Immutable updates by path, e.g. ['sections', 2, 'entries', 0, 'title']. Only objects along
 * the path are copied; everything else keeps its identity, and copies inherit the original's
 * key (see keyOf), so list items stay the "same" item to the UI across edits.
 */

export type Path = readonly (string | number)[];

type Container = Record<string | number, unknown> | unknown[];

const keys = new WeakMap<object, number>();
let nextKey = 1;

/** A stable key for an object (list item, section, …) that survives immutable edits. */
export function keyOf(value: object): number {
  let key = keys.get(value);
  if (key === undefined) {
    key = nextKey++;
    keys.set(value, key);
  }
  return key;
}

function copy<T extends Container>(value: T): T {
  const clone = (Array.isArray(value) ? [...value] : { ...value }) as T;
  keys.set(clone, keyOf(value));
  return clone;
}

export function pathKey(path: Path): string {
  return path.join('.');
}

export function getIn(root: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (node, segment) => (node as Record<string | number, unknown> | undefined)?.[segment],
    root,
  );
}

/** Returns a copy of `root` with `value` at `path`; `undefined` deletes an object key. */
export function setIn<T>(root: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path as [string | number, ...(string | number)[]];
  const node = copy(root as Container) as Record<string | number, unknown>;
  const next = setIn(node[head], rest, value);
  if (next === undefined && !Array.isArray(node)) Reflect.deleteProperty(node, head);
  else node[head] = next;
  return node as T;
}

export function updateList<T>(root: T, path: Path, update: (list: unknown[]) => unknown[]): T {
  const list = getIn(root, path) as unknown[];
  const next = update([...list]);
  keys.set(next, keyOf(list));
  return setIn(root, path, next);
}

export const insertAt = <T>(root: T, path: Path, index: number, item: unknown): T =>
  updateList(root, path, (list) => (list.splice(index, 0, item), list));

export const removeAt = <T>(root: T, path: Path, index: number): T =>
  updateList(root, path, (list) => (list.splice(index, 1), list));

/** Moves the item at `from` so it ends up at index `to`. */
export function move<T>(root: T, path: Path, from: number, to: number): T {
  if (from === to) return root;
  return updateList(root, path, (list) => {
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    return list;
  });
}
