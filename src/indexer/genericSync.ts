import { getSyncState, saveChainObject, saveChainEvent, setSyncState } from "../database.js";
import { OBJECT_TYPES, EVENT_TYPES, type Catalog, type EntityDef } from "../entities.js";
import { readGenericObjects } from "../sui/getGenericObjects.js";
import { readGenericEvents } from "../sui/getGenericEvents.js";
import { startSync, startEntity, updatePage, finishSync, failSync } from "../progress.js";

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

      for (const object of objects) {
        saveChainObject(object);
      }
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

      for (const event of events) {
        saveChainEvent(event);
      }

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
