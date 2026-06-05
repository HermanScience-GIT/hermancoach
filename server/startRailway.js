import { spawnSync } from "node:child_process";

const migration = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
});

if (migration.status !== 0) {
  process.exit(migration.status ?? 1);
}

await import("./index.js");
