// Pure: the Office view's floor plan for a size in tiles, and paths across it. Row 0 is the back wall with the door
// at its left end. Desk blocks repeat down the room: a row of desks in pairs, the seats below them, then an aisle.
// The bottom row holds the props (cooler, coffee, couch, plants), each with a tile to stand on above it.

export type OfficeSceneId =
  | "office" | "serverRoom" | "forest" | "field" | "riverbed" | "cave" | "moon"
  | "beach" | "snowfield" | "desert" | "reef" | "library" | "rooftop";

export const OFFICE_SCENES: readonly { id: OfficeSceneId; label: string }[] = [
  { id: "office", label: "Office" },
  { id: "serverRoom", label: "Server Room" },
  { id: "forest", label: "Forest" },
  { id: "field", label: "Field" },
  { id: "riverbed", label: "Riverbed" },
  { id: "cave", label: "Cave" },
  { id: "moon", label: "Moon" },
  { id: "beach", label: "Beach" },
  { id: "snowfield", label: "Snowfield" },
  { id: "desert", label: "Desert" },
  { id: "reef", label: "Reef" },
  { id: "library", label: "Library" },
  { id: "rooftop", label: "Rooftop" },
];

// Scenes under the open sky, where some fliers keep day or night hours. The reef follows the sky's light but has no
// hours under the water.
export const OUTDOOR_SCENES: ReadonlySet<OfficeSceneId> = new Set<OfficeSceneId>([
  "forest", "field", "riverbed", "moon", "beach", "snowfield", "desert", "rooftop",
]);

export function officeSceneId(value: unknown): OfficeSceneId {
  return OFFICE_SCENES.some((scene) => scene.id === value) ? (value as OfficeSceneId) : "office";
}

// gear: an activity the crew brought in (a pinball machine, a ping pong table), standing on a desk spot.
export type TileKind = "floor" | "wall" | "door" | "desk" | "seat" | "prop" | "couch" | "gear";

export type PropKind =
  | "plant" | "cooler" | "coffee" | "couch" | "shelf" | "rack" | "vending"
  | "pine" | "campfire" | "stump" | "mushroom"
  | "hay" | "well" | "flowers" | "scarecrow"
  | "reeds" | "spring" | "boulder"
  | "stalagmite" | "crystal"
  | "moonRock" | "oxygen" | "dish" | "flag"
  | "palm" | "tiki" | "umbrella" | "sandcastle"
  | "snowPine" | "cocoa" | "snowman" | "igloo"
  | "cactus" | "oasis" | "skull" | "urn"
  | "kelp" | "vent" | "coral" | "chest"
  | "cauldron" | "globe" | "candelabra"
  | "ac" | "grill" | "antenna";

// Props a guy drinks from. Every scene has one, and the layout never skips them.
export const DRINK_PROPS: ReadonlySet<PropKind> = new Set<PropKind>([
  "cooler", "coffee", "vending", "campfire", "well", "spring", "oxygen", "tiki", "cocoa", "oasis", "vent", "cauldron",
]);

export interface Point {
  x: number;
  y: number;
}

export interface Desk {
  // The desk tile; the seat is the tile below it.
  desk: Point;
  seat: Point;
}

// Two tiles wide: desk is the left desk tile and seat the left seat tile; you sit centered between the two seats.
export interface Station {
  desk: Point;
  seat: Point;
}

export const STATION_DESKS = 2;

export interface Prop {
  kind: PropKind;
  at: Point;
  // Where a guy stands to use it. Undefined for a couch, which you sit on.
  stand: Point | undefined;
}

export interface OfficeLayout {
  cols: number;
  rows: number;
  tiles: TileKind[][];
  door: Point;
  desks: Desk[];
  // Your own station: a desk pair in the middle of the room, joined into one. Sessions never get it. Undefined when
  // you're not in the room.
  station: Station | undefined;
  props: Prop[];
  couchSeats: Point[];
  // The scene it was built for, which sets what the guys chat about.
  scene?: OfficeSceneId;
}

export const MIN_COLS = 8;
export const MIN_ROWS = 6;

const WALKABLE: ReadonlySet<TileKind> = new Set<TileKind>(["floor", "door", "seat", "couch"]);

