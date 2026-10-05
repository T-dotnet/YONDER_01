export const DEFAULT_OUTCOME_GROUP_ID = 'default';
export const PROFILING_OUTCOME_GROUP_ID = 'profiling';
export const DISCHARGE_OUTCOME_GROUP_ID = 'discharge';
export const ONGOING_REVIEW_OUTCOME_GROUP_ID = 'ongoing-review';

export const ONGOING_REVIEW_OUTCOME_OPTIONS = [
  { value: 'custom:ongoing-review:proceed', label: 'Proceed', episodeStatus: 'Ongoing review' },
  { value: 'custom:ongoing-review:not-proceed', label: 'Not proceed', episodeStatus: 'Not proceed' },
  { value: 'custom:ongoing-review:8', label: '8 · Assessment not completed; Moved', episodeStatus: 'Not proceed' },
  { value: 'custom:ongoing-review:9', label: '9 · Assessment not completed; Young person has decided not to continue assessment', episodeStatus: 'Not proceed' },
  { value: 'custom:ongoing-review:10', label: '10 · Assessment not completed; Unable to contact', episodeStatus: 'Not proceed' },
  { value: 'custom:ongoing-review:11', label: '11 · Assessment not completed; Deceased', episodeStatus: 'Not proceed' },
  { value: 'custom:ongoing-review:12', label: '12 · Not accepted into program and formally referred to external service; hospital/ community-based specialist service', episodeStatus: 'Not proceed' },
  { value: 'custom:ongoing-review:13', label: '13 · Lost to service (dropped out, lost contact, moved, deceased) (historical)', episodeStatus: 'Not proceed' },
];

export const withOngoingReviewOutcomeDefaults = (settings = {}) => {
  const groups = Array.isArray(settings.outcomeDecisionGroups) ? settings.outcomeDecisionGroups : [];
  const existingGroup = groups.find(group => group.id === ONGOING_REVIEW_OUTCOME_GROUP_ID || group.name === 'Ongoing review');
  const groupId = existingGroup?.id || ONGOING_REVIEW_OUTCOME_GROUP_ID;
  const existingOptions = Array.isArray(settings.customOutcomeOptions) ? settings.customOutcomeOptions : [];
  const additions = ONGOING_REVIEW_OUTCOME_OPTIONS.filter(option => !existingOptions.some(existing =>
    existing.value === option.value || existing.groupId === groupId && existing.label === option.label));
  return {
    ...settings,
    outcomeDecisionGroups: existingGroup ? groups : [...groups, { id: groupId, name: 'Ongoing review' }],
    customOutcomeOptions: [...existingOptions, ...additions.map(({ value, label }) => ({ value, label, groupId }))],
    outcomeEpisodeStatuses: {
      ...Object.fromEntries(additions.map(option => [option.value, option.episodeStatus])),
      ...settings.outcomeEpisodeStatuses,
    },
  };
};

// Registration Status in the EP extract codebook (episode_program_stream).
export const PROFILING_OUTCOME_OPTIONS = [
  { value: 'custom:profiling:1', label: '1 · In Assessment', episodeStatus: 'Assessment' },
  { value: 'custom:profiling:2', label: '2 · UHR', episodeStatus: 'Assessment' },
  { value: 'custom:profiling:3', label: '3 · FEP', episodeStatus: 'Assessment' },
  { value: 'custom:profiling:4', label: '4 · Transitioned', episodeStatus: 'Assessment' },
  { value: 'custom:profiling:5', label: '5 · Not Accepted & Discharged', episodeStatus: 'Discharged' },
  { value: 'custom:profiling:6', label: '6 · Unknown', episodeStatus: 'No action' },
  { value: 'custom:profiling:999', label: '999 · Missing', episodeStatus: 'No action' },
];

// Future Care Decision in the EP extract codebook (future_care_decision).
export const DISCHARGE_OUTCOME_OPTIONS = [
  { value: 'custom:discharge:1', label: '1 · Treatment goals have been met; no further action required at this time' },
  { value: 'custom:discharge:2', label: '2 · Allocate to headspace Primary' },
  { value: 'custom:discharge:3', label: '3 · Formal referral to other service(s); Alcohol or other drug service' },
  { value: 'custom:discharge:4', label: '4 · Formal referral to other service(s); Welfare / employment agency, other community services' },
  { value: 'custom:discharge:5', label: '5 · Formal referral to other service(s); Hospital/community-based specialist service' },
  { value: 'custom:discharge:6', label: '6 · Formal referral to other services; Community-based mental health service (eg, CAMHS, AMHS)' },
  { value: 'custom:discharge:7', label: '7 · Formal referral to other service(s); Legal/justice service' },
  { value: 'custom:discharge:8', label: '8 · Formal referral to other services; Primary health care - GP' },
  { value: 'custom:discharge:9', label: '9 · Formal referral to other services; School-based service - school psychologist, welfare worker' },
  { value: 'custom:discharge:10', label: '10 · Formal referral to other service(s); Other Service' },
  { value: 'custom:discharge:11', label: '11 · Young person has decided not to continue treatment' },
  { value: 'custom:discharge:12', label: '12 · Moved to another area where service is unavailable' },
  { value: 'custom:discharge:13', label: '13 · Moved to another service provider' },
  { value: 'custom:discharge:14', label: '14 · Deceased' },
  { value: 'custom:discharge:15', label: '15 · Unable to contact' },
  { value: 'custom:discharge:999', label: '999 · Missing' },
];

