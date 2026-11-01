import express from "express";
import cors from "cors";

import { db, initDatabase } from "../database.js";
import { syncObjects, syncEvents } from "../indexer/genericSync.js";
import { OBJECT_TYPES, EVENT_TYPES, type Catalog } from "../entities.js";
import { getProgress, isRunning } from "../progress.js";

initDatabase();

const app = express();

app.use(cors());
app.use(express.json());

let logs: string[] = [];
const max_limit = 20000;

function log(message: string) {
  console.log(message);

  logs.push(`[${new Date().toISOString()}] ${message}`);

  if (logs.length > 200) {
    logs.shift();
  }
}

function countByCatalog(table: "chain_objects" | "chain_events", catalog: Catalog): number {
  const keys = OBJECT_TYPES.concat(EVENT_TYPES)
    .filter((e) => e.catalog === catalog)
    .map((e) => e.key);

  if (!keys.length) return 0;

  const placeholders = keys.map(() => "?").join(",");

  const row = db
    .prepare(`SELECT COUNT(*) count FROM ${table} WHERE entity_key IN (${placeholders})`)
    .get(...keys) as any;

  return row.count;
}

app.get("/api/status", (req, res) => {
  res.json({
    worldObjects: countByCatalog("chain_objects", "world"),
    worldEvents: countByCatalog("chain_events", "world"),
    silverlinkObjects: countByCatalog("chain_objects", "silverlink"),
    silverlinkEvents: countByCatalog("chain_events", "silverlink"),
  });
});

app.get("/api/logs", (req, res) => {
  res.json(logs);
});

app.get("/api/sync/progress", (req, res) => {
  res.json(getProgress());
});

function triggerBackgroundSync(
  label: string,
  run: () => Promise<void>,
): "started" | "busy" {
  if (isRunning()) {
    return "busy";
  }

  log(`${label} started`);

  // Fire-and-forget on purpose — the HTTP request returns immediately so
  // the frontend can poll /api/sync/progress for live status instead of
  // blocking on one long request. Also means only one sync ever runs at a
  // time (guarded by isRunning() above), which avoids two processes racing
  // on the same sqlite file.
  run()
    .then(() => log(`${label} finished`))
    .catch((err) => log(`${label} failed: ${err?.message ?? err}`));

  return "started";
}

app.post("/api/sync/world-objects", (req, res) => {
  const result = triggerBackgroundSync("World object sync", () => syncObjects("world"));
  res.status(result === "busy" ? 409 : 200).json({ ok: result === "started", status: result });
});

app.post("/api/sync/world-technical-objects", (req, res) => {
  const result = triggerBackgroundSync("World technical object sync", () =>
    syncObjects("world", "technical"),
  );
  res.status(result === "busy" ? 409 : 200).json({ ok: result === "started", status: result });
});

app.post("/api/sync/world-events", (req, res) => {
  const result = triggerBackgroundSync("World event sync", () => syncEvents("world"));
  res.status(result === "busy" ? 409 : 200).json({ ok: result === "started", status: result });
});

app.post("/api/sync/silverlink-objects", (req, res) => {
  const result = triggerBackgroundSync("Silver Link object sync", () => syncObjects("silverlink"));
  res.status(result === "busy" ? 409 : 200).json({ ok: result === "started", status: result });
});

app.post("/api/sync/silverlink-events", (req, res) => {
  const result = triggerBackgroundSync("Silver Link event sync", () => syncEvents("silverlink"));
  res.status(result === "busy" ? 409 : 200).json({ ok: result === "started", status: result });
});

app.get("/api/entities", (req, res) => {
  const catalog = (req.query.catalog as Catalog | undefined) ?? undefined;

  const objectCounts = db
    .prepare(`SELECT entity_key, COUNT(*) count FROM chain_objects GROUP BY entity_key`)
    .all() as any[];

  const eventCounts = db
    .prepare(`SELECT entity_key, COUNT(*) count FROM chain_events GROUP BY entity_key`)
    .all() as any[];

  const objectCountByKey = Object.fromEntries(
    objectCounts.map((row) => [row.entity_key, row.count]),
  );

  const eventCountByKey = Object.fromEntries(
    eventCounts.map((row) => [row.entity_key, row.count]),
  );

  const objectTypes = catalog ? OBJECT_TYPES.filter((e) => e.catalog === catalog) : OBJECT_TYPES;
  const eventTypes = catalog ? EVENT_TYPES.filter((e) => e.catalog === catalog) : EVENT_TYPES;

  res.json({
    objects: objectTypes.map((entity) => ({
      ...entity,
      count: objectCountByKey[entity.key] ?? 0,
    })),

    events: eventTypes.map((entity) => ({
      ...entity,
      count: eventCountByKey[entity.key] ?? 0,
    })),
  });
});

app.get("/api/chain-objects", (req, res) => {
  const entityKey = String(req.query.entity ?? "");
  const limit = Number(req.query.limit ?? max_limit);
  const offset = Number(req.query.offset ?? 0);

  const rows = db
    .prepare(
      `
        SELECT * FROM chain_objects
        WHERE entity_key = ?
        ORDER BY updated_at DESC
        LIMIT ?
        OFFSET ?
    `,
    )
    .all(entityKey, limit, offset);

  res.json(rows);
});

app.get("/api/chain-events", (req, res) => {
  const entityKey = String(req.query.entity ?? "");
  const limit = Number(req.query.limit ?? max_limit);
  const offset = Number(req.query.offset ?? 0);

  const rows = db
    .prepare(
      `
        SELECT * FROM chain_events
        WHERE entity_key = ?
        ORDER BY created_at DESC
        LIMIT ?
        OFFSET ?
    `,
    )
    .all(entityKey, limit, offset);

  res.json(rows);
});

app.listen(3000, () => {
  log("API running on port 3000");
});
