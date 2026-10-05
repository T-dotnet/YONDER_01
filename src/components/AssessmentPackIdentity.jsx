import { FieldInput, FieldSelect } from './UI';
import { AdministrationEnabledSetting } from './AdministrationEditorLayout';
import { DEFAULT_OUTCOME_GROUP_ID, outcomeDecisionGroups, outcomeGroupOptions } from '../outcomeDecisionGroups.js';
import { outcomeDropdownOptions } from '../assessmentOutcome.js';

export default function AssessmentPackIdentity({ name, enabled, recordOutcome, outcomeGroupId, settings, nameInput, onNameChange, onEnabledChange, onOutcomeSelectionChange }) {
  return <div className="bundle-name-field assessment-pack-identity">
    <AdministrationEnabledSetting description="Make this Assessment Pack available for scheduling and collection."
      label="Enable this Assessment Pack" checked={enabled} onChange={onEnabledChange} />
    <FieldInput label="Assessment Pack name" ref={nameInput} required maxLength={80} value={name}
      onChange={event => onNameChange(event.target.value)} />
    {onOutcomeSelectionChange && <FieldSelect className="bundle-name-field" label="Record outcome"
      hint={recordOutcome ? "The selected group supplies the options shown when staff record this pack’s outcome."
        : 'No Record outcome action will appear for this pack.'}
      value={recordOutcome ? outcomeGroupId || DEFAULT_OUTCOME_GROUP_ID : ''}
      onChange={event => onOutcomeSelectionChange(event.target.value)}>
      <option value="">No outcome needed or recorded</option>
      {outcomeDecisionGroups(settings).map(group => <option key={group.id} value={group.id}>
        {group.name} ({outcomeGroupOptions(settings, group.id, outcomeDropdownOptions(settings)).length} options)
      </option>)}
    </FieldSelect>}
  </div>;
}
