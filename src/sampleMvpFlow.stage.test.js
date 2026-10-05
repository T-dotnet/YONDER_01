import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorkspace, TODAY } from './model.js';
import { derivedEpisodeStatus } from './batch1Registration.js';
import { ensureSampleMvpFlow } from './sampleMvpFlow.js';
import { recordedOutcomeForCollectionGroup } from './assessmentPackOutcome.js';

test('fictional episode stages follow the current assessment pack', () => {
  const workspace = createDefaultWorkspace();
  const expected = new Map([
    ['YS-1024', ['90-day review', 'Ongoing review']],
    ['YS-1025', ['Initial assessment', 'Assessment']],
    ['YS-1026', ['Client profile', 'Profiling']],
    ['YS-1027', ['90-day review', 'Ongoing review']],
    ['YS-1028', ['Initial assessment', 'Assessment']],
    ['YS-1029', ['90-day review', 'Ongoing review']],
    ['YS-1033', ['Initial assessment', 'Assessment']],
    ['YS-1034', ['90-day review', 'Ongoing review']],
  ]);
  for (const [id, [assessment, status]] of expected) {
    const episode = workspace.people.find(person => person.id === id).episodes
      .find(item => item.status === 'Active');
    assert.equal(derivedEpisodeStatus({}, episode, workspace.settings), status, id);
    assert.ok(episode.collections.some(record =>
      (assessment === '90-day review' && record.mvpTimepointId) ||
      (assessment === 'Initial assessment' && record.mvpInitialAssessment) ||
      (assessment === 'Client profile' && record.clientProfileMeasure)), id);
    if (assessment === '90-day review') {
      assert.ok(episode.collections.some(record => record.mvpInitialAssessment &&
        record.mvpRespondent === 'Person' && record.response === 'Submitted'), id);
      assert.equal(episode.packOutcome?.value, episode.assessmentOutcome?.value, id);
    }
    assert.equal(derivedEpisodeStatus({}, episode,
      { ...workspace.settings, packBasedRecordOutcomes: true }), status, id);
  }
  assert.equal(ensureSampleMvpFlow(workspace, TODAY), workspace);
});

test('Jordan Lee fictional Client profile keeps its recorded outcome with the response', () => {
  const workspace = createDefaultWorkspace();
  const person = workspace.people.find(item => item.id === 'YS-1033');
  const episode = person.episodes.find(item => item.status === 'Active');
  const profile = episode.collections.filter(record => record.clientProfileMeasure);
  const outcome = recordedOutcomeForCollectionGroup(episode, profile);
  assert.ok(outcome?.value);
  assert.equal(outcome.recordId, profile[0].id);
  assert.equal(outcome.recordedBy, 'Sample fixture');
});
