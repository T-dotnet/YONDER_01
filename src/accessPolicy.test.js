import test from 'node:test';
import assert from 'node:assert/strict';
import { canEnterCollection, createDefaultWorkspace, reducer } from './model.js';
import { accessUsers, canAccess, canViewPerson, isYoungPersonPack, roleCanSeeTab, roleVisibleOptions } from './accessPolicy.js';
import { accessibleChangeLogEntries, accessibleQualityIssues } from './accessViews.js';
import { ASSESSMENT_OUTCOME_OPTIONS } from './assessmentOutcome.js';

test('Clinician sees assigned records and General Manager sees every record', () => {
  const state = createDefaultWorkspace();
  const person = state.people[0];
  const [clinician, , manager] = accessUsers(state);
  assert.equal(canViewPerson(clinician, person, state.settings), true);
  assert.equal(canViewPerson({ ...clinician, assignedPersonIds: [] }, person, state.settings), false);
  assert.equal(canViewPerson(manager, person, state.settings), true);
});

test('Staff access needs assignment and an active Profiling, Assessment, or Ongoing review stage', () => {
  const state = createDefaultWorkspace();
  const staff = accessUsers(state)[1];
  const assigned = state.people.find(person => person.id === 'YS-1033');
  const noah = state.people.find(person => person.id === 'YS-1026');
  const unassigned = state.people.find(person => person.id === 'YS-1028');
  assert.equal(canViewPerson(staff, assigned, state.settings), true);
  assert.equal(canViewPerson(staff, noah, state.settings), true);
  assert.equal(canViewPerson(staff, unassigned, state.settings), false);
  assert.equal(canViewPerson(staff, { ...assigned, episodes: [{ ...assigned.episodes[0], status: 'Discharged' }] }, state.settings), false);
});

test('Staff can access assigned Ongoing review records and Young Person packs', () => {
  const before = createDefaultWorkspace();
  const person = before.people.find(item => item.id === 'YS-1028');
  const episode = person.episodes[0];
  const recorded = reducer(before, { type: 'RECORD_ASSESSMENT_OUTCOME', personId: person.id,
    episodeId: episode.id, outcome: ASSESSMENT_OUTCOME_OPTIONS[0] });
  const staffState = {
    ...recorded,
    staffId: 'sam',
    accessUsers: recorded.accessUsers.map(user => user.id === 'sam'
      ? { ...user, assignedPersonIds: [...user.assignedPersonIds, person.id] } : user),
  };
  const ongoingPerson = staffState.people.find(item => item.id === person.id);
  const ongoingEpisode = ongoingPerson.episodes[0];
  const youngPersonPack = ongoingEpisode.collections.find(item => item.respondent === 'Person');
  const clinicianPack = ongoingEpisode.collections.find(item => item.respondent === 'Clinician');
  assert.equal(canAccess({ ...recorded, staffId: 'sam' }, 'view_person', { person: ongoingPerson }), false);
  assert.equal(canAccess(staffState, 'view_person', { person: ongoingPerson }), true);
  assert.equal(canAccess(staffState, 'view_collection', { person: ongoingPerson, episode: ongoingEpisode, collection: youngPersonPack }), true);
  assert.equal(canAccess(staffState, 'collect_response', { person: ongoingPerson, episode: ongoingEpisode, collection: youngPersonPack }), true);
  assert.equal(canAccess(staffState, 'view_collection', { person: ongoingPerson, episode: ongoingEpisode, collection: clinicianPack }), false);
  assert.equal(canAccess(staffState, 'view_report', { person: ongoingPerson }), false);
});

test('Only General Manager can change assignments', () => {
  const state = createDefaultWorkspace();
  const action = { type: 'SET_ACCESS_ASSIGNMENT', userId: 'sam', personId: 'YS-1025', assigned: true };
  assert.equal(reducer(state, action), state);
  const managed = reducer({ ...state, staffId: 'ananya' }, action);
  assert.equal(managed.accessUsers.find(user => user.id === 'sam').assignedPersonIds.includes('YS-1025'), true);
});

