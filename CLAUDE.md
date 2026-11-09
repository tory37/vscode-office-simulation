# CLAUDE.md

VS Code extension: a living pixel office in a sidebar view. Your guy works at his station; critters, fliers, visitors,
shows, and day and night run on their own. Other extensions (Overseer first) hook in through the API `activate()`
returns to add workers, play scene events, and more. Without any of them it runs with just your guy.

## Commands

```bash
npm test            # vitest unit tests (test/unit)
npm run typecheck   # tsc --noEmit, plus the webview with DOM types
npm run build       # esbuild bundles to dist/extension.js and dist/officeView.js
npm run site        # build, then copy the bundle and site data into docs/
npm run package     # build + .vsix
```

F5 opens the Extension Development Host. To see the site, serve `docs/` with any static server.

## The site is the documentation

`docs/index.html` (GitHub Pages, from `main` `/docs`) explains how everything works and has a live example of
everything, running the real bundle. **A PR to `main` that changes behavior, a hook, a setting, a command, a scene, a
show, or a look must update `docs/index.html` in the same PR**, with a live example where one fits, and commit what
`npm run site` writes (`docs/officeView.js`, `docs/siteData.js`). CI fails a PR that changes `src/` or `package.json`
without touching `docs/index.html` (the `no-docs-needed` label skips it for pure refactors), and fails when the
committed site bundle doesn't match the source.

- `docs/office.html`: one live Office, the webview's markup with a stand-in for `acquireVsCodeApi`.
- `docs/site.js`: `OfficeDemo`, which embeds one, runs it only while it's near the screen, and drives it with the same
  messages the extension sends.
- `docs/siteData.js`: generated from `src/site/data.ts` and `package.json` (lists, settings, commands). Add a list
  there instead of copying it into the page.

## Layout

