import codebook from './epExtractCodebook.json' with { type: 'json' };

// Batch 4 fields are collected at discharge. Future Care Decision is handled by
// the Discharge outcome decision group, so it is not a second questionnaire.
const excluded = new Set(['YP Identifiers', 'Survey ID', 'Future Care Decision']);
const rows = codebook.filter(row => row.batch === 4 && !excluded.has(row.dataItem));
const groups = [...new Set(rows.map(row => row.dataItem))];

const formatFor = row => row.format || rows.find(candidate =>
  candidate.dataItem === row.dataItem && candidate.format)?.format || '';

const questionFor = row => {
  const format = formatFor(row);
  const lines = format.split('\n').map(line => line.trim()).filter(Boolean);
  const choices = lines.map(line => {
    const match = line.match(/^(.*?)\s*=\s*(\d+)/);
    return match ? `${match[2]} · ${match[1].trim()}` : null;
  }).filter(Boolean);
  const numeric = /^Integer/i.test(lines[0] || '');
  const date = /^Date/i.test(lines[0] || '');
  return {
    id: row.variable,
    section: 'fields',
    title: row.sourceQuestion || row.variable,
    codebookVariable: row.variable,
    hint: `Extract field: ${row.variable}. Use the approved assessment protocol for clinical interpretation.`,
    ...(numeric || date ? {
      responseType: date ? 'date' : 'number',
      options: [],
      ...(choices.length ? { nonResponseOptions: choices } : {}),
    } : { options: choices }),
  };
};

export const EP_BATCH_4_INSTRUMENTS = groups.map(name => ({
  name,
  version: `EP Batch 4 · ${name} v1.0`,
  description: 'headspace EP 2025 discharge coded field capture. Follow the approved assessment protocol for clinical use.',
  respondents: ['Clinician'],
  sections: [{ id: 'fields', title: name }],
  questions: rows.filter(row => row.dataItem === name).map(questionFor),
  codebookBatch: 4,
  codebookDataItem: name,
  mvpOnly: true,
}));
