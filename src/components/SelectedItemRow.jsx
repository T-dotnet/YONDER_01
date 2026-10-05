import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ConfirmRemoval from './ConfirmRemoval';
import RecordItem from './RecordItem';
import { ActionGroup, IconButton } from './UI';

// Shared row for items chosen in an editor. The caller owns what removal means.
export default function SelectedItemRow({ title, subtitle, status, secondary, actions, onRemove,
  onMove, position, count, removalType = 'item', className = '', actionClassName = '' }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  return <>
    <RecordItem headingLevel={4} className={`new-bundle-record bundle-editor-assessment-row selected-item-row ${className}`.trim()}
      title={title} subtitle={subtitle} verbatimText status={status} secondary={secondary}
      headingAction={(actions || onRemove || onMove) && <ActionGroup className={`bundle-editor-assessment-actions ${actionClassName}`.trim()}>
        {actions}
        {onMove && count > 1 && <span className="selected-item-order-actions">
          <IconButton icon={ArrowUp} label={`Move ${title} up`} disabled={position === 0}
            onClick={() => onMove(-1)} />
          <IconButton icon={ArrowDown} label={`Move ${title} down`} disabled={position === count - 1}
            onClick={() => onMove(1)} />
        </span>}
        {onRemove && <IconButton icon={Trash2} label={`Remove ${title}`} className="bundle-editor-delete"
          onClick={() => setConfirmRemove(true)} />}
      </ActionGroup>}
    />
    <ConfirmRemoval item={confirmRemove ? { name: title, type: removalType } : null}
      onCancel={() => setConfirmRemove(false)} onConfirm={() => { onRemove?.(); setConfirmRemove(false); }} />
  </>;
}
