import assert from 'node:assert/strict';
import test from 'node:test';
import { moveItem } from './reorderItems.js';

test('moving a selected item changes its position without changing item data or the original list', () => {
  const first = { id: 'first', requirement: 'Mandatory' };
  const second = { id: 'second', requirement: 'Optional' };
  const third = { id: 'third', requirement: 'Mandatory' };
  const items = [first, second, third];

  assert.deepEqual(moveItem(items, 1, -1), [second, first, third]);
  assert.deepEqual(moveItem(items, 1, 1), [first, third, second]);
  assert.deepEqual(items, [first, second, third]);
  assert.equal(moveItem(items, 0, -1), items);
  assert.equal(moveItem(items, 2, 1), items);
});
