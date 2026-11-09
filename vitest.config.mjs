import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The extension side runs against a small fake of the vscode module.
  resolve: { alias: { vscode: fileURLToPath(new URL("./test/fakes/vscode.ts", import.meta.url)) } },
  test: { include: ["test/unit/**/*.test.ts"] },
});
