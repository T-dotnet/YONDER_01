import { EP_BATCH_2_INSTRUMENTS } from './epCodebookInstruments.js';
import { dictionaryStageMode, dictionaryStageOutcomeRecorded } from './dictionaryStageOutcomes.js';
import { episodeStatusForOutcome } from './outcomeEpisodeStatus.js';
import { recordHasAssessmentPackOutcome } from './assessmentPackOutcome.js';
import { DEFAULT_OUTCOME_GROUP_ID, outcomeGroupForOption, outcomeGroupOptions } from './outcomeDecisionGroups.js';

export const ASSESSMENT_OUTCOME_INSTRUMENT = EP_BATCH_2_INSTRUMENTS.find(
  instrument => instrument.codebookDataItem === 'Assessment Outcome');
export const ASSESSMENT_OUTCOME_OPTIONS = ASSESSMENT_OUTCOME_INSTRUMENT.questions.find(
  question => question.id === 'assessment_outcome').options;

const CODE_PREFIX = /^\s*(\d+)\s*·\s*/;
export const outcomeCodeFromLabel = label => CODE_PREFIX.exec(label || '')?.[1] || '';
export const outcomeOptionName = label => (label || '').replace(CODE_PREFIX, '');

export const outcomeDropdownOptions = settings => [
  ...ASSESSMENT_OUTCOME_OPTIONS.map(value => ({
    value, label: outcomeOptionName(settings?.outcomeOptionLabels?.[value] || value),
    code: settings?.outcomeOptionCodes?.[value] ?? outcomeCodeFromLabel(value),
  })),
  ...(Array.isArray(settings?.customOutcomeOptions) ? settings.customOutcomeOptions : [])
    .filter(option => typeof option?.value === 'string' && typeof option?.label === 'string')
    .map(option => ({ ...option, label: outcomeOptionName(option.label),
      code: option.code ?? outcomeCodeFromLabel(option.label) })),
];

export const matchingOutcomeName = (options, label, value = '') => options.filter(option =>
  option.value !== value && option.label.trim().toLocaleLowerCase() === label.trim().toLocaleLowerCase());

export const outcomeOptionIdentityError = (settings, { value = '', label, code, groupId }) => {
  const matches = matchingOutcomeName(outcomeDropdownOptions(settings), label, value);
  if (matches.some(option => outcomeGroupForOption(settings, option.value) === groupId))
    return 'This outcome option already exists in this group.';
  if (matches.some(option => option.code !== code))
    return 'Outcome options with the same name must use the same code.';
  return '';
};

export const withConsistentOutcomeNameCodes = (settings = {}) => {
  if (settings.outcomeNameCodeRevision === 1) return settings;
  const options = outcomeDropdownOptions(settings);
  const codeByName = new Map();
  for (const option of options) {
    const name = option.label.trim().toLocaleLowerCase();
    if (name && option.code && !codeByName.has(name)) codeByName.set(name, option.code);
  }
  const canonicalCode = option => codeByName.get(option.label.trim().toLocaleLowerCase());
  const customOutcomeOptions = (Array.isArray(settings.customOutcomeOptions) ? settings.customOutcomeOptions : []).map(option => {
    const code = canonicalCode({ label: outcomeOptionName(option.label) });
    return code && (option.code ?? outcomeCodeFromLabel(option.label)) !== code ? { ...option, code } : option;
  });
  const outcomeOptionCodes = { ...settings.outcomeOptionCodes };
  for (const option of options.filter(item => ASSESSMENT_OUTCOME_OPTIONS.includes(item.value))) {
    const code = canonicalCode(option);
    if (code && option.code !== code) outcomeOptionCodes[option.value] = code;
  }
  return { ...settings, outcomeNameCodeRevision: 1, customOutcomeOptions, outcomeOptionCodes };
};

export const outcomeOptionLabel = (settings, value) =>
  outcomeDropdownOptions(settings).find(option => option.value === value)?.label || value;