test('General Manager can set role stages and tabs, and the access checks follow those settings', () => {
  const original = createDefaultWorkspace();
  const managerState = { ...original, staffId: 'ananya' };
  const stageAction = { type: 'SET_ROLE_VISIBILITY', role: 'Staff', kind: 'stages', value: 'Assessment', visible: false };
  assert.equal(reducer({ ...original, staffId: 'sam' }, stageAction).settings.roleAccess, undefined);
  const stageConfigured = reducer(managerState, stageAction);
  const assigned = stageConfigured.people.find(person => person.id === 'YS-1033');
  assert.equal(canAccess({ ...stageConfigured, staffId: 'sam' }, 'view_person', { person: assigned }), false);
  assert.equal(canAccess({ ...stageConfigured, staffId: 'jess' }, 'view_person', { person: assigned }), true);

  const reportAction = { type: 'SET_ROLE_VISIBILITY', role: 'Staff', kind: 'tabs', value: 'Report', visible: true };
  const reportConfigured = reducer(managerState, reportAction);
  assert.equal(roleCanSeeTab(reportConfigured.settings, 'Staff', 'Report'), true);
  assert.equal(canAccess({ ...reportConfigured, staffId: 'sam' }, 'view_report', { person: assigned }), true);
  assert.equal(canAccess({ ...managerState, staffId: 'sam' }, 'view_report', { person: assigned }), false);

  const assessmentHidden = reducer(managerState,
    { type: 'SET_ROLE_VISIBILITY', role: 'Clinician', kind: 'tabs', value: 'Assessment', visible: false });
  const clinician = assessmentHidden.people.find(person => person.id === 'YS-1033');
  const episode = clinician.episodes[0];
  const collection = episode.collections.find(item => item.respondent === 'Person');
  assert.equal(canAccess({ ...assessmentHidden, staffId: 'jess' }, 'view_collection', { person: clinician, episode, collection }), false);
  assert.equal(canAccess({ ...assessmentHidden, staffId: 'jess' }, 'view_person', { person: clinician }), true);
  assert.equal(roleVisibleOptions(assessmentHidden.settings, 'Clinician', 'tabs').includes('Overview'), true);
  assert.equal(reducer(managerState,
    { type: 'SET_ROLE_VISIBILITY', role: 'Staff', kind: 'tabs', value: 'Overview', visible: false }), managerState);
});

test('Assessment action settings control Record outcome and Collect response', () => {
  const original = createDefaultWorkspace();
  const managerState = { ...original, staffId: 'ananya' };
  const person = original.people.find(item => item.id === 'YS-1033');
  const episode = person.episodes[0];
  const collection = episode.collections.find(item => item.respondent === 'Person');
  const collectAction = { type: 'SET_ROLE_VISIBILITY', role: 'Staff', kind: 'actions',
    value: 'collect_response', visible: false };
  const staffState = { ...original, staffId: 'sam' };
  assert.equal(reducer(staffState, collectAction), staffState);
  const collectOff = reducer(managerState, collectAction);
  assert.equal(roleVisibleOptions(collectOff.settings, 'Staff', 'actions').includes('collect_response'), false);
  assert.equal(canAccess({ ...collectOff, staffId: 'sam' }, 'collect_response', { person, episode, collection }), false);
  assert.equal(canEnterCollection({ ...collectOff, staffId: 'sam' }, person, episode, collection), false);
  assert.equal(canAccess({ ...collectOff, staffId: 'sam' }, 'view_collection', { person, episode, collection }), true);

  const outcomeOff = reducer(managerState, { type: 'SET_ROLE_VISIBILITY', role: 'Clinician', kind: 'actions',
    value: 'record_outcome', visible: false });
  assert.equal(roleVisibleOptions(outcomeOff.settings, 'Clinician', 'actions').includes('record_outcome'), false);
  assert.equal(canAccess({ ...outcomeOff, staffId: 'jess' }, 'record_outcome', { person, episode }), false);
  assert.equal(canAccess({ ...outcomeOff, staffId: 'ananya' }, 'record_outcome', { person, episode }), true);
  const clinicianState = { ...outcomeOff, staffId: 'jess' };
  assert.equal(reducer(clinicianState, { type: 'RECORD_ASSESSMENT_OUTCOME',
    personId: person.id, episodeId: episode.id, outcome: ASSESSMENT_OUTCOME_OPTIONS[0] }), clinicianState);
});

