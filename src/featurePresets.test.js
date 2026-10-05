import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorkspace, reducer } from './model.js';
import { MVP_PRESET, mvpPresetActive } from './featurePresets.js';

test('new workspaces start with the MVP preset', () => {
  const { settings } = createDefaultWorkspace();
  assert.equal(mvpPresetActive(settings), true);
  for (const [key, value] of Object.entries(MVP_PRESET))
    assert.equal(settings[key], value, key);
});

test('MVP preset saves the requested switches in one action', () => {
  const workspace = createDefaultWorkspace();
  const before = {
    ...workspace,
    settings: {
      ...workspace.settings,
      advancedAssessmentOptions: true,
      assessmentSms: true,
      mvpSchedulePresets: true,
      phase2CareActivity: false,
      mvpAssessmentPathway: false,
      showGeneralReport: false,
      scheduleAssessments: true,
      mvpProfileTab: true,
      uiColorSetup: 3,
    },
  };
  const after = reducer(before, { type: 'APPLY_MVP_PRESET' });
  assert.equal(mvpPresetActive(after.settings), true);
  assert.equal(after.settings.phase2CareActivity, true);
  assert.equal(after.settings.assessmentSms, false);
  assert.equal(after.settings.mvpSchedulePresets, false);
  for (const [key, value] of Object.entries(MVP_PRESET))
    assert.equal(after.settings[key], value, key);
  assert.equal(after.settings.uiColorSetup, 3);
  assert.equal(reducer(after, { type: 'APPLY_MVP_PRESET' }), after);
});

test('MVP schedule presets can be switched on and reset by the preset', () => {
  const workspace = createDefaultWorkspace();
  const on = reducer(workspace, { type: 'SET_MVP_SCHEDULE_PRESETS', enabled: true });
  assert.equal(on.settings.mvpSchedulePresets, true);
  assert.equal(mvpPresetActive(on.settings), false);
  const restored = reducer(on, { type: 'APPLY_MVP_PRESET' });
  assert.equal(restored.settings.mvpSchedulePresets, false);
});

test('Care point heading starts on and the MVP preset restores it to on', () => {
  const workspace = createDefaultWorkspace();
  assert.equal(workspace.settings.mvpCarePointHeading, true);
  const off = reducer(workspace, { type: 'SET_MVP_CARE_POINT_HEADING', enabled: false });
  assert.equal(off.settings.mvpCarePointHeading, false);
  assert.equal(mvpPresetActive(off.settings), false);
  const restored = reducer(off, { type: 'APPLY_MVP_PRESET' });
  assert.equal(restored.settings.mvpCarePointHeading, true);
  assert.equal(mvpPresetActive(restored.settings), true);
});

test('Care point heading and actions can be changed independently', () => {
  const workspace = createDefaultWorkspace();
  const headingOff = reducer(workspace, { type: 'SET_MVP_CARE_POINT_HEADING', enabled: false });
  assert.equal(headingOff.settings.mvpCarePointActions, true);
  const actionsOff = reducer(headingOff, { type: 'SET_MVP_CARE_POINT_ACTIONS', enabled: false });
  assert.equal(actionsOff.settings.mvpCarePointHeading, false);
  assert.equal(actionsOff.settings.mvpCarePointActions, false);
  const headingOn = reducer(actionsOff, { type: 'SET_MVP_CARE_POINT_HEADING', enabled: true });
  assert.equal(headingOn.settings.mvpCarePointActions, false);
  const restored = reducer(headingOn, { type: 'APPLY_MVP_PRESET' });
  assert.equal(restored.settings.mvpCarePointHeading, true);
  assert.equal(restored.settings.mvpCarePointActions, true);
  const legacy = { ...workspace, settings: { ...workspace.settings, mvpCarePointActions: undefined } };
  const legacyHeadingOff = reducer(legacy, { type: 'SET_MVP_CARE_POINT_HEADING', enabled: false });
  assert.equal(legacyHeadingOff.settings.mvpCarePointActions, true);
});

test('MVP preset keeps Record outcome below the table', () => {
  const workspace = createDefaultWorkspace();
  assert.equal(workspace.settings.mvpOutcomeBelowTable, true);
  const inHeading = reducer(workspace, { type: 'SET_MVP_OUTCOME_BELOW_TABLE', enabled: false });
  assert.equal(inHeading.settings.mvpOutcomeBelowTable, false);
  assert.equal(mvpPresetActive(inHeading.settings), false);
  const restored = reducer(inHeading, { type: 'APPLY_MVP_PRESET' });
  assert.equal(restored.settings.mvpOutcomeBelowTable, true);
  assert.equal(mvpPresetActive(restored.settings), true);
});
