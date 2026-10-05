export function moveItem(items, index, direction) {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered;
}
