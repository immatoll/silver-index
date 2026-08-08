# AGENTS.md — silver-index

Orientation for anyone (human or agent) working in this codebase. This is
an indexer + explorer for on-chain data from EVE Frontier's `world`
package and SilverLink's own extension packages (`silver_gate`,
`silver_ssu`). It's a Node/TypeScript backend (Express API + a
better-sqlite3-backed indexer) with a small React frontend for browsing
the indexed data. See [`README.md`](README.md) for the user-facing
overview — this file is for how the pieces fit together and gotchas
worth knowing before you touch them.

**Keep this file current.** When you land a major feature (a new synced
entity category, a new chain-read pattern, a new API route, a new
gotcha worth not re-discovering) add a short section here describing it.
Skip this for small fixes/tweaks — this file is for orientation, not a
changelog.

See [`../silver-agent/AGENTS.md`](../silver-agent/AGENTS.md)
for conventions shared across this and the other Silver Tribe
projects — current Sui SDK packages/banned imports, PTB patterns, and
deployment discipline.

## Stack

- **Backend**: Node.js + TypeScript, run via `tsx` (no build step for the
  server — see `package.json` scripts). `better-sqlite3` for storage
  (synchronous, single-file, no ORM — raw SQL in `src/database.ts`).
  `@mysten/sui`'s `SuiGraphQLClient` for chain reads (`src/sui/client.ts`).
  Express for the API (`src/api/server.ts`), CORS-open, no auth.
- **Frontend** (`frontend/`): React + MUI, plain Vite dev server, talks
  to the Express API over HTTP (`frontend/src/api.ts`).

## Directory layout

```
src/
  config.ts                — env-driven constants (package/module ids), all with testnet defaults
  entities.ts               — the catalog: every OBJECT_TYPES / EVENT_TYPES entry (key, Move type, label, catalog)
  database.ts                — schema (chain_objects / chain_events / sync_state), save/query helpers
  progress.ts                 — in-memory SyncProgress singleton, polled by the API and frontend
  index.ts                     — CLI entrypoint (one-shot sync runs)
  sui/
    client.ts                   — the shared SuiGraphQLClient instance
    getGenericObjects.ts          — paginated `objects(filter: { type })` scan for one entity
    getGenericEvents.ts            — paginated `events(filter: { type })` scan for one entity, cursor-resumable
  indexer/
    genericSync.ts                 — orchestrates a full object/event sync across every entity in a catalog
  api/
    server.ts                       — Express routes: /api/status, /api/entities, /api/chain-objects,
                                       /api/chain-events, /api/sync/*, /api/sync/progress, /api/logs
frontend/src/
  api.ts, functions.ts, App.tsx      — API client, hand-maintained Move function reference, UI
```

## The entity catalog is the source of truth

Everything indexed is driven by `OBJECT_TYPES`/`EVENT_TYPES` in
[`src/entities.ts`](src/entities.ts) — a flat list of `{ key, type,
label, catalog }`. There is **no per-entity parsing code**: both
objects and events are stored as raw `data_json` blobs
(`chain_objects.data_json` / `chain_events.data_json`), keyed generically
by `entity_key`. To index a new Move struct or event, add one entry to
the relevant array — nothing else needs to change. This is deliberate:
the catalog is too large (~45 event types, ~20 object types) for
per-entity parser files to stay maintainable. Don't add a bespoke
table/reader for a new type; extend the generic path instead.

`catalog` (`"world" | "silverlink"`) is purely a frontend grouping (two
tabs) — it doesn't affect how data is fetched or stored.

## Sync model

- **Objects** (`getGenericObjects.ts` + `syncObjects`): full re-scan every
  run, no incremental cursor — `objects(filter: { type })` paginated to
  completion, upserted by `id` (`ON CONFLICT DO UPDATE`, keeps latest
  `version`/`data_json`).
