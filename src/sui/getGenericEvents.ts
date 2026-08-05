import { graphql } from "./client.js";
import type { EntityDef } from "../entities.js";

const PAGE_SIZE = 50;

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
  cursor: string;
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
                }
            }
        }
    }
`;

export async function readGenericEvents(
  entity: EntityDef,
  cursor: string | null,
  onPage?: (page: number, itemsFound: number) => void,
): Promise<ChainEvent[]> {
  console.log(`Scanning events (${entity.key})...`);

  const events: ChainEvent[] = [];

  let page = 0;

  while (true) {
    page++;

    const response = await graphql.query({
      query: QUERY,
      variables: {
        type: entity.type,
        after: cursor,
      },
    });

    if (response.errors) {
      throw new Error(JSON.stringify(response.errors));
    }

    const data = response.data.events;

    for (const node of data.nodes) {
      const json = node.contents?.json;

      if (!json) continue;

      events.push({
        digest: node.transaction.digest,
        sequenceNumber: Number(node.sequenceNumber),
        entityKey: entity.key,
        type: entity.type,
        data: json,
        createdAt: node.timestamp,
        cursor: data.pageInfo.endCursor,
      });
    }

    console.log(
      `Event page ${page} (${entity.key}): +${data.nodes.length} (${events.length} total)`,
    );

    onPage?.(page, events.length);

    if (!data.pageInfo.hasNextPage) break;

    cursor = data.pageInfo.endCursor;
  }

  console.log(`Finished event scan (${entity.key}): ${events.length} events`);

  return events;
}
