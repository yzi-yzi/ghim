import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const supabaseBinary =
  process.platform === "win32"
    ? "node_modules/.bin/supabase.cmd"
    : "node_modules/.bin/supabase";

const result = spawnSync(
  supabaseBinary,
  ["gen", "types", "--local", "--schema", "public"],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

// postgres-meta v0.99 changed only the parenthesization of these generated
// helper constraints. Normalizing it keeps checked-in types deterministic when
// a developer still has the previous image cached under the same local tag.
const normalizedTypes = result.stdout
  .replace(
    /^(\s{2}(?:TableName|EnumName|CompositeTypeName) extends) \(/gm,
    "$1 ",
  )
  .replace(/^(\s{4}: never)\) = never,$/gm, "$1 = never,");

if (/^\s{2}(?:TableName|EnumName|CompositeTypeName) extends \(/m.test(normalizedTypes)) {
  throw new Error("Unsupported postgres-meta helper constraint formatting");
}

writeFileSync("packages/data/src/database.types.ts", normalizedTypes);
