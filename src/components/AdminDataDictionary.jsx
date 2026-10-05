import { displayMeasureVersion } from '../terminology.js';
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { INSTRUMENTS, refreshAdministrationMeasures } from "../instruments";
import { useStore } from "../store";
import { DICTIONARY_DELETED_KEY, measuresForDraft, notifyDictionaryChanged } from '../dataDictionaryCatalog';
import extractFields from "../epExtractCodebook.json";
import ListFilterBar from "./ListFilterBar";
import InstrumentPreview from "./InstrumentPreview";
import { ActionGroup, Badge, Button, DeleteAction, EditAction, Empty, Field, Modal, ModalFooter, Panel, Select, Switch } from "./UI";
import ConfirmRemoval from './ConfirmRemoval';
import { dictionaryItemEnabled, setDictionaryItemEnabled } from '../catalogAvailability';

const PAGE_SIZE = 40;
const OVERRIDES_KEY = "yscc-data-dictionary-overrides-v1";
const ADDED_QUESTIONS_KEY = "yscc-data-dictionary-questions-v1";
const EXTRACT_TYPES = ["Coded response", "Date", "Number", "Text", "Derived", "Other format"];
const HAPI_QUESTIONS = [...new Set(extractFields.map(field => field.sourceQuestion?.trim()).filter(question => question && !/^n\/a$/i.test(question)))].sort((a, b) => a.localeCompare(b));
const DERIVED_FIELD_NAMES = {
  age_at_episode_commencement: "Age at episode commencement",
  episode_program_stream: "Episode program stream",
  discharge_date: "Discharge date",
  age_at_oos: "Age at occasion of service",
};
const PROFILE_FIELDS = {
  clientGender: "client_gender",
  clientPostcode: "client_postcode",
  clientAtsiStatus: "client_atsi_status",
  clientLanguageHome: "client_language_home",
  clientSexuality: "client_sexuality",
  clientCountryOfBirth: "client_country_of_birth",
  clientEthnicity: "client_ethnicity",
  clientEducationLevel: "client_education_level",
  referralDate: "referral_date",
  source: "referral_source",
  commencementDate: "commencement_date",
  commencementDateUhr: "commencement_date_uhr",
  commencementDateFep: "commencement_date_fep",
  registeredCentreName: "centre",
  registeredCentreState: "centre_state",
  registeredCentrePostcode: "centre_postcode",
};

const extractByKey = new Map(extractFields.map(field => [`${field.batch}:${field.variable}`, field]));

export const dataDictionaryRows = INSTRUMENTS.flatMap(instrument => instrument.questions.flatMap((question, index) => {
  if (question.dictionaryRowId?.startsWith('draft:')) return [];
  const batch = instrument.codebookBatch || (instrument.clientProfileSection ? 1 : null);
  const variable = question.codebookVariable || (instrument.clientProfileSection ? PROFILE_FIELDS[question.id] : null);
  const field = batch && variable ? extractByKey.get(`${batch}:${variable}`) : null;
  return [{
    key: `${instrument.version}:${question.id}:${index}`,
    question,
    instrument,
    field,
  }];
}));

const linkedFields = new Set(dataDictionaryRows.filter(row => row.field).map(row => `${row.field.batch}:${row.field.variable}`));
const unlinkedDerivedFields = extractFields
  .filter(field => field.derived && !linkedFields.has(`${field.batch}:${field.variable}`))
  .filter((field, index, fields) => fields.findIndex(candidate =>
    candidate.variable === field.variable && candidate.dataItem === field.dataItem && candidate.format === field.format) === index);

function fieldType(field) {
  if (!field) return "Not mapped";
  if (EXTRACT_TYPES.includes(field.extractType)) return field.extractType;
  if (field.derived) return "Derived";
  if (/^date\b/i.test(field.format)) return "Date";
  if (/^(integer|decimal|number|numeric)\b/i.test(field.format)) return "Number";
  if (/(?:^|\n)[^\n]+\s*=\s*\d+/.test(field.format)) return "Coded response";
  return "Other format";
}

function readOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, field]) =>
      field && typeof field === "object" &&
      ["variable", "dataItem", "sourceQuestion", "format", "extractType"]
        .every(key => typeof field[key] === "string")));
  } catch {
    return {};
  }
}

function readAddedQuestions() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADDED_QUESTIONS_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(entry => entry && typeof entry === "object" &&
      ["key", "title", "id", "sourceQuestion", "variable", "dataItem", "extractType", "format"]
        .every(key => typeof entry[key] === "string") &&
      (entry.instrumentVersion === undefined || typeof entry.instrumentVersion === "string"));
  } catch {
    return [];
  }
}

