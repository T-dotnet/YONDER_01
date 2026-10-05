import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentPackForRecord, recordHasAssessmentPackOutcome, recordedOutcomeForCollectionGroup } from './assessmentPackOutcome.js';
import { createDefaultWorkspace, reducer } from './model.js';
import { ASSESSMENT_OUTCOME_OPTIONS } from './assessmentOutcome.js';
import { clientProfileBundle } from './clientProfileMeasure.js';
import { mvpInitialBundles } from './mvpAssessmentPathway.js';

test('Record outcome follows the saved pack definition for every editor type', () => {
  const settings = {
    assessmentScheduleRules: [{ id: 'scheduled', enabled: true, recordOutcome: true }],
    clientProfileBundle: { id: 'MVP-CLIENT-PROFILE', enabled: true, recordOutcome: true },
    mvpInitialBundles: [{ id: 'initial', enabled: true, recordOutcome: true }],
    mvpReviewBundles: [{ id: 'review', enabled: true, recordOutcome: true }],
  };
  const records = [
    { bundleId: 'scheduled' },
    { clientProfileMeasure: true, bundleId: 'profile-episode-id' },
    { mvpInitialBundleDefinitionId: 'initial', bundleId: 'initial-episode-id' },
    { mvpBundleDefinitionId: 'review', bundleId: 'review-episode-id' },
  ];
  for (const record of records) {
    assert.ok(assessmentPackForRecord(record, settings));
    assert.equal(recordHasAssessmentPackOutcome(record, settings), true);
  }
  assert.equal(recordHasAssessmentPackOutcome({ bundleId: 'unknown' }, settings), false);
  assert.equal(recordHasAssessmentPackOutcome(records[1], {
    ...settings, clientProfileBundle: { ...settings.clientProfileBundle, enabled: false },
  }), false);
});

test('Client profile and every initial assessment start with Record outcome on', () => {
  const settings = createDefaultWorkspace().settings;
  assert.equal(clientProfileBundle(settings).recordOutcome, true);
  assert.ok(mvpInitialBundles(settings).length > 0);
  assert.ok(mvpInitialBundles(settings).every(bundle => bundle.recordOutcome === true));
  assert.equal(clientProfileBundle({ ...settings, clientProfileBundle: {
    ...clientProfileBundle(settings), recordOutcome: false,
  } }).recordOutcome, false);
  assert.ok(mvpInitialBundles({ ...settings, mvpInitialBundles: mvpInitialBundles(settings)
    .map(bundle => ({ ...bundle, recordOutcome: false })) }).every(bundle => bundle.recordOutcome === false));
});

test('older saved packs use the same Record outcome defaults as their editors', () => {
  const settings = {
    clientProfileBundle: { id: 'MVP-CLIENT-PROFILE', enabled: true },
    mvpInitialBundles: [{ id: 'MVP-INITIAL-PERSON-PSYCHOSIS', enabled: true }],
  };
  const profile = { clientProfileMeasure: true };
  const initial = { mvpInitialBundleDefinitionId: 'MVP-INITIAL-PERSON-PSYCHOSIS' };
  assert.equal(recordHasAssessmentPackOutcome(profile, settings), true);
  assert.equal(recordHasAssessmentPackOutcome(initial, settings), true);
  assert.equal(recordHasAssessmentPackOutcome(profile, {
    ...settings, clientProfileBundle: { ...settings.clientProfileBundle, recordOutcome: false },
  }), false);
  assert.equal(recordHasAssessmentPackOutcome(initial, {
    ...settings, mvpInitialBundles: [{ ...settings.mvpInitialBundles[0], recordOutcome: false }],
  }), false);
  assert.equal(recordHasAssessmentPackOutcome({ mvpBundleDefinitionId: 'review' }, {
    ...settings, mvpReviewBundles: [{ id: 'review', enabled: true, recordOutcome: false }],
  }), false);
});

test('Show response finds the outcome recorded for its collection occasion', () => {
  const workspace = createDefaultWorkspace();
  const episode = workspace.people.find(person => person.id === 'YS-1033').episodes[0];
  const profile = episode.collections.filter(record => record.clientProfileMeasure);
  const initial = episode.collections.filter(record => record.mvpInitialAssessment);
  assert.equal(recordedOutcomeForCollectionGroup(episode, profile)?.recordId, profile[0].id);
  assert.equal(recordedOutcomeForCollectionGroup(episode, initial), null);
  assert.equal(recordedOutcomeForCollectionGroup({ packOutcomes: [{ recordId: 'other', value: 'Other' }] }, profile), null);
});

test('recording another pack preserves the earlier pack response outcome', () => {
  const original = createDefaultWorkspace();
  const person = original.people.find(item => item.id === 'YS-1033');
  const episode = person.episodes[0];
  const profile = episode.collections.find(record => record.clientProfileMeasure);
  const initial = episode.collections.find(record => record.mvpInitialAssessment);
  const state = { ...original, settings: { ...original.settings, packBasedRecordOutcomes: true } };
  const action = { type: 'RECORD_PACK_OUTCOME', personId: person.id, episodeId: episode.id,
    outcome: ASSESSMENT_OUTCOME_OPTIONS[0] };
  const first = reducer(state, { ...action, recordId: profile.id });
  const second = reducer(first, { ...action, recordId: initial.id });
  const saved = second.people.find(item => item.id === person.id).episodes[0];
  assert.equal(saved.packOutcomes.length, 2);
  assert.equal(recordedOutcomeForCollectionGroup(saved, [profile])?.recordId, profile.id);
  assert.equal(recordedOutcomeForCollectionGroup(saved, [initial])?.recordId, initial.id);
});
