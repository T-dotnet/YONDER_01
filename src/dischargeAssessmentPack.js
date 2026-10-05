import { EP_BATCH_4_INSTRUMENTS } from './epBatch4Instruments.js';
import { DISCHARGE_OUTCOME_GROUP_ID } from './outcomeDecisionGroups.js';

export const DISCHARGE_PACK_ID = 'EP-BATCH-4-DISCHARGE';

export const dischargeAssessmentPack = groupId => ({
  id: DISCHARGE_PACK_ID,
  name: 'Discharge',
  enabled: true,
  createdInMvp: true,
  recordOutcome: true,
  outcomeGroupId: groupId,
  channel: 'Clinician entry',
  recipient: 'Clinician',
  trigger: 'current',
  timing: 'days',
  after: 'episode-status',
  triggerEpisodeStatus: 'Ongoing review',
  days: 1,
  repeat: false,
  programStream: 'All',
  careLevel: 'All',
  minAge: null,
  maxAge: null,
  assessments: EP_BATCH_4_INSTRUMENTS.map((instrument, index) => ({
    id: `${DISCHARGE_PACK_ID}-${index + 1}`,
    version: instrument.version,
    requirement: 'Mandatory',
  })),
});

export const withDischargePackDefaults = (settings = {}) => {
  if (settings.dischargePackDataRevision === 1) return settings;
  const groupId = settings.outcomeDecisionGroups?.find(group => group.name === 'Discharge')?.id || DISCHARGE_OUTCOME_GROUP_ID;
  const rules = Array.isArray(settings.assessmentScheduleRules) ? settings.assessmentScheduleRules : [];
  const existing = rules.some(rule => rule.id === DISCHARGE_PACK_ID || rule.name?.toLocaleLowerCase() === 'discharge');
  return { ...settings, dischargePackDataRevision: 1,
    assessmentScheduleRules: existing ? rules : [...rules, dischargeAssessmentPack(groupId)] };
};