// Bottom-row props from left to right, repeated to fill the row. Plants and racks pad the corners.
const SCENE_PROPS: Record<OfficeSceneId, { corner: PropKind; middle: PropKind[] }> = {
  office: { corner: "plant", middle: ["cooler", "coffee", "couch", "shelf", "plant"] },
  serverRoom: { corner: "rack", middle: ["vending", "cooler", "couch", "rack", "rack"] },
  forest: { corner: "pine", middle: ["campfire", "stump", "couch", "mushroom", "pine"] },
  field: { corner: "hay", middle: ["well", "flowers", "couch", "scarecrow", "flowers"] },
  riverbed: { corner: "reeds", middle: ["spring", "boulder", "couch", "reeds", "boulder"] },
  cave: { corner: "stalagmite", middle: ["campfire", "crystal", "couch", "mushroom", "stalagmite"] },
  moon: { corner: "moonRock", middle: ["oxygen", "dish", "couch", "flag", "moonRock"] },
  beach: { corner: "palm", middle: ["tiki", "umbrella", "couch", "sandcastle", "palm"] },
  snowfield: { corner: "snowPine", middle: ["cocoa", "snowman", "couch", "igloo", "snowPine"] },
  desert: { corner: "cactus", middle: ["oasis", "skull", "couch", "urn", "cactus"] },
  reef: { corner: "kelp", middle: ["vent", "coral", "couch", "chest", "kelp"] },
  library: { corner: "shelf", middle: ["cauldron", "globe", "couch", "candelabra", "shelf"] },
  rooftop: { corner: "ac", middle: ["cooler", "grill", "couch", "antenna", "plant"] },
};

export function buildOfficeLayout(requestedCols: number, requestedRows: number, sceneId: OfficeSceneId, withStation = false): OfficeLayout {
  const cols = Math.max(MIN_COLS, Math.floor(requestedCols));
  const rows = Math.max(MIN_ROWS, Math.floor(requestedRows));
  const tiles: TileKind[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (): TileKind => (y === 0 ? "wall" : "floor")),
  );
  const door = { x: 0, y: 0 };
  tiles[door.y][door.x] = "door";

  const desks: Desk[] = [];
  // Whole desk pairs with a gap column between them, centered in the room, so any size works: the columns and rows
  // left over are open floor around the desks. Column 0 and the last column always stay open as corridors. With
  // your station in, the pairs per row stay odd so it sits dead center.
  const grid = deskGrid(cols, rows, withStation);
  for (let block = 0; block < grid.deskRows; block++) {
    const deskRow = grid.top + block * 3;
    for (let pair = 0; pair < grid.pairs; pair++) {
      for (const x of [grid.left + pair * 3, grid.left + pair * 3 + 1]) {
        tiles[deskRow][x] = "desk";
        tiles[deskRow + 1][x] = "seat";
        desks.push({ desk: { x, y: deskRow }, seat: { x, y: deskRow + 1 } });
      }
    }
  }

  const station = withStation ? middleStation(desks, rows) : undefined;

  const props: Prop[] = [];
  const couchSeats: Point[] = [];
  const propRow = rows - 1;
  const { corner, middle } = SCENE_PROPS[sceneId];
  let middleIndex = 0;
  for (let x = 0; x < cols; x++) {
    const isCorner = x === 0 || x === cols - 1;
    let kind = isCorner ? corner : middle[middleIndex++ % middle.length];
    if (kind === "couch") {
      if (x + 1 >= cols - 1) {
        kind = corner;
      } else {
        tiles[propRow][x] = "couch";
        tiles[propRow][x + 1] = "couch";
        couchSeats.push({ x, y: propRow }, { x: x + 1, y: propRow });
        props.push({ kind: "couch", at: { x, y: propRow }, stand: undefined });
        x++;
        continue;
      }
    }
    // Leave every other middle tile open so the row doesn't read as a wall of stuff.
    if (!isCorner && x % 2 === 0 && !DRINK_PROPS.has(kind)) {
      continue;
    }
    tiles[propRow][x] = "prop";
    props.push({ kind, at: { x, y: propRow }, stand: { x, y: propRow - 1 } });
  }

  return { cols, rows, tiles, door, desks, station, props, couchSeats, scene: sceneId };
}

