import { useState } from 'react';
import { Check } from 'lucide-react';
import { useStore } from '../store';
import useQueueView from '../useQueueView';
import { accessUsers, canAccess, ROLE_ACTION_OPTIONS, ROLE_PERMISSIONS, ROLE_STAGE_OPTIONS, ROLE_TAB_OPTIONS, roleVisibleOptions } from '../accessPolicy';
import { derivedEpisodeStatus } from '../batch1Registration';
import { PageHeading, Panel, Select, Empty, Checkbox, Tabs, Button, Badge } from '../components/UI';
import ListFilterBar from '../components/ListFilterBar';
import StandardTable from '../components/StandardTable';

const editableRoles = ['Clinician', 'Staff'];
const actionLabels = { record_outcome: 'Record outcome', collect_response: 'Collect response' };

function RoleAccessCell({ role, kind, value, settings, canManage, dispatch }) {
  if (role === 'General Manager' || (kind === 'tabs' && value === 'Overview'))
    return <span className="access-fixed-access"><Check size={18} aria-hidden="true" /><span className="sr-only">Included</span></span>;
  const visible = roleVisibleOptions(settings, role, kind);
  return <Checkbox className="access-checkbox-compact" label={`${role}: ${actionLabels[value] || (value === 'Report' ? 'Reports' : value)}`} verbatim
    checked={visible.includes(value)}
    disabled={!canManage || (kind === 'stages' && visible.length === 1 && visible.includes(value))}
    onChange={event => dispatch({ type: 'SET_ROLE_VISIBILITY', role, kind, value, visible: event.target.checked })} />;
}

