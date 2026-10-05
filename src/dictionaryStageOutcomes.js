import { dataDictionaryCatalog } from './dataDictionaryCatalog.js';
import { profileValueMatches, profileValueTriggerError } from './profileValueTriggers.js';

const STAGES = ['Profiling', 'Assessment', 'Ongoing review'];

export const dictionaryStageMode = settings => settings?.dictionaryStageOutcomes === true;

export const dictionaryStageRuleFor = (settings, from, to) =>
  (settings?.dictionaryStageRules || []).find(rule => rule.from === from && rule.to === to);

export function dictionaryStageRuleError(rule) {
  if (!rule || !STAGES.includes(rule.from) || !STAGES.includes(rule.to) ||
      (rule.from === rule.to && rule.from !== 'Ongoing review') ||
      typeof rule.enabled !== 'boolean' || !Array.isArray(rule.conditions))
    return 'Choose a valid stage change.';
  if (rule.enabled && !rule.conditions.length) return 'Add at least one Data dictionary condition.';
  const seen = new Set();
  for (const condition of rule.conditions) {
    if (!condition || typeof condition.fieldId !== 'string' || typeof condition.value !== 'string')
      return 'Choose a Data dictionary item and value.';
    if (seen.has(condition.fieldId)) return 'Use each Data dictionary item once per stage change.';
    seen.add(condition.fieldId);
    const error = profileValueTriggerError({ triggerDataEnabled: true,
      triggerDataField: condition.fieldId, triggerDataValue: condition.value });
    if (error) return error;
    if (!dataDictionaryCatalog().some(field => field.id === condition.fieldId))
      return 'Choose a Data dictionary item.';
  }
  return null;
}

export function dictionaryStageConditionsMatch(rule, person, episode) {
  if (!rule?.enabled || dictionaryStageRuleError(rule)) return false;
  const fields = new Map(dataDictionaryCatalog().map(field => [field.id, field]));
  return rule.conditions.every(condition => {
    const field = fields.get(condition.fieldId);
    if (field?.version && field.questionIndex != null) {
      const latest = (episode?.collections || []).filter(record =>
        record.version === field.version && record.response === 'Submitted').at(-1);
      const answer = latest?.answers?.[field.questionIndex];
      if (answer != null && answer !== '') {
        const value = String(answer);
        return value === condition.value || value.replace(/^\d+\s*[-–:]\s*/, '') === condition.value;
      }
    }
    return profileValueMatches({ triggerDataEnabled: true,
      triggerDataField: condition.fieldId, triggerDataValue: condition.value }, person, episode);
  });
}

export const dictionaryStageOutcomeRecorded = (episode, from, to, recordId) =>
  (episode?.statusOutcomes || []).some(item => item.from === from && item.to === to &&
    item.source === 'Data dictionary' && (!recordId || item.recordId === recordId));