test('Staff pack filter excludes clinician and carer recipients', () => {
  assert.equal(isYoungPersonPack({ respondent: 'Person' }), true);
  assert.equal(isYoungPersonPack({ mvpRespondent: 'Person' }), true);
  assert.equal(isYoungPersonPack({ respondent: 'Clinician' }), false);
  assert.equal(isYoungPersonPack({ respondent: 'Family respondent' }), false);
});

test('Staff can collect a Young Person pack only for an assigned YP in the allowed stage', () => {
  const state = { ...createDefaultWorkspace(), staffId: 'sam' };
  const person = state.people.find(item => item.id === 'YS-1033');
  const episode = person.episodes[0];
  const youngPersonPack = episode.collections.find(item => item.respondent === 'Person');
  const clinicianPack = episode.collections.find(item => item.respondent === 'Clinician');
  assert.equal(canEnterCollection(state, person, episode, youngPersonPack), true);
  assert.equal(canEnterCollection(state, person, episode, clinicianPack), false);
  assert.equal(canEnterCollection(state, { ...person, episodes: [{ ...episode, status: 'Discharged' }] }, episode, youngPersonPack), false);
  assert.equal(canAccess(state, 'view_collection', { person, episode: { ...episode, id: 'old-episode' }, collection: youngPersonPack }), false);
});

test('RBAC excludes Staff reports and protects the last General Manager', () => {
  const state = createDefaultWorkspace();
  assert.equal(canAccess({ ...state, staffId: 'sam' }, 'view_report'), false);
  assert.equal(canAccess({ ...state, staffId: 'jess' }, 'view_report'), true);
  assert.equal(canAccess({ ...state, staffId: 'ananya' }, 'view_global'), true);
  const managerState = { ...state, staffId: 'ananya' };
  assert.equal(reducer(managerState, { type: 'SET_ACCESS_ROLE', userId: 'ananya', role: 'Staff' }), managerState);
  const promoted = reducer(managerState, { type: 'SET_ACCESS_ROLE', userId: 'sam', role: 'Clinician' });
  assert.equal(promoted.accessUsers.find(user => user.id === 'sam').role, 'Clinician');
  assert.equal(reducer(state, { type: 'SET_ACCESS_ROLE', userId: 'sam', role: 'General Manager' }), state);
});

test('Clinician data quality and change log include only assigned patients', () => {
  const original = createDefaultWorkspace();
  const state = {
    ...original,
    staffId: 'jess',
    accessUsers: original.accessUsers.map(user => user.id === 'jess'
      ? { ...user, assignedPersonIds: ['YS-1024'] } : user),
  };
  const assigned = state.people.find(person => person.id === 'YS-1024');
  const other = state.people.find(person => person.id === 'YS-1028');
  assert.equal(canAccess(state, 'view_quality', { person: assigned }), true);
  assert.equal(canAccess(state, 'view_change_log', { person: other }), false);
  assert.deepEqual(accessibleQualityIssues(state, '2026-10-05').map(issue => issue.personId), ['YS-1024']);
  const changes = accessibleChangeLogEntries(state);
  assert.ok(changes.length > 0);
  assert.ok(changes.every(entry => entry.person.id === 'YS-1024'));
  assert.equal(accessibleQualityIssues({ ...state, staffId: 'sam' }, '2026-10-05').length, 0);
  assert.equal(accessibleChangeLogEntries({ ...state, staffId: 'sam' }).length, 0);
  assert.ok(accessibleQualityIssues({ ...state, staffId: 'ananya' }, '2026-10-05').some(issue => issue.personId === 'YS-1028'));
});
