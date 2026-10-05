import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorkspace, reducer } from './model.js';
import { ASSESSMENT_OUTCOME_OPTIONS, assessmentOutcomeAllowsOngoingReview, outcomeDropdownOptions, outcomeOptionLabel, visibleAssessmentOutcomeOptions } from './assessmentOutcome.js';
import { derivedEpisodeStatus } from './batch1Registration.js';
import { episodeStatusForOutcome } from './outcomeEpisodeStatus.js';
import { outcomeDecisionGroups, outcomeGroupOptions } from './outcomeDecisionGroups.js';

test('a dropdown option maps to a saved episode status', () => {
  const original = createDefaultWorkspace();
  const outcome = ASSESSMENT_OUTCOME_OPTIONS[2];
  assert.equal(episodeStatusForOutcome(original.settings, outcome), 'Not proceed');
  const configured = reducer(original, { type: 'SET_OUTCOME_EPISODE_STATUS', outcome, status: 'Paused' });
  assert.equal(episodeStatusForOutcome(configured.settings, outcome), 'Paused');
  assert.equal(derivedEpisodeStatus({}, { status: 'Active', assessmentOutcome: { value: outcome } }, configured.settings), 'Paused');
  assert.equal(reducer(configured, { type: 'SET_OUTCOME_EPISODE_STATUS', outcome, status: 'Invalid' }), configured);
  const noAction = reducer(configured, { type: 'SET_OUTCOME_EPISODE_STATUS', outcome, status: 'No action' });
  assert.equal(episodeStatusForOutcome(noAction.settings, outcome), 'No action');
  assert.equal(derivedEpisodeStatus({}, { status: 'Active', assessmentOutcome: { value: outcome } }, noAction.settings), 'Assessment');
});

test('adding and editing dropdown options preserves their stored values', () => {
  const original = createDefaultWorkspace();
  const added = reducer(original, { type: 'ADD_OUTCOME_DROPDOWN_OPTION', label: '  Referred elsewhere  ' });
  const custom = outcomeDropdownOptions(added.settings).at(-1);
  assert.equal(custom.label, 'Referred elsewhere');
  assert.equal(visibleAssessmentOutcomeOptions(added.settings).includes(custom.value), true);
  assert.equal(episodeStatusForOutcome(added.settings, custom.value), 'No action');
  const edited = reducer(added, { type: 'EDIT_OUTCOME_DROPDOWN_OPTION', value: custom.value, label: 'External referral' });
  assert.equal(outcomeOptionLabel(edited.settings, custom.value), 'External referral');
  assert.equal(outcomeDropdownOptions(edited.settings).at(-1).value, custom.value);
  assert.equal(reducer(edited, { type: 'ADD_OUTCOME_DROPDOWN_OPTION', label: 'external REFERRAL' }), edited);
  const builtIn = ASSESSMENT_OUTCOME_OPTIONS[0];
  const renamed = reducer(edited, { type: 'EDIT_OUTCOME_DROPDOWN_OPTION', value: builtIn, label: 'Accepted to program' });
  assert.equal(outcomeOptionLabel(renamed.settings, builtIn), 'Accepted to program');
  assert.equal(outcomeDropdownOptions(renamed.settings)[0].value, builtIn);
});

test('new dropdown options save enabled state and episode status together', () => {
  const original = createDefaultWorkspace();
  const added = reducer(original, { type: 'ADD_OUTCOME_DROPDOWN_OPTION',
    label: 'Follow-up needed', enabled: false, status: 'Paused' });
  const value = outcomeDropdownOptions(added.settings).at(-1).value;
  assert.equal(added.settings.outcomeOptionEnabled[value], false);
  assert.equal(episodeStatusForOutcome(added.settings, value), 'Paused');
  assert.equal(visibleAssessmentOutcomeOptions(added.settings).includes(value), false);
  const edited = reducer(added, { type: 'EDIT_OUTCOME_DROPDOWN_OPTION',
    value, label: 'Follow up needed', enabled: true, status: 'Ongoing review' });
  assert.equal(edited.settings.outcomeOptionEnabled[value], true);
  assert.equal(episodeStatusForOutcome(edited.settings, value), 'Ongoing review');
  assert.equal(visibleAssessmentOutcomeOptions(edited.settings).includes(value), true);
  assert.equal(reducer(edited, { type: 'ADD_OUTCOME_DROPDOWN_OPTION',
    label: 'Invalid status', enabled: true, status: 'Unknown' }), edited);
});