| File | Job |
| --- | --- |
| `extension.ts` | Activate: the view provider and commands. |
| `officePanel.ts` | The Office view: sends the webview the `officeSim.*` settings, your look, and the agents set through `setAgents`; fires `onDidClickAgent` when a guy is clicked. Switch Scene, Play Show, and Chatter (style, bubble look, talk frequency) commands. |
| `site/data.ts` | The lists the docs site shows, bundled into `docs/siteData.js` by `scripts/site.mjs`. |
| `sceneEventSchedule.ts` | Pure: the scene event kinds, lengths and beats, the HACK phrase pairs, the DEFENSE scripts, the ERROR lines, and the variant pick. Overseer keeps its own copy for its views and its director. |
| `pixelCanvas.ts` | Pure: the pixel guys' drawing grid, 10 wide and 16 tall with 2 rows of head room above (y = -1, -2) for horns and ears; its palette keys; `shadeHex` and `mixHex`. |
| `pixelRaces.ts` | Pure: the 36 races (human first). Each has skins, hair, eyes, three mark colors, accessories it blocks, a size (short or big), and a `draw` that adds its features over the plain guy, or redraws his lower body (centaur, naga, merfolk, satyr, ghost, slime). A picked race rides in the seed after `#race=`. |
| `pixelGuy.ts` | Pure: an agent's pixel guy. A seed picks skin, hair, clothes, and an accessory; its own hash stream picks the race, every race equally likely, so clothes don't change with it. `officeSim.races` off makes everyone human. Visitors' ties are drawn in the sprite. Draws outlined 12x18 frames per pose and facing, and the 16x16 portrait SVG with a state badge. Your own guy's default look and the `officeSim.yourLook` reader; the ponytail and full beard are his alone. |
| `officeLayout.ts` | Pure: the Office floor plan for a size in tiles (back wall and door, desk spots in pairs with seats below, props along the bottom) per scene, which scenes are outdoors (`OUTDOOR_SCENES`), and BFS paths that don't cut across seats. The sim turns the desk spots to floor until a desk is brought in. `desksNeeded` is 10, or the agents plus 2; `officeShape` picks pairs per row and desk rows for the biggest zoom in the view. With you in, the desk pair nearest the room's middle joins into your station (rows keep an odd number of pairs so it centers). |
| `officeCritters.ts` | Pure: the scene's critters. Troupes per scene (five lead kinds each; kinds can repeat across scenes), a run every 10-25s (`critterGap`) along a clear row (`critterLanes`) from off one edge to off the other, bats over the room, an optional stop to look around, the poses each frame, and the lines idle guys say. `officeSim.critters` turns them off. |
| `officeFliers.ts` | Pure: the scene's fliers, apart from the critters. Flights per scene (a lone flier, a V, a line, or a swarm), one every 25-60s (`flierGap`) from off one edge to off the other over the room. Each kind flaps, glides, swoops low, darts like a bug, drifts, or streaks; some keep day or night hours outdoors (`fliersNow`), some glow over the night tint, trail sparks, or cast a floor shadow. Idle guys under them react through `reactToCritter`. `officeSim.fliers` turns them off. |
| `officePhrases.ts` | Pure: what the guys say: chat (quick noises, small talk, and lines that fit the scene), exchanges the other guy answers on his next turn, mutters while typing, musings while idle by what he's doing, your breaks, rushing back, sleeping and waking, the crew, and waiting for a desk. Visitors, events, critters, and fliers keep their own lines. |
| `officeDaylight.ts` | Pure: the sun's elevation from your clock (daylight saving off, equation of time on), the season, and a guessed latitude (40°N, or 35°S when daylight saving falls in January); the moon's real phase and place; and per scene the sky color, stars, and room tint. The office and library follow it a little, the server room and cave not at all; the reef stays a little dim and blue; the moon's day follows its phase. `officeSim.dayNight` turns it off. |
| `officeVisitors.ts` | Pure: the departments that drop by (bosses wear ties), their lines and small talk, how long each stays (none, a minute or two, or up to ten), the gap between visits by the `officeSim.visitors` frequency (off, rare, normal, often, packed), the cap of five at once, and each guy's personality from his seed (suck-up, grumbler, deadpan, snark, eager) with how he answers a boss or anyone else. |
| `officePerformances.ts` | Pure: the shows (guitarist, band, lunch, snack cart, comedian, magician, DJ): roles and their outfits, the effect each one plays (notes, food, spotlight, sparkles, disco), `planPerformance` (titles, lines with crowd cues, closer, length, menu), the crowd's answers by personality, and the `officeSim.performances` frequency and gap. |
| `officeChatter.ts` | Pure: the `officeSim.chatter` styles (tidy, bubbles, log, quiet). Which lines get a full bubble (tidy caps them by room width and keeps a shown bubble until its line ends; must lines and the hovered guy always get one), the rest as "..." pips; the `officeSim.bubbleLook` (solid, soft: a 70% background, faint: 6px text on 50%; solid on hover); when the chat log shows (log always, tidy only with free space above the room, where its overflow goes; a logged line stays a pip); the log's lines and fade; a bubble's fade. The `officeSim.talk` frequency and its `talkFactor`, which `officeSim` reads from `state.talk` to scale chats, mutters, and musings. |
| `officeYou.ts` | Pure: your guy's pose, bubble, main monitor screen, and shake for each moment of an ERROR, HACK, or DEFENSE event (the beats in `sceneEventSchedule`), his idle loop between events, and the room's one-word reactions. |
| `deskStyles.ts` | Pure: the desk styles (colors and a decor: crates, candle, glow strip, coral, gold) and the map from race to style. |
| `officeSim.ts` | Pure: the Office's guys. Desks: `placed` holds the standing desks (index to the seed they came in for); spots are floor until then. When an agent's desk is missing or a desk has no agent, `manageCrew` sends in two maintenance guys (`crew`): fetch at the door, carry it to the spot (the partner carries the chair or stands by), build, walk out; or take it apart and haul it out. A guy with no desk yet waits below its spot (`waitDesk`). Seated agents on open and a relayout get their desks at once. Busy types at his desk; idle sits back, then goes to a prop, the couch, a walk, or a chat with another idle guy; busy again runs back. Asleep sleeps at his desk. An agent that goes away walks out the door. Overflow works from the couch. You're an agent too (`syncYou`): you take breaks from your station to wander, chat, or visit a busy guy's desk, and `callYouBack` runs you back for a scene event. `reactToCritter` has idle guys near a passing critter stop, face it, and say a line. `visitorArrives` walks a visitor (not an agent: no desk, not counted, skipped by `syncOffice`) to the middle of the room to say his lines, then out, or he stays a while as an idle guy (chats, props, the couch, looming at a busy guy's desk) making small talk the guys answer in character, then says bye; his `remarks` count tells the view when the room should answer. `lookToward` turns idle guys to him. `startShow` walks a show's performers (not agents) to a stage picked for the most open floor in front, then gathers the idle and asleep guys (and you on a break) into a crowd facing it; the lead says the script's lines, cues make the crowd answer and cheer, food shows hand out snacks; after the closer and bows `endShow` sends everyone back. A relayout keeps the show if its stage is still open floor. |
| `officeView/` | The Office webview's own bundle (`dist/officeView.js`, `tsconfig.webview.json` for DOM types): sizes the room from `officeShape` at a whole-device-pixel zoom, draws it and the sprites back to front, runs `officeSim` each frame, pauses while hidden. The room sits flush with the bottom of the view. Your second monitor's graph follows the tint messages (Overseer sends its Core view's bursts), in the spectrum order Overseer's views share. `luckyCat.ts` draws the waving lucky cat clock on the back wall; `scenery.ts` the beach, snowfield, desert, reef, library, and rooftop scenes' back rows, ground, props, prop light, snow and bubbles, and the city's lit windows; `shows.ts` the shows' gear, set pieces, food, spotlight, mirror ball, and particles; `critters.ts` holds the critter sprites; `fliers.ts` the flier sprites, shadows, and trails. A light map multiplies the room by `officeDaylight`'s tint, keeps open sky bright, and adds pools around screens, lamps, and fires; bubbles draw after it, lifted out of each other's way, as many as the chatter style shows (`officeChatter`); the rest are "..." pips. The chat log uses the free space above the room (the log style makes a strip if there is none), drawn in screen pixels in the editor font with each speaker's face. Sends visitors in on the frequency setting and has the room answer them (everyone for arrival lines, guys within 4 tiles for small talk). Puts on shows on their frequency setting, and at once on a `performance` message. |

## Rules

- No runtime dependencies. Node built-ins and the `vscode` API only.
- Dev dependencies are pinned to exact versions released at least 7 days ago. Check with `npm view <pkg> time`.
- Keep logic that can be pure in pure modules and test it there. `vscode` can't be imported in unit tests, and the
  webview's modules can't touch the DOM outside `officeView/`.
- The API is public: never break it in a minor release. Add, don't change; bump `apiVersion` for anything else.
- Never print to stdout from a Claude Code hook script: some hooks add their output to the agent's context.
- New commands need an entry in `contributes.commands` and, if they only make sense in the view, a `view/title` or
  `commandPalette` `when`.
