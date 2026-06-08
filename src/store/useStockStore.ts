import { create } from 'zustand';
import type { CsvMeta, CsvRow, ParentGroup } from '../types';
import { buildGroups } from '../lib/grouping';
import {
  clearAllSessions,
  clearCsvData,
  loadAllSessions,
  loadCsvData,
  loadSession,
  saveCsvData,
  saveSession,
} from '../lib/storage';
import { parseStock } from '../lib/stock';

interface State {
  loaded: boolean;
  meta: CsvMeta | null;
  rows: CsvRow[];
  indexByCode: Map<string, number>;
  groups: ParentGroup[];

  activeParentCode: string | null;
  search: string;
  dirtyByParent: Record<string, Set<string>>;

  loadData: (rows: CsvRow[], meta: CsvMeta) => void;
  reset: () => void;
  setActiveParent: (code: string | null) => void;
  setSearch: (q: string) => void;
  updateChildStock: (parentCode: string, childCode: string, newValue: string) => void;
  resetParentStock: (parentCode: string) => void;
  discountParentStock: (parentCode: string) => void;
  persistActive: () => void;
  rehydrateActive: () => void;
  restoreFromStorage: () => void;
}

export const useStockStore = create<State>((set, get) => ({
  loaded: false,
  meta: null,
  rows: [],
  indexByCode: new Map(),
  groups: [],

  activeParentCode: null,
  search: '',
  dirtyByParent: {},

  loadData: (rows, meta) => {
    clearAllSessions();
    clearCsvData();

    const indexByCode = new Map<string, number>();
    rows.forEach((r, i) => {
      const code = (r['Código'] ?? '').trim();
      if (code) indexByCode.set(code, i);
    });

    const groups = buildGroups(rows);
    const firstParentCode = groups[0]?.parentCode ?? null;

    // Persistimos el CSV recién cargado para sobrevivir refresh/cierre/update.
    saveCsvData(rows, meta);

    set({
      loaded: true,
      meta,
      rows,
      indexByCode,
      groups,
      activeParentCode: firstParentCode,
      search: '',
      dirtyByParent: {},
    });
  },

  reset: () => {
    clearAllSessions();
    clearCsvData();

    set({
      loaded: false,
      meta: null,
      rows: [],
      indexByCode: new Map(),
      groups: [],
      activeParentCode: null,
      search: '',
      dirtyByParent: {},
    });
  },

  setActiveParent: (code) => {
    set({ activeParentCode: code, search: '' });

    if (code) {
      get().rehydrateActive();
    }
  },

  setSearch: (q) => set({ search: q }),

  updateChildStock: (parentCode, childCode, newValue) => {
    const { rows, indexByCode, dirtyByParent } = get();
    const idx = indexByCode.get(childCode);
    if (idx === undefined) return;

    const clean = sanitizeStock(newValue);
    const updated = { ...rows[idx], Estoque: clean };
    const newRows = rows.slice();
    newRows[idx] = updated;

    const dirty = { ...dirtyByParent };
    const set_ = new Set(dirty[parentCode] ?? []);
    set_.add(childCode);
    dirty[parentCode] = set_;

    set({ rows: newRows, dirtyByParent: dirty });
    schedulePersist(parentCode);
  },

  resetParentStock: (parentCode) => {
    const { rows, indexByCode, groups, dirtyByParent } = get();
    const group = groups.find((g) => g.parentCode === parentCode);
    if (!group) return;

    const newRows = rows.slice();
    for (const childCode of group.childCodes) {
      const idx = indexByCode.get(childCode);
      if (idx === undefined) continue;
      newRows[idx] = { ...newRows[idx], Estoque: '0' };
    }

    const dirty = { ...dirtyByParent };
    dirty[parentCode] = new Set(group.childCodes);

    set({ rows: newRows, dirtyByParent: dirty });
    schedulePersist(parentCode);
  },

  discountParentStock: (parentCode) => {
    const { rows, indexByCode, groups, dirtyByParent } = get();
    const group = groups.find((g) => g.parentCode === parentCode);
    if (!group) return;

    const newRows = rows.slice();
    const affected: string[] = [];

    for (const childCode of group.childCodes) {
      const idx = indexByCode.get(childCode);
      if (idx === undefined) continue;

      const current = parseStock(rows[idx]['Estoque']);
      if (current >= 12) {
        newRows[idx] = { ...newRows[idx], Estoque: String(current - 2) };
        affected.push(childCode);
      }
    }

    if (affected.length === 0) return;

    const dirty = { ...dirtyByParent };
    const set_ = new Set(dirty[parentCode] ?? []);
    for (const code of affected) set_.add(code);
    dirty[parentCode] = set_;

    set({ rows: newRows, dirtyByParent: dirty });
    schedulePersist(parentCode);
  },

  persistActive: () => {
    const { activeParentCode } = get();
    if (!activeParentCode) return;

    persistParent(activeParentCode);
  },

  rehydrateActive: () => {
    const { activeParentCode, rows, indexByCode, dirtyByParent } = get();
    if (!activeParentCode) return;

    const stored = loadSession(activeParentCode);
    if (!stored) return;

    const newRows = rows.slice();

    for (const [childCode, value] of Object.entries(stored.estoqueOverrides)) {
      const idx = indexByCode.get(childCode);
      if (idx === undefined) continue;
      newRows[idx] = { ...newRows[idx], Estoque: value };
    }

    const dirty = { ...dirtyByParent };
    dirty[activeParentCode] = new Set(stored.dirtyChildren);

    set({ rows: newRows, dirtyByParent: dirty });
  },

  restoreFromStorage: () => {
    const stored = loadCsvData();
    if (!stored) return;

    const { rows, meta } = stored;

    const indexByCode = new Map<string, number>();
    rows.forEach((r, i) => {
      const code = (r['Código'] ?? '').trim();
      if (code) indexByCode.set(code, i);
    });

    const groups = buildGroups(rows);

    // Aplicamos los overrides de TODAS las sesiones guardadas sobre el CSV base
    // y reconstruimos los "dirty" para que el contador y el export sigan correctos.
    const newRows = rows.slice();
    const dirtyByParent: Record<string, Set<string>> = {};

    for (const session of loadAllSessions()) {
      for (const [childCode, value] of Object.entries(session.estoqueOverrides)) {
        const idx = indexByCode.get(childCode);
        if (idx === undefined) continue;
        newRows[idx] = { ...newRows[idx], Estoque: value };
      }
      if (session.dirtyChildren.length > 0) {
        dirtyByParent[session.parentCode] = new Set(session.dirtyChildren);
      }
    }

    set({
      loaded: true,
      meta,
      rows: newRows,
      indexByCode,
      groups,
      activeParentCode: groups[0]?.parentCode ?? null,
      search: '',
      dirtyByParent,
    });
  },
}));

