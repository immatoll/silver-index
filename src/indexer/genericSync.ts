import {
  getSyncState,
  saveChainObject,
  saveChainEvent,
  setSyncState,
} from "../database.js";
import {
  OBJECT_TYPES,
  EVENT_TYPES,
  type Catalog,
  type EntityDef,
  type ObjectScope,
} from "../entities.js";
import { readGenericObjects } from "../sui/getGenericObjects.js";
import { readGenericEvents, type ChainEvent } from "../sui/getGenericEvents.js";
import {
  startSync,
  startEntity,
  updatePage,
  startSaving,
  updateSaving,
  finishSync,
  failSync,
} from "../progress.js";

// How often (in rows) to report save progress — frequent enough to feel
// live, infrequent enough not to add real overhead on large batches.
const SAVE_REPORT_INTERVAL = 200;

// better-sqlite3 writes are synchronous, so a long save loop never yields
// back to the event loop — Express can't even answer /api/sync/progress
// until the whole batch is done, making the "saving" phase invisible. This
// hands control back briefly every SAVE_REPORT_INTERVAL rows.
function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// Scoped by `entity.type`, not just `entity.key` — the key is stable
// across a package republish, but a stored cursor is an opaque pointer
// into that *specific* GraphQL `events(filter: { type })` result set.
// Reusing an old cursor against a new type filter (post-republish, once
// SLV_LOCATION_PACKAGE_ID etc. changes) returns an empty page rather than
// erroring, so the sync silently "succeeds" with 0 new events forever.
// Including the type means a republish naturally starts a fresh scan.
function eventSyncStateKey(entity: EntityDef): string {
  return `event_${entity.key}:${entity.type}`;
}

export async function syncObjects(catalog: Catalog, scope: ObjectScope = "game") {
  const label = scope === "technical" ? `${catalog}-technical-objects` : `${catalog}-objects`;

  console.log(`Starting object sync (${label})`);

  const entities = OBJECT_TYPES.filter(
    (e) => e.catalog === catalog && !!e.technical === (scope === "technical"),
  );

  startSync(label, "objects", entities.length);

  try {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      startEntity(i, entity.key, entity.label);

      if (entity.skipSync) {
        console.log(`Skipping objects (${entity.key}) — skipSync: true`);
        continue;
      }

      const objects = await readGenericObjects(entity, (page, itemsFound) =>
        updatePage(page, itemsFound),
      );

      console.log(`Saving ${objects.length} objects (${entity.key})`);

      startSaving();
      await tick();

      for (let i = 0; i < objects.length; i++) {
        saveChainObject(objects[i]);

        if ((i + 1) % SAVE_REPORT_INTERVAL === 0) {
          updateSaving(i + 1);
          await tick();
        }
      }

      updateSaving(objects.length);
    }

    finishSync();
    console.log(`Object sync finished (${label})`);
  } catch (err: any) {
    failSync(err?.message ?? String(err));
    throw err;
  }
}

export async function syncEvents(catalog: Catalog) {
  console.log(`Starting event sync (${catalog})`);

  const entities = EVENT_TYPES.filter((e) => e.catalog === catalog);

  startSync(`${catalog}-events`, "events", entities.length);

  try {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      startEntity(i, entity.key, entity.label);

      if (entity.skipSync) {
        console.log(`Skipping events (${entity.key}) — skipSync: true`);
        continue;
      }

      const cursor = getSyncState(eventSyncStateKey(entity));

      let saved = 0;

      // Called every 100 pages (and at the end / on failure) with the events
      // fetched since the last call, so progress survives a mid-scan error.
      const saveBatch = async (events: ChainEvent[], endCursor: string | null) => {
        console.log(`Saving ${events.length} events (${entity.key})`);

        startSaving();
        await tick();

        for (let j = 0; j < events.length; j++) {
          saveChainEvent(events[j]);

          if ((j + 1) % SAVE_REPORT_INTERVAL === 0) {
            updateSaving(saved + j + 1);
            await tick();
          }
        }

        saved += events.length;
        updateSaving(saved);

        if (endCursor) {
          setSyncState(eventSyncStateKey(entity), endCursor);
        }
      };

      await readGenericEvents(
        entity,
        cursor,
        (page, itemsFound) => updatePage(page, itemsFound),
        saveBatch,
      );
    }

    finishSync();
    console.log(`Event sync finished (${catalog})`);
  } catch (err: any) {
    failSync(err?.message ?? String(err));
    throw err;
  }
}
