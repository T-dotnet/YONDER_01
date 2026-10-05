import test from 'node:test';
import assert from 'node:assert/strict';
import { completedMeasureStatusChange } from './measureStatusChange.js';

test('legacy pack status changes do not move the episode without a recorded outcome', () => {
  const episode = { collections: [
    { id: 'profile', clientProfileMeasure: true, response: 'Submitted', submittedAt: '2026-09-10',
      bundleContext: { statusChange: 'Assessment' } },
    { id: 'initial', mvpInitialAssessment: true, mvpRespondent: 'Person', response: 'Submitted',
      submittedAt: '2026-09-12', bundleContext: { statusChange: 'Ongoing review' } },
  ] };
  assert.equal(completedMeasureStatusChange(episode), null);
  episode.statusOutcomes = [{ recordId: 'profile', from: 'Profiling', to: 'Assessment',
    value: '1 · Proceed', recordedAt: '2026-09-13T12:00:00Z' }];
  assert.equal(completedMeasureStatusChange(episode), 'Assessment');
  episode.assessmentOutcome = { value: '1 · Proceed', recordedAt: '2026-09-14T12:00:00Z' };
  assert.equal(completedMeasureStatusChange(episode), 'Ongoing review');
});
