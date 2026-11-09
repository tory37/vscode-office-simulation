# Office Simulation

A living pixel office in your VS Code sidebar. Your guy works at his two-monitor station while critters scurry past,
things fly overhead, people from other departments drop in, a band sets up, and the sun goes down by your real clock.
Other extensions hook in to give their work a worker of its own: [Overseer](https://github.com/tory37/djaunt-overseer)
puts a guy at a desk for every Claude session.

**See it live, and how it all works: https://tory37.github.io/vscode-office-simulation/**

## Install

Download the `.vsix` from the [latest release](https://github.com/tory37/vscode-office-simulation/releases/latest), then:

```bash
code --install-extension office-simulation-<version>.vsix --force
```

The Office shows up in its own activity bar container.

## Features

- 13 scenes: office, server room, forest, field, riverbed, cave, moon, beach, snowfield, desert, reef, library, and rooftop.
- Workers for anything another extension sends in: busy types, idle wanders and chats, asleep naps at his desk. Desks
  are carried in and built by a maintenance crew.
- Your guy, who acts out ERROR, HACK, and DEFENSE scene events with his monitors.
- Visitors with personalities, and shows: a guitarist, a band, lunch, a snack cart, a comedian, a magician, and a DJ.
- Critters, fliers, the real sun and moon, and 36 races.
- Chatter styles (bubbles, tidy, a chat log, or quiet) and see-through bubbles.

Every setting is listed on the [site](https://tory37.github.io/vscode-office-simulation/#settings).

## Contributing

The site in `docs/` is the documentation, and every room on it runs the real code. **A pull request to `main` that
changes behavior, a hook, a setting, a command, a scene, a show, or a look must update `docs/index.html` in the same
PR**, with a live example where one fits. Run `npm run site` and commit `docs/officeView.js` and `docs/siteData.js`
too. CI checks both; a pure refactor can carry the `no-docs-needed` label instead.

```bash
npm install
npm test
npm run typecheck
npm run site
```

`CLAUDE.md` maps the code.