test('pack mode records one episode outcome and honours option switches', () => {
  const original = createDefaultWorkspace();
  const person = original.people[0];
  const episode = person.episodes[0];
  const bundleId = episode.collections[0].bundleId;
  const outcome = ASSESSMENT_OUTCOME_OPTIONS[2];
  const configured = { ...original, settings: { ...original.settings,
    packBasedRecordOutcomes: true,
    assessmentScheduleRules: [{ id: bundleId, enabled: true, recordOutcome: true }],
  } };
  const action = { type: 'RECORD_PACK_OUTCOME', personId: person.id, episodeId: episode.id, outcome };
  const recorded = reducer(configured, action);
  assert.equal(recorded.people[0].episodes[0].packOutcome.value, outcome);
  assert.equal(derivedEpisodeStatus({}, recorded.people[0].episodes[0], recorded.settings), 'Not proceed');
  const disabled = reducer(configured, { type: 'SET_OUTCOME_OPTION_ENABLED', outcome, enabled: false });
  assert.equal(reducer(disabled, action), disabled);
  assert.equal(reducer(configured, { ...action, type: 'RECORD_ASSESSMENT_OUTCOME' }), configured);
});

test('a pack accepts only decisions from its selected named group', () => {
  const original = createDefaultWorkspace();
  const person = original.people[0];
  const episode = person.episodes[0];
  const record = episode.collections[0];
  const created = reducer(original, { type: 'SAVE_OUTCOME_DECISION_GROUP', name: 'Review decisions' });
  const groupId = outcomeDecisionGroups(created.settings).at(-1).id;
  const added = reducer(created, { type: 'ADD_OUTCOME_DROPDOWN_OPTION', groupId,
    label: 'Review again', status: 'Ongoing review' });
  const option = outcomeDropdownOptions(added.settings).at(-1);
  assert.deepEqual(outcomeGroupOptions(added.settings, groupId, outcomeDropdownOptions(added.settings)), [option]);
  assert.deepEqual(visibleAssessmentOutcomeOptions(added.settings, groupId), [option.value]);
  assert.equal(visibleAssessmentOutcomeOptions(added.settings).includes(option.value), false);
  const configured = { ...added, settings: { ...added.settings, packBasedRecordOutcomes: true,
    clientProfileBundle: record.clientProfileMeasure
      ? { id: 'MVP-CLIENT-PROFILE', enabled: true, recordOutcome: true, outcomeGroupId: groupId }
      : added.settings.clientProfileBundle,
    assessmentScheduleRules: [{ id: record.bundleId, enabled: true, recordOutcome: true, outcomeGroupId: groupId }] } };
  const action = { type: 'RECORD_PACK_OUTCOME', personId: person.id, episodeId: episode.id, recordId: record.id };
  assert.equal(reducer(configured, { ...action, outcome: ASSESSMENT_OUTCOME_OPTIONS[0] }), configured);
  const recorded = reducer(configured, { ...action, outcome: option.value });
  assert.equal(recorded.people[0].episodes[0].packOutcome.value, option.value);
  assert.equal(recorded.people[0].episodes[0].packOutcome.groupId, groupId);
  assert.equal(reducer(configured, { type: 'DELETE_OUTCOME_DECISION_GROUP', id: groupId }), configured);
});

test('No action records a pack outcome without advancing the initial assessment', () => {
  const outcome = ASSESSMENT_OUTCOME_OPTIONS[0];
  const settings = { packBasedRecordOutcomes: true,
    assessmentScheduleRules: [{ id: 'initial', enabled: true, recordOutcome: true }],
    outcomeEpisodeStatuses: { [outcome]: 'No action' } };
  const episode = { status: 'Active', collections: [{ bundleId: 'initial', mvpInitialAssessment: true,
    mvpRespondent: 'Person', response: 'Submitted' }], packOutcome: { value: outcome } };
  assert.equal(assessmentOutcomeAllowsOngoingReview(episode, settings), false);
  assert.equal(derivedEpisodeStatus({}, episode, settings), 'Assessment');
});

test('a Client profile outcome does not complete the initial assessment outcome', () => {
  const outcome = ASSESSMENT_OUTCOME_OPTIONS[0];
  const settings = { packBasedRecordOutcomes: true,
    assessmentScheduleRules: [{ id: 'initial', enabled: true, recordOutcome: true }] };
  const episode = { status: 'Active', collections: [{ id: 'initial-record', bundleId: 'initial',
    mvpInitialAssessment: true, mvpRespondent: 'Person', response: 'Submitted' }],
    packOutcome: { recordId: 'profile-record', value: outcome } };
  assert.equal(assessmentOutcomeAllowsOngoingReview(episode, settings), false);
  episode.packOutcomes = [{ recordId: 'initial-record', value: outcome }];
  assert.equal(assessmentOutcomeAllowsOngoingReview(episode, settings), true);
});
