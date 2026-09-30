import { cleanupQaData } from "./cleanup.mjs";

// Every E2E run cleans up its own qa-e2e data, whether the tests passed or not.
export default async function globalTeardown() {
  await cleanupQaData();
}