export const withDischargeOutcomeDefaults = (settings = {}) => {
  if (settings.dischargeOutcomeDataRevision === 1) return settings;
  const groups = Array.isArray(settings.outcomeDecisionGroups) ? settings.outcomeDecisionGroups : [];
  const existingGroup = groups.find(group => group.name === 'Discharge' || group.id === DISCHARGE_OUTCOME_GROUP_ID);
  const groupId = existingGroup?.id || DISCHARGE_OUTCOME_GROUP_ID;
  const existingOptions = Array.isArray(settings.customOutcomeOptions) ? settings.customOutcomeOptions : [];
  const additions = DISCHARGE_OUTCOME_OPTIONS.filter(option => !existingOptions.some(existing =>
    existing.value === option.value || existing.groupId === groupId && existing.label === option.label));
  return {
    ...settings,
    dischargeOutcomeDataRevision: 1,
    outcomeDecisionGroups: existingGroup ? groups : [...groups, { id: groupId, name: 'Discharge' }],
    customOutcomeOptions: [...existingOptions, ...additions.map(option => ({ ...option, groupId }))],
    outcomeEpisodeStatuses: {
      ...Object.fromEntries(additions.map(option => [option.value, option.value === 'custom:discharge:999' ? 'No action' : 'Discharged'])),
      ...settings.outcomeEpisodeStatuses,
    },
  };
};

export const withProfilingOutcomeDefaults = (settings = {}, usedOutcomeValues = new Set()) => {
  if (settings.profilingOutcomeDataRevision === 2) return settings;
  const groups = Array.isArray(settings.outcomeDecisionGroups) ? settings.outcomeDecisionGroups : [];
  const existingGroup = groups.find(group => group.name === 'Profiling' || group.id === PROFILING_OUTCOME_GROUP_ID);
  const groupId = existingGroup?.id || PROFILING_OUTCOME_GROUP_ID;
  const storedOptions = Array.isArray(settings.customOutcomeOptions) ? settings.customOutcomeOptions : [];
  // Retire the provisional choices used while this group's codebook values were being defined.
  const existingOptions = settings.profilingOutcomeDataRevision >= 1 ? storedOptions : storedOptions
    .filter(option => option.groupId !== groupId || !['Proceed', 'Do not proceed'].includes(option.label) ||
      usedOutcomeValues.has(option.value));
  const additions = PROFILING_OUTCOME_OPTIONS.filter(option => !existingOptions.some(existing =>
    existing.value === option.value || existing.groupId === groupId && existing.label === option.label));
  const statuses = { ...settings.outcomeEpisodeStatuses };
  for (const option of PROFILING_OUTCOME_OPTIONS) {
    const value = existingOptions.find(existing => existing.groupId === groupId && existing.label === option.label)?.value || option.value;
    if (statuses[value] === undefined || (settings.profilingOutcomeDataRevision || 0) < 2 &&
        ['custom:profiling:2', 'custom:profiling:3', 'custom:profiling:4'].includes(option.value) && statuses[value] === 'No action')
      statuses[value] = option.episodeStatus;
  }
  return {
    ...settings,
    profilingOutcomeDataRevision: 2,
    outcomeDecisionGroups: existingGroup ? groups : [...groups, { id: groupId, name: 'Profiling' }],
    customOutcomeOptions: [...existingOptions, ...additions.map(({ value, label }) => ({ value, label, groupId }))],
    outcomeEpisodeStatuses: statuses,
    clientProfileBundle: settings.clientProfileBundle === null ? null : {
      ...settings.clientProfileBundle,
      outcomeGroupId: settings.clientProfileBundle?.outcomeGroupId || groupId,
    },
  };
};

export const outcomeDecisionGroups = settings => [
  { id: DEFAULT_OUTCOME_GROUP_ID, name: settings?.defaultOutcomeGroupName || 'Initial assessment' },
  ...(Array.isArray(settings?.outcomeDecisionGroups) ? settings.outcomeDecisionGroups : []),
];

export const outcomeGroupForOption = (settings, value) =>
  settings?.customOutcomeOptions?.find(option => option.value === value)?.groupId || DEFAULT_OUTCOME_GROUP_ID;

export const outcomeGroupOptions = (settings, groupId, options) =>
  options.filter(option => outcomeGroupForOption(settings, option.value) === (groupId || DEFAULT_OUTCOME_GROUP_ID));

export const validOutcomeGroup = (settings, groupId) =>
  outcomeDecisionGroups(settings).some(group => group.id === groupId);
