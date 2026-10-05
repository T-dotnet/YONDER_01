import { displayMeasureVersion } from '../terminology.js';
import { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import ListFilterBar from "./ListFilterBar";
import { ActionGroup, Badge, Button, EditAction, Empty, Modal, Panel, Select, Switch, TertiaryAction } from "./UI";
import InstrumentPreview from "./InstrumentPreview";
import AdminMeasureEditor from "./AdminMeasureEditor";
import { INSTRUMENTS, STANDARD_INSTRUMENTS } from "../instruments";
import { measuresByInstrumentVersion } from "../administrationMeasures";
import { formatDate } from "../model";
import { mvpAssessmentMode } from "../mvpAssessmentPathway";
import { measureEnabled, setMeasureEnabled } from '../catalogAvailability';

const recordedDate = (date) => date ? formatDate(date.slice(0, 10)) : "Not recorded";

export default function AdminInstrumentsTable({ settings }) {
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [, refreshCatalogue] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [packId, setPackId] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const availableVersions = new Set(
    (mvpAssessmentMode(settings) ? INSTRUMENTS : STANDARD_INSTRUMENTS)
      .map((instrument) => instrument.version),
  );
  const associatedPacks = measuresByInstrumentVersion(settings);
  const packs = [...new Map([...associatedPacks.values()].flat().map(pack => [pack.id, pack])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const clearFilters = () => { setQuery(""); setStatus("All"); setPackId(""); };
  const visibleInstruments = INSTRUMENTS.filter(instrument => {
    const available = availableVersions.has(instrument.version);
    const measurePacks = associatedPacks.get(instrument.version) || [];
    const matchesSearch = `${instrument.name} ${displayMeasureVersion(instrument.version)} ${measurePacks.map(pack => pack.name).join(" ")}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const measureStatus = !measureEnabled(instrument.version) ? "Disabled" : available ? "Available" : "Other pathway";
    return matchesSearch && (status === "All" || status === measureStatus)
      && (!packId || (packId === "none" ? !measurePacks.length : measurePacks.some(pack => pack.id === packId)));
  });

  return (
    <>
    <div className="stack administration-instrument-list">
    <div className="section-toolbar administration-section-heading">
      <div>
        <h2>Measures</h2>
        <p>Browse measures, preview their questions, and see which Assessment Packs include them.</p>
      </div>
      <ActionGroup className="button-row">
        <Button type="button" variant="primary" onClick={() => setEditing(null)}>
          Add measure
        </Button>
      </ActionGroup>
    </div>
    <Panel className="admin-panel">
      <ListFilterBar id="admin-measure-filters" label="Measure status" className="administration-filter-bar"
        items={["All", "Available", "Other pathway", "Disabled"].map(value => ({
          value, label: value, count: value === "All" ? INSTRUMENTS.length : INSTRUMENTS.filter(instrument =>
            (!measureEnabled(instrument.version) ? "Disabled" : availableVersions.has(instrument.version) ? "Available" : "Other pathway") === value).length,
        }))}
        value={status} onChange={setStatus} query={query} onQueryChange={setQuery}
        placeholder="Search measures, IDs or Assessment Packs"
        shown={visibleInstruments.length} total={INSTRUMENTS.length} noun="measures"
        activeAdvancedCount={Number(Boolean(packId))} onClear={clearFilters}
        activeFilters={[
          ...(query ? [{ id: "search", label: `Search: ${query}`, onRemove: () => setQuery("") }] : []),
          ...(status !== "All" ? [{ id: "status", label: `Status: ${status}`, onRemove: () => setStatus("All") }] : []),
          ...(packId ? [{ id: "pack", label: `Assessment Pack: ${packId === "none" ? "None" : packs.find(pack => pack.id === packId)?.name || packId}`, onRemove: () => setPackId("") }] : []),
        ]}
        advanced={<Select label="Assessment Pack" value={packId} onChange={event => setPackId(event.target.value)}>
          <option value="">All Assessment Packs</option>
          {packs.map(pack => <option key={pack.id} value={pack.id}>{pack.name}</option>)}
          <option value="none">No Assessment Pack</option>
        </Select>} />
      {availabilityError && <p role="alert" className="field-error">{availabilityError}</p>}
      {availabilityMessage && <p role="status" className="form-save-success">{availabilityMessage}</p>}
    </Panel>
      {visibleInstruments.length ? <div className="administration-item-cards" aria-label="Measure catalogue">
        {visibleInstruments.map(instrument => {
          const available = availableVersions.has(instrument.version);
          const enabled = measureEnabled(instrument.version);
          const measurePacks = associatedPacks.get(instrument.version) || [];
          return <Panel key={instrument.version} className="assessment-bundle-summary administration-measure-card"
            title={<span className="bundle-summary-heading"><span className="bundle-summary-title">{instrument.name}</span>
              <small className="bundle-summary-id">ID: {displayMeasureVersion(instrument.version)}</small></span>}
            action={<ActionGroup className="button-row bundle-summary-actions">
              <Switch label={`Enable ${instrument.name}`} checked={enabled} onChange={event => {
                try {
                  setMeasureEnabled(instrument.version, event.target.checked);
                  setAvailabilityError("");
                  setAvailabilityMessage(`${instrument.name} ${event.target.checked ? 'enabled' : 'disabled'} for new selections.`);
                  refreshCatalogue(value => value + 1);
                } catch { setAvailabilityError(`Could not update ${instrument.name} in this browser.`); }
              }} />
              <EditAction aria-label={`Edit ${instrument.name}`} onClick={() => setEditing(instrument)}>Edit</EditAction>
              <TertiaryAction icon={Eye} aria-label={`Preview ${instrument.name}`} onClick={() => setPreview(instrument)}>Preview</TertiaryAction>
            </ActionGroup>}>
            <div className="panel-body">
              <dl className="metadata bundle-summary-conditions">
                <div><dt>No. of questions</dt><dd>{instrument.questions.length}</dd></div>
                <div><dt>Status</dt><dd><Badge tone={enabled && available ? "green" : "neutral"}>{enabled ? available ? "Available" : "Other pathway" : "Disabled"}</Badge></dd></div>
                <div><dt>Assessment Packs</dt><dd>{measurePacks.length ? measurePacks.map(pack => <span key={pack.id} className="administration-card-value-line">{pack.name}</span>) : "None"}</dd></div>
                <div><dt>Create date</dt><dd>{recordedDate(instrument.createdAt)}</dd></div>
                <div><dt>Last modified</dt><dd>{recordedDate(instrument.updatedAt)}</dd></div>
              </dl>
              <details className="bundle-summary-assessments">
                <summary className="bundle-summary-assessments-heading"><span>Questions</span><span className="muted">{instrument.questions.length} total</span><ChevronDown size={18} aria-hidden="true" /></summary>
                <div className="collection-details-accordion-body"><ol className="administration-card-question-list">
                  {instrument.questions.map((question, index) => <li key={`${question.id || index}-${index}`}>{question.title || question.text || question.id || `Question ${index + 1}`}</li>)}
                </ol></div>
              </details>
            </div>
          </Panel>;
        })}
      </div> : <Empty title="No measures match these filters" action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>
        Try another search or filter.
      </Empty>}
    </div>
    {preview && <Modal title="Measure preview" subtitle={displayMeasureVersion(preview.version)} className="questionnaire-preview-modal" closeLabel="Close preview" onClose={() => setPreview(null)}>
      <InstrumentPreview key={preview.version} instrument={preview} respondent={preview.respondents[0]} onBack={() => setPreview(null)} />
    </Modal>}
    {editing !== undefined && <AdminMeasureEditor instrument={editing} onClose={() => setEditing(undefined)} onSaved={() => {
      setEditing(undefined);
      refreshCatalogue(value => value + 1);
    }} />}
    </>
  );
}