function questionIdFor(title, existingQuestions) {
  const base = title.trim().normalize('NFKD')
    .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '').toLocaleLowerCase() || 'question';
  const used = new Set(existingQuestions.map(entry => entry.id));
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}_${suffix++}`;
  return id;
}

function variableFor(title) {
  return title.trim().normalize('NFKD')
    .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '').toLocaleLowerCase();
}

function QuestionDraftEditor({ entry, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    title: entry?.title || "",
    id: entry?.id || "",
    instrumentVersion: entry?.instrumentVersion || "",
    altText: entry?.altText || "",
    description: entry?.description || "",
    sourceQuestion: entry?.sourceQuestion || "",
    variable: entry?.variable || "",
    dataItem: entry?.dataItem || "",
    extractType: entry?.extractType || "Coded response",
    format: entry?.format || "",
  }));
  const [variableEdited, setVariableEdited] = useState(Boolean(entry?.variable));
  const [error, setError] = useState("");
  const change = (name, value) => {
    setDraft(current => ({
      ...current,
      [name]: value,
      ...(name === "title" && !variableEdited ? { variable: variableFor(value) } : {}),
    }));
    if (name === "variable") setVariableEdited(true);
    setError("");
  };
  const submit = event => {
    event.preventDefault();
    const saveError = onSave(draft, entry?.key);
    if (saveError) setError(saveError);
  };
  return <Modal title={entry ? "Edit draft item" : "Add item"} subtitle="Data dictionary" onClose={onClose} wide className="data-dictionary-editor">
    <form onSubmit={submit}>
      <div className="form-body data-dictionary-editor-body">
        <p className="muted">This draft appears in the Data dictionary. Add it to a measure from the measure editor. It does not change a published questionnaire.</p>
        <section className="data-dictionary-form-section">
          <h3>Question details</h3>
          <div className="form-grid">
          <Field label="Question"><input value={draft.title} onChange={event => change("title", event.target.value)} required /></Field>
          <Field label="Alt text"><input value={draft.altText} onChange={event => change("altText", event.target.value)} /></Field>
          <Field label="Description"><textarea value={draft.description} onChange={event => change("description", event.target.value)} rows={3} /></Field>
          </div>
        </section>
        <section className="data-dictionary-form-section">
          <h3>Extract mapping</h3>
          <div className="form-grid">
          <Field label="Extract type">
            <select value={draft.extractType} onChange={event => change("extractType", event.target.value)}>
              {EXTRACT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Variable name for extract"><input value={draft.variable} onChange={event => change("variable", event.target.value)} /></Field>
          <Field label="hAPI question">
            <select value={draft.sourceQuestion} onChange={event => change("sourceQuestion", event.target.value)}>
              <option value="">Select a hAPI question</option>
              {draft.sourceQuestion && !HAPI_QUESTIONS.includes(draft.sourceQuestion) && <option value={draft.sourceQuestion}>{draft.sourceQuestion}</option>}
              {HAPI_QUESTIONS.map(question => <option key={question} value={question}>{question}</option>)}
            </select>
          </Field>
          <Field label="Format and/or coding of response in extract">
            <textarea value={draft.format} onChange={event => change("format", event.target.value)} rows={6} />
          </Field>
          </div>
        </section>
      </div>
      <ModalFooter>
        {error && <p className="field-error form-save-error" role="alert">{error}</p>}
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">{entry ? "Save changes" : "Add item"}</Button>
      </ModalFooter>
    </form>
  </Modal>;
}

function DataDictionaryEditor({ row, edited, onClose, onSave, onRestore }) {
  const [draft, setDraft] = useState(() => ({
    variable: row.field?.variable || "",
    dataItem: row.field?.dataItem || "",
    sourceQuestion: row.field?.sourceQuestion || "",
    format: row.field?.format || "",
    extractType: fieldType(row.field) === "Not mapped" ? "Coded response" : fieldType(row.field),
  }));
  const [error, setError] = useState("");
  const change = (name, value) => { setDraft(current => ({ ...current, [name]: value })); setError(""); };
  const submit = event => {
    event.preventDefault();
    if (!draft.variable.trim() || !draft.dataItem.trim()) {
      setError("Enter a variable name and data item before saving.");
      return;
    }
    const saveError = onSave(row, draft);
    if (saveError) setError(saveError);
  };
  return <Modal title="Edit data dictionary entry" subtitle={displayMeasureVersion(row.instrument?.version) || "Derived extract field"} onClose={onClose} wide className="data-dictionary-editor">
    <form onSubmit={submit}>
      <div className="form-body data-dictionary-editor-body">
        {row.question ? <>
          <p><strong>Question:</strong> {row.question.title}</p>
          <p><strong>Measure:</strong> {row.instrument.name}</p>
        </> : <p><strong>Derived field:</strong> {row.originalField.variable} · No measure question</p>}
        <p className="muted">Edit this extract entry. Changes are saved in this browser.</p>
        <div className="form-grid">
          <Field label="Variable name for extract">
            <input value={draft.variable} onChange={event => change("variable", event.target.value)} required />
          </Field>
          <Field label="Data item">
            <input value={draft.dataItem} onChange={event => change("dataItem", event.target.value)} required />
          </Field>
          <Field label="hAPI question">
            <textarea value={draft.sourceQuestion} onChange={event => change("sourceQuestion", event.target.value)} rows={3} />
          </Field>
          <Field label="Extract type">
            <select value={draft.extractType} onChange={event => change("extractType", event.target.value)}>
              {EXTRACT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Format and/or coding of response in extract">
            <textarea value={draft.format} onChange={event => change("format", event.target.value)} rows={6} />
          </Field>
        </div>
      </div>
      <ModalFooter>
        {error && <p className="field-error form-save-error" role="alert">{error}</p>}
        {edited && <Button type="button" variant="secondary" onClick={() => { const restoreError = onRestore(row.key); if (restoreError) setError(restoreError); }}>
          Restore original
        </Button>}
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save changes</Button>
      </ModalFooter>
    </form>
  </Modal>;
}

function Coding({ value }) {
  if (!value) return <span className="muted">Not mapped to EP extract</span>;
  if (value.length < 110) return <span className="data-dictionary-coding">{value}</span>;
  return <details className="data-dictionary-coding-detail">
    <summary>{value.split("\n")[0].slice(0, 82)}… View full coding</summary>
    <div className="data-dictionary-coding">{value}</div>
  </details>;
}

function HapiQuestion({ value }) {
  if (!value) return <span className="muted">—</span>;
  if (value.length < 110) return <span className="data-dictionary-coding">{value}</span>;
  return <details className="data-dictionary-coding-detail">
    <summary>{value.split("\n")[0].slice(0, 82)}… View full question</summary>
    <div className="data-dictionary-coding">{value}</div>
  </details>;
}

export default function AdminDataDictionary() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [instrumentVersion, setInstrumentVersion] = useState("");
  const [mapping, setMapping] = useState("all");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [addedQuestions, setAddedQuestions] = useState(readAddedQuestions);
  const [measureRevision, setMeasureRevision] = useState(0);
  useEffect(() => {
    const refreshMeasures = event => {
      if (event.key === 'yscc-administration-measures-v1') {
        refreshAdministrationMeasures();
        setMeasureRevision(value => value + 1);
      }
    };
    window.addEventListener('storage', refreshMeasures);
    return () => window.removeEventListener('storage', refreshMeasures);
  }, []);
  const [overrides, setOverrides] = useState(readOverrides);
  const [savedMessage, setSavedMessage] = useState("");
  const [, refreshAvailability] = useState(0);
  const [deletedKeys, setDeletedKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DICTIONARY_DELETED_KEY) || '[]'); }
    catch { return []; }
  });
  const [pendingDelete, setPendingDelete] = useState(null);

  const rows = useMemo(() => dataDictionaryRows.map(row => ({
    ...row,
    field: overrides[row.key] ? { ...row.field, ...overrides[row.key] } : row.field,
  })), [overrides]);
  const derivedRows = useMemo(() => unlinkedDerivedFields.map(field => {
    const key = `derived:${field.batch}:${field.variable}`;
    return {
      key,
      originalField: field,
      field: overrides[key] ? { ...field, ...overrides[key] } : field,
    };
  }), [overrides]);
  const addedRows = useMemo(() => addedQuestions.map(entry => ({
    key: entry.key,
    customEntry: entry,
    question: { id: entry.id, title: entry.title, altText: entry.altText, description: entry.description },
    instruments: measuresForDraft(entry),
    instrument: measuresForDraft(entry)[0],
    field: entry.variable ? {
      variable: entry.variable,
      dataItem: entry.dataItem,
      sourceQuestion: entry.sourceQuestion,
      extractType: entry.extractType,
      format: entry.format,
      derived: entry.extractType === "Derived",
    } : null,
  })), [addedQuestions, measureRevision]);
  const allRows = useMemo(() => [...derivedRows, ...addedRows, ...rows].filter(row => !deletedKeys.includes(row.key)), [derivedRows, addedRows, rows, deletedKeys]);

  const persist = next => {
    try {
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      setOverrides(next);
      notifyDictionaryChanged();
      return "";
    } catch {
      return "Could not save in this browser. Free browser storage and try again.";
    }
  };
  const save = (row, draft) => {
    const result = persist({ ...overrides, [row.key]: {
      variable: draft.variable.trim(),
      dataItem: draft.dataItem.trim(),
      sourceQuestion: draft.sourceQuestion.trim(),
      format: draft.format.trim(),
      extractType: draft.extractType,
      derived: draft.extractType === "Derived",
    } });
    if (!result) { setEditing(null); setSavedMessage(`Saved extract details for ${row.question?.title || row.originalField.variable}.`); }
    return result;
  };
  const restore = key => {
    const next = { ...overrides };
    delete next[key];
    const result = persist(next);
    if (!result) { setEditing(null); setSavedMessage("Original extract details restored."); }
    return result;
  };
  const saveQuestion = (draft, key) => {
    const title = draft.title.trim();
    const id = key && draft.id.trim() || questionIdFor(title, addedQuestions);
    const variable = draft.variable.trim();
    const dataItem = draft.dataItem.trim();
    if (!title) return "Enter a question.";
    const nextEntry = {
      key: key || `draft:${crypto.randomUUID()}`,
      title,
      id,
      instrumentVersion: draft.instrumentVersion,
      altText: draft.altText.trim(),
      description: draft.description.trim(),
      sourceQuestion: draft.sourceQuestion.trim(),
      variable,
      dataItem,
      extractType: draft.extractType,
      format: draft.format.trim(),
    };
    const next = key
      ? addedQuestions.map(entry => entry.key === key ? nextEntry : entry)
      : [nextEntry, ...addedQuestions];
    try {
      localStorage.setItem(ADDED_QUESTIONS_KEY, JSON.stringify(next));
      setAddedQuestions(next);
      notifyDictionaryChanged();
      setAddingQuestion(false);
      setEditing(null);
      setSavedMessage(`${key ? "Updated" : "Added"} draft item ${title}.`);
      setQuery(id);
      setInstrumentVersion("");
      setMapping("all");
      setPage(1);
      return "";
    } catch {
      return "Could not save in this browser. Free browser storage and try again.";
    }
  };
  const deleteEntry = () => {
    if (!pendingDelete) return;
    const next = [...new Set([...deletedKeys, pendingDelete.key])];
    try {
      localStorage.setItem(DICTIONARY_DELETED_KEY, JSON.stringify(next));
      setDeletedKeys(next);
      notifyDictionaryChanged();
      setSavedMessage(`Deleted ${pendingDelete.question?.title || pendingDelete.field?.variable}.`);
      setPendingDelete(null);
    } catch { setSavedMessage('Could not save the deletion in this browser.'); }
  };
  const restoreDeleted = () => {
    try {
      localStorage.removeItem(DICTIONARY_DELETED_KEY);
      setDeletedKeys([]);
      notifyDictionaryChanged();
      setSavedMessage('Deleted dictionary items restored.');
    } catch { setSavedMessage('Could not restore dictionary items in this browser.'); }
  };
  const parameterUses = pendingDelete ? (state.settings?.assessmentScheduleRules || [])
    .filter(rule => rule.triggerDataEnabled && rule.triggerDataField === pendingDelete.key)
    .map(rule => rule.name) : [];
  const stageUses = pendingDelete ? (state.settings?.dictionaryStageRules || [])
    .filter(rule => rule.conditions?.some(condition => condition.fieldId === pendingDelete.key))
    .map(rule => `${rule.from} → ${rule.to}`) : [];

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return allRows.filter(({ question, instrument, instruments, field, originalField, customEntry }) => {
      if (instrumentVersion && !(instruments || (instrument ? [instrument] : [])).some(item => item.version === instrumentVersion)) return false;
      if (mapping === "mapped" && !field) return false;
      if (mapping === "unmapped" && field) return false;
      if (mapping === "derived" && !field?.derived) return false;
      if (!term) return true;
      return [question?.title, question?.id, instrument?.name, instrument?.version,
        field?.dataItem, field?.variable, field?.sourceQuestion, field?.format,
        customEntry?.sourceQuestion, originalField?.variable]
        .some(value => String(value || "").toLocaleLowerCase().includes(term));
    });
  }, [allRows, query, instrumentVersion, mapping]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const calculatedCount = allRows.filter(row => row.field?.derived).length;
  const update = (setter, value) => { setter(value); setPage(1); };
  const clearFilters = () => { setQuery(""); setInstrumentVersion(""); setMapping("all"); setPage(1); };
  const mappingItems = [
    { value: "all", label: "All entries", count: allRows.length },
    { value: "mapped", label: "Linked to extract", count: allRows.filter(row => row.field).length },
    { value: "unmapped", label: "Not mapped", count: allRows.filter(row => !row.field).length },
    { value: "derived", label: "Derived", count: calculatedCount },
  ];
  const activeFilters = [
    ...(query ? [{ id: "search", label: `Search: ${query}`, onRemove: () => update(setQuery, "") }] : []),
    ...(instrumentVersion ? [{ id: "instrument", label: `Measure: ${INSTRUMENTS.find(instrument => instrument.version === instrumentVersion)?.name || instrumentVersion}`, onRemove: () => update(setInstrumentVersion, "") }] : []),
    ...(mapping !== "all" ? [{ id: "mapping", label: `Mapping: ${mappingItems.find(item => item.value === mapping)?.label}`, onRemove: () => update(setMapping, "all") }] : []),
  ];

  return <>
    <div className="stack administration-data-dictionary">
      <div className="section-toolbar administration-section-heading">
        <div>
          <h2>Data dictionary</h2>
          <p>Measure questions and calculated fields from the headspace EP 2025 data extract codebook.</p>
        </div>
        <ActionGroup className="button-row">
          {deletedKeys.length > 0 && <Button type="button" onClick={restoreDeleted}>Restore deleted items ({deletedKeys.length})</Button>}
          <Button type="button" variant="primary" onClick={() => { setSavedMessage(""); setAddingQuestion(true); }}>
            <Plus size={18} aria-hidden="true" /> Add item
          </Button>
        </ActionGroup>
      </div>
      <Panel className="admin-panel">
        {savedMessage && <p className="form-save-success" role="status">{savedMessage}</p>}
        <ListFilterBar
          id="data-dictionary-mapping"
          label="Extract mapping"
          panelId="data-dictionary-results"
          className="data-dictionary-filter-bar administration-filter-bar"
          items={mappingItems}
          value={mapping}
          onChange={value => update(setMapping, value)}
          query={query}
          onQueryChange={value => update(setQuery, value)}
          placeholder="Search questions or extract fields"
          shown={filtered.length}
          total={allRows.length}
          noun={filtered.length === 1 ? "entry" : "entries"}
          activeAdvancedCount={Number(Boolean(instrumentVersion))}
          onClear={clearFilters}
          activeFilters={activeFilters}
          advanced={<Select label="Measure" value={instrumentVersion} onChange={event => update(setInstrumentVersion, event.target.value)}>
              <option value="">All measures</option>
              {INSTRUMENTS.map(instrument => <option key={instrument.version} value={instrument.version}>{instrument.name} · {displayMeasureVersion(instrument.version)}</option>)}
            </Select>}
        />
      </Panel>
        <div id="data-dictionary-results" role="tabpanel" aria-labelledby={`data-dictionary-mapping-tab-${mappingItems.findIndex(item => item.value === mapping)}`}>
        {filtered.length > 0 && <div className="administration-item-cards" aria-label="Data dictionary entries">
          {visible.map(row => {
            const title = row.question?.title || DERIVED_FIELD_NAMES[row.originalField?.variable] || row.originalField?.variable?.replaceAll("_", " ") || row.field?.variable;
            const itemId = row.question?.id || row.originalField?.variable || row.field?.variable;
            return <Panel key={row.key} className="assessment-bundle-summary administration-dictionary-card"
              title={<span className="bundle-summary-heading"><span className="bundle-summary-title">{title}</span><small className="bundle-summary-id">ID: {itemId}</small>{row.customEntry && <small className="bundle-summary-id">Draft dictionary question</small>}</span>}
              action={<ActionGroup className="button-row bundle-summary-actions">
                <Switch label={`Enable data dictionary item ${title}`} checked={dictionaryItemEnabled(row.key)}
                  onChange={event => {
                    try {
                      setDictionaryItemEnabled(row.key, event.target.checked);
                      refreshAvailability(value => value + 1);
                      notifyDictionaryChanged();
                      setSavedMessage(`${title} ${event.target.checked ? 'enabled' : 'disabled'} for new selections.`);
                    } catch { setSavedMessage('Could not update this item in the browser.'); }
                  }} />
                <EditAction aria-label={row.customEntry ? `Edit draft question ${row.question.title}` : row.question
                  ? `Edit data dictionary entry for ${row.question.title} in ${row.instrument.name}`
                  : `Edit derived extract field ${row.field.variable}`}
                  onClick={() => { setSavedMessage(""); setEditing(row); }}>Edit</EditAction>
                <DeleteAction aria-label={`Delete data dictionary item ${title}`}
                  onClick={() => setPendingDelete(row)}>Delete</DeleteAction>
              </ActionGroup>}>
              <div className="panel-body">
                <dl className="metadata bundle-summary-conditions">
                  <div><dt>hAPI question</dt><dd><HapiQuestion value={row.field?.sourceQuestion || row.customEntry?.sourceQuestion} /></dd></div>
                  <div><dt>Measure</dt><dd>{row.customEntry ? row.instruments.length
                    ? row.instruments.map(item => item.name).join(', ') : 'Not assigned to a measure'
                    : row.instrument ? <><button type="button" className="name-link" onClick={() => setPreview(row.instrument)} aria-label={`Preview ${row.instrument.name}`}>{row.instrument.name}</button><small>{displayMeasureVersion(row.instrument.version)}</small></>
                      : 'No measure question'}</dd></div>
                  <div><dt>Variable name for extract</dt><dd><code>{row.field?.variable || '—'}</code></dd></div>
                  <div><dt>Data item</dt><dd>{row.field?.dataItem || '—'}</dd></div>
                  <div><dt>Extract type</dt><dd><Badge tone={row.field?.derived ? 'amber' : 'neutral'}>{fieldType(row.field)}</Badge></dd></div>
                </dl>
                <details className="bundle-summary-assessments">
                  <summary className="bundle-summary-assessments-heading"><span>Extract coding</span><ChevronDown size={18} aria-hidden="true" /></summary>
                  <div className="collection-details-accordion-body administration-dictionary-coding"><Coding value={row.field?.format} /></div>
                </details>
              </div>
            </Panel>;
          })}
        </div>}
        {filtered.length === 0 && <Empty title="No data dictionary entries match these filters" action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>Try another search or filter.</Empty>}
        {filtered.length > PAGE_SIZE && <div className="data-dictionary-pagination">
          <span>Page {currentPage} of {pageCount}</span>
          <Button type="button" variant="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
          <Button type="button" variant="secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
        </div>}
        </div>
    </div>
    {preview && <Modal title="Measure preview" subtitle={displayMeasureVersion(preview.version)} className="questionnaire-preview-modal" closeLabel="Close preview" onClose={() => setPreview(null)}>
      <InstrumentPreview key={preview.version} instrument={preview} respondent={preview.respondents[0]} onBack={() => setPreview(null)} />
    </Modal>}
    {addingQuestion && <QuestionDraftEditor onClose={() => setAddingQuestion(false)} onSave={saveQuestion} />}
    {editing?.customEntry && <QuestionDraftEditor key={editing.key} entry={editing.customEntry} onClose={() => setEditing(null)} onSave={saveQuestion} />}
    {editing && !editing.customEntry && <DataDictionaryEditor key={editing.key} row={editing} edited={Boolean(overrides[editing.key])}
      onClose={() => setEditing(null)} onSave={save} onRestore={restore} />}
    <ConfirmRemoval item={pendingDelete ? { name: pendingDelete.question?.title || pendingDelete.field?.variable || 'item', type: 'item',
      description: parameterUses.length || stageUses.length
        ? `This item is used by ${[
          parameterUses.length ? `${parameterUses.length} Assessment Pack${parameterUses.length === 1 ? '' : 's'} (${parameterUses.join(', ')})` : '',
          stageUses.length ? `${stageUses.length} stage change${stageUses.length === 1 ? '' : 's'} (${stageUses.join(', ')})` : '',
        ].filter(Boolean).join(' and ')}. Deleting it will leave those links invalid until you choose another data field.`
        : 'This item will be removed from this browser’s data dictionary and field choices.' } : null}
      onCancel={() => setPendingDelete(null)} onConfirm={deleteEntry} />
  </>;
}
