export function assessmentPackForRecord(record, settings) {
  if (record?.clientProfileMeasure) return settings?.clientProfileBundle === null ? null : {
    enabled: true, recordOutcome: true, ...settings?.clientProfileBundle,
    id: 'MVP-CLIENT-PROFILE',
  };
  if (record?.mvpInitialBundleDefinitionId) {
    const saved = Array.isArray(settings?.mvpInitialBundles)
      ? settings.mvpInitialBundles.find(bundle => bundle.id === record.mvpInitialBundleDefinitionId)
      : settings?.mvpInitialBundle === null ? null : settings?.mvpInitialBundle || {};
    return saved ? { enabled: true, recordOutcome: true, ...saved,
      id: record.mvpInitialBundleDefinitionId } : null;
  }
  const configured = [
    ...(settings?.assessmentScheduleRules || []),
    ...(settings?.mvpReviewBundles || []),
  ].filter(Boolean);
  const definitionId = record?.mvpBundleDefinitionId;
  return configured.find(bundle => bundle.id === definitionId ||
    bundle.id === record?.bundleId || bundle.id === record?.scheduleRuleId);
}

export function recordHasAssessmentPackOutcome(record, settings) {
  const bundle = assessmentPackForRecord(record, settings);
  return !!(bundle?.enabled && bundle.recordOutcome);
}

export function recordedOutcomeForCollectionGroup(episode, records = []) {
  const recordIds = new Set(records.map(record => record.id));
  const packOutcomes = [...(episode?.packOutcomes || []), episode?.packOutcome].filter(Boolean);
  const packOutcome = packOutcomes.reverse().find(outcome => recordIds.has(outcome.recordId));
  if (packOutcome) return packOutcome;
  const statusOutcome = [...(episode?.statusOutcomes || [])].reverse().find(outcome => recordIds.has(outcome.recordId));
  if (statusOutcome) return statusOutcome;
  if (records.some(record => record.mvpInitialAssessment))
    return episode?.assessmentOutcome || packOutcomes.find(outcome => !outcome.recordId) || null;
  return null;
}
