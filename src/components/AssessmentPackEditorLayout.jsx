import { Trash2 } from 'lucide-react';
import { Button, Checkbox, Field, FieldInput, FieldSelect, IconButton, Select } from './UI';
import AllowedCollectionMethods from './AllowedCollectionMethods';
import { AdministrationEditorLayout, AdministrationEditorSectionHeading } from './AdministrationEditorLayout';

export const ASSESSMENT_PACK_EDITOR_SUBTITLE = 'Set when this pack is used, how responses are collected, and which measures it includes.';

export function AssessmentPackEditorLayout({ title, onClose, onSubmit, nameInput, error, children, className = '', submitDisabled = false }) {
  return <AdministrationEditorLayout title={title} subtitle={ASSESSMENT_PACK_EDITOR_SUBTITLE}
    onClose={onClose} onSubmit={onSubmit} initialFocusRef={nameInput} error={error}
    className={className} submitLabel="Save Assessment Pack" submitDisabled={submitDisabled}>
    {children}
  </AdministrationEditorLayout>;
}

export function AssessmentPackSectionHeading({ children }) {
  return <AdministrationEditorSectionHeading>{children}</AdministrationEditorSectionHeading>;
}

export function AssessmentPackScheduleInputs({ days, minDays = 0, after, options, onDaysChange, onTriggerChange, children }) {
  return <>
    <FieldInput label="Days after trigger" required type="number" min={minDays} max="728" step="1"
      value={days} onChange={event => onDaysChange(Number(event.target.value))} />
    <FieldSelect label="Trigger" required value={after || ''} onChange={event => onTriggerChange(event.target.value)}>
      <option value="">Choose a trigger</option>
      {options.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
    </FieldSelect>
    {children}
  </>;
}

export function AssessmentPackRepeat({ checked = false, disabled = false, describedBy, onChange }) {
  return <Checkbox className="bundle-repeat-choice" label="Repeat on this schedule" checked={checked}
    disabled={disabled} aria-describedby={describedBy}
    onChange={event => onChange?.(event.target.checked)} />;
}

export function AssessmentPackCollection({ bundle, respondent, respondentDisabled = false, methods, onRespondentChange, onMethodsChange }) {
  return <>
    <AssessmentPackSectionHeading>Collection</AssessmentPackSectionHeading>
    <FieldSelect label="Respondent" value={respondent} disabled={respondentDisabled}
      onChange={event => onRespondentChange?.(event.target.value)}>
      <option value="Person">Patient</option><option value="Clinician">Clinician</option>
    </FieldSelect>
    <AllowedCollectionMethods bundle={bundle} methods={methods} onChange={onMethodsChange} />
  </>;
}

export function AssessmentPackConditionPicker({ options, selected, value, onValueChange, onAdd }) {
  const remaining = options.filter(([key]) => !selected.includes(key));
  if (!remaining.length) return null;
  return <div className="bundle-name-field new-bundle-extra-picker">
    <Field label="Condition"><Select value={value} onChange={event => onValueChange(event.target.value)}>
      <option value="">Choose a condition</option>
      {remaining.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </Select></Field>
    <Button type="button" disabled={!value} onClick={onAdd}>Add condition</Button>
  </div>;
}

export function AssessmentPackConditionRow({ label, onRemove, children }) {
  return <div className="bundle-name-field bundle-parameter-row">
    {children}
    <IconButton icon={Trash2} label={`Remove ${label} condition`} className="bundle-editor-delete" onClick={onRemove} />
  </div>;
}

export function AssessmentPackMeasurePicker({ available, value, onValueChange, onAdd, emptyLabel = 'All available measures have been added.' }) {
  if (!available.length) return <p className="muted">{emptyLabel}</p>;
  return <div className="new-bundle-extra-picker">
    <Field label="Measure"><Select value={value} onChange={event => onValueChange(event.target.value)}>
      <option value="">Choose a measure</option>
      {available.map(item => <option key={item.version} value={item.version}>{item.name}</option>)}
    </Select></Field>
    <Button type="button" disabled={!value} onClick={onAdd}>Add measure</Button>
  </div>;
}