// Where the desk pairs go in a room this size: how many pairs per row and desk rows, and the first desk tile's column
// and row. A row of p pairs takes 3p + 1 columns with the corridors; d desk rows take 3d + 2 rows with the wall and
// the props. What's left over is split around them, the odd one to the left and above.
export function deskGrid(cols: number, rows: number, withStation = false): { pairs: number; deskRows: number; left: number; top: number } {
  let pairs = Math.max(0, Math.floor((cols - 1) / 3));
  if (withStation && pairs > 1 && pairs % 2 === 0) {
    pairs--;
  }
  const deskRows = Math.max(0, Math.floor((rows - 2) / 3));
  const left = 1 + Math.ceil((cols - (pairs * 3 + 1)) / 2);
  const top = 1 + Math.ceil((rows - (deskRows * 3 + 2)) / 2);
  return { pairs, deskRows, left, top };
}

// Takes the desk pair nearest the middle of the room out of the desks, for your station: the desk row whose desk and
// seat straddle the room's middle best (the lower one on a tie), and the middle pair (left of center on a tie).
function middleStation(desks: Desk[], rows: number): Station | undefined {
  const deskRows = [...new Set(desks.map((desk) => desk.desk.y))];
  if (deskRows.length === 0) {
    return undefined;
  }
  const offCenter = (y: number) => Math.abs(y + 1 - rows / 2);
  const row = deskRows.reduce((best, y) => (offCenter(y) <= offCenter(best) ? y : best));
  const inRow = desks.filter((desk) => desk.desk.y === row);
  const pairs = inRow.filter((desk, index) => index % 2 === 0 && inRow[index + 1]?.desk.x === desk.desk.x + 1);
  const left = pairs[Math.floor((pairs.length - 1) / 2)];
  if (left === undefined) {
    return undefined;
  }
  const leftIndex = desks.indexOf(left);
  desks.splice(leftIndex, STATION_DESKS);
  return { desk: left.desk, seat: left.seat };
}

export const MIN_DESKS = 10;
// Empty desks kept beyond the sessions, so a new session has a seat without the room changing shape.
const SPARE_DESKS = 2;
const MIN_PAIRS_PER_ROW = 3;
const MAX_PAIRS_PER_ROW = 12;

export interface OfficeShape {
  cols: number;
  rows: number;
  desks: number;
}

// How many desks the room needs: at least MIN_DESKS, and a couple to spare past the sessions.
export function desksNeeded(sessionCount: number): number {
  return Math.max(MIN_DESKS, Math.max(0, Math.floor(sessionCount)) + SPARE_DESKS);
}

// The room size, in tiles, that holds the desks at the biggest zoom the view allows. A row of p desk pairs is 3p + 1
// tiles wide; r desk rows are 3r + 2 tiles tall with the wall and the props. Ties go to fewer empty desks. With
// oddPairs (your station is in), every row has a middle pair, so the station sits dead center.
export function officeShape(deskCount: number, viewWidth: number, viewHeight: number, tileSize: number, oddPairs = false): OfficeShape {
  let best: (OfficeShape & { zoom: number }) | undefined;
  for (let pairs = MIN_PAIRS_PER_ROW; pairs <= MAX_PAIRS_PER_ROW; pairs += oddPairs ? 2 : 1) {
    const deskRows = Math.max(1, Math.ceil(deskCount / (pairs * 2)));
    const cols = pairs * 3 + 1;
    const rows = Math.max(MIN_ROWS, deskRows * 3 + 2);
    const desks = pairs * 2 * deskRows;
    const zoom = Math.min(viewWidth / (cols * tileSize), viewHeight / (rows * tileSize));
    const isBetter = best === undefined || zoom > best.zoom + 1e-9 || (Math.abs(zoom - best.zoom) <= 1e-9 && desks < best.desks);
    if (isBetter) {
      best = { cols, rows, desks, zoom };
    }
  }
  const { cols, rows, desks } = best as OfficeShape;
  return { cols, rows, desks };
}

export function isWalkable(layout: OfficeLayout, point: Point): boolean {
  const kind = layout.tiles[point.y]?.[point.x];
  return kind !== undefined && WALKABLE.has(kind);
}

// Plain floor tiles: where a wandering guy can stop.
export function openFloorTiles(layout: OfficeLayout): Point[] {
  const open: Point[] = [];
  layout.tiles.forEach((row, y) => row.forEach((kind, x) => {
    if (kind === "floor") {
      open.push({ x, y });
    }
  }));
  return open;
}

