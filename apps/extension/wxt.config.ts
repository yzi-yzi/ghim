import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    description:
      "Ghim từ vựng tiếng Anh bạn gặp trong lúc đọc để học lại đúng lúc.",
    name: "Ghim",
    permissions: [],
  },
  modules: ["@wxt-dev/module-react"],
  targetBrowsers: ["chrome", "edge"],
  zip: {
    artifactTemplate: "ghim-extension-{{packageVersion}}-{{browser}}.zip",
  },
});
