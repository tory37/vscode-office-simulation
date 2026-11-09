import * as esbuild from "esbuild";

const isWatchMode = process.argv.includes("--watch");

// The extension host side: the view, commands, settings, and the API other extensions call.
const extensionOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node22",
  sourcemap: true,
};

// The Office itself runs in the webview (and on the site), so it is its own browser bundle.
const officeViewOptions = {
  entryPoints: ["src/officeView/main.ts"],
  bundle: true,
  outfile: "dist/officeView.js",
  format: "iife",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
};

if (isWatchMode) {
  for (const options of [extensionOptions, officeViewOptions]) {
    const context = await esbuild.context(options);
    await context.watch();
  }
} else {
  await Promise.all([esbuild.build(extensionOptions), esbuild.build(officeViewOptions)]);
}