const STEPS: readonly Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

// Breadth-first, four directions. The path leaves out the start and ends on the goal; undefined when unreachable.
// Seats and couch tiles are walkable only as the start or the goal, so nobody cuts across someone's chair.
export function findPath(layout: OfficeLayout, from: Point, to: Point): Point[] | undefined {
  if (!isWalkable(layout, to)) {
    return undefined;
  }
  if (from.x === to.x && from.y === to.y) {
    return [];
  }
  const key = (point: Point) => point.y * layout.cols + point.x;
  const cameFrom = new Map<number, number>([[key(from), -1]]);
  const queue: Point[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const step of STEPS) {
      const next = { x: current.x + step.x, y: current.y + step.y };
      const nextKey = key(next);
      const isGoal = next.x === to.x && next.y === to.y;
      if (cameFrom.has(nextKey) || !isWalkable(layout, next) || (!isGoal && !isPassable(layout, next))) {
        continue;
      }
      cameFrom.set(nextKey, key(current));
      if (isGoal) {
        return tracePath(cameFrom, nextKey, key(from), layout.cols);
      }
      queue.push(next);
    }
  }
  return undefined;
}

function isPassable(layout: OfficeLayout, point: Point): boolean {
  const kind = layout.tiles[point.y][point.x];
  return kind === "floor" || kind === "door";
}

function tracePath(cameFrom: Map<number, number>, goalKey: number, startKey: number, cols: number): Point[] {
  const path: Point[] = [];
  for (let current = goalKey; current !== startKey; current = cameFrom.get(current) ?? startKey) {
    path.push({ x: current % cols, y: Math.floor(current / cols) });
  }
  return path.reverse();
}

// The walkable tile nearest a point, for a guy who was standing somewhere the new layout filled in.
export function nearestWalkable(layout: OfficeLayout, point: Point): Point {
  const clamped = {
    x: Math.max(0, Math.min(layout.cols - 1, Math.round(point.x))),
    y: Math.max(0, Math.min(layout.rows - 1, Math.round(point.y))),
  };
  if (isPassable(layout, clamped)) {
    return clamped;
  }
  let best = layout.door;
  let bestDistance = Infinity;
  layout.tiles.forEach((row, y) => row.forEach((_, x) => {
    const distance = Math.abs(x - clamped.x) + Math.abs(y - clamped.y);
    if (distance < bestDistance && isPassable(layout, { x, y })) {
      best = { x, y };
      bestDistance = distance;
    }
  }));
  return best;
}

// The floor a group gathering clears: columns left to right and rows top to bottom, all open floor, and the tile in
// its middle where the thing happens.
export interface ClearedArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
  center: Point;
}

