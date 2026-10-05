import { useRef, useState } from 'react';
import { INSTRUMENTS } from '../instruments';
import { CARE_LEVELS, PROGRAM_STREAMS } from '../carePeriods';
import { COLLECTION_METHOD_OPTIONS } from '../terminology';
import { mvpBattery, mvpReviewBundleError, mvpReviewItems } from '../mvpAssessmentPathway';
import { FieldInput, FieldSelect, Select } from './UI';
import BundleAssessmentRow from './BundleAssessmentRow';
import { moveItem } from '../reorderItems';
import ConfirmRemoval from './ConfirmRemoval';
import MockAssessmentPackSchedule from './MockAssessmentPackSchedule';
import ProfileValueTriggerFields from './ProfileValueTriggerFields';
import AssessmentPackIdentity from './AssessmentPackIdentity';
import { measureEnabled } from '../catalogAvailability';
import { AssessmentPackEditorLayout, AssessmentPackCollection, AssessmentPackSectionHeading,
  AssessmentPackConditionPicker, AssessmentPackConditionRow, AssessmentPackMeasurePicker } from './AssessmentPackEditorLayout';

const parameterOptions = [['careLevel', 'Care level'], ['minAge', 'Minimum age (years)'],
  ['maxAge', 'Maximum age (years)'], ['profileValue', 'Data field']];

