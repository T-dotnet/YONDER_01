import { useState } from 'react';
import { outcomeOptionLabel, visibleAssessmentOutcomeOptions } from '../assessmentOutcome.js';
import { ActionGroup, Button, Field, Modal, Select, ValidatedForm } from './UI';

export default function AssessmentOutcomeForm({ outcome: recordedOutcome, settings, options: configuredOptions, onClose, onSave, subtitle = 'Outcome of initial assessment' }) {
  const [outcome, setOutcome] = useState(recordedOutcome || '');
  const [error, setError] = useState('');
  const options = configuredOptions || visibleAssessmentOutcomeOptions(settings);
  return <Modal title="Record outcome" subtitle={subtitle} onClose={onClose}>
    <ValidatedForm onSubmit={event => {
      event.preventDefault();
      if (recordedOutcome === outcome) return onClose();
      const result = onSave(outcome);
      if (result?.error) setError(result.error);
      else onClose();
    }}>
      <div className="form-body">
        <Field label="Outcome of assessment" error={error}>
          <Select label="Outcome of assessment" value={outcome} required onChange={event => { setOutcome(event.target.value); setError(''); }}>
            <option value="">Choose an outcome</option>
            {recordedOutcome && !options.includes(recordedOutcome) &&
              <option value={recordedOutcome}>{outcomeOptionLabel(settings, recordedOutcome)} (previously recorded)</option>}
            {options.map(option => <option key={option} value={option}>{outcomeOptionLabel(settings, option)}</option>)}
          </Select>
        </Field>
      </div>
      <ActionGroup className="modal-footer">
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save outcome</Button>
      </ActionGroup>
    </ValidatedForm>
  </Modal>;
}
