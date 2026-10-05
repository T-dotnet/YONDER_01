import { globalChangeLogEntries } from './activity.js';
import { canAccess } from './accessPolicy.js';
import { getQualityIssues } from './dataQuality.js';

function visibleForPermission(state, permission, items, personForItem) {
  if (!canAccess(state, permission)) return [];
  if (canAccess(state, 'view_global')) return items;
  return items.filter(item => {
    const person = personForItem(item);
    return person && canAccess(state, permission, { person });
  });
}

export function accessibleQualityIssues(state, today) {
  const peopleById = new Map(state.people.map(person => [person.id, person]));
  return visibleForPermission(state, 'view_quality', getQualityIssues(state, today),
    issue => peopleById.get(issue.personId));
}

export function accessibleChangeLogEntries(state) {
  return visibleForPermission(state, 'view_change_log', globalChangeLogEntries(state),
    entry => entry.person);
}