export default function MvpReviewBundleEditor({ bundle, settings, onClose, onSave }) {
  const [draft, setDraft] = useState(() => (settings?.phase2CareActivity && settings?.mvpSchedulePresets !== false) ? { ...bundle, timing: 'days', after: 'intake', days: 90, repeat: true, dueDate: '' } : bundle);
  const [version, setVersion] = useState('');
  const [parameterToAdd, setParameterToAdd] = useState('');
  const [parameters, setParameters] = useState(parameterOptions.map(([key]) => key).filter(key =>
    key === 'profileValue' ? !!bundle.triggerDataEnabled : key === 'careLevel' ? bundle.careLevel !== 'All' : bundle[key] != null));
  const [error, setError] = useState('');
  const [pendingParameterRemoval, setPendingParameterRemoval] = useState(null);
  const nameInput = useRef(null);
  const change = (key, value) => { setDraft(current => ({ ...current, [key]: value })); setError(''); };
  const items = mvpReviewItems(draft);
  const updateItems = nextItems => {
    setDraft(current => ({ ...current, assessments: nextItems }));
    setError('');
  };
  const compatible = INSTRUMENTS.filter(instrument => measureEnabled(instrument.version) && instrument.respondents.includes(draft.respondent));
  const available = compatible.filter(instrument => !items.some(item => item.version === instrument.version));
  const save = event => {
    event.preventDefault();
    const validation = mvpReviewBundleError(draft, settings);
    if (validation) return setError(validation);
    if (JSON.stringify(draft) === JSON.stringify(bundle)) return onClose();
    const result = onSave(draft);
    if (result?.error) return setError(result.error);
    onClose();
  };
  return <><AssessmentPackEditorLayout title="Edit Assessment Pack" onClose={onClose} onSubmit={save}
    nameInput={nameInput} error={error} className="mvp-review-editor">
        <div className="assessment-schedule-fields">
          <AssessmentPackIdentity name={draft.name} enabled={draft.enabled} nameInput={nameInput}
            settings={settings} recordOutcome={draft.recordOutcome} outcomeGroupId={draft.outcomeGroupId}
            onOutcomeSelectionChange={value => { setDraft(current => ({ ...current, recordOutcome: !!value, outcomeGroupId: value || current.outcomeGroupId })); setError(''); }}
            onNameChange={value => change('name', value)} onEnabledChange={value => change('enabled', value)} />
          <AssessmentPackCollection bundle={draft} respondent="Clinician" respondentDisabled
            methods={draft.respondent === 'Clinician' ? ['Clinician entry']
            : COLLECTION_METHOD_OPTIONS.filter(([value]) => value !== 'SMS link' || settings.assessmentSms !== false)
              .map(([value]) => value)} onMethodsChange={methods => {
            setDraft(current => ({ ...current, allowedCollectionMethods: methods,
              channel: methods?.length && !methods.includes(current.channel) ? methods[0] : current.channel }));
            setError('');
          }} />
          {(settings?.phase2CareActivity && settings?.mvpSchedulePresets !== false) ? <div className="bundle-name-field mvp-preset-content">
              <div className="mvp-preset-label">Care point preset</div>
            <Select className="mvp-care-point-select" label="Care point preset" value="review"><option value="review">90-day review</option></Select>
            <p className="muted">Prepare a review every 90 days after initial assessment completion while the care episode is active.</p>
          </div> : <MockAssessmentPackSchedule draft={draft} settings={settings} change={change} timeKey="days" repeat />}
          <AssessmentPackSectionHeading>When this pack applies</AssessmentPackSectionHeading>
          <div className="bundle-name-field bundle-parameter-row">
            <FieldSelect label="Program stream" required value={draft.programStream} onChange={event => {
              const programStream = event.target.value;
              setDraft(current => ({ ...current, programStream, name: current.name.endsWith(` · ${current.programStream}`)
                ? `${current.name.slice(0, -current.programStream.length)}${programStream}` : current.name,
                assessments: mvpBattery(programStream, current.respondent)
                .map((itemVersion, index) => ({ id: `${programStream}-${index}`, version: itemVersion, requirement: 'Mandatory' })) }));
              setError('');
            }}>
              {PROGRAM_STREAMS.map(stream => <option key={stream} value={stream}>{stream}</option>)}
            </FieldSelect>
          </div>
          {parameters.map(key => <AssessmentPackConditionRow key={key} label={parameterOptions.find(([value]) => value === key)?.[1]}
            onRemove={() => setPendingParameterRemoval(key)}>
            {key === 'profileValue' ? <ProfileValueTriggerFields draft={draft} change={change} />
              : key === 'careLevel' ? <FieldSelect label="Care level" required value={draft.careLevel === 'All' ? '' : draft.careLevel} onChange={event => change(key, event.target.value)}><option value="" disabled>Choose a care level</option>{CARE_LEVELS.map(value => <option key={value} value={value}>{value}</option>)}</FieldSelect>
              : <FieldInput label={key === 'minAge' ? 'Minimum age (years)' : 'Maximum age (years)'} required type="number" min="0" max="120" step="1" value={draft[key] ?? ''} onChange={event => change(key, event.target.value === '' ? null : Number(event.target.value))} />}
          </AssessmentPackConditionRow>)}
          <AssessmentPackConditionPicker options={parameterOptions} selected={parameters} value={parameterToAdd}
            onValueChange={setParameterToAdd} onAdd={() => { if (parameterToAdd === 'profileValue') change('triggerDataEnabled', true); setParameters(current => [...current, parameterToAdd]); setParameterToAdd(''); }} />
        </div>
        <section className="bundle-editor-assessments">
          <header className="bundle-editor-assessments-heading"><h3>Measures</h3></header>
          <div className="bundle-editor-assessment-list">{items.map((item, index) => <BundleAssessmentRow key={item.id}
            name={INSTRUMENTS.find(instrument => instrument.version === item.version)?.name || item.version}
            position={index} count={items.length} onMove={direction => updateItems(moveItem(items, index, direction))}
            onRemove={() => updateItems(items.filter(candidate => candidate.id !== item.id))} />)}</div>
          {!items.length && <p className="new-bundle-section-caption">Add at least one measure to save this pack.</p>}
          <AssessmentPackMeasurePicker available={available} value={version} onValueChange={setVersion}
            onAdd={() => { updateItems([...items, { id: crypto.randomUUID(), version, requirement: 'Mandatory' }]); setVersion(''); }} />
        </section>
    </AssessmentPackEditorLayout>
    <ConfirmRemoval item={pendingParameterRemoval ? { name: `${parameterOptions.find(([value]) => value === pendingParameterRemoval)?.[1]} condition`, type: 'condition' } : null}
      onCancel={() => setPendingParameterRemoval(null)} onConfirm={() => {
        const key = pendingParameterRemoval;
        setParameters(current => current.filter(value => value !== key));
        if (key === 'profileValue') setDraft(current => ({ ...current, triggerDataEnabled: false, triggerDataField: '', triggerDataValue: '' }));
        else change(key, key === 'careLevel' ? 'All' : null);
        setPendingParameterRemoval(null);
      }} />
  </>;
}
