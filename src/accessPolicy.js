import { derivedEpisodeStatus, EPISODE_DISPLAY_STATUSES } from './batch1Registration.js';

export const ROLE_STAGE_OPTIONS = Object.freeze(['Intake', ...EPISODE_DISPLAY_STATUSES]);
export const ROLE_TAB_OPTIONS = Object.freeze([
  'Overview', 'Profile', 'Assessment', 'Events', 'Report', 'Consent & respondents', 'Change log',
]);
export const ROLE_ACTION_OPTIONS = Object.freeze(['record_outcome', 'collect_response']);
const DEFAULT_ROLE_ACCESS = Object.freeze({
  Clinician: { stages: ROLE_STAGE_OPTIONS, tabs: ROLE_TAB_OPTIONS, actions: ROLE_ACTION_OPTIONS },
  Staff: { stages: ['Profiling', 'Assessment', 'Ongoing review'],
    tabs: ['Overview', 'Profile', 'Assessment', 'Events', 'Consent & respondents'],
    actions: ROLE_ACTION_OPTIONS },
});

export function roleVisibleOptions(settings, role, kind) {
  const allowed = kind === 'stages' ? ROLE_STAGE_OPTIONS : kind === 'tabs' ? ROLE_TAB_OPTIONS : ROLE_ACTION_OPTIONS;
  if (role === 'General Manager') return allowed;
  const configured = settings?.roleAccess?.[role]?.[kind];
  return Array.isArray(configured)
    ? allowed.filter(value => value === 'Overview' || configured.includes(value))
    : DEFAULT_ROLE_ACCESS[role]?.[kind] || [];
}

export const roleCanSeeTab = (settings, role, tab) =>
  ['Contact', 'History', 'Referrals'].includes(tab) || roleVisibleOptions(settings, role, 'tabs').includes(tab);

export const ROLE_PERMISSIONS = Object.freeze({
  Clinician: ['view_person', 'view_report', 'view_all_packs', 'view_collection', 'record_outcome', 'collect_response', 'view_quality', 'view_change_log', 'create_person'],
  Staff: ['view_person', 'view_report', 'view_collection', 'record_outcome', 'collect_response', 'view_change_log', 'create_person'],
  'General Manager': ['view_person', 'view_report', 'view_all_packs', 'view_collection', 'record_outcome', 'collect_response', 'view_quality', 'view_change_log', 'view_global', 'manage_access', 'create_person'],
});

export const roleHasPermission = (user, permission) =>
  !!user && (ROLE_PERMISSIONS[user.role] || []).includes(permission);

export function accessUsers(state) {
  return state.accessUsers || [
    { id: 'jess', name: 'Jess Taylor', role: 'Clinician', assignedPersonIds: (state.people || []).map(person => person.id) },
    { id: 'sam', name: 'Sam Lee', role: 'Staff', assignedPersonIds: ['YS-1024', 'YS-1033', 'YS-1026'] },
    { id: 'ananya', name: 'Ananya', role: 'General Manager', assignedPersonIds: [] },
  ];
}

export const activeAccessUser = state =>
  accessUsers(state).find(user => user.id === (state.staffId || 'jess')) || accessUsers(state)[0];

export const assignedTo = (user, person) =>
  !!user && !!person && (user.assignedPersonIds || []).includes(person.id);

function currentEpisode(person) {
  const episodes = person?.episodes || [];
  return episodes.find(episode => episode.status === 'Active') ||
    episodes.find(episode => episode.status === 'Paused') || episodes[0];
}

export function visibleEpisodesForRole(user, person, settings) {
  if (!user || !person) return [];
  const episodes = user.role === 'Staff' ? [currentEpisode(person)].filter(Boolean) : person.episodes || [];
  const stages = roleVisibleOptions(settings, user.role, 'stages');
  return episodes.filter(episode => stages.includes(derivedEpisodeStatus({}, episode, settings)));
}

export function visibleEpisodeForStaff(person, settings) {
  return visibleEpisodesForRole({ role: 'Staff' }, person, settings)[0] || null;
}

export function canViewPerson(user, person, settings) {
  if (!roleHasPermission(user, 'view_person') || !person) return false;
  if (user.role === 'General Manager') return true;
  if (!assignedTo(user, person)) return false;
  if (!(person.episodes || []).length) return roleVisibleOptions(settings, user.role, 'stages').includes('Intake');
  return visibleEpisodesForRole(user, person, settings).length > 0;
}

export const isYoungPersonPack = collection =>
  collection?.respondent === 'Person' || collection?.mvpRespondent === 'Person';

export function canAccess(state, permission, { person, episode, collection } = {}) {
  const user = activeAccessUser(state);
  if (!roleHasPermission(user, permission)) return false;
  const requiredTab = { view_report: 'Report', view_change_log: 'Change log',
    view_collection: 'Assessment', record_outcome: 'Assessment', collect_response: 'Assessment' }[permission];
  if (requiredTab && !roleCanSeeTab(state.settings, user.role, requiredTab)) return false;
  if (ROLE_ACTION_OPTIONS.includes(permission) &&
      !roleVisibleOptions(state.settings, user.role, 'actions').includes(permission)) return false;
  if (permission === 'view_person') return canViewPerson(user, person, state.settings);
  if (person && !canViewPerson(user, person, state.settings)) return false;
  if (episode && user.role !== 'General Manager' &&
      !visibleEpisodesForRole(user, person, state.settings).some(visible => visible.id === episode.id)) return false;
  if (['view_collection', 'collect_response'].includes(permission)) {
    if (!collection) return false;
    if (user.role === 'Staff' && (!isYoungPersonPack(collection) ||
        visibleEpisodeForStaff(person, state.settings)?.id !== episode?.id)) return false;
  }
  return true;
}
