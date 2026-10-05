import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { dataDictionaryCatalog, DICTIONARY_CHANGED } from '../dataDictionaryCatalog.js';
import { dictionaryStageRuleError, dictionaryStageRuleFor } from '../dictionaryStageOutcomes.js';
import { statusOutcomeRules } from '../statusOutcomeRules.js';
import { useStore } from '../store';
import { ActionGroup, Button, EditAction, Field, Modal, Panel, Select, Switch } from './UI';

const fieldLabel = field => `${field.label} · ${field.measure} · ${field.variable || field.questionId || field.id}`;
const usableField = field => !field.draft && (field.measure !== 'Derived field' ||
  ['episode_program_stream', 'discharge_date', 'age_at_episode_commencement'].includes(field.variable));

function Condition({ condition, fields, onChange, onRemove }) {
  const listId = useId();
  const selected = fields.find(field => field.id === condition.fieldId);
  const [search, setSearch] = useState(selected ? fieldLabel(selected) : '');
  useEffect(() => { setSearch(selected ? fieldLabel(selected) : ''); }, [selected?.id, selected?.label, selected?.measure, selected?.variable]);
  return <div className="dictionary-stage-condition">
    <Field label="Data dictionary item">
      <input type="search" list={listId} autoComplete="off" required
        placeholder="Search items" value={search} onChange={event => {
          const text = event.target.value;
          setSearch(text);
          const field = fields.find(item => item.enabled && fieldLabel(item) === text);
          onChange({ fieldId: field?.id || '', value: '' });
        }} />
      <datalist id={listId}>{fields.filter(field => field.enabled).map(field => <option key={field.id} value={fieldLabel(field)} />)}</datalist>
    </Field>
    {selected?.values.length ? <Field label="Value"><Select label="Value" required value={condition.value}
      onChange={event => onChange({ ...condition, value: event.target.value })}>
      <option value="">Choose a value</option>
      {selected.values.map(value => <option key={value} value={value}>{value}</option>)}
    </Select></Field> : <Field label="Value"><input required disabled={!selected} value={condition.value}
      placeholder={selected ? 'Enter a value' : 'Choose an item first'}
      onChange={event => onChange({ ...condition, value: event.target.value })} /></Field>}
    <Button type="button" variant="secondary" onClick={onRemove}>Remove condition</Button>
  </div>;
}

export default function DictionaryStageOutcomeOptions() {
  const { state, commit } = useStore();
  const rules = statusOutcomeRules(state.settings);
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener(DICTIONARY_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(DICTIONARY_CHANGED, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const fields = dataDictionaryCatalog().filter(usableField);
  const fieldById = new Map(fields.map(field => [field.id, field]));
  const openEditor = rule => {
    setDraft(structuredClone(dictionaryStageRuleFor(state.settings, rule.from, rule.to) ||
      { from: rule.from, to: rule.to, enabled: true, conditions: [] }));
    setError('');
  };
  const save = event => {
    event.preventDefault();
    const message = dictionaryStageRuleError(draft);
    if (message) { setError(message); return; }
    const previous = dictionaryStageRuleFor(state.settings, draft.from, draft.to);
    if (JSON.stringify(previous) === JSON.stringify(draft)) { setDraft(null); return; }
    const result = commit({ type: 'SAVE_DICTIONARY_STAGE_RULE', rule: draft });
    if (result.error) setError(result.error);
    else setDraft(null);
  };
  const updateCondition = (index, condition) => setDraft(current => ({ ...current,
    conditions: current.conditions.map((item, position) => position === index ? condition : item) }));
  return <>
    <div className="stack administration-outcome-options">
      <div className="section-toolbar administration-section-heading"><div>
        <h2>Record outcomes</h2>
        <p>Link Data dictionary values to stage changes. Every condition in a stage change must match.</p>
      </div></div>
      <div className="administration-outcome-cards" aria-label="Dictionary stage changes">
        {rules.map(rule => {
          const mapping = dictionaryStageRuleFor(state.settings, rule.from, rule.to);
          const valid = mapping && !dictionaryStageRuleError(mapping);
          return <Panel key={`${rule.from}-${rule.to}`} className="assessment-bundle-summary administration-outcome-card"
            title={<span className="bundle-summary-heading"><span className="bundle-summary-title">{rule.from} → {rule.to}</span></span>}
            action={<ActionGroup className="button-row bundle-summary-actions">
              <Switch label={`Use Data dictionary values for ${rule.from} to ${rule.to}`}
                checked={!!mapping?.enabled} disabled={!valid && !mapping?.enabled}
                onChange={event => commit({ type: 'SAVE_DICTIONARY_STAGE_RULE',
                  rule: { ...mapping, enabled: event.target.checked } })} />
              <EditAction aria-label={`Edit ${rule.from} to ${rule.to} Data dictionary mapping`}
                onClick={() => openEditor(rule)}>Edit</EditAction>
            </ActionGroup>}>
            <div className="panel-body"><details className="bundle-summary-assessments administration-outcome-accordion">
              <summary className="bundle-summary-assessments-heading">
                <span>Linked values</span><span className="muted">{mapping?.conditions?.length || 0} conditions</span><ChevronDown size={18} aria-hidden="true" />
              </summary>
              <div className="collection-details-accordion-body administration-outcome-accordion-body">
                {mapping?.conditions?.length ? <ul className="administration-outcome-selected-options">
                  {mapping.conditions.map((condition, index) => <li key={`${condition.fieldId}-${index}`}>
                    {fieldById.get(condition.fieldId)?.label || 'Unavailable dictionary item'} = {condition.value}
                  </li>)}
                </ul> : <p className="muted">No Data dictionary values linked.</p>}
                {mapping && !valid && <p className="form-error">A linked item or value has changed. Edit this mapping before recording the stage change.</p>}
                <Button type="button" variant="secondary" onClick={() => openEditor(rule)}>Edit linked values</Button>
              </div>
            </details></div>
          </Panel>;
        })}
      </div>
    </div>
    {draft && <Modal title="Link stage change to Data dictionary" subtitle={`${draft.from} → ${draft.to}`}
      wide onClose={() => setDraft(null)}>
      <form onSubmit={save}>
        <div className="form-body administration-outcome-editor">
          <p className="muted">All linked item values must match in the person’s care episode before this stage change can be recorded.</p>
          <div className="administration-outcome-editor-enabled"><div><strong>Record outcome</strong>
            <p className="muted">Show this stage change when its linked values match.</p></div>
            <Switch label={`Record outcome for ${draft.from} to ${draft.to}`} checked={draft.enabled}
              onChange={event => setDraft(current => ({ ...current, enabled: event.target.checked }))} />
          </div>
          <fieldset className="administration-outcome-fieldset"><legend>Linked Data dictionary values</legend>
            {draft.conditions.map((condition, index) => <Condition key={index} condition={condition} fields={fields}
              onChange={value => { updateCondition(index, value); setError(''); }}
              onRemove={() => setDraft(current => ({ ...current,
                conditions: current.conditions.filter((_, position) => position !== index) }))} />)}
            <Button type="button" variant="secondary" onClick={() => setDraft(current => ({ ...current,
              conditions: [...current.conditions, { fieldId: '', value: '' }] }))}>Add condition</Button>
          </fieldset>
          {error && <p role="alert" className="form-error">{error}</p>}
        </div>
        <ActionGroup className="modal-footer">
          <Button type="button" onClick={() => setDraft(null)}>Cancel</Button>
          <Button type="submit" variant="primary">Save stage change</Button>
        </ActionGroup>
      </form>
    </Modal>}
  </>;
}
