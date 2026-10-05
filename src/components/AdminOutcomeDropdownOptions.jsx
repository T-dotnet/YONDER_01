import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { matchingOutcomeName, outcomeCodeFromLabel, outcomeDropdownOptions, outcomeOptionIdentityError, outcomeOptionName } from '../assessmentOutcome.js';
import { DEFAULT_OUTCOME_GROUP_ID, outcomeDecisionGroups, outcomeGroupForOption, outcomeGroupOptions } from '../outcomeDecisionGroups.js';
import { OUTCOME_EPISODE_STATUS_OPTIONS, episodeStatusForOutcome } from '../outcomeEpisodeStatus.js';
import { useStore } from '../store';
import { ActionGroup, Button, DeleteAction, EditAction, FieldInput, FieldSelect, Panel, Switch } from './UI';
import ListFilterBar from './ListFilterBar';
import { AdministrationEditorLayout, AdministrationEnabledSetting,
  AdministrationEditorSectionHeading } from './AdministrationEditorLayout';
import StandardTable from './StandardTable';
import { QueueCell, QueueRow } from './QueueRow';

export default function AdminOutcomeDropdownOptions() {
  const { state, commit } = useStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [groupDraft, setGroupDraft] = useState(null);
  const [groupError, setGroupError] = useState('');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const labelInput = useRef(null);
  const allOptions = outcomeDropdownOptions(state.settings);
  const groups = outcomeDecisionGroups(state.settings);
  const enabled = value => state.settings?.outcomeOptionEnabled?.[value] !== false;
  const groupInUse = id => [state.settings?.clientProfileBundle,
    ...(state.settings?.mvpInitialBundles || []), ...(state.settings?.mvpReviewBundles || []),
    ...(state.settings?.assessmentScheduleRules || [])].some(bundle => bundle?.outcomeGroupId === id);
  const options = allOptions.filter(option =>
    `${option.code} ${option.label}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (status === 'All' || (enabled(option.value) ? 'Enabled' : 'Disabled') === status));
  const clearFilters = () => { setQuery(''); setStatus('All'); };
  const openEditor = (groupId, option) => { setError(''); setDraft(option
    ? { ...option, groupId: outcomeGroupForOption(state.settings, option.value), enabled: enabled(option.value), episodeStatus: episodeStatusForOutcome(state.settings, option.value) }
    : { value: '', code: '', label: '', groupId, enabled: true, episodeStatus: 'No action' }); };
  const save = event => {
    event.preventDefault();
    const rawLabel = draft.label.trim();
    const label = outcomeOptionName(rawLabel);
    const sameName = matchingOutcomeName(allOptions, label, draft.value)[0];
    const code = draft.code.trim() || sameName?.code || outcomeCodeFromLabel(rawLabel);
    if (!label) return setError('Enter an outcome option.');
    if (label.length > 180) return setError('Use 180 characters or fewer.');
    if (code.length > 30) return setError('Use 30 characters or fewer for the code.');
    const identityError = outcomeOptionIdentityError(state.settings, { value: draft.value, label, code, groupId: draft.groupId });
    if (identityError) return setError(identityError);
    commit({ type: draft.value ? 'EDIT_OUTCOME_DROPDOWN_OPTION' : 'ADD_OUTCOME_DROPDOWN_OPTION',
      value: draft.value, label, code, groupId: draft.groupId, enabled: draft.enabled, status: draft.episodeStatus });
    setDraft(null);
  };
  const saveGroup = event => {
    event.preventDefault();
    const name = groupDraft.name.trim();
    if (!name || groups.some(group => group.id !== groupDraft.id && group.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setGroupError('Enter a unique group name.'); return;
    }
    const result = commit({ type: 'SAVE_OUTCOME_DECISION_GROUP', id: groupDraft.id, name });
    if (result?.error) setGroupError(result.error);
    else setGroupDraft(null);
  };
  return <div className="stack administration-outcome-options">
    <div className="section-toolbar administration-section-heading">
      <div><h2>Outcome decision groups</h2><p>Give each group its own options, then choose a group in an Assessment Pack.</p></div>
      <Button variant="primary" onClick={() => { setGroupError(''); setGroupDraft({ id: '', name: '' }); }}>Add group</Button>
    </div>
    <Panel className="admin-panel">
      <ListFilterBar id="admin-dropdown-option-filters" label="Outcome options" className="administration-filter-bar"
        items={['All', 'Enabled', 'Disabled'].map(value => ({ value, label: value,
          count: value === 'All' ? allOptions.length : allOptions.filter(option => (enabled(option.value) ? 'Enabled' : 'Disabled') === value).length }))}
        value={status} onChange={setStatus} query={query} onQueryChange={setQuery} placeholder="Search outcome options"
        shown={options.length} total={allOptions.length} noun="outcome options"
        onClear={clearFilters} activeFilters={[
          ...(query ? [{ id: 'search', label: `Search: ${query}`, onRemove: () => setQuery('') }] : []),
          ...(status !== 'All' ? [{ id: 'status', label: `Status: ${status}`, onRemove: () => setStatus('All') }] : []),
        ]} />
    </Panel>
    <div className="administration-outcome-cards" aria-label="Outcome decision groups">
      {groups.map(group => {
        const allGroupOptions = outcomeGroupOptions(state.settings, group.id, allOptions);
        const visibleOptions = outcomeGroupOptions(state.settings, group.id, options);
        const filtered = !!query || status !== 'All';
        const enabledCount = allGroupOptions.filter(option => enabled(option.value)).length;
        return <Panel key={group.id} className="assessment-bundle-summary administration-outcome-decision-card"
          title={<span className="bundle-summary-heading">
            <span className="bundle-summary-title">{group.name}</span>
          </span>}
          action={<ActionGroup className="button-row bundle-summary-actions">
              <EditAction onClick={() => { setGroupError(''); setGroupDraft(group); }} aria-label={`Edit ${group.name}`}>Edit group</EditAction>
              {group.id !== DEFAULT_OUTCOME_GROUP_ID && !allGroupOptions.length && !groupInUse(group.id) &&
                <DeleteAction aria-label={`Remove ${group.name}`} onClick={() =>
                  commit({ type: 'DELETE_OUTCOME_DECISION_GROUP', id: group.id })}>Remove group</DeleteAction>}
          </ActionGroup>}>
          <div className="panel-body">
            <dl className="metadata bundle-summary-conditions">
              <div><dt>Outcome options</dt><dd>{allGroupOptions.length} total</dd></div>
              <div><dt>Enabled</dt><dd>{enabledCount} of {allGroupOptions.length}</dd></div>
            </dl>
            <details className="bundle-summary-assessments" open={filtered ? true : undefined}>
              <summary className="bundle-summary-assessments-heading">
                <span>Outcome options</span>
                <span className="muted">{filtered ? `${visibleOptions.length} of ${allGroupOptions.length}` : allGroupOptions.length} total</span>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <div className="collection-details-accordion-body">
                <ActionGroup className="button-row administration-outcome-group-actions">
                  <Button type="button" variant="secondary" onClick={() => openEditor(group.id)}>Add outcome option</Button>
                </ActionGroup>
                {visibleOptions.length ? <StandardTable label={`${group.name} outcome options`} density="compact" responsive={false}
                  className="administration-outcome-group-table">
                  <thead><tr><th scope="col">Code</th><th scope="col">Outcome option</th><th scope="col">Episode status</th><th scope="col">Actions</th></tr></thead>
                  <tbody>{visibleOptions.map(option => <QueueRow key={option.value}>
                    <QueueCell label="Code" slot="metadata">{option.code || '—'}</QueueCell>
                    <QueueCell label="Outcome option" slot="subject" verbatim><strong>{option.label}</strong></QueueCell>
                    <QueueCell label="Episode status" slot="state">{episodeStatusForOutcome(state.settings, option.value)}</QueueCell>
                    <QueueCell label="Actions" slot="action" verbatim><ActionGroup className="button-row">
                      <Switch label={`Enable ${option.label}`} checked={enabled(option.value)}
                        onChange={event => commit({ type: 'SET_OUTCOME_OPTION_ENABLED', outcome: option.value, enabled: event.target.checked })} />
                      <EditAction onClick={() => openEditor(group.id, option)} aria-label={`Edit ${option.label}`}>Edit</EditAction>
                    </ActionGroup></QueueCell>
                  </QueueRow>)}</tbody>
                </StandardTable> : <p className="muted">{filtered && allGroupOptions.length
                  ? 'No options match these filters.' : 'No outcome options in this group yet.'}</p>}
              </div>
            </details>
          </div>
        </Panel>;
      })}
    </div>
    {draft && <AdministrationEditorLayout title={draft.value ? 'Edit outcome option' : 'Add outcome option'}
      subtitle="Set when this option is available and what it does to the care episode."
      onClose={() => setDraft(null)} onSubmit={save} initialFocusRef={labelInput} error={error}
      submitLabel={draft.value ? 'Save outcome option' : 'Add outcome option'}>
      <div className="assessment-schedule-fields">
        <AdministrationEnabledSetting description="Show this option in the Record outcome dropdown."
          label="Enable this outcome option" checked={draft.enabled}
          onChange={enabled => setDraft(current => ({ ...current, enabled }))} />
        <FieldInput className="bundle-name-field" label="Code" value={draft.code} maxLength={30}
          onChange={event => { setDraft(current => ({ ...current, code: event.target.value })); setError(''); }} />
        <FieldInput className="bundle-name-field" label="Outcome option" ref={labelInput} required
          value={draft.label} maxLength={180}
          onChange={event => { setDraft(current => ({ ...current, label: event.target.value })); setError(''); }} />
        <FieldSelect className="bundle-name-field" label="Decision group" value={draft.groupId}
          disabled={!!draft.value && draft.value.startsWith('custom:') === false}
          onChange={event => setDraft(current => ({ ...current, groupId: event.target.value }))}>
          {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
        </FieldSelect>
        <div className="bundle-name-field bundle-timing-fields assessment-pack-schedule">
          <AdministrationEditorSectionHeading>After recording</AdministrationEditorSectionHeading>
          <FieldSelect className="bundle-name-field" label="Episode status" value={draft.episodeStatus}
            onChange={event => setDraft(current => ({ ...current, episodeStatus: event.target.value }))}>
            {OUTCOME_EPISODE_STATUS_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
          </FieldSelect>
        </div>
        {draft.value && <p className="muted bundle-name-field">Changing the label does not change outcomes already recorded.</p>}
      </div>
    </AdministrationEditorLayout>}
    {groupDraft && <AdministrationEditorLayout title={groupDraft.id ? 'Edit outcome group' : 'Add outcome group'}
      onClose={() => setGroupDraft(null)} onSubmit={saveGroup} error={groupError}
      submitLabel={groupDraft.id ? 'Save group' : 'Add group'}>
      <FieldInput label="Group name" required maxLength={80} value={groupDraft.name}
        onChange={event => { setGroupDraft(current => ({ ...current, name: event.target.value })); setGroupError(''); }} />
    </AdministrationEditorLayout>}
  </div>;
}
