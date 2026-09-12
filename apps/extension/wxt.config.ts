import { defineConfig } from "wxt";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const workspaceEnvironment = resolve(process.cwd(), "../../.env.local");
if (existsSync(workspaceEnvironment)) process.loadEnvFile(workspaceEnvironment);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const hostPermissions = [supabaseUrl, appUrl]
  .filter((value): value is string => Boolean(value))
  .map((value) => `${new URL(value).origin}/*`);

export default defineConfig({
  manifest: {
    description:
      "Ghim từ vựng tiếng Anh bạn gặp trong lúc đọc để học lại đúng lúc.",
    host_permissions: hostPermissions,
    name: "Ghim",
    permissions: ["identity", "storage"],
  },
  modules: ["@wxt-dev/module-react"],
  targetBrowsers: ["chrome", "edge"],
  vite: () => ({
    define: {
      "import.meta.env.WXT_PUBLIC_GHIM_API_URL": JSON.stringify(appUrl),
      "import.meta.env.WXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      ),
      "import.meta.env.WXT_PUBLIC_SUPABASE_URL": JSON.stringify(supabaseUrl ?? ""),
    },
  }),
  zip: {
    artifactTemplate: "ghim-extension-{{packageVersion}}-{{browser}}.zip",
  },
});
