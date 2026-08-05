const API = "http://localhost:3000";

export type Catalog = "world" | "silverlink";

export interface Status {
    worldObjects: number;
    worldEvents: number;
    silverlinkObjects: number;
    silverlinkEvents: number;
}

export interface EntityInfo {
    key: string;
    type: string;
    label: string;
    catalog: Catalog;
    count: number;
}

export interface EntityCatalog {
    objects: EntityInfo[];
    events: EntityInfo[];
}

export interface ChainObjectRow {
    id: string;
    entity_key: string;
    type: string;
    data_json: string;
    updated_at: number;
}

export interface ChainEventRow {
    digest: string;
    sequence_number: number;
    entity_key: string;
    type: string;
    data_json: string;
    created_at: string;
}

export async function fetchStatus(): Promise<Status> {
    const response = await fetch(`${API}/api/status`);
    return response.json();
}

export async function fetchLogs(): Promise<string[]> {
    const response = await fetch(`${API}/api/logs`);
    return response.json();
}

export interface SyncProgress {
    running: boolean;
    mode: string | null;
    kind: "objects" | "events" | null;
    entityIndex: number;
    entityTotal: number;
    entityKey: string | null;
    entityLabel: string | null;
    page: number;
    itemsFound: number;
    startedAt: number | null;
    updatedAt: number | null;
    error: string | null;
}

export async function fetchSyncProgress(): Promise<SyncProgress> {
    const response = await fetch(`${API}/api/sync/progress`);
    return response.json();
}

export async function fetchEntities(catalog: Catalog): Promise<EntityCatalog> {
    const response = await fetch(`${API}/api/entities?catalog=${catalog}`);
    return response.json();
}

export async function fetchChainObjects(entity: string): Promise<ChainObjectRow[]> {
    const response = await fetch(
        `${API}/api/chain-objects?entity=${encodeURIComponent(entity)}`
    );
    return response.json();
}

export async function fetchChainEvents(entity: string): Promise<ChainEventRow[]> {
    const response = await fetch(
        `${API}/api/chain-events?entity=${encodeURIComponent(entity)}`
    );
    return response.json();
}

export type SyncType =
    | "world-objects"
    | "world-events"
    | "silverlink-objects"
    | "silverlink-events";

export interface TriggerSyncResult {
    ok: boolean;
    status: "started" | "busy";
}

export async function triggerSync(type: SyncType): Promise<TriggerSyncResult> {
    const response = await fetch(`${API}/api/sync/${type}`, {
        method: "POST"
    });
    return response.json();
}
