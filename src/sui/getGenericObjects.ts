import { graphql } from "./client.js";
import type { EntityDef } from "../entities.js";

const PAGE_SIZE = 50;

export interface ChainObject {
  id: string;
  entityKey: string;
  type: string;
  data: any;
  version: number;
}

const QUERY = `
    query GenericObjectScan(
        $type: String!,
        $after: String
    ) {
        objects(
            filter: { type: $type },
            first: ${PAGE_SIZE},
            after: $after
        ) {
            pageInfo {
                hasNextPage
                endCursor
            }

            nodes {
                address
                version
                asMoveObject {
                    contents {
                        json
                    }
                }
            }
        }
    }
`;

export async function readGenericObjects(
  entity: EntityDef,
  onPage?: (page: number, itemsFound: number) => void,
): Promise<ChainObject[]> {
  console.log(`Scanning objects (${entity.key})...`);

  const objects: ChainObject[] = [];

  let cursor: string | null = null;
  let page = 0;

  while (true) {
    page++;

    const result = await graphql.query({
      query: QUERY,
      variables: {
        type: entity.type,
        after: cursor,
      },
    });

    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }

    const page_ = result.data.objects;

    for (const node of page_.nodes) {
      const id = node.address;
      const data = node.asMoveObject?.contents?.json;

      if (!id || !data) continue;

      objects.push({ id, entityKey: entity.key, type: entity.type, data, version: Number(node.version) });
    }

    console.log(
      `Object page ${page} (${entity.key}): +${page_.nodes.length} (${objects.length} total)`,
    );

    onPage?.(page, objects.length);

    if (!page_.pageInfo.hasNextPage) break;

    cursor = page_.pageInfo.endCursor;
  }

  console.log(`Finished object scan (${entity.key}): ${objects.length} found`);

  return objects;
}
