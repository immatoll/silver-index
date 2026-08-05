import { getSyncState, saveChainObject, saveChainEvent, setSyncState } from "../database.js";
import { OBJECT_TYPES, EVENT_TYPES, type Catalog, type EntityDef } from "../entities.js";
import { readGenericObjects } from "../sui/getGenericObjects.js";
import { readGenericEvents } from "../sui/getGenericEvents.js";
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

function eventSyncStateKey(entity: EntityDef): string {
  return `event_${entity.key}`;
}

export async function syncObjects(catalog: Catalog) {
  console.log(`Starting object sync (${catalog})`);

  const entities = OBJECT_TYPES.filter((e) => e.catalog === catalog);

  startSync(`${catalog}-objects`, "objects", entities.length);

  try {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      startEntity(i, entity.key, entity.label);

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
    console.log(`Object sync finished (${catalog})`);
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

      const cursor = getSyncState(eventSyncStateKey(entity));

      const events = await readGenericEvents(entity, cursor, (page, itemsFound) =>
        updatePage(page, itemsFound),
      );

      console.log(`Saving ${events.length} events (${entity.key})`);

      startSaving();
      await tick();

      for (let i = 0; i < events.length; i++) {
        saveChainEvent(events[i]);

        if ((i + 1) % SAVE_REPORT_INTERVAL === 0) {
          updateSaving(i + 1);
          await tick();
        }
      }

      updateSaving(events.length);

      if (events.length) {
        setSyncState(eventSyncStateKey(entity), events[events.length - 1].cursor);
      }
    }

    finishSync();
    console.log(`Event sync finished (${catalog})`);
  } catch (err: any) {
    failSync(err?.message ?? String(err));
    throw err;
  }
}
