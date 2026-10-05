import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorkspace, reducer, TODAY } from './model.js';
import { addDays } from './episodeReviews.js';
import { CLIENT_PROFILE_INSTRUMENTS, clientProfileBundle, clientProfileBundleError } from './clientProfileMeasure.js';
import { reconcileMvpAssessmentPathway } from './mvpAssessmentPathway.js';
import { INSTRUMENTS } from './instruments.js';

test('Client profile keeps its three default headings and schedules an added patient measure', () => {
  const workspace = createDefaultWorkspace();
  const addedMeasure = INSTRUMENTS.find(item => item.respondents.includes('Person') && !item.clientProfileSection);
  assert.deepEqual(clientProfileBundle(workspace.settings, INSTRUMENTS).instrumentVersions,
    CLIENT_PROFILE_INSTRUMENTS.map(item => item.version));
  const configured = reducer(workspace, { type: 'SAVE_CLIENT_PROFILE_BUNDLE', bundle: {
    ...clientProfileBundle(workspace.settings, INSTRUMENTS),
    instrumentVersions: [...CLIENT_PROFILE_INSTRUMENTS.map(item => item.version), addedMeasure.version],
  } });
  assert.ok(configured.settings.clientProfileBundle.instrumentVersions.includes(addedMeasure.version));
  const added = reducer(configured, { type: 'ADD_PERSON', mvpProfile: true, requestId: 'profile-added-measure',
    name: 'Added Measure Example', dob: '2008-04-12', owner: 'Jess Taylor',
    nextAction: 'Complete Client profile', reviewDate: TODAY, programStream: 'Mood' });
  const person = added.people.find(item => item.registrationRequestId === 'profile-added-measure');
  const record = person.episodes[0].collections.find(item => item.version === addedMeasure.version && item.clientProfileMeasure);
  assert.ok(record);
  assert.equal(record.bundleName, 'Client profile');
  assert.equal(record.draftAnswers, undefined);
});

test('Client profile trigger condition waits for the selected profile value and keeps the configured due date', () => {
  const workspace = createDefaultWorkspace();
  const configured = reducer(workspace, { type: 'SAVE_CLIENT_PROFILE_BUNDLE', bundle: {
    ...clientProfileBundle(workspace.settings), delayDays: 4,
    triggerDataEnabled: true, triggerDataField: 'clientAtsiStatus', triggerDataValue: 'Aboriginal',
  } });
  assert.equal(configured.settings.clientProfileBundle.triggerDataValue, 'Aboriginal');
  const added = reducer(configured, { type: 'ADD_PERSON', mvpProfile: true, requestId: 'profile-trigger-value',
    name: 'Profile Trigger Example', dob: '2008-04-12', owner: 'Jess Taylor',
    nextAction: 'Complete Client profile', reviewDate: TODAY, programStream: 'Mood' });
  const person = added.people.find(item => item.registrationRequestId === 'profile-trigger-value');
  assert.equal(person.episodes[0].collections.some(item => item.clientProfileMeasure), false);
  const matched = structuredClone(added);
  matched.people.find(item => item.id === person.id).clientAtsiStatus = 'Aboriginal';
  const scheduled = reconcileMvpAssessmentPathway(matched, TODAY);
  const records = scheduled.people.find(item => item.id === person.id).episodes[0].collections
    .filter(item => item.clientProfileMeasure);
  assert.deepEqual(records.map(item => item.version).sort(),
    clientProfileBundle(configured.settings).instrumentVersions.slice().sort());
  assert.ok(records.every(item => item.due === addDays(person.episodes[0].start, 4)));
  assert.equal(reconcileMvpAssessmentPathway(scheduled, TODAY), scheduled);
});

test('Client profile rejects incomplete trigger conditions', () => {
  const workspace = createDefaultWorkspace();
  assert.match(clientProfileBundleError({ ...clientProfileBundle(workspace.settings),
    triggerDataEnabled: true, triggerDataField: 'contact', triggerDataValue: '' }, workspace.settings), /value/i);
});

test('Client profile also waits for configured stream and age conditions', () => {
  const workspace = createDefaultWorkspace();
  const configured = reducer(workspace, { type: 'SAVE_CLIENT_PROFILE_BUNDLE', bundle: {
    ...clientProfileBundle(workspace.settings), programStream: 'Psychosis', minAge: 19,
  } });
  const added = reducer(configured, { type: 'ADD_PERSON', mvpProfile: true, requestId: 'profile-stream-age',
    name: 'Profile Stream Example', dob: '2008-04-12', owner: 'Jess Taylor',
    nextAction: 'Complete Client profile', reviewDate: TODAY, programStream: 'Mood' });
  const person = added.people.find(item => item.registrationRequestId === 'profile-stream-age');
  assert.equal(person.episodes[0].collections.some(item => item.clientProfileMeasure), false);
  const matched = structuredClone(added);
  const updated = matched.people.find(item => item.id === person.id);
  updated.dob = '2006-04-12';
  updated.episodes[0].programStream = 'Psychosis';
  const scheduled = reconcileMvpAssessmentPathway(matched, TODAY);
  assert.deepEqual(scheduled.people.find(item => item.id === person.id).episodes[0].collections
    .filter(item => item.clientProfileMeasure).map(item => item.version).sort(),
    clientProfileBundle(configured.settings).instrumentVersions.slice().sort());
});
