import "dotenv/config";
import { runIngestionBatch, parseSourcesFromEnv } from "@/lib/ingest/runner";

runIngestionBatch(parseSourcesFromEnv())
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .then(() => process.exit(0));
