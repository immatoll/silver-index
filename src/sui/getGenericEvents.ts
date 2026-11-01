import { graphql } from "./client.js";
import type { EntityDef } from "../entities.js";

const PAGE_SIZE = 50;

// Hand the events fetched so far to the caller (to be saved) every this many
// pages, so a failure mid-scan (rate limit, network) only loses the current
// partial batch instead of the whole scan.
const CHECKPOINT_PAGES = 100;

export interface ChainEvent {
  digest: string;
  /** Per-transaction emission index — a single tx can emit several events
   *  (even several of the very same type, e.g. a `take_many` loop), all
   *  sharing one digest, so this is required to uniquely identify one. */
  sequenceNumber: number;
  entityKey: string;
  type: string;
  data: any;
  createdAt: string;
  cursor: string | null;
  gasComputationCost: string | null;
  gasStorageCost: string | null;
  gasStorageRebate: string | null;
  gasNonRefundableStorageFee: string | null;
}

interface GenericEventScanResponse {
  events: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: {
      timestamp: string;
      sequenceNumber: string;
      contents?: {
        json: unknown;
      } | null;
      transaction: {
        digest: string;
        effects?: {
          gasEffects?: {
            gasSummary?: {
              computationCost: string;
              storageCost: string;
              storageRebate: string;
              nonRefundableStorageFee: string;
            } | null;
          } | null;
        } | null;
      };
    }[];
  };
}

const QUERY = `
    query GenericEventScan(
        $type: String!,
        $after: String
    ) {
        events(
            filter: { type: $type },
            first: ${PAGE_SIZE},
            after: $after
        ) {
            pageInfo {
                hasNextPage
                endCursor
            }

            nodes {
                timestamp
                sequenceNumber

                contents {
                    json
                }

                transaction {
                    digest

                    effects {
                        gasEffects {
                            gasSummary {
                                computationCost
                                storageCost
                                storageRebate
                                nonRefundableStorageFee
                            }
                        }
                    }
                }
            }
        }
    }
`;

/**
 * Scans events page by page. Every CHECKPOINT_PAGES pages (and once more at
 * the end, or when a page fails) `onCheckpoint` is awaited with the events
 * fetched since the previous checkpoint plus the cursor of the last fully
 * fetched page, so the caller can persist both and resume from there.
 * Returns the total number of events fetched.
 */
export async function readGenericEvents(
  entity: EntityDef,
  cursor: string | null,
  onPage: (page: number, itemsFound: number) => void,
  onCheckpoint: (events: ChainEvent[], cursor: string | null) => Promise<void>,
): Promise<number> {
  console.log(`Scanning events (${entity.key})...`);

  let batch: ChainEvent[] = [];
  let total = 0;
  let page = 0;

  const flush = async () => {
    if (!batch.length) return;

    const events = batch;
    batch = [];

    await onCheckpoint(events, cursor);
  };

  try {
    while (true) {
      page++;

      const response = await graphql.query<GenericEventScanResponse>({
        query: QUERY,
        variables: {
          type: entity.type,
          after: cursor,
        },
      });

      if (response.errors) {
        throw new Error(JSON.stringify(response.errors));
      }

      if (!response.data) {
        throw new Error("GraphQL returned no data.");
      }

      const data = response.data.events;

      for (const node of data.nodes) {
        const json = node.contents?.json;

        if (!json) continue;

        const gasSummary = node.transaction.effects?.gasEffects?.gasSummary;

        batch.push({
          digest: node.transaction.digest,
          sequenceNumber: Number(node.sequenceNumber),
          entityKey: entity.key,
          type: entity.type,
          data: json,
          createdAt: node.timestamp,
          cursor: data.pageInfo.endCursor ?? "",
          gasComputationCost: gasSummary?.computationCost ?? null,
          gasStorageCost: gasSummary?.storageCost ?? null,
          gasStorageRebate: gasSummary?.storageRebate ?? null,
          gasNonRefundableStorageFee:
            gasSummary?.nonRefundableStorageFee ?? null,
        });

        total++;
      }

      console.log(
        `Event page ${page} (${entity.key}): +${data.nodes.length} (${total} total)`,
      );

      onPage(page, total);

      // The page is fully consumed, so it's now safe to resume after it.
      cursor = data.pageInfo.endCursor;

      if (!data.pageInfo.hasNextPage) break;

      if (page % CHECKPOINT_PAGES === 0) await flush();
    }
  } catch (err) {
    // Keep what we have — the failed page isn't in `batch`, and `cursor`
    // still points at the last page that was.
    try {
      await flush();
    } catch (flushErr) {
      console.error(`Failed to save partial events (${entity.key}):`, flushErr);
    }

    throw err;
  }

  await flush();

  console.log(`Finished event scan (${entity.key}): ${total} events`);

  return total;
}
