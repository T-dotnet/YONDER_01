import { useRef, useState } from 'react';
import { clientProfileBundleError, clientProfileMeasureOptions } from '../clientProfileMeasure';
import { INSTRUMENTS } from '../instruments';
import { FieldInput, FieldSelect, Select } from './UI';
import BundleAssessmentRow from './BundleAssessmentRow';
import { moveItem } from '../reorderItems';
import ConfirmRemoval from './ConfirmRemoval';
import MockAssessmentPackSchedule from './MockAssessmentPackSchedule';
import { measureSourceOptions, measureTriggerIds } from '../measureTriggers';
import ProfileValueTriggerFields from './ProfileValueTriggerFields';
import { CARE_LEVELS, PROGRAM_STREAMS } from '../carePeriods';
import AssessmentPackIdentity from './AssessmentPackIdentity';
import { measureEnabled } from '../catalogAvailability';
import { AssessmentPackEditorLayout, AssessmentPackCollection, AssessmentPackSectionHeading,
  AssessmentPackConditionPicker, AssessmentPackConditionRow, AssessmentPackMeasurePicker } from './AssessmentPackEditorLayout';

const parameterOptions = [['programStream', 'Program stream'], ['careLevel', 'Care level'], ['minAge', 'Minimum age (years)'],
  ['maxAge', 'Maximum age (years)'], ['profileValue', 'Data field']];

