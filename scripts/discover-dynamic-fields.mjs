#!/usr/bin/env node
/**
 * One-off discovery pass: walks the dynamic fields actually attached to
 * every object already indexed in chain_objects (silver.db), across every
 * OBJECT_TYPES kind, not just StorageUnit/Inventory — the user's question
 * was general ("are there more dynamic fields we need"), not
 * inventory-specific. Dynamic fields are structurally invisible to
 * `objects(filter: { type })` (the query genericSync.ts's whole pipeline
 * is built on) regardless of protocol (GraphQL/gRPC/JSON-RPC all only
 * expose them per-KNOWN-parent, never as a global type-filtered scan) —
 * this script is how you find out what's actually hanging off each kind
 * before deciding whether any of it is worth a real second sync mode.
 *
 * NOT wired into the permanent indexer (src/index.ts) — this is a
 * throwaway reference dump, not a new sync entity. Run manually:
 *
 *   node scripts/discover-dynamic-fields.mjs
 *   node scripts/discover-dynamic-fields.mjs --sample-per-parent 3 --max-parents 50
 *
 * Output: scripts/output/dynamic-fields-report.json — one entry per
 * (parent entity kind, dynamic-field name-type, dynamic-field value-type)
 * combination actually observed, with a count and a few sample parent ids
 * + one full sample value so you can decide whether it's worth indexing.
 */
import { parseArgs } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { SuiGraphQLClient } from "@mysten/sui/graphql";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "..", "data", "silver.db");
const OUT_PATH = resolve(__dirname, "output", "dynamic-fields-report.json");
const SUI_GRAPHQL_URL = "https://graphql.testnet.sui.io/graphql";

const { values } = parseArgs({
  options: {
    "sample-per-parent": { type: "string", default: "2" },
    "max-parents": { type: "string", default: "0" }, // 0 = no cap
    "entity-key": { type: "string" }, // restrict to one entity_key, for a quick re-run
  },
});
const SAMPLE_PER_PARENT = Number(values["sample-per-parent"]);
const MAX_PARENTS = Number(values["max-parents"]);

const graphql = new SuiGraphQLClient({ network: "testnet", url: SUI_GRAPHQL_URL });

const DYNAMIC_FIELDS_QUERY = `
  query DynamicFieldsOf($id: SuiAddress!, $after: String) {
    object(address: $id) {
      asMoveObject {
        dynamicFields(first: 50, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name { type { repr } json }
            value {
              __typename
              ... on MoveValue { type { repr } json }
              ... on MoveObject { contents { type { repr } json } }
            }
          }
        }
      }
    }
  }
`;

async function fetchDynamicFields(parentId) {
  const fields = [];
  let after = null;
  for (;;) {
    const result = await graphql.query({
      query: DYNAMIC_FIELDS_QUERY,
      variables: { id: parentId, after },
    });
    if (result.errors) throw new Error(JSON.stringify(result.errors));
    const conn = result.data?.object?.asMoveObject?.dynamicFields;
    if (!conn) break;
    for (const node of conn.nodes) fields.push(node);
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return fields;
}

function valueShape(value) {
  if (!value) return { typeRepr: undefined, json: undefined };
  if (value.__typename === "MoveValue") {
    return { typeRepr: value.type?.repr, json: value.json };
  }
  if (value.__typename === "MoveObject") {
    return { typeRepr: value.contents?.type?.repr, json: value.contents?.json };
  }
  return { typeRepr: value.__typename, json: undefined };
}

async function main() {
  const db = new Database(DB_PATH, { readonly: true });

  const entityKeyFilter = values["entity-key"];
  const rows = db
    .prepare(
      entityKeyFilter
        ? `SELECT DISTINCT entity_key, id FROM chain_objects WHERE entity_key = ?`
        : `SELECT DISTINCT entity_key, id FROM chain_objects`,
    )
    .all(...(entityKeyFilter ? [entityKeyFilter] : []));

  console.log(`Loaded ${rows.length} indexed objects across ${new Set(rows.map((r) => r.entity_key)).size} entity kinds`);

  // parent entity_key -> Map<`${nameType}|${valueType}`, { count, sampleParentIds: [], sampleValue }>
  const report = new Map();

  const byKind = new Map();
  for (const row of rows) {
    if (!byKind.has(row.entity_key)) byKind.set(row.entity_key, []);
    byKind.get(row.entity_key).push(row.id);
  }

  for (const [entityKey, ids] of byKind) {
    const scanIds = MAX_PARENTS > 0 ? ids.slice(0, MAX_PARENTS) : ids;
    console.log(`\nScanning ${scanIds.length}/${ids.length} objects of kind "${entityKey}" for dynamic fields...`);

    let scanned = 0;
    let withFields = 0;

    for (const parentId of scanIds) {
      scanned++;
      let fields;
      try {
        fields = await fetchDynamicFields(parentId);
      } catch (err) {
        console.error(`  ! failed for ${parentId}: ${err.message ?? err}`);
        continue;
      }

      if (fields.length > 0) withFields++;

      for (const field of fields) {
        const nameType = field.name?.type?.repr ?? "unknown";
        const { typeRepr: valueType, json: valueJson } = valueShape(field.value);
        const bucketKey = `${nameType} => ${valueType ?? "unknown"}`;

        if (!report.has(entityKey)) report.set(entityKey, new Map());
        const kindMap = report.get(entityKey);

        if (!kindMap.has(bucketKey)) {
          kindMap.set(bucketKey, {
            nameType,
            valueType: valueType ?? "unknown",
            count: 0,
            sampleParentIds: [],
            sampleName: field.name?.json,
            sampleValue: valueJson,
          });
        }
        const bucket = kindMap.get(bucketKey);
        bucket.count++;
        if (bucket.sampleParentIds.length < SAMPLE_PER_PARENT && !bucket.sampleParentIds.includes(parentId)) {
          bucket.sampleParentIds.push(parentId);
        }
      }

      if (scanned % 25 === 0) console.log(`  ...${scanned}/${scanIds.length} scanned, ${withFields} had dynamic fields so far`);
    }

    console.log(`  Done: ${scanned} scanned, ${withFields} had at least one dynamic field`);
  }

  const output = {};
  for (const [entityKey, kindMap] of report) {
    output[entityKey] = [...kindMap.values()].sort((a, b) => b.count - a.count);
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWrote report → ${OUT_PATH}`);

  db.close();
}

await main();
