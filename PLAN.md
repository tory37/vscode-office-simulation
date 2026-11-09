# Plan

The Office started inside Overseer. This repo makes it its own extension that anyone can install, with hooks other
extensions use, and Overseer becomes one of those extensions. For an Overseer user nothing changes visually or in how
it behaves. Each phase ends with tests green, the site updated, and a push.

- [x] **0. Scaffold.** History of the Office files carried over from Overseer. Build, typecheck, tests, the site with
  live examples, the PR template, and CI (tests, site bundle up to date, docs updated in every PR).
- [x] **1. Standalone.** The Office view in its own container with just your guy; `officeSim.*` settings; Switch
  Scene, Play Show, Chatter, and Play Event commands; a scene event schedule for when no host plays them. Checked in
  the Extension Development Host.
- [x] **2. API and hooks.** `activate()` returns a versioned API: `setAgents`, `setMainGuy`, `playEvent`, `setTint`,
  `playShow`, `sendVisitor`, `say`, `lookFromSeed`, race helpers, `portraitSvg`, `attachView` (`editLook` comes with the
  character maker); events `onDidClickAgent`,
  `onDidStartShow`, `onDidEndShow`, `onDidFinishEvent`, `onDidOpenView` (`onDidChangeYourLook` comes with the character maker). A types-only `.d.ts` for
  hosts. Contract tests. A live example of each on the site.
- [x] **3. Character maker.** An overlay on the Office with a live preview: race, skin, hair style and color, eyes,
  beard, shirt, pants, shoes, sleeveless, bare feet, accessory and color; randomize, cancel, save. Opens on first run,
  from Customize Your Guy, and through `editLook`. On the site too.
- [ ] **4. Overseer on the API.** Overseer drops its Office code and soft-depends on this extension: pinned sessions
  through `setAgents`, its director through `playEvent`, Core's tint through `setTint`, clicks open the session,
  portraits through `portraitSvg`, and its sidebar draws the Office through `attachView`. Customize Guy on a session's
  row stores a full look per session (re-roll and reset clear it). `overseer.office.*` settings copy to `officeSim.*`
  once. Offers to install the Office when it's missing.
- [ ] **5. Claude Code hooks bridge.** Opt-in Connect and Disconnect commands add and remove hooks in
  `~/.claude/settings.json`. A silent script appends events to a file the extension watches: a prompt makes your guy
  work, stop makes him idle, a notification makes him wave, a failed tool sets off a small ERROR. Later: a worker per
  Claude session in the workspace.
- [x] **Site simulator.** One full-size room on the site with a control for every setting and every hook.
- [ ] **6. Release.** A `.vsix` for both extensions, READMEs, install steps, the site finished.

## Decisions

- Soft dependency: Overseer works without the Office and hooks in when it's installed. A hard
  `extensionDependencies` would need the Office on the Marketplace.
- A saved look per agent replaces its seed; re-roll throws it away.
- Settings prefix `officeSim.`; extension id `djaunt.office-simulation`.
- If `attachView` can't draw inside another extension's view cleanly, Overseer adds this extension's view to its
  sidebar instead.
