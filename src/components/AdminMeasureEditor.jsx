import { useEffect, useId, useState } from 'react';
import { dataDictionaryCatalog, DICTIONARY_CHANGED } from '../dataDictionaryCatalog';
import { INSTRUMENTS, saveAdministrationMeasure } from '../instruments';
import { Button, Field, Modal, ModalFooter } from './UI';
import SelectedItemRow from './SelectedItemRow';
import { moveItem } from '../reorderItems';
import { dictionaryItemEnabled } from '../catalogAvailability';

const labelFor = row => `${row.label} · ${row.measure} · ${row.variable || row.questionId || row.id}`;
const sourceFor = row => INSTRUMENTS.find(item => item.version === row.version)?.questions[row.questionIndex];
const questionFor = row => {
  const source = sourceFor(row);
  if (source) return { ...source, id: crypto.randomUUID(), section: 'questions', dictionaryRowId: row.id, when: undefined };
  const format = row.format.toLowerCase();
  const responseType = row.values.length ? undefined : /date/.test(format) ? 'date' : /number|integer|decimal/.test(format) ? 'number' : 'text';
  return { id: crypto.randomUUID(), section: 'questions', title: row.label, hint: row.description || '', altText: row.altText || '',
    options: row.values, responseType, dictionaryRowId: row.id };
};
const sourceId = (instrument, question, index) => question.dictionaryRowId || `${instrument.version}:${question.id}:${index}`;

function generatedVersion(name) {
  const base = `${name.trim()} v1.0`;
  let version = base;
  let suffix = 2;
  while (INSTRUMENTS.some(item => item.version.toLocaleLowerCase() === version.toLocaleLowerCase())) {
    version = `${base} (${suffix++})`;
  }
  return version;
}

export default function AdminMeasureEditor({ instrument, onClose, onSaved }) {
  const listId = useId();
  const [name, setName] = useState(instrument?.name || '');
  const [description, setDescription] = useState(instrument?.description || '');
  const [questions, setQuestions] = useState(() => instrument?.questions.map((question, index) => ({
    ...question, dictionaryRowId: sourceId(instrument, question, index),
  })) || []);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [, refreshDictionary] = useState(0);
  useEffect(() => {
    const refresh = () => refreshDictionary(value => value + 1);
    window.addEventListener(DICTIONARY_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(DICTIONARY_CHANGED, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const catalog = dataDictionaryCatalog();
  const rows = catalog.filter(row => dictionaryItemEnabled(row.id) && (row.draft || (row.version && row.version !== instrument?.version &&
    row.questionIndex != null && sourceFor(row))));
  const selectedIds = new Set(questions.map(question => question.dictionaryRowId));
  const available = rows.filter(row => !selectedIds.has(row.id));
  const selected = available.find(row => labelFor(row) === search);
  const add = () => {
    if (!selected) return;
    setQuestions(current => [...current, questionFor(selected)]);
    setSearch('');
    setError('');
  };
  const save = event => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return setError('Enter a measure name.');
    if (!questions.length) return setError('Add at least one Data dictionary item.');
    const now = new Date().toISOString();
    const saved = {
      ...(instrument || {}), name: trimmedName,
      version: instrument?.version || generatedVersion(trimmedName),
      description: description.trim(),
      respondents: instrument?.respondents || ['Person'],
      sections: instrument?.sections || [{ id: 'questions', title: 'Questions' }],
      questions,
      createdAt: instrument?.createdAt || now,
      updatedAt: now,
    };
    try {
      saveAdministrationMeasure(saved);
      onSaved(saved);
    } catch {
      setError('Could not save this measure in the browser. Check available storage and try again.');
    }
  };

  return <Modal title={instrument ? 'Edit measure' : 'Add measure'} subtitle="Measure catalogue"
    onClose={onClose} wide className="admin-measure-editor">
    <form onSubmit={save}>
      <div className="form-body admin-measure-editor-body">
        <div className="form-grid">
          <Field label="Measure name"><input value={name} required onChange={event => { setName(event.target.value); setError(''); }} /></Field>
          <Field label="Description"><textarea value={description} rows={2} onChange={event => setDescription(event.target.value)} /></Field>
        </div>
        <section className="admin-measure-parameters">
          <h3>Data dictionary items</h3>
          <p className="muted">Choose the questions to include in this measure. Their wording and response format come from the Data dictionary.</p>
          {questions.length > 0 && <div className="bundle-editor-assessment-list">
            {questions.map((question, index) => {
              const source = catalog.find(row => row.id === question.dictionaryRowId);
              return <SelectedItemRow key={question.dictionaryRowId || question.id} title={question.title}
                subtitle={`${source?.measure || 'Data dictionary'} · ${source?.variable || source?.questionId || question.codebookVariable || question.id}`}
                position={index} count={questions.length} onMove={direction => setQuestions(current => moveItem(current, index, direction))}
                removalType="parameter" onRemove={(!instrument || !instrument.questions.some(original => original.id === question.id))
                  ? () => setQuestions(current => current.filter((_, position) => position !== index)) : undefined} />;
            })}
          </div>}
          {available.length > 0 && <div className="new-bundle-extra-picker admin-measure-parameter-picker">
            <Field label="Data dictionary item"><input type="search" list={listId} autoComplete="off"
              placeholder="Search Data dictionary items" value={search} onChange={event => setSearch(event.target.value)} />
              <datalist id={listId}>{available.map(row => <option key={row.id} value={labelFor(row)} />)}</datalist>
            </Field>
            <Button type="button" disabled={!selected} onClick={add}>Add parameter</Button>
          </div>}
        </section>
      </div>
      <ModalFooter>
        {error && <p className="field-error form-save-error" role="alert">{error}</p>}
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">{instrument ? 'Save changes' : 'Add measure'}</Button>
      </ModalFooter>
    </form>
  </Modal>;
}
