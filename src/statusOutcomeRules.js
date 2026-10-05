import { outcomeDropdownOptions, assessmentOutcomeEnabled, visibleAssessmentOutcomeOptions } from './assessmentOutcome.js';
import { DEFAULT_OUTCOME_GROUP_ID, outcomeGroupOptions } from './outcomeDecisionGroups.js';
import { EPISODE_DISPLAY_STATUSES } from './batch1Registration.js';

export const ANY_STATUS = 'Any';
export const STATUS_OUTCOME_STATES = [ANY_STATUS, ...EPISODE_DISPLAY_STATUSES];

export const ASSESSMENT_OUTCOME_TRANSITION = { from: 'Assessment', to: 'Ongoing review' };
export const REQUIRED_STATUS_OUTCOME_TRANSITIONS = [
  { from: 'Profiling', to: 'Assessment' },
  ASSESSMENT_OUTCOME_TRANSITION,
  { from: 'Ongoing review', to: 'Ongoing review' },
];
export const isRequiredStatusOutcomeTransition = (from, to) =>
  REQUIRED_STATUS_OUTCOME_TRANSITIONS.some(rule => rule.from === from && rule.to === to);
export const isAssessmentOutcomeTransition = (from, to) =>
  from === ASSESSMENT_OUTCOME_TRANSITION.from && to === ASSESSMENT_OUTCOME_TRANSITION.to;

export const sharedStatusOutcomeOptions = (selected = [], settings) => outcomeGroupOptions(settings,
  DEFAULT_OUTCOME_GROUP_ID, outcomeDropdownOptions(settings)).map(({ value }) => ({
  value, visible: selected.some(option => option.value === value && option.visible),
}));

export function statusOutcomeRules(settings) {
  const saved = Array.isArray(settings?.statusOutcomeRules) ? settings.statusOutcomeRules : [];
  const normalized = rule => ({ ...rule, options: sharedStatusOutcomeOptions(rule.options, settings) });
  const required = REQUIRED_STATUS_OUTCOME_TRANSITIONS.map(transition => {
    if (isAssessmentOutcomeTransition(transition.from, transition.to)) return {
      ...transition, builtIn: true, mandatory: true,
      enabled: assessmentOutcomeEnabled(settings),
      options: outcomeGroupOptions(settings, DEFAULT_OUTCOME_GROUP_ID, outcomeDropdownOptions(settings)).map(({ value }) => ({
        value, visible: visibleAssessmentOutcomeOptions(settings).includes(value),
      })),
    };
    const configured = saved.find(rule => rule.from === transition.from && rule.to === transition.to);
    const defaultsToOn = transition.from === 'Profiling' && transition.to === 'Assessment';
    const emptyLegacyRule = defaultsToOn && configured &&
      !configured.enabled && !configured.options?.some(option => option.visible);
    return { ...((configured && !emptyLegacyRule) ? normalized(configured) : {
      ...transition, enabled: defaultsToOn,
      options: outcomeGroupOptions(settings, DEFAULT_OUTCOME_GROUP_ID, outcomeDropdownOptions(settings)).map(({ value }) => ({ value, visible: defaultsToOn })),
    }), mandatory: true };
  });
  const additional = saved.filter(rule => !isRequiredStatusOutcomeTransition(rule.from, rule.to)).map(normalized);
  return [required[0], required[1], ...additional, required[2]];
}

export const statusOutcomeRuleFor = (settings, from, to) => {
  const rules = statusOutcomeRules(settings);
  return rules.find(rule => rule.from === from && rule.to === to) ||
    rules.find(rule => rule.from === from && rule.to === ANY_STATUS) ||
    rules.find(rule => rule.from === ANY_STATUS && rule.to === to) ||
    rules.find(rule => rule.from === ANY_STATUS && rule.to === ANY_STATUS);
};

export const visibleStatusOutcomeOptions = rule =>
  (rule?.options || []).filter(option => option.visible).map(option => option.value);

export function validCustomStatusOutcomeRule(rule, settings) {
  if (!rule || !STATUS_OUTCOME_STATES.includes(rule.from) ||
      !STATUS_OUTCOME_STATES.includes(rule.to) ||
      isAssessmentOutcomeTransition(rule.from, rule.to) ||
      rule.builtIn || typeof rule.enabled !== 'boolean' || !Array.isArray(rule.options)) return false;
  const values = outcomeGroupOptions(settings, DEFAULT_OUTCOME_GROUP_ID,
    outcomeDropdownOptions(settings)).map(option => option.value);
  if (rule.options.length !== values.length ||
      rule.options.some((option, index) => option?.value !== values[index] ||
        typeof option.visible !== 'boolean') ||
      (rule.enabled && !rule.options.some(option => option.visible))) return false;
  return true;
}