// Restauramos sincrónicamente el conteo en curso ANTES del primer render.
// localStorage es síncrono, así que la app abre directo en el editor (sin
// flash de la pantalla de subida) si había un CSV guardado.
useStockStore.getState().restoreFromStorage();

function sanitizeStock(raw: string): string {
  return String(parseStock(raw));
}

function persistParent(parentCode: string) {
  const { rows, indexByCode, groups, dirtyByParent } = useStockStore.getState();
  const group = groups.find((g) => g.parentCode === parentCode);
  if (!group) return;

  const overrides: Record<string, string> = {};

  for (const childCode of group.childCodes) {
    const idx = indexByCode.get(childCode);
    if (idx === undefined) continue;
    overrides[childCode] = rows[idx]['Estoque'] ?? '0';
  }

  saveSession({
    parentCode,
    savedAt: Date.now(),
    estoqueOverrides: overrides,
    dirtyChildren: Array.from(dirtyByParent[parentCode] ?? []),
  });
}

const saveTimers = new Map<string, number>();

function schedulePersist(parentCode: string) {
  const existing = saveTimers.get(parentCode);

  if (existing) {
    clearTimeout(existing);
  }

  const timer = window.setTimeout(() => {
    saveTimers.delete(parentCode);
    persistParent(parentCode);
  }, 300);

  saveTimers.set(parentCode, timer);
}
