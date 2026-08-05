
# Silver Index

An indexer and explorer for on-chain data from the [EVE Frontier](https://evefrontier.com/) Sui world contract and SilverLink's own extension packages (`silver_gate`, `silver_ssu`).

It walks the Sui GraphQL RPC for every known object and event type, stores the raw JSON in a local SQLite database, and serves it through a small API and React frontend so you can browse objects, events, and sync progress without writing GraphQL by hand.
## How it works

- **Indexer** (`src/`) — queries `events`/`objects` on the [Sui GraphQL API](https://graphql.testnet.sui.io/graphql) for each type declared in [`src/entities.ts`](src/entities.ts), paginates through all results, and upserts them into SQLite (`chain_objects` / `chain_events` tables). Event syncs are incremental: the last page cursor is saved per entity in `sync_state` and reused as the `after` cursor on the next run.
- **API** (`src/api/server.ts`) — Express server exposing sync status, entity counts, logs, and paginated reads of the stored objects/events. Triggers syncs on demand and reports live progress (`src/progress.ts`), including a distinct "saving to DB" phase, so a caller isn't stuck waiting on one long HTTP request.
- **Frontend** (`frontend/`) — React + MUI app with two pages: **Sync**, to trigger/monitor indexing runs, and **Entity Explorer**, to browse indexed data across three tabs — **Objects** and **Events** (`chain_objects` / `chain_events`, with per-entity counts), and **Functions**, a hand-maintained reference of each contract's callable Move functions (see [`frontend/src/functions.ts`](frontend/src/functions.ts)).

Data is split into two catalogs, shown as separate tabs in the frontend:

- **World** — base game contract (assemblies, gates, characters, killmails, inventory, etc.)
- **SilverLink** — this project's own extension packages (gate/SSU config, whitelist, and access events)

Indexed objects also carry the on-chain `version` field (Sui's Lamport-clock-based per-object version counter), so when the same logical entity has multiple candidate objects (e.g. a wallet's old vs. new Character), the one with the highest `version` is the current one.

### Function library

The **Functions** tab (in each catalog's Entity Explorer) is a searchable, per-module reference of the contracts' callable Move functions — signature, return type, and a short description for each. It's scoped to state-changing/action functions (anything taking `&mut`, a `TxContext`, or creating/consuming objects) and intentionally excludes pure getters and `public(package)` internals, so it stays a usable "what can I call" reference rather than a full API dump.

It's hand-maintained in [`frontend/src/functions.ts`](frontend/src/functions.ts), transcribed from the Move source in the sibling `civ-control/vendor/world-contracts` (World) and `silver-link/move` (Silver Link) repos — not auto-generated, so it needs a manual pass whenever those contracts change.

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
npm install --prefix frontend
```

Configuration is read from environment variables (see [`src/config.ts`](src/config.ts)), all optional with sensible defaults for EVE Frontier testnet:

| Variable | Default |
| --- | --- |
| `DB_PATH` | `./data/silver.db` |
| `SUI_GRAPHQL_URL` | `https://graphql.testnet.sui.io/graphql` |
| `WORLD_PACKAGE_ID` | world package ID |
| `SLV_SSU_PACKAGE_ID` | Silver SSU extension package ID |
| `SLV_GATE_PACKAGE_ID` | Silver Gate extension package ID |
| `SLV_SSU_MODULE` | `shared` |
| `SLV_GATE_MODULE` | `silver_gate` |

Copy these into a `.env` file if you need to override any of them (e.g. to point at a different network or package deployment).

## Usage

### Web UI (recommended)

Runs the API and frontend together:

```bash
npm run dev
```

Then open the frontend (Vite dev server) and use the **Sync** page to start a world/SilverLink objects or events sync, and the **Entity Explorer** page to browse the results.

### CLI

Each sync can also be run directly, one-shot, from the command line:

```bash
npx tsx src/index.ts world-objects
npx tsx src/index.ts world-events
npx tsx src/index.ts silverlink-objects
npx tsx src/index.ts silverlink-events
```

## Notes

- Data is only as complete as the RPC node's retained history — the public testnet GraphQL endpoint may not have full history back to contract genesis.
- Only one sync runs at a time; the API rejects a new sync request with `409` while one is already in progress.
