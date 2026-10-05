// Settings shown in the Measures and Workspace features sections. Keep the
// inactive pathway's switches explicit so returning to it does not revive old choices.
export const MVP_PRESET = Object.freeze({
  showGeneralReport: true,
  advancedAssessmentOptions: false,
  assessmentSms: false,
  phase2CareActivity: true,
  mvpCarePointHeading: true,
  mvpCarePointActions: true,
  mvpOutcomeBelowTable: true,
  mvpSchedulePresets: false,
  mvpSeparateMeasuresContacts: true,
  mvpAssessmentPathway: true,
  mvpRecordAssessmentOutcome: true,
  mvpClinicianCreation: false,
  mvpBundleEditing: false,
  mvpProfileTab: false,
  mvpShowPersonTags: false,
  mvpNewProfileCollectWorkspace: false,
  mvpReviewHighlight: false,
  simpleAssessments: false,
  scheduleAssessments: false,
  showAssessmentDueDates: false,
  linkAssessmentAppointments: false,
  assessmentModality: false,
  groupAssessmentsByBundle: false,
  bundleAccordions: false,
  automaticAssessmentDueDates: false,
});

export const mvpPresetActive = settings =>
  Object.entries(MVP_PRESET).every(([key, value]) =>
    key === 'mvpRecordAssessmentOutcome' || key === 'mvpOutcomeBelowTable' ? settings?.[key] !== false
      : key === 'mvpCarePointActions' ? (settings?.mvpCarePointActions ?? settings?.mvpCarePointHeading) === value
      : key === 'mvpShowPersonTags' ? settings?.[key] !== true
      : settings?.[key] === value);
