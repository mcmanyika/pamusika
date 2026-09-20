export type SortDirection = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  dir: SortDirection;
};

export function nextSortState<K extends string>(
  current: SortState<K>,
  key: K,
): SortState<K> {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

export function compareText(left: string, right: string, dir: SortDirection): number {
  const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  return dir === "asc" ? result : -result;
}

export function compareSortValue(
  left: string | number,
  right: string | number,
  dir: SortDirection,
): number {
  if (typeof left === "number" && typeof right === "number") {
    const result = left - right;
    return dir === "asc" ? result : -result;
  }
  return compareText(String(left), String(right), dir);
}

export function sortBy<T>(
  rows: T[],
  value: (row: T) => string | number,
  dir: SortDirection,
): T[] {
  return [...rows].sort((left, right) => compareSortValue(value(left), value(right), dir));
}

export function sortByText<T>(
  rows: T[],
  value: (row: T) => string,
  dir: SortDirection,
): T[] {
  return sortBy(rows, value, dir);
}
