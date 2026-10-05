export const CATALOG_AVAILABILITY_CHANGED = 'yscc-catalog-availability-changed';
export const DISABLED_MEASURES_KEY = 'yscc-disabled-measures-v1';
export const DISABLED_DICTIONARY_ITEMS_KEY = 'yscc-disabled-dictionary-items-v1';

const disabledIds = key => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : [];
  } catch { return []; }
};

const setEnabled = (key, id, enabled) => {
  const next = new Set(disabledIds(key));
  if (enabled) next.delete(id);
  else next.add(id);
  localStorage.setItem(key, JSON.stringify([...next]));
  window.dispatchEvent(new Event(CATALOG_AVAILABILITY_CHANGED));
};

export const measureEnabled = version => !disabledIds(DISABLED_MEASURES_KEY).includes(version);
export const dictionaryItemEnabled = id => !disabledIds(DISABLED_DICTIONARY_ITEMS_KEY).includes(id);
export const setMeasureEnabled = (version, enabled) => setEnabled(DISABLED_MEASURES_KEY, version, enabled);
export const setDictionaryItemEnabled = (id, enabled) => setEnabled(DISABLED_DICTIONARY_ITEMS_KEY, id, enabled);
