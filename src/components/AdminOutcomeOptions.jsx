import { useState } from 'react';
import ListFilterBar from './ListFilterBar';
import { ChevronDown } from 'lucide-react';
import { mvpPathwayEnabled } from '../mvpAssessmentPathway.js';
import { outcomeOptionLabel } from '../assessmentOutcome.js';
import { STATUS_OUTCOME_STATES, sharedStatusOutcomeOptions, statusOutcomeRules, visibleStatusOutcomeOptions } from '../statusOutcomeRules.js';
import { useStore } from '../store';
import { dictionaryStageMode } from '../dictionaryStageOutcomes.js';
import DictionaryStageOutcomeOptions from './DictionaryStageOutcomeOptions';
import { ActionGroup, Button, Checkbox, DeleteAction, EditAction, Empty, Field, Modal, Panel, Select, Switch } from './UI';

export default function AdminOutcomeOptions() {
  const { state, commit } = useStore();
  const settings = state.settings || {};
  const rules = statusOutcomeRules(settings);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [source, setSource] = useState('');
  const sources = [...new Set(rules.map(rule => rule.from))].sort();
  const clearFilters = () => { setQuery(''); setStatus('All'); setSource(''); };
  const filteredRules = rules.filter(rule =>
    (status === 'All' || (rule.enabled ? 'Enabled' : 'Disabled') === status) &&
    (!source || rule.from === source) &&
    `${rule.from} ${rule.to} ${visibleStatusOutcomeOptions(rule).join(' ')}`.toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()));
  const canCreate = STATUS_OUTCOME_STATES.some(from => STATUS_OUTCOME_STATES.some(to =>
    !rules.some(rule => rule.from === from && rule.to === to)));
  const editing = draft?.rule;
  const visible = visibleStatusOutcomeOptions(editing);

  const openCreate = () => {
    const transition = STATUS_OUTCOME_STATES.flatMap(from => STATUS_OUTCOME_STATES.map(to => ({ from, to })))
      .find(item => !rules.some(rule => rule.from === item.from && rule.to === item.to));
    if (!transition) return;
    setDraft({ isNew: true, rule: { ...transition, enabled: true,
      options: sharedStatusOutcomeOptions([], settings).map(option => ({ ...option, visible: true })) } });
    setError('');
  };
  const openEditor = rule => {
    setDraft({ rule: structuredClone(rule) });
    setError('');
  };
  const update = change => {
    setDraft(current => ({ ...current, rule: { ...current.rule, ...change } }));
    setError('');
  };
  const save = event => {
    event.preventDefault();
    if (editing.builtIn && !visible.length) {
      setError('Show at least one outcome in the dropdown.');
      return;
    }
    if (editing.enabled && !visible.length) {
      setError('Show at least one outcome before enabling this status change.');
      return;
    }
    if (draft.isNew && rules.some(rule => rule.from === editing.from && rule.to === editing.to)) {
      setError('That status change already exists.');
      return;
    }
    const current = rules.find(rule => rule.from === editing.from && rule.to === editing.to);
    if (JSON.stringify(current) === JSON.stringify(editing)) {
      setDraft(null);
      return;
    }
    const result = editing.builtIn
      ? commit({ type: 'SAVE_ASSESSMENT_OUTCOME_CONFIG', enabled: editing.enabled, options: visible })
      : commit({ type: 'SAVE_STATUS_OUTCOME_RULE', rule: editing });
    if (result.error) setError(result.error);
    else setDraft(null);
  };
  const toggleRule = (rule, enabled) => {
    if (rule.builtIn) commit({ type: 'SET_MVP_RECORD_ASSESSMENT_OUTCOME', enabled });
    else commit({ type: 'SAVE_STATUS_OUTCOME_RULE', rule: { ...rule, enabled } });
  };

  if (dictionaryStageMode(settings)) return <DictionaryStageOutcomeOptions />;
  return <>
    <div className="stack administration-outcome-options">
      <div className="section-toolbar administration-section-heading">
        <div>
          <h2>Record outcome options</h2>
          <p>Choose which outcomes appear when a measure changes status.</p>
        </div>
        <ActionGroup className="button-row"><Button type="button" variant="primary"
          disabled={!canCreate} onClick={openCreate}>Add status change</Button></ActionGroup>
      </div>
      <Panel className="admin-panel"><ListFilterBar id="admin-outcome-filters" label="Record outcome status" className="administration-filter-bar"
        items={['All', 'Enabled', 'Disabled'].map(value => ({ value, label:value,
          count:value === 'All' ? rules.length : rules.filter(rule => (rule.enabled ? 'Enabled' : 'Disabled') === value).length }))}
        value={status} onChange={setStatus} query={query} onQueryChange={setQuery}
        placeholder="Search status changes or outcomes" shown={filteredRules.length} total={rules.length}
        noun="status changes" onClear={clearFilters} activeAdvancedCount={Number(Boolean(source))}
        activeFilters={[
          ...(query ? [{id:'search', label:`Search: ${query}`, onRemove:()=>setQuery('')}] : []),
          ...(status !== 'All' ? [{id:'status', label:`Status: ${status}`, onRemove:()=>setStatus('All')}] : []),
          ...(source ? [{id:'source', label:`From: ${source}`, onRemove:()=>setSource('')}] : []),
        ]}
        advanced={<Select label="From status" value={source} onChange={event => setSource(event.target.value)}>
          <option value="">All starting statuses</option>
          {sources.map(value => <option key={value} value={value}>{value}</option>)}
        </Select>} /></Panel>
      <div className="administration-outcome-cards" aria-label="Record outcome settings">
        {!filteredRules.length && <Empty title="No status changes match these filters" action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>
          Try another search or filter.
        </Empty>}
        {filteredRules.map(rule => {
            const options = visibleStatusOutcomeOptions(rule);
            const shown = options.length;
            const ruleKey = `${rule.from}-${rule.to}`;
            return <Panel key={ruleKey} className="assessment-bundle-summary administration-outcome-card"
              title={<span className="bundle-summary-heading"><span className="bundle-summary-title">{rule.from} → {rule.to}</span></span>}
              action={<ActionGroup className="button-row bundle-summary-actions">
                <Switch label={`Record outcome for ${rule.from} to ${rule.to}`}
                  checked={rule.enabled}
                  disabled={(rule.builtIn && !mvpPathwayEnabled(settings)) || (!rule.enabled && !shown)}
                  onChange={event => toggleRule(rule, event.target.checked)} />
                <EditAction aria-label={`Edit ${rule.from} to ${rule.to}`} onClick={() => openEditor(rule)}>Edit</EditAction>
                {!rule.mandatory && <DeleteAction aria-label={`Remove ${rule.from} to ${rule.to}`}
                  onClick={() => setPendingDelete(rule)}>Remove</DeleteAction>}
              </ActionGroup>}>
              <div className="panel-body">
                <details className="bundle-summary-assessments administration-outcome-accordion">
                  <summary className="bundle-summary-assessments-heading">
                    <span>Dropdown options</span><span className="muted">{shown} of {rule.options.length} shown</span><ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="collection-details-accordion-body administration-outcome-accordion-body">
                    {shown ? <ul className="administration-outcome-selected-options">
                      {options.map(option => <li key={option}>{outcomeOptionLabel(settings, option)}</li>)}
                    </ul> : <p className="muted">No options shown.</p>}
                    <Button type="button" variant="secondary" onClick={() => openEditor(rule)}>Edit options</Button>
                  </div>
                </details>
              </div>
            </Panel>;
          })}
      </div>
    </div>
    {draft && <Modal title={draft.isNew ? "Add status change" : "Edit record outcome"}
      subtitle={draft.isNew ? "Choose the status change and its Record outcome options" : `${editing.from} → ${editing.to}`}
      wide onClose={() => setDraft(null)}>
      <form onSubmit={save}>
        <div className={`form-body administration-outcome-editor${draft.isNew ? " is-new" : ""}`}>
          <div className="administration-outcome-editor-enabled">
            <div><strong>Record outcome</strong><p className="muted">Show the Record outcome action for this status change.</p></div>
            <Switch label={`Record outcome for ${editing.from} to ${editing.to}`}
              checked={editing.enabled}
              disabled={(editing.builtIn && !mvpPathwayEnabled(settings)) || (!editing.enabled && !visible.length)}
              onChange={event => update({ enabled: event.target.checked })} />
          </div>
          {draft.isNew && <div className="administration-outcome-transition-fields">
            <Field label="From status"><Select label="From status" value={editing.from}
              onChange={event => update({ from: event.target.value })}>
              {STATUS_OUTCOME_STATES.map(value => <option key={value} value={value}>{value}</option>)}
            </Select></Field>
            <Field label="To status"><Select label="To status" value={editing.to}
              onChange={event => update({ to: event.target.value })}>
              {STATUS_OUTCOME_STATES.map(value => <option key={value} value={value}>{value}</option>)}
            </Select></Field>
          </div>}
          {!draft.isNew && <p className="muted">{editing.builtIn
            ? 'Assessment outcomes are coded values. Recording one determines whether the episode proceeds to Ongoing review.'
            : 'Record an outcome on the completed measure that changes this status.'}</p>}
          <fieldset className="administration-outcome-fieldset">
            <legend>Show in the Record outcome dropdown</legend>
            <p className="muted">The same coded options are available for every status change. Tick the ones to show here. Previously recorded outcomes remain on existing records.</p>
            <div className="administration-outcome-option-list">
              {editing.options.map(option => <div className="administration-outcome-option" key={option.value}>
                <Checkbox label={outcomeOptionLabel(settings, option.value)} verbatim checked={option.visible}
                  disabled={option.visible && visible.length === 1 && (editing.enabled || editing.builtIn)}
                  onChange={event => update({ options: editing.options.map(item => item.value === option.value
                    ? { ...item, visible: event.target.checked } : item) })} />
              </div>)}
            </div>
          </fieldset>
          {error && <p role="alert" className="form-error">{error}</p>}
        </div>
        <ActionGroup className="modal-footer">
          <Button type="button" onClick={() => setDraft(null)}>Cancel</Button>
          <Button type="submit" variant="primary">{draft.isNew ? "Add status change" : "Save status change"}</Button>
        </ActionGroup>
      </form>
    </Modal>}
    {pendingDelete && <Modal title="Remove status change?" subtitle={`${pendingDelete.from} → ${pendingDelete.to}`}
      onClose={() => setPendingDelete(null)}>
      <div className="form-body"><p>Recorded outcomes stay on existing records. This status change can be added again later.</p></div>
      <ActionGroup className="modal-footer">
        <Button type="button" onClick={() => setPendingDelete(null)}>Cancel</Button>
        <Button type="button" variant="primary" onClick={() => {
          commit({ type: 'DELETE_STATUS_OUTCOME_RULE', from: pendingDelete.from, to: pendingDelete.to });
          setPendingDelete(null);
        }}>Remove status change</Button>
      </ActionGroup>
    </Modal>}
  </>;
}
