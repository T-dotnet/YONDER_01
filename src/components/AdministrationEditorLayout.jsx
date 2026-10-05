import { ActionGroup, Button, Modal, Switch } from './UI';

export function AdministrationEditorLayout({ title, subtitle, onClose, onSubmit, initialFocusRef,
  error, children, className = '', submitLabel, submitDisabled = false }) {
  return <Modal title={title} subtitle={subtitle} onClose={onClose} initialFocusRef={initialFocusRef}
    wide className={`assessment-bundle-settings-modal ${className}`.trim()}>
    <form className="assessment-schedule-form" onSubmit={onSubmit}>
      <div className="form-body">
        {children}
        {error && <p role="alert" className="field-error">{error}</p>}
      </div>
      <ActionGroup className="modal-footer">
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={submitDisabled}>{submitLabel}</Button>
      </ActionGroup>
    </form>
  </Modal>;
}

export function AdministrationEnabledSetting({ title = 'Enabled', description, label, checked, disabled, onChange }) {
  return <div className="bundle-name-field assessment-pack-enabled">
    <div><strong>{title}</strong><p className="muted">{description}</p></div>
    <Switch label={label} checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
  </div>;
}

export function AdministrationEditorSectionHeading({ children }) {
  return <h3 className="bundle-name-field bundle-collection-heading">{children}</h3>;
}
