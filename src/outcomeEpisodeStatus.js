import { outcomeDropdownOptions } from './assessmentOutcome.js';
import { EPISODE_DISPLAY_STATUSES } from './episodeStatuses.js';

export const NO_OUTCOME_STATUS_ACTION = 'No action';
export const OUTCOME_EPISODE_STATUS_OPTIONS = [NO_OUTCOME_STATUS_ACTION, ...EPISODE_DISPLAY_STATUSES];

export const defaultEpisodeStatusForOutcome = value =>
  value?.startsWith('custom:') ? NO_OUTCOME_STATUS_ACTION : /^[12]\s*·/.test(value || '') ? 'Ongoing review' : 'Not proceed';

export const episodeStatusForOutcome = (settings, value) =>
  settings?.outcomeEpisodeStatuses?.[value] || defaultEpisodeStatusForOutcome(value);

export const validOutcomeEpisodeStatus = (value, status, settings) =>
  outcomeDropdownOptions(settings).some(option => option.value === value) && OUTCOME_EPISODE_STATUS_OPTIONS.includes(status);