export default function OrganisationAccess() {
  const { state, dispatch } = useStore();
  const view = useQueueView();
  const users = accessUsers(state);
  const [selectedId, setSelectedId] = useState('sam');
  const [assignmentQuery, setAssignmentQuery] = useState('');
  const selected = users.find(user => user.id === selectedId) || users[0];
  const canManage = canAccess(state, 'manage_access');
  const tab = view.params.get('tab') === 'users' ? 'users' : 'roles';
  const people = state.people.filter(person => !person.archivedAt);
  const visiblePeople = people.filter(person =>
    `${person.name} ${person.id}`.toLocaleLowerCase().includes(assignmentQuery.trim().toLocaleLowerCase()));
  const personStage = person => {
    const episode = person.episodes?.find(item => item.status === 'Active') ||
      person.episodes?.find(item => item.status === 'Paused') || person.episodes?.[0];
    return episode ? derivedEpisodeStatus({}, episode, state.settings) : 'Intake';
  };
  return <>
    <PageHeading title="Organisation & access" subtitle="Manage who can see each young person in this workspace." />
    <div className="stack">
      <Panel title="Northside Centre" className="access-panel">
        <p>One organisation · {users.length} sample users</p>
        <p className="muted">Young people and carers receive invitations to individual Assessment Packs and do not have workspace accounts.</p>
      </Panel>
      <Tabs id="organisation-access" panelId="organisation-access-panel" label="Organisation access sections"
        className="administration-tabs" items={[{ value: 'roles', label: 'Roles and access' },
          { value: 'users', label: 'Users and assignments' }]} value={tab}
        onChange={value => view.set('tab', value, 'roles')} />
      <div id="organisation-access-panel" role="tabpanel" aria-labelledby={`organisation-access-tab-${tab === 'roles' ? 0 : 1}`}>
      {tab === 'roles' ? <Panel title="Roles and access" className="access-panel">
        <p className="muted">Select the care stages, record tabs and assessment actions available to each role for their assigned young people.</p>
        <StandardTable label="Care stage, record tab and assessment action access by role" responsive={false} className="access-matrix-table">
          <thead><tr><th scope="col">Access item</th><th scope="col">Clinician</th><th scope="col">Staff</th><th scope="col">General Manager</th></tr></thead>
          <tbody>
            <tr className="access-matrix-group"><th colSpan={4} scope="rowgroup">Care stages</th></tr>
            {ROLE_STAGE_OPTIONS.filter(value => value !== 'Intake').map(value => <tr key={`stage-${value}`}>
              <td>{value}</td>
              {editableRoles.map(role => <td key={role}><RoleAccessCell role={role} kind="stages" value={value}
                settings={state.settings} canManage={canManage} dispatch={dispatch} /></td>)}
              <td><RoleAccessCell role="General Manager" kind="stages" value={value} /></td>
            </tr>)}
          </tbody>
          <tbody>
            <tr className="access-matrix-group"><th colSpan={4} scope="rowgroup">Record tabs</th></tr>
            {ROLE_TAB_OPTIONS.filter(value => value !== 'Consent & respondents').map(value => <tr key={`tab-${value}`}>
              <td>{value === 'Report' ? 'Reports' : value}</td>
              {editableRoles.map(role => <td key={role}><RoleAccessCell role={role} kind="tabs" value={value}
                settings={state.settings} canManage={canManage} dispatch={dispatch} /></td>)}
              <td><RoleAccessCell role="General Manager" kind="tabs" value={value} /></td>
            </tr>)}
          </tbody>
          <tbody>
            <tr className="access-matrix-group"><th colSpan={4} scope="rowgroup">Assessment actions</th></tr>
            {ROLE_ACTION_OPTIONS.map(value => <tr key={`action-${value}`}>
              <td>{actionLabels[value]}</td>
              {editableRoles.map(role => <td key={role}><RoleAccessCell role={role} kind="actions" value={value}
                settings={state.settings} canManage={canManage} dispatch={dispatch} /></td>)}
              <td><RoleAccessCell role="General Manager" kind="actions" value={value} /></td>
            </tr>)}
          </tbody>
        </StandardTable>
        <p className="muted access-matrix-note">Overview is always available. General Managers have full access. Staff Assessment Packs remain limited to Young Person recipients.</p>
      </Panel> : canManage ? <div className="stack access-users-tab">
        <Panel title="Users" className="access-panel">
          <p className="muted">Choose a user to manage their role and young person assignments.</p>
          <StandardTable label="Workspace users" responsive={false}>
            <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Assigned people</th><th scope="col">Action</th></tr></thead>
            <tbody>{users.map(user => <tr key={user.id}>
              <td><strong>{user.name}</strong></td>
              <td><Badge>{user.role}</Badge></td>
              <td>{user.role === 'General Manager' ? 'All people' : `${(user.assignedPersonIds || []).filter(id => people.some(person => person.id === id)).length} people`}</td>
              <td><Button type="button" variant="secondary" aria-pressed={selected.id === user.id}
                onClick={() => { setSelectedId(user.id); setAssignmentQuery(''); }}>Manage {user.name}</Button></td>
            </tr>)}</tbody>
          </StandardTable>
        </Panel>
        <Panel title={selected.name} className="access-panel access-user-details">
          <p className="muted">Set this user's role and the young people they can access.</p>
          <label className="access-user-picker">Role
            <Select value={selected.role} onChange={event => dispatch({ type: 'SET_ACCESS_ROLE', userId: selected.id, role: event.target.value })}>
              {Object.keys(ROLE_PERMISSIONS).map(role => <option key={role} value={role}
                disabled={selected.role === 'General Manager' && users.filter(user => user.role === 'General Manager').length === 1 && role !== 'General Manager'}>{role}</option>)}
            </Select>
          </label>
          {selected.role === 'General Manager' ? <p>General Managers can see every young person record; individual assignments are not needed.</p> : <>
            <h3>Young person assignments</h3>
            <ListFilterBar id="access-assignment-filters" label="Young person assignments" hideTabs
              query={assignmentQuery} onQueryChange={setAssignmentQuery} placeholder="Search people or record ID"
              shown={visiblePeople.length} total={people.length} noun="people" onClear={() => setAssignmentQuery('')} />
            <StandardTable label={`Young person assignments for ${selected.name}`} responsive={false}>
              <thead><tr><th scope="col">Young person</th><th scope="col">Care stage</th><th scope="col">Assigned</th></tr></thead>
              <tbody>{visiblePeople.map(person => <tr key={person.id}>
                <td><strong>{person.name}</strong><small className="access-person-id">{person.id}</small></td>
                <td><Badge>{personStage(person)}</Badge></td>
                <td><Checkbox className="access-assigned-checkbox" label={`Assign ${person.name} to ${selected.name}`} verbatim checked={(selected.assignedPersonIds || []).includes(person.id)}
                  onChange={event => dispatch({ type: 'SET_ACCESS_ASSIGNMENT', userId: selected.id, personId: person.id, assigned: event.target.checked })} /></td>
              </tr>)}</tbody>
            </StandardTable>
            {!visiblePeople.length && <Empty title="No matching people">Try a different name or record ID.</Empty>}
          </>}
        </Panel>
      </div> : <Empty title="Assignment management is available to General Manager">Switch to the General Manager demo profile to manage user assignments.</Empty>}
      </div>
      <p className="muted">Access changes stay in this browser. Connected access requires authenticated accounts and server-side authorization.</p>
    </div>
  </>;
}
