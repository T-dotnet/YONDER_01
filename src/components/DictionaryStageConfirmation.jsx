import { dataDictionaryCatalog } from '../dataDictionaryCatalog.js';
import { ActionGroup, Button, Modal } from './UI';

export default function DictionaryStageConfirmation({ transition, rule, onClose, onConfirm, error, inline = false }) {
  const fields = new Map(dataDictionaryCatalog().map(field => [field.id, field]));
  const content = <>
    <div className={inline ? 'dictionary-stage-confirmation-body' : 'form-body'}>
      <p>The submitted answers below match {transition.from} → {transition.to}. Confirm the outcome to change the stage.</p>
      <dl className="dictionary-stage-confirmation-answers">
        {rule.conditions.map(condition => <div key={condition.fieldId}>
          <dt>{fields.get(condition.fieldId)?.label || 'Data dictionary item'}</dt>
          <dd>{condition.value}</dd>
        </div>)}
      </dl>
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
    <ActionGroup className={inline ? 'dictionary-stage-confirmation-actions' : 'modal-footer'}>
      <Button type="button" onClick={onClose}>Cancel</Button>
      <Button type="button" variant="primary" onClick={onConfirm}>Confirm stage change</Button>
    </ActionGroup>
  </>;
  return inline ? <section className="dictionary-stage-confirmation" aria-label="Record outcome">
    <h3>Record outcome</h3>{content}
  </section> : <Modal title="Record outcome" subtitle={`${transition.from} → ${transition.to}`}
    onClose={onClose}>{content}</Modal>;
}