// For a group gathering: the same room with the desks pushed out of the way. Each desk row's pairs (and your station)
// slide toward a side, packed edge to edge, only as far as they must, so a strip as wide as want (or as wide as it
// can) opens near the middle, from the wall to the props. Columns 0 and cols - 1 stay open as corridors, and every
// seat still opens onto the aisle below it. Desks keep their index, so whoever's desk it is follows it. Undefined
// when no strip opens.
export function pushDesksAside(layout: OfficeLayout, want = Math.min(8, Math.max(4, Math.round(layout.cols * 0.35)))): { layout: OfficeLayout; area: ClearedArea } | undefined {
  type Unit = { left: number; width: number; desks: number[]; station: boolean };
  const rows = new Map<number, Unit[]>();
  const unitsOf = (y: number) => rows.get(y) ?? (rows.set(y, []), rows.get(y) as Unit[]);
  // Desks side by side in a row are one unit (a pair); the gap column between pairs is what gets taken up.
  const byRow = new Map<number, number[]>();
  layout.desks.forEach((desk, index) => byRow.set(desk.desk.y, [...(byRow.get(desk.desk.y) ?? []), index]));
  for (const [y, indexes] of byRow) {
    const sorted = [...indexes].sort((first, second) => layout.desks[first].desk.x - layout.desks[second].desk.x);
    for (const index of sorted) {
      const units = unitsOf(y);
      const last = units[units.length - 1];
      const x = layout.desks[index].desk.x;
      if (last !== undefined && !last.station && last.left + last.width === x) {
        last.width += 1;
        last.desks.push(index);
      } else {
        units.push({ left: x, width: 1, desks: [index], station: false });
      }
    }
  }
  if (layout.station !== undefined) {
    unitsOf(layout.station.desk.y).push({ left: layout.station.desk.x, width: STATION_DESKS, desks: [], station: true });
  }
  if (rows.size === 0) {
    return undefined;
  }
  for (const units of rows.values()) {
    units.sort((first, second) => first.left - second.left);
  }
  // The widest strip (up to want) every row can open, nearest the room's middle. A row splits its units in two: the
  // left ones pack toward column 1, the rest toward cols - 2, each sliding only as far as it must.
  const plan = (left: number, right: number) => {
    const moves: { unit: Unit; to: number }[] = [];
    const middle = (left + right) / 2;
    for (const units of rows.values()) {
      let best: { unit: Unit; to: number }[] | undefined;
      let bestCost = Infinity;
      for (let split = 0; split <= units.length; split++) {
        const rowMoves: { unit: Unit; to: number }[] = [];
        let edge = left - 1;
        let fits = true;
        for (const unit of units.slice(0, split).reverse()) {
          const to = Math.min(unit.left, edge - unit.width + 1);
          fits &&= to >= 1;
          rowMoves.push({ unit, to });
          edge = to - 1;
        }
        edge = right + 1;
        for (const unit of units.slice(split)) {
          const to = Math.max(unit.left, edge);
          fits &&= to + unit.width - 1 <= layout.cols - 2;
          rowMoves.push({ unit, to });
          edge = to + unit.width;
        }
        // Fewest tiles slid, and a unit stays on the side of the strip it was on.
        const cost = rowMoves.reduce((sum, { unit, to }) => sum + Math.abs(to - unit.left) * unit.width, 0) +
          units.reduce((sum, unit, index) => sum + ((index < split) !== (unit.left + unit.width / 2 <= middle + 0.5) ? 0.5 : 0), 0);
        if (fits && cost < bestCost) {
          best = rowMoves;
          bestCost = cost;
        }
      }
      if (best === undefined) {
        return undefined;
      }
      moves.push(...best);
    }
    return { left, right, moves };
  };
  let chosen: ReturnType<typeof plan>;
  for (let width = Math.min(want, layout.cols - 2); width >= 1 && chosen === undefined; width--) {
    // Nearest the middle first.
    const starts = Array.from({ length: layout.cols - 1 - width }, (_, index) => index + 1)
      .sort((first, second) => Math.abs(first + (width - 1) / 2 - (layout.cols - 1) / 2) - Math.abs(second + (width - 1) / 2 - (layout.cols - 1) / 2));
    for (const left of starts) {
      chosen = plan(left, left + width - 1);
      if (chosen !== undefined) {
        break;
      }
    }
  }
  if (chosen === undefined) {
    return undefined;
  }
  const tiles = layout.tiles.map((row) => [...row]);
  const deskRows = [...rows.keys()];
  for (const y of deskRows) {
    for (let x = 1; x < layout.cols - 1; x++) {
      tiles[y][x] = "floor";
      tiles[y + 1][x] = "floor";
    }
  }
  const desks = layout.desks.map((desk) => ({ desk: { ...desk.desk }, seat: { ...desk.seat } }));
  let station = layout.station === undefined ? undefined : { desk: { ...layout.station.desk }, seat: { ...layout.station.seat } };
  for (const { unit, to } of chosen.moves) {
    const y = unit.station ? (station as Station).desk.y : layout.desks[unit.desks[0]].desk.y;
    for (let offset = 0; offset < unit.width; offset++) {
      tiles[y][to + offset] = "desk";
      tiles[y + 1][to + offset] = "seat";
    }
    if (unit.station && station !== undefined) {
      station = { desk: { x: to, y }, seat: { x: to, y: y + 1 } };
    }
    unit.desks.forEach((index, offset) => {
      desks[index] = { desk: { x: to + offset, y }, seat: { x: to + offset, y: y + 1 } };
    });
  }
  const top = 1;
  const bottom = layout.rows - 2;
  const center = { x: Math.floor((chosen.left + chosen.right) / 2), y: Math.round((top + bottom) / 2) };
  return {
    layout: { ...layout, tiles, desks, station, props: layout.props, couchSeats: layout.couchSeats },
    area: { left: chosen.left, right: chosen.right, top, bottom, center },
  };
}
