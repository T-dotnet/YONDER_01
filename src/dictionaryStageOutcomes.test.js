import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorkspace, reducer } from './model.js';
import { dataDictionaryCatalog } from './dataDictionaryCatalog.js';
import { dictionaryStageConditionsMatch, dictionaryStageRuleFor } from './dictionaryStageOutcomes.js';
import { completedStatusTransitions } from './measureStatusChange.js';
import { derivedEpisodeStatus } from './batch1Registration.js';

const mappedConditions = () => {
  const fields = dataDictionaryCatalog();
  return [
    { fieldId: fields.find(field => field.variable === 'client_gender').id, value: 'Female' },
    { fieldId: fields.find(field => field.variable === 'referral_source').id, value: 'Self-referred' },
  ];
};

test('staff confirms a stage change only after both submitted dictionary answers match', () => {
  const original = createDefaultWorkspace();
  const person = original.people.find(item => item.id === 'YS-1024');
  const episode = person.episodes[0];
  episode.collections.forEach(record => { record.channel = 'Clinician entry'; });
  const enabled = reducer(original, { type: 'SET_DICTIONARY_STAGE_OUTCOMES', enabled: true });
  const rule = { from: 'Profiling', to: 'Assessment', enabled: true, conditions: mappedConditions() };
  const configured = reducer(enabled, { type: 'SAVE_DICTIONARY_STAGE_RULE', rule });
  assert.deepEqual(dictionaryStageRuleFor(configured.settings, rule.from, rule.to), rule);
  assert.equal(dictionaryStageConditionsMatch(rule, person, episode), true);
  assert.equal(derivedEpisodeStatus({}, episode, configured.settings), 'Profiling');
  const transition = completedStatusTransitions(episode, configured.settings)
    .find(item => item.from === rule.from && item.to === rule.to);
  const action = { type: 'CONFIRM_DICTIONARY_STAGE_OUTCOME', personId: person.id,
    episodeId: episode.id, recordId: transition.recordId, from: rule.from, to: rule.to };
  const confirmed = reducer(configured, action);
  assert.notEqual(confirmed, configured);
  assert.equal(confirmed.people.find(item => item.id === person.id).episodes[0].statusOutcomes.at(-1).source,
    'Data dictionary');
  assert.equal(derivedEpisodeStatus({}, confirmed.people.find(item => item.id === person.id).episodes[0],
    confirmed.settings), 'Assessment');
  assert.equal(reducer(confirmed, action), confirmed);

  const mismatch = reducer(enabled, { type: 'SAVE_DICTIONARY_STAGE_RULE', rule: {
    ...rule, conditions: [rule.conditions[0], { ...rule.conditions[1], value: 'Family / Friend' }],
  } });
  assert.equal(reducer(mismatch, action), mismatch);
  const tablet = structuredClone(configured);
  tablet.people.find(item => item.id === person.id).episodes[0].collections[0].channel = 'Clinic tablet';
  assert.equal(reducer(tablet, action), tablet);
});

test('Assessment stays in place until a matching clinician response is confirmed', () => {
  const original = createDefaultWorkspace();
  const person = original.people.find(item => item.id === 'YS-1024');
  const episode = person.episodes[0];
  episode.collections.forEach(record => { record.channel = 'Clinician entry'; });
  episode.collections.push({ ...structuredClone(episode.collections[0]),
    id: 'dictionary-stage-initial', version: 'Synthetic initial v1.0',
    bundleId: 'dictionary-stage-initial', bundleInstanceId: 'dictionary-stage-initial',
    clientProfileMeasure: false, mvpInitialAssessment: true, mvpRespondent: 'Person',
    response: 'Submitted', channel: 'Clinician entry', submittedAt: '2026-10-05',
    submittedTimestamp: '2026-10-05T09:00:00.000Z',
    bundleContext: { statusChange: 'Ongoing review' },
  });
  let state = reducer(original, { type: 'SET_DICTIONARY_STAGE_OUTCOMES', enabled: true });
  for (const [from, to] of [['Profiling', 'Assessment'], ['Assessment', 'Ongoing review']])
    state = reducer(state, { type: 'SAVE_DICTIONARY_STAGE_RULE', rule: {
      from, to, enabled: true, conditions: mappedConditions(),
    } });
  let current = state.people.find(item => item.id === person.id).episodes[0];
  assert.equal(derivedEpisodeStatus({}, current, state.settings), 'Profiling');
  const profile = completedStatusTransitions(current, state.settings)
    .find(item => item.from === 'Profiling' && item.to === 'Assessment');
  state = reducer(state, { type: 'CONFIRM_DICTIONARY_STAGE_OUTCOME', personId: person.id,
    episodeId: current.id, recordId: profile.recordId, from: profile.from, to: profile.to });
  current = state.people.find(item => item.id === person.id).episodes[0];
  assert.equal(derivedEpisodeStatus({}, current, state.settings), 'Assessment');
  const initial = completedStatusTransitions(current, state.settings)
    .find(item => item.from === 'Assessment' && item.to === 'Ongoing review');
  assert.ok(initial);
  state = reducer(state, { type: 'CONFIRM_DICTIONARY_STAGE_OUTCOME', personId: person.id,
    episodeId: current.id, recordId: initial.recordId, from: initial.from, to: initial.to });
  current = state.people.find(item => item.id === person.id).episodes[0];
  assert.equal(derivedEpisodeStatus({}, current, state.settings), 'Ongoing review');
});
