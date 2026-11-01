export interface SyncProgress {
  running: boolean;
  mode: string | null;
  kind: "objects" | "events" | null;
  phase: "fetching" | "saving" | null;
  entityIndex: number;
  entityTotal: number;
  entityKey: string | null;
  entityLabel: string | null;
  page: number;
  itemsFound: number;
  savedCount: number;
  startedAt: number | null;
  updatedAt: number | null;
  error: string | null;
}

let state: SyncProgress = {
  running: false,
  mode: null,
  kind: null,
  phase: null,
  entityIndex: 0,
  entityTotal: 0,
  entityKey: null,
  entityLabel: null,
  page: 0,
  itemsFound: 0,
  savedCount: 0,
  startedAt: null,
  updatedAt: null,
  error: null,
};

export function getProgress(): SyncProgress {
  return state;
}

export function isRunning(): boolean {
  return state.running;
}

export function startSync(mode: string, kind: "objects" | "events", entityTotal: number) {
  state = {
    running: true,
    mode,
    kind,
    phase: null,
    entityIndex: 0,
    entityTotal,
    entityKey: null,
    entityLabel: null,
    page: 0,
    itemsFound: 0,
    savedCount: 0,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    error: null,
  };
}

export function startEntity(entityIndex: number, entityKey: string, entityLabel: string) {
  state = {
    ...state,
    phase: "fetching",
    entityIndex,
    entityKey,
    entityLabel,
    page: 0,
    itemsFound: 0,
    savedCount: 0,
    updatedAt: Date.now(),
  };
}

export function updatePage(page: number, itemsFound: number) {
  state = { ...state, phase: "fetching", page, itemsFound, updatedAt: Date.now() };
}

export function startSaving() {
  state = { ...state, phase: "saving", savedCount: 0, updatedAt: Date.now() };
}

export function updateSaving(savedCount: number) {
  state = { ...state, savedCount, updatedAt: Date.now() };
}

export function finishSync() {
  state = { ...state, running: false, updatedAt: Date.now() };
}

export function failSync(message: string) {
  state = { ...state, running: false, error: message, updatedAt: Date.now() };
}
