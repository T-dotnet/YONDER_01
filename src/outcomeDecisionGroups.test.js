import test from 'node:test';
import assert from 'node:assert/strict';
import { DISCHARGE_OUTCOME_OPTIONS, ONGOING_REVIEW_OUTCOME_GROUP_ID, ONGOING_REVIEW_OUTCOME_OPTIONS,
  PROFILING_OUTCOME_OPTIONS, withDischargeOutcomeDefaults, withOngoingReviewOutcomeDefaults,
  withProfilingOutcomeDefaults } from './outcomeDecisionGroups.js';
import { ASSESSMENT_OUTCOME_OPTIONS } from './assessmentOutcome.js';
import { EP_BATCH_4_INSTRUMENTS } from './epBatch4Instruments.js';
import { bundleError } from './assessmentBundles.js';
import { DISCHARGE_PACK_ID, withDischargePackDefaults } from './dischargeAssessmentPack.js';

test('upgrades a saved Profiling group without changing its pack link or duplicating options', () => {
  const saved = {
    outcomeDecisionGroups: [{ id: 'saved-group', name: 'Profiling' }],
    customOutcomeOptions: [
      { value: 'custom:existing-1', label: '1 · In Assessment', groupId: 'saved-group' },
      { value: 'custom:provisional', label: 'Do not proceed', groupId: 'saved-group' },
    ],
    outcomeEpisodeStatuses: { 'custom:existing-1': 'Assessment' },
    clientProfileBundle: { recordOutcome: true, outcomeGroupId: 'saved-group' },
  };
  const upgraded = withProfilingOutcomeDefaults(saved);
  const options = upgraded.customOutcomeOptions.filter(option => option.groupId === 'saved-group');
  assert.deepEqual(options.map(option => option.label), PROFILING_OUTCOME_OPTIONS.map(option => option.label));
  assert.equal(upgraded.clientProfileBundle.outcomeGroupId, 'saved-group');
  assert.equal(upgraded.outcomeEpisodeStatuses['custom:profiling:2'], 'Assessment');
  assert.equal(upgraded.outcomeEpisodeStatuses['custom:profiling:5'], 'Discharged');
  assert.deepEqual(withProfilingOutcomeDefaults(upgraded), upgraded);
});

test('adds Ongoing review decisions without changing initial assessment options', () => {
  const settings = withOngoingReviewOutcomeDefaults({});
  assert.equal(settings.outcomeDecisionGroups[0].id, ONGOING_REVIEW_OUTCOME_GROUP_ID);
  assert.deepEqual(settings.customOutcomeOptions.map(option => option.label),
    ONGOING_REVIEW_OUTCOME_OPTIONS.map(option => option.label));
  assert.deepEqual(settings.customOutcomeOptions.slice(2).map(option => option.label),
    ASSESSMENT_OUTCOME_OPTIONS.slice(7));
  assert.equal(settings.outcomeEpisodeStatuses['custom:ongoing-review:proceed'], 'Ongoing review');
  assert.equal(settings.outcomeEpisodeStatuses['custom:ongoing-review:8'], 'Not proceed');
  assert.deepEqual(withOngoingReviewOutcomeDefaults(settings), settings);
});

test('seeds a Discharge pack from Batch 4 without duplicating Future Care Decision', () => {
  const settings = withDischargePackDefaults(withDischargeOutcomeDefaults({ assessmentScheduleRules: [] }));
  const pack = settings.assessmentScheduleRules.find(rule => rule.id === DISCHARGE_PACK_ID);
  assert.equal(DISCHARGE_OUTCOME_OPTIONS.length, 16);
  assert.equal(pack.outcomeGroupId, 'discharge');
  assert.equal(pack.recordOutcome, true);
  assert.equal(pack.assessments.length, 14);
  assert.equal(EP_BATCH_4_INSTRUMENTS.some(instrument => instrument.name === 'Future Care Decision'), false);
  assert.equal(bundleError(pack), null);
  assert.deepEqual(withDischargePackDefaults(withDischargeOutcomeDefaults(settings)), settings);
});