export const visibleAssessmentOutcomeOptions = (settings, groupId = DEFAULT_OUTCOME_GROUP_ID) => {
  const configured = settings?.assessmentOutcomeOptions;
  const visible = outcomeGroupOptions(settings, groupId, outcomeDropdownOptions(settings)).map(option => option.value).filter(option =>
    (!Array.isArray(configured) || configured.includes(option) || !ASSESSMENT_OUTCOME_OPTIONS.includes(option)) &&
    settings?.outcomeOptionEnabled?.[option] !== false);
  return visible;
};

export const assessmentOutcomeRecord = episode => (episode?.collections || []).find(record =>
  record.mvpInitialAssessment && record.version === ASSESSMENT_OUTCOME_INSTRUMENT.version);

export const recordedAssessmentOutcome = episode =>
  episode?.assessmentOutcome?.value ||
  (assessmentOutcomeRecord(episode)?.response === 'Submitted'
    ? assessmentOutcomeRecord(episode).answers?.[0] : '');

export const assessmentOutcomeEnabled = settings =>
  settings?.advancedAssessmentOptions !== true &&
  settings?.mvpAssessmentPathway !== false &&
  settings?.mvpRecordAssessmentOutcome !== false;

const packOutcomeProceeds = (episode, settings) => {
  const initialIds = new Set((episode?.collections || []).filter(record => record.mvpInitialAssessment &&
    recordHasAssessmentPackOutcome(record, settings)).map(record => record.id));
  if (!initialIds.size) return true;
  const recorded = [...(episode?.packOutcomes || []), episode?.packOutcome].filter(Boolean).reverse()
    .find(outcome => initialIds.has(outcome.recordId)) ||
    (episode?.packOutcome?.recordId ? null : episode?.packOutcome);
  return !!recorded?.value && episodeStatusForOutcome(settings, recorded.value) === 'Ongoing review';
};

// Outcome options define these transitions. Legacy pack statusChange values are ignored.
export const initialAssessmentStatusChange = record => {
  if (record?.clientProfileMeasure) return 'Assessment';
  if (record?.mvpInitialAssessment || record?.mvpTimepointId) return 'Ongoing review';
  return '';
};

export const initialAssessmentHasOutcomeStatus = (episode, settings) => {
  if (!assessmentOutcomeEnabled(settings) && !dictionaryStageMode(settings)) return false;
  const initial = (episode?.collections || []).filter(record =>
    record.mvpInitialAssessment && record.mvpRespondent === 'Person');
  return initial.some(record => initialAssessmentStatusChange(record, settings) === 'Ongoing review');
};

export const initialAssessmentReadyForOutcome = (episode, settings) =>
  initialAssessmentHasOutcomeStatus(episode, settings) &&
  (episode?.collections || []).filter(record => record.mvpInitialAssessment && record.mvpRespondent === 'Person')
    .every(record => record.response === 'Submitted');

export const assessmentOutcomeAllowsOngoingReview = (episode, settings) => {
  if (settings?.packBasedRecordOutcomes === true) return packOutcomeProceeds(episode, settings);
  if (dictionaryStageMode(settings)) return initialAssessmentReadyForOutcome(episode, settings) &&
    dictionaryStageOutcomeRecorded(episode, 'Assessment', 'Ongoing review');
  if (!assessmentOutcomeEnabled(settings)) return true;
  if (!initialAssessmentHasOutcomeStatus(episode, settings)) return true;
  return initialAssessmentReadyForOutcome(episode, settings) && !!episode?.assessmentOutcome?.value;
};

export const assessmentOutcomeProceeds = (episode, settings) => {
  if (settings?.packBasedRecordOutcomes === true) return packOutcomeProceeds(episode, settings);
  if (dictionaryStageMode(settings)) return dictionaryStageOutcomeRecorded(episode, 'Assessment', 'Ongoing review');
  const value = episode?.assessmentOutcome?.value;
  return value && episodeStatusForOutcome(settings, value) === 'Ongoing review';
};
