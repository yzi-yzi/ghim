export type { Database, Json } from "./database.types.js";

import type { Database } from "./database.types.js";

export type TableName = keyof Database["public"]["Tables"];
export type TableRow<Name extends TableName> =
  Database["public"]["Tables"][Name]["Row"];
export type TableInsert<Name extends TableName> =
  Database["public"]["Tables"][Name]["Insert"];
export type TableUpdate<Name extends TableName> =
  Database["public"]["Tables"][Name]["Update"];
