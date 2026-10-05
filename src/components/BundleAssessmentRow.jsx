import SelectedItemRow from './SelectedItemRow';
import { Checkbox } from './UI';

// Template rows edit the requirement; person rows edit inclusion. Callers own that policy.
export default function BundleAssessmentRow({ name, checkboxLabel, checkboxAriaLabel, checked, disabled = false, onCheckedChange, onRemove, onMove, position, count, status, secondary }) {
  return <SelectedItemRow title={name} status={status} secondary={secondary} onRemove={onRemove}
    onMove={onMove} position={position} count={count}
    removalType="measure" className={secondary ? 'is-editing' : ''}
    actions={checkboxLabel && <Checkbox label={checkboxLabel} aria-label={checkboxAriaLabel || `${checkboxLabel}: ${name}`}
      checked={checked} disabled={disabled} onChange={event => onCheckedChange?.(event.target.checked)} />} />;
}
