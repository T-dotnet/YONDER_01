import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorkspace, reducer } from './model.js';
import { outcomeDropdownOptions, withConsistentOutcomeNameCodes } from './assessmentOutcome.js';

test('the same outcome name keeps one code across decision groups', () => {
  const state = createDefaultWorkspace();
  const option = { type: 'ADD_OUTCOME_DROPDOWN_OPTION', groupId: 'ongoing-review',
    label: 'Missing', enabled: true, status: 'No action' };
  assert.equal(reducer(state, { ...option, code: '998' }), state);
  const saved = reducer(state, { ...option, code: '999' });
  assert.notEqual(saved, state);
  const options = outcomeDropdownOptions(saved.settings);
  assert.equal(new Set(options.map(item => item.value)).size, options.length);
  assert.deepEqual(new Set(options
    .filter(item => item.label === 'Missing').map(item => item.code)), new Set(['999']));
});

test('saved options with an identical name migrate to the same code', () => {
  const settings = withConsistentOutcomeNameCodes({ customOutcomeOptions: [
    { value: 'custom:first', groupId: 'first', label: '999 · Missing' },
    { value: 'custom:second', groupId: 'second', label: 'Missing', code: '998' },
  ] });
  assert.deepEqual(settings.customOutcomeOptions.map(option =>
    option.code ?? option.label.split(' · ')[0]), ['999', '999']);
  assert.equal(withConsistentOutcomeNameCodes(settings), settings);
});
