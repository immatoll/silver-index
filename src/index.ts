import { initDatabase, db } from "./database.js";
import { syncObjects, syncEvents } from "./indexer/genericSync.js";

async function main() {
  initDatabase();

  const mode = process.argv[2];

  if (mode === "world-objects") {
    await syncObjects("world");
  } else if (mode === "world-events") {
    await syncEvents("world");
  } else if (mode === "silverlink-objects") {
    await syncObjects("silverlink");
  } else if (mode === "silverlink-events") {
    await syncEvents("silverlink");
  } else {
    console.log(
      "Usage: tsx src/index.ts <world-objects|world-events|silverlink-objects|silverlink-events>",
    );
  }

  db.close();
}

main();