- **Events** (`getGenericEvents.ts` + `syncEvents`): incremental —
  the last page's `endCursor` is persisted per entity in `sync_state`
  (`event_<entity.key>`) and reused as `after` on the next run, so a
  re-sync only fetches new events. Inserted with `(digest,
  sequence_number)` as the primary key and `ON CONFLICT DO NOTHING` —
  **one transaction can emit several events of the same type** (e.g. a
  `take_many` loop), all sharing one `digest`, so `sequence_number` is
  required to keep them distinct. Don't key anything on `digest` alone.
- Only one sync runs at a time, guarded by `progress.ts`'s
  `isRunning()`; the API returns `409` for a second concurrent request.
  Syncs are fire-and-forget from the API's POV (`triggerBackgroundSync`)
  — the HTTP call returns immediately and the frontend polls
  `/api/sync/progress`.
- `better-sqlite3` writes are synchronous, so a naive save loop over a
  large batch would block the Node event loop long enough that Express
  couldn't even answer `/api/sync/progress`. `genericSync.ts` yields via
  `setImmediate` every `SAVE_REPORT_INTERVAL` (200) rows — keep that
  pattern for any new bulk-save loop.

## Database migrations

There's no migration framework — `initDatabase()` in `database.ts` runs
on every startup and hand-rolls forward migrations with
`PRAGMA table_info` checks (add a column if missing, drop+resync if a
key structure changed). Follow that pattern for new columns: check
`table_info`, `ALTER TABLE ADD COLUMN` if absent, don't assume a fresh
schema. `chain_events`/`chain_objects` PII-free JSON blobs — safe to
`DROP TABLE`+resync when a structural change (like the
`(digest, sequence_number)` PK migration) can't be expressed as a
column add; the chain is the real source of truth, sqlite is just a
cache of it.

## Chain-read gotchas

- **GraphQL node shape depends on which query root you used.** The
  top-level `objects(filter: { type })` root returns `Object` nodes,
  which need `asMoveObject { contents { json } }` — not bare
  `contents { json }` like an `address(...).objects` query would give
  you. Mixing these up fails silently-ish (a GraphQL error, not a type
  error).
- **`events(filter: { type })` only returns events emitted by that exact
  type** — the `contents.json` shape is entirely dictated by the Move
  event struct, so any change to an event struct's fields needs no
  index-side code change (still just JSON), but *does* mean historical
  rows may have a different shape than new ones if the contract was
  upgraded mid-history. Nothing currently normalizes across that; keep
  it in mind if you add derived columns from `data_json` fields.
- **The public testnet GraphQL endpoint** (`SUI_GRAPHQL_URL` in
  `config.ts`) may not retain full history back to contract genesis —
  don't assume an empty/short result means the indexer is broken.
- Gas/transaction cost fields (added on the events path) come from
  `transaction { effects { gasEffects { gasSummary { ... } } } }` on the
  same `events` query — no extra round trip needed since events already
  carry a `transaction` node. Objects, by contrast, don't carry their
  originating transaction in the generic scan query at all; getting
  gas cost per object would need `previousTransactionBlock` on the
  object node plus a follow-up lookup per unique digest — not currently
  implemented.

## Running things

```bash
npm run dev                                  # API + frontend together
npx tsx src/index.ts world-objects           # one-shot CLI syncs
npx tsx src/index.ts world-events
npx tsx src/index.ts silverlink-objects
npx tsx src/index.ts silverlink-events
npx tsc --noEmit                             # typecheck before calling a change done
```

## Frontend notes

- `frontend/src/functions.ts` is a **hand-maintained** reference of each
  contract's callable Move functions (signature, return type,
  description) — not generated. It needs a manual pass whenever the
  Move source in the sibling `civ-control/vendor/world-contracts`
  (World) or `silver-link/move` (Silver Link) repos changes. Scoped to
  state-changing functions only (anything taking `&mut`/`TxContext`, or
  creating/consuming objects) — pure getters and `public(package)`
  internals are intentionally excluded.
- The API uses `SELECT *` for `/api/chain-objects`/`/api/chain-events`,
  so new columns show up automatically without an API change — only the
  DB schema and save function need updating for a new field.
