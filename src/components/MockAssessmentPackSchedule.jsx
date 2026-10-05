import { FieldInput } from './UI';
import SpecificMeasureFields from './SpecificMeasureFields';
import EpisodeStatusFields from './EpisodeStatusFields';
import { AssessmentPackRepeat, AssessmentPackScheduleInputs } from './AssessmentPackEditorLayout';

const legacyLabels = {
  'new-profile': 'New profile', intake: 'Intake', 'care-period': 'Care episode starts',
};
export default function MockAssessmentPackSchedule({ draft, settings, change, timeKey, repeat = false, sourceOptions }) {
  const days = draft[timeKey] ?? 0;
  return <div className="bundle-name-field bundle-timing-fields assessment-pack-schedule">
    <h3 className="bundle-name-field bundle-timing-heading">Schedule</h3>
    {draft.timing === 'date' ? <FieldInput label="Due date (existing schedule)" type="date" required
      value={draft.dueDate || ''} onChange={event => change('dueDate', event.target.value)} /> : <>
      <AssessmentPackScheduleInputs days={days} minDays={repeat ? 1 : 0} after={draft.after}
        options={[...(legacyLabels[draft.after] ? [{ value: draft.after, label: `${legacyLabels[draft.after]} (existing schedule)` }] : []),
          { value: 'specific-measure', label: 'Assessment Pack status' },
          { value: 'episode-status', label: 'Care episode status' }]}
        onDaysChange={value => change(timeKey, value)} onTriggerChange={value => change('after', value)}>
        <SpecificMeasureFields draft={draft} settings={settings} change={change} sourceOptions={sourceOptions} />
        <EpisodeStatusFields draft={draft} change={change} />
      </AssessmentPackScheduleInputs>
      <AssessmentPackRepeat checked={repeat && !!draft.repeat} disabled={!repeat}
        onChange={value => change('repeat', value)} />
    </>}
  </div>;
}
