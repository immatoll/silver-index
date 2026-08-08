import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { DB_PATH } from "./config.js";

const dbPath = path.resolve(DB_PATH);

const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, {
    recursive: true,
  });
}

export const db = new Database(dbPath);

export function initDatabase() {
  // Drop the old per-entity tables (characters, assemblies, configs,
  // permits, unit events) — superseded by the generic chain_objects /
  // chain_events tables below, driven by src/entities.ts. Re-sync via
  // `world-objects` / `world-events` / `silverlink-objects` /
  // `silverlink-events` repopulates everything into the generic tables.
  db.exec(`
        DROP TABLE IF EXISTS characters;
        DROP TABLE IF EXISTS character_events;
        DROP TABLE IF EXISTS assemblies;
        DROP TABLE IF EXISTS assembly_configs;
        DROP TABLE IF EXISTS jump_permits;
        DROP TABLE IF EXISTS unit_events;
    `);

  db.exec(`
        CREATE TABLE IF NOT EXISTS sync_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

  // `digest` alone used to be the primary key on chain_events, but one Sui
  // transaction commonly emits several events (e.g. a Silver extension call
  // and the underlying world call in the same PTB, or a `take_many`/
  // `put_many` loop emitting the same event type repeatedly) — they all
  // share one digest, so every event past the first silently lost the
  // `ON CONFLICT(digest) DO NOTHING` race. Migrate to (digest,
  // sequence_number) and force a clean re-sync to recover what was dropped.
  const chainEventsInfo = db.prepare("PRAGMA table_info(chain_events)").all() as any[];
  const hasSequenceNumber = chainEventsInfo.some((col) => col.name === "sequence_number");

  if (chainEventsInfo.length > 0 && !hasSequenceNumber) {
    db.exec(`DROP TABLE chain_events;`);
    db.exec(`DELETE FROM sync_state WHERE key LIKE 'event_%';`);
  }

  // Gas cost columns were added after chain_events already existed for some
  // databases — backfill so old rows don't break re-syncs.
  const chainEventsInfo2 = db.prepare("PRAGMA table_info(chain_events)").all() as any[];
  const hasGasCost = chainEventsInfo2.some((col) => col.name === "gas_computation_cost");

  if (chainEventsInfo2.length > 0 && !hasGasCost) {
    db.exec(`
        ALTER TABLE chain_events ADD COLUMN gas_computation_cost TEXT;
        ALTER TABLE chain_events ADD COLUMN gas_storage_cost TEXT;
        ALTER TABLE chain_events ADD COLUMN gas_storage_rebate TEXT;
        ALTER TABLE chain_events ADD COLUMN gas_non_refundable_storage_fee TEXT;
    `);
  }

  // `version` (the object's on-chain Lamport version) was added after
  // chain_objects already existed for some databases — backfill the column
  // so old rows don't break the NOT NULL constraint on re-create.
  const chainObjectsInfo = db.prepare("PRAGMA table_info(chain_objects)").all() as any[];
  const hasVersion = chainObjectsInfo.some((col) => col.name === "version");

  if (chainObjectsInfo.length > 0 && !hasVersion) {
    db.exec(`ALTER TABLE chain_objects ADD COLUMN version INTEGER NOT NULL DEFAULT 0;`);
  }

  db.exec(`
        CREATE TABLE IF NOT EXISTS chain_objects (
            id TEXT PRIMARY KEY,
            entity_key TEXT NOT NULL,
            type TEXT NOT NULL,
            data_json TEXT,
            version INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_chain_objects_entity
            ON chain_objects(entity_key);

        CREATE TABLE IF NOT EXISTS chain_events (
            digest TEXT NOT NULL,
            sequence_number INTEGER NOT NULL,
            entity_key TEXT NOT NULL,
            type TEXT NOT NULL,
            data_json TEXT,
            created_at TEXT NOT NULL,
            gas_computation_cost TEXT,
            gas_storage_cost TEXT,
            gas_storage_rebate TEXT,
            gas_non_refundable_storage_fee TEXT,
            PRIMARY KEY (digest, sequence_number)
        );

        CREATE INDEX IF NOT EXISTS idx_chain_events_entity
            ON chain_events(entity_key);
    `);
  console.log("Database:", dbPath);
}

export function saveChainObject(object: any) {
  db.prepare(
    `
        INSERT INTO chain_objects (
            id,
            entity_key,
            type,
            data_json,
            version,
            updated_at
        )
        VALUES (
            @id,
            @entityKey,
            @type,
            @data,
            @version,
            @updatedAt
        )
        ON CONFLICT(id)
        DO UPDATE SET
            entity_key = excluded.entity_key,
            type = excluded.type,
            data_json = excluded.data_json,
            version = excluded.version,
            updated_at = excluded.updated_at
    `,
  ).run({
    id: object.id,
    entityKey: object.entityKey,
    type: object.type,
    data: JSON.stringify(object.data ?? null),
    version: object.version ?? 0,
    updatedAt: Date.now(),
  });
}

export function saveChainEvent(event: any) {
  db.prepare(
    `
        INSERT INTO chain_events (
            digest,
            sequence_number,
            entity_key,
            type,
            data_json,
            created_at,
            gas_computation_cost,
            gas_storage_cost,
            gas_storage_rebate,
            gas_non_refundable_storage_fee
        )
        VALUES (
            @digest,
            @sequenceNumber,
            @entityKey,
            @type,
            @data,
            @createdAt,
            @gasComputationCost,
            @gasStorageCost,
            @gasStorageRebate,
            @gasNonRefundableStorageFee
        )
        ON CONFLICT(digest, sequence_number)
        DO NOTHING
    `,
  ).run({
    digest: event.digest,
    sequenceNumber: event.sequenceNumber,
    entityKey: event.entityKey,
    type: event.type,
    data: JSON.stringify(event.data ?? null),
    createdAt: event.createdAt,
    gasComputationCost: event.gasComputationCost ?? null,
    gasStorageCost: event.gasStorageCost ?? null,
    gasStorageRebate: event.gasStorageRebate ?? null,
    gasNonRefundableStorageFee: event.gasNonRefundableStorageFee ?? null,
  });
}

export function getSyncState(key: string): string | null {
  const row = db
    .prepare(
      `
            SELECT value
            FROM sync_state
            WHERE key = ?
        `,
    )
    .get(key) as any;

  return row?.value ?? null;
}

export function setSyncState(key: string, value: string) {
  db.prepare(
    `
        INSERT INTO sync_state (key, value)
        VALUES (?, ?)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value
    `,
  ).run(key, value);
}
