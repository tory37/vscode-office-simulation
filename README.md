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
- Workers for anything another extension sends in: busy types; idle and asleep (suspended) wander, chat, play, and
  now and then nap at the desk. Desks are carried in and built by a maintenance crew.
- 24 activities the crew carries onto empty desk spots and swaps out now and then: pinball, arcade cabinets, a claw
  machine, ping pong, foosball, air hockey, chess, a punching bag, a treadmill, yoga mats, a trampoline, VR, and more.
  Idle guys play alone, take turns with a buddy, or face off two at a time.
- Your guy, who acts out ERROR, HACK, and DEFENSE scene events with his monitors.
- Visitors with personalities, and shows: a guitarist, a band, lunch, a snack cart, a comedian, a magician, and a DJ.
- Invasions now and then: aliens, zombies, raiders, vampires, robots, ghosts, werewolves, slimes, mummies, or demons
  trash the place. Everyone runs, hides, and gets knocked down (cartoon stars, no gore), then they come to one by one,
  say how weird that was, and sweep up.
- Group gatherings: the desks slide to the sides and everyone who isn't busy joins a yoga class, a fire safety lesson,
  a card duel, a dance circle, a birthday party, an all-hands, a trivia quiz, karaoke, campfire stories, or trust falls.
- Critters, fliers, the real sun and moon, and 36 races.
- Chatter styles (bubbles, tidy, a chat log, or quiet) and see-through bubbles.

Every setting is listed on the [site](https://tory37.github.io/vscode-office-simulation/#settings).

## Claude Code

**Office: Connect Claude Code…** adds a few hooks to `~/.claude/settings.json` (after you confirm, with a backup) so
the Office follows Claude itself: your guy works while Claude does, and each session in this window's folders gets a
worker. The hooks only append Claude's hook input to a file and print nothing. **Office: Disconnect Claude Code**
takes out exactly those.

## Hook into it

`activate()` returns an API: send workers in with `setAgents`, drive your guy with `setMainGuy`, play scene events,
shows, invasions, gatherings, visitors, and lines, draw portraits, host the Office in your own view, and hear clicks, shows,
invasions, gatherings, and events.
Copy [`api/officeSimulationApi.d.ts`](api/officeSimulationApi.d.ts) for the types. The
[site](https://tory37.github.io/vscode-office-simulation/#hooks) has a live playground and the full reference.

## Contributing

The site in `docs/` is the documentation, and every room on it runs the real code. **A pull request to `main` that
changes behavior, a hook, a setting, a command, a scene, a show, or a look must update `docs/index.html` in the same
PR**, with a live example where one fits. Run `npm run site` and commit `docs/officeView.js`, `docs/siteData.js`, and
`api/` too. CI checks both; a pure refactor can carry the `no-docs-needed` label instead.

```bash
npm install
npm test
npm run typecheck
npm run site
```

`CLAUDE.md` maps the code.

## License

[MIT](LICENSE).
