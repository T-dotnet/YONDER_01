import { assessmentOutcomeProceeds, initialAssessmentStatusChange } from './assessmentOutcome.js';
import { dictionaryStageMode } from './dictionaryStageOutcomes.js';

export const MEASURE_STATUS_CHANGES = [
  'Profiling',
  'Assessment',
  'Ongoing review',
];

const statusChangeGroupKey = record => record.bundleInstanceId
  ? `instance:${record.bundleInstanceId}`
  : record.bundleId
    ? `bundle:${record.bundleId}:${record.due || ''}:${record.bundleEventId || ''}:${record.scheduleAnchor || ''}`
    : `record:${record.id}`;

export const statusChangeGroupForRecord = (episode, recordId) => {
  const target = episode?.collections?.find(record => record.id === recordId);
  return target ? episode.collections.filter(record =>
    statusChangeGroupKey(record) === statusChangeGroupKey(target)) : [];
};

export function completedStatusTransitions(episode, settings) {
  const groups = new Map();
  for (const record of episode?.collections || []) {
    const key = statusChangeGroupKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const completed = [...groups.values()].filter(records => records.every(record =>
    record.response === 'Submitted'))
    .map(records => ({ records, to: records.map(record => initialAssessmentStatusChange(record, settings))
      .find(status => MEASURE_STATUS_CHANGES.includes(status)),
      at: records.map(record => record.submittedTimestamp || record.submittedAt || record.reviewDate || record.due || '')
        .sort().at(-1) || '' }))
    .filter(group => group.to)
    .sort((a, b) => a.at.localeCompare(b.at) || a.records[0].id.localeCompare(b.records[0].id));
  let from = (episode?.collections || []).some(record => record.clientProfileMeasure)
    ? 'Profiling' : 'Assessment';
  const transitions = [];
  for (const group of completed) {
    if (from !== group.to || from === 'Ongoing review') transitions.push({
      from, to: group.to, recordId: group.records[0].id,
      recordIds: group.records.map(record => record.id),
    });
    from = group.to;
  }
  return transitions;
}

export function availableStatusTransitionForGroup(episode, records, settings) {
  const completed = completedStatusTransitions(episode, settings).find(transition =>
    transition.recordIds.some(id => records.some(record => record.id === id)));
  if (completed) return completed;
  const profile = records.some(record => record.clientProfileMeasure &&
    initialAssessmentStatusChange(record, settings) === 'Assessment');
  const review = records.some(record => record.mvpTimepointId &&
    initialAssessmentStatusChange(record, settings) === 'Ongoing review');
  if (!profile && !review) return null;
  return { from: profile ? 'Profiling' : 'Ongoing review',
    to: profile ? 'Assessment' : 'Ongoing review',
    recordId: records[0].id, recordIds: records.map(record => record.id) };
}

export function completedMeasureStatusChange(episode, settings) {
  const transitions = completedStatusTransitions(episode, settings);
  const recorded = (episode?.statusOutcomes || []).filter(outcome =>
    (!dictionaryStageMode(settings) || outcome.source === 'Data dictionary') &&
    transitions.some(transition => transition.recordId === outcome.recordId &&
      transition.from === outcome.from && transition.to === outcome.to))
    .sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
  const initialComplete = (episode?.collections || []).some(record =>
    record.mvpInitialAssessment && record.mvpRespondent === 'Person') &&
    (episode.collections || []).filter(record =>
      record.mvpInitialAssessment && record.mvpRespondent === 'Person')
      .every(record => record.response === 'Submitted');
  const hasProfile = (episode?.collections || []).some(record => record.clientProfileMeasure);
  const profileOutcomeRecorded = recorded.some(outcome =>
    outcome.from === 'Profiling' && outcome.to === 'Assessment');
  if (hasProfile && !profileOutcomeRecorded) return null;
  if (initialComplete && (assessmentOutcomeProceeds(episode, settings) &&
      (episode?.packOutcome?.value || episode?.assessmentOutcome?.value) ||
      recorded.some(outcome => outcome.from === 'Assessment' && outcome.to === 'Ongoing review')))
    return 'Ongoing review';
  return recorded.find(outcome => MEASURE_STATUS_CHANGES.includes(outcome.to))?.to || null;
}