export default function ClientProfileBundleEditor({ bundle, settings, onClose, onSave }) {
  const [draft, setDraft] = useState(() => (settings?.phase2CareActivity && settings?.mvpSchedulePresets !== false) && (!['new-profile', 'intake', 'care-period'].includes(bundle.after) || bundle.timing === 'date') ? { ...bundle, timing: 'days', after: 'new-profile', delayDays: 0, dueDate: '' } : bundle);
  const [version, setVersion] = useState('');
  const [parameterToAdd, setParameterToAdd] = useState('');
  const [parameters, setParameters] = useState(parameterOptions.map(([key]) => key).filter(key =>
    key === 'profileValue' ? !!bundle.triggerDataEnabled :
      key === 'programStream' ? bundle.programStream && bundle.programStream !== 'All' :
      key === 'careLevel' ? bundle.careLevel && bundle.careLevel !== 'All' : bundle[key] != null));
  const [error, setError] = useState('');
  const [pendingParameterRemoval, setPendingParameterRemoval] = useState(null);
  const nameInput = useRef(null);
  const change = (key, value) => { setDraft(current => ({ ...current, [key]: value })); setError(''); };
  const selected = draft.instrumentVersions || [];
  const options = clientProfileMeasureOptions(INSTRUMENTS);
  const available = options.filter(item => measureEnabled(item.version) && !selected.includes(item.version));
  const sourceOptions = measureSourceOptions(settings, draft.id).filter(item =>
    settings?.assessmentScheduleRules?.some(rule => rule.id === item.id &&
      !(rule.after === 'specific-measure' && measureTriggerIds(rule).includes(draft.id))));
  const save = event => {
    event.preventDefault();
    const validation = clientProfileBundleError(draft, settings, INSTRUMENTS);
    if (validation) return setError(validation);
    if (JSON.stringify(draft) === JSON.stringify(bundle)) return onClose();
    const result = onSave(draft);
    if (result?.error) return setError(result.error);
    onClose();
  };
  return <><AssessmentPackEditorLayout title="Edit Assessment Pack" onClose={onClose} onSubmit={save}
    nameInput={nameInput} error={error}>
        <div className="assessment-schedule-fields">
          <AssessmentPackIdentity name={draft.name} enabled={draft.enabled} nameInput={nameInput}
            settings={settings} recordOutcome={draft.recordOutcome} outcomeGroupId={draft.outcomeGroupId}
            onOutcomeSelectionChange={value => { setDraft(current => ({ ...current, recordOutcome: !!value, outcomeGroupId: value || current.outcomeGroupId })); setError(''); }}
            onNameChange={value => change('name', value)} onEnabledChange={value => change('enabled', value)} />
          <AssessmentPackCollection bundle={draft} respondent="Person" respondentDisabled
            methods={['Clinic tablet', 'Clinician entry',
              ...(settings?.assessmentSms === false ? [] : ['SMS link'])]} onMethodsChange={methods => {
            setDraft(current => ({ ...current, allowedCollectionMethods: methods,
              channel: methods?.length && !methods.includes(current.channel) ? methods[0] : current.channel }));
            setError('');
          }} />
          {(settings?.phase2CareActivity && settings?.mvpSchedulePresets !== false) ? <div className="bundle-name-field mvp-preset-content">
              <div className="mvp-preset-label">Care point preset</div>
            <Select className="mvp-care-point-select" label="Care point preset" value={draft.after || 'new-profile'} onChange={event => setDraft(current => ({ ...current, timing: 'days', after: event.target.value, delayDays: 0, dueDate: '' }))}>
              <option value="new-profile">New profile</option>
              <option value="intake">Intake</option>
              <option value="care-period">Care episode starts</option>
            </Select>
            <p className="muted">{draft.after === 'intake' ? 'Prepare once when intake is completed.' : draft.after === 'care-period' ? 'Prepare once when the care episode starts.' : 'Prepare once when a new profile is created.'}</p>
          </div> : <MockAssessmentPackSchedule draft={draft} settings={settings} change={change}
            timeKey="delayDays" sourceOptions={sourceOptions} />}
          <AssessmentPackSectionHeading>When this pack applies</AssessmentPackSectionHeading>
          {parameters.map(key => <AssessmentPackConditionRow key={key} label={parameterOptions.find(([value]) => value === key)?.[1]}
            onRemove={() => setPendingParameterRemoval(key)}>
            {key === 'profileValue' ? <ProfileValueTriggerFields draft={draft} change={change} />
              : key === 'programStream' ? <FieldSelect label="Program stream" required
                value={draft.programStream === 'All' ? '' : draft.programStream}
                onChange={event => change('programStream', event.target.value)}>
                <option value="" disabled>Choose a program stream</option>
                {PROGRAM_STREAMS.map(stream => <option key={stream} value={stream}>{stream}</option>)}
              </FieldSelect>
              : key === 'careLevel' ? <FieldSelect label="Care level" value={draft.careLevel || 'All'}
                onChange={event => change(key, event.target.value)}><option value="All">All care levels</option>
                {CARE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}</FieldSelect>
                : <FieldInput label={key === 'minAge' ? 'Minimum age (years)' : 'Maximum age (years)'}
                    required type="number" min="0" max="120" step="1" value={draft[key] ?? ''}
                    onChange={event => change(key, event.target.value === '' ? null : Number(event.target.value))} />}
          </AssessmentPackConditionRow>)}
          <AssessmentPackConditionPicker options={parameterOptions} selected={parameters} value={parameterToAdd}
            onValueChange={setParameterToAdd} onAdd={() => {
              if (parameterToAdd === 'profileValue') change('triggerDataEnabled', true);
              setParameters(current => [...current, parameterToAdd]); setParameterToAdd('');
            }} />
        </div>
        <section className="bundle-editor-assessments">
          <header className="bundle-editor-assessments-heading"><h3>Measures</h3><p className="muted">Each Profile information heading and added measure is collected separately.</p></header>
          <div className="bundle-editor-assessment-list">{selected.map((itemVersion, index) => <BundleAssessmentRow key={itemVersion}
            name={options.find(item => item.version === itemVersion)?.name || itemVersion}
            position={index} count={selected.length} onMove={direction => change('instrumentVersions', moveItem(selected, index, direction))}
            onRemove={() => change('instrumentVersions', selected.filter(value => value !== itemVersion))} />)}</div>
          {!selected.length && <p className="new-bundle-section-caption">Add at least one measure to save this pack.</p>}
          <AssessmentPackMeasurePicker available={available} value={version} onValueChange={setVersion}
            onAdd={() => { change('instrumentVersions', [...selected, version]); setVersion(''); }} />
        </section>
    </AssessmentPackEditorLayout>
    <ConfirmRemoval item={pendingParameterRemoval ? { name: `${parameterOptions.find(([value]) => value === pendingParameterRemoval)?.[1]} condition`, type: 'condition' } : null}
      onCancel={() => setPendingParameterRemoval(null)} onConfirm={() => {
        const key = pendingParameterRemoval;
        setParameters(current => current.filter(value => value !== key));
        setDraft(current => key === 'profileValue'
          ? { ...current, triggerDataEnabled: false, triggerDataField: '', triggerDataValue: '' }
          : { ...current, [key]: key === 'careLevel' || key === 'programStream' ? 'All' : null });
        setError('');
        setPendingParameterRemoval(null);
      }} />
  </>;
}
