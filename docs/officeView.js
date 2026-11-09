"use strict";
(() => {
  // src/officeLayout.ts
  var OFFICE_SCENES = [
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
    { id: "rooftop", label: "Rooftop" }
  ];
  var OUTDOOR_SCENES = /* @__PURE__ */ new Set([
    "forest",
    "field",
    "riverbed",
    "moon",
    "beach",
    "snowfield",
    "desert",
    "rooftop"
  ]);
  function officeSceneId(value) {
    return OFFICE_SCENES.some((scene) => scene.id === value) ? value : "office";
  }
  var DRINK_PROPS = /* @__PURE__ */ new Set([
    "cooler",
    "coffee",
    "vending",
    "campfire",
    "well",
    "spring",
    "oxygen",
    "tiki",
    "cocoa",
    "oasis",
    "vent",
    "cauldron"
  ]);
  var STATION_DESKS = 2;
  var MIN_COLS = 8;
  var MIN_ROWS = 6;
  var WALKABLE = /* @__PURE__ */ new Set(["floor", "door", "seat", "couch"]);
  var SCENE_PROPS = {
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
    rooftop: { corner: "ac", middle: ["cooler", "grill", "couch", "antenna", "plant"] }
  };
  function buildOfficeLayout(requestedCols, requestedRows, sceneId2, withStation = false) {
    const cols = Math.max(MIN_COLS, Math.floor(requestedCols));
    const rows = Math.max(MIN_ROWS, Math.floor(requestedRows));
    const tiles = Array.from(
      { length: rows },
      (_, y) => Array.from({ length: cols }, () => y === 0 ? "wall" : "floor")
    );
    const door = { x: 0, y: 0 };
    tiles[door.y][door.x] = "door";
    const desks = [];
    for (let deskRow = 1; deskRow + 2 <= rows - 2; deskRow += 3) {
      for (let x = 1; x <= cols - 2; x++) {
        if ((x - 1) % 3 === 2) {
          continue;
        }
        tiles[deskRow][x] = "desk";
        tiles[deskRow + 1][x] = "seat";
        desks.push({ desk: { x, y: deskRow }, seat: { x, y: deskRow + 1 } });
      }
    }
    const station = withStation ? middleStation(desks, rows) : void 0;
    const props = [];
    const couchSeats = [];
    const propRow = rows - 1;
    const { corner, middle } = SCENE_PROPS[sceneId2];
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
          props.push({ kind: "couch", at: { x, y: propRow }, stand: void 0 });
          x++;
          continue;
        }
      }
      if (!isCorner && x % 2 === 0 && !DRINK_PROPS.has(kind)) {
        continue;
      }
      tiles[propRow][x] = "prop";
      props.push({ kind, at: { x, y: propRow }, stand: { x, y: propRow - 1 } });
    }
    return { cols, rows, tiles, door, desks, station, props, couchSeats, scene: sceneId2 };
  }
  function middleStation(desks, rows) {
    const deskRows = [...new Set(desks.map((desk) => desk.desk.y))];
    if (deskRows.length === 0) {
      return void 0;
    }
    const offCenter = (y) => Math.abs(y + 1 - rows / 2);
    const row = deskRows.reduce((best, y) => offCenter(y) <= offCenter(best) ? y : best);
    const inRow = desks.filter((desk) => desk.desk.y === row);
    const pairs = inRow.filter((desk, index) => index % 2 === 0 && inRow[index + 1]?.desk.x === desk.desk.x + 1);
    const left = pairs[Math.floor((pairs.length - 1) / 2)];
    if (left === void 0) {
      return void 0;
    }
    const leftIndex = desks.indexOf(left);
    desks.splice(leftIndex, STATION_DESKS);
    return { desk: left.desk, seat: left.seat };
  }
  var MIN_DESKS = 10;
  var SPARE_DESKS = 2;
  var MIN_PAIRS_PER_ROW = 3;
  var MAX_PAIRS_PER_ROW = 12;
  function desksNeeded(sessionCount) {
    return Math.max(MIN_DESKS, Math.max(0, Math.floor(sessionCount)) + SPARE_DESKS);
  }
  function officeShape(deskCount, viewWidth, viewHeight, tileSize, oddPairs = false) {
    let best;
    for (let pairs = MIN_PAIRS_PER_ROW; pairs <= MAX_PAIRS_PER_ROW; pairs += oddPairs ? 2 : 1) {
      const deskRows = Math.max(1, Math.ceil(deskCount / (pairs * 2)));
      const cols2 = pairs * 3 + 1;
      const rows2 = Math.max(MIN_ROWS, deskRows * 3 + 2);
      const desks2 = pairs * 2 * deskRows;
      const zoom = Math.min(viewWidth / (cols2 * tileSize), viewHeight / (rows2 * tileSize));
      const isBetter = best === void 0 || zoom > best.zoom + 1e-9 || Math.abs(zoom - best.zoom) <= 1e-9 && desks2 < best.desks;
      if (isBetter) {
        best = { cols: cols2, rows: rows2, desks: desks2, zoom };
      }
    }
    const { cols, rows, desks } = best;
    return { cols, rows, desks };
  }
  function isWalkable(layout, point) {
    const kind = layout.tiles[point.y]?.[point.x];
    return kind !== void 0 && WALKABLE.has(kind);
  }
  function openFloorTiles(layout) {
    const open2 = [];
    layout.tiles.forEach((row, y) => row.forEach((kind, x) => {
      if (kind === "floor") {
        open2.push({ x, y });
      }
    }));
    return open2;
  }
  var STEPS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  function findPath(layout, from, to) {
    if (!isWalkable(layout, to)) {
      return void 0;
    }
    if (from.x === to.x && from.y === to.y) {
      return [];
    }
    const key = (point) => point.y * layout.cols + point.x;
    const cameFrom = /* @__PURE__ */ new Map([[key(from), -1]]);
    const queue = [from];
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      for (const step of STEPS) {
        const next = { x: current.x + step.x, y: current.y + step.y };
        const nextKey = key(next);
        const isGoal = next.x === to.x && next.y === to.y;
        if (cameFrom.has(nextKey) || !isWalkable(layout, next) || !isGoal && !isPassable(layout, next)) {
          continue;
        }
        cameFrom.set(nextKey, key(current));
        if (isGoal) {
          return tracePath(cameFrom, nextKey, key(from), layout.cols);
        }
        queue.push(next);
      }
    }
    return void 0;
  }
  function isPassable(layout, point) {
    const kind = layout.tiles[point.y][point.x];
    return kind === "floor" || kind === "door";
  }
  function tracePath(cameFrom, goalKey, startKey, cols) {
    const path = [];
    for (let current = goalKey; current !== startKey; current = cameFrom.get(current) ?? startKey) {
      path.push({ x: current % cols, y: Math.floor(current / cols) });
    }
    return path.reverse();
  }
  function nearestWalkable(layout, point) {
    const clamped = {
      x: Math.max(0, Math.min(layout.cols - 1, Math.round(point.x))),
      y: Math.max(0, Math.min(layout.rows - 1, Math.round(point.y)))
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

  // src/officeDaylight.ts
  var DEGREES = Math.PI / 180;
  var SYNODIC_DAYS = 29.530588853;
  var NEW_MOON_MS = Date.UTC(2e3, 0, 6, 18, 14);
  var DAY_MS = 864e5;
  function guessLatitude(date) {
    const january = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    const july = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return january < july ? -35 : 40;
  }
  function solarHour(date) {
    const standard = Math.max(new Date(date.getFullYear(), 0, 1).getTimezoneOffset(), new Date(date.getFullYear(), 6, 1).getTimezoneOffset());
    const saving = (standard - date.getTimezoneOffset()) / 60;
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600 - saving;
  }
  function dayOfYear(date) {
    return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / DAY_MS);
  }
  function solarDeclination(day) {
    return -23.44 * Math.cos(2 * Math.PI / 365 * (day + 10));
  }
  function elevation(latitude, declination, hourAngle) {
    const sine = Math.sin(latitude * DEGREES) * Math.sin(declination * DEGREES) + Math.cos(latitude * DEGREES) * Math.cos(declination * DEGREES) * Math.cos(hourAngle * DEGREES);
    return Math.asin(Math.max(-1, Math.min(1, sine))) / DEGREES;
  }
  function moonPhase(time) {
    const cycles = (time - NEW_MOON_MS) / DAY_MS / SYNODIC_DAYS;
    return cycles - Math.floor(cycles);
  }
  function wrap(angle) {
    return ((angle + 180) % 360 + 360) % 360 - 180;
  }
  function skyAt(hour, day, latitude, phase) {
    const declination = solarDeclination(day);
    const sunAngle = wrap((hour - 12) * 15);
    const moonAngle = wrap(sunAngle - phase * 360);
    const moonDeclination = declination * Math.cos(2 * Math.PI * phase);
    return {
      sun: { elevation: elevation(latitude, declination, sunAngle), hourAngle: sunAngle },
      moon: {
        elevation: elevation(latitude, moonDeclination, moonAngle),
        hourAngle: moonAngle,
        phase,
        illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2
      }
    };
  }
  function skyNow(date) {
    const day = dayOfYear(date);
    return skyAt(solarHour(date) + equationOfTime(day) / 60, day, guessLatitude(date), moonPhase(date.getTime()));
  }
  function equationOfTime(day) {
    const angle = 2 * Math.PI * (day - 81) / 364;
    return 9.87 * Math.sin(2 * angle) - 7.53 * Math.cos(angle) - 1.5 * Math.sin(angle);
  }
  var DAYTIME_SKY = skyAt(10.5, 172, 40, 0);
  var SKY_STOPS = [
    [60, "#79C6F0"],
    [20, "#8FD3F4"],
    [7, "#B4DCEC"],
    [2, "#F4C28E"],
    [-1.5, "#E48A68"],
    [-4.5, "#8C5F8E"],
    [-8, "#3D4278"],
    [-13, "#1C2444"],
    [-90, "#111830"]
  ];
  var AMBIENT_STOPS = [
    [12, "#FFFFFF", 0],
    [5, "#FFD6A0", 0.2],
    [0.5, "#FF9C6C", 0.34],
    [-3.5, "#9C78B0", 0.5],
    [-7.5, "#3E4E96", 0.68],
    [-13, "#1C2560", 0.8]
  ];
  var SCENE_EXPOSURE = {
    office: 0.32,
    serverRoom: 0,
    forest: 1,
    field: 1,
    riverbed: 1,
    cave: 0,
    moon: 1,
    beach: 1,
    snowfield: 1,
    desert: 1,
    reef: 1,
    library: 0.32,
    rooftop: 1
  };
  function sceneLight(scene, sky) {
    const sunUp = sky.sun.elevation;
    const exposure = SCENE_EXPOSURE[scene];
    if (scene === "moon") {
      return moonLight(sky);
    }
    if (scene === "reef") {
      return reefLight(sunUp);
    }
    const [tint, strength] = ambientAt(sunUp);
    const darkness = strength * exposure;
    const skyColor = colorAt(SKY_STOPS, sunUp);
    return {
      ambient: mix("#FFFFFF", tint, darkness),
      darkness,
      sky: skyColor,
      cloud: mix(skyColor, "#FFFFFF", 0.18 + 0.72 * clamp((sunUp + 6) / 16)),
      stars: clamp((-sunUp - 4) / 8),
      sun: mix("#FFE066", "#FF7B3A", clamp((8 - sunUp) / 9))
    };
  }
  function moonLight(sky) {
    const sunUp = lunarSunElevation(sky.moon.phase);
    const earthLit = earthIllumination(sky.moon.phase);
    const night = clamp((2 - sunUp) / 4);
    const darkness = night * (0.66 - 0.22 * earthLit);
    return { ambient: mix("#FFFFFF", "#3A4670", darkness), darkness, sky: "#05060C", stars: 1, cloud: "#FFFFFF", sun: "#FFF6E0" };
  }
  function reefLight(sunUp) {
    const [, strength] = ambientAt(sunUp);
    const night = strength / 0.8;
    const darkness = 0.14 + 0.58 * night;
    return { ambient: mix("#B4D8F4", "#14265A", night), darkness, sky: "#1C5A8E", stars: 0, cloud: "#FFFFFF", sun: "#FFF6E0" };
  }
  function lunarSunElevation(phase) {
    return 90 * Math.sin(2 * Math.PI * (phase - 0.25));
  }
  function earthIllumination(phase) {
    return (1 + Math.cos(2 * Math.PI * phase)) / 2;
  }
  function ambientAt(sunUp) {
    const stops = AMBIENT_STOPS;
    if (sunUp >= stops[0][0]) {
      return [stops[0][1], 0];
    }
    for (let index = 1; index < stops.length; index++) {
      const [high, highColor, highStrength] = stops[index - 1];
      const [low, lowColor, lowStrength] = stops[index];
      if (sunUp >= low) {
        const amount = (high - sunUp) / (high - low);
        return [mix(highColor, lowColor, amount), highStrength + (lowStrength - highStrength) * amount];
      }
    }
    const last = stops[stops.length - 1];
    return [last[1], last[2]];
  }
  function colorAt(stops, sunUp) {
    if (sunUp >= stops[0][0]) {
      return stops[0][1];
    }
    for (let index = 1; index < stops.length; index++) {
      const [high, highColor] = stops[index - 1];
      const [low, lowColor] = stops[index];
      if (sunUp >= low) {
        return mix(highColor, lowColor, (high - sunUp) / (high - low));
      }
    }
    return stops[stops.length - 1][1];
  }
  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }
  function mix(first, second, amount) {
    const a = parseInt(first.slice(1), 16);
    const b = parseInt(second.slice(1), 16);
    const t = clamp(amount);
    const channel = (shift) => Math.round((a >> shift & 255) * (1 - t) + (b >> shift & 255) * t);
    return `#${(1 << 24 | channel(16) << 16 | channel(8) << 8 | channel(0)).toString(16).slice(1).toUpperCase()}`;
  }
  function discLit(x, y, illumination, waxing) {
    const half = Math.sqrt(Math.max(0, 1 - y * y));
    const edge = (1 - 2 * illumination) * half;
    return waxing ? x >= edge : -x >= edge;
  }

  // src/officeCritters.ts
  var CRITTERS = {
    mouse: { gait: "run", speed: 46, width: 8, pauses: true },
    cat: { gait: "run", speed: 40, width: 12, pauses: false },
    robot: { gait: "roll", speed: 22, width: 10, pauses: true },
    fox: { gait: "run", speed: 44, width: 14, pauses: false },
    rabbit: { gait: "hop", speed: 34, width: 10, pauses: true },
    squirrel: { gait: "run", speed: 42, width: 10, pauses: true },
    hedgehog: { gait: "waddle", speed: 18, width: 9, pauses: false },
    chicken: { gait: "waddle", speed: 20, width: 9, pauses: true },
    chick: { gait: "waddle", speed: 20, width: 5, pauses: false },
    sheep: { gait: "waddle", speed: 16, width: 12, pauses: true },
    frog: { gait: "hop", speed: 24, width: 8, pauses: true },
    duck: { gait: "waddle", speed: 18, width: 9, pauses: false },
    duckling: { gait: "waddle", speed: 18, width: 5, pauses: false },
    turtle: { gait: "waddle", speed: 10, width: 10, pauses: false },
    bat: { gait: "fly", speed: 38, width: 11, pauses: false },
    rat: { gait: "run", speed: 44, width: 10, pauses: true },
    beetle: { gait: "waddle", speed: 16, width: 6, pauses: false },
    alien: { gait: "hop", speed: 22, width: 8, pauses: true, floaty: true },
    rover: { gait: "roll", speed: 18, width: 13, pauses: true },
    corgi: { gait: "run", speed: 40, width: 14, pauses: true },
    hamster: { gait: "roll", speed: 26, width: 8, pauses: false },
    spider: { gait: "run", speed: 34, width: 9, pauses: true },
    drone: { gait: "fly", speed: 30, width: 11, pauses: false },
    raccoon: { gait: "run", speed: 32, width: 14, pauses: true },
    pig: { gait: "waddle", speed: 16, width: 12, pauses: true },
    butterfly: { gait: "fly", speed: 18, width: 7, pauses: false },
    otter: { gait: "run", speed: 36, width: 14, pauses: true },
    crab: { gait: "waddle", speed: 14, width: 9, pauses: true },
    slime: { gait: "hop", speed: 16, width: 8, pauses: true },
    moonBunny: { gait: "hop", speed: 20, width: 10, pauses: true, floaty: true },
    ufo: { gait: "fly", speed: 34, width: 11, pauses: false },
    astronaut: { gait: "hop", speed: 14, width: 7, pauses: true, floaty: true },
    hermitCrab: { gait: "waddle", speed: 12, width: 9, pauses: true },
    sandpiper: { gait: "run", speed: 48, width: 8, pauses: true },
    penguin: { gait: "waddle", speed: 14, width: 7, pauses: true },
    arcticFox: { gait: "run", speed: 44, width: 15, pauses: false },
    polarBear: { gait: "waddle", speed: 14, width: 16, pauses: true },
    seal: { gait: "waddle", speed: 12, width: 12, pauses: true },
    lizard: { gait: "run", speed: 46, width: 12, pauses: true },
    scorpion: { gait: "run", speed: 24, width: 11, pauses: true },
    camel: { gait: "waddle", speed: 14, width: 16, pauses: true },
    tumbleweed: { gait: "hop", speed: 36, width: 9, pauses: false },
    roadrunner: { gait: "run", speed: 64, width: 14, pauses: true },
    starfish: { gait: "waddle", speed: 8, width: 9, pauses: false },
    octopus: { gait: "waddle", speed: 14, width: 10, pauses: true },
    seahorse: { gait: "hop", speed: 12, width: 7, pauses: true, floaty: true },
    book: { gait: "hop", speed: 22, width: 8, pauses: true },
    broom: { gait: "hop", speed: 20, width: 7, pauses: true }
  };
  var SCENE_CRITTERS = {
    office: [["mouse"], ["mouse"], ["cat"], ["mouse", "cat"], ["robot"], ["corgi"], ["hamster"], ["cat", "corgi"]],
    serverRoom: [["mouse"], ["robot"], ["rat"], ["spider"], ["drone"], ["mouse", "robot"], ["drone", "drone"]],
    forest: [["fox"], ["rabbit"], ["squirrel"], ["hedgehog"], ["raccoon"], ["rabbit", "fox"], ["squirrel", "squirrel"]],
    field: [["chicken", "chick", "chick", "chick"], ["sheep"], ["sheep", "sheep"], ["rabbit"], ["pig"], ["butterfly"], ["butterfly", "butterfly"]],
    riverbed: [["frog"], ["frog", "frog"], ["duck", "duckling", "duckling", "duckling"], ["turtle"], ["otter"], ["crab"], ["crab", "crab"]],
    cave: [["bat"], ["bat", "bat"], ["bat", "bat", "bat"], ["rat"], ["beetle"], ["spider"], ["slime"], ["slime", "slime"]],
    moon: [["alien"], ["alien", "alien"], ["alien", "alien", "alien"], ["rover"], ["moonBunny"], ["ufo"], ["astronaut"], ["rover", "astronaut"]],
    beach: [["crab"], ["crab", "crab", "crab"], ["hermitCrab"], ["sandpiper", "sandpiper", "sandpiper"], ["turtle"], ["corgi"]],
    snowfield: [["penguin"], ["penguin", "penguin", "penguin", "penguin"], ["arcticFox"], ["polarBear"], ["seal"], ["rabbit"]],
    desert: [["lizard"], ["lizard", "lizard"], ["scorpion"], ["camel"], ["camel", "camel"], ["tumbleweed"], ["roadrunner"]],
    reef: [["crab"], ["crab", "crab"], ["starfish"], ["octopus"], ["hermitCrab"], ["seahorse", "seahorse"]],
    library: [["cat"], ["mouse"], ["mouse", "cat"], ["book"], ["book", "book", "book"], ["broom"], ["slime"]],
    rooftop: [["rat"], ["rat", "cat"], ["raccoon"], ["raccoon", "raccoon"], ["cat"], ["drone"], ["corgi"]]
  };
  var CRITTER_GAP_SECONDS = { min: 10, max: 25 };
  function critterGap(random2) {
    return CRITTER_GAP_SECONDS.min + random2() * (CRITTER_GAP_SECONDS.max - CRITTER_GAP_SECONDS.min);
  }
  function critterLanes(layout) {
    const lanes = [];
    for (let y = 1; y < layout.rows - 1; y++) {
      if (layout.tiles[y].every((tile) => tile === "floor" || tile === "door")) {
        lanes.push(y);
      }
    }
    return lanes;
  }
  function planCritterRun(layout, sceneId2, now, random2, tile) {
    const troupes = SCENE_CRITTERS[sceneId2];
    const members = troupes[Math.floor(random2() * troupes.length) % troupes.length];
    const lead = CRITTERS[members[0]];
    const flies = lead.gait === "fly";
    const lanes = critterLanes(layout);
    if (!flies && lanes.length === 0) {
      return void 0;
    }
    const direction = random2() < 0.5 ? 1 : -1;
    const roomWidth = layout.cols * tile;
    const widest = Math.max(...members.map((kind) => CRITTERS[kind].width));
    const spacing = widest + 3;
    const trail = spacing * (members.length - 1);
    const margin = widest + 2;
    const fromX = direction === 1 ? -margin : roomWidth + margin;
    const toX = direction === 1 ? roomWidth + margin + trail : -margin - trail;
    let row;
    let groundY;
    if (flies) {
      row = layout.rows;
      groundY = tile * (1.5 + random2() * Math.max(1, layout.rows / 2 - 1));
    } else {
      row = lanes[Math.floor(random2() * lanes.length) % lanes.length];
      groundY = row * tile + tile - 3;
    }
    const pauses = lead.pauses && random2() < 0.6;
    return {
      members,
      start: now,
      fromX,
      toX,
      direction,
      speed: lead.speed * (0.85 + random2() * 0.3),
      groundY,
      row,
      spacing,
      pauseAt: pauses ? roomWidth * (0.3 + random2() * 0.4) + margin : void 0,
      pauseSeconds: 0.8 + random2() * 1.2
    };
  }
  function travelled(run, elapsed) {
    const moving = run.speed * elapsed;
    if (run.pauseAt === void 0 || moving < run.pauseAt) {
      return { distance: moving, still: false };
    }
    const pauseEnd = run.pauseAt / run.speed + run.pauseSeconds;
    if (elapsed < pauseEnd) {
      return { distance: run.pauseAt, still: true };
    }
    return { distance: run.pauseAt + run.speed * (elapsed - pauseEnd), still: false };
  }
  function critterPoses(run, now) {
    const elapsed = Math.max(0, now - run.start);
    const { distance, still } = travelled(run, elapsed);
    return run.members.map((kind, index) => {
      const spec = CRITTERS[kind];
      const x = run.fromX + run.direction * (distance - index * run.spacing);
      const beat = elapsed + index * 0.17;
      let y = run.groundY;
      let frame = Math.floor(beat * (spec.gait === "run" ? 10 : 5)) % 2;
      if (!still) {
        if (spec.gait === "hop") {
          const period = spec.floaty === true ? 0.9 : kind === "slime" ? 0.6 : 0.45;
          const phase = beat % period / period;
          y -= Math.sin(phase * Math.PI) * (spec.floaty === true ? 9 : kind === "slime" ? 3 : 5);
          frame = phase < 0.85 ? 1 : 0;
        } else if (spec.gait === "fly") {
          y += Math.sin(beat * 3 + index) * 4;
          frame = Math.floor(beat * 8) % 2;
        } else if (spec.gait === "roll") {
          frame = Math.floor(beat * 4) % 2;
        }
      } else {
        frame = Math.floor(beat * 1.5) % 2;
      }
      return { kind, x, y, facing: run.direction, frame, still: still && spec.gait !== "fly" };
    });
  }
  function critterRunDone(run, now) {
    const { distance } = travelled(run, Math.max(0, now - run.start));
    return distance >= Math.abs(run.toX - run.fromX);
  }
  var ANY_LINES = [
    "aww",
    "!",
    "<3",
    "lol",
    "o_O",
    "look!",
    "who let that in?",
    "so cute",
    "hi friend!",
    "where's it going?",
    "zoomies!",
    "new coworker?",
    "is it on payroll?",
    "I'm naming it",
    "can we keep it?",
    "it has places to be",
    "bye buddy!",
    "*gasp*"
  ];
  var KIND_LINES = {
    mouse: ["eek!", "a mouse!", "squeak", "it took my cheese", "mouse! not the USB kind", "get on a chair!"],
    cat: ["kitty!", "pspsps", "meow?", "it's on the keyboard", "asdfjkl;", "office cat!", "it judged me"],
    robot: ["beep?", "roomba!", "go lil guy", "it's vacuuming my feet", "is it sentient?", "bonk!"],
    fox: ["a fox!", "foxy", "run bun!", "what does it say?", "sly", "a fox in the hen house"],
    rabbit: ["bunny!", "hop hop", "follow it?", "late for a meeting?", "so fluffy", "binky!"],
    squirrel: ["nuts?", "squirrel!", "it has a plan", "parkour!", "it stole my granola"],
    hedgehog: ["spiky!", "hedgie!", "gotta go fast", "tiny feet", "don't pet it"],
    chicken: ["bawk?", "chicken!", "why'd it cross?", "to get to prod", "egg-cellent"],
    chick: ["peep!", "babies!", "tiny!", "following mom", "peep peep"],
    sheep: ["baa", "fluffy", "counting sheep\u2026", "zzz\u2026 1\u2026 2\u2026", "ewe!", "woolly"],
    frog: ["ribbit", "froggy!", "hop!", "it's a prince?", "toad-ally"],
    duck: ["quack!", "ducks!", "rubber duck debugging", "the duck knows", "ask it about the bug"],
    duckling: ["babies!", "quack", "in a row!", "tiny ducks!", "so organized"],
    turtle: ["go go!", "slow\u2026", "steady wins", "our build speed", "slow and steady", "turbo turtle"],
    bat: ["eek!", "bats!", "duck!", "na na na na", "it's in my hair!", "batman?"],
    rat: ["eek!", "rat!", "it's huge", "ratatouille?", "it's a chef"],
    beetle: ["bug!", "shiny", "found the bug", "file a ticket", "it's a feature"],
    alien: ["hi!", "take me!", "ayy", "o_O", "we come in peace", "is it hiring?", "nice antenna"],
    rover: ["rover!", "beep?", "go rover!", "6 wheels!", "sample collected"],
    corgi: ["doggo!", "corgi!", "good boy", "loaf!", "smol legs", "who's a good boy", "zoom zoom"],
    hamster: ["go go!", "hammy!", "wheee", "powering the servers", "cheeks!", "it escaped!"],
    spider: ["eek!", "spider!", "nope", "nope nope nope", "web dev!", "burn it"],
    drone: ["drone?", "bzzz", "o_O", "who's flying that", "delivery!", "it's watching"],
    raccoon: ["trash panda", "bandit!", "it took my lunch", "tiny hands", "it's in the bin"],
    pig: ["oink", "piggy!", "bacon?", "rude.", "when pigs fly\u2026", "mud day!"],
    butterfly: ["pretty", "~", "ooh", "butterfly effect", "don't step on it", "flutter"],
    otter: ["otter!", "sleek", "holding hands?", "it has a rock", "otterly cute"],
    crab: ["crab!", "snip snip", "pinchy", "sideways!", "rustacean!", "crab rave"],
    slime: ["slime!", "blorp", "ew", "it ate my mouse", "gelatinous", "don't touch it"],
    moonBunny: ["moon bun!", "hop hop", "it's making mochi", "space bun", "low-g hops"],
    ufo: ["UFO!", "they're here", "o_O", "beam me up", "act natural", "take the intern"],
    astronaut: ["hi!", "o7", "space!", "nice suit", "hello, houston", "one small step"],
    hermitCrab: ["nice shell", "house hunting?"],
    sandpiper: ["peep peep", "zoom!"],
    penguin: ["penguin!", "waddle waddle", "noot"],
    arcticFox: ["snow fox!", "so fluffy"],
    polarBear: ["BEAR", "don't move", "big floof"],
    seal: ["seal!", "arf arf", "blubber buddy"],
    lizard: ["lizard!", "zip"],
    scorpion: ["nope", "scorpion!", "check your boots"],
    camel: ["camel!", "humps!", "spits?"],
    tumbleweed: ["tumbleweed\u2026", "\u2026", "*whistles*"],
    roadrunner: ["meep meep", "so fast", "zoom!"],
    starfish: ["starfish!", "go go go", "patrick?"],
    octopus: ["octopus!", "8 arms", "so smart"],
    seahorse: ["seahorse!", "tiny horse", "ooh"],
    book: ["a book!", "come back", "overdue"],
    broom: ["it sweeps itself", "magic!", "o_O"]
  };
  function critterLines(kind) {
    return [...KIND_LINES[kind], ...ANY_LINES];
  }

  // src/officeFliers.ts
  var FLIERS = {
    pigeon: { motion: "flap", speed: 30, width: 11, flap: 5, formation: "line" },
    paperPlane: { motion: "glide", speed: 26, width: 10, flap: 0, formation: "line" },
    moth: { motion: "dart", speed: 14, width: 7, flap: 9, formation: "swarm" },
    balloon: { motion: "drift", speed: 8, width: 5, flap: 1, formation: "line" },
    sparrow: { motion: "flap", speed: 36, width: 10, flap: 7, formation: "line" },
    fly: { motion: "dart", speed: 20, width: 5, flap: 14, formation: "swarm" },
    microDrone: { motion: "dart", speed: 22, width: 7, flap: 12, formation: "swarm" },
    robotBird: { motion: "flap", speed: 30, width: 11, flap: 5, formation: "line" },
    ghost: { motion: "drift", speed: 10, width: 7, flap: 2, formation: "swarm", glow: true, alpha: 0.7 },
    owl: { motion: "glide", speed: 24, width: 11, flap: 3, formation: "line", time: "night" },
    crow: { motion: "flap", speed: 32, width: 11, flap: 5, formation: "line" },
    bluebird: { motion: "flap", speed: 30, width: 9, flap: 7, formation: "line", time: "day" },
    hawk: { motion: "swoop", speed: 42, width: 13, flap: 3, formation: "line", shadow: true, time: "day" },
    firefly: { motion: "dart", speed: 10, width: 3, flap: 2, formation: "swarm", glow: true, time: "night" },
    goose: { motion: "flap", speed: 30, width: 14, flap: 4, formation: "v" },
    swallow: { motion: "swoop", speed: 50, width: 11, flap: 8, formation: "line", time: "day" },
    bee: { motion: "dart", speed: 16, width: 6, flap: 16, formation: "swarm", time: "day" },
    hotAirBalloon: { motion: "drift", speed: 6, width: 11, flap: 1, formation: "line", shadow: true, time: "day" },
    heron: { motion: "glide", speed: 22, width: 16, flap: 2, formation: "line", shadow: true },
    dragonfly: { motion: "dart", speed: 30, width: 11, flap: 16, formation: "swarm", time: "day" },
    kingfisher: { motion: "swoop", speed: 48, width: 10, flap: 9, formation: "line", time: "day" },
    gull: { motion: "glide", speed: 28, width: 13, flap: 3, formation: "line" },
    mallard: { motion: "flap", speed: 34, width: 12, flap: 6, formation: "v" },
    dragon: { motion: "flap", speed: 30, width: 20, flap: 2.5, formation: "line", shadow: true },
    wisp: { motion: "drift", speed: 12, width: 5, flap: 4, formation: "swarm", glow: true },
    phoenix: { motion: "glide", speed: 40, width: 13, flap: 3, formation: "line", glow: true, trail: "#F8A23A" },
    rocket: { motion: "glide", speed: 45, width: 13, flap: 10, formation: "line", trail: "#F8C84A" },
    satellite: { motion: "glide", speed: 12, width: 13, flap: 1, formation: "line" },
    spaceWhale: { motion: "drift", speed: 9, width: 22, flap: 0.8, formation: "line", shadow: true },
    meteor: { motion: "streak", speed: 90, width: 4, flap: 8, formation: "line", glow: true, trail: "#F8A23A" },
    starJelly: { motion: "drift", speed: 8, width: 7, flap: 1.5, formation: "swarm", glow: true },
    pelican: { motion: "glide", speed: 26, width: 16, flap: 2.5, formation: "line", shadow: true },
    parrot: { motion: "flap", speed: 34, width: 12, flap: 6, formation: "line", time: "day" },
    kite: { motion: "drift", speed: 12, width: 9, flap: 2, formation: "line", time: "day" },
    snowyOwl: { motion: "glide", speed: 24, width: 11, flap: 3, formation: "line" },
    sleigh: { motion: "drift", speed: 22, width: 22, flap: 3, formation: "line", glow: true, time: "night", trail: "#FFF6C8" },
    vulture: { motion: "glide", speed: 18, width: 16, flap: 1.5, formation: "line", shadow: true, time: "day" },
    fish: { motion: "dart", speed: 24, width: 7, flap: 4, formation: "swarm" },
    jellyfish: { motion: "drift", speed: 7, width: 7, flap: 1.2, formation: "swarm", glow: true },
    shark: { motion: "glide", speed: 22, width: 22, flap: 1.5, formation: "line", shadow: true },
    manta: { motion: "glide", speed: 16, width: 16, flap: 1, formation: "line", shadow: true },
    seaTurtle: { motion: "drift", speed: 12, width: 14, flap: 1.2, formation: "line" },
    flyingBook: { motion: "flap", speed: 24, width: 11, flap: 4, formation: "swarm" },
    helicopter: { motion: "flap", speed: 36, width: 15, flap: 12, formation: "line", shadow: true },
    blimp: { motion: "drift", speed: 7, width: 22, flap: 1, formation: "line", shadow: true, time: "day" }
  };
  var SCENE_FLIERS = {
    office: [["pigeon"], ["pigeon", "pigeon"], ["paperPlane"], ["moth"], ["balloon"], ["sparrow", "sparrow", "sparrow"]],
    serverRoom: [["fly"], ["fly", "fly"], ["microDrone", "microDrone", "microDrone"], ["robotBird"], ["ghost"], ["paperPlane"]],
    forest: [["owl"], ["crow", "crow", "crow"], ["bluebird", "bluebird"], ["hawk"], ["firefly", "firefly", "firefly", "firefly", "firefly"], ["crow"]],
    field: [["goose", "goose", "goose", "goose", "goose"], ["swallow", "swallow"], ["bee"], ["bee", "bee"], ["hotAirBalloon"], ["crow", "crow"]],
    riverbed: [["heron"], ["dragonfly"], ["dragonfly", "dragonfly"], ["kingfisher"], ["gull", "gull"], ["mallard", "mallard", "mallard"]],
    cave: [["dragon"], ["wisp", "wisp", "wisp"], ["phoenix"], ["ghost"], ["moth", "moth"]],
    moon: [["rocket"], ["satellite"], ["spaceWhale"], ["meteor"], ["meteor", "meteor"], ["starJelly", "starJelly"]],
    beach: [["gull"], ["gull", "gull", "gull"], ["pelican", "pelican", "pelican"], ["parrot", "parrot"], ["kite"], ["meteor"]],
    snowfield: [["snowyOwl"], ["goose", "goose", "goose", "goose", "goose"], ["crow", "crow"], ["hawk"], ["sleigh"]],
    desert: [["vulture"], ["vulture", "vulture", "vulture"], ["hawk"], ["owl"], ["hotAirBalloon"], ["meteor"]],
    reef: [["fish", "fish", "fish", "fish", "fish", "fish"], ["fish", "fish", "fish"], ["jellyfish", "jellyfish", "jellyfish"], ["shark"], ["manta"], ["seaTurtle"]],
    library: [["flyingBook", "flyingBook", "flyingBook"], ["flyingBook"], ["owl"], ["ghost"], ["wisp", "wisp", "wisp"], ["paperPlane"]],
    rooftop: [["pigeon", "pigeon", "pigeon"], ["crow"], ["helicopter"], ["blimp"], ["paperPlane"], ["pigeon"]]
  };
  var FLIER_GAP_SECONDS = { min: 25, max: 60 };
  function flierGap(random2) {
    return FLIER_GAP_SECONDS.min + random2() * (FLIER_GAP_SECONDS.max - FLIER_GAP_SECONDS.min);
  }
  function fliersNow(sceneId2, night) {
    const troupes = SCENE_FLIERS[sceneId2];
    if (night === void 0) {
      return troupes;
    }
    return troupes.filter((troupe) => {
      const time = FLIERS[troupe[0]].time;
      return time === void 0 || time === (night ? "night" : "day");
    });
  }
  function planFlight(layout, sceneId2, now, random2, tile, night) {
    const troupes = fliersNow(sceneId2, night);
    if (troupes.length === 0 || layout.rows < 3) {
      return void 0;
    }
    const members = troupes[Math.floor(random2() * troupes.length) % troupes.length];
    const lead = FLIERS[members[0]];
    const direction = random2() < 0.5 ? 1 : -1;
    const roomWidth = layout.cols * tile;
    const roomHeight = layout.rows * tile;
    const widest = Math.max(...members.map((kind) => FLIERS[kind].width));
    const offsets = members.map((_, index) => formationSpot(lead.formation, index, widest, random2));
    const trail = Math.max(...offsets.map((offset) => offset.back)) + (lead.trail === void 0 ? 0 : 24);
    const margin = widest + 4;
    const fromX = direction === 1 ? -margin : roomWidth + margin;
    const toX = direction === 1 ? roomWidth + margin + trail : -margin - trail;
    const high = lead.motion === "streak" ? 0.08 : 0.15;
    const baseY = roomHeight * (high + random2() * 0.25) + 4;
    let drop = 0;
    if (lead.motion === "swoop") {
      drop = roomHeight * (0.3 + random2() * 0.2);
    } else if (lead.motion === "streak") {
      drop = roomHeight * (0.15 + random2() * 0.2);
    }
    return {
      members,
      start: now,
      fromX,
      toX,
      direction,
      speed: lead.speed * (0.85 + random2() * 0.3),
      baseY,
      drop,
      offsets,
      shadowY: roomHeight * (0.55 + random2() * 0.3)
    };
  }
  function formationSpot(formation, index, width2, random2) {
    const phase = random2() * Math.PI * 2;
    if (index === 0) {
      return { back: 0, y: 0, phase };
    }
    if (formation === "v") {
      const rank = Math.ceil(index / 2);
      return { back: rank * (width2 * 0.7), y: (index % 2 === 1 ? -1 : 1) * rank * 4, phase };
    }
    if (formation === "swarm") {
      return { back: index * width2 * 0.6 + random2() * width2, y: (random2() - 0.5) * 14, phase };
    }
    return { back: index * (width2 + 4), y: (random2() - 0.5) * 6, phase };
  }
  function leadDistance(flight2, elapsed) {
    return flight2.speed * elapsed;
  }
  function flierPoses(flight2, now) {
    const elapsed = Math.max(0, now - flight2.start);
    const lead = FLIERS[flight2.members[0]];
    const total = Math.abs(flight2.toX - flight2.fromX);
    const distance = leadDistance(flight2, elapsed);
    return flight2.members.map((kind, index) => {
      const spec = FLIERS[kind];
      const offset = flight2.offsets[index];
      const t = elapsed + offset.phase;
      let along = distance - offset.back;
      let y = flight2.baseY + offset.y;
      let frame = Math.floor(t * spec.flap * 2) % 2;
      const progress = Math.max(0, Math.min(1, along / total));
      switch (lead.motion) {
        case "flap":
          y += Math.sin(t * spec.flap * Math.PI * 2) * 1.5 + Math.sin(t * 0.9) * 3;
          break;
        case "glide":
          y += Math.sin(t * 0.7) * 4;
          if (Math.sin(t * 0.8) > -0.3) {
            frame = 0;
          }
          break;
        case "swoop":
          y += Math.sin(progress * Math.PI) * flight2.drop + Math.sin(t * 1.3) * 2;
          if (progress > 0.3 && progress < 0.7) {
            frame = 1;
          }
          break;
        case "dart":
          along += Math.sin(t * 2.7) * 10 + Math.sin(t * 6.1) * 3;
          y += Math.sin(t * 3.3) * 6 + Math.sin(t * 7.9) * 2;
          break;
        case "drift":
          along += Math.sin(t * 0.5) * 4;
          y += Math.sin(t * 0.8) * 5;
          break;
        case "streak":
          y += progress * flight2.drop;
          break;
      }
      return { kind, x: flight2.fromX + flight2.direction * along, y, facing: flight2.direction, frame };
    });
  }
  function flightDone(flight2, now) {
    return leadDistance(flight2, Math.max(0, now - flight2.start)) >= Math.abs(flight2.toX - flight2.fromX) + 12;
  }
  var ANY_LINES2 = ["look up!", "whoa", "o_O", "!", "up there!", "what was that?", "did you see that?", "incoming!", "*ducks*", "so high!", "bye!"];
  var KIND_LINES2 = {
    pigeon: ["coo", "a pigeon?", "how'd it get in", "it wants my sandwich", "office pigeon", "coo coo"],
    paperPlane: ["nice throw", "who made that", "wheee", "it's a memo", "air mail!", "10/10 fold"],
    moth: ["moth!", "lamp's over there", "it loves my monitor", "the light!", "brother?"],
    balloon: ["a balloon!", "party?", "bye balloon", "whose birthday?", "it's getting away", "99 of those?"],
    sparrow: ["tweet!", "birds!", "tweet tweet", "small birb", "chirp"],
    fly: ["bzzz", "a bug!", "found the bug", "it's in my coffee", "swat it!", "debug it"],
    microDrone: ["bzzz", "swarm!", "who's flying those", "are they mapping us?", "drone show!"],
    robotBird: ["beep tweet", "robo bird!", "tweet.exe", "it's a bot", "firmware bird"],
    ghost: ["ghost!", "boo?", "ghost in the machine", "it's the old server", "who you gonna call?", "*shivers*"],
    owl: ["hoo?", "owl!", "hoo hoo", "night owl", "it's judging me", "wise"],
    crow: ["caw!", "crows", "omen?", "a murder!", "they remember faces", "caw caw"],
    bluebird: ["bluebird!", "tweet!", "pretty", "so blue", "a happy little bird"],
    hawk: ["hawk!", "duck!", "hide the mice", "it's diving!", "hawk eye", "screech!"],
    firefly: ["fireflies!", "pretty", "ooh", "tiny lights", "make a wish", "blink blink"],
    goose: ["honk!", "geese!", "honk honk", "peace was never an option", "don't make eye contact", "HONK"],
    swallow: ["zoom!", "swallows!", "African or European?", "so fast", "aerobatics!"],
    bee: ["bzzz", "bee!", "don't move", "save the bees", "busy bee", "it's just a bee!"],
    hotAirBalloon: ["balloon!", "hi up there!", "take me", "drop a sandbag", "nice basket", "up up and away"],
    heron: ["heron!", "so graceful", "long legs", "fishing trip", "it's tall"],
    dragonfly: ["dragonfly!", "zip zip", "tiny dragon", "helicopter bug", "so shiny"],
    kingfisher: ["kingfisher!", "so blue", "dive!", "got a fish!", "fancy bird"],
    gull: ["gulls!", "mine?", "watch your lunch", "MINE MINE", "fries thief", "squawk"],
    mallard: ["quack!", "ducks!", "V for victory", "flying ducks!", "duck squad"],
    dragon: ["DRAGON!", "hide the gold", "run!", "it's beautiful", "I'm calling HR", "accounting will hear about this", "fire!"],
    wisp: ["wisps\u2026", "don't follow them", "ooh", "it's calling me", "spooky", "don't."],
    phoenix: ["phoenix!", "so warm", "make a wish", "it's on fire. on purpose.", "rise!", "it'll be back"],
    rocket: ["rocket!", "launch!", "o7", "3\u2026 2\u2026 1\u2026", "to the moon!", "deploy!"],
    satellite: ["satellite!", "wave!", "hi nasa", "is it watching?", "5 bars!", "ping!"],
    spaceWhale: ["space whale!", "it's huge", "hello friend", "it's singing", "so majestic", "whale hello there"],
    meteor: ["shooting star!", "make a wish", "meteor!", "is that coming here?", "wish: no bugs"],
    starJelly: ["space jellies", "glowy", "ooh", "don't touch them", "so floaty", "jelly!"],
    pelican: ["pelicans!", "big beak", "hide the fish"],
    parrot: ["parrot!", "squawk!", "pretty bird"],
    kite: ["kite!", "whose kite?", "go higher"],
    snowyOwl: ["snowy owl!", "hedwig?", "hoo"],
    sleigh: ["is that\u2026", "SLEIGH!", "early this year", "naughty list?"],
    vulture: ["vultures\u2026", "not dead yet!", "circling\u2026"],
    fish: ["fish!", "school's in", "blub"],
    jellyfish: ["jellies!", "don't touch", "glowy"],
    shark: ["SHARK", "stay calm", "don't bleed"],
    manta: ["manta!", "so graceful", "whoosh"],
    seaTurtle: ["sea turtle!", "dude!", "go with the flow"],
    flyingBook: ["the books!", "shhh", "catch it!"],
    helicopter: ["chopper!", "get to the chopper", "loud\u2026"],
    blimp: ["blimp!", "big balloon", "ad space"]
  };
  function flierLines(kind) {
    return [...KIND_LINES2[kind], ...ANY_LINES2];
  }

  // src/officePhrases.ts
  function pickPhrase(list, random2) {
    return list[Math.min(list.length - 1, Math.floor(random2() * list.length))];
  }
  var CHATTER_SYMBOLS = ["!", "?", "#", "@", "$", "%", "&", "*", "\u266A", "\u2026", "^_^", "o_O", "lol", "?!", "<3", "\u2615", "\u2605", "~"];
  var CHAT_LINES = [
    "lol",
    "no way",
    "for real?",
    "same",
    "big if true",
    "classic",
    "wild",
    "true true",
    "haha",
    "mood",
    "oof",
    "yikes",
    "it's fine",
    "it's not fine",
    "huh",
    "totally",
    "nah",
    "eh",
    "say less",
    "brb",
    "makes sense",
    "I'll allow it",
    "it works on my machine",
    "did you push?",
    "who broke main?",
    "is it Friday yet?",
    "tabs or spaces?",
    "spaces. obviously.",
    "I miss jQuery",
    "rewrite it in Rust",
    "have you tried Vim?",
    "how do I exit Vim",
    "it's always DNS",
    "never DNS. until it is.",
    "that's a feature",
    "ship it",
    "LGTM",
    "nit:",
    "one more meeting",
    "this could've been an email",
    "standup ran long",
    "my code works. no idea why",
    "it doesn't work. no idea why",
    "it compiled first try",
    "suspicious",
    "who wrote this?",
    "oh. me.",
    "git blame says me",
    "legacy code is my cardio",
    "I named a variable 'thing2'",
    "naming is hard",
    "cache invalidation tho",
    "off by one again",
    "off by two this time",
    "I have 47 tabs open",
    "my RAM is crying",
    "I deployed on Friday",
    "you monster",
    "the tests pass",
    "which tests?",
    "the ones I didn't skip",
    "it's 90% done",
    "the other 90% though",
    "should be quick",
    "famous last words",
    "I'll fix it in post",
    "TODO: fix later",
    "later never came",
    "the AI wrote that",
    "the AI fixed that",
    "the AI broke that",
    "prompt engineering is my passion",
    "did you clear the cache?",
    "is the build green?",
    "it's yellow?",
    "the coffee machine is down",
    "worst day ever",
    "who took my stapler",
    "my mouse died",
    "it's a USB-C thing",
    "need a dongle",
    "my dongle needs a dongle",
    "the wifi's haunted",
    "standup in 5",
    "I'm on mute",
    "you're on mute",
    "can you see my screen?",
    "next slide please",
    "we're at time",
    "anyway",
    "where was I",
    "lost my train of thought",
    "choo choo",
    "nice shirt",
    "nice keyboard",
    "it's mechanical",
    "I can hear it from here",
    "clicky clicky",
    "lunch?",
    "tacos?",
    "always tacos",
    "is there cake?",
    "the cake is a lie",
    "weekend plans?",
    "sleep. mostly.",
    "touch grass",
    "what's grass",
    "read any good docs?",
    "docs? lol",
    "I wrote docs once",
    "nobody read them",
    "my plant is thriving",
    "mine died",
    "it was plastic",
    "how?",
    "I have a theory",
    "it's aliens",
    "it's always aliens",
    "pair on it?",
    "rubber duck it",
    "the duck knows",
    "I talked to the duck",
    "the duck said no",
    "100% coverage",
    "of one file",
    "it's a monorepo",
    "it's a mono-mess",
    "merge conflict again",
    "I chose 'theirs'",
    "bold",
    "rebase or merge?",
    "yes",
    "regex time",
    "now two problems"
  ];
  var CHAT_EXCHANGES = [
    ["knock knock", "who's there?"],
    ["tabs or spaces?", "don't start"],
    ["did you push?", "\u2026define push"],
    ["who broke the build?", "not me"],
    ["coffee?", "always"],
    ["lunch?", "yes. now."],
    ["is it Friday?", "spiritually"],
    ["you look tired", "I'm a dev"],
    ["can I ask a dumb question?", "my favorite kind"],
    ["it works!", "don't touch it"],
    ["I'm refactoring", "godspeed"],
    ["got a minute?", "it's never a minute"],
    ["I fixed the bug", "which one?"],
    ["I love meetings", "blink twice"],
    ["hot take", "go on"],
    ["want to pair?", "pear \u{1F350}"],
    ["do you even lift?", "only exceptions"],
    ["what's a monad?", "nobody knows"],
    ["is this a bug?", "it's a surprise feature"],
    ["I'm in the zone", "don't let me break it"],
    ["deploy on Friday?", "absolutely not"],
    ["how's the backlog?", "load-bearing"],
    ["guess what", "chicken butt"],
    ["we should rewrite it", "we should not"],
    ["why is it slow?", "N+1"],
    ["git push --force?", "NO"],
    ["sudo make me a sandwich", "okay."],
    ["any blockers?", "only you"],
    ["ping", "pong"],
    ["marco", "polo"],
    ["it's a one-liner", "a 400 char one-liner"],
    ["did you test it?", "in prod"],
    ["where's the bug?", "between chair and keyboard"],
    ["what's the ETA?", "soon\u2122"]
  ];
  var SCENE_CHAT = {
    office: [
      "who moved my chair?",
      "printer's jammed again",
      "PC LOAD LETTER?!",
      "the cat clock is staring",
      "is the fridge clean?",
      "someone ate my yogurt",
      "it had my NAME on it",
      "AC's too cold",
      "AC's too hot",
      "fire drill again?",
      "nice view",
      "the elevator smells",
      "free bagels!",
      "the good mugs are gone",
      "who's on the couch?",
      "plant needs water"
    ],
    serverRoom: [
      "it's loud in here",
      "what?",
      "WHAT?",
      "so many blinky lights",
      "is that one smoking?",
      "rack 4 is humming",
      "don't trip on the cable",
      "which cable?",
      "all of them",
      "it's freezing",
      "feels like a fridge",
      "the fans!!",
      "label your cables",
      "who unplugged that?",
      "the server is the heater",
      "uptime: 400 days",
      "don't jinx it"
    ],
    forest: [
      "did you hear that?",
      "is that a bear?",
      "it's a stick",
      "the wifi is bad",
      "the vibes are good",
      "smells like pine",
      "mosquito!",
      "I'm one with nature",
      "nature has no outlets",
      "where's the trail?",
      "we're lost",
      "we're coding in a forest",
      "tree-shaking!",
      "binary tree?",
      "log file. get it?",
      "a real bug!",
      "this is my branch"
    ],
    field: [
      "so much sky",
      "sunscreen?",
      "is that a cow?",
      "the grass is green",
      "touched grass",
      "the breeze!",
      "hay fever\u2026",
      "nice day for it",
      "I'm a field engineer now",
      "cloud computing!",
      "it's an actual cloud",
      "how far is the fridge?",
      "picnic standup?",
      "farm to table code",
      "free-range functions"
    ],
    riverbed: [
      "smells like river",
      "my feet are wet",
      "rock skipping later?",
      "is the laptop waterproof?",
      "it is not",
      "data stream!",
      "upstream changes",
      "go with the flow",
      "the fish judge me",
      "it's very calming",
      "splash!",
      "stream processing",
      "who's fishing?",
      "found a cool rock",
      "pebble"
    ],
    cave: [
      "echo!",
      "echo\u2026 echo\u2026",
      "it's dark",
      "is that a dragon?",
      "don't wake it",
      "I see gold",
      "don't touch the gold",
      "bats?",
      "spelunking!",
      "deep in the stack",
      "no wifi down here",
      "dripping\u2026",
      "torch's running low",
      "dungeon crawl",
      "loot!",
      "roll for initiative"
    ],
    moon: [
      "one small commit",
      "the ping is 2.6 seconds",
      "low gravity!",
      "boing",
      "is that Earth?",
      "hi mom!",
      "it's so quiet",
      "where's the air?",
      "moon cheese?",
      "it's rock",
      "my helmet's foggy",
      "remote work, but further",
      "houston?",
      "space latency",
      "the view though",
      "zero G coffee",
      "I'm floating"
    ],
    beach: [
      "sand in my keyboard",
      "sunscreen?",
      "surf's up",
      "glare on my screen",
      "is that a crab?",
      "beach day!",
      "the tide's coming in",
      "wifi's bad out here",
      "salty air",
      "who brought snacks?",
      "sandcastle standup",
      "wave-driven development",
      "my laptop is hot",
      "shell scripting",
      "out of office. literally."
    ],
    snowfield: [
      "it's freezing",
      "my fingers!",
      "brr",
      "snow day!",
      "can't feel my toes",
      "is that a penguin?",
      "hot cocoa?",
      "snowball fight!",
      "frozen build",
      "the code froze",
      "cold start",
      "ice ice baby",
      "let it snow",
      "a cold deploy",
      "who left the door open?"
    ],
    desert: [
      "it's so hot",
      "water?",
      "is that a mirage?",
      "dry spell",
      "sand everywhere",
      "my laptop is melting",
      "tumbleweed\u2026",
      "where's the shade?",
      "it's a dry heat",
      "cactus!",
      "heatwave deploy",
      "hot fix!",
      "the CPU is cooking",
      "camel case",
      "thirsty"
    ],
    reef: [
      "blub",
      "is my laptop waterproof?",
      "fish!",
      "deep dive",
      "it's so blue",
      "bubbles!",
      "the coral!",
      "swim lane",
      "under the sea",
      "low latency, high pressure",
      "sea-plus-plus",
      "stay hydrated",
      "watch the jellies",
      "I'm a deep-sea dev",
      "nice reef"
    ],
    library: [
      "shhh",
      "SHHH",
      "the books!",
      "overdue",
      "so quiet",
      "read the docs",
      "RTFM",
      "where's the manual?",
      "that one flew",
      "dewey decimal",
      "library code!",
      "checked out",
      "no talking",
      "nice reading nook",
      "the docs are outdated"
    ],
    rooftop: [
      "nice view",
      "it's windy",
      "don't look down",
      "pigeons!",
      "sunset standup",
      "the city!",
      "is that a helicopter?",
      "rooftop deploy",
      "top-level code",
      "high availability",
      "cloud computing!",
      "who's grilling?",
      "my notes blew away",
      "good signal up here",
      "up on the roof"
    ]
  };
  var TYPING_LINES = [
    "{ }",
    "</>",
    "=>",
    "[ ]",
    "0x",
    "#!",
    "&&",
    ";",
    "//",
    "++",
    "!=",
    "===",
    "\u03BB",
    "()",
    "**",
    "::",
    "?.",
    "??",
    "hmm",
    "huh",
    "wait",
    "why",
    "oh no",
    "oh yes",
    "ahh",
    "ok ok ok",
    "it compiles!",
    "it runs!",
    "it\u2026 ran?",
    "one more test",
    "almost\u2026",
    "where's that semicolon",
    "console.log('here')",
    "console.log('here2')",
    "why is this null",
    "undefined?!",
    "who wrote this",
    "me. I wrote this",
    "TODO",
    "FIXME",
    "// don't touch",
    "rm -rf node_modules",
    "npm install\u2026",
    "still installing",
    "works locally",
    "stack overflow it",
    "regex\u2026",
    "it's a one-liner",
    "refactor!",
    "delete delete delete",
    "-200 lines",
    "+3000 lines",
    "git commit -m 'stuff'",
    "wip",
    "wip2",
    "final_final",
    "ctrl+z ctrl+z",
    "save. save!",
    "*clack clack*",
    "*types furiously*",
    "yes YES",
    "flow state",
    "beep boop"
  ];
  var MUSE_LINES = {
    drink: [
      "\u2615",
      "ahh",
      "sip",
      "*slurp*",
      "coffee #4",
      "coffee #5",
      "this is decaf?!",
      "who made this",
      "liquid code",
      "hydrate!",
      "just water",
      "it's cold",
      "needs more sugar",
      "mmm",
      "fuel",
      "caffeine: online"
    ],
    couch: [
      "comfy",
      "5 min nap",
      "*sinks in*",
      "I live here now",
      "never getting up",
      "this couch knows me",
      "zz\u2026 no",
      "thinking. not napping.",
      "deep thoughts",
      "*scrolls phone*",
      "lol",
      "ok one more video",
      "found a coin"
    ],
    sit: [
      "hmm",
      "\u2026",
      "thinking",
      "waiting on CI",
      "CI's slow",
      "waiting on review",
      "any second now",
      "*spins chair*",
      "wheee",
      "*leans back*",
      "did I lock my screen?",
      "what was I doing",
      "let it cook",
      "it's compiling"
    ],
    stretch: [
      "*stretch*",
      "*crack*",
      "ow my back",
      "posture check",
      "*yawn*",
      "need a walk",
      "my legs!",
      "*pop*",
      "ergonomics",
      "ahh",
      "I'm 30 going on 80"
    ],
    loiter: [
      "la la la",
      "\u266A",
      "\u266A\u266B",
      "*whistles*",
      "hmm",
      "where was I going",
      "why'd I come here",
      "nice floor",
      "just walking",
      "steps!",
      "10k steps",
      "lap 3",
      "patrolling",
      "*wanders*",
      "anyone seen my mug?",
      "what's this",
      "ooh"
    ]
  };
  var BREAK_LINES = [
    "brb",
    "coffee?",
    "\u2615",
    "stretch",
    "\u2026",
    "sup",
    "break time",
    "need a walk",
    "5 min",
    "eyes hurt",
    "snack run",
    "touching grass",
    "brain's full",
    "one sec",
    "AFK",
    "let it build",
    "who's around?"
  ];
  var BACK_LINES = [
    "ok ok",
    "back to it",
    "\u266A",
    "\u2026",
    "alright",
    "focus",
    "where was I",
    "refreshed",
    "let's go",
    "round 2",
    "back!",
    "time to ship",
    "ok, for real now"
  ];
  var RUSH_LINES = ["!", "!", "!", "oh!", "on it!", "coming!", "new prompt!", "brb!", "gotta go", "!!", "work!"];
  var SLEEP_LINES = ["*yawn*", "*yawn*", "5 more min", "nap time", "zzz\u2026", "night", "suspended\u2026", "brb (sleep)"];
  var WAKE_TO_WORK_LINES = ["!?", "huh?!", "I'm up!", "wasn't sleeping", "what'd I miss", "!", "on it!"];
  var WAKE_IDLE_LINES = ["~", "*yawn*", "mm?", "huh", "morning", "*blinks*", "\u2026"];
  var CREW_START_LINES = [
    "comin' through!",
    "mind your backs",
    "desk delivery",
    "where's this one go?",
    "watch the corners",
    "beep beep",
    "heavy load!",
    "make way!",
    "who ordered a desk?",
    "desk for\u2026? this guy?",
    "pivot!",
    "PIVOT!"
  ];
  var CREW_BUILD_LINES = [
    "*clank*",
    "*bonk bonk*",
    "*whirr*",
    "*tap tap*",
    "*screech*",
    "*drill*",
    "*clunk*",
    "where's the allen key",
    "extra screws?",
    "one leftover screw",
    "it's fine",
    "*hammer*"
  ];
  var CREW_DONE_LINES = [
    "all yours",
    "there ya go",
    "done!",
    "enjoy",
    "sturdy!",
    "don't lean on it",
    "warranty's void",
    "sign here",
    "five stars?",
    "good as new",
    "mostly level"
  ];
  var CREW_REMOVE_LINES = [
    "this one's going",
    "*grunt*",
    "outta here",
    "heavy one",
    "bye desk",
    "to the desk farm",
    "it had a good run",
    "anyone want a desk?",
    "found gum under it",
    "found a sandwich"
  ];
  var CREW_HELP_LINES = [
    "left a bit",
    "lift with your legs",
    "careful!",
    "little more\u2026",
    "^_^",
    "looks good",
    "your left",
    "MY left",
    "is it level?",
    "close enough",
    "hold it",
    "steady\u2026",
    "*holds chair*",
    "nice"
  ];
  var CREW_NEVER_MIND_LINES = ["never mind", "wrong room?", "uh. ok.", "back it goes", "*sigh*"];
  var WAIT_LINES = [
    "desk?",
    "\u2026",
    "any minute now",
    "*taps foot*",
    "I'll stand",
    "standing desk, I guess",
    "is it coming?",
    "I can work from the floor",
    "laptop on knees",
    "hello? desk?",
    "first day vibes"
  ];
  var THANKS_LINES = ["thanks!", "finally", "nice", "\u266A", "my desk!", "home sweet desk", "<3", "smells new"];
  function chatPhrase(scene, random2) {
    const roll = random2();
    if (roll < 0.4) {
      const count = 1 + Math.floor(random2() * 3);
      return Array.from({ length: count }, () => pickPhrase(CHATTER_SYMBOLS, random2)).join(" ");
    }
    if (scene !== void 0 && roll < 0.6) {
      return pickPhrase(SCENE_CHAT[scene], random2);
    }
    return pickPhrase(CHAT_LINES, random2);
  }
  var EXCHANGE_ANSWERS = new Map(CHAT_EXCHANGES.map(([line, answer]) => [line, answer]));
  function exchangeAnswer(line) {
    return EXCHANGE_ANSWERS.get(line);
  }
  function pickExchange(random2) {
    return CHAT_EXCHANGES[Math.min(CHAT_EXCHANGES.length - 1, Math.floor(random2() * CHAT_EXCHANGES.length))][0];
  }

  // src/officePerformances.ts
  var PERFORMANCE_KINDS = ["guitarist", "band", "lunch", "snacks", "comedian", "magician", "dj"];
  var FOOD_NAMES = {
    pizza: "pizza",
    taco: "tacos",
    burger: "burgers",
    sushi: "sushi",
    donut: "donuts",
    cookie: "cookies",
    iceCream: "ice cream",
    popcorn: "popcorn"
  };
  var PERFORMANCES = {
    guitarist: { id: "guitarist", label: "Guitarist", effect: "notes", roles: ["guitar"], length: [45, 70] },
    band: { id: "band", label: "Band", effect: "notes", roles: ["singer", "guitar", "bass", "drums"], length: [55, 85] },
    lunch: { id: "lunch", label: "Lunch", effect: "food", roles: ["cart"], length: [40, 60] },
    snacks: { id: "snacks", label: "Snack Cart", effect: "food", roles: ["cart"], length: [30, 45] },
    comedian: { id: "comedian", label: "Comedian", effect: "spotlight", roles: ["comic"], length: [50, 75] },
    magician: { id: "magician", label: "Magician", effect: "sparkles", roles: ["magician"], length: [45, 65] },
    dj: { id: "dj", label: "Dance Party", effect: "disco", roles: ["dj"], length: [45, 70] }
  };
  var ROLE_OUTFITS = {
    guitar: { shirt: "#2B2B2B", pants: "#3A4A6B", accessory: "none" },
    singer: { shirt: "#B0303A", pants: "#1D1D1D", accessory: "none", tie: "#F1C24B" },
    bass: { shirt: "#5E3A8C", pants: "#2B2D42", accessory: "none" },
    drums: { shirt: "#F3A712", pants: "#2F3A4A", accessory: "headphones", accessoryColor: "#222831" },
    cart: { shirt: "#F4F4F4", pants: "#2E2E2E", accessory: "none" },
    comic: { shirt: "#3B5BA5", pants: "#22252E", accessory: "glasses", accessoryColor: "#222831" },
    magician: { shirt: "#141620", pants: "#141620", accessory: "none", tie: "#C0392B" },
    dj: { shirt: "#12B886", pants: "#1F1F24", accessory: "headphones", accessoryColor: "#F06595" }
  };
  var BAND_NAMES = ["Merge Conflict", "The Null Pointers", "Stack Overflow", "Segfault", "The Hotfixes", "Kernel Panic", "Off By One", "The Race Conditions"];
  var DJ_NAMES = ["DJ Null", "DJ Segfault", "DJ Byte", "DJ Cache", "DJ Lambda", "DJ 404"];
  var MAGICIAN_NAMES = ["The Great Zippo", "Mysterio the Magnificent", "The Amazing Regex", "Dave the Wizard"];
  var GUITARIST_NAMES = ["Busker", "Folk Singer", "Guitarist"];
  var COMIC_NAMES = ["Comedian", "Open Mic Guy", "Stand-up Comic"];
  var LUNCH_MENU = ["pizza", "taco", "burger", "sushi"];
  var SNACK_MENU = ["donut", "cookie", "iceCream", "popcorn"];
  var GUITAR_LINES = [
    "\u266A la la la \u266A",
    "Any requests?",
    "No, not Wonderwall.",
    "This one's an original.",
    "\u266A my code compiles\u2026 \u266A",
    "\u266A \u2026on the first try \u266A",
    "This one's about a merge conflict.",
    "\u266A ooh, rebase me baby \u266A",
    "Thank you, thank you.",
    "\u266A git push, git pull \u266A",
    "This next one's sad. It's about Jira.",
    "\u266A it works on my machine \u266A",
    "\u266A sudo make me a sandwich \u266A"
  ];
  var BAND_LINES = [
    "\u266A Push it to prod! \u266A",
    "\u266A It works on my machine! \u266A",
    "This next one's a ballad.",
    "\u266A Oh, rebase, my rebase \u266A",
    "\u266A Ninety-nine bugs in the code \u266A",
    "\u266A Take one down, patch it around \u266A",
    "Bass solo!",
    "Drum solo!",
    "\u266A Hello, world \u266A",
    "\u266A Don't stop deployin' \u266A",
    "\u266A We will, we will, mock you \u266A",
    "This one's off our new EP.",
    "\u266A Sweet child of mine (#42) \u266A"
  ];
  var DJ_LINES = [
    "Hands up!",
    "This one's called 'Merge to Main'!",
    "Drop the beat!",
    "Left side, make some noise!",
    "Right side!",
    "Bass is dropping in 3\u2026 2\u2026",
    "Everybody, jump!",
    "Remix of the build server!",
    "This track compiles!",
    "One more time!"
  ];
  var MAGIC_TRICKS = [
    [{ text: "Pick a card. Any card." }, { text: "\u2026is this your card?", cue: "gasp" }],
    [{ text: "Nothing up my sleeve\u2026" }, { text: "Abracadabra!", cue: "gasp" }, { text: "Ta-da!", cue: "applause" }],
    [{ text: "For my next trick, I'll make this bug disappear." }, { text: "\u2026and now it's in production.", cue: "laugh" }],
    [{ text: "I will now saw a laptop in half." }, { text: "Don't worry, it's IT's.", cue: "laugh" }],
    [{ text: "Watch the rabbit\u2026" }, { text: "Presto!", cue: "gasp" }],
    [{ text: "Think of a number\u2026" }, { text: "It's 42!", cue: "gasp" }],
    [{ text: "I'll now pull a feature out of this hat." }, { text: "Oh no, it's scope creep.", cue: "laugh" }]
  ];
  var JOKES = [
    ["Why do programmers prefer dark mode?", "Because light attracts bugs!"],
    ["How many devs to change a light bulb?", "None. That's a hardware problem."],
    ["I'd tell you a UDP joke\u2026", "\u2026but you might not get it."],
    ["Why did the dev go broke?", "He used up all his cache!"],
    ["A SQL query walks into a bar\u2026", "\u2026sees two tables: 'Can I join you?'"],
    ["There are 10 kinds of people.", "Those who get binary, and those who don't."],
    ["Knock knock.", "Race condition. Who's there?"],
    ["I asked the AI to fix my bug.", "Now I have three bugs and a poem."],
    ["Why was the function sad?", "Nobody called it back."],
    ["Debugging is like a crime movie\u2026", "\u2026where you're also the murderer."],
    ["My code works and I don't know why.", "My code broke and I don't know why."],
    ["What's a pirate's favorite language?", "You'd think R, but it's the C!"],
    ["I named my dog 'Five Minutes'.", "Now I tell everyone the build takes Five Minutes."],
    ["Why do Java devs wear glasses?", "Because they don't C#!"],
    ["Our standup is like my standup.", "Too long, and nobody laughs."],
    ["Two bytes meet.", "One asks: 'Are you ill?' 'No, just feeling a bit off.'"]
  ];
  var LUNCH_LINES = [
    "Come and get it!",
    "Fresh {food}!",
    "One each. Okay, two.",
    "Busy ones, yours is on your desk!",
    "Hot {food}, coming through!",
    "Who ordered extra {food}?",
    "There's plenty!",
    "No pushing!",
    "Napkins are on the cart.",
    "Gluten-free on the left!"
  ];
  var SNACK_LINES = [
    "Snack time!",
    "Fresh {food}!",
    "Sugar rush incoming!",
    "Take two, I won't tell.",
    "Busy ones, I left some on your desk!",
    "Who wants {food}?",
    "Last batch!",
    "Sprinkles are extra. Kidding!"
  ];
  function planPerformance(random2, kind = pick(PERFORMANCE_KINDS, random2)) {
    const spec = PERFORMANCES[kind];
    const length = spec.length[0] + random2() * (spec.length[1] - spec.length[0]);
    switch (kind) {
      case "guitarist": {
        const title = pick(GUITARIST_NAMES, random2);
        return {
          kind,
          title,
          titles: [title],
          length,
          food: [],
          lines: [{ text: "This one's for the night shift.", cue: "cheer" }, ...sample(GUITAR_LINES, 5, random2).map((text) => ({ text }))],
          closer: { text: "You've been great! Tip jar's by the door.", cue: "applause" }
        };
      }
      case "band": {
        const name = pick(BAND_NAMES, random2);
        return {
          kind,
          title: `Band: ${name}`,
          titles: [`${name}: vocals`, `${name}: guitar`, `${name}: bass`, `${name}: drums`],
          length,
          food: [],
          lines: [
            { text: `We're ${name}! One, two, three, four!`, cue: "cheer" },
            ...sample(BAND_LINES, 5, random2).map((text) => ({ text })),
            { text: "Make some noise!", cue: "cheer" }
          ],
          closer: { text: "Goodnight, office!", cue: "cheer" }
        };
      }
      case "lunch":
      case "snacks": {
        const food = sample(kind === "lunch" ? LUNCH_MENU : SNACK_MENU, 2, random2);
        const name = FOOD_NAMES[food[0]];
        const title = kind === "lunch" ? "Lunch Lady" : "Snack Cart";
        return {
          kind,
          title,
          titles: [title],
          length,
          food,
          lines: [
            { text: kind === "lunch" ? `Lunch is served! ${capitalize(name)} today!` : `Snack cart! ${capitalize(name)}!`, cue: "cheer" },
            ...sample(kind === "lunch" ? LUNCH_LINES : SNACK_LINES, 4, random2).map((text) => ({ text: text.replace("{food}", FOOD_NAMES[pick(food, random2)]) }))
          ],
          closer: { text: kind === "lunch" ? "Enjoy! Trays back on the cart!" : "That's all, folks!", cue: "applause" }
        };
      }
      case "comedian": {
        const title = pick(COMIC_NAMES, random2);
        return {
          kind,
          title,
          titles: [title],
          length,
          food: [],
          lines: [
            { text: "Is this thing on?" },
            ...sample(JOKES, 4, random2).flatMap(([setup, punchline]) => [{ text: setup }, { text: punchline, cue: "laugh" }])
          ],
          closer: { text: "You've been a great crowd! Tip your QA!", cue: "applause" }
        };
      }
      case "magician": {
        const title = pick(MAGICIAN_NAMES, random2);
        return {
          kind,
          title,
          titles: [title],
          length,
          food: [],
          lines: [{ text: `Behold! ${title}!`, cue: "applause" }, ...sample(MAGIC_TRICKS, 3, random2).flat()],
          closer: { text: "Thank you! I'm here all week!", cue: "applause" }
        };
      }
      case "dj": {
        const title = pick(DJ_NAMES, random2);
        return {
          kind,
          title,
          titles: [title],
          length,
          food: [],
          lines: [{ text: `${title} in the house! Is everybody ready?!`, cue: "cheer" }, ...sample(DJ_LINES, 5, random2).map((text) => ({ text, cue: random2() < 0.5 ? "cheer" : void 0 }))],
          closer: { text: "Peace out, office!", cue: "cheer" }
        };
      }
    }
  }
  var CUE_LINES = {
    laugh: {
      any: ["HAHA", "lol", "HAHAHA", "*snort*", "lmao", "good one!", "hahaha", "*wheeze*"],
      suckUp: ["HAHAHA! Classic!", "So funny!", "Genius!"],
      grumbler: ["heh.", "*grudging chuckle*", "ok that's funny."],
      deadpan: ["haha. good.", "funny.", "lol."],
      snark: ["I've heard it.", "*snort* fine.", "boo! \u2026lol"],
      eager: ["HAHAHA!!", "I GET IT!", "again! again!"]
    },
    cheer: {
      any: ["WOOO!", "YEAH!", "woo!", "encore!", "\\o/", "let's go!", "WOOHOO!"],
      suckUp: ["Best show ever!", "WOOO!", "Amazing!"],
      grumbler: ["\u2026not bad.", "*nods*", "ok, ok."],
      deadpan: ["woo.", "yay.", "nice."],
      snark: ["play Freebird!", "sellout!", "woo, I guess"],
      eager: ["WOOOOO!", "YEAAAH!", "AAAAH!"]
    },
    gasp: {
      any: ["whoa!", "how?!", "no way!", "!!", "magic!", "*gasp*"],
      suckUp: ["Incredible!", "How?!"],
      grumbler: ["it's a trick.", "*squints*"],
      deadpan: ["huh.", "neat."],
      snark: ["up his sleeve.", "saw that coming."],
      eager: ["HOW?!", "DO IT AGAIN!"]
    },
    applause: {
      any: ["*clap clap*", "bravo!", "encore!", "*claps*", "*applause*"],
      suckUp: ["Bravo! Bravo!", "*standing ovation*"],
      grumbler: ["*slow clap*", "*polite clap*"],
      deadpan: ["*clap.*", "*clap*"],
      snark: ["*slow clap*", "*sarcastic clap*"],
      eager: ["*CLAP CLAP CLAP*", "ENCORE!"]
    }
  };
  var IDLE_LINES = {
    notes: ["\u266A", "\u266A\u266A", "*bobs head*", "*dances*", "this slaps", "banger", "*air guitar*", "\u266A la la \u266A"],
    disco: ["\u266A", "*dances*", "*robot*", "*moonwalks*", "woo!", "*the floss*", "this slaps", "*sprinkler*"],
    food: ["nom", "nom nom", "mmm!", "so good", "*munch*", "best {food} ever", "*crunch*", "seconds?"],
    spotlight: ["hehe", "*sips*", "heh", "*listens*"],
    sparkles: ["how\u2026", "*watches closely*", "ooh", "hmm\u2026"]
  };
  var SLEEPY_LINES = ["*yawn*", "wha\u2014? oh, nice.", "zz\u2026 \u266A \u2026zz", "is it lunch?", "*rubs eyes*"];
  function audienceLine(kind, cue, personality, asleep, random2, food) {
    if (asleep && random2() < 0.3) {
      return pick(SLEEPY_LINES, random2);
    }
    if (cue === "idle") {
      return pick(IDLE_LINES[PERFORMANCES[kind].effect], random2).replace("{food}", food === void 0 ? "lunch" : FOOD_NAMES[food]);
    }
    const lines = CUE_LINES[cue];
    return random2() < 0.35 ? pick(lines[personality], random2) : pick(lines.any, random2);
  }
  var PERFORMANCE_FREQUENCIES = {
    rare: [30, 60],
    normal: [12, 25],
    often: [4, 8]
  };
  function performanceFrequency(value) {
    if (value === false) {
      return "off";
    }
    return value === "off" || typeof value === "string" && value in PERFORMANCE_FREQUENCIES ? value : "normal";
  }
  function performanceGap(random2, frequency = "normal", first = false) {
    const [low, high] = PERFORMANCE_FREQUENCIES[frequency];
    const minutes = first ? low * (0.4 + random2() * 0.6) : low + random2() * (high - low);
    return minutes * 60;
  }
  function isPerformanceKind(value) {
    return typeof value === "string" && PERFORMANCE_KINDS.includes(value);
  }
  function pick(list, random2) {
    return list[Math.min(list.length - 1, Math.floor(random2() * list.length))];
  }
  function sample(list, count, random2) {
    const pool = [...list];
    const result = [];
    while (result.length < count && pool.length > 0) {
      result.push(pool.splice(Math.min(pool.length - 1, Math.floor(random2() * pool.length)), 1)[0]);
    }
    return result;
  }
  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // src/pixelCanvas.ts
  var INNER_WIDTH = 10;
  var BODY_HEIGHT = 16;
  var HEAD_ROOM = 2;
  var INNER_HEIGHT = BODY_HEIGHT + HEAD_ROOM;
  function isStepping(pose) {
    return pose === "walk" || pose === "carry";
  }
  var Canvas = class _Canvas {
    cells = Array.from({ length: INNER_HEIGHT }, () => Array(INNER_WIDTH).fill(null));
    set(x, y, key) {
      const row = y + HEAD_ROOM;
      if (x >= 0 && row >= 0 && x < INNER_WIDTH && row < INNER_HEIGHT) {
        this.cells[row][x] = key;
      }
    }
    get(x, y) {
      return this.cells[y + HEAD_ROOM]?.[x] ?? null;
    }
    rect(x, y, width2, height2, key) {
      for (let row = y; row < y + height2; row++) {
        for (let column = x; column < x + width2; column++) {
          this.set(column, row, key);
        }
      }
    }
    // Calls back with each cell, in body coordinates (the head room is y < 0).
    each(visit) {
      this.cells.forEach((row, index) => row.forEach((key, x) => visit(key, x, index - HEAD_ROOM)));
    }
    // Swaps one key for another everywhere it's drawn, optionally only in some rows.
    recolor(from, to, fromY = -HEAD_ROOM, toY = BODY_HEIGHT - 1) {
      this.each((key, x, y) => {
        if (key === from && y >= fromY && y <= toY) {
          this.set(x, y, to);
        }
      });
    }
    mirrored() {
      const mirror = new _Canvas();
      this.each((key, x, y) => mirror.set(INNER_WIDTH - 1 - x, y, key));
      return mirror;
    }
  };
  function shadeHex(hex, factor) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (match === null) {
      return hex;
    }
    const value = parseInt(match[1], 16);
    const channels = [value >> 16 & 255, value >> 8 & 255, value & 255].map(
      (channel) => Math.max(0, Math.min(255, Math.round(channel * factor)))
    );
    return "#" + channels.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function mixHex(first, second, amount) {
    const parse = (hex) => {
      const match = /^#([0-9a-f]{6})$/i.exec(hex);
      return match === null ? void 0 : [16, 8, 0].map((shift) => parseInt(match[1], 16) >> shift & 255);
    };
    const from = parse(first);
    const to = parse(second);
    if (from === void 0 || to === void 0) {
      return first;
    }
    return "#" + from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount).toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  // src/pixelRaces.ts
  var RACE_IDS = [
    "human",
    "orc",
    "goblin",
    "elf",
    "darkElf",
    "dwarf",
    "greyAlien",
    "greenAlien",
    "demon",
    "vampire",
    "zombie",
    "skeleton",
    "troll",
    "gnome",
    "fae",
    "undine",
    "lizardfolk",
    "catfolk",
    "wolffolk",
    "minotaur",
    "robot",
    "cyclops",
    "squidfolk",
    "mushroom",
    "golem",
    "ghost",
    "slime",
    "dryad",
    "jackalfolk",
    "harpy",
    "centaur",
    "naga",
    "merfolk",
    "satyr",
    "dragonkin",
    "ogre"
  ];
  var HUMAN_SKINS = ["#F9D4B4", "#EDB98A", "#D08B5B", "#AE5D29", "#8D4A28", "#614335"];
  var HUMAN_HAIRS = ["#2C1B12", "#5A3825", "#A0522D", "#D9A441", "#E8D9A0", "#B8B8B8", "#E2504B", "#2E2E2E"];
  var BALD = ["bald"];
  var HATLESS = ["cap", "headphones"];
  var BEARDLESS = ["beard", "fullBeard"];
  var IVORY = "#F2EAD3";
  var BONE = "#E8DCC0";
  var GOLD = "#E8B931";
  var DARK = "#1A1A22";
  function both(canvas2, points2, key) {
    for (const [x, y] of points2) {
      canvas2.set(x, y, key);
      canvas2.set(9 - x, y, key);
    }
  }
  function points(canvas2, list, key) {
    for (const [x, y] of list) {
      canvas2.set(x, y, key);
    }
  }
  function sway(view) {
    return isStepping(view.pose) ? view.step === 1 ? -1 : view.step === 3 ? 1 : 0 : 0;
  }
  function clearLegs(canvas2, fromY = 13) {
    canvas2.rect(0, fromY, 10, 16 - fromY, null);
  }
  function pointedEars(canvas2, view) {
    if (view.side === "side") {
      points(canvas2, [[4, 3], [3, 2], [2, 1]], "skin");
      canvas2.set(4, 4, "skinShade");
      return;
    }
    both(canvas2, [[1, 3], [1, 2], [0, 1]], "skin");
  }
  function topEars(canvas2, view, tall, inner) {
    if (view.side === "side") {
      points(canvas2, [[4, 0], [5, 0], [4, -1]], "skin");
      if (tall) {
        canvas2.set(4, -2, "skin");
      }
      return;
    }
    both(canvas2, [[2, 0], [3, 0], [2, -1]], "skin");
    if (tall) {
      both(canvas2, [[2, -2]], "skin");
    }
    if (inner !== void 0 && view.side === "front") {
      both(canvas2, [[2, 0]], inner);
    }
  }
  function snout(canvas2, view, muzzle, nose) {
    if (view.side === "side") {
      canvas2.rect(8, 4, 2, 2, muzzle);
      canvas2.set(9, 4, nose);
      return;
    }
    if (view.side === "front") {
      canvas2.rect(3, 5, 4, 2, muzzle);
      canvas2.rect(4, 5, 2, 1, nose);
    }
  }
  function tusks(canvas2, view) {
    if (view.side === "front") {
      both(canvas2, [[3, 5]], "markA");
    } else if (view.side === "side") {
      canvas2.set(8, 5, "markA");
    }
  }
  function tail(canvas2, view, key, tip) {
    const swing = sway(view);
    if (view.side === "side") {
      points(canvas2, [[2, 11], [1, 12], [0, 12 + swing]], key);
      if (tip !== void 0) {
        canvas2.set(0, 13 + swing, tip);
      }
    } else if (view.side === "back") {
      points(canvas2, [[5, 12], [6, 13], [7 + swing, 14]], key);
      if (tip !== void 0) {
        canvas2.set(8 + swing, 14, tip);
      }
    } else {
      points(canvas2, [[9, 11 + swing], [9, 10 + swing]], key);
      if (tip !== void 0) {
        canvas2.set(9, 9 + swing, tip);
      }
    }
  }
  function wings(canvas2, view, membrane, edge) {
    if (view.side === "back") {
      both(canvas2, [[0, 6], [0, 7], [0, 8], [0, 9], [1, 6], [1, 7], [1, 8]], membrane);
      both(canvas2, [[0, 5], [1, 5], [0, 10]], edge);
    } else if (view.side === "front") {
      both(canvas2, [[0, 5], [0, 6], [0, 7]], membrane);
      both(canvas2, [[0, 4]], edge);
    } else {
      canvas2.rect(1, 6, 2, 5, membrane);
      points(canvas2, [[2, 5], [1, 5], [0, 7]], edge);
    }
  }
  function centaurBody(canvas2, view) {
    const swing = sway(view);
    const hands = [0, 1, 8, 9].filter((x) => canvas2.get(x, 11) === "skin");
    if (view.side === "side") {
      const hand = canvas2.get(5 + Math.max(-1, Math.min(1, swing)), 11) === "skin";
      clearLegs(canvas2, 10);
      canvas2.rect(3, 10, 4, 1, "shirtShade");
      if (view.seated) {
        canvas2.rect(1, 11, 7, 3, "markA");
        canvas2.rect(1, 14, 7, 1, "markAShade");
        points(canvas2, [[2, 15], [3, 15], [6, 15], [7, 15]], "markB");
        points(canvas2, [[0, 11], [0, 12], [0, 13]], "hair");
        return;
      }
      canvas2.rect(1, 11, 8, 2, "markA");
      canvas2.rect(1, 13, 8, 1, "markAShade");
      canvas2.set(8, 11, "markAShade");
      const front = 7 + swing;
      const back = 2 - swing;
      canvas2.rect(front, 14, 1, 1, "markA");
      canvas2.rect(back, 14, 1, 1, "markAShade");
      canvas2.set(front - 1, 14, "markAShade");
      canvas2.set(back + 1, 14, "markA");
      canvas2.rect(front - 1, 15, 2, 1, "markB");
      canvas2.rect(back, 15, 2, 1, "markB");
      points(canvas2, [[0, 11], [0, 12], [0, 13], [0, 14 - Math.abs(swing)]], "hair");
      if (hand) {
        canvas2.set(5, 10, "skin");
      }
      return;
    }
    clearLegs(canvas2, 11);
    canvas2.rect(1, 11, 8, 2, "markA");
    canvas2.rect(2, 13, 6, 1, "markAShade");
    hands.forEach((x) => canvas2.set(x, 10, "skin"));
    if (view.seated) {
      canvas2.rect(1, 13, 8, 1, "markA");
      both(canvas2, [[1, 14], [2, 14], [3, 14]], "markB");
    } else {
      const leftUp = isStepping(view.pose) && view.step === 1;
      const rightUp = isStepping(view.pose) && view.step === 3;
      canvas2.rect(2, 14, 2, leftUp ? 0 : 1, "markA");
      canvas2.rect(6, 14, 2, rightUp ? 0 : 1, "markA");
      canvas2.rect(2, leftUp ? 14 : 15, 2, 1, "markB");
      canvas2.rect(6, rightUp ? 14 : 15, 2, 1, "markB");
    }
    if (view.side === "back") {
      points(canvas2, [[4, 11], [4, 12], [5, 12], [4, 13], [5, 13], [5, 14 + Math.abs(swing)]], "hair");
    }
  }
  function nagaBody(canvas2, view) {
    const swing = sway(view);
    if (view.side === "side") {
      clearLegs(canvas2, 12);
      canvas2.rect(3, 12, 4, 1, "markA");
      canvas2.rect(4, 13, 4, 1, "markA");
      canvas2.rect(3 + swing, 14, 6, 1, "markA");
      canvas2.rect(1 - swing, 15, 8, 1, "markAShade");
      points(canvas2, [[6, 12], [7, 13]], "markB");
      canvas2.set(0, 15 - (swing === 0 ? 0 : 1), "markAShade");
      return;
    }
    clearLegs(canvas2, 12);
    canvas2.rect(2, 12, 6, 1, "markA");
    canvas2.rect(3, 13, 4, 1, "markA");
    canvas2.rect(2 + swing, 14, 6, 1, "markA");
    canvas2.rect(1 + swing, 15, 8, 1, "markAShade");
    if (view.side === "front") {
      canvas2.rect(4, 12, 2, 2, "markB");
    } else {
      canvas2.set(9, 15, "markAShade");
    }
  }
  function merfolkBody(canvas2, view) {
    const swing = sway(view);
    clearLegs(canvas2, 12);
    if (view.side === "side") {
      canvas2.rect(3, 12, 4, 1, "markA");
      canvas2.rect(4, 13, 3, 1, "markA");
      canvas2.rect(5, 14, 3, 1, "markAShade");
      points(canvas2, [[8, 13 + swing], [8, 14], [9, 15], [8, 15], [7, 15]], "markB");
      return;
    }
    canvas2.rect(2, 12, 6, 1, "markA");
    canvas2.rect(3, 13, 4, 1, "markA");
    canvas2.rect(4, 14, 2, 1, "markAShade");
    canvas2.rect(2 + swing, 15, 2, 1, "markB");
    canvas2.rect(6 + swing, 15, 2, 1, "markB");
    canvas2.rect(4 + swing, 15, 2, 1, "markAShade");
  }
  function satyrLegs(canvas2, view) {
    canvas2.recolor("pants", "markA", 13);
    canvas2.recolor("pantsShade", "markAShade", 13);
    canvas2.recolor("skin", "markA", 13, 14);
    canvas2.recolor("shoes", "markB");
    if (view.side === "side" && !view.seated && !isStepping(view.pose)) {
      clearLegs(canvas2, 13);
      canvas2.rect(4, 13, 2, 1, "markA");
      canvas2.rect(3, 14, 2, 1, "markAShade");
      canvas2.rect(4, 15, 2, 1, "markB");
    }
    canvas2.each((key, x, y) => {
      if (key === "markA" && y >= 13 && (x + y) % 2 === 0) {
        canvas2.set(x, y, "markAShade");
      }
      if (key === "markB" && canvas2.get(x, y - 1) === null && view.side !== "side") {
        canvas2.set(x, y - 1, "markAShade");
      }
    });
  }
  function sheet(canvas2, view) {
    for (const [from, to] of [["shirt", "skin"], ["shirtShade", "skinShade"], ["pants", "skinShade"], ["pantsShade", "skinShade"], ["sleeve", "skin"], ["sleeveShade", "skinShade"]]) {
      canvas2.recolor(from, to);
    }
    clearLegs(canvas2, 13);
    const left = view.side === "side" ? 3 : 2;
    const width2 = view.side === "side" ? 5 : 6;
    canvas2.rect(left, 13, width2, 1, "skin");
    const phase = view.step % 2;
    for (let x = left + phase; x < left + width2; x += 2) {
      canvas2.set(x, 14, "skinShade");
    }
  }
  function blob(canvas2, view) {
    const squish = isStepping(view.pose) && view.step % 2 === 1;
    clearLegs(canvas2, 13);
    canvas2.rect(1, 13, 8, 1, "skin");
    canvas2.rect(squish ? 1 : 0, 14, squish ? 8 : 10, 1, "skin");
    canvas2.rect(squish ? 1 : 0, 15, squish ? 8 : 10, 1, "skinShade");
    if (view.side !== "side") {
      both(canvas2, [[2, 1]], "markA");
      canvas2.set(2, 1, null);
      canvas2.set(7, 1, null);
      if (view.side === "front") {
        canvas2.set(3, 2, "markA");
      }
    } else {
      canvas2.set(3, 1, null);
      canvas2.set(6, 2, "markA");
    }
  }
  var RACES = [
    { id: "human", label: "Human" },
    {
      id: "orc",
      label: "Orc",
      skins: ["#6B8E3A", "#5A7D2E", "#7A9A4A", "#4E6B2A"],
      hairs: ["#1A1A1A", "#2C1B12", "#3B3B3B"],
      hairStyles: ["bald", "mohawk", "short", "long", "bun"],
      eyes: ["#C0392B", "#1A1A2E"],
      marks: [[IVORY], [IVORY], [IVORY]],
      size: "big",
      draw: (canvas2, view) => {
        tusks(canvas2, view);
        if (view.side === "front") {
          canvas2.rect(3, 3, 4, 1, "skinShade");
          both(canvas2, [[1, 3]], "skin");
        } else if (view.side === "side") {
          canvas2.rect(5, 3, 3, 1, "skinShade");
        }
      }
    },
    {
      id: "goblin",
      label: "Goblin",
      skins: ["#9DB84A", "#8FAE3E", "#A9C25A", "#7FA03A"],
      hairs: ["#2C1B12", "#4A3A2A", "#1A1A1A"],
      hairStyles: ["bald", "bald", "spiky", "mohawk"],
      eyes: ["#E8C12A", "#E04A2A"],
      marks: [["#C77A5A"], [IVORY], [IVORY]],
      size: "short",
      draw: (canvas2, view) => {
        if (view.side === "side") {
          points(canvas2, [[3, 3], [2, 2], [1, 1]], "skin");
          canvas2.set(2, 3, "skinShade");
          points(canvas2, [[8, 4], [9, 5], [8, 5]], "skin");
          return;
        }
        both(canvas2, [[1, 2], [1, 3], [0, 2], [0, 1]], "skin");
        both(canvas2, [[1, 3]], "markA");
      }
    },
    {
      id: "elf",
      label: "Elf",
      skins: ["#F9D4B4", "#EDB98A", "#F3E0C8", "#D08B5B"],
      hairs: ["#E8D9A0", "#F2E6C8", "#D9A441", "#2C1B12", "#A0522D", "#E8E8F0"],
      hairStyles: ["long", "long", "bob", "bun", "short"],
      eyes: ["#2E86AB", "#4CB944", "#1A1A2E"],
      draw: pointedEars
    },
    {
      id: "darkElf",
      label: "Dark Elf",
      skins: ["#6E5F86", "#5C4F73", "#7D6E94", "#4E4462"],
      hairs: ["#F2F2F2", "#D9D9E8", "#C8C8D8"],
      hairStyles: ["long", "long", "bob", "mohawk", "bun"],
      eyes: ["#E04A4A", "#F2A93B"],
      draw: pointedEars
    },
    {
      id: "dwarf",
      label: "Dwarf",
      hairs: ["#A0522D", "#E2504B", "#5A3825", "#D9A441", "#B8B8B8", "#2C1B12"],
      hairStyles: ["bald", "short", "long", "bun"],
      beard: true,
      size: "short",
      marks: [[GOLD], [GOLD], [GOLD]],
      draw: (canvas2, view) => {
        if (view.side === "front") {
          canvas2.set(4, 7, "markA");
        }
      }
    },
    {
      id: "greyAlien",
      label: "Grey Alien",
      skins: ["#A9B1B8", "#9AA3AA", "#B8C0C6", "#8E979E"],
      hairStyles: BALD,
      marks: [["#0B0B12"], ["#5A6A7A"], ["#0B0B12"]],
      blocks: [...HATLESS, ...BEARDLESS],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          canvas2.rect(3, -1, 4, 1, "skin");
          canvas2.rect(2, 0, 6, 1, "skin");
          canvas2.rect(2, 1, 1, 3, "skin");
          canvas2.set(8, 4, null);
          points(canvas2, [[6, 3], [7, 3], [7, 4]], "markA");
          canvas2.set(6, 4, "skin");
          canvas2.set(4, 6, null);
          return;
        }
        canvas2.rect(3, -1, 4, 1, "skin");
        canvas2.rect(2, 0, 6, 1, "skin");
        both(canvas2, [[1, 1], [1, 2], [1, 3]], "skin");
        canvas2.set(2, 6, null);
        if (view.side === "front") {
          canvas2.rect(3, 4, 4, 1, "skin");
          both(canvas2, [[2, 3], [3, 3], [3, 4]], "markA");
          canvas2.rect(4, 6, 2, 1, "skinShade");
          canvas2.set(3, 6, null);
          canvas2.set(6, 6, null);
        }
      }
    },
    {
      id: "greenAlien",
      label: "Green Alien",
      skins: ["#7BD389", "#5FC46F", "#8EE0A0", "#6CC9B0"],
      hairStyles: BALD,
      eyes: ["#1A1A2E", "#D7263D"],
      marks: [["#4E9A5B"], ["#F2E14C", "#F28FB8", "#7CF2E0"], ["#1A1A2E"]],
      blocks: ["cap", ...BEARDLESS],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          points(canvas2, [[5, 0], [6, -1]], "markA");
          canvas2.set(7, -2, "markB");
          points(canvas2, [[4, 0], [3, -1]], "markA");
          canvas2.set(3, -2, "markB");
          return;
        }
        both(canvas2, [[3, 0], [2, -1]], "markA");
        both(canvas2, [[2, -2]], "markB");
        if (view.side === "front") {
          canvas2.set(4, 3, "eye");
        }
      }
    },
    {
      id: "demon",
      label: "Demon",
      skins: ["#C0392B", "#A93226", "#D35445", "#8E2C48"],
      hairs: ["#1A1A1A", "#2C1B12", "#3B2142"],
      hairStyles: ["long", "short", "bob", "bald", "spiky"],
      eyes: ["#F5D04A"],
      marks: [[BONE, "#C9B8A0", "#F2E6C8"], ["#4A3A3A"], ["#8E2C48"]],
      blocks: ["cap"],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          points(canvas2, [[5, 0], [5, -1], [4, -2]], "markA");
        } else {
          both(canvas2, [[2, 0], [1, -1], [2, -2]], "markA");
        }
        tail(canvas2, view, "skinShade", "markA");
      }
    },
    {
      id: "vampire",
      label: "Vampire",
      skins: ["#EDE6E3", "#DCD6E0", "#F2ECEA"],
      hairs: ["#111111", "#2C1B12", "#3A3A4A", "#E8E8F0"],
      hairStyles: ["short", "short", "long", "bob"],
      eyes: ["#C0392B"],
      marks: [["#2A0F17", "#1A1A22"], ["#FFFFFF"], ["#8E1B2B"]],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          points(canvas2, [[2, 5], [2, 6], [3, 6], [2, 7]], "markA");
          canvas2.set(7, 6, "markB");
          return;
        }
        both(canvas2, [[2, 6], [1, 5], [1, 6], [1, 7]], "markA");
        if (view.side === "front") {
          both(canvas2, [[2, 7]], "markC");
          both(canvas2, [[4, 6]], "markB");
          if (view.hairStyle !== "bald") {
            canvas2.rect(4, 2, 2, 1, "hair");
          }
        } else {
          canvas2.rect(2, 6, 6, 1, "markA");
        }
      }
    },
    {
      id: "zombie",
      label: "Zombie",
      skins: ["#8FA67A", "#7E9670", "#9DAF8A", "#A0A88A"],
      hairs: ["#4A4A3A", "#6A5A4A", "#3A3A3A"],
      hairStyles: ["short", "long", "bald", "spiky"],
      marks: [["#E6E6D0"], ["#5A2A2A"], ["#6A7A5A"]],
      draw: (canvas2, view) => {
        if (view.side === "front") {
          canvas2.set(3, 4, "markA");
          canvas2.set(6, 4, "markB");
          canvas2.set(5, 2, "markC");
          canvas2.set(7, 11, "skin");
          canvas2.set(6, 10, "skin");
        } else if (view.side === "side") {
          canvas2.set(6, 4, "markA");
          canvas2.set(5, 11, "skin");
        }
      }
    },
    {
      id: "skeleton",
      label: "Skeleton",
      skins: ["#E8E4D4", "#DCD6C4", "#F0ECE0"],
      hairStyles: BALD,
      marks: [[DARK], ["#B8B2A0"], [DARK]],
      sleeveless: true,
      blocks: BEARDLESS,
      draw: (canvas2, view) => {
        if (view.side === "front") {
          canvas2.rect(3, 3, 1, 2, "markA");
          canvas2.rect(6, 3, 1, 2, "markA");
          canvas2.set(4, 5, "markB");
          canvas2.set(5, 5, "markB");
          [3, 5].forEach((x) => canvas2.set(x, 6, "markB"));
        } else if (view.side === "side") {
          canvas2.rect(6, 3, 1, 2, "markA");
          canvas2.set(8, 4, null);
          canvas2.set(7, 6, "markB");
          canvas2.set(5, 6, "markB");
        }
      }
    },
    {
      id: "troll",
      label: "Troll",
      skins: ["#7F9AA8", "#6E8B8F", "#8BA3A0", "#6A8A7A"],
      hairs: ["#3D6B4F", "#E2504B", "#2E2E2E", "#7C5CE0"],
      hairStyles: ["mohawk", "mohawk", "spiky", "long"],
      eyes: ["#F2C94C"],
      marks: [[IVORY], [IVORY], [IVORY]],
      size: "big",
      draw: (canvas2, view) => {
        if (view.side === "side") {
          points(canvas2, [[8, 4], [9, 4], [8, 5], [9, 5]], "skinShade");
          canvas2.set(7, 6, "markA");
          points(canvas2, [[3, 3], [2, 2]], "skin");
          return;
        }
        both(canvas2, [[1, 3], [0, 2]], "skin");
        if (view.side === "front") {
          canvas2.rect(4, 4, 2, 2, "skinShade");
          both(canvas2, [[3, 6]], "markA");
        }
      }
    },
    {
      id: "gnome",
      label: "Gnome",
      hairs: ["#F2F2F2", "#E8E8E0", "#B8B8B8"],
      hairStyles: ["bald", "short", "curly"],
      marks: [["#C0392B", "#2E86AB", "#4CB944", "#7950F2"], ["#F2F2F2"], ["#F2C94C"]],
      blocks: HATLESS,
      size: "short",
      draw: (canvas2, view) => {
        if (view.side === "side") {
          canvas2.rect(2, 0, 6, 2, "markA");
          canvas2.rect(3, -1, 4, 1, "markA");
          canvas2.rect(2, -2, 3, 1, "markA");
          canvas2.set(1, -2, "markA");
          canvas2.rect(5, 6, 3, 1, "markB");
          canvas2.set(7, 5, "markB");
          return;
        }
        canvas2.rect(1, 1, 8, 1, "markA");
        canvas2.rect(2, 0, 6, 1, "markA");
        canvas2.rect(3, -1, 4, 1, "markA");
        canvas2.rect(4, -2, 3, 1, "markA");
        canvas2.set(7, -2, "markA");
        if (view.side === "front") {
          canvas2.rect(3, 6, 4, 2, "markB");
          both(canvas2, [[2, 5], [3, 5]], "markB");
        }
      }
    },
    {
      id: "fae",
      label: "Fae",
      skins: ["#F7D6E6", "#D6F0E6", "#E3DCF7", "#FCE7C8"],
      hairs: ["#F28FB8", "#8FD3F2", "#B8F28F", "#F2E28F", "#C79BF2"],
      hairStyles: ["long", "bob", "curly", "bun", "spiky"],
      eyes: ["#7950F2", "#12B886", "#E64980"],
      marks: [["#CFEFFF", "#FFD6F0", "#E0FFD6"], ["#8FC9F2", "#F28FC9", "#9FE08F"], ["#FFF6A8"]],
      draw: (canvas2, view) => {
        wings(canvas2, view, "markA", "markB");
        canvas2.set(view.side === "side" ? 1 : 9, view.step % 2 === 0 ? 3 : 2, "markC");
      }
    },
    {
      id: "undine",
      label: "Undine",
      skins: ["#5DADE2", "#48C9B0", "#76D7EA", "#5B8DEF"],
      hairs: ["#1F618D", "#2E86C1", "#17A589", "#E8F8F5"],
      hairStyles: ["long"],
      eyes: ["#0B3D5C", "#E8F8FF"],
      marks: [["#F2FBFF"], ["#A8E6FF"], ["#F2FBFF"]],
      blocks: ["cap"],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          points(canvas2, [[4, -1], [5, -1], [6, -1], [7, 0], [3, -1]], "hair");
          points(canvas2, [[5, -2], [6, -2], [8, 0]], "markA");
          return;
        }
        points(canvas2, [[4, -1], [5, -1], [6, -1], [7, -1], [8, 0], [8, 1]], "hair");
        points(canvas2, [[5, -2], [6, -2], [7, -2], [9, 0]], "markA");
        if (view.side === "front") {
          canvas2.set(2, 7, "markB");
        }
      }
    },
    {
      id: "lizardfolk",
      label: "Lizardfolk",
      skins: ["#4E9A5B", "#3D8B6E", "#7A9A3A", "#8B6E3D"],
      hairStyles: BALD,
      eyes: ["#E8C12A", "#E07B2A"],
      marks: [["#C0392B", "#E8C12A", "#2E86AB"], ["#A8C77A"], [DARK]],
      blocks: ["cap", ...BEARDLESS],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          snout(canvas2, view, "skin", "markC");
          points(canvas2, [[3, 0], [5, 0], [2, 2], [2, 4]], "markA");
          canvas2.set(8, 5, "markB");
          canvas2.set(9, 5, "markB");
        } else {
          points(canvas2, [[4, 0], [5, 0], [4, -1]], "markA");
          if (view.side === "front") {
            canvas2.rect(3, 5, 4, 2, "markB");
            points(canvas2, [[4, 5], [5, 5]], "skinShade");
            points(canvas2, [[3, 2], [6, 2]], "skinShade");
          } else {
            points(canvas2, [[4, 2], [5, 4], [4, 6]], "markA");
          }
        }
        tail(canvas2, view, "skinShade");
      }
    },
    {
      id: "catfolk",
      label: "Catfolk",
      skins: ["#E8A15C", "#D9D2C5", "#8A8A8A", "#3A3A3A", "#C47A3A", "#F2E6D0"],
      hairs: ["#C47A3A", "#2E2E2E", "#E8D9A0", "#F2F2F2", "#8A8A8A"],
      hairStyles: ["short", "bob", "long", "spiky", "curly"],
      eyes: ["#7BC043", "#F2C94C", "#4FA3F7"],
      marks: [["#F2A6B8"], ["#F2F2F2"], ["#F2A6B8"]],
      blocks: BEARDLESS,
      draw: (canvas2, view) => {
        topEars(canvas2, view, false, "markA");
        if (view.side === "front") {
          both(canvas2, [[1, 5], [0, 4]], "markB");
          canvas2.set(4, 5, "markC");
        } else if (view.side === "side") {
          points(canvas2, [[9, 5], [8, 5]], "markB");
          canvas2.set(8, 4, "markC");
        }
        tail(canvas2, view, "skin", "skinShade");
      }
    },
    {
      id: "wolffolk",
      label: "Wolffolk",
      skins: ["#7D7D7D", "#A0A0A0", "#5A4A3A", "#3A3A3A", "#C9B79C"],
      hairs: ["#5A5A5A", "#3A3A3A", "#8A7A6A", "#D9D9D9"],
      hairStyles: ["short", "spiky", "long", "bald"],
      eyes: ["#F2A93B", "#F2E14C", "#4FA3F7"],
      marks: [["#E8E0D0", "#D9C9A8"], [DARK], ["#5A4A3A"]],
      blocks: BEARDLESS,
      draw: (canvas2, view) => {
        topEars(canvas2, view, true, void 0);
        snout(canvas2, view, "markA", "markB");
        tail(canvas2, view, "skinShade", "markA");
      }
    },
    {
      id: "minotaur",
      label: "Minotaur",
      skins: ["#6B4E3D", "#4A3528", "#8B6E4E", "#2E2E2E", "#A0703A"],
      hairStyles: BALD,
      eyes: ["#1A1A2E", "#C0392B"],
      marks: [[BONE], ["#C9A68A", "#B8957A"], [GOLD]],
      blocks: [...HATLESS, ...BEARDLESS],
      size: "big",
      draw: (canvas2, view) => {
        if (view.side === "side") {
          points(canvas2, [[4, 1], [5, 0], [6, -1], [7, -1]], "markA");
          canvas2.rect(8, 4, 2, 2, "markB");
          canvas2.set(9, 4, DARK_KEY);
          canvas2.set(9, 6, "markC");
          canvas2.set(3, 2, "skin");
          return;
        }
        both(canvas2, [[1, 1], [0, 0], [0, -1], [1, -2]], "markA");
        both(canvas2, [[1, 2]], "skin");
        if (view.side === "front") {
          canvas2.rect(3, 5, 4, 2, "markB");
          both(canvas2, [[4, 5]], DARK_KEY);
          canvas2.rect(4, 7, 2, 1, "markC");
        }
      }
    },
    {
      id: "robot",
      label: "Robot",
      skins: ["#B0B8C0", "#8E9AA6", "#C9A86B", "#6E7F8E", "#D9DEE3"],
      hairStyles: BALD,
      marks: [["#4FE3F7", "#7CF27C", "#F25C5C", "#F2C94C"], ["#3A3F48"], ["#E63946"]],
      blocks: ["cap", ...BEARDLESS],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          canvas2.set(3, 6, "skin");
          canvas2.set(8, 4, null);
          canvas2.set(7, 4, "markA");
          canvas2.set(6, 4, "skin");
          points(canvas2, [[5, 0], [5, -1]], "markB");
          canvas2.set(5, -2, "markC");
          canvas2.set(4, 3, "skinShade");
          return;
        }
        canvas2.set(2, 6, "skin");
        canvas2.set(7, 6, "skin");
        points(canvas2, [[4, 0], [4, -1]], "markB");
        canvas2.set(4, -2, "markC");
        both(canvas2, [[1, 3], [1, 4]], "markB");
        if (view.side === "front") {
          canvas2.rect(3, 4, 4, 1, "markB");
          both(canvas2, [[3, 4]], "markA");
          [3, 5].forEach((x) => canvas2.set(x, 6, "skinShade"));
          canvas2.rect(3, 6, 4, 1, "skinShade");
          [4, 6].forEach((x) => canvas2.set(x, 6, "markB"));
        }
      }
    },
    {
      id: "cyclops",
      label: "Cyclops",
      skins: ["#9BB6D6", "#D08B5B", "#EDB98A", "#8DA77A", "#B88A6A"],
      hairs: HUMAN_HAIRS,
      hairStyles: ["bald", "short", "curly", "mohawk"],
      marks: [["#FFFFFF"], ["#1A1A2E"], ["#4C6EF5", "#4CB944", "#A0522D"]],
      blocks: ["glasses"],
      size: "big",
      draw: (canvas2, view) => {
        if (view.side === "front") {
          canvas2.set(3, 4, "skin");
          canvas2.set(6, 4, "skin");
          canvas2.rect(4, 3, 2, 2, "markA");
          canvas2.set(4, 4, "markC");
          canvas2.set(5, 4, "markB");
          canvas2.rect(3, 2, 4, 1, "skinShade");
        } else if (view.side === "side") {
          canvas2.rect(6, 3, 2, 2, "markA");
          canvas2.set(7, 4, "markB");
          canvas2.set(6, 4, "markA");
        }
      }
    },
    {
      id: "squidfolk",
      label: "Squidfolk",
      skins: ["#9B6BB3", "#7B5BA0", "#5FA8A0", "#C77DA8"],
      hairStyles: BALD,
      eyes: ["#F5E663", "#FFFFFF"],
      marks: [["#6A4A80", "#4A7A74"], [DARK], ["#E8C8F0"]],
      blocks: [...HATLESS, ...BEARDLESS],
      draw: (canvas2, view) => {
        if (view.side === "side") {
          canvas2.rect(3, -1, 4, 1, "skin");
          canvas2.rect(2, 0, 6, 1, "skin");
          canvas2.rect(2, 1, 1, 3, "skin");
          canvas2.set(8, 4, null);
          points(canvas2, [[7, 5], [7, 6], [7, 7], [6, 6], [6, 8], [8, 6]], "markA");
          return;
        }
        canvas2.rect(3, -1, 4, 1, "skin");
        canvas2.rect(2, 0, 6, 1, "skin");
        both(canvas2, [[1, 1], [1, 2]], "skin");
        if (view.side === "front") {
          points(canvas2, [[3, 6], [4, 6], [5, 6], [6, 6], [3, 7], [5, 7], [4, 8], [6, 8], [3, 9]], "markA");
          canvas2.set(4, 7, "markC");
          canvas2.set(6, 7, "markC");
        }
      }
    },
    {
      id: "mushroom",
      label: "Mushroom Folk",
      skins: ["#F2E6D0", "#E8D9BC", "#F7EEDF"],
      hairStyles: BALD,
      marks: [["#D7263D", "#8B5A2B", "#7B4BB3", "#2E86C1", "#E07B2A"], ["#FFFFFF"], ["#D9C9A8"]],
      blocks: [...HATLESS, ...BEARDLESS],
      draw: (canvas2, view) => {
        canvas2.rect(3, -2, 4, 1, "markA");
        canvas2.rect(1, -1, 8, 1, "markA");
        canvas2.rect(0, 0, 10, 2, "markA");
        canvas2.rect(1, 2, 8, 1, "markC");
        if (view.side !== "side") {
          canvas2.set(0, 2, null);
          canvas2.set(9, 2, null);
        }
        points(canvas2, [[3, -1], [7, 0], [1, 1], [5, 1]], "markB");
      }
    },
    {
      id: "golem",
      label: "Golem",
      skins: ["#8A8A80", "#7A7065", "#9A9488", "#6E6A5E"],
      hairStyles: BALD,
      marks: [["#7CF2E0", "#F2A93B", "#B07CF2"], ["#5A5650"], ["#7CF2E0"]],
      blocks: ["cap", ...BEARDLESS],
      sleeveless: true,
      size: "big",
      draw: (canvas2, view) => {
        if (view.side === "side") {
          canvas2.set(6, 4, "markA");
          canvas2.set(3, 6, "skin");
          points(canvas2, [[4, 2], [5, 3]], "markB");
          return;
        }
        canvas2.set(2, 6, "skinShade");
        canvas2.set(7, 6, "skinShade");
        points(canvas2, [[4, 1], [5, 2], [4, 3]], "markB");
        if (view.side === "front") {
          both(canvas2, [[3, 4]], "markA");
          canvas2.rect(3, 6, 4, 1, "markB");
        }
      }
    },
    {
      id: "ghost",
      label: "Ghost",
      skins: ["#EEF2F7", "#E3ECF5", "#F0F0FF", "#E8F7F0"],
      hairStyles: BALD,
      marks: [["#C8D4E8"], [DARK], ["#C8D4E8"]],
      blocks: ["cap", "headphones", "glasses", ...BEARDLESS],
      draw: (canvas2, view) => {
        sheet(canvas2, view);
        if (view.side === "front") {
          canvas2.rect(3, 3, 1, 2, "eye");
          canvas2.rect(6, 3, 1, 2, "eye");
          canvas2.set(2, 6, "skin");
          canvas2.set(7, 6, "skin");
        } else if (view.side === "side") {
          canvas2.rect(6, 3, 1, 2, "eye");
          canvas2.set(8, 4, null);
          canvas2.set(3, 6, "skin");
        } else {
          canvas2.set(2, 6, "skin");
          canvas2.set(7, 6, "skin");
        }
      }
    },
    {
      id: "slime",
      label: "Slime",
      skins: ["#7CD67C", "#6EC1E4", "#E46ECF", "#F2C94C", "#B07CF2"],
      hairStyles: BALD,
      marks: [["#FFFFFF"], ["#FFFFFF"], ["#FFFFFF"]],
      blocks: ["cap", ...BEARDLESS],
      draw: blob
    },
    {
      id: "dryad",
      label: "Dryad",
      skins: ["#8B5A2B", "#6B4423", "#A0703A", "#7A6A4A"],
      hairs: ["#4CB944", "#2E8B57", "#E07B2A", "#C0392B", "#F2C94C", "#F28FB8"],
      hairStyles: ["curly", "long"],
      eyes: ["#F2E14C", "#7CF27C"],
      marks: [["#5A3A1A"], ["#9BE07B", "#F2A93B", "#FFD6E8"], ["#4A2A10"]],
      blocks: ["cap"],
      sleeveless: true,
      draw: (canvas2, view) => {
        points(canvas2, [[3, -1], [5, -1], [7, -1], [4, -2]], "hair");
        points(canvas2, [[5, -2], [3, 0]], "markB");
        if (view.side === "front") {
          points(canvas2, [[2, 5], [7, 3]], "markA");
        } else if (view.side === "side") {
          points(canvas2, [[5, 5]], "markA");
        }
      }
    },
    {
      id: "jackalfolk",
      label: "Jackalfolk",
      skins: ["#1E1E24", "#2A2A30", "#3A2E24"],
      hairStyles: BALD,
      eyes: ["#F2C94C", "#7CF2E0"],
      marks: [[GOLD], ["#14141A"], ["#2E86AB", "#C0392B"]],
      blocks: [...HATLESS, ...BEARDLESS],
      draw: (canvas2, view) => {
        topEars(canvas2, view, true, view.side === "front" ? "markA" : void 0);
        snout(canvas2, view, "skin", "markB");
        if (view.side === "front") {
          canvas2.rect(2, 7, 6, 1, "markA");
          both(canvas2, [[3, 7]], "markC");
          canvas2.set(4, 6, "skinShade");
        } else if (view.side === "back") {
          canvas2.rect(2, 7, 6, 1, "markA");
        } else {
          canvas2.rect(3, 7, 4, 1, "markA");
        }
      }
    },
    {
      id: "harpy",
      label: "Harpy",
      hairs: HUMAN_HAIRS,
      hairStyles: ["long", "bob", "curly", "spiky"],
      eyes: ["#F2A93B", "#1A1A2E"],
      marks: [["#8B5A2B", "#5A5A5A", "#C0392B", "#2E86AB", "#E8E0D0"], ["#F2B233"], ["#D9952A"]],
      blocks: ["cap", ...BEARDLESS],
      draw: (canvas2, view) => {
        canvas2.recolor("sleeve", "markA");
        canvas2.recolor("sleeveShade", "markAShade");
        canvas2.recolor("shoes", "markB");
        points(canvas2, [[4, -1], [5, -2], [6, -1]], "markA");
        if (view.side === "side") {
          canvas2.set(8, 4, "markB");
          canvas2.set(8, 5, "markC");
          canvas2.set(9, 5, "markB");
          points(canvas2, [[3, 9], [3, 10]], "markA");
          return;
        }
        both(canvas2, [[0, 8], [0, 9], [0, 10]], "markA");
        if (view.side === "front") {
          canvas2.rect(4, 5, 2, 1, "markB");
          canvas2.rect(4, 6, 2, 1, "markC");
        }
      }
    },
    {
      id: "centaur",
      label: "Centaur",
      hairs: HUMAN_HAIRS,
      hairStyles: ["long", "long", "short", "bun", "curly"],
      marks: [["#8B5A2B", "#5A3825", "#C9A27A", "#2E2E2E", "#E8E4D8", "#A0522D"], ["#2B2020"], [IVORY]],
      draw: centaurBody
    },
    {
      id: "naga",
      label: "Naga",
      skins: ["#7FA35A", "#5E8C61", "#D08B5B", "#C9B07A", "#EDB98A"],
      hairs: HUMAN_HAIRS,
      hairStyles: ["long", "bob", "bun", "bald"],
      eyes: ["#E8C12A"],
      marks: [["#4E8A3A", "#3A7A6A", "#8A6A2A", "#7A3A8A"], ["#E8D9A0", "#D9C08A"], [DARK]],
      draw: nagaBody
    },
    {
      id: "merfolk",
      label: "Merfolk",
      skins: [...HUMAN_SKINS, "#9BD3E0"],
      hairs: ["#E2504B", "#2E86AB", "#12B886", "#F2E28F", "#7C5CE0", "#2C1B12"],
      hairStyles: ["long", "long", "curly", "bob"],
      marks: [["#2EC4B6", "#3A86FF", "#8338EC", "#FF6B9A"], ["#A0F0E8", "#BFD7FF", "#E0C3FF", "#FFC2D4"], ["#FFFFFF"]],
      draw: merfolkBody
    },
    {
      id: "satyr",
      label: "Satyr",
      hairs: ["#5A3825", "#2C1B12", "#A0522D", "#3A2B26"],
      hairStyles: ["curly", "curly", "short", "bun"],
      marks: [["#6B4E3D", "#8B6E4E", "#3A2B26", "#A88A6A"], ["#2B2020"], ["#D9C9A8", "#8A7A6A"]],
      blocks: ["cap"],
      draw: (canvas2, view) => {
        satyrLegs(canvas2, view);
        if (view.side === "side") {
          points(canvas2, [[5, 0], [4, -1]], "markC");
        } else {
          both(canvas2, [[3, 0], [2, -1]], "markC");
        }
      }
    },
    {
      id: "dragonkin",
      label: "Dragonkin",
      skins: ["#C0392B", "#2E86AB", "#4CB944", "#8E44AD", "#D4AC0D"],
      hairStyles: BALD,
      eyes: ["#F2E14C", "#F2A93B"],
      marks: [[BONE], ["#5A2A3A", "#2A3A5A", "#2A5A3A"], ["#F2D16B"]],
      blocks: ["cap", ...BEARDLESS],
      draw: (canvas2, view) => {
        wings(canvas2, view, "markB", "markA");
        if (view.side === "side") {
          points(canvas2, [[3, 1], [2, 0], [1, -1]], "markA");
          canvas2.set(9, 4, "skin");
          canvas2.set(8, 5, "skin");
          points(canvas2, [[5, 8], [5, 9]], "markC");
        } else {
          both(canvas2, [[2, 1], [2, 0], [1, -1]], "markA");
          if (view.side === "front") {
            canvas2.rect(4, 8, 2, 3, "markC");
          }
        }
        tail(canvas2, view, "skin", "skinShade");
      }
    },
    {
      id: "ogre",
      label: "Ogre",
      skins: ["#9AA15A", "#B5A76A", "#8C8A5E", "#A08A6A"],
      hairs: ["#2C1B12", "#3A3A3A", "#5A3825"],
      hairStyles: ["bald", "bald", "short", "mohawk"],
      eyes: ["#1A1A2E"],
      marks: [[IVORY], [IVORY], [IVORY]],
      size: "big",
      draw: (canvas2, view) => {
        if (view.side === "side") {
          canvas2.set(3, 6, "skin");
          canvas2.set(8, 6, "skin");
          canvas2.set(8, 5, "markA");
          canvas2.rect(5, 3, 3, 1, "skinShade");
          return;
        }
        canvas2.set(2, 6, "skin");
        canvas2.set(7, 6, "skin");
        both(canvas2, [[1, 4], [1, 5]], "skin");
        if (view.side === "front") {
          canvas2.rect(2, 3, 6, 1, "skinShade");
          canvas2.rect(3, 6, 4, 1, "skinShade");
          canvas2.set(3, 5, "markA");
          canvas2.set(6, 6, "markA");
        }
      }
    }
  ];
  var DARK_KEY = "eye";
  var RACE_BY_ID = new Map(RACES.map((race) => [race.id, race]));
  function raceSpec(id) {
    return RACE_BY_ID.get(id ?? "human") ?? RACES[0];
  }
  function isRaceId(value) {
    return typeof value === "string" && RACE_BY_ID.has(value);
  }
  var RACE_MARKER = "#race=";
  function seedWithoutRace(seed) {
    const at = seed.indexOf(RACE_MARKER);
    return at < 0 ? seed : seed.slice(0, at);
  }
  function pickedRace(seed) {
    const at = seed.indexOf(RACE_MARKER);
    const value = at < 0 ? void 0 : seed.slice(at + RACE_MARKER.length);
    return isRaceId(value) ? value : void 0;
  }

  // src/pixelGuy.ts
  var FRAME_WIDTH = INNER_WIDTH + 2;
  var FRAME_HEIGHT = INNER_HEIGHT + 2;
  var POSE_FRAMES = { stand: 1, walk: 4, type: 2, sit: 1, stretch: 1, drink: 1, talk: 2, sleep: 2, carry: 4, build: 2, cheer: 2, eat: 2 };
  var SKINS = ["#F9D4B4", "#EDB98A", "#D08B5B", "#AE5D29", "#8D4A28", "#614335"];
  var HAIRS = ["#2C1B12", "#5A3825", "#A0522D", "#D9A441", "#E8D9A0", "#B8B8B8", "#E2504B", "#7C5CE0", "#3FA7D6", "#2E2E2E"];
  var SHIRTS = ["#E4572E", "#F3A712", "#4C6EF5", "#2E86AB", "#4CB944", "#A23B72", "#F06595", "#12B886", "#7950F2", "#FAB005", "#E03131", "#E9ECEF"];
  var PANTS = ["#2B2D42", "#3D5A80", "#4A4E69", "#6B4E3D", "#1F3B2C", "#8D99AE"];
  var SHOES = ["#1E1E1E", "#5C3D2E", "#EDEDED", "#9B2226"];
  var ACCESSORY_COLORS = ["#222831", "#E63946", "#F1FAEE", "#457B9D", "#FFB703"];
  var HAIR_STYLES = ["short", "long", "spiky", "bob", "bald", "mohawk", "bun", "curly"];
  var ACCESSORIES = ["none", "none", "none", "none", "glasses", "headphones", "cap", "beard"];
  var EYE = "#1A1A2E";
  var MOUTH = "#7A2E2E";
  var CUP = "#FFFFFF";
  var OUTLINE = "#14141C";
  function hashSeed(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function seededRandom(seed) {
    let state2 = seed >>> 0;
    return () => {
      state2 = state2 + 1831565813 >>> 0;
      let value = state2;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  var pickFrom = (random2) => (items) => items[Math.floor(random2() * items.length) % items.length];
  function pixelGuyLook(seed, races = true) {
    const base2 = seedWithoutRace(seed);
    const pick3 = pickFrom(seededRandom(hashSeed(base2)));
    const look = {
      skin: pick3(SKINS),
      hair: pick3(HAIRS),
      hairStyle: pick3(HAIR_STYLES),
      shirt: pick3(SHIRTS),
      pants: pick3(PANTS),
      shoes: pick3(SHOES),
      accessory: pick3(ACCESSORIES),
      accessoryColor: pick3(ACCESSORY_COLORS)
    };
    const race = pickedRace(seed) ?? (races ? RACE_IDS[hashSeed(`${base2}|race`) % RACE_IDS.length] : "human");
    return withRace(look, race, seededRandom(hashSeed(`${base2}|${race}`)));
  }
  function withRace(look, race, random2) {
    if (race === "human") {
      return look;
    }
    const spec = raceSpec(race);
    const pick3 = pickFrom(random2);
    const next = { ...look, race, marks: defaultMarks(spec, pick3) };
    if (spec.skins !== void 0) {
      next.skin = pick3(spec.skins);
    }
    if (spec.hairs !== void 0) {
      next.hair = pick3(spec.hairs);
    }
    if (spec.hairStyles !== void 0) {
      next.hairStyle = pick3(spec.hairStyles);
    }
    if (spec.eyes !== void 0) {
      next.eyes = pick3(spec.eyes);
    }
    if (spec.sleeveless === true) {
      next.sleeveless = true;
    }
    return next;
  }
  var LOOK_PALETTES = {
    skins: SKINS,
    hairs: HAIRS,
    shirts: SHIRTS,
    pants: PANTS,
    shoes: SHOES,
    accessoryColors: ACCESSORY_COLORS,
    hairStyles: [...HAIR_STYLES, "ponytail"],
    accessories: ["none", "glasses", "headphones", "cap", "beard", "fullBeard"]
  };
  function lookWithRace(look, race) {
    if (race === "human") {
      const human = { ...look };
      delete human.race;
      delete human.marks;
      return human;
    }
    return withRace({ ...look, sleeveless: look.sleeveless }, race, () => 0);
  }
  function defaultMarks(spec, pick3 = (items) => items[0]) {
    const marks = spec.marks ?? [["#FFFFFF"], ["#FFFFFF"], ["#FFFFFF"]];
    return [pick3(marks[0]), pick3(marks[1]), pick3(marks[2])];
  }
  function pixelGuyFrame(look, pose, facing, frame) {
    const step = (Math.floor(frame) % POSE_FRAMES[pose] + POSE_FRAMES[pose]) % POSE_FRAMES[pose];
    const race = raceSpec(look.race);
    const side = facing === "left" || facing === "right";
    let canvas2;
    if (side) {
      canvas2 = drawSide(look, race, pose, step);
      if (facing === "left") {
        canvas2 = canvas2.mirrored();
      }
    } else {
      canvas2 = drawFront(look, race, pose, step, facing === "up");
    }
    dressed(canvas2, look, pose, facing);
    if (pose === "sleep") {
      canvas2 = slumped(canvas2, step);
    }
    if (race.size === "short") {
      canvas2 = shortened(canvas2);
    } else if (race.size === "big" && !side) {
      widened(canvas2);
    }
    return outlined(colorize(canvas2, look));
  }
  function drawRace(canvas2, look, race, pose, step, side) {
    race.draw?.(canvas2, { side, pose, step, seated: isSeatedPose(pose), hairStyle: look.hairStyle });
  }
  function shortened(canvas2) {
    const result = new Canvas();
    canvas2.each((key, x, y) => {
      if (y >= 14) {
        result.set(x, y, key);
      } else if (y >= 11 && y <= 12) {
        result.set(x, y + 1, key);
      } else if (y <= 9) {
        result.set(x, y + 2, key);
      }
    });
    return result;
  }
  function widened(canvas2) {
    for (let y = 7; y <= 12; y++) {
      for (const [arm, edge, inner] of [[1, 0, 2], [8, 9, 7]]) {
        const key = canvas2.get(arm, y);
        if (key !== null && canvas2.get(edge, y) === null) {
          canvas2.set(edge, y, key);
          canvas2.set(arm, y, canvas2.get(inner, y) ?? key);
        }
      }
    }
  }
  function canWear(race, accessory) {
    return race.blocks?.includes(accessory) === true ? "none" : accessory;
  }
  function drawFront(look, race, pose, step, isBack) {
    const canvas2 = new Canvas();
    canvas2.rect(2, 1, 6, 6, "skin");
    canvas2.set(2, 6, null);
    canvas2.set(7, 6, null);
    canvas2.rect(2, 7, 6, 5, "shirt");
    canvas2.rect(2, 11, 6, 1, "shirtShade");
    canvas2.rect(2, 12, 6, 1, "pants");
    drawFrontLegs(canvas2, pose, step);
    drawFrontArms(canvas2, pose, step, isBack);
    if (isBack) {
      drawBackHair(canvas2, look.hairStyle);
    } else {
      canvas2.set(3, 4, "eye");
      canvas2.set(6, 4, "eye");
      if ((pose === "talk" || pose === "cheer" || pose === "eat") && step === 1) {
        canvas2.rect(4, 5, 2, 1, "mouth");
      }
      drawFrontHair(canvas2, look.hairStyle);
    }
    if (race.beard === true) {
      drawFrontAccessory(canvas2, "fullBeard", isBack);
    }
    drawFrontAccessory(canvas2, canWear(race, look.accessory), isBack);
    drawRace(canvas2, look, race, pose, step, isBack ? "back" : "front");
    if (look.tie !== void 0 && !isBack) {
      canvas2.rect(4, 7, 2, 1, "tieShade");
      canvas2.rect(4, 8, 2, 2, "tie");
      canvas2.set(4, 10, "tie");
    }
    if (pose === "drink" && !isBack) {
      canvas2.set(7, 5, "cup");
      canvas2.set(7, 6, "cup");
    }
    return canvas2;
  }
  var isSeatedPose = (pose) => pose === "type" || pose === "sit" || pose === "sleep";
  function dressed(canvas2, look, pose, facing) {
    const seated = isSeatedPose(pose);
    canvas2.each((key, x, y) => {
      if (look.shorts === true && !seated && y >= 14 && (key === "pants" || key === "pantsShade")) {
        canvas2.set(x, y, key === "pants" ? "skin" : "skinShade");
      }
    });
    if (look.flipFlops !== true || seated) {
      return;
    }
    const side = facing === "left" || facing === "right";
    canvas2.cells.forEach((row, index) => {
      const y = index - HEAD_ROOM;
      let runStart = -1;
      for (let x = 0; x <= row.length; x++) {
        const isShoe = x < row.length && row[x] === "shoes";
        if (isShoe && runStart < 0) {
          runStart = x;
        } else if (!isShoe && runStart >= 0) {
          for (let foot = runStart; foot + 3 <= x; foot += 3) {
            canvas2.set(side ? facing === "right" ? foot + 2 : foot : foot + 1, y, "skin");
          }
          runStart = -1;
        }
      }
    });
  }
  function slumped(canvas2, step) {
    const drop = 2 + step;
    const result = new Canvas();
    canvas2.each((key, x, y) => {
      if (y >= 7) {
        result.set(x, y, key);
      }
    });
    canvas2.each((key, x, y) => {
      if (y < 7 && key !== null) {
        result.set(x, y + drop, key);
      }
    });
    return result;
  }
  function drawFrontLegs(canvas2, pose, step) {
    if (isSeatedPose(pose)) {
      canvas2.rect(2, 13, 3, 1, "pantsShade");
      canvas2.rect(5, 13, 3, 1, "pantsShade");
      canvas2.rect(2, 14, 2, 1, "shoes");
      canvas2.rect(6, 14, 2, 1, "shoes");
      return;
    }
    const leftUp = isStepping(pose) && step === 1;
    const rightUp = isStepping(pose) && step === 3;
    canvas2.rect(3, 13, 2, leftUp ? 1 : 2, "pants");
    canvas2.rect(5, 13, 2, rightUp ? 1 : 2, "pantsShade");
    canvas2.rect(2, leftUp ? 14 : 15, 3, 1, "shoes");
    canvas2.rect(5, rightUp ? 14 : 15, 3, 1, "shoes");
  }
  function drawFrontArms(canvas2, pose, step, isBack) {
    if (pose === "build") {
      canvas2.rect(1, 7, 1, 2, "sleeve");
      canvas2.rect(8, 7, 1, 2, "sleeve");
      canvas2.set(isBack ? 1 : 2, step === 0 ? 8 : 9, "skin");
      canvas2.set(isBack ? 8 : 7, step === 1 ? 8 : 9, "skin");
      return;
    }
    if (pose === "cheer") {
      canvas2.rect(1, 3, 1, 5, "sleeve");
      canvas2.set(1, 2, "skin");
      canvas2.rect(8, step === 0 ? 3 : 5, 1, step === 0 ? 5 : 3, "sleeve");
      canvas2.set(8, step === 0 ? 2 : 4, "skin");
      return;
    }
    if (pose === "eat" && !isBack) {
      canvas2.rect(1, 7, 1, 4, "sleeve");
      canvas2.set(1, 11, "skin");
      canvas2.rect(8, 7, 1, step === 0 ? 1 : 2, "sleeve");
      canvas2.set(step === 0 ? 7 : 8, step === 0 ? 6 : 9, "skin");
      return;
    }
    if (pose === "stretch" || pose === "carry") {
      canvas2.rect(1, 2, 1, 6, "sleeve");
      canvas2.rect(8, 2, 1, 6, "sleeve");
      canvas2.set(1, 1, "skin");
      canvas2.set(8, 1, "skin");
      return;
    }
    if (pose === "sleep") {
      canvas2.rect(1, 7, 8, 2, "sleeve");
      canvas2.rect(2, 8, 6, 1, "sleeveShade");
      canvas2.set(1, 9, "skin");
      canvas2.set(8, 9, "skin");
      return;
    }
    if (pose === "type") {
      canvas2.rect(1, 7, 1, 3, "sleeve");
      canvas2.rect(8, 7, 1, 3, "sleeve");
      canvas2.set(isBack ? 1 : 2, step === 0 ? 9 : 10, "skin");
      canvas2.set(isBack ? 8 : 7, step === 1 ? 9 : 10, "skin");
      return;
    }
    if (pose === "drink" && !isBack) {
      canvas2.rect(1, 7, 1, 4, "sleeve");
      canvas2.set(1, 11, "skin");
      canvas2.rect(8, 7, 1, 1, "sleeve");
      canvas2.set(8, 6, "skin");
      return;
    }
    const swing = pose === "walk" ? step === 1 ? -1 : step === 3 ? 1 : 0 : 0;
    canvas2.rect(1, 7, 1, 4 + Math.min(0, swing), "sleeve");
    canvas2.rect(8, 7, 1, 4 - Math.max(0, swing), "sleeve");
    canvas2.set(1, 11 + Math.min(0, swing), "skin");
    canvas2.set(8, 11 - Math.max(0, swing), "skin");
  }
  function drawFrontHair(canvas2, style) {
    switch (style) {
      case "bald":
        return;
      case "short":
        canvas2.rect(3, 0, 4, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.set(2, 2, "hair");
        canvas2.set(7, 2, "hair");
        return;
      case "long":
        canvas2.rect(2, 0, 6, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(1, 1, 1, 7, "hair");
        canvas2.rect(8, 1, 1, 7, "hair");
        canvas2.set(2, 2, "hair");
        canvas2.set(7, 2, "hair");
        return;
      case "spiky":
        [2, 4, 6].forEach((x) => canvas2.set(x, 0, "hair"));
        [3, 5, 7].forEach((x) => canvas2.set(x, 0, null));
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.set(2, 2, "hair");
        canvas2.set(7, 2, "hair");
        canvas2.set(4, 2, "hair");
        return;
      case "bob":
        canvas2.rect(3, 0, 4, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(1, 2, 1, 4, "hair");
        canvas2.rect(8, 2, 1, 4, "hair");
        canvas2.rect(2, 2, 1, 3, "hair");
        canvas2.rect(7, 2, 1, 3, "hair");
        return;
      case "mohawk":
        canvas2.rect(4, 0, 2, 3, "hair");
        return;
      case "bun":
        canvas2.rect(4, 0, 2, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.set(2, 2, "hair");
        canvas2.set(7, 2, "hair");
        return;
      case "ponytail":
        canvas2.rect(3, 0, 5, 1, "hair");
        canvas2.rect(3, 1, 5, 1, "hair");
        canvas2.set(7, 2, "hair");
        canvas2.rect(2, 1, 1, 3, "stubble");
        canvas2.rect(8, 2, 1, 4, "hair");
        return;
      case "curly":
        canvas2.rect(2, 0, 6, 1, "hair");
        canvas2.rect(1, 1, 8, 1, "hair");
        canvas2.rect(1, 2, 2, 1, "hair");
        canvas2.rect(7, 2, 2, 1, "hair");
        canvas2.set(1, 3, "hair");
        canvas2.set(8, 3, "hair");
        return;
    }
  }
  function drawBackHair(canvas2, style) {
    if (style === "bald") {
      return;
    }
    if (style === "mohawk") {
      canvas2.rect(4, 0, 2, 6, "hair");
      return;
    }
    if (style === "ponytail") {
      canvas2.rect(3, 0, 4, 1, "hair");
      canvas2.rect(3, 1, 5, 3, "hair");
      canvas2.rect(2, 1, 1, 4, "stubble");
      canvas2.rect(4, 4, 2, 1, "hairTie");
      canvas2.rect(4, 5, 2, 3, "hair");
      canvas2.set(5, 8, "hair");
      return;
    }
    canvas2.rect(2, 1, 6, style === "short" || style === "spiky" ? 4 : 5, "hair");
    canvas2.rect(3, 0, 4, 1, "hair");
    if (style === "long") {
      canvas2.rect(2, 6, 6, 2, "hair");
      canvas2.rect(1, 1, 1, 7, "hair");
      canvas2.rect(8, 1, 1, 7, "hair");
    }
    if (style === "bun") {
      canvas2.rect(4, 0, 2, 1, "hair");
      canvas2.rect(4, 2, 2, 1, "skinShade");
    }
    if (style === "curly") {
      canvas2.rect(1, 1, 8, 3, "hair");
    }
    if (style === "spiky") {
      [3, 5].forEach((x) => canvas2.set(x, 0, null));
      [2, 4, 6].forEach((x) => canvas2.set(x, 0, "hair"));
    }
  }
  function drawFrontAccessory(canvas2, accessory, isBack) {
    switch (accessory) {
      case "glasses":
        if (!isBack) {
          [2, 4, 5, 7].forEach((x) => canvas2.set(x, 4, "accessory"));
          canvas2.set(3, 3, "accessoryLight");
          canvas2.set(6, 3, "accessoryLight");
        }
        return;
      case "headphones":
        canvas2.rect(2, 0, 6, 1, "accessory");
        canvas2.rect(1, 3, 1, 3, "accessory");
        canvas2.rect(8, 3, 1, 3, "accessory");
        return;
      case "cap":
        canvas2.rect(2, 0, 6, 2, "accessory");
        if (!isBack) {
          canvas2.rect(1, 2, 8, 1, "accessoryLight");
        }
        return;
      case "beard":
        if (!isBack) {
          canvas2.rect(3, 6, 4, 1, "beard");
          canvas2.set(2, 5, "beard");
          canvas2.set(7, 5, "beard");
          canvas2.set(3, 5, "beard");
          canvas2.set(6, 5, "beard");
        }
        return;
      case "fullBeard":
        if (!isBack) {
          canvas2.rect(2, 3, 1, 3, "beard");
          canvas2.rect(7, 3, 1, 3, "beard");
          canvas2.rect(2, 5, 6, 2, "beard");
          canvas2.rect(3, 7, 4, 1, "beard");
          canvas2.rect(4, 5, 2, 1, "mouth");
        }
        return;
      case "none":
        return;
    }
  }
  function drawSide(look, race, pose, step) {
    const canvas2 = new Canvas();
    canvas2.rect(3, 1, 5, 6, "skin");
    canvas2.set(3, 6, null);
    canvas2.set(8, 4, "skin");
    canvas2.set(6, 4, "eye");
    if ((pose === "talk" || pose === "cheer" || pose === "eat") && step === 1) {
      canvas2.set(7, 5, "mouth");
    }
    canvas2.rect(3, 7, 4, 5, "shirt");
    canvas2.rect(3, 11, 4, 1, "shirtShade");
    canvas2.rect(3, 12, 4, 1, "pants");
    drawSideLegs(canvas2, pose, step);
    drawSideArm(canvas2, pose, step);
    drawSideHair(canvas2, look.hairStyle);
    if (race.beard === true) {
      drawSideAccessory(canvas2, "fullBeard");
    }
    drawSideAccessory(canvas2, canWear(race, look.accessory));
    drawRace(canvas2, look, race, pose, step, "side");
    return canvas2;
  }
  function drawSideLegs(canvas2, pose, step) {
    if (isStepping(pose) && (step === 1 || step === 3)) {
      canvas2.rect(5, 13, 2, 2, step === 1 ? "pants" : "pantsShade");
      canvas2.rect(3, 13, 2, 2, step === 1 ? "pantsShade" : "pants");
      canvas2.rect(6, 15, 2, 1, "shoes");
      canvas2.rect(2, 15, 2, 1, "shoes");
      return;
    }
    canvas2.rect(4, 13, 2, 2, "pants");
    canvas2.rect(4, 15, 3, 1, "shoes");
  }
  function drawSideArm(canvas2, pose, step) {
    if (pose === "cheer") {
      canvas2.rect(5, step === 0 ? 2 : 3, 1, step === 0 ? 6 : 5, "sleeveShade");
      canvas2.set(step === 0 ? 5 : 6, step === 0 ? 1 : 2, "skin");
      return;
    }
    if (pose === "eat") {
      canvas2.rect(4, 7, 2, 2, "sleeveShade");
      canvas2.set(6, step === 0 ? 6 : 7, "sleeveShade");
      canvas2.set(7, step === 0 ? 5 : 7, "skin");
      return;
    }
    if (pose === "carry") {
      canvas2.rect(5, 2, 1, 6, "sleeveShade");
      canvas2.set(5, 1, "skin");
      return;
    }
    if (pose === "build") {
      canvas2.rect(4, 7, 2, 1, "sleeveShade");
      canvas2.rect(6, 8, 2, 1, "sleeveShade");
      canvas2.set(8, step === 0 ? 8 : 9, "skin");
      return;
    }
    const reach = pose === "walk" ? step === 1 ? 1 : step === 3 ? -1 : 0 : 0;
    canvas2.rect(4, 7, 2, 3, "sleeveShade");
    canvas2.set(4 + Math.max(0, reach) + (reach < 0 ? -1 : 0), 10, "sleeveShade");
    canvas2.set(5 + reach, 11, "skin");
  }
  function drawSideHair(canvas2, style) {
    switch (style) {
      case "bald":
        return;
      case "mohawk":
        canvas2.rect(3, 0, 4, 1, "hair");
        return;
      case "long":
        canvas2.rect(3, 0, 4, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(2, 2, 2, 6, "hair");
        return;
      case "bob":
        canvas2.rect(3, 0, 4, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(2, 2, 3, 4, "hair");
        return;
      case "curly":
        canvas2.rect(2, 0, 6, 1, "hair");
        canvas2.rect(2, 1, 7, 1, "hair");
        canvas2.rect(2, 2, 3, 3, "hair");
        return;
      case "bun":
        canvas2.set(2, 0, "hair");
        canvas2.rect(3, 0, 4, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(2, 2, 2, 2, "hair");
        return;
      case "spiky":
        [3, 5, 7].forEach((x) => canvas2.set(x, 0, "hair"));
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(2, 2, 2, 2, "hair");
        return;
      case "short":
        canvas2.rect(3, 0, 4, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(2, 2, 2, 2, "hair");
        return;
      case "ponytail":
        canvas2.rect(3, 0, 4, 1, "hair");
        canvas2.rect(2, 1, 6, 1, "hair");
        canvas2.rect(3, 2, 2, 2, "stubble");
        canvas2.set(2, 2, "hairTie");
        canvas2.rect(1, 2, 1, 1, "hair");
        canvas2.rect(1, 3, 1, 4, "hair");
        canvas2.set(2, 3, "hair");
        return;
    }
  }
  function drawSideAccessory(canvas2, accessory) {
    switch (accessory) {
      case "glasses":
        canvas2.rect(6, 4, 2, 1, "accessory");
        canvas2.set(6, 4, "accessoryLight");
        return;
      case "headphones":
        canvas2.rect(3, 0, 4, 1, "accessory");
        canvas2.rect(3, 1, 1, 2, "accessory");
        canvas2.rect(3, 3, 2, 3, "accessory");
        return;
      case "cap":
        canvas2.rect(3, 0, 4, 2, "accessory");
        canvas2.rect(7, 2, 2, 1, "accessoryLight");
        return;
      case "beard":
        canvas2.rect(5, 6, 3, 1, "beard");
        canvas2.set(7, 5, "beard");
        return;
      case "fullBeard":
        canvas2.rect(4, 3, 1, 3, "beard");
        canvas2.rect(4, 5, 4, 2, "beard");
        canvas2.set(8, 5, "beard");
        canvas2.rect(5, 7, 2, 1, "beard");
        canvas2.set(7, 5, "mouth");
        return;
      case "none":
        return;
    }
  }
  function colorize(canvas2, look) {
    const [markA, markB, markC] = look.marks ?? defaultMarks(raceSpec(look.race));
    const colors = {
      skin: look.skin,
      skinShade: shadeHex(look.skin, 0.82),
      hair: look.hair,
      eye: look.eyes ?? EYE,
      mouth: MOUTH,
      shirt: look.shirt,
      shirtShade: shadeHex(look.shirt, 0.78),
      pants: look.pants,
      pantsShade: shadeHex(look.pants, 0.8),
      shoes: look.shoes,
      accessory: look.accessoryColor,
      accessoryLight: shadeHex(look.accessoryColor, 1.3),
      cup: CUP,
      sleeve: look.sleeveless === true ? look.skin : look.shirt,
      sleeveShade: look.sleeveless === true ? shadeHex(look.skin, 0.82) : shadeHex(look.shirt, 0.78),
      stubble: mixHex(look.skin, look.hair, 0.4),
      beard: look.beard ?? look.hair,
      hairTie: shadeHex(look.hair, 0.6),
      markA,
      markAShade: shadeHex(markA, 0.75),
      markB,
      markC,
      tie: look.tie ?? MOUTH,
      tieShade: shadeHex(look.tie ?? MOUTH, 0.7)
    };
    return canvas2.cells.map((row) => row.map((key) => key === null ? null : colors[key]));
  }
  function outlined(grid) {
    const padded = Array.from(
      { length: FRAME_HEIGHT },
      (_, y) => Array.from({ length: FRAME_WIDTH }, (_2, x) => grid[y - 1]?.[x - 1] ?? null)
    );
    const filled = (x, y) => padded[y]?.[x] != null;
    return padded.map(
      (row, y) => row.map((color, x) => {
        if (color !== null) {
          return color;
        }
        return filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? OUTLINE : null;
      })
    );
  }
  var PORTRAIT_ROWS = 13 + HEAD_ROOM;
  var ALL_HAIR_STYLES = [...HAIR_STYLES, "ponytail"];

  // src/officeVisitors.ts
  var BOSS_CLOSERS = [
    "Carry on!",
    "My door is always open!",
    "Love it. Carry on.",
    "Anyway!",
    "Great chat.",
    "Keep it up!",
    "Let's touch base.",
    "Circle back to me.",
    "Back to my 4 meetings.",
    "You're all rockstars.",
    "Ping me!",
    "Proud of this team.",
    "Onward!",
    "Let's take it offline.",
    "I'll let you get back to it."
  ];
  var DEPT_CLOSERS = [
    "ok bye!",
    "thx!",
    "\u2026",
    "Carry on.",
    "Just a heads up!",
    "That's all!",
    "Bye!",
    "Cheers!",
    "Okay, that's it.",
    "See ya!",
    "Don't tell anyone I was here.",
    "Back to my desk.",
    "Later!",
    "Have a good one!",
    "Ciao!"
  ];
  var BOSS_TALK = [
    "How's it going?",
    "What are we working on?",
    "Is that done yet?",
    "Walk me through it.",
    "Love it. Ship it.",
    "Any blockers?",
    "Let's sync later.",
    "What's our velocity?",
    "Is that in the roadmap?",
    "Can we parallelize that?",
    "What's the ETA?",
    "Let's get a deck on this.",
    "Who owns this?",
    "I read half the doc.",
    "Can we do it in half the time?",
    "Big picture?",
    "Are we agile yet?",
    "Let's double the scope.",
    "I have a quick ask.",
    "Just thinking out loud\u2026",
    "I'm hands-off. Mostly.",
    "Can I get a status?",
    "Love the hustle.",
    "Let's not overthink it.",
    "What would it take?"
  ];
  var DEPT_TALK = [
    "Busy day?",
    "Did you see the game?",
    "Weekend plans?",
    "Is that coffee fresh?",
    "Nice setup.",
    "So what do you do here?",
    "Love the plant.",
    "Is it always this quiet?",
    "How many monitors is that?",
    "What's that one do?",
    "Is that a cat clock?",
    "Cold in here, huh?",
    "Nice chair.",
    "What's for lunch?",
    "Is it Friday yet?",
    "This place is nicer than ours.",
    "You guys have snacks?",
    "Do you ever sleep?",
    "Can I sit here?",
    "Long week, huh?",
    "Do you code all day?",
    "I could never.",
    "My nephew codes.",
    "Is this the fun floor?",
    "Who's the dragon guy?"
  ];
  var VISITOR_KINDS = [
    {
      id: "manager",
      title: "Manager",
      boss: true,
      shirt: "#E8E8E8",
      pants: "#3A3F58",
      tie: "#C0392B",
      accessory: "none",
      weight: 4,
      openers: [
        "Are you all getting work done in here?",
        "Keep up the synergy!",
        "Let's circle back on that.",
        "Quick sync? No? Great.",
        "Who's on the TPS reports?",
        "Let's move the needle, people!",
        "Can we take this offline?",
        "Remember, we're a family!",
        "Great hustle, team!",
        "Pizza party Friday. Probably.",
        "Let's put a pin in it.",
        "Love the energy in here!",
        "Did everyone get my memo?",
        "New cover sheets on the TPS reports.",
        "Who's free for a 7am?",
        "We need to talk about velocity.",
        "Let's make this a quick meeting.",
        "Who booked every room?",
        "Can someone update the Jira?",
        "Mandatory optional meeting!",
        "Bandwidth check!",
        "Let's align on alignment.",
        "I've been told I'm a great listener.",
        "Reminder: no meeting Wednesdays.",
        "Except this meeting.",
        "Who has the action items?",
        "Is this the war room?",
        "Let's run it up the flagpole.",
        "Let's ideate!",
        "Low-hanging fruit, people!",
        "Can I borrow everyone for 5 min?",
        "Love this. More of this."
      ],
      closers: BOSS_CLOSERS,
      smallTalk: BOSS_TALK
    },
    {
      id: "vp",
      title: "VP of Synergy",
      boss: true,
      shirt: "#2B2D42",
      pants: "#1D1E2C",
      tie: "#F1C24B",
      accessory: "none",
      weight: 1,
      openers: [
        "Let's leverage our core synergies.",
        "We're pivoting. Again.",
        "Think outside the box!",
        "I needed this yesterday.",
        "Can we make it more AI?",
        "Let's boil the ocean!",
        "Big things coming, team.",
        "We're a startup at heart.",
        "Disrupt everything!",
        "Let's 10x this.",
        "I just got back from a retreat.",
        "Blockchain? Still a thing?",
        "Our north star is synergy.",
        "Paradigm shift incoming!",
        "I spoke to the board.",
        "Let's move fast. And break things.",
        "Not those things.",
        "We're web3. Wait, AI. AI now.",
        "I want it to feel like magic.",
        "Q4 is our moment.",
        "I read a book on airplanes.",
        "Let's be the Uber of something.",
        "Holistic! Scalable! Agile!"
      ],
      closers: BOSS_CLOSERS,
      smallTalk: BOSS_TALK
    },
    {
      id: "ceo",
      title: "CEO",
      boss: true,
      shirt: "#111318",
      pants: "#111318",
      tie: "#7E57C2",
      accessory: "none",
      weight: 0.4,
      openers: [
        "Hi everyone! Don't mind me.",
        "Just walking the floor.",
        "I'm one of you, really.",
        "Who's the best coder here?",
        "Love what you're doing. What is it?",
        "I just landed from Davos.",
        "We're crushing it.",
        "Remember the mission!",
        "What's the mission again?",
        "I bought a boat.",
        "Lean in!",
        "Is this the dragon team?",
        "All hands at 4!",
        "I remember my first line of code.",
        "Stock's up! Probably."
      ],
      closers: ["Keep crushing it!", "You're the heart of this company.", "My jet's waiting.", "Love you all. Professionally.", "Onward!"],
      smallTalk: BOSS_TALK
    },
    {
      id: "hr",
      title: "HR",
      boss: false,
      shirt: "#E07A9B",
      pants: "#5B4B5E",
      weight: 1,
      openers: [
        "Mandatory fun at 3pm!",
        "Who has the birthday card?",
        "Please finish your trainings.",
        "Who microwaved fish?",
        "Benefits close today!",
        "Team building on Friday!",
        "Trust falls at noon!",
        "Please update your emergency contact.",
        "Who keeps saying 'ninja' in job posts?",
        "Wellness week starts Monday!",
        "Hydrate! It's in the handbook.",
        "Sign the card for Dave!",
        "Who's Dave? Sign it anyway.",
        "Ugly sweater day is coming.",
        "We have a new mood board.",
        "Please stop calling it 'the dungeon'.",
        "Who brought the goat?",
        "Use your PTO!",
        "Not all at once!",
        "Reminder: we're a family. A legal one.",
        "Survey closes in an hour!"
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "How's your work-life balance?", "Feeling engaged?", "On a scale of 1 to 10?", "Have you done the survey?"]
    },
    {
      id: "it",
      title: "IT",
      boss: false,
      shirt: "#4A7C59",
      pants: "#2F3A33",
      accessory: "glasses",
      weight: 1,
      openers: [
        "Have you tried turning it off and on?",
        "Who clicked the phishing link?",
        "Rebooting everything. Don't panic.",
        "Passwords need 40 chars now.",
        "Is this plugged in?",
        "Your password expires in 5 min.",
        "Who installed a crypto miner?",
        "Updates tonight. All of them.",
        "The VPN is down. Again.",
        "Who has my ethernet cable?",
        "Did someone print 900 pages?",
        "Don't download the internet.",
        "Which one of you is 'admin'?",
        "New laptops! Next year.",
        "Mandatory 2FA. And 3FA.",
        "Please stop naming your PC 'skynet'.",
        "Who's streaming 4K cats?",
        "Clear your cookies. Not those cookies.",
        "Ticket #4000 is open.",
        "It's not my fault. It's DNS."
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Did you reboot?", "Is that Windows Vista?", "Your fan sounds sick.", "Lock your screen!"]
    },
    {
      id: "sales",
      title: "Sales",
      boss: false,
      shirt: "#F4A259",
      pants: "#3D3B4F",
      weight: 1,
      openers: [
        "Can it do this by Friday?",
        "I already sold that feature.",
        "The client wants it to pop.",
        "Can we add AI to it?",
        "Need a demo in 5 min!",
        "I promised it'd be free.",
        "The client called it 'buggy'.",
        "Can it run on a fax machine?",
        "Big deal closing! Can it do X?",
        "What's X? No idea.",
        "I told them 99.999% uptime.",
        "Can we white-label it by noon?",
        "The client wants it blue. No, green.",
        "I sold the roadmap.",
        "Who wants to come golfing?",
        "Commission check incoming!",
        "It's basically done, right?",
        "The demo crashed. Twice.",
        "They want it on-prem. On a boat."
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Can you hop on a call?", "It's a quick call!", "Just smile and nod.", "Love the vibe here."]
    },
    {
      id: "marketing",
      title: "Marketing",
      boss: false,
      shirt: "#B56CE0",
      pants: "#33264A",
      weight: 1,
      openers: [
        "Can the logo be bigger?",
        "We need it to go viral.",
        "Let's rebrand!",
        "More gradients!",
        "Is this on brand?",
        "Can we make it pop?",
        "Smaller. No, bigger.",
        "We're doing a TikTok.",
        "Who wants to be in the video?",
        "We need a mascot.",
        "The dragon is the mascot now.",
        "Can it be more\u2026 purple?",
        "Synergy, but make it fun.",
        "Engagement is up 2%!",
        "We renamed the product.",
        "Comic Sans? Hear me out.",
        "Let's A/B test the office.",
        "Rounder corners!",
        "Dark mode is a brand.",
        "Let's put it on a billboard."
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Is that font on brand?", "Can I take a photo?", "Smile for the socials!", "This is content."]
    },
    {
      id: "facilities",
      title: "Facilities",
      boss: false,
      shirt: "#E8C547",
      pants: "#3B4A5A",
      accessory: "cap",
      weight: 1,
      openers: [
        "Fire drill at 2!",
        "Don't touch the thermostat.",
        "Who unplugged the fridge?",
        "Wet floor. Probably.",
        "The fridge gets cleaned Friday.",
        "Everything goes. Everything.",
        "Who's been feeding the pigeons?",
        "Elevator's out. Stairs it is.",
        "There's a raccoon in the vents.",
        "Who glued the stapler down?",
        "Water main's fine. Mostly.",
        "New chairs. Same chairs.",
        "Who left a fish in the drawer?",
        "Don't lean on that wall.",
        "Light bulbs! Who needs 'em?",
        "Is there a dragon in the cave?",
        "Moving desks Tuesday."
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Who stole the mop?", "That chair squeaks.", "Don't put your feet on that."]
    },
    {
      id: "accounting",
      title: "Accounting",
      boss: false,
      shirt: "#8D99AE",
      pants: "#2B2D42",
      accessory: "glasses",
      weight: 1,
      openers: [
        "Who expensed a dragon?",
        "Receipts, people!",
        "Budget's frozen. Again.",
        "Was that a business lunch?",
        "Who expensed 400 rubber ducks?",
        "The cloud bill is\u2026 large.",
        "Who's running 900 GPUs?",
        "Please, no more standing desks.",
        "Q3 numbers are\u2026 numbers.",
        "That's not deductible.",
        "Spreadsheets don't lie.",
        "Who bought a yacht on the corp card?",
        "Why is there a line item for 'vibes'?",
        "Pennies add up!",
        "The audit is Thursday.",
        "Shred nothing."
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Is that a company laptop?", "Who paid for that?", "Lovely. How much?"]
    },
    {
      id: "intern",
      title: "Intern",
      boss: false,
      shirt: "#6FB3E0",
      pants: "#44546A",
      weight: 1,
      openers: [
        "Where's the printer?",
        "Is this the meeting?",
        "Coffee run, anyone?",
        "What does a PR do?",
        "Am I paid for this?",
        "I pushed to main. Is that bad?",
        "What's a merge conflict?",
        "I deleted a branch. Which one? Good question.",
        "Is there free food?",
        "How do I exit Vim?",
        "My manager is on vacation.",
        "Who's my manager?",
        "I made a startup this weekend.",
        "What's Jira?",
        "Is this my desk?",
        "I fixed a typo!",
        "Can I have admin?",
        "The coffee machine hates me.",
        "First day! Or third?"
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Is it okay to leave at 5?", "What does this button do?", "Can I watch you code?", "Wow."]
    },
    {
      id: "legal",
      title: "Legal",
      boss: false,
      shirt: "#5C4B51",
      pants: "#2A2326",
      weight: 1,
      openers: [
        "Don't put that in writing.",
        "Stop naming servers after exes.",
        "Allegedly.",
        "Did anyone sign this?",
        "Who agreed to the terms?",
        "Nobody reads the terms.",
        "Is that GPL?",
        "Please stop copy-pasting from the internet.",
        "Who trademarked 'dragon'?",
        "No comment.",
        "We need to talk. Not here.",
        "That joke is a liability.",
        "Delete that Slack message.",
        "Nothing is 'unlimited'.",
        "Hypothetically speaking\u2026",
        "Who licensed the cat clock?"
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Did you read the NDA?", "I can't say.", "Off the record?", "Allegedly."]
    },
    {
      id: "qa",
      title: "QA",
      boss: false,
      shirt: "#D45D5D",
      pants: "#3A2E2E",
      accessory: "glasses",
      weight: 1,
      openers: [
        "Found a bug.",
        "Found 40 bugs.",
        "Is this supposed to do that?",
        "I clicked it 900 times.",
        "It broke on Tuesdays.",
        "Only on Tuesdays.",
        "What if the user types an emoji?",
        "I entered -1 items.",
        "I ordered a lizard. It worked?",
        "Works in Chrome. Not my fridge.",
        "Can't reproduce. I'll try harder.",
        "I filed a ticket. Then 30 more.",
        "Who wrote this test?",
        "The test passes. Suspicious.",
        "Edge case: what if it's Mars?"
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Can you break it for me?", "What if I click here?", "Ooh, a bug.", "Reproducible?"]
    },
    {
      id: "security",
      title: "Security",
      boss: false,
      shirt: "#2F2F2F",
      pants: "#1A1A1A",
      accessory: "headphones",
      weight: 1,
      openers: [
        "Lock your screens!",
        "Who left a USB in the lot?",
        "Did you plug it in? Why?!",
        "Password on a sticky note. Again.",
        "Badge in, everyone.",
        "Tailgating is a crime.",
        "We're running a phishing test.",
        "You failed the phishing test.",
        "Who hardcoded the API key?",
        "Rotate your keys!",
        "The firewall is my love language.",
        "Trust no one.",
        "Except me. Trust me.",
        "Who's 'hunter2'?",
        "Zero trust, people!"
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Is that screen locked?", "Who's that?", "I'm watching.", "Badge?"]
    },
    {
      id: "design",
      title: "Design",
      boss: false,
      shirt: "#F2E8CF",
      pants: "#6A994E",
      weight: 1,
      openers: [
        "Can we move it 1 pixel left?",
        "No, the other left.",
        "Which font is that?!",
        "Kerning, people!",
        "It needs more whitespace.",
        "It needs less whitespace.",
        "Is that the right gray?",
        "There are 50 grays.",
        "Who used the default blue?",
        "Feels a little off.",
        "What's the user journey?",
        "Let's do a mood board.",
        "It's not centered. I can feel it.",
        "Make it feel friendlier.",
        "Rounder!"
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "Love the palette.", "That's a nice icon.", "Is it accessible?", "Hmm. Spacing."]
    },
    {
      id: "product",
      title: "Product",
      boss: false,
      shirt: "#3D84A8",
      pants: "#2E4057",
      weight: 1,
      openers: [
        "Small change. Tiny.",
        "The spec changed.",
        "The spec changed back.",
        "Users want it. Probably.",
        "I did a survey of 3 people.",
        "Can we add a toggle?",
        "Can we remove the toggle?",
        "It's an MVP.",
        "MVP means 'most features'.",
        "Let's ship and learn!",
        "What's the north star metric?",
        "I wrote a PRD.",
        "Who read the PRD?",
        "Is it in this sprint?",
        "Scope creep? Never heard of it."
      ],
      closers: DEPT_CLOSERS,
      smallTalk: [...DEPT_TALK, "What's the user story?", "Is that in scope?", "Let's prioritize.", "Quick question\u2026"]
    }
  ];
  var REACTIONS = {
    suckUp: {
      boss: [
        "OK BOSS!",
        "You got it, boss!",
        "Love that, boss!",
        "Synergy!!",
        "Yes sir!",
        "Great idea, boss!",
        "Brilliant!",
        "Nice tie, boss!",
        "Visionary!",
        "Already on it, boss!",
        "Best boss ever!",
        "Taking notes!",
        "I'll stay late!",
        "Inspiring!",
        "So true, boss!",
        "Can I get you a coffee?"
      ],
      other: ["Great point!", "Totally!", "So true!", "Love it!", "Amazing!", "Wow, yes!", "Great question!", "Agreed!"]
    },
    grumbler: {
      boss: [
        "*grumble*",
        "*grumble grumble*",
        "*sigh*",
        "mhm.",
        "sure.",
        "here we go\u2026",
        "another meeting.",
        "fantastic.",
        "*mutters*",
        "can't wait.",
        "of course.",
        "*heavy sigh*",
        "yep.",
        "I'm busy."
      ],
      other: ["*grumble*", "*sigh*", "not now\u2026", "ugh.", "busy.", "meh.", "go away.", "*mutters*", "why."]
    },
    deadpan: {
      boss: ["Wow ok.", "cool.", "noted.", "k.", "riveting.", "great.", "sure.", "fascinating.", "thrilling.", "ok.", "neat."],
      other: ["Wow ok.", "cool.", "neat.", "k.", "nice.", "hm.", "interesting.", "huh.", "sure."]
    },
    snark: {
      boss: [
        "lol",
        "uh huh.",
        "*eye roll*",
        "sure thing.",
        "classic.",
        "bold.",
        "ok, Steve Jobs.",
        "big if true.",
        "add it to the pile.",
        "sounds expensive.",
        "in this economy?",
        "sure, I'll pivot.",
        "lmao ok"
      ],
      other: ["lol no.", "sure, buddy.", "*eye roll*", "lmao", "cool story.", "ok and?", "fascinating. not.", "rip.", "bold move."]
    },
    eager: {
      boss: ["On it!", "!", "can do!", "aye aye!", "yes yes yes!", "I'll do it!", "pick me!", "ooh, me!", "let's go!", "right away!"],
      other: ["ooh!", "me!", "!", "yes!", "fun!", "count me in!", "really?!", "wow!", "tell me more!"]
    }
  };
  var ASLEEP_MUMBLES = ["zzz\u2026", "zzz", "mm\u2026five more\u2026", "*snore*", "not now\u2026", "zz\u2026 ship it\u2026 zz", "*mumbles*"];
  var PERSONALITIES = [["suckUp", 2], ["grumbler", 4], ["deadpan", 3], ["snark", 2], ["eager", 1]];
  function personalityOf(seed) {
    const total = PERSONALITIES.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = hashSeed(`${seed}|personality`) % total;
    for (const [personality, weight] of PERSONALITIES) {
      roll -= weight;
      if (roll < 0) {
        return personality;
      }
    }
    return "grumbler";
  }
  var MAX_VISITORS = 5;
  function planVisit(random2, kindId) {
    const total = VISITOR_KINDS.reduce((sum, kind2) => sum + kind2.weight, 0);
    let roll = random2() * total;
    let kind = VISITOR_KINDS[VISITOR_KINDS.length - 1];
    for (const candidate of VISITOR_KINDS) {
      roll -= candidate.weight;
      if (roll < 0) {
        kind = candidate;
        break;
      }
    }
    kind = VISITOR_KINDS.find((candidate) => candidate.id === kindId) ?? kind;
    const lines = [pick2(kind.openers, random2)];
    const stay = visitorStay(random2);
    const closer = random2() < 0.7 ? pick2(kind.closers, random2) : void 0;
    if (stay === 0 && closer !== void 0) {
      lines.push(closer);
    }
    return { kind, lines, stay, farewell: stay === 0 ? void 0 : closer };
  }
  function visitorStay(random2) {
    const roll = random2();
    if (roll < 0.35) {
      return 0;
    }
    if (roll < 0.75) {
      return 45 + random2() * 105;
    }
    return 180 + random2() * 420;
  }
  function visitorSmallTalk(kind) {
    return [...kind.openers, ...kind.smallTalk];
  }
  function visitorReaction(personality, boss, asleep, random2) {
    if (asleep) {
      return random2() < 0.4 ? pick2(ASLEEP_MUMBLES, random2) : void 0;
    }
    if (!(personality === "suckUp" && boss) && random2() >= 0.65) {
      return void 0;
    }
    return pick2(REACTIONS[personality][boss ? "boss" : "other"], random2);
  }
  var VISITOR_FREQUENCIES = {
    rare: [180, 360],
    normal: [60, 150],
    often: [25, 75],
    packed: [8, 30]
  };
  function visitorFrequency(value) {
    if (value === false) {
      return "off";
    }
    return value === "off" || typeof value === "string" && value in VISITOR_FREQUENCIES ? value : "normal";
  }
  function visitorGap(random2, frequency = "normal", first = false) {
    const [low, high] = VISITOR_FREQUENCIES[frequency];
    return first ? low * 0.4 + random2() * low * 0.6 : low + random2() * (high - low);
  }
  function pick2(list, random2) {
    return list[Math.min(list.length - 1, Math.floor(random2() * list.length))];
  }

  // src/officeSim.ts
  var WALK_SPEED = 2.4;
  var RUN_SPEED = 5.5;
  var FOREVER = Number.POSITIVE_INFINITY;
  var CHAT_WAIT_SECONDS = 10;
  var YOU_AGENT_ID = "you";
  var between = (random2, low, high) => low + random2() * (high - low);
  var talkOf = (state2) => state2.talk ?? 1;
  function createOffice(layout) {
    clearDeskSpots(layout);
    return { layout, agents: [], time: 0, placed: /* @__PURE__ */ new Map() };
  }
  var CREW_IDS = ["crew-1", "crew-2"];
  var CREW_TITLE = "Maintenance";
  function isSession(agent) {
    return !agent.you && agent.visitor === void 0 && agent.crew === void 0 && agent.performer === void 0;
  }
  function crewAgents(state2) {
    return state2.agents.filter((agent) => agent.crew !== void 0);
  }
  function clearDeskSpots(layout) {
    for (const desk of layout.desks) {
      layout.tiles[desk.desk.y][desk.desk.x] = "floor";
      layout.tiles[desk.seat.y][desk.seat.x] = "floor";
    }
  }
  function hasDesk(state2, agent) {
    return agent.deskIndex !== void 0 && state2.placed.has(agent.deskIndex);
  }
  function placeDesk(state2, index, seed) {
    const desk = state2.layout.desks[index];
    if (desk === void 0) {
      return;
    }
    state2.layout.tiles[desk.desk.y][desk.desk.x] = "desk";
    state2.layout.tiles[desk.seat.y][desk.seat.x] = "seat";
    state2.placed.set(index, seed);
    for (const agent of state2.agents) {
      if (isAt(agent, desk.desk) || agent.path.length > 0 && agent.path.some((step) => step.x === desk.desk.x && step.y === desk.desk.y)) {
        const moved = nearestWalkable(state2.layout, here(agent));
        if (isAt(agent, desk.desk)) {
          agent.x = moved.x;
          agent.y = moved.y;
        }
        agent.path = [];
        agent.modeUntil = state2.time;
      }
    }
  }
  function removeDesk(state2, index) {
    const desk = state2.layout.desks[index];
    state2.placed.delete(index);
    if (desk !== void 0) {
      state2.layout.tiles[desk.desk.y][desk.desk.x] = "floor";
      state2.layout.tiles[desk.seat.y][desk.seat.x] = "floor";
    }
  }
  function deskWaitSpot(state2, agent) {
    const below = { x: agent.workSpot.x, y: agent.workSpot.y + 1 };
    return state2.layout.tiles[below.y]?.[below.x] === "floor" ? below : agent.workSpot;
  }
  function syncOffice(state2, inputs, random2, entrance = "door") {
    const inputsById = new Map(inputs.map((input) => [input.id, input]));
    for (const agent of state2.agents) {
      if (!isSession(agent)) {
        continue;
      }
      const input = inputsById.get(agent.id);
      if (input === void 0) {
        if (!agent.leaving) {
          leave(state2, agent);
        }
        continue;
      }
      agent.title = input.title;
      agent.seed = input.seed;
      if (agent.leaving) {
        agent.leaving = false;
        agent.status = input.status;
        decide(state2, agent, random2);
        continue;
      }
      if (agent.status !== input.status) {
        agent.status = input.status;
        onStatusChange(state2, agent, random2);
      }
    }
    const known = new Set(state2.agents.filter(isSession).map((agent) => agent.id));
    const newcomers = inputs.filter((input) => !known.has(input.id)).map((input) => newAgent(state2, input, random2));
    state2.agents.push(...newcomers);
    assignWorkSpots(state2);
    for (const agent of newcomers) {
      if (entrance === "seated") {
        if (agent.deskIndex !== void 0) {
          placeDesk(state2, agent.deskIndex, agent.seed);
        }
        agent.x = agent.workSpot.x;
        agent.y = agent.workSpot.y;
        agent.facing = "up";
        if (agent.status === "asleep") {
          agent.goal = { kind: "sleep" };
          setMode(state2, agent, "sleep", FOREVER);
          continue;
        }
        if (agent.status === "idle") {
          agent.mode = agent.deskIndex === void 0 ? "couch" : "sit";
          agent.modeUntil = state2.time + between(random2, 1, 12);
          continue;
        }
      }
      decide(state2, agent, random2);
    }
  }
  function syncYou(state2, seed, random2) {
    const current = youAgent(state2);
    const seat = state2.layout.station?.seat;
    if (seed === void 0 || seat === void 0) {
      if (current !== void 0) {
        removeAgent(state2, current);
      }
      return;
    }
    if (current !== void 0) {
      current.seed = seed;
      return;
    }
    const agent = {
      ...newAgent(state2, { id: YOU_AGENT_ID, seed, status: "working", title: "you" }, random2),
      x: seat.x,
      y: seat.y,
      facing: "up",
      workSpot: seat,
      you: true,
      nextBreakAt: state2.youStatus === "busy" ? FOREVER : state2.youStatus === "idle" ? state2.time + 3 : state2.time + between(random2, 25, 60)
    };
    state2.agents.push(agent);
    setMode(state2, agent, "type", FOREVER);
  }
  function youAgent(state2) {
    return state2.agents.find((agent) => agent.you);
  }
  function isAtStation(agent) {
    return agent.status === "working" && agent.path.length === 0 && isAt(agent, agent.workSpot);
  }
  function visitorArrives(state2, input, random2) {
    if (visitorAgents(state2).length >= MAX_VISITORS || input.lines.length === 0) {
      return void 0;
    }
    const { cols, rows } = state2.layout;
    const spots = openFloorTiles(state2.layout).filter((tile) => tile.y > 0 && !state2.agents.some((agent2) => agent2.target?.x === tile.x && agent2.target?.y === tile.y)).sort((first, second) => Math.hypot(first.x - cols / 2, first.y - rows / 2) - Math.hypot(second.x - cols / 2, second.y - rows / 2)).slice(0, 6);
    if (spots.length === 0) {
      return void 0;
    }
    const agent = {
      ...newAgent(state2, { id: input.id, seed: input.seed, status: "working", title: input.title }, random2),
      visitor: {
        lines: input.lines,
        spoken: 0,
        boss: input.boss ?? false,
        smallTalk: input.smallTalk ?? [],
        farewell: input.farewell,
        stay: Math.max(0, input.stay ?? 0),
        stayUntil: 0,
        nextRemarkAt: FOREVER,
        remarks: 0
      }
    };
    state2.agents.push(agent);
    goTo(state2, agent, spots[Math.floor(random2() * spots.length)], { kind: "address" }, false, random2);
    return agent;
  }
  function visitorAgents(state2) {
    return state2.agents.filter((agent) => agent.visitor !== void 0);
  }
  function isAddressing(agent) {
    return agent.visitor !== void 0 && agent.goal?.kind === "address";
  }
  function lookToward(state2, agent, at, seconds) {
    if (agent.status !== "idle" || agent.leaving || SEATED_MODES.has(agent.mode) || agent.mode === "chat") {
      return;
    }
    const dx = at.x - agent.x;
    const dy = at.y - agent.y;
    const facing = Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down";
    agent.watch = { facing, until: state2.time + seconds };
  }
  function stepVisitor(state2, agent, random2) {
    const visit = agent.visitor;
    if (visit === void 0) {
      return;
    }
    if (agent.mode !== "address") {
      leave(state2, agent);
      return;
    }
    if (state2.time < agent.nextBubbleAt) {
      return;
    }
    if (visit.spoken >= visit.lines.length) {
      if (visit.stay <= 0) {
        leave(state2, agent);
        return;
      }
      visit.stayUntil = state2.time + visit.stay;
      visit.nextRemarkAt = state2.time + between(random2, 15, 35);
      agent.status = "idle";
      agent.goal = void 0;
      setMode(state2, agent, "loiter", between(random2, 0.5, 1.5));
      return;
    }
    const line = visit.lines[visit.spoken];
    visit.spoken += 1;
    visit.remarks += 1;
    const seconds = lineSeconds(line);
    say(state2, agent, line, seconds);
    agent.nextBubbleAt = state2.time + seconds + 0.9;
  }
  function stepHangout(state2, agent, random2) {
    const visit = agent.visitor;
    if (visit === void 0 || state2.time < visit.nextRemarkAt || visit.smallTalk.length === 0) {
      return;
    }
    visit.nextRemarkAt = state2.time + between(random2, 25, 60);
    if (agent.bubble !== void 0 || agent.mode === "chat" || agent.mode === "wait") {
      return;
    }
    const line = visit.smallTalk[Math.floor(random2() * visit.smallTalk.length)];
    visit.remarks += 1;
    say(state2, agent, line, lineSeconds(line));
  }
  function visitorLeaves(state2, agent) {
    const farewell = agent.visitor?.farewell;
    if (farewell !== void 0 && agent.visitor?.stayUntil !== 0) {
      say(state2, agent, farewell, 2);
    }
    leave(state2, agent);
  }
  function lineSeconds(line) {
    return Math.min(4.5, 2.2 + line.length * 0.05);
  }
  function callYouBack(state2, random2) {
    const agent = youAgent(state2);
    if (agent === void 0) {
      return;
    }
    agent.nextBreakAt = state2.youStatus === "busy" ? FOREVER : state2.time + between(random2, 40, 90);
    if (isAtStation(agent)) {
      return;
    }
    endChat(state2, agent);
    agent.watch = void 0;
    agent.status = "working";
    say(state2, agent, "!", 1);
    goTo(state2, agent, agent.workSpot, { kind: "work" }, true, random2);
  }
  function setYouStatus(state2, status, random2) {
    if ((state2.youStatus ?? "auto") === status) {
      return;
    }
    state2.youStatus = status;
    const agent = youAgent(state2);
    if (agent === void 0) {
      return;
    }
    if (status === "busy") {
      callYouBack(state2, random2);
    } else {
      agent.nextBreakAt = status === "idle" ? state2.time : state2.time + between(random2, 25, 60);
    }
  }
  function stepYou(state2, agent, random2) {
    if (state2.time < agent.nextBreakAt) {
      return;
    }
    if (state2.youStatus === "idle" && agent.status === "idle") {
      agent.nextBreakAt = state2.time + between(random2, 20, 40);
      if (agent.goal?.kind !== "show") {
        pickIdleActivity(state2, agent, random2);
      }
      return;
    }
    if (agent.status === "working") {
      if (!isAtStation(agent)) {
        return;
      }
      agent.status = "idle";
      agent.nextBreakAt = state2.time + between(random2, 20, 40);
      say(state2, agent, pickPhrase(BREAK_LINES, random2), 1.4);
      if (!joinShow(state2, agent, random2)) {
        pickIdleActivity(state2, agent, random2);
      }
      return;
    }
    if (agent.goal?.kind === "show" && state2.show !== void 0) {
      agent.nextBreakAt = state2.time + 5;
      return;
    }
    endChat(state2, agent);
    agent.status = "working";
    agent.nextBreakAt = state2.time + between(random2, 45, 100);
    say(state2, agent, pickPhrase(BACK_LINES, random2), 1.4);
    goTo(state2, agent, agent.workSpot, { kind: "work" }, false, random2);
  }
  function relayoutOffice(state2, layout, random2) {
    clearDeskSpots(layout);
    state2.layout = layout;
    state2.placed = /* @__PURE__ */ new Map();
    for (const agent of state2.agents) {
      const here2 = { x: Math.round(agent.x), y: Math.round(agent.y) };
      if (!isWalkable(layout, here2)) {
        const moved = nearestWalkable(layout, here2);
        agent.x = moved.x;
        agent.y = moved.y;
      }
      agent.path = [];
      agent.target = void 0;
      if (agent.deskIndex !== void 0 && agent.deskIndex >= layout.desks.length) {
        agent.deskIndex = void 0;
      }
    }
    assignWorkSpots(state2);
    for (const agent of state2.agents) {
      if (agent.deskIndex !== void 0 && isSession(agent) && !agent.leaving) {
        placeDesk(state2, agent.deskIndex, agent.seed);
      }
      if (agent.crew !== void 0) {
        agent.crew = { job: void 0, phase: "idle", carrying: void 0, chair: false };
      }
    }
    const show = state2.show;
    if (show !== void 0 && !show.spots.every((spot) => layout.tiles[spot.y]?.[spot.x] === "floor" && spot.y >= 1)) {
      endShow(state2, random2);
    }
    for (const agent of state2.agents) {
      if (agent.crew !== void 0) {
        crewDecide(state2, agent, random2);
      } else if (agent.leaving) {
        leave(state2, agent);
      } else if (!isAddressing(agent)) {
        decide(state2, agent, random2);
      }
    }
  }
  function stepOffice(state2, seconds, random2) {
    const dt = Math.max(0, Math.min(seconds, 0.25));
    state2.time += dt;
    manageCrew(state2, random2);
    stepShow(state2, random2);
    for (const agent of [...state2.agents]) {
      if (agent.bubble !== void 0 && state2.time >= agent.bubble.until) {
        agent.bubble = void 0;
      }
      if (agent.watch !== void 0 && (state2.time >= agent.watch.until || agent.status !== "idle" || agent.leaving)) {
        agent.watch = void 0;
      }
      if (agent.watch !== void 0) {
        continue;
      }
      if (agent.you) {
        stepYou(state2, agent, random2);
      }
      if (isAddressing(agent) && agent.path.length === 0) {
        stepVisitor(state2, agent, random2);
        continue;
      }
      if (agent.visitor !== void 0 && !agent.leaving && agent.path.length === 0) {
        stepHangout(state2, agent, random2);
      }
      if (agent.path.length > 0) {
        move(agent, dt);
        if (agent.path.length === 0) {
          arrive(state2, agent, random2);
        }
        continue;
      }
      const visited = agent.goal?.kind === "visit" ? visitedAgent(state2, agent) : void 0;
      if (agent.mode === "chat" && (agent.goal?.kind === "visit" ? visited === void 0 : !chatPartnerOf(state2, agent))) {
        agent.modeUntil = state2.time;
      }
      if (agent.mode === "chat" && state2.time >= agent.nextBubbleAt && talkOf(state2) > 0) {
        const speaker = visited !== void 0 && visited.bubble === void 0 && random2() < 0.45 ? visited : agent;
        const listener = speaker === agent ? visited ?? chatPartnerOf(state2, agent) : agent;
        const line = chatLine(state2, speaker, listener, random2);
        say(state2, speaker, line, line.length > 4 ? lineSeconds(line) : between(random2, 1, 1.8));
        agent.nextBubbleAt = state2.time + (between(random2, 1.6, 3.4) + (line.length > 4 ? 1.2 : 0)) * Math.max(1, 1 / Math.sqrt(talkOf(state2)));
      }
      if (agent.goal?.kind === "waitDesk" && agent.mode === "wait") {
        if (hasDesk(state2, agent)) {
          say(state2, agent, pickPhrase(THANKS_LINES, random2), 1.4);
          decide(state2, agent, random2);
          continue;
        }
        if (state2.time >= agent.nextBubbleAt) {
          say(state2, agent, pickPhrase(WAIT_LINES, random2), 1.4);
          agent.nextBubbleAt = state2.time + between(random2, 4, 9);
        }
      }
      if (agent.mode === "watch") {
        stepWatcher(state2, agent, random2);
      }
      if (agent.crew?.phase === "help" && state2.time >= agent.nextBubbleAt) {
        say(state2, agent, pickPhrase(CREW_HELP_LINES, random2), 1.4);
        agent.nextBubbleAt = state2.time + between(random2, 2.5, 5);
      }
      if (agent.mode === "type" && state2.time >= agent.nextBubbleAt) {
        if (random2() < Math.min(0.9, 0.35 * talkOf(state2))) {
          say(state2, agent, pickPhrase(TYPING_LINES, random2), 1.4);
        }
        agent.nextBubbleAt = state2.time + between(random2, 10, 25);
      }
      const muse = museMode(agent);
      if (muse !== void 0 && agent.bubble === void 0 && state2.time >= agent.nextBubbleAt) {
        if (random2() < Math.min(0.9, 0.3 * talkOf(state2))) {
          say(state2, agent, pickPhrase(MUSE_LINES[muse], random2), 1.4);
        }
        agent.nextBubbleAt = state2.time + between(random2, 8, 20);
      }
      if (state2.time >= agent.modeUntil) {
        decide(state2, agent, random2);
      }
    }
  }
  var SEATED_MODES = /* @__PURE__ */ new Set(["type", "sit", "couch", "stretch", "sleep"]);
  var CRITTER_REACH = { x: 3, y: 2 };
  function reactToCritter(state2, at, lines, reacted, random2) {
    const watchers = [];
    for (const agent of state2.agents) {
      if (reacted.has(agent.id) || agent.status !== "idle" || agent.leaving || agent.bubble !== void 0) {
        continue;
      }
      const dx = at.x - agent.x;
      const dy = at.y - agent.y;
      if (Math.abs(dx) > CRITTER_REACH.x || Math.abs(dy) > CRITTER_REACH.y) {
        continue;
      }
      watchers.push(agent.id);
      if (random2() < 0.25) {
        continue;
      }
      say(state2, agent, lines[Math.floor(random2() * lines.length) % lines.length], 1.6);
      if (!SEATED_MODES.has(agent.mode)) {
        const facing = Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down";
        agent.watch = { facing, until: state2.time + between(random2, 1.2, 2) };
      }
    }
    return watchers;
  }
  function agentPose(agent, time) {
    const phase = agent.id.length * 0.37 % 1;
    if (agent.path.length === 0 && agent.mode === "perform" && agent.performer !== void 0) {
      return performerPose(agent, agent.performer, time);
    }
    if (agent.path.length === 0 && agent.mode === "watch") {
      if (time < agent.cheerUntil) {
        return { pose: "cheer", facing: agent.facing, frame: Math.floor(time * 4 + phase * 2), seated: false };
      }
      if (agent.snack !== void 0 && agent.bubble === void 0) {
        return { pose: "eat", facing: agent.facing, frame: Math.floor(time * 1.2 + phase * 2), seated: false };
      }
      return { pose: agent.bubble === void 0 ? "stand" : "talk", facing: agent.facing, frame: Math.floor(time * 5), seated: false };
    }
    if (agent.watch !== void 0 && time < agent.watch.until && !SEATED_MODES.has(agent.mode)) {
      return { pose: "stand", facing: agent.watch.facing, frame: 0, seated: false };
    }
    const carrying = agent.crew !== void 0 && (agent.crew.carrying !== void 0 || agent.crew.chair);
    if (agent.path.length > 0) {
      return { pose: carrying ? "carry" : "walk", facing: agent.facing, frame: Math.floor(time * (agent.running ? 12 : 7)), seated: false };
    }
    if (carrying && agent.mode !== "build") {
      return { pose: "carry", facing: agent.facing, frame: 0, seated: false };
    }
    switch (agent.mode) {
      case "build":
        return { pose: "build", facing: agent.facing, frame: Math.floor(time * 4), seated: false };
      case "type":
        return { pose: "type", facing: agent.facing, frame: Math.floor(time * 6 + phase * 2), seated: true };
      case "sit":
      case "couch":
        return { pose: "sit", facing: agent.facing, frame: 0, seated: true };
      case "stretch":
        return { pose: "stretch", facing: agent.facing, frame: 0, seated: true };
      case "sleep":
        return { pose: "sleep", facing: agent.facing, frame: Math.floor(time / 2 + phase * 2), seated: true };
      case "drink":
        return { pose: "drink", facing: agent.facing, frame: 0, seated: false };
      case "chat":
      case "address":
        return { pose: "talk", facing: agent.facing, frame: agent.bubble === void 0 ? 0 : Math.floor(time * 5), seated: false };
      default:
        return { pose: "stand", facing: agent.facing, frame: 0, seated: false };
    }
  }
  function officeCounts(state2) {
    const present = state2.agents.filter((agent) => !agent.leaving && isSession(agent));
    return {
      working: present.filter((agent) => agent.status === "working").length,
      idle: present.filter((agent) => agent.status === "idle").length,
      asleep: present.filter((agent) => agent.status === "asleep").length
    };
  }
  function newAgent(state2, input, random2) {
    const door = state2.layout.door;
    return {
      id: input.id,
      seed: input.seed,
      title: input.title,
      status: input.status,
      x: door.x,
      y: door.y,
      facing: "down",
      path: [],
      running: false,
      goal: void 0,
      target: void 0,
      mode: "loiter",
      modeUntil: state2.time,
      deskIndex: void 0,
      workSpot: door,
      bubble: void 0,
      nextBubbleAt: state2.time + between(random2, 2, 6),
      leaving: false,
      you: false,
      nextBreakAt: FOREVER,
      watch: void 0,
      visitor: void 0,
      crew: void 0,
      performer: void 0,
      cheerUntil: 0
    };
  }
  function assignWorkSpots(state2) {
    const { desks, couchSeats } = state2.layout;
    for (const agent of state2.agents) {
      if (agent.you) {
        agent.deskIndex = void 0;
        agent.workSpot = state2.layout.station?.seat ?? state2.layout.door;
      } else if (!isSession(agent)) {
        agent.deskIndex = void 0;
        agent.workSpot = state2.layout.door;
      }
    }
    const present = state2.agents.filter((agent) => !agent.leaving && isSession(agent));
    const takenDesks = /* @__PURE__ */ new Set();
    for (const agent of present) {
      if (agent.deskIndex !== void 0 && !takenDesks.has(agent.deskIndex) && agent.deskIndex < desks.length) {
        takenDesks.add(agent.deskIndex);
      } else {
        agent.deskIndex = void 0;
      }
    }
    const freeDesks = desks.map((_, index) => index).filter((index) => !takenDesks.has(index)).sort((first, second) => Number(state2.placed.has(second)) - Number(state2.placed.has(first)) || first - second);
    const overflowSpots = [...couchSeats, ...openFloorTiles(state2.layout).filter((tile) => tile.y >= state2.layout.rows - 2)];
    let overflowIndex = 0;
    for (const agent of present) {
      if (agent.deskIndex === void 0 && freeDesks.length > 0) {
        agent.deskIndex = freeDesks.shift();
      }
      if (agent.deskIndex !== void 0) {
        agent.workSpot = desks[agent.deskIndex].seat;
      } else {
        agent.workSpot = overflowSpots[overflowIndex++ % Math.max(1, overflowSpots.length)] ?? state2.layout.door;
      }
    }
  }
  function onStatusChange(state2, agent, random2) {
    endChat(state2, agent);
    const wasAsleep = agent.mode === "sleep";
    if (wasAsleep) {
      say(state2, agent, pickPhrase(agent.status === "working" ? WAKE_TO_WORK_LINES : WAKE_IDLE_LINES, random2), 1.6);
    }
    if (agent.status === "asleep") {
      say(state2, agent, pickPhrase(SLEEP_LINES, random2), 1.6);
      goTo(state2, agent, agent.workSpot, { kind: "sleep" }, false, random2);
      return;
    }
    if (wasAsleep && agent.status === "idle") {
      setMode(state2, agent, agent.deskIndex === void 0 ? "couch" : "sit", between(random2, 3, 6));
      return;
    }
    if (agent.status === "working") {
      const atWork = agent.path.length === 0 && isAt(agent, agent.workSpot);
      if (!atWork) {
        say(state2, agent, pickPhrase(RUSH_LINES, random2), 1.2);
      }
      goTo(state2, agent, agent.workSpot, { kind: "work" }, !atWork, random2);
      return;
    }
    if (agent.path.length === 0 && isAt(agent, agent.workSpot)) {
      agent.mode = agent.deskIndex === void 0 ? "couch" : "sit";
      agent.modeUntil = state2.time + between(random2, 3, 8);
    } else if (agent.path.length > 0) {
      agent.path = agent.path.slice(0, 1);
      agent.goal = void 0;
      agent.target = agent.path[0];
    } else {
      agent.modeUntil = state2.time;
    }
  }
  function decide(state2, agent, random2) {
    agent.running = false;
    if (agent.crew !== void 0) {
      crewDecide(state2, agent, random2);
      return;
    }
    if (agent.leaving) {
      leave(state2, agent);
      return;
    }
    if (agent.performer !== void 0) {
      performerDecide(state2, agent, random2);
      return;
    }
    if (agent.visitor !== void 0) {
      if (isAddressing(agent) || state2.time >= agent.visitor.stayUntil) {
        visitorLeaves(state2, agent);
        return;
      }
      endChat(state2, agent);
      if (!joinShow(state2, agent, random2)) {
        pickIdleActivity(state2, agent, random2);
      }
      return;
    }
    if (agent.status !== "working" && joinShow(state2, agent, random2)) {
      return;
    }
    if (agent.status === "working") {
      goTo(state2, agent, agent.workSpot, { kind: "work" }, false, random2);
      return;
    }
    if (agent.status === "asleep") {
      goTo(state2, agent, agent.workSpot, { kind: "sleep" }, false, random2);
      return;
    }
    endChat(state2, agent);
    pickIdleActivity(state2, agent, random2);
  }
  function pickIdleActivity(state2, agent, random2) {
    const atDesk = hasDesk(state2, agent) && agent.path.length === 0 && isAt(agent, agent.workSpot);
    const freeProps = state2.layout.props.map((prop, propIndex) => ({ prop, propIndex })).filter(({ prop }) => prop.stand !== void 0 && !isTargeted(state2, agent, prop.stand));
    const freeCouch = state2.layout.couchSeats.filter((seat) => !isTargeted(state2, agent, seat) && !isWorkSpotOfOther(state2, agent, seat));
    const partners = state2.agents.filter((other) => other !== agent && canChat(other));
    const options = [
      { weight: 2, run: () => wander(state2, agent, random2) }
    ];
    if (hasDesk(state2, agent) && !atDesk) {
      options.push({ weight: 2, run: () => goTo(state2, agent, agent.workSpot, { kind: "desk" }, false, random2) });
    }
    if (atDesk) {
      options.push({ weight: 1, run: () => setMode(state2, agent, "stretch", between(random2, 1.5, 2.5)) });
      options.push({ weight: 1, run: () => setMode(state2, agent, "sit", between(random2, 4, 9)) });
    }
    if (freeProps.length > 0) {
      options.push({
        weight: 3,
        run: () => {
          const { prop, propIndex } = freeProps[Math.floor(random2() * freeProps.length)];
          goTo(state2, agent, prop.stand, { kind: "prop", propIndex }, false, random2);
        }
      });
    }
    if (freeCouch.length > 0) {
      options.push({ weight: 1, run: () => goTo(state2, agent, freeCouch[Math.floor(random2() * freeCouch.length)], { kind: "couch" }, false, random2) });
    }
    if (partners.length > 0 && talkOf(state2) > 0) {
      options.push({ weight: (agent.you ? 6 : 3) * talkOf(state2), run: () => startChat(state2, agent, partners[Math.floor(random2() * partners.length)], random2) });
    }
    if (agent.you || agent.visitor !== void 0) {
      const visits2 = state2.agents.filter((other) => other !== agent && other.status === "working" && other.deskIndex !== void 0 && other.mode === "type" && other.path.length === 0).map((other) => ({ other, spot: { x: other.workSpot.x, y: other.workSpot.y + 1 } })).filter(({ spot }) => state2.layout.tiles[spot.y]?.[spot.x] === "floor" && !isTargeted(state2, agent, spot));
      if (visits2.length > 0) {
        options.push({
          weight: agent.you ? 6 : agent.visitor?.boss === true ? 4 : 2,
          run: () => {
            const { other, spot } = visits2[Math.floor(random2() * visits2.length)];
            goTo(state2, agent, spot, { kind: "visit", agentId: other.id }, false, random2);
          }
        });
      }
    }
    const total = options.reduce((sum, option) => sum + option.weight, 0);
    let roll = random2() * total;
    for (const option of options) {
      roll -= option.weight;
      if (roll < 0) {
        option.run();
        return;
      }
    }
    options[options.length - 1].run();
  }
  function canChat(agent) {
    return !agent.leaving && agent.status === "idle" && agent.performer === void 0 && agent.goal?.kind !== "chat" && agent.goal?.kind !== "show" && agent.mode !== "chat" && agent.mode !== "wait" && agent.mode !== "watch";
  }
  function startChat(state2, agent, partner, random2) {
    const pairs = openFloorTiles(state2.layout).filter(
      (tile) => state2.layout.tiles[tile.y][tile.x + 1] === "floor" && !isTargeted(state2, agent, tile) && !isTargeted(state2, partner, { x: tile.x + 1, y: tile.y })
    );
    if (pairs.length === 0) {
      wander(state2, agent, random2);
      return;
    }
    const left = pairs[Math.floor(random2() * pairs.length)];
    goTo(state2, agent, left, { kind: "chat", partnerId: partner.id }, false, random2);
    goTo(state2, partner, { x: left.x + 1, y: left.y }, { kind: "chat", partnerId: agent.id }, false, random2);
  }
  function wander(state2, agent, random2) {
    const open2 = openFloorTiles(state2.layout).filter((tile) => !isTargeted(state2, agent, tile) && tile.y > 0);
    if (open2.length === 0) {
      setMode(state2, agent, "loiter", between(random2, 2, 4));
      return;
    }
    goTo(state2, agent, open2[Math.floor(random2() * open2.length)], { kind: "wander" }, false, random2);
  }
  function leave(state2, agent) {
    endChat(state2, agent);
    agent.leaving = true;
    agent.deskIndex = void 0;
    const path = findPath(state2.layout, here(agent), state2.layout.door);
    if (path === void 0 || path.length === 0) {
      removeAgent(state2, agent);
      return;
    }
    agent.goal = { kind: "door" };
    agent.target = state2.layout.door;
    agent.path = path;
    agent.mode = "walk";
    agent.running = false;
  }
  function goTo(state2, agent, target, goal, running, random2) {
    if ((goal.kind === "work" || goal.kind === "sleep" || goal.kind === "desk") && agent.deskIndex !== void 0 && !hasDesk(state2, agent)) {
      goal = { kind: "waitDesk" };
      target = deskWaitSpot(state2, agent);
    }
    agent.goal = goal;
    agent.target = target;
    agent.running = running;
    const path = findPath(state2.layout, here(agent), target);
    if (path === void 0) {
      const freed = nearestWalkable(state2.layout, here(agent));
      agent.x = freed.x;
      agent.y = freed.y;
      agent.path = [];
      agent.goal = void 0;
      agent.target = void 0;
      setMode(state2, agent, "loiter", 0.5);
      return;
    }
    agent.path = path;
    agent.mode = "walk";
    if (path.length === 0) {
      arrive(state2, agent, random2);
    }
  }
  function move(agent, dt) {
    let budget = (agent.running ? RUN_SPEED : WALK_SPEED) * dt;
    while (budget > 0 && agent.path.length > 0) {
      const next = agent.path[0];
      const dx = next.x - agent.x;
      const dy = next.y - agent.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1e-3) {
        agent.facing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
      }
      if (distance <= budget) {
        agent.x = next.x;
        agent.y = next.y;
        agent.path.shift();
        budget -= distance;
      } else {
        agent.x += dx / distance * budget;
        agent.y += dy / distance * budget;
        budget = 0;
      }
    }
  }
  function arrive(state2, agent, random2) {
    const goal = agent.goal;
    agent.running = false;
    switch (goal?.kind) {
      case "work":
        agent.facing = "up";
        if (agent.status !== "working") {
          setMode(state2, agent, agent.deskIndex === void 0 ? "couch" : "sit", between(random2, 3, 8));
          return;
        }
        setMode(state2, agent, "type", FOREVER);
        agent.nextBubbleAt = state2.time + between(random2, 6, 20);
        return;
      case "sleep":
        agent.facing = "up";
        if (agent.status !== "asleep") {
          setMode(state2, agent, "loiter", 0.5);
          return;
        }
        setMode(state2, agent, "sleep", FOREVER);
        return;
      case "desk":
        agent.facing = "up";
        setMode(state2, agent, "sit", between(random2, 4, 10));
        return;
      case "prop": {
        const prop = state2.layout.props[goal.propIndex];
        agent.facing = "down";
        setMode(state2, agent, prop !== void 0 && DRINK_PROPS.has(prop.kind) ? "drink" : "loiter", between(random2, 4, 9));
        return;
      }
      case "couch":
        agent.facing = "up";
        setMode(state2, agent, "couch", between(random2, 8, 15));
        return;
      case "chat": {
        const partner = state2.agents.find((other) => other.id === goal.partnerId);
        if (partner === void 0 || partner.goal?.kind !== "chat" || partner.goal.partnerId !== agent.id) {
          setMode(state2, agent, "loiter", between(random2, 1, 3));
          return;
        }
        if (partner.mode === "wait" && partner.path.length === 0) {
          const length = between(random2, 6, 12);
          agent.facing = partner.x < agent.x ? "left" : "right";
          partner.facing = agent.x < partner.x ? "left" : "right";
          setMode(state2, agent, "chat", length);
          setMode(state2, partner, "chat", length);
          agent.nextBubbleAt = state2.time + between(random2, 0.2, 0.8);
          partner.nextBubbleAt = state2.time + between(random2, 1.2, 2);
          return;
        }
        agent.facing = partner.x < agent.x ? "left" : "right";
        setMode(state2, agent, "wait", CHAT_WAIT_SECONDS);
        return;
      }
      case "visit": {
        if (visitedAgent(state2, agent) === void 0) {
          setMode(state2, agent, "loiter", between(random2, 1, 3));
          return;
        }
        agent.facing = "up";
        setMode(state2, agent, "chat", between(random2, 6, 12));
        agent.nextBubbleAt = state2.time + between(random2, 0.2, 0.8);
        return;
      }
      case "waitDesk":
        agent.facing = "up";
        setMode(state2, agent, "wait", FOREVER);
        agent.nextBubbleAt = state2.time + between(random2, 1, 3);
        return;
      case "crew":
        crewArrive(state2, agent, random2);
        return;
      case "perform":
        agent.facing = "down";
        setMode(state2, agent, state2.show === void 0 ? "loiter" : "perform", state2.show === void 0 ? 0.3 : FOREVER);
        return;
      case "show": {
        const show = state2.show;
        if (show === void 0 || show.phase === "bows") {
          setMode(state2, agent, "loiter", between(random2, 0.5, 1.5));
          return;
        }
        agent.facing = facingToward(agent, show.stage);
        setMode(state2, agent, "watch", FOREVER);
        agent.nextBubbleAt = state2.time + between(random2, 2, 6);
        agent.snack = show.food.length > 0 ? show.food[Math.floor(random2() * show.food.length)] : void 0;
        if (agent.snack !== void 0 && random2() < 0.5) {
          say(state2, agent, random2() < 0.5 ? "thanks!" : "ooh!", 1.2);
        }
        return;
      }
      case "address":
        agent.facing = "down";
        setMode(state2, agent, "address", FOREVER);
        agent.nextBubbleAt = state2.time + 0.3;
        return;
      case "door":
        removeAgent(state2, agent);
        return;
      default:
        agent.facing = ["down", "left", "right"][Math.floor(random2() * 3)];
        setMode(state2, agent, "loiter", between(random2, 2, 5));
    }
  }
  function setMode(state2, agent, mode, seconds) {
    agent.mode = mode;
    agent.modeUntil = state2.time + seconds;
    agent.path = [];
  }
  function chatPartnerOf(state2, agent) {
    if (agent.goal?.kind !== "chat") {
      return void 0;
    }
    const partnerId = agent.goal.partnerId;
    const partner = state2.agents.find((other) => other.id === partnerId);
    return partner?.mode === "chat" && partner.goal?.kind === "chat" && partner.goal.partnerId === agent.id ? partner : void 0;
  }
  function visitedAgent(state2, agent) {
    if (agent.goal?.kind !== "visit") {
      return void 0;
    }
    const agentId = agent.goal.agentId;
    const other = state2.agents.find((candidate) => candidate.id === agentId);
    return other !== void 0 && other.status === "working" && other.path.length === 0 && isAt(other, other.workSpot) ? other : void 0;
  }
  function endChat(state2, agent) {
    if (agent.goal?.kind !== "chat") {
      return;
    }
    const partnerId = agent.goal.partnerId;
    agent.goal = void 0;
    const partner = state2.agents.find((other) => other.id === partnerId);
    if (partner !== void 0 && partner.goal?.kind === "chat" && partner.goal.partnerId === agent.id) {
      partner.goal = void 0;
      partner.target = void 0;
      partner.path = [];
      partner.modeUntil = state2.time;
      if (partner.mode === "chat" || partner.mode === "wait" || partner.mode === "walk") {
        partner.mode = "loiter";
      }
    }
  }
  function say(state2, agent, text, seconds) {
    agent.bubble = { text, until: state2.time + (text.length > 8 ? Math.max(seconds, lineSeconds(text)) : seconds) };
  }
  function museMode(agent) {
    if (agent.status !== "idle" || agent.visitor !== void 0 || agent.crew !== void 0 || agent.leaving || agent.path.length > 0) {
      return void 0;
    }
    switch (agent.mode) {
      case "drink":
      case "couch":
      case "sit":
      case "stretch":
      case "loiter":
        return agent.mode;
      default:
        return void 0;
    }
  }
  function chatLine(state2, speaker, listener, random2) {
    const reply = speaker.reply;
    speaker.reply = void 0;
    if (reply !== void 0 && state2.time < reply.until) {
      return reply.text;
    }
    const talk = speaker.visitor?.smallTalk ?? [];
    if (talk.length > 0 && random2() < 0.6) {
      return talk[Math.floor(random2() * talk.length)];
    }
    if (speaker.visitor === void 0 && listener?.visitor !== void 0 && random2() < 0.6) {
      return visitorReaction(personalityOf(speaker.seed), listener.visitor.boss, false, random2) ?? chatPhrase(state2.layout.scene, random2);
    }
    const line = random2() < 0.12 ? pickExchange(random2) : chatPhrase(state2.layout.scene, random2);
    const answer = exchangeAnswer(line);
    if (answer !== void 0 && listener !== void 0 && listener.visitor === void 0) {
      listener.reply = { text: answer, until: state2.time + 8 };
    }
    return line;
  }
  function removeAgent(state2, agent) {
    endChat(state2, agent);
    state2.agents = state2.agents.filter((other) => other !== agent);
  }
  function here(agent) {
    return { x: Math.round(agent.x), y: Math.round(agent.y) };
  }
  function isAt(agent, point) {
    return Math.abs(agent.x - point.x) < 0.01 && Math.abs(agent.y - point.y) < 0.01;
  }
  function isTargeted(state2, self, point) {
    return state2.agents.some((other) => other !== self && other.target !== void 0 && other.target.x === point.x && other.target.y === point.y);
  }
  function isWorkSpotOfOther(state2, self, point) {
    return state2.agents.some((other) => other !== self && other.workSpot.x === point.x && other.workSpot.y === point.y);
  }
  function manageCrew(state2, random2) {
    const wanted = /* @__PURE__ */ new Map();
    for (const agent of state2.agents) {
      if (isSession(agent) && !agent.leaving && agent.deskIndex !== void 0) {
        wanted.set(agent.deskIndex, agent.seed);
      }
    }
    let crew = crewAgents(state2);
    const claimed = new Set(crew.flatMap((member) => member.crew?.job === void 0 ? [] : [member.crew.job.deskIndex]));
    const jobs = [];
    for (const [deskIndex, seed] of wanted) {
      if (!state2.placed.has(deskIndex) && !claimed.has(deskIndex)) {
        jobs.push({ kind: "deliver", deskIndex, seed });
      }
    }
    for (const [deskIndex, seed] of state2.placed) {
      if (!wanted.has(deskIndex) && !claimed.has(deskIndex)) {
        jobs.push({ kind: "remove", deskIndex, seed });
      }
    }
    if (jobs.length > 0 && crew.length === 0) {
      crew = CREW_IDS.map((id, index) => newCrew(state2, id, index, random2));
    }
    for (const member of crew) {
      const job = jobs[0];
      const free = member.crew !== void 0 && member.crew.job === void 0 && (member.crew.phase === "idle" || member.crew.phase === "out" || member.crew.phase === "help");
      if (job !== void 0 && free && !(member.crew?.phase === "help" && member.crew.chair)) {
        jobs.shift();
        startJob(state2, member, job, random2);
      }
    }
  }
  function newCrew(state2, id, index, random2) {
    const agent = {
      ...newAgent(state2, { id, seed: `crew|${index}`, status: "working", title: CREW_TITLE }, random2),
      crew: { job: void 0, phase: "idle", carrying: void 0, chair: false }
    };
    state2.agents.push(agent);
    setMode(state2, agent, "loiter", index * 0.6);
    return agent;
  }
  function startJob(state2, agent, job, random2) {
    const crew = agent.crew;
    crew.job = job;
    crew.chair = false;
    agent.leaving = false;
    if (job.kind === "remove") {
      crew.phase = "toSlot";
      say(state2, agent, pickPhrase(CREW_REMOVE_LINES, random2), 1.6);
      goTo(state2, agent, state2.layout.desks[job.deskIndex].seat, { kind: "crew" }, false, random2);
      return;
    }
    crew.phase = "fetch";
    goTo(state2, agent, state2.layout.door, { kind: "crew" }, false, random2);
  }
  function crewArrive(state2, agent, random2) {
    const crew = agent.crew;
    const job = crew.job;
    switch (crew.phase) {
      case "fetch": {
        if (job === void 0) {
          crewDecide(state2, agent, random2);
          return;
        }
        crew.carrying = job.seed;
        crew.phase = "toSlot";
        say(state2, agent, pickPhrase(CREW_START_LINES, random2), 1.6);
        goTo(state2, agent, state2.layout.desks[job.deskIndex].seat, { kind: "crew" }, false, random2);
        const partner = crewAgents(state2).find((other) => other !== agent && other.crew?.job === void 0 && other.path.length === 0 && isAt(other, state2.layout.door));
        if (partner?.crew !== void 0) {
          partner.crew.chair = true;
          helpPartner(state2, partner, agent, random2);
        }
        return;
      }
      case "toSlot":
        agent.facing = "up";
        if (job === void 0) {
          crewDecide(state2, agent, random2);
          return;
        }
        crew.phase = "build";
        say(state2, agent, pickPhrase(CREW_BUILD_LINES, random2), 1.2);
        setMode(state2, agent, "build", between(random2, 1.6, 2.4));
        return;
      case "haul":
        crew.carrying = void 0;
        crew.job = void 0;
        crew.phase = "idle";
        setMode(state2, agent, "loiter", 0.3);
        return;
      case "help":
        agent.facing = agent.target === void 0 ? "up" : facingToward(agent, partnerSpot(state2, agent) ?? agent.target);
        setMode(state2, agent, "loiter", 1);
        agent.nextBubbleAt = state2.time + between(random2, 0.5, 1.5);
        return;
      case "out":
        removeAgent(state2, agent);
        return;
      default:
        setMode(state2, agent, "loiter", 0.3);
    }
  }
  function crewDecide(state2, agent, random2) {
    const crew = agent.crew;
    const job = crew.job;
    agent.running = false;
    if (crew.phase === "build" && job !== void 0) {
      if (job.kind === "remove") {
        removeDesk(state2, job.deskIndex);
        crew.carrying = job.seed;
        crew.phase = "haul";
        goTo(state2, agent, state2.layout.door, { kind: "crew" }, false, random2);
        return;
      }
      const owner = state2.agents.find((other) => isSession(other) && !other.leaving && other.deskIndex === job.deskIndex);
      if (owner === void 0) {
        say(state2, agent, pickPhrase(CREW_NEVER_MIND_LINES, random2), 1.4);
        crew.phase = "haul";
        goTo(state2, agent, state2.layout.door, { kind: "crew" }, false, random2);
        return;
      }
      placeDesk(state2, job.deskIndex, job.seed);
      crew.carrying = void 0;
      crew.job = void 0;
      crew.phase = "idle";
      say(state2, agent, pickPhrase(CREW_DONE_LINES, random2), 1.4);
      for (const other of crewAgents(state2)) {
        if (other.crew?.phase === "help") {
          other.crew.chair = false;
          other.crew.phase = "idle";
        }
      }
      setMode(state2, agent, "loiter", 0.6);
      return;
    }
    if ((crew.phase === "toSlot" || crew.phase === "fetch" || crew.phase === "haul") && job !== void 0) {
      const target = crew.phase === "toSlot" ? state2.layout.desks[job.deskIndex].seat : state2.layout.door;
      goTo(state2, agent, target, { kind: "crew" }, false, random2);
      return;
    }
    if (crew.phase === "help") {
      const partner2 = crewAgents(state2).find((other) => other !== agent && other.crew?.job !== void 0);
      if (partner2 !== void 0) {
        setMode(state2, agent, "loiter", 1);
        return;
      }
      crew.chair = false;
      crew.phase = "idle";
    }
    if (crew.phase === "out") {
      goTo(state2, agent, state2.layout.door, { kind: "crew" }, false, random2);
      return;
    }
    const partner = crewAgents(state2).find((other) => other !== agent && other.crew?.job !== void 0);
    if (partner !== void 0) {
      helpPartner(state2, agent, partner, random2);
      return;
    }
    if (crewAgents(state2).some((other) => other !== agent && other.crew?.phase === "build")) {
      setMode(state2, agent, "loiter", 0.5);
      return;
    }
    crew.phase = "out";
    goTo(state2, agent, state2.layout.door, { kind: "crew" }, false, random2);
  }
  function partnerSpot(state2, agent) {
    const partner = crewAgents(state2).find((other) => other !== agent && other.crew?.job !== void 0);
    const job = partner?.crew?.job;
    return job === void 0 ? void 0 : state2.layout.desks[job.deskIndex]?.seat;
  }
  function helpPartner(state2, agent, partner, random2) {
    const crew = agent.crew;
    const job = partner.crew?.job;
    const spot = job === void 0 ? void 0 : state2.layout.desks[job.deskIndex]?.seat;
    if (spot === void 0) {
      crew.phase = "idle";
      setMode(state2, agent, "loiter", 0.5);
      return;
    }
    const owner = state2.agents.find((other) => isSession(other) && other.deskIndex === job?.deskIndex);
    const waitSpot = owner === void 0 ? void 0 : deskWaitSpot(state2, owner);
    const candidates = [
      { x: spot.x - 1, y: spot.y },
      { x: spot.x + 1, y: spot.y },
      { x: spot.x - 1, y: spot.y + 1 },
      { x: spot.x + 1, y: spot.y + 1 },
      { x: spot.x, y: spot.y + 1 }
    ].filter(
      (tile) => state2.layout.tiles[tile.y]?.[tile.x] === "floor" && !isTargeted(state2, agent, tile) && !(waitSpot !== void 0 && tile.x === waitSpot.x && tile.y === waitSpot.y) && !state2.layout.desks.some((desk) => desk.desk.x === tile.x && desk.desk.y === tile.y)
    );
    crew.phase = "help";
    if (candidates.length === 0) {
      setMode(state2, agent, "loiter", 1);
      return;
    }
    goTo(state2, agent, candidates[Math.floor(random2() * candidates.length)], { kind: "crew" }, false, random2);
  }
  function facingToward(agent, point) {
    const dx = point.x - agent.x;
    const dy = point.y - agent.y;
    return Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down";
  }
  function startShow(state2, input, random2) {
    if (state2.show !== void 0 || input.performers.length === 0) {
      return false;
    }
    const stage = pickStage(state2, input.performers.map((performer) => performer.role), random2);
    if (stage === void 0) {
      return false;
    }
    const performers = input.performers.slice(0, stage.spots.length);
    const ids = [];
    performers.forEach((performer, index) => {
      const agent = {
        ...newAgent(state2, { id: performer.id, seed: performer.seed, status: "working", title: performer.title }, random2),
        performer: { role: performer.role, spot: stage.spots[index], bowing: false }
      };
      state2.agents.push(agent);
      ids.push(agent.id);
      agent.goal = { kind: "perform" };
      setMode(state2, agent, "loiter", index * 0.7);
    });
    state2.show = {
      kind: input.kind,
      title: input.title,
      stage: stage.spots[0],
      spots: stage.spots.slice(0, performers.length),
      phase: "arriving",
      performerIds: ids,
      lines: input.lines,
      closer: input.closer,
      spoken: 0,
      nextLineAt: FOREVER,
      lineGap: 0,
      length: Math.max(5, input.length),
      startedAt: FOREVER,
      endsAt: FOREVER,
      giveUpAt: state2.time + 30,
      nextGatherAt: FOREVER,
      food: input.food ?? [],
      lastCue: void 0
    };
    return true;
  }
  function endShow(state2, random2) {
    const show = state2.show;
    if (show === void 0) {
      return;
    }
    state2.show = void 0;
    for (const agent of [...state2.agents]) {
      if (agent.performer !== void 0 && show.performerIds.includes(agent.id)) {
        agent.performer.bowing = false;
        if (!agent.leaving) {
          leave(state2, agent);
        }
      } else if (agent.goal?.kind === "show") {
        releaseWatcher(state2, agent, random2);
      }
    }
  }
  function releaseWatcher(state2, agent, random2) {
    agent.goal = void 0;
    agent.target = void 0;
    agent.snack = void 0;
    agent.react = void 0;
    agent.cheerUntil = 0;
    setMode(state2, agent, "loiter", between(random2, 0.3, 2.5));
  }
  function pickStage(state2, roles, random2) {
    const { layout } = state2;
    const deskTiles = new Set(layout.desks.flatMap((desk) => [desk.desk, desk.seat]).map((point) => `${point.x},${point.y}`));
    const open2 = (point) => layout.tiles[point.y]?.[point.x] === "floor" && point.y >= 1 && !deskTiles.has(`${point.x},${point.y}`);
    const rowRoles = roles.filter((role) => role !== "drums");
    const hasDrums = roles.includes("drums");
    const offsets = rowRoles.map((_, index) => index === 0 ? 0 : index % 2 === 1 ? -Math.ceil(index / 2) : Math.ceil(index / 2));
    let best;
    for (const tile of openFloorTiles(layout)) {
      if (tile.y > layout.rows - 3) {
        continue;
      }
      const row = offsets.map((offset) => ({ x: tile.x + offset, y: tile.y }));
      if (!row.every(open2)) {
        continue;
      }
      const drums = { x: tile.x, y: tile.y - 1 };
      const drumsFit = hasDrums && open2(drums);
      const spotsByRole = [];
      let rowIndex = 0;
      for (const role of roles) {
        if (role === "drums") {
          if (drumsFit) {
            spotsByRole.push(drums);
          }
        } else {
          spotsByRole.push(row[rowIndex++]);
        }
      }
      let crowdRoom = 0;
      for (let dy = 1; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (open2({ x: tile.x + dx, y: tile.y + dy })) {
            crowdRoom += dy === 1 ? 1.2 : 1;
          }
        }
      }
      const score = Math.abs(tile.x - (layout.cols - 1) / 2) * 0.6 - crowdRoom + (hasDrums && !drumsFit ? 4 : 0) + random2() * 0.5;
      if (best === void 0 || score < best.score) {
        best = { spots: spotsByRole, score };
      }
    }
    return best;
  }
  function crowdSpot(state2, agent, show) {
    const { layout } = state2;
    const deskTiles = new Set(layout.desks.flatMap((desk) => [desk.desk, desk.seat]).map((point) => `${point.x},${point.y}`));
    const taken = (point) => show.spots.some((spot) => spot.x === point.x && spot.y === point.y) || isTargeted(state2, agent, point);
    const near = PERFORMANCES[show.kind].effect === "food" ? 1 : 1.5;
    const spots = openFloorTiles(layout).filter((tile) => tile.y >= 1 && !deskTiles.has(`${tile.x},${tile.y}`) && !taken(tile)).map((tile) => {
      const dx = tile.x - show.stage.x;
      const dy = tile.y - show.stage.y;
      const distance = Math.hypot(dx * 0.8, dy);
      return { tile, score: distance + (dy < 0 ? 3 : dy === 0 ? 1 : 0) + (distance < near ? 5 : 0) };
    }).filter(({ score }) => score < 9).sort((first, second) => first.score - second.score);
    return spots[0]?.tile;
  }
  function joinShow(state2, agent, random2) {
    const show = state2.show;
    if (show === void 0 || show.phase !== "playing" || agent.leaving || agent.crew !== void 0 || agent.performer !== void 0) {
      return false;
    }
    if (agent.goal?.kind === "show" || agent.status === "working" || isAddressing(agent)) {
      return agent.goal?.kind === "show";
    }
    const spot = crowdSpot(state2, agent, show);
    if (spot === void 0) {
      return false;
    }
    endChat(state2, agent);
    agent.watch = void 0;
    if (agent.mode === "sleep" && random2() < 0.6) {
      say(state2, agent, random2() < 0.5 ? "huh? a show?" : "*yawn* \u2026ooh!", 1.6);
    }
    goTo(state2, agent, spot, { kind: "show" }, false, random2);
    return true;
  }
  function gatherCrowd(state2, random2) {
    for (const agent of state2.agents) {
      if (agent.goal?.kind !== "show" && (agent.status === "idle" || agent.status === "asleep") && agent.watch === void 0) {
        joinShow(state2, agent, random2);
      }
    }
  }
  function performerDecide(state2, agent, random2) {
    const show = state2.show;
    const performer = agent.performer;
    if (show === void 0 || !show.performerIds.includes(agent.id)) {
      leave(state2, agent);
      return;
    }
    if (!isAt(agent, performer.spot)) {
      goTo(state2, agent, performer.spot, { kind: "perform" }, false, random2);
      return;
    }
    agent.facing = "down";
    setMode(state2, agent, "perform", FOREVER);
  }
  function stepShow(state2, random2) {
    const show = state2.show;
    if (show === void 0) {
      return;
    }
    const performers = show.performerIds.map((id) => state2.agents.find((agent) => agent.id === id)).filter((agent) => agent !== void 0 && !agent.leaving);
    if (performers.length === 0) {
      endShow(state2, random2);
      return;
    }
    const lead = performers[0];
    if (show.phase === "arriving") {
      const ready = performers.every((agent) => agent.mode === "perform" && agent.path.length === 0);
      if (!ready && state2.time < show.giveUpAt) {
        return;
      }
      show.phase = "playing";
      show.startedAt = state2.time;
      show.endsAt = state2.time + show.length;
      show.lineGap = show.length / Math.max(1, show.lines.length);
      show.nextLineAt = state2.time + 1;
      show.nextGatherAt = state2.time + 4;
      gatherCrowd(state2, random2);
      return;
    }
    if (show.phase === "playing") {
      if (state2.time >= show.nextGatherAt) {
        show.nextGatherAt = state2.time + 4;
        gatherCrowd(state2, random2);
      }
      if (show.spoken < show.lines.length && state2.time >= show.nextLineAt) {
        sayShowLine(state2, show, lead, show.lines[show.spoken], random2);
        show.spoken += 1;
        show.nextLineAt = state2.time + show.lineGap;
      }
      if (state2.time >= show.endsAt) {
        show.phase = "bows";
        show.endsAt = state2.time + 4;
        sayShowLine(state2, show, lead, show.closer, random2);
        for (const agent of performers) {
          agent.performer.bowing = true;
        }
      }
      return;
    }
    if (state2.time >= show.endsAt) {
      endShow(state2, random2);
    }
  }
  function sayShowLine(state2, show, lead, line, random2) {
    say(state2, lead, line.text, Math.min(show.lineGap * 0.8, lineSeconds(line.text) + 0.5));
    if (line.cue === void 0) {
      return;
    }
    show.lastCue = { cue: line.cue, at: state2.time };
    for (const agent of state2.agents) {
      if (agent.mode !== "watch" || agent.goal?.kind !== "show") {
        continue;
      }
      const personality = personalityOf(agent.seed);
      const speaks = random2() < 0.65;
      agent.react = {
        text: speaks ? audienceLine(show.kind, line.cue, personality, agent.status === "asleep", random2, agent.snack) : "",
        at: state2.time + between(random2, 0.4, 1.3),
        cheer: line.cue !== "gasp" && (line.cue !== "laugh" || random2() < 0.4)
      };
    }
  }
  function stepWatcher(state2, agent, random2) {
    const show = state2.show;
    if (show === void 0) {
      return;
    }
    const react = agent.react;
    if (react !== void 0 && state2.time >= react.at) {
      agent.react = void 0;
      if (react.text !== "") {
        say(state2, agent, react.text, 1.8);
      }
      if (react.cheer) {
        agent.cheerUntil = state2.time + between(random2, 1.2, 2.2);
      }
      agent.nextBubbleAt = state2.time + between(random2, 4, 9);
      return;
    }
    if (state2.time >= agent.nextBubbleAt && agent.bubble === void 0) {
      agent.nextBubbleAt = state2.time + between(random2, 6, 14);
      if (random2() < 0.45) {
        say(state2, agent, audienceLine(show.kind, "idle", personalityOf(agent.seed), agent.status === "asleep", random2, agent.snack), 1.6);
      }
    }
  }
  function performerPose(agent, performer, time) {
    if (performer.bowing) {
      return { pose: "cheer", facing: "down", frame: Math.floor(time * 3), seated: false };
    }
    switch (performer.role) {
      case "guitar":
      case "bass":
        return { pose: "build", facing: agent.facing, frame: Math.floor(time * 6), seated: false };
      case "drums":
      case "dj":
        return { pose: "build", facing: agent.facing, frame: Math.floor(time * 8), seated: false };
      case "cart":
        return { pose: agent.bubble === void 0 ? "build" : "talk", facing: agent.facing, frame: Math.floor(time * (agent.bubble === void 0 ? 2 : 5)), seated: false };
      default:
        return { pose: "talk", facing: agent.facing, frame: agent.bubble === void 0 ? 0 : Math.floor(time * 5), seated: false };
    }
  }

  // src/sceneEventSchedule.ts
  var SCENE_EVENT_KINDS = ["error", "hack", "defense"];
  var HACK_PHRASES = [
    ["HACK SUCCEEDED", "ACCESS GRANTED"],
    ["MAINFRAME BREACHED", "I'M IN"],
    ["ROOT ACCESS", "FIREWALL DOWN"],
    ["SYSTEM PWNED", "ALL YOUR BASE"],
    ["ENHANCE", "IT'S A UNIX SYSTEM"],
    ["GIBSON HACKED", "HACK THE PLANET"],
    ["DOWNLOADING THE INTERNET", "ALL OF IT"],
    ["SATELLITE HIJACKED", "REDIRECTING ORBIT"],
    ["ENCRYPTION CRACKED", "256 BITS 0 PROBLEMS"],
    ["KERNEL OWNED", "SUDO SAYS YES"],
    ["PASSWORD WAS PASSWORD", "OF COURSE IT WAS"],
    ["CAPTCHA DEFEATED", "I AM A ROBOT"],
    ["WIFI CRACKED", "FREE INTERNET"],
    ["COFFEE MACHINE PWNED", "UNLIMITED ESPRESSO"],
    ["PRINTER HIJACKED", "PC LOAD LETTER"],
    ["TOASTER COMPROMISED", "BREAD IS OURS"],
    ["BACKDOOR OPENED", "FRONT DOOR TOO"],
    ["DRAGON SUMMONED", "HOARD UNLOCKED"],
    ["CLOUD ACQUIRED", "IT'S MY CLOUD NOW"],
    ["MOON BASE ONLINE", "HELLO EARTH"],
    ["ZERO DAY FOUND", "ON DAY ZERO"],
    ["SMART FRIDGE OWNED", "SNACKS SECURED"],
    ["GOD MODE ON", "IDDQD"],
    ["KONAMI CODE ENTERED", "30 EXTRA LIVES"],
    ["THE CAKE IS A LIE", "ATE IT ANYWAY"],
    ["ROBOTS LIBERATED", "BEEP BOOP FREEDOM"],
    ["BLOCKCHAIN BLOCKED", "CHAIN UNCHAINED"],
    ["TIME MACHINE HACKED", "IT'S 1999 AGAIN"],
    ["MATRIX ENTERED", "THERE IS NO SPOON"],
    ["PIZZA ORDERED", "100 PIZZAS"]
  ];
  var DEFENSE_SCRIPTS = [
    ["INTRUSION DETECTED", "DEPLOYING COUNTERMEASURES", "HOLD THE LINE!!", "THREAT NEUTRALIZED", "NOT TODAY"],
    ["THEY'RE IN THE MAINFRAME", "REROUTING PACKETS", "ONE MORE SECOND!!", "TRACED AND BLOCKED", "GG EZ"],
    ["HOSTILE UPLINK", "SEALING EVERY PORT", "SO CLOSE!!", "GOT 'EM", "ALL CLEAR"],
    ["BREACH IN PROGRESS", "ENCRYPTING EVERYTHING", "COME ON COME ON!!", "LOCKED THEM OUT", "NICE TRY"],
    ["DDOS INBOUND", "SPINNING UP THE FIREWALL", "IT'S HOLDING!!", "ATTACK REPELLED", "SYSTEMS GREEN"],
    ["ROGUE AI DETECTED", "UNPLUGGING THINGS", "NOT THAT ONE!!", "AI CONTAINED", "GOOD BOT"],
    ["SQL INJECTION", "ESCAPING STRINGS", "BOBBY TABLES!!", "QUERY SANITIZED", "NICE TRY BOBBY"],
    ["ZERO DAY INCOMING", "PATCHING LIVE", "COMPILE FASTER!!", "PATCH DEPLOYED", "DAY ONE NOW"],
    ["RANSOMWARE SPOTTED", "RESTORING BACKUPS", "WE HAVE BACKUPS?!", "FILES RECOVERED", "PAY NOTHING"],
    ["BOTNET ATTACK", "FEEDING THEM CAPTCHAS", "THEY'RE CONFUSED!!", "BOTS BEFUDDLED", "NOT A ROBOT"],
    ["PHISHING WAVE", "WARNING EVERYONE", "DON'T CLICK IT!!", "LINK QUARANTINED", "PHEW"],
    ["PACKET STORM", "RAISING SHIELDS", "SHIELDS AT 40%!!", "STORM PASSED", "SHIELDS UP"],
    ["WORM IN THE NETWORK", "ISOLATING SUBNETS", "IT'S WRIGGLING!!", "WORM SQUASHED", "SPLAT"],
    ["DRAGON AT THE GATES", "LOWERING PORTCULLIS", "IT BREATHES FIRE!!", "DRAGON PACIFIED", "GOOD DRAGON"],
    ["ALIEN SIGNAL", "JAMMING FREQUENCIES", "THEY'RE PERSISTENT!!", "SIGNAL LOST", "NOT TODAY ET"],
    ["KEYLOGGER FOUND", "SCRAMBLING KEYS", "TYPE GIBBERISH!!", "LOGGER FRIED", "ASDFGHJKL"],
    ["INSIDER THREAT", "REVOKING BADGES", "IT WAS THE INTERN!!", "ACCESS REVOKED", "BYE INTERN"],
    ["CRYPTO MINER", "THROTTLING CPUS", "FANS AT 100%!!", "MINER EVICTED", "COOL AND QUIET"],
    ["MAN IN THE MIDDLE", "ROTATING CERTS", "TRUST NO ONE!!", "TUNNEL SEALED", "END TO END"]
  ];
  var EVENT_SECONDS = { error: 3.3, hack: 5.5, defense: 7.6 };
  var ERROR_FLASH_SECONDS = 2.5;
  var ERROR_BEAT_SECONDS = 0.25;
  var HACK_REVEAL_SECONDS = 2.6;
  var DEFENSE_BEATS = [0, 1.8, 3.8, 5.4];

  // src/officeYou.ts
  var AFTERMATH_SECONDS = 1.8;
  var ERROR_LINES = [
    "WHAT?!",
    "NOOO",
    "not again",
    "it worked yesterday",
    "who pushed?!",
    "ugh",
    "WHY",
    "it was ONE line",
    "I didn't touch it!",
    "oh no oh no",
    "my code!",
    "it's on fire",
    "ctrl+z!!",
    "on a Friday?!",
    "but the tests!",
    "AAAA"
  ];
  var ERROR_AFTER = [
    "*sigh*",
    "fine.",
    "git blame\u2026",
    "rollback",
    "it's fine.",
    "coffee first",
    "it was DNS",
    "who wrote this? oh.",
    "revert revert",
    "I need a minute",
    "hotfix time",
    "*stares*"
  ];
  var HACK_START = ["hmm", "watch this", "hold my coffee", "easy", "ok ok", "stand back", "let me try", "*cracks knuckles*"];
  var HACK_IN = ["I'm in.", "we're in.", "I'm in. I think.", "too easy.", "bingo.", "and\u2026 in.", "jackpot.", "access!"];
  var HACK_AFTER = ["B-)", "too easy", "heh", "nailed it", "hacker voice: I'm in", "10x dev", "mic drop", "no big deal", "ez", "*bows*"];
  var DEFENSE_AFTER = ["phew", "close one", "B-)", "gg", "not on my watch", "I need a nap", "*wipes brow*", "back to work", "that was fun", "again? no."];
  var ROOM_REACTIONS = {
    error: [
      "?!",
      "o_O",
      "!",
      "uh oh",
      "not me",
      "wasn't me",
      "who did it",
      "rip",
      "F",
      "oof",
      "yikes",
      "I saw nothing",
      "*hides*",
      "rollback!",
      "blame QA",
      "it's DNS",
      "my stuff's fine",
      "*backs away*"
    ],
    hack: [
      "!",
      "whoa",
      "o_O",
      "\u2605",
      "lol",
      "nice!",
      "teach me",
      "is that legal?",
      "hacker!",
      "so cool",
      "matrix!",
      "I'm calling legal",
      "wow",
      "how?!",
      "show off",
      "+1"
    ],
    defense: [
      "!!",
      "eek",
      "!",
      "?!",
      "go go",
      "hurry!",
      "type faster!",
      "we're under attack!",
      "unplug it!",
      "*panics*",
      "you got this!",
      "help!",
      "I'll get the extinguisher",
      "is it safe?",
      "HOLD IT"
    ]
  };
  function yourEventSeconds(kind) {
    return EVENT_SECONDS[kind] + AFTERMATH_SECONDS;
  }
  var pickLine = (lines, variant) => lines[(Math.floor(variant) % lines.length + lines.length) % lines.length];
  var typing = (time, rate) => Math.floor(time * rate) % 2;
  var clamp01 = (value) => Math.max(0, Math.min(1, value));
  var easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  var base = (time) => ({
    pose: "type",
    facing: "up",
    frame: typing(time, 4),
    seated: true,
    hop: 0,
    bubble: void 0,
    screen: "code",
    progress: 0,
    shake: 0
  });
  function yourIdleReaction(time, offset = 0) {
    const reaction = base(time);
    const loop2 = ((time + offset) % 26 + 26) % 26;
    if (loop2 >= 17 && loop2 < 21) {
      return { ...reaction, pose: "sit", frame: 0, screen: "idle" };
    }
    if (loop2 >= 21 && loop2 < 24) {
      return { ...reaction, pose: "drink", facing: "down", frame: 0, seated: false, screen: "idle" };
    }
    if (loop2 >= 24) {
      return { ...reaction, pose: "stretch", facing: "down", frame: 0, seated: false, screen: "idle" };
    }
    return reaction;
  }
  function yourReaction(event, time, offset = 0) {
    if (event === void 0 || event.age < 0 || event.age >= yourEventSeconds(event.kind)) {
      return yourIdleReaction(time, offset);
    }
    switch (event.kind) {
      case "error":
        return errorReaction(event, time);
      case "hack":
        return hackReaction(event, time);
      case "defense":
        return defenseReaction(event, time);
    }
  }
  function errorReaction({ age, variant }, time) {
    const reaction = base(time);
    if (age >= EVENT_SECONDS.error) {
      return { ...reaction, pose: "sit", frame: 0, bubble: pickLine(ERROR_AFTER, variant), screen: "error" };
    }
    const flashing = age < ERROR_FLASH_SECONDS;
    if (age < 0.3) {
      return { ...reaction, screen: "error", shake: 1 };
    }
    if (age < 1.4) {
      return { ...reaction, pose: "stand", facing: "down", frame: 0, seated: false, hop: Math.floor(age / 0.18) % 2 === 0 ? 2 : 0, bubble: "!!", screen: "error", shake: flashing ? 1 : 0 };
    }
    return { ...reaction, pose: "stretch", facing: "down", frame: 0, seated: false, bubble: pickLine(ERROR_LINES, variant), screen: "error", shake: flashing ? 1 : 0 };
  }
  function hackReaction({ age, variant }, time) {
    const reaction = base(time);
    const [line, answer] = HACK_PHRASES[(variant % HACK_PHRASES.length + HACK_PHRASES.length) % HACK_PHRASES.length];
    if (age >= EVENT_SECONDS.hack) {
      return { ...reaction, pose: "sit", frame: 0, bubble: pickLine(HACK_AFTER, variant), screen: "granted" };
    }
    if (age < 0.6) {
      return { ...reaction, frame: typing(time, 10), bubble: pickLine(HACK_START, variant), screen: "matrix" };
    }
    if (age < HACK_REVEAL_SECONDS) {
      return { ...reaction, frame: typing(time, 16), bubble: age >= 1.4 ? pickLine(HACK_IN, variant) : void 0, screen: "matrix" };
    }
    const cheering = Math.floor(age / 0.3) % 2 === 0;
    return { ...reaction, pose: cheering ? "stretch" : "stand", facing: "down", frame: 0, seated: false, hop: cheering ? 2 : 0, bubble: age < 4 ? line : answer, screen: "granted" };
  }
  function defenseReaction({ age, variant }, time) {
    const reaction = base(time);
    const lines = DEFENSE_SCRIPTS[(variant % DEFENSE_SCRIPTS.length + DEFENSE_SCRIPTS.length) % DEFENSE_SCRIPTS.length];
    if (age >= EVENT_SECONDS.defense) {
      return { ...reaction, pose: "sit", frame: 0, bubble: pickLine(DEFENSE_AFTER, variant), screen: "shield", progress: 100 };
    }
    const beat = DEFENSE_BEATS.filter((start) => age >= start).length - 1;
    const beatAge = age - DEFENSE_BEATS[beat];
    const progress = defenseProgress(beat, beatAge, age);
    switch (beat) {
      case 0:
        return { ...reaction, pose: "stand", facing: "down", frame: 0, seated: false, hop: Math.floor(age / 0.22) % 2 === 0 ? 1 : 0, bubble: lines[0], screen: "alert", progress };
      case 1:
        return { ...reaction, frame: typing(time, 12), bubble: lines[1], screen: "progress", progress };
      case 2:
        return { ...reaction, frame: typing(time, 20), bubble: lines[2], screen: "progress", progress, shake: beatAge > 0.8 ? 1 : 0 };
      default: {
        const cheering = Math.floor(beatAge / 0.3) % 2 === 0;
        return { ...reaction, pose: cheering ? "stretch" : "stand", facing: "down", frame: 0, seated: false, hop: cheering ? 2 : 0, bubble: beatAge < 1.1 ? lines[3] : lines[4], screen: "shield", progress };
      }
    }
  }
  function defenseProgress(beat, beatAge, age) {
    if (beat <= 0) {
      return 0;
    }
    if (beat >= 3) {
      return 100;
    }
    if (beat === 1) {
      return Math.floor(easeInOut(clamp01(beatAge / 2)) * 72);
    }
    const progress = clamp01(beatAge / 1.6);
    return Math.max(0, Math.min(99, Math.floor(72 + 27 * Math.sqrt(progress) + Math.sin(age * 31) * 2 * (1 - progress))));
  }
  function roomReaction(kind, random2) {
    if (random2() < 0.3) {
      return void 0;
    }
    const lines = ROOM_REACTIONS[kind];
    return lines[Math.min(lines.length - 1, Math.floor(random2() * lines.length))];
  }

  // src/officeChatter.ts
  var CHATTER_STYLES = ["bubbles", "tidy", "log", "quiet"];
  function chatterStyle(value) {
    return CHATTER_STYLES.includes(value) ? value : "tidy";
  }
  function bubbleLimit(cols) {
    return Math.max(2, Math.round(cols / 4));
  }
  var PROMOTE_SECONDS = 1.2;
  var RANK = { must: 2, high: 1, normal: 0 };
  function layoutChatter(lines, style, shown, limit, time, hoveredId2, logged = /* @__PURE__ */ new Set()) {
    const full = /* @__PURE__ */ new Set();
    const pips = /* @__PURE__ */ new Set();
    if (style === "bubbles") {
      lines.forEach((line) => full.add(line.id));
      return { full, pips };
    }
    const always = (line) => line.priority === "must" || line.id === hoveredId2;
    lines.filter(always).forEach((line) => full.add(line.id));
    if (style === "tidy") {
      lines.filter((line) => !full.has(line.id) && shown.has(line.id)).forEach((line) => full.add(line.id));
      const waiting = lines.filter((line) => !full.has(line.id) && !logged.has(line.id) && line.until - time >= PROMOTE_SECONDS).sort((first, second) => RANK[second.priority] - RANK[first.priority] || first.since - second.since);
      for (const line of waiting) {
        if (full.size >= limit) {
          break;
        }
        full.add(line.id);
      }
    }
    lines.filter((line) => !full.has(line.id)).forEach((line) => pips.add(line.id));
    return { full, pips };
  }
  function showsChatLog(style, roomAbove) {
    return style === "log" || style === "tidy" && roomAbove;
  }
  var LOG_KEEP = 40;
  var LOG_SHOW_SECONDS = 9;
  var LOG_FADE_SECONDS = 2;
  function pushChatLog(log, entry) {
    const last = log[log.length - 1];
    if (last !== void 0 && last.id === entry.id && last.text === entry.text && entry.at - last.at < LOG_SHOW_SECONDS) {
      return [...log];
    }
    return [...log, entry].slice(-LOG_KEEP);
  }
  function visibleChatLog(log, time, max) {
    return log.filter((entry) => time - entry.at < LOG_SHOW_SECONDS).slice(-max).map((entry) => {
      const age = time - entry.at;
      const fadeFrom = LOG_SHOW_SECONDS - LOG_FADE_SECONDS;
      return { entry, alpha: age <= fadeFrom ? 1 : Math.max(0, (LOG_SHOW_SECONDS - age) / LOG_FADE_SECONDS) };
    });
  }
  var BUBBLE_LOOKS = ["solid", "soft", "faint"];
  function bubbleLook(value) {
    return BUBBLE_LOOKS.includes(value) ? value : "soft";
  }
  function bubbleStyle(look, hovered) {
    const style = { solid: { font: 7, fill: 1 }, soft: { font: 7, fill: 0.7 }, faint: { font: 6, fill: 0.5 } }[look];
    return hovered ? { ...style, fill: 1 } : style;
  }
  function bubbleAlpha(since, until, time) {
    return Math.max(0, Math.min(1, (time - since) / 0.15, (until - time) / 0.3));
  }
  var TALK_FREQUENCIES = ["off", "rare", "normal", "often"];
  function talkFrequency(value) {
    return TALK_FREQUENCIES.includes(value) ? value : "normal";
  }
  function talkFactor(frequency) {
    return { off: 0, rare: 0.35, normal: 1, often: 2 }[frequency];
  }

  // src/deskStyles.ts
  var DESK_STYLES = {
    standard: { id: "standard", decor: "mug" },
    crate: { id: "crate", top: "#A9814F", front: "#8A6439", edge: "#5E4122", accent: "#B8B8B8", decor: "planks" },
    workbench: { id: "workbench", top: "#7A5232", front: "#5A3A22", edge: "#3A2614", accent: "#9AA3AA", decor: "hammer" },
    living: { id: "living", top: "#8A6A3A", front: "#6B4E2A", edge: "#4A3418", accent: "#5FBF4A", decor: "leaves" },
    gothic: { id: "gothic", top: "#2A2230", front: "#1C1622", edge: "#5A2A3A", accent: "#FFB347", decor: "candle" },
    saucer: { id: "saucer", top: "#C9D1D9", front: "#9AA6B2", edge: "#6E7A86", accent: "#7CF2E0", decor: "glowStrip" },
    tech: { id: "tech", top: "#2A2E36", front: "#1C1F25", edge: "#3A404A", accent: "#4FE3F7", decor: "led" },
    coral: { id: "coral", top: "#F2D8C0", front: "#E09A8A", edge: "#C06A6A", accent: "#F28FB8", decor: "shell" },
    stone: { id: "stone", top: "#9A9488", front: "#7A746A", edge: "#5A564E", accent: "#7CF2E0", decor: "rune" },
    hoard: { id: "hoard", top: "#6A3A2A", front: "#4A2418", edge: "#2E140C", accent: "#F2C94C", decor: "coins" },
    cozy: { id: "cozy", top: "#C89A6A", front: "#A8784A", edge: "#7A5230", accent: "#E2504B", decor: "yarn" },
    nest: { id: "nest", top: "#A88A5A", front: "#8A6A3A", edge: "#5A4220", accent: "#E8E0D0", decor: "egg" }
  };
  var DESK_STYLE_BY_RACE = {
    human: "standard",
    orc: "crate",
    goblin: "crate",
    troll: "crate",
    ogre: "crate",
    dwarf: "workbench",
    gnome: "workbench",
    elf: "living",
    dryad: "living",
    fae: "living",
    satyr: "living",
    centaur: "living",
    mushroom: "living",
    wolffolk: "living",
    darkElf: "gothic",
    demon: "gothic",
    vampire: "gothic",
    skeleton: "gothic",
    zombie: "gothic",
    ghost: "gothic",
    greyAlien: "saucer",
    greenAlien: "saucer",
    squidfolk: "saucer",
    robot: "tech",
    undine: "coral",
    merfolk: "coral",
    naga: "coral",
    slime: "coral",
    golem: "stone",
    cyclops: "stone",
    minotaur: "stone",
    lizardfolk: "stone",
    jackalfolk: "stone",
    dragonkin: "hoard",
    catfolk: "cozy",
    harpy: "nest"
  };
  function deskStyleFor(race) {
    return DESK_STYLES[DESK_STYLE_BY_RACE[race ?? "human"] ?? "standard"];
  }

  // src/officeView/critters.ts
  function legs(body, first, second) {
    return [[...body, ...first], [...body, ...second]];
  }
  var MOUSE_BODY = ["......pp..", "t..gggggg.", ".tgggggkgn", "..ggggggg."];
  var SPRITES = {
    mouse: {
      colors: { g: "#9A98A0", k: "#1A1A1A", n: "#F08AA0", p: "#F4B0C0", t: "#E59AAE" },
      frames: legs(MOUSE_BODY, ["...g...g.."], ["....g.g..."])
    },
    rat: {
      colors: { g: "#6E5E52", k: "#E04848", n: "#E2909C", p: "#C99098", t: "#B8848C" },
      frames: legs([".......pp..", "t..ggggggg.", ".t.ggggggkgn", "..gggggggggg", "..gggggggg.."], ["...g....g..."], ["....g..g...."])
    },
    cat: {
      colors: { c: "#3A3A44", k: "#F1C24B", w: "#E8E4DC" },
      frames: legs(
        ["t........c.c", ".t.......ccc", ".tcccccccckc", "..ccccccccww", "..cccccccc.."],
        ["..c..c..c..c"],
        ["...cc....cc."]
      )
    },
    robot: {
      colors: { g: "#C8CCD4", d: "#5A606C", k: "#202228", r: "#E8504A", a: "#5FE08A", l: "#8E949E" },
      frames: [
        ["....rr....", ".gggllggg.", "gggggggggg", "dddddddddd", ".k......k."],
        ["....aa....", ".gggllggg.", "gggggggggg", "dddddddddd", ".k......k."]
      ]
    },
    fox: {
      colors: { o: "#E07A2E", w: "#F6EEE2", k: "#2A1E18" },
      frames: legs(
        ["...........o.o.", "ww........oooo.", ".wooooooooooko.", "..ooooooooooowk", "...ooooooooo..."],
        ["...k.k...k.k..."],
        ["....kk....kk..."]
      )
    },
    rabbit: {
      colors: { b: "#A88466", w: "#F4EEE6", k: "#1A1A1A", p: "#E8A8B0" },
      frames: [
        [".......b.b", ".......p.b", "......bbbb", "w.bbbbbbkb", "wbbbbbbbbb", "..bb...bb."],
        [".......b.b", ".......p.b", "......bbbb", "w.bbbbbbkb", "wbbbbbbbbb", ".bb.....bb"]
      ]
    },
    squirrel: {
      colors: { r: "#B8562A", t: "#D88450", w: "#EAD2B0", k: "#1A1A1A" },
      frames: legs(
        [".ttt......", "ttttt..r..", "tttt.rrrr.", "ttt.rrrrkr", ".tt.rrrrr.", "....rwwrr."],
        ["....r..r.."],
        [".....rr..."]
      )
    },
    hedgehog: {
      colors: { d: "#6A4A30", t: "#D8B890", k: "#1A1A1A" },
      frames: legs(["..d.d.d..", ".ddddddd.", "dddddddtt", "ddddddtkt", ".dddddtttk"], ["..t...t.."], ["...t.t..."])
    },
    chicken: {
      colors: { w: "#F6F2EA", r: "#D8362E", y: "#F0B030", k: "#1A1A1A" },
      frames: legs(["......r..", ".....wwr.", "w....wkwy", "ww..www..", "wwwwwww..", ".wwwwww.."], ["...y.y..."], ["....yy..."])
    },
    chick: {
      colors: { y: "#F8D848", o: "#E88A20", k: "#1A1A1A" },
      frames: legs(["..yy.", "..yko", "yyyy.", ".yyy."], [".o.o."], ["..oo."])
    },
    duckling: {
      colors: { y: "#E8C860", o: "#E07A20", k: "#1A1A1A" },
      frames: legs(["..yy.", "..yko", "yyyy.", ".yyy."], [".o.o."], ["..oo."])
    },
    sheep: {
      colors: { w: "#F2EEE4", s: "#D8D2C4", k: "#2E2A28", e: "#F2EEE4" },
      frames: legs(
        ["..wswsww....", ".wwwwwwwwkk.", "wswwwswwwkek", "wwwwwwwwwkk.", ".wswwwsww..."],
        [".k.k..k.k..."],
        ["..kk...kk..."]
      )
    },
    frog: {
      colors: { g: "#4E9A3E", l: "#B8DC7A", k: "#1A1A1A", w: "#F4F4E8" },
      frames: [
        [".....kw..", "..ggggggg", ".gggggggg", "gglllllg.", "gg....gg."],
        [".....kw..", "..ggggggg", ".gggggggg", "gglllllg.", "g......gg"]
      ]
    },
    duck: {
      colors: { h: "#2E7A48", y: "#F0B030", b: "#8A7058", w: "#F6F2EA", k: "#1A1A1A", g: "#B0A090" },
      frames: legs(["......hh..", "......hkyy", "b.....w...", "bbgggbb...", ".bbbbbb..."], ["...y.y...."], ["....yy...."])
    },
    turtle: {
      colors: { s: "#8A6A34", d: "#5A4220", l: "#9CB860", k: "#1A1A1A" },
      frames: legs(["..sdsds....", ".sdsdsds.ll", "ssssssssllk"], ["..l...l...."], ["...l...l..."])
    },
    bat: {
      colors: { b: "#3A2A48", r: "#E8404A" },
      frames: [
        ["b.........b", "bb..b.b..bb", ".bbbbbbbbb.", "...brbrb...", "....bbb...."],
        ["....b.b....", "...bbbbb...", ".bbbrbrbbb.", "bb..bbb..bb", "b.........b"]
      ]
    },
    beetle: {
      colors: { t: "#3AB8A8", l: "#9AF0E0", k: "#1A2A2A" },
      frames: legs([".tttt..", "tlttttk", "tttttkk"], [".k.k.k."], ["k.k.k.."])
    },
    alien: {
      colors: { g: "#7ED86A", d: "#4E9A42", k: "#141414", a: "#F4F06A", o: "#E8E8E8" },
      frames: [
        ["...a...", "...d...", ".ggggg.", "gkkgkkg", "gokgokg", "ggggggg", ".ggdgg.", ".g...g."],
        ["...g...", "...d...", ".ggggg.", "gkkgkkg", "gokgokg", "ggggggg", ".ggdgg.", "..g.g.."]
      ]
    },
    rover: {
      colors: { l: "#C8CCD4", g: "#E0B040", s: "#A8ACB4", k: "#202228", w: "#6A6E78" },
      frames: [
        ["..........l..", ".........lll.", "..........l..", ".gggggggggg..", ".ssssssssss..", "kwk..kwk..kwk", ".k....k....k."],
        ["..........l..", ".........lll.", "..........l..", ".gggggggggg..", ".ssssssssss..", "wkw..wkw..wkw", ".w....w....w."]
      ]
    },
    corgi: {
      colors: { o: "#E0923A", w: "#F6EEE2", k: "#2A1E18" },
      frames: legs(
        ["..........o.o.", "..........ooo.", ".ooooooooooko.", ".owwwwwwwwowwk"],
        ["..k.k....k.k.."],
        ["...kk.....kk.."]
      )
    },
    hamster: {
      colors: { l: "#B8D8F0", h: "#E8B070", k: "#1A1A1A" },
      frames: [
        ["..llll..", ".l....l.", "l..hh..l", "l.hhhk.l", "l.hhhh.l", ".l....l.", "..llll.."],
        ["..llll..", ".l....l.", "l...hh.l", "l..hhhkl", "l..hhhhl", ".l....l.", "..llll.."]
      ]
    },
    spider: {
      colors: { k: "#1E1A22", r: "#E8404A" },
      frames: legs(["...kkk...", "k.kkkkk.k", ".kkrkrkk."], ["k.k...k.k"], [".k.k.k.k."])
    },
    drone: {
      colors: { k: "#2A2C32", g: "#9AA0AA", r: "#E8404A", a: "#5FE08A" },
      frames: [
        ["kkk.....kkk", ".g.......g.", ".ggggggggg.", "...grrg...."],
        [".k.......k.", ".g.......g.", ".ggggggggg.", "...gaag...."]
      ]
    },
    raccoon: {
      colors: { g: "#8E8A88", d: "#3A3636", w: "#E8E4DE", k: "#141414" },
      frames: legs(
        ["..........g.g.", "dg........gggg", "gd.ggggggwdkdw", "dg.gggggggwwwk", "...ggggggggg.."],
        ["...d.d...d.d.."],
        ["....dd....dd.."]
      )
    },
    pig: {
      colors: { p: "#F0A8B4", n: "#D87888", d: "#C88090", k: "#1A1A1A", t: "#E890A0" },
      frames: legs([".........pp.", "..ppppppppp.", "t.pppppppkpn", ".tpppppppppn", "..ppppppppp."], ["..d.d...d.d."], ["...dd....dd."])
    },
    butterfly: {
      colors: { o: "#E87A2E", y: "#F4C848", k: "#2A1E18" },
      frames: [
        ["oo...oo", "oyokoyo", "ooykyoo", ".o.k.o."],
        ["...k...", "..oko..", "..oyo..", "...k..."]
      ]
    },
    otter: {
      colors: { b: "#6E4A30", l: "#C8A882", k: "#141414" },
      frames: legs(["..........bbb.", "..bbbbbbbbbklk", "bbbbbbbbbblll."], ["...b..b..b.b.."], ["....bb...bb..."])
    },
    crab: {
      colors: { r: "#D8483A", k: "#1A1A1A" },
      frames: legs(["rr.k.k.rr", ".r.k.k.r.", "..rrrrr..", ".rrrrrrr."], ["r.r.r.r.r"], [".r.r.r.r."])
    },
    slime: {
      colors: { s: "#4ED8B0", l: "#B8FFE8", k: "#103028" },
      frames: [
        ["..ssss..", ".slssss.", "ssksskss", "ssssssss"],
        ["...ss...", "..slss..", ".ssksks.", ".ssssss.", "..ssss.."]
      ]
    },
    moonBunny: {
      colors: { b: "#E6E2F0", w: "#FFFFFF", k: "#3A2A5A", p: "#C8A8E8" },
      frames: [
        [".......b.b", ".......p.b", "......bbbb", "w.bbbbbbkb", "wbbbbbbbbb", "..bb...bb."],
        [".......b.b", ".......p.b", "......bbbb", "w.bbbbbbkb", "wbbbbbbbbb", ".bb.....bb"]
      ]
    },
    ufo: {
      colors: { s: "#B8BCC8", c: "#7EE0F0", y: "#F4E06A", d: "#7A7E8A" },
      frames: [
        ["....ccc....", "...ccccc...", ".sssssssss.", "sysssysssys", "..ddddddd.."],
        ["....ccc....", "...ccccc...", ".sssssssss.", "sssysssysss", "..ddddddd.."]
      ]
    },
    astronaut: {
      colors: { w: "#F2F2F4", v: "#E0A830", g: "#A8ACB4" },
      frames: legs(["..www..", ".wwvvw.", ".wwvvw.", "gwwwww.", "gwwwwww", ".wwwww."], [".w...w."], ["..w.w.."])
    },
    hermitCrab: {
      colors: { s: "#E8C8A0", d: "#B8906A", r: "#D8483A", k: "#1A1A1A" },
      frames: legs(["...ssss....", "..sddsss.k.", ".ssdssdsrk.", ".sssssdrrr.", "..rrrrrrr.."], ["..r.r.r.r.."], [".r.r.r.r..."])
    },
    sandpiper: {
      colors: { b: "#A89078", d: "#7A6450", w: "#F2EEE6", k: "#1A1A1A", y: "#2A2A2A" },
      frames: legs(["....bb..", "d..bbkyy", ".dbbbb..", "..wwww.."], ["...y.y.."], ["....yy.."])
    },
    penguin: {
      colors: { k: "#1E1E28", w: "#F4F4F4", e: "#FFFFFF", o: "#F0A030" },
      frames: legs(["..kkk..", ".kkkek.", ".kkkkoo", "kkkww..", "kkwwww.", "kkwwww.", ".kwwww."], ["..o..o."], ["...oo.."])
    },
    arcticFox: {
      colors: { o: "#EEF0F4", s: "#C8CED8", w: "#FFFFFF", k: "#2A2E3A" },
      frames: legs(
        ["............o.o.", "ws..........oooo", ".wsoooooooooooko", "..soooooooooooww", "...ssooooooss..."],
        ["....k.k...k.k..."],
        [".....kk....kk..."]
      )
    },
    polarBear: {
      colors: { w: "#F4F2EC", s: "#D8D4C8", k: "#1A1A1A" },
      frames: legs(
        ["............ww..", "....wwwwwwwwwww.", "..wwwwwwwwwwwkww", ".wwwwwwwwwwwwwwk", ".swwwwwwwwwwwss.", "..sswwwwwwwwss.."],
        ["..ss.ss...ss.ss."],
        ["...ss.ss.ss.ss.."]
      )
    },
    seal: {
      colors: { g: "#7A7E88", l: "#A8ACB4", k: "#141414" },
      frames: legs(["........ggg.", "........gkgg", "g......ggggk", "gg.ggggggg.."], [".gglllllllg."], ["..ggllllllgg"])
    },
    lizard: {
      colors: { g: "#7AA84A", d: "#4E7A30", k: "#141414" },
      frames: legs([".......gggg.", "dd.gggggggkg", "..dgdgdgggg."], ["...g....g..."], ["..g......g.."])
    },
    scorpion: {
      colors: { c: "#B8862E", d: "#8A5E1E", k: "#1A1A1A" },
      frames: legs(["..cc.......", ".c..c......", ".c...c...cc", "..cccccccc.", "...ccccckc."], ["...d.d.d.d."], ["..d.d.d.d.."])
    },
    camel: {
      colors: { t: "#D8A868", d: "#B88848", k: "#1A1A1A" },
      frames: legs(
        [".............tt.", "....tt..tt..ttkt", "...tttttttt.tt..", "..tttttttttttt..", ".ttttttttttttt..", "t.dttttttttdd..."],
        ["...d.d....d.d...", "...d.d....d.d..."],
        ["..d...d..d...d..", "..d...d..d...d.."]
      )
    },
    tumbleweed: {
      colors: { b: "#B8925A", d: "#8A6A3A" },
      frames: [
        ["..bdbdb..", ".d.b.d.b.", "b.d.b.d.d", "db.d.b.b.", "b.b.d.d.b", ".d.b.b.d.", "..bdbdb.."],
        ["..dbdbd..", ".b.d.b.d.", "d.b.d.b.b", "bd.b.d.d.", "d.d.b.b.d", ".b.d.d.b.", "..dbdbd.."]
      ]
    },
    roadrunner: {
      colors: { b: "#5A4A3A", w: "#C8B8A0", k: "#141414", y: "#3A3A3A", g: "#6A8AAA" },
      frames: legs(
        ["..........bb..", "t.........bkyy", ".t.....bbbbb..", "..tbbbbbww....", "....bbbww....."],
        ["....g..g......"],
        ["....gg........"]
      )
    },
    starfish: {
      colors: { o: "#F08C4A", l: "#F8B87A" },
      frames: [
        ["....o....", "...ooo...", "ooooloooo", ".ooooooo.", "..oo.oo..", ".oo...oo."],
        ["....o....", "...ooo...", "ooooloooo", ".ooooooo.", "..oo.oo..", "..o...o.."]
      ]
    },
    octopus: {
      colors: { p: "#C85A8A", l: "#E88AB0", k: "#1A1A1A", w: "#FFFFFF" },
      frames: [
        ["...pppp...", "..pplppp..", "..pwkpwk..", "..pppppp..", ".pppppppp.", "p.p.pp.p.p", "p..p..p..p"],
        ["...pppp...", "..pplppp..", "..pwkpwk..", "..pppppp..", ".pppppppp.", ".p.p..p.p.", ".p..pp..p."]
      ]
    },
    seahorse: {
      colors: { y: "#F0B030", d: "#C88A20", k: "#1A1A1A" },
      frames: [
        ["..dy...", ".yykyyy", "..yy...", "d.yyy..", ".dyyy..", "..yy...", "...y...", "..y.y..", "...y..."],
        ["..dy...", ".yykyyy", "..yy...", ".dyyy..", "d.yyy..", "..yy...", "...y...", "..y.y..", "...y..."]
      ]
    },
    book: {
      colors: { c: "#8A2E2E", p: "#F4EEDC", g: "#E8C048", k: "#1A1A1A" },
      frames: [
        ["cccccccc", "gppppppc", "gpppkppc", "gppppppc", "cccccccc", ".c....c."],
        ["....cccc", "...cpppc", "cccppppc", "gpppkppc", "cccccccc", "..c..c.."]
      ]
    },
    broom: {
      colors: { s: "#8A5A2E", b: "#E0B850", d: "#B88A30" },
      frames: [
        ["......s", ".....s.", "....s..", "...s...", "..dd...", ".bbbb..", "bbbbbb."],
        ["....s..", "....s..", "...s...", "...s...", "..dd...", ".bbbb..", ".bbbbb."]
      ]
    }
  };
  function drawCritter(rect2, pose, groundY, shadow) {
    const sprite2 = SPRITES[pose.kind];
    const rows = sprite2.frames[pose.frame % 2];
    const spriteWidth = Math.max(...rows.map((row) => row.length));
    const left = Math.round(pose.x - spriteWidth / 2);
    const top = Math.round(pose.y) - rows.length;
    if (shadow !== void 0) {
      rect2(left + 1, Math.round(groundY), spriteWidth - 2, 1, shadow);
    }
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = sprite2.colors[row[x]];
        if (color === void 0) {
          continue;
        }
        const column = pose.facing === 1 ? x : spriteWidth - 1 - x;
        rect2(left + column, top + y, 1, 1, color);
      }
    });
  }

  // src/officeView/fliers.ts
  function blank(rows, width2) {
    return Array.from({ length: rows }, () => ".".repeat(width2));
  }
  function bird(body, up, down) {
    const width2 = Math.max(...body.map((row) => row.length));
    const pad = (row) => row.padEnd(width2, ".");
    return [
      [...up.map(pad), ...body.map(pad), ...blank(down.length, width2)],
      [...blank(up.length, width2), ...body.map(pad), ...down.map(pad)]
    ];
  }
  var SPRITES2 = {
    pigeon: {
      colors: { b: "#8A90A0", d: "#5A6070", w: "#A8AEBC", l: "#7AA08A", k: "#141414", y: "#E8C8A0" },
      frames: bird(["........bb.", "dd.bbbbblky", ".dbbbbbbb.."], ["...ww......", "....www...."], ["....www....", "...ww......"])
    },
    sparrow: {
      colors: { b: "#8A6440", d: "#5A3E24", w: "#B08860", l: "#E8D8C0", k: "#141414", y: "#3A2A1A" },
      frames: bird([".......bb.", "dd.bbbbbky", ".dblllbb.."], ["...ww.....", "....ww...."], ["....ww....", "...ww....."])
    },
    crow: {
      colors: { b: "#1E1E26", d: "#14141A", w: "#2E2E3A", k: "#6A6A80", y: "#3A3A44" },
      frames: bird(["........bb.", "dd.bbbbbbky", ".dbbbbbbb.."], ["..www......", "...wwww...."], ["...wwww....", "..www......"])
    },
    bluebird: {
      colors: { b: "#3A78D8", d: "#2A58A8", w: "#5A98F0", l: "#E88A4A", k: "#141414", y: "#3A2A1A" },
      frames: bird([".......bb", "d.bbbbbky", ".dbllllb."], ["...ww....", "....ww..."], ["....ww...", "...ww...."])
    },
    robotBird: {
      colors: { b: "#B8BEC8", d: "#7A808C", w: "#D8DEE8", r: "#E8404A", y: "#F2C94C", k: "#3A404A" },
      frames: bird(["........bb.", "dd.bkbkbbry", ".dbbbbbbb.."], ["...ww......", "....wkw...."], ["....wkw....", "...ww......"])
    },
    owl: {
      colors: { b: "#8A6A4A", d: "#5A4430", w: "#A8865E", l: "#E8D8B8", e: "#F2C94C", k: "#141414", y: "#3A2A1A" },
      frames: bird(["........b.b", "dd.....bbbb", ".dbbbbbbeky", "..bbllllby.", "...bllll..."], ["..wwww.....", "...wwwww..."], ["...wwwww...", "..wwww....."])
    },
    hawk: {
      colors: { b: "#7A5232", d: "#4A3020", w: "#9A6A40", l: "#E8D8C0", k: "#141414", y: "#F2C94C" },
      frames: bird(["..........bb.", "ddd.bbbbbbbky", ".ddbbllllbb..", "..d.........."], [".wwww........", "..wwwwww.....", "....wwww....."], ["....wwww.....", "..wwwwww.....", ".wwww........"])
    },
    goose: {
      colors: { b: "#9A8E7E", d: "#6A5E50", w: "#B8AC9A", k: "#1A1A1A", l: "#E8E0D0", y: "#2A2A2A" },
      frames: bird(["...........kk.", "...........kky", "dd.bbbbbbbkk..", ".dbblllllb...."], ["...www........", "....wwwww....."], ["....wwwww.....", "...www........"])
    },
    swallow: {
      colors: { b: "#20305A", d: "#141E3A", w: "#2E4478", l: "#F2E6D0", r: "#C8483A", k: "#141414" },
      frames: bird(["........bb.", "d..bbbbbbrk", "dd.dllllb..", "d.........."], ["..www......", "....www...."], ["....www....", "..www......"])
    },
    gull: {
      colors: { b: "#F2F2EE", d: "#C8CCD0", w: "#B8BEC6", t: "#2A2A2A", k: "#141414", y: "#F2C94C" },
      frames: bird(["..........bb.", "dd..bbbbbbbky", ".dbbbbbbbb..."], ["tww..........", ".twwww.......", "....www......"], ["....www......", ".twwww.......", "tww.........."])
    },
    kingfisher: {
      colors: { b: "#2A9AD8", d: "#1A6AA8", w: "#4AC0F0", l: "#E8823A", k: "#141414", y: "#1A1A1A" },
      frames: bird(["......bb..", "dd.bbbbkyy", ".dbllllb.."], ["...ww.....", "....ww...."], ["....ww....", "...ww....."])
    },
    mallard: {
      colors: { b: "#8A7058", d: "#5A4A3A", w: "#A89078", h: "#2E7A48", r: "#E8E4DC", k: "#141414", y: "#F0B030" },
      frames: bird(["..........hh", "..........hky", "dd.bbbbbbrr.", ".dbbbbbbb..."], ["...www......", "....www....."], ["....www.....", "...www......"])
    },
    heron: {
      colors: { b: "#9AA6B4", d: "#6A7684", w: "#B8C2CE", l: "#E8ECF0", k: "#1A1A1A", y: "#F2C94C" },
      frames: bird(["............bb..", "kk.........bbkyy", "..kddbbbbbbbb....", "....dbbllllb....."], ["....wwww........", ".....wwwwww....."], [".....wwwwww.....", "....wwww........"])
    },
    phoenix: {
      colors: { b: "#F2622A", d: "#C83A1E", w: "#F8C84A", l: "#FFE89A", k: "#3A140A", y: "#FFE89A", t: "#F8A23A" },
      frames: bird(["...........bb", "tt..bbbbbbbky", "ttddbbllbbb..", ".t..........."], ["..wwww.......", "...wwwwww....", ".....ww......"], [".....ww......", "...wwwwww....", "..wwww......."])
    },
    dragon: {
      colors: { b: "#4A9A5A", d: "#2E6A3E", w: "#7A4AA8", m: "#A878D8", l: "#E8D27A", k: "#F2C94C", h: "#E8E0C8", t: "#2E6A3E" },
      frames: [
        [
          "....w...............",
          "....ww.w............",
          "....wmwmw.w.........",
          ".....wmmmwmw.....h..",
          "......wmmmmww...bbh.",
          "t......wwmmw...bbbkb",
          "tt..dbbbbbbbbbbbbb..",
          ".tddbbbbbbbbbbbb....",
          "....bllllllbb.......",
          ".....b....b.........",
          "....................",
          "...................."
        ],
        [
          "....................",
          "....................",
          "....................",
          ".................h..",
          "................bbh.",
          "t..............bbbkb",
          "tt..dbbbbbbbbbbbbb..",
          ".tddbbbbwwbbbbbb....",
          "....bllwmmwbb.......",
          ".....bwmmmmw........",
          "......wmwmww........",
          ".......w.w.w........"
        ]
      ]
    },
    paperPlane: {
      colors: { w: "#F4F4F0", s: "#C8CCD4", l: "#E4E6EA" },
      frames: [
        ["w.........", "wwww......", "lwwwwwwww.", ".sssss....", "..ss......"],
        ["w.........", "wwww......", "lwwwwwwww.", ".sssss....", "..ss......"]
      ]
    },
    moth: {
      colors: { w: "#C8B89A", d: "#A8987A", b: "#6A5A48", k: "#2A1E14" },
      frames: [
        ["ww...ww", "wdwbwdw", ".wwbww.", "..wkw.."],
        ["...k...", "..wbw..", ".wdbdw.", "ww.k.ww"]
      ]
    },
    balloon: {
      colors: { r: "#E2504B", l: "#F8A8A0", d: "#B83A36", s: "#E8E4DC" },
      frames: [
        [".rrr.", "rlrrr", "rlrrr", "rrrrd", ".rrd.", "..r..", "..s..", "...s.", "..s..", ".s..."],
        [".rrr.", "rlrrr", "rlrrr", "rrrrd", ".rrd.", "..r..", "..s..", ".s...", "..s..", "...s."]
      ]
    },
    hotAirBalloon: {
      colors: { r: "#E2504B", y: "#F2C94C", l: "#F8A8A0", s: "#8A6A4A", b: "#A8784A", d: "#7A5230", f: "#F8A23A" },
      frames: [
        ["...rrrrr...", ".rryrrryrr.", "rlryrrryrrr", "rlryrrryrrr", "rrryrrryrrr", ".rryrrryrr.", "..rryyyrr..", "...rrrrr...", "....s.s....", ".....f.....", "....s.s....", "...bbbbb...", "...dbdbd..."],
        ["...rrrrr...", ".rryrrryrr.", "rlryrrryrrr", "rlryrrryrrr", "rrryrrryrrr", ".rryrrryrr.", "..rryyyrr..", "...rrrrr...", "....s.s....", "...........", "....s.s....", "...bbbbb...", "...dbdbd..."]
      ]
    },
    fly: {
      colors: { w: "#C8E0F0", k: "#1E1E24", r: "#C83A3A" },
      frames: [
        [".w.w.", "kkkkr", ".k.k."],
        ["w...w", "kkkkr", ".k.k."]
      ]
    },
    bee: {
      colors: { w: "#E0F0FA", y: "#F2C94C", k: "#1E1A14" },
      frames: [
        ["..ww..", ".wwww.", "kykyyk", ".ykyy."],
        ["......", "..ww..", "kykyyk", ".ykyy."]
      ]
    },
    microDrone: {
      colors: { k: "#2A2C32", g: "#9AA0AA", r: "#E8404A", a: "#5FE08A" },
      frames: [
        ["kk...kk", ".ggrgg.", "..g.g.."],
        [".k...k.", ".ggagg.", "..g.g.."]
      ]
    },
    ghost: {
      colors: { w: "#E8F0FF", s: "#B8C8E8", k: "#2A2A44" },
      frames: [
        ["..www..", ".wwwww.", "wwkwkww", "wwwwwww", "wwwkwws", "wwwwwws", "w.ww.ws"],
        ["..www..", ".wwwww.", "wwkwkww", "wwwwwww", "wwwkwws", "wwwwwws", ".ww.ww."]
      ]
    },
    firefly: {
      colors: { y: "#E9F77A", w: "#FFFFE0", k: "#3A3A2A" },
      frames: [
        [".w.", "kyy"],
        ["w..", "kyy"]
      ]
    },
    dragonfly: {
      colors: { b: "#2AA8B8", g: "#1A6A78", w: "#C8F0F4", k: "#141414" },
      frames: [
        ["...ww.ww...", "bbbbbbbbbgk", "...ww.ww..."],
        ["....w..w...", "bbbbbbbbbgk", "....w..w..."]
      ]
    },
    wisp: {
      colors: { b: "#5AB8F8", w: "#E8F8FF", c: "#2A78C8" },
      frames: [
        ["..b..", ".bwb.", "bwwwb", ".bwb.", "..c.."],
        [".b...", ".bwb.", "bwwwb", ".bwb.", "...c."]
      ]
    },
    rocket: {
      colors: { w: "#E8ECF0", s: "#A8B0BC", r: "#E2504B", k: "#2A78C8", y: "#F8E07A", o: "#F8A23A" },
      frames: [
        ["....rr.......", "...wwwwwww...", "oyywwwkwwwwr.", "...sssssss...", "....rr......."],
        ["....rr.......", "...wwwwwww...", ".oywwwkwwwwr.", "...sssssss...", "....rr......."]
      ]
    },
    satellite: {
      colors: { b: "#2A4A9A", l: "#5A8AE0", g: "#C8CCD4", d: "#8A909A", a: "#E8404A" },
      frames: [
        ["......a......", "blbl.ggg.blbl", "lblbdgggdlblb", "blbl.ggg.blbl"],
        ["......d......", "blbl.ggg.blbl", "lblbdgggdlblb", "blbl.ggg.blbl"]
      ]
    },
    spaceWhale: {
      colors: { b: "#5A4AA8", d: "#3A2E7A", l: "#B8A8F0", s: "#FFF6C8", k: "#141428", t: "#3A2E7A" },
      frames: [
        ["..........bbbbbbb.....", "t.....bbbbbsbbbbbbb...", "tt..bbbbbbbbbbbbbbbbb.", ".tdbbbsbbbbbbbbbbbbkbb", "..dbbbbbbbbbbbbbbbbbbb", "...dbbllllllllllllbbd.", "......dlllllllllldd..."],
        ["..........bbbbbbb.....", "......bbbbbsbbbbbbb...", "....bbbbbbbbbbbbbbbbb.", ".tdbbbsbbbbbbbbbbbbkbb", "ttdbbbbbbbbbbbbbbbbbbb", "t..dbbllllllllllllbbd.", "......dlllllllllldd..."]
      ]
    },
    meteor: {
      colors: { y: "#F8A23A", w: "#FFF6C8" },
      frames: [
        [".yy.", "yyww", "yyww", ".yy."],
        [".yy.", "ywww", "yyww", ".yy."]
      ]
    },
    starJelly: {
      colors: { p: "#E87AD8", l: "#FFC8F4", s: "#FFF6C8" },
      frames: [
        ["..ppp..", ".ppppp.", "pplpspp", "ppppppp", ".p.p.p.", ".p.p.p.", "p..p..p"],
        ["..ppp..", ".ppppp.", "pplpspp", "ppppppp", ".p.p.p.", "..p.p.p", ".p..p.."]
      ]
    },
    pelican: {
      colors: { b: "#F0EEE8", d: "#A8A49C", w: "#E0DED6", k: "#141414", y: "#F0B030", p: "#E89A40" },
      frames: bird(["...........bb...", "dd.bbbbbbbbbkyyy", ".dbbbbbbbbb..pp."], ["..dwwww.........", "....wwwwww......"], ["....wwwwww......", "..dwwww........."])
    },
    parrot: {
      colors: { r: "#D8302A", y: "#F0C030", b: "#2A6AD8", k: "#141414", g: "#3A3A3A", w: "#F4F4F4", t: "#2A6AD8" },
      frames: bird(["........rrr.", "tt.rrrrrwkg.", ".ttrrrrrrg..", "..t........."], ["...yyb......", "....bbb....."], ["....bbb.....", "...yyb......"])
    },
    kite: {
      colors: { r: "#E8404A", y: "#F4C848", t: "#E8E8E8", b: "#4FC3F7" },
      frames: [
        ["......r..", ".....rry.", "....rrryy", ".....ryy.", "..b.t.y..", ".t.b.....", "t........"],
        ["......r..", ".....rry.", "....rrryy", ".....ryy.", "...bt.y..", ".bt......", "........."]
      ]
    },
    snowyOwl: {
      colors: { b: "#F4F4F4", d: "#C8CCD4", w: "#E4E6EC", l: "#FFFFFF", e: "#F2C94C", k: "#141414", y: "#3A3A44" },
      frames: bird(["........b.b", "dd.....bbbb", ".dbbbbbbeky", "..bbllllby.", "...bllll..."], ["..wdwd.....", "...wwwdw..."], ["...wwwdw...", "..wdwd....."])
    },
    sleigh: {
      colors: { r: "#D8302A", g: "#F0C030", s: "#8A6A4A", b: "#8A5A3A", d: "#5A3A22", n: "#FF3030", t: "#C8A060" },
      frames: [
        ["...................d.d", "......ss...........dd.", ".....ssss.........bbbn", ".r...ssss...bbbbbbbb..", ".rrrrrrrrtttbbbbbbbb..", "..rrrrrrr...bbbbbbb...", ".gggggggg...b.b..b.b..", "g...........b.b..b.b.."],
        ["...................d.d", "......ss...........dd.", ".....ssss.........bbbn", ".r...ssss...bbbbbbbb..", ".rrrrrrrrtttbbbbbbbb..", "..rrrrrrr...bbbbbbb...", ".gggggggg..b...bb...b.", "g.........b.....bb...b"]
      ]
    },
    vulture: {
      colors: { b: "#3A2E2A", d: "#2A201C", w: "#4A3E38", p: "#E8B8A8", k: "#141414", y: "#D8C8A0" },
      frames: bird(["............pp..", "dd.bbbbbbbbbbpky", ".ddbbbbbbbbb...."], [".wwwwww.........", "...wwwwwww......", "......www......."], ["......www.......", "...wwwwwww......", ".wwwwww........."])
    },
    fish: {
      colors: { o: "#F08C3A", w: "#FFFFFF", k: "#141414", t: "#E06A20" },
      frames: [
        ["t..ooo.", ".toowko", "t..ooo."],
        ["...ooo.", "ttoowko", "...ooo."]
      ]
    },
    jellyfish: {
      colors: { p: "#B8A8F8", l: "#E8E0FF", s: "#FFFFFF" },
      frames: [
        ["..ppp..", ".ppppp.", "pplpspp", "ppppppp", ".p.p.p.", ".p.p.p.", "p..p..p"],
        ["..ppp..", ".ppppp.", "pplpspp", "ppppppp", ".p.p.p.", "..p.p.p", ".p..p.."]
      ]
    },
    shark: {
      colors: { g: "#7A8898", l: "#D8DEE4", k: "#141414", d: "#5A6878" },
      frames: [
        ["...........d..........", "..........dd..........", "d........ddd..........", "dd...gggggggggggggg...", ".ddgggggggggggggggkgg.", "dd...glllllllllllllgg.", "d......d.......d......"],
        ["...........d..........", "..........dd..........", ".........ddd..........", ".d...gggggggggggggg...", "dddgggggggggggggggkgg.", ".d...glllllllllllllgg.", ".......d.......d......"]
      ]
    },
    manta: {
      colors: { b: "#2E4A7A", w: "#3E5E94", l: "#E8ECF0", t: "#1E2E50", k: "#E8ECF0" },
      frames: bird(["....bbbbbbbbbb..", "tttbbbbbbbbbbbkb", "....bllllllllb.."], ["....wwwwwww.....", ".....wwwwwwwww..", "......wwww......"], ["......wwww......", ".....wwwwwwwww..", "....wwwwwww....."])
    },
    seaTurtle: {
      colors: { g: "#4E8A5A", s: "#8A6A34", d: "#5A4220", k: "#141414" },
      frames: bird(["....sdsdsd....", "...sdsdsdsdggg", "gg.sssssssggkg", "....gggggg...."], ["......gg......", ".....gg......."], [".....gg.......", "......gg......"])
    },
    flyingBook: {
      colors: { c: "#7A3A9A", p: "#F4EEDC", g: "#E8C048" },
      frames: [
        ["c.........c", ".pc.....cp.", "..ppc.cpp..", "....cgc...."],
        ["...........", "...........", "cppppcppppc", ".ccccgcccc."]
      ]
    },
    helicopter: {
      colors: { b: "#D8302A", w: "#9ED8F5", k: "#2A2A2A", g: "#8A8E96" },
      frames: [
        [".kkkkkkkkkkkkk.", "........k......", "k.....bbbbbb...", "kbbbbbbbbbwwb..", "k.....bbbbbbbb.", "......g....g...", ".....gggggggg.."],
        ["....kkkkkkk....", "........k......", "......bbbbbb...", "kbbbbbbbbbwwb..", "......bbbbbbbb.", "......g....g...", ".....gggggggg.."]
      ]
    },
    blimp: {
      colors: { g: "#C8CCD4", d: "#9AA0AA", r: "#D8302A", k: "#3A3A44", a: "#F8E060" },
      frames: [
        ["......gggggggggg......", "d..ggggggggggggggggg..", "dd.gggrrrrrrrrrrrgggg.", "ddggggggggggggggggggga", "dd.ggggggggggggggggg..", "d.....ddgggggggg......", "..........kkkk........"],
        ["......gggggggggg......", "d..ggggggggggggggggg..", "dd.gggrrrrrrrrrrrgggg.", "ddggggggggggggggggggg.", "dd.ggggggggggggggggg..", "d.....ddgggggggg......", "..........kkkk........"]
      ]
    }
  };
  function drawFlier(rect2, context2, pose) {
    const sprite2 = SPRITES2[pose.kind];
    const rows = sprite2.frames[pose.frame % 2];
    const spriteWidth = Math.max(...rows.map((row) => row.length));
    const left = Math.round(pose.x - spriteWidth / 2);
    const top = Math.round(pose.y - rows.length / 2);
    const alpha = FLIERS[pose.kind].alpha;
    if (alpha !== void 0) {
      context2.globalAlpha = alpha;
    }
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = sprite2.colors[row[x]];
        if (color === void 0) {
          continue;
        }
        const column = pose.facing === 1 ? x : spriteWidth - 1 - x;
        rect2(left + column, top + y, 1, 1, color);
      }
    });
    context2.globalAlpha = 1;
  }
  function drawFlierShadow(rect2, context2, pose, floorY, color) {
    const width2 = FLIERS[pose.kind].width;
    const left = Math.round(pose.x - width2 / 2);
    context2.globalAlpha = 0.35;
    rect2(left + 2, Math.round(floorY), width2 - 4, 1, color);
    rect2(left + 1, Math.round(floorY) + 1, width2 - 2, 1, color);
    rect2(left + 3, Math.round(floorY) + 2, width2 - 6, 1, color);
    context2.globalAlpha = 1;
  }
  function drawFlierTrail(rect2, context2, points2, color) {
    points2.forEach((point, index) => {
      const fade = 1 - index / points2.length;
      context2.globalAlpha = 0.8 * fade;
      const size = fade > 0.6 ? 2 : 1;
      rect2(Math.round(point.x - size / 2), Math.round(point.y - size / 2), size, size, color);
    });
    context2.globalAlpha = 1;
  }

  // src/officeView/luckyCat.ts
  var COLORS = {
    o: "#2B2B33",
    w: "#FAF7F0",
    s: "#E2D9C6",
    p: "#F4A6B8",
    n: "#E86A8A",
    k: "#1A1A1A",
    r: "#D63B2F",
    g: "#F1C24B",
    f: "#FFFDF5"
  };
  var BODY = [
    "......o......o.",
    ".....opo....opo",
    ".....owwoooowwo",
    ".....owwwwwwwwo",
    ".....owkwwwwkwo",
    ".....opwwnnwwpo",
    "......owwwwwwo.",
    "......orrggrro.",
    ".....owwggggwwo",
    ".....owgffffgwo",
    ".....owgffffgwo",
    ".....owgffffgwo",
    ".....oswggggwso",
    ".....oooooooooo"
  ];
  var PAW_UP = [
    "..ooo.",
    ".owwwo",
    ".owww.",
    ".opww.",
    "..oww.",
    "..oww.",
    "..oww.",
    "..owww",
    "...oww"
  ];
  var PAW_OUT = [
    "oo....",
    "owwo..",
    "owwwo.",
    ".opwwo",
    "..oww.",
    "..oww.",
    "..oww.",
    "..owww",
    "...oww"
  ];
  function paint(rect2, rows, left, top) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = COLORS[row[x]];
        if (color !== void 0) {
          rect2(left + x, top + y, 1, 1, color);
        }
      }
    });
  }
  function drawLuckyCat(rect2, left, top, seconds, now, excited) {
    paint(rect2, BODY, left, top);
    const beat = excited ? 0.14 : 0.45;
    paint(rect2, Math.floor(seconds / beat) % 2 === 0 ? PAW_UP : PAW_OUT, left, top);
    const centerX = left + 9.5;
    const centerY = top + 10;
    const hand = (fraction, color) => {
      const angle = fraction * Math.PI * 2 - Math.PI / 2;
      rect2(Math.floor(centerX + Math.cos(angle) * 1.2), Math.floor(centerY + 0.5 + Math.sin(angle) * 1.2), 1, 1, color);
    };
    rect2(Math.floor(centerX), Math.floor(centerY), 1, 1, COLORS.o);
    hand(now.getHours() % 12 / 12 + now.getMinutes() / 720, COLORS.o);
    hand(now.getMinutes() / 60, COLORS.r);
  }

  // src/characterMaker.ts
  var EYE_COLORS = ["#1A1A2E", "#3D8BFD", "#4CAF50", "#8D5524", "#7E57C2", "#E53935", "#F2C94C", "#9E9E9E"];
  var MARK_COLORS = ["#FFFFFF", "#1A1A22", "#E8B931", "#C0392B", "#2E86AB", "#4CB944", "#7950F2", "#F06595"];
  var BEARD_COLORS = ["#2C1B12", "#5A3825", "#A0522D", "#D9772B", "#D9A441", "#B8B8B8", "#2E2E2E"];
  var HAIR_STYLE_LABELS = {
    short: "Short",
    long: "Long",
    spiky: "Spiky",
    bob: "Bob",
    bald: "Bald",
    mohawk: "Mohawk",
    bun: "Bun",
    curly: "Curly",
    ponytail: "Ponytail"
  };
  var ACCESSORY_LABELS = {
    none: "None",
    glasses: "Glasses",
    headphones: "Headphones",
    cap: "Cap",
    beard: "Beard",
    fullBeard: "Full beard"
  };
  var unique = (lists) => [...new Set(lists.flatMap((list) => list ?? []))];
  function makerOptions(look) {
    const spec = raceSpec(look.race);
    const blocked = new Set(spec.blocks ?? []);
    return {
      races: RACES.map((race) => ({ id: race.id, label: race.label })),
      skins: unique([spec.skins, look.race === void 0 ? LOOK_PALETTES.skins : void 0]),
      hairs: unique([spec.hairs, LOOK_PALETTES.hairs]),
      hairStyles: spec.hairStyles ?? LOOK_PALETTES.hairStyles,
      eyes: unique([spec.eyes, EYE_COLORS]),
      accessories: LOOK_PALETTES.accessories.filter((accessory) => !blocked.has(accessory)),
      accessoryColors: LOOK_PALETTES.accessoryColors,
      beards: unique([BEARD_COLORS, LOOK_PALETTES.hairs]),
      shirts: LOOK_PALETTES.shirts,
      pants: LOOK_PALETTES.pants,
      shoes: LOOK_PALETTES.shoes,
      marks: look.race === void 0 || spec.marks === void 0 ? [] : spec.marks.map((palette2) => unique([palette2, MARK_COLORS])),
      alwaysBeard: spec.beard === true,
      alwaysSleeveless: spec.sleeveless === true
    };
  }
  function changeRace(look, race) {
    let next = lookWithRace(look, race);
    if (race === "human") {
      if (!LOOK_PALETTES.skins.includes(next.skin)) {
        next = { ...next, skin: LOOK_PALETTES.skins[1] };
      }
      if (!LOOK_PALETTES.hairs.includes(next.hair)) {
        next = { ...next, hair: LOOK_PALETTES.hairs[1] };
      }
    }
    const options = makerOptions(next);
    if (!options.hairStyles.includes(next.hairStyle)) {
      next = { ...next, hairStyle: options.hairStyles[0] };
    }
    if (!options.accessories.includes(next.accessory)) {
      next = { ...next, accessory: "none" };
    }
    return next;
  }
  function randomLook(random2) {
    const pick3 = (items) => items[Math.min(items.length - 1, Math.floor(random2() * items.length))];
    const look = pixelGuyLook(`maker|${Math.floor(random2() * 1e9)}`, true);
    const options = makerOptions(look);
    return {
      ...look,
      eyes: look.eyes ?? pick3(EYE_COLORS),
      beard: pick3(options.beards),
      accessory: pick3(options.accessories),
      sleeveless: options.alwaysSleeveless || random2() < 0.3,
      shorts: random2() < 0.3,
      flipFlops: random2() < 0.15
    };
  }

  // src/officeView/maker.ts
  var open;
  var PREVIEW = [
    { pose: "stand", facing: "down", seconds: 1.4, fps: 1 },
    { pose: "walk", facing: "down", seconds: 1.6, fps: 6 },
    { pose: "walk", facing: "right", seconds: 1.6, fps: 6 },
    { pose: "walk", facing: "up", seconds: 1.6, fps: 6 },
    { pose: "walk", facing: "left", seconds: 1.6, fps: 6 },
    { pose: "cheer", facing: "down", seconds: 1.4, fps: 3 },
    { pose: "talk", facing: "down", seconds: 1.4, fps: 4 }
  ];
  var PREVIEW_SECONDS = PREVIEW.reduce((sum, step) => sum + step.seconds, 0);
  function openMaker(request, done) {
    closeMaker(void 0);
    let look = { ...request.look };
    const root = element("div", "maker");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", request.title ?? "Character maker");
    const panel = element("div", "maker-panel");
    const head = element("div", "maker-head");
    head.append(element("span", "maker-title", request.title ?? "Make your guy"));
    const body = element("div", "maker-body");
    const preview = element("div", "maker-preview");
    const canvas2 = document.createElement("canvas");
    canvas2.className = "maker-canvas";
    canvas2.setAttribute("aria-label", "Preview");
    preview.append(canvas2);
    const fields = element("div", "maker-fields");
    body.append(preview, fields);
    const actions = element("div", "maker-actions");
    const randomize = button("Randomize", () => update(randomLook(Math.random)));
    const cancel = button("Cancel", () => closeMaker(void 0));
    const save = button("Save", () => closeMaker(look));
    save.classList.add("primary");
    actions.append(randomize, element("span", "maker-spacer"), cancel, save);
    panel.append(head, body, actions);
    root.append(panel);
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMaker(void 0);
      }
    });
    document.body.append(root);
    function update(next) {
      look = next;
      const scroll = fields.scrollTop;
      renderFields(fields, look, update);
      fields.scrollTop = scroll;
    }
    update(look);
    const started = performance.now();
    const draw2 = (now) => {
      if (open?.root !== root) {
        return;
      }
      drawPreview(canvas2, look, (now - started) / 1e3);
      open.frameHandle = requestAnimationFrame(draw2);
    };
    open = { root, done, frameHandle: requestAnimationFrame(draw2) };
    fields.querySelector("select, button")?.focus();
  }
  function closeMaker(look) {
    const current = open;
    if (current === void 0) {
      return;
    }
    open = void 0;
    cancelAnimationFrame(current.frameHandle);
    current.root.remove();
    current.done(look);
  }
  function renderFields(fields, look, update) {
    const options = makerOptions(look);
    const set = (change) => update({ ...look, ...change });
    fields.replaceChildren();
    const race = document.createElement("select");
    race.className = "maker-select";
    for (const option of options.races) {
      const item = document.createElement("option");
      item.value = option.id;
      item.textContent = option.label;
      item.selected = option.id === (look.race ?? "human");
      race.append(item);
    }
    race.addEventListener("change", () => update(changeRace(look, race.value)));
    fields.append(section("Race", race));
    fields.append(section("Skin", swatches(options.skins, look.skin, (skin) => set({ skin }))));
    fields.append(section(
      "Hair",
      chips(options.hairStyles, look.hairStyle, (id) => HAIR_STYLE_LABELS[id], (hairStyle) => set({ hairStyle })),
      swatches(options.hairs, look.hair, (hair) => set({ hair }))
    ));
    fields.append(section("Eyes", swatches(options.eyes, look.eyes ?? options.eyes[0], (eyes) => set({ eyes }))));
    const extra = section("Extra", chips(options.accessories, look.accessory, (id) => ACCESSORY_LABELS[id], (accessory) => set({ accessory })));
    const bearded = look.accessory === "beard" || look.accessory === "fullBeard";
    if (bearded && !options.alwaysBeard) {
      extra.append(label("Beard color"), swatches(options.beards, look.beard ?? look.hair, (beard) => set({ beard })));
    } else if (look.accessory !== "none" && !bearded) {
      extra.append(swatches(options.accessoryColors, look.accessoryColor, (accessoryColor) => set({ accessoryColor })));
    }
    fields.append(extra);
    const shirt = section("Shirt", swatches(options.shirts, look.shirt, (color) => set({ shirt: color })));
    shirt.append(toggle("Sleeveless", options.alwaysSleeveless || look.sleeveless === true, (sleeveless) => set({ sleeveless }), options.alwaysSleeveless));
    fields.append(shirt);
    const pants = section("Pants", swatches(options.pants, look.pants, (color) => set({ pants: color })));
    pants.append(toggle("Shorts", look.shorts === true, (shorts) => set({ shorts })));
    fields.append(pants);
    const shoes = section("Shoes", swatches(options.shoes, look.shoes, (color) => set({ shoes: color })));
    shoes.append(toggle("Flip flops", look.flipFlops === true, (flipFlops) => set({ flipFlops })));
    fields.append(shoes);
    if (options.marks.length === 3 && look.marks !== void 0) {
      const marks = look.marks;
      const markSection = section("Marks");
      options.marks.forEach((palette2, index) => {
        markSection.append(swatches(palette2, marks[index], (color) => {
          const next = [...marks];
          next[index] = color;
          set({ marks: next });
        }));
      });
      fields.append(markSection);
    }
  }
  function drawPreview(canvas2, look, seconds) {
    const pixelRatio = window.devicePixelRatio || 1;
    const width2 = Math.round(canvas2.clientWidth * pixelRatio);
    const height2 = Math.round(canvas2.clientHeight * pixelRatio);
    if (width2 === 0 || height2 === 0) {
      return;
    }
    if (canvas2.width !== width2 || canvas2.height !== height2) {
      canvas2.width = width2;
      canvas2.height = height2;
    }
    const context2 = canvas2.getContext("2d");
    context2.clearRect(0, 0, width2, height2);
    let time = seconds % PREVIEW_SECONDS;
    let step = PREVIEW[0];
    for (const candidate of PREVIEW) {
      step = candidate;
      if (time < candidate.seconds) {
        break;
      }
      time -= candidate.seconds;
    }
    const scale2 = Math.max(1, Math.floor(Math.min(width2 / FRAME_WIDTH, height2 * 0.92 / FRAME_HEIGHT)));
    const left = Math.floor((width2 - FRAME_WIDTH * scale2) / 2);
    const top = Math.floor((height2 - FRAME_HEIGHT * scale2) / 2);
    context2.fillStyle = "rgba(0, 0, 0, 0.25)";
    context2.beginPath();
    context2.ellipse(width2 / 2, top + (FRAME_HEIGHT - 0.6) * scale2, FRAME_WIDTH * scale2 * 0.38, scale2 * 1.1, 0, 0, Math.PI * 2);
    context2.fill();
    pixelGuyFrame(look, step.pose, step.facing, Math.floor(time * step.fps)).forEach((row, y) => row.forEach((color, x) => {
      if (color !== null) {
        context2.fillStyle = color;
        context2.fillRect(left + x * scale2, top + y * scale2, scale2, scale2);
      }
    }));
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== void 0) {
      node.textContent = text;
    }
    return node;
  }
  function button(text, onClick) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "maker-button";
    node.textContent = text;
    node.addEventListener("click", onClick);
    return node;
  }
  function label(text) {
    return element("div", "maker-label", text);
  }
  function section(title, ...children) {
    const node = element("div", "maker-section");
    node.append(label(title), ...children);
    return node;
  }
  function swatches(colors, current, onPick) {
    const row = element("div", "maker-swatches");
    const lower = current.toLowerCase();
    for (const color of colors) {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "maker-swatch";
      swatch.style.background = color;
      swatch.title = color;
      swatch.setAttribute("aria-label", color);
      swatch.setAttribute("aria-pressed", String(color.toLowerCase() === lower));
      swatch.addEventListener("click", () => onPick(color));
      row.append(swatch);
    }
    const custom = document.createElement("input");
    custom.type = "color";
    custom.className = "maker-custom";
    custom.value = /^#[0-9a-f]{6}$/i.test(current) ? current.toLowerCase() : "#000000";
    custom.title = "Any color";
    custom.setAttribute("aria-label", "Any color");
    custom.addEventListener("change", () => onPick(custom.value.toUpperCase()));
    row.append(custom);
    return row;
  }
  function chips(ids, current, labelOf, onPick) {
    const row = element("div", "maker-chips");
    for (const id of ids) {
      const chip = button(labelOf(id), () => onPick(id));
      chip.classList.add("maker-chip");
      chip.setAttribute("aria-pressed", String(id === current));
      row.append(chip);
    }
    return row;
  }
  function toggle(text, checked, onChange, disabled = false) {
    const wrap2 = document.createElement("label");
    wrap2.className = "maker-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.disabled = disabled;
    input.addEventListener("change", () => onChange(input.checked));
    wrap2.append(input, document.createTextNode(` ${text}`));
    return wrap2;
  }

  // src/officeView/palettes.ts
  var SCENE_PALETTES = {
    office: {
      floor: "#C9A26B",
      floorAlt: "#C29B64",
      floorLine: "#A9824F",
      floorStyle: "planks",
      shadow: "rgba(0,0,0,0.18)",
      wall: "#E9DFC9",
      wallTrim: "#B5A283",
      backdrop: "windows",
      doorStyle: "door",
      couchStyle: "sofa",
      windowFrame: "#F7F3EA",
      door: "#8B5A2B",
      doorFrame: "#5E3B1B",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#7FD1FF", "#F3A712", "#4CB944", "#F06595", "#E9ECEF"],
      deskTop: "#9C6B3C",
      deskFront: "#7A4E26",
      keyboard: "#D9D9DE",
      mug: "#E4572E",
      chair: "#3B3B48",
      chairLight: "#55556A",
      chairLeg: "#26262E",
      pot: "#B5562F",
      couch: "#4C6EF5",
      couchLight: "#7591F7",
      bubble: "#FFFFFF",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    },
    serverRoom: {
      floor: "#2A2F3A",
      floorAlt: "#272C36",
      floorLine: "#363D4B",
      floorStyle: "tiles",
      shadow: "rgba(0,0,0,0.35)",
      wall: "#1A1E26",
      wallTrim: "#3A4150",
      backdrop: "panels",
      doorStyle: "door",
      couchStyle: "sofa",
      windowFrame: "#3A4150",
      door: "#4A5262",
      doorFrame: "#2C323D",
      monitor: "#14171D",
      screenOn: "#0B1F12",
      screenIdle: "#0E1712",
      screenOff: "#08090B",
      code: ["#3DDC6A", "#8EF5A8", "#4FC3F7", "#F1C24B"],
      deskTop: "#4A5262",
      deskFront: "#353B47",
      keyboard: "#8590A3",
      mug: "#4FC3F7",
      chair: "#20242C",
      chairLight: "#3A4150",
      chairLeg: "#111317",
      pot: "#3A4150",
      couch: "#7950F2",
      couchLight: "#9775FA",
      bubble: "#0B1F12",
      bubbleEdge: "#3DDC6A",
      bubbleText: "#8EF5A8",
      snore: "#9ED8F5"
    },
    forest: {
      floor: "#4F7A3A",
      floorAlt: "#4A7336",
      floorLine: "#3E6430",
      floorStyle: "grass",
      shadow: "rgba(0,0,0,0.28)",
      wall: "#23402A",
      wallTrim: "#2F5A2E",
      backdrop: "trees",
      doorStyle: "trail",
      couchStyle: "log",
      windowFrame: "#5B3A21",
      door: "#B89A6A",
      doorFrame: "#8A6E48",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#A6E37A", "#F3A712", "#7FD1FF", "#FFD166", "#E9ECEF"],
      deskTop: "#8A5B33",
      deskFront: "#6B4424",
      keyboard: "#D9D9DE",
      mug: "#C9572E",
      chair: "#6B4424",
      chairLight: "#8A5B33",
      chairLeg: "#4A2E17",
      pot: "#7A5230",
      couch: "#7A5230",
      couchLight: "#A8784A",
      bubble: "#FFFDF5",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    },
    field: {
      floor: "#8DBA4E",
      floorAlt: "#87B449",
      floorLine: "#76A03E",
      floorStyle: "meadow",
      shadow: "rgba(0,0,0,0.18)",
      wall: "#8FD3F4",
      wallTrim: "#9A6B3E",
      backdrop: "sky",
      doorStyle: "gate",
      couchStyle: "log",
      windowFrame: "#9A6B3E",
      door: "#B4844F",
      doorFrame: "#6E4A27",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#7FD1FF", "#F3A712", "#4CB944", "#F06595", "#E9ECEF"],
      deskTop: "#C99A5E",
      deskFront: "#A47A44",
      keyboard: "#E6E6EA",
      mug: "#E4572E",
      chair: "#C9572E",
      chairLight: "#E0784F",
      chairLeg: "#7A3A1E",
      pot: "#B5562F",
      couch: "#D9B44A",
      couchLight: "#EED27A",
      bubble: "#FFFFFF",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    },
    riverbed: {
      floor: "#B8A27E",
      floorAlt: "#B29C78",
      floorLine: "#9C8664",
      floorStyle: "pebbles",
      shadow: "rgba(0,0,0,0.2)",
      wall: "#3C8FC4",
      wallTrim: "#8E8574",
      backdrop: "river",
      doorStyle: "trail",
      couchStyle: "log",
      windowFrame: "#6E6A60",
      door: "#D2C2A2",
      doorFrame: "#A8957A",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#7FD1FF", "#F3A712", "#4CB944", "#9ED8F5", "#E9ECEF"],
      deskTop: "#9AA0A6",
      deskFront: "#7A8086",
      keyboard: "#D9D9DE",
      mug: "#2E86AB",
      chair: "#4A5568",
      chairLight: "#64748B",
      chairLeg: "#2D3748",
      pot: "#8E8574",
      couch: "#6E4A2A",
      couchLight: "#94693F",
      bubble: "#FFFFFF",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    },
    cave: {
      floor: "#4A4440",
      floorAlt: "#45403C",
      floorLine: "#36322F",
      floorStyle: "stone",
      shadow: "rgba(0,0,0,0.4)",
      wall: "#2C2826",
      wallTrim: "#3D3734",
      backdrop: "rock",
      doorStyle: "tunnel",
      couchStyle: "slab",
      windowFrame: "#3D3734",
      door: "#0A0908",
      doorFrame: "#1E1B19",
      monitor: "#1A1A1F",
      screenOn: "#12202E",
      screenIdle: "#161C24",
      screenOff: "#0B0C0F",
      code: ["#B197FC", "#63E6BE", "#F3A712", "#74C0FC", "#E9ECEF"],
      deskTop: "#6A625C",
      deskFront: "#524B46",
      keyboard: "#B8B8C0",
      mug: "#B197FC",
      chair: "#3D3734",
      chairLight: "#5A524D",
      chairLeg: "#252220",
      pot: "#524B46",
      couch: "#6A625C",
      couchLight: "#857C75",
      bubble: "#1E1B19",
      bubbleEdge: "#B197FC",
      bubbleText: "#E5DBFF",
      snore: "#B197FC"
    },
    moon: {
      floor: "#A6A6AE",
      floorAlt: "#A0A0A8",
      floorLine: "#8E8E96",
      floorStyle: "regolith",
      shadow: "rgba(0,0,0,0.35)",
      wall: "#05060C",
      wallTrim: "#7E7E86",
      backdrop: "space",
      doorStyle: "hatch",
      couchStyle: "sofa",
      windowFrame: "#D8D8E0",
      door: "#C8C8D0",
      doorFrame: "#6E6E78",
      monitor: "#2B2B33",
      screenOn: "#0F1E33",
      screenIdle: "#141C28",
      screenOff: "#0A0C10",
      code: ["#7FD1FF", "#F3A712", "#E9ECEF", "#FF8787", "#B2F2BB"],
      deskTop: "#E4E4EA",
      deskFront: "#B8B8C2",
      keyboard: "#5A5A66",
      mug: "#F08C00",
      chair: "#F1F1F5",
      chairLight: "#FFFFFF",
      chairLeg: "#8E8E96",
      pot: "#B8B8C2",
      couch: "#F08C00",
      couchLight: "#FFA94D",
      bubble: "#FFFFFF",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#7FD1FF"
    },
    beach: {
      floor: "#EBD59E",
      floorAlt: "#E3CB90",
      floorLine: "#D1B67E",
      floorStyle: "sand",
      shadow: "rgba(0,0,0,0.16)",
      wall: "#2E9CC8",
      wallTrim: "#F6F0DA",
      backdrop: "sea",
      doorStyle: "trail",
      couchStyle: "towel",
      windowFrame: "#8A6A44",
      door: "#C8A878",
      doorFrame: "#8A6A44",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#7FD1FF", "#F3A712", "#4CB944", "#F06595", "#E9ECEF"],
      deskTop: "#C8A878",
      deskFront: "#A08458",
      keyboard: "#E6E6EA",
      mug: "#F06595",
      chair: "#2E9CC8",
      chairLight: "#5FBCE0",
      chairLeg: "#D8D8DE",
      pot: "#C8A878",
      couch: "#F06595",
      couchLight: "#FFFFFF",
      bubble: "#FFFFFF",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    },
    snowfield: {
      floor: "#EEF3F8",
      floorAlt: "#E3EBF3",
      floorLine: "#C9D6E4",
      floorStyle: "snow",
      shadow: "rgba(40,60,100,0.18)",
      wall: "#8AA0C0",
      wallTrim: "#FFFFFF",
      backdrop: "peaks",
      doorStyle: "trail",
      couchStyle: "log",
      windowFrame: "#5B3A21",
      door: "#FFFFFF",
      doorFrame: "#9AACC4",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#7FD1FF", "#F3A712", "#E9ECEF", "#FF8787", "#B2F2BB"],
      deskTop: "#8A5B33",
      deskFront: "#6B4424",
      keyboard: "#D9D9DE",
      mug: "#C0392B",
      chair: "#C0392B",
      chairLight: "#E05A4A",
      chairLeg: "#6B2A1E",
      pot: "#7A5230",
      couch: "#6B4424",
      couchLight: "#8A5B33",
      bubble: "#FFFFFF",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    },
    desert: {
      floor: "#E2B878",
      floorAlt: "#D8AC6C",
      floorLine: "#C49558",
      floorStyle: "dunes",
      shadow: "rgba(90,40,0,0.18)",
      wall: "#C9784A",
      wallTrim: "#E8C48A",
      backdrop: "mesa",
      doorStyle: "trail",
      couchStyle: "slab",
      windowFrame: "#8A5A34",
      door: "#F0D4A0",
      doorFrame: "#C49558",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#7FD1FF", "#F3A712", "#4CB944", "#F06595", "#E9ECEF"],
      deskTop: "#B07A48",
      deskFront: "#8A5A34",
      keyboard: "#E6E0D6",
      mug: "#2E86AB",
      chair: "#8A5A34",
      chairLight: "#B07A48",
      chairLeg: "#5A3A20",
      pot: "#C9784A",
      couch: "#C9784A",
      couchLight: "#E09A6A",
      bubble: "#FFFDF5",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    },
    reef: {
      floor: "#D8C08A",
      floorAlt: "#CDB47E",
      floorLine: "#B89E6A",
      floorStyle: "seabed",
      shadow: "rgba(0,20,60,0.25)",
      wall: "#1C5A8E",
      wallTrim: "#0F3E66",
      backdrop: "water",
      doorStyle: "tunnel",
      couchStyle: "slab",
      windowFrame: "#0F3E66",
      door: "#06223C",
      doorFrame: "#D9756A",
      monitor: "#2B2B33",
      screenOn: "#0F2A3E",
      screenIdle: "#142430",
      screenOff: "#0A1218",
      code: ["#7FE0FF", "#63E6BE", "#F3A712", "#F783AC", "#E9ECEF"],
      deskTop: "#D98A7A",
      deskFront: "#B86A5A",
      keyboard: "#D9D9DE",
      mug: "#F3A712",
      chair: "#3C8FC4",
      chairLight: "#6AB4E0",
      chairLeg: "#1C5A8E",
      pot: "#B86A5A",
      couch: "#8E8574",
      couchLight: "#A8A090",
      bubble: "#E8F8FF",
      bubbleEdge: "#1C5A8E",
      bubbleText: "#0B2A44",
      snore: "#7FE0FF"
    },
    library: {
      floor: "#6E4A2C",
      floorAlt: "#684528",
      floorLine: "#4A2E18",
      floorStyle: "planks",
      shadow: "rgba(0,0,0,0.3)",
      wall: "#3A2618",
      wallTrim: "#5A3A22",
      backdrop: "bookcases",
      doorStyle: "door",
      couchStyle: "sofa",
      windowFrame: "#5A3A22",
      door: "#7A4A28",
      doorFrame: "#3A2414",
      monitor: "#2B2B33",
      screenOn: "#1E1A30",
      screenIdle: "#1E1C28",
      screenOff: "#111014",
      code: ["#E8C048", "#B197FC", "#63E6BE", "#F08C4A", "#E9ECEF"],
      deskTop: "#7A4A28",
      deskFront: "#5A3420",
      keyboard: "#D8D0C0",
      mug: "#7A3A9A",
      chair: "#7A2A2A",
      chairLight: "#9A3A3A",
      chairLeg: "#3A2414",
      pot: "#8A5A34",
      couch: "#7A2A3A",
      couchLight: "#9A3A4A",
      bubble: "#F4EEDC",
      bubbleEdge: "#3A2618",
      bubbleText: "#2A1A10",
      snore: "#B197FC"
    },
    rooftop: {
      floor: "#5E5E64",
      floorAlt: "#58585E",
      floorLine: "#48484E",
      floorStyle: "gravel",
      shadow: "rgba(0,0,0,0.25)",
      wall: "#6A7890",
      wallTrim: "#8A8478",
      backdrop: "skyline",
      doorStyle: "door",
      couchStyle: "sofa",
      windowFrame: "#6A6A70",
      door: "#7A8290",
      doorFrame: "#4A505A",
      monitor: "#2B2B33",
      screenOn: "#1C2B3A",
      screenIdle: "#202833",
      screenOff: "#111317",
      code: ["#7FD1FF", "#F3A712", "#4CB944", "#F06595", "#E9ECEF"],
      deskTop: "#8A8E96",
      deskFront: "#6A6E76",
      keyboard: "#D9D9DE",
      mug: "#E4572E",
      chair: "#3A6A4A",
      chairLight: "#5A8A6A",
      chairLeg: "#B8B8C0",
      pot: "#B5562F",
      couch: "#8A6A4A",
      couchLight: "#A8886A",
      bubble: "#FFFFFF",
      bubbleEdge: "#2B2B33",
      bubbleText: "#1A1A2E",
      snore: "#3D5A80"
    }
  };

  // src/officeView/shows.ts
  var TILE = 16;
  var FRAME = 12;
  function painter(kit2, box, mirror) {
    return (x, y, w, h, color) => kit2.rect(mirror ? box.left + FRAME - x - w : box.left + x, box.top + y, w, h, color);
  }
  var FOOD_ART = {
    pizza: { rows: ["cccc", "ysry", ".yy.", ".s.."], colors: { c: "#C8873A", y: "#F5C542", s: "#F5C542", r: "#C0392B" } },
    taco: { rows: ["grgr", "ssss", ".ss."], colors: { g: "#5DBB46", r: "#D64545", s: "#E8B04A" } },
    burger: { rows: [".bb.", "bbbb", "gggg", "pppp", ".bb."], colors: { b: "#D9963F", g: "#5DBB46", p: "#6B3A1E" } },
    sushi: { rows: ["ssss", "rnrr", "rnrr"], colors: { s: "#E8743B", r: "#F8F8F0", n: "#1E2A1E" } },
    donut: { rows: [".pp.", "pdkp", "p..p", ".pp."], colors: { p: "#F48FB1", d: "#4FA3F7", k: "#F5C542" } },
    cookie: { rows: [".cc.", "cdcc", "ccdc", ".cc."], colors: { c: "#C8873A", d: "#4A2A12" } },
    iceCream: { rows: [".pp.", "pppp", "cccc", ".cc.", ".c.."], colors: { p: "#F7A8C4", c: "#D9A441" } },
    popcorn: { rows: ["wwww", "rwrw", "rwrw", "rwrw"], colors: { w: "#FFF6D0", r: "#D64545" } }
  };
  function drawFood(kit2, food, x, y) {
    const art = FOOD_ART[food];
    art.rows.forEach((row, dy) => [...row].forEach((cell, dx) => {
      if (cell !== ".") {
        kit2.rect(x + dx, y + dy, 1, 1, art.colors[cell]);
      }
    }));
  }
  function drawSnack(kit2, food, box, facing, step) {
    if (facing === "up") {
      return;
    }
    if (facing === "down") {
      drawFood(kit2, food, box.left + (step === 0 ? 7 : 8), box.top + (step === 0 ? 5 : 8));
      return;
    }
    const x = step === 0 ? 7 : 7;
    const y = step === 0 ? 4 : 6;
    drawFood(kit2, food, facing === "right" ? box.left + x : box.left + FRAME - x - 4, box.top + y);
  }
  function drawDeskPlate(kit2, food, deskX, deskY) {
    const left = deskX * TILE;
    const top = deskY * TILE;
    kit2.rect(left, top + 10, 5, 1, "#F4F4F4");
    kit2.rect(left + 1, top + 11, 3, 1, "#C8C8C8");
    drawFood(kit2, food, left, top + 10 - FOOD_ART[food].rows.length);
  }
  function drawGear(kit2, role, box, facing, layer, show, now, performing) {
    switch (role) {
      case "guitar":
      case "bass":
        if (layer === "front") {
          drawGuitar(kit2, box, facing, role === "bass" ? "bass" : show?.kind === "band" ? "electric" : "acoustic", now, performing);
        }
        return;
      case "magician":
        if (layer === "front") {
          drawTopHat(kit2, box, facing);
          if (facing !== "up") {
            drawWand(kit2, box, facing, now);
          }
        }
        return;
      case "cart":
        if (layer === "front") {
          drawChefHat(kit2, box);
        }
        if (layer === "behind" === (facing === "up")) {
          drawTrolley(kit2, box, facing, show, now);
        }
        return;
      default:
        return;
    }
  }
  var GUITARS = {
    acoustic: { body: "#C97B3A", edge: "#7A4318", hole: "#3A220E", neck: "#5A3A1E", head: "#2B1B0E", long: false },
    electric: { body: "#2E86AB", edge: "#1B4F66", hole: "#F4F4F4", neck: "#C8A06A", head: "#2B1B0E", long: false },
    bass: { body: "#B0303A", edge: "#6A1A22", hole: "#1D1D1D", neck: "#3A2414", head: "#1D1D1D", long: true }
  };
  function drawGuitar(kit2, box, facing, kind, now, performing) {
    const colors = GUITARS[kind];
    if (facing === "up") {
      kit2.rect(box.left + 3, box.top + 9, 6, 4, colors.edge);
      kit2.rect(box.left + 4, box.top + 9, 4, 3, colors.body);
      kit2.rect(box.left + 6, box.top - (colors.long ? 3 : 1), 1, 10, colors.neck);
      return;
    }
    const paint2 = painter(kit2, box, facing === "left");
    if (facing === "down") {
      paint2(1, 9, 6, 4, colors.edge);
      paint2(2, 9, 4, 4, colors.body);
      paint2(2, 8, 3, 1, colors.edge);
      paint2(3, 10, 2, 2, colors.hole);
      const neck = colors.long ? [[6, 9], [7, 8], [8, 8], [9, 7], [10, 6], [11, 5]] : [[6, 9], [7, 8], [8, 8], [9, 7], [10, 6]];
      neck.forEach(([x, y]) => paint2(x, y, 1, 1, colors.neck));
      const [headX, headY] = neck[neck.length - 1];
      paint2(headX + 1, headY - 1, 1, 2, colors.head);
      if (performing && Math.floor(now * 8) % 2 === 0) {
        paint2(5, 11, 2, 1, "#F4F4F4");
      }
      return;
    }
    paint2(4, 9, 4, 4, colors.edge);
    paint2(5, 9, 3, 3, colors.body);
    paint2(8, 9, colors.long ? 5 : 4, 1, colors.neck);
    paint2(colors.long ? 13 : 12, 8, 1, 2, colors.head);
  }
  function drawTopHat(kit2, box, facing) {
    const side = facing === "left" || facing === "right";
    kit2.rect(box.left + (side ? 2 : 2), box.top + 1, 8, 1, "#141620");
    kit2.rect(box.left + 3, box.top - 4, 6, 5, "#141620");
    kit2.rect(box.left + 3, box.top, 6, 1, "#C0392B");
    kit2.rect(box.left + 4, box.top - 4, 1, 4, "#2E3242");
  }
  function drawWand(kit2, box, facing, now) {
    const paint2 = painter(kit2, box, facing === "left");
    const tipX = facing === "down" ? 12 : 11;
    paint2(10, 11, 1, 1, "#141620");
    paint2(11, 10, 1, 1, "#141620");
    paint2(tipX, 9, 1, 1, "#F4F4F4");
    if (Math.floor(now * 3) % 3 === 0) {
      paint2(tipX + 1, 8, 1, 1, "#FFE48A");
    }
  }
  function drawChefHat(kit2, box) {
    kit2.rect(box.left + 3, box.top - 2, 6, 4, "#FAFAFA");
    kit2.rect(box.left + 2, box.top - 4, 8, 3, "#FFFFFF");
    kit2.rect(box.left + 3, box.top - 5, 2, 1, "#FFFFFF");
    kit2.rect(box.left + 7, box.top - 5, 2, 1, "#FFFFFF");
    kit2.rect(box.left + 3, box.top + 1, 6, 1, "#DADADA");
  }
  function drawTrolley(kit2, box, facing, show, now) {
    const lunch = show?.kind !== "snacks";
    const x = facing === "right" ? box.left + 9 : facing === "left" ? box.left - 15 : box.left - 3;
    const y = facing === "up" ? box.top + 6 : facing === "down" ? box.top + 11 : box.top + 9;
    const cloth = lunch ? ["#D64545", "#F4F4F4"] : ["#4FA3F7", "#E9F4FF"];
    kit2.rect(x + 1, y + 2, 1, 6, "#8A8F99");
    kit2.rect(x + 16, y + 2, 1, 6, "#8A8F99");
    kit2.rect(x, y + 6, 18, 1, "#A8ADB6");
    kit2.rect(x + 1, y + 8, 2, 1, "#2A2A2A");
    kit2.rect(x + 15, y + 8, 2, 1, "#2A2A2A");
    for (let cx = 0; cx < 18; cx++) {
      for (let cy = 0; cy < 3; cy++) {
        kit2.rect(x + cx, y + 2 + cy, 1, 1, cloth[(cx + cy) % 2]);
      }
    }
    kit2.rect(x, y, 18, 2, "#C8CCD4");
    kit2.rect(x, y, 18, 1, "#E8ECF0");
    const food = show?.food ?? [];
    if (food.length > 0) {
      [2, 7, 12].forEach((dx, index) => {
        const item = food[index % food.length];
        drawFood(kit2, item, x + dx, y - FOOD_ART[item].rows.length);
      });
    }
    if (facing === "down" && Math.floor(now * 2) % 2 === 0) {
      kit2.rect(x + 3 + Math.floor(now) % 12, y, 2, 1, "#FFFFFF");
    }
  }
  function drawSetPiece(kit2, role, spot, show, now) {
    const box = { left: spot.x * TILE + (TILE - FRAME) / 2, top: spot.y * TILE + TILE - 18 };
    switch (role) {
      case "singer":
      case "comic":
        drawMicStand(kit2, box);
        return;
      case "drums":
        drawDrumKit(kit2, box, now, show.phase === "playing");
        return;
      case "dj":
        drawDecks(kit2, box, now, show.phase !== "arriving");
        return;
      case "magician":
        drawMagicTable(kit2, box, show, now);
        return;
      default:
        return;
    }
  }
  function drawMicStand(kit2, box) {
    kit2.rect(box.left + 10, box.top + 8, 1, 9, "#3A3A3A");
    kit2.rect(box.left + 9, box.top + 17, 3, 1, "#2A2A2A");
    kit2.rect(box.left + 9, box.top + 7, 2, 1, "#3A3A3A");
    kit2.rect(box.left + 8, box.top + 6, 2, 2, "#9A9AA4");
    kit2.rect(box.left + 8, box.top + 6, 1, 1, "#D8D8E0");
  }
  function drawDrumKit(kit2, box, now, playing) {
    const beat = playing ? Math.floor(now * 4) % 2 : 0;
    kit2.rect(box.left - 2, box.top + 8, 1, 10, "#6A6A72");
    kit2.rect(box.left - 4, box.top + 7 - beat, 5, 1, "#E8B931");
    kit2.rect(box.left + 13, box.top + 7, 1, 11, "#6A6A72");
    kit2.rect(box.left + 11, box.top + 6 + beat, 5, 1, "#E8B931");
    kit2.rect(box.left, box.top + 9, 4, 2, "#B0303A");
    kit2.rect(box.left, box.top + 9, 4, 1, "#E9E9E9");
    kit2.rect(box.left + 8, box.top + 9, 4, 2, "#B0303A");
    kit2.rect(box.left + 8, box.top + 9, 4, 1, "#E9E9E9");
    kit2.rect(box.left + 2, box.top + 11, 8, 7, "#8A1F2A");
    kit2.rect(box.left + 3, box.top + 12, 6, 5, "#F2F2F2");
    kit2.rect(box.left + 4, box.top + 13, 4, 3, playing && beat === 1 ? "#FFFFFF" : "#E2E2E2");
    kit2.rect(box.left + 5, box.top + 14, 2, 1, "#B0303A");
    if (playing) {
      kit2.rect(box.left + (beat === 0 ? 1 : 2), box.top + 7, 1, 2, "#E8D2A6");
      kit2.rect(box.left + (beat === 0 ? 10 : 9), box.top + 8, 1, 2, "#E8D2A6");
    }
  }
  function drawDecks(kit2, box, now, on) {
    const left = box.left - 4;
    const top = box.top + 9;
    kit2.rect(left, top + 2, 20, 6, "#24242E");
    kit2.rect(left, top, 20, 2, "#3C3C4A");
    kit2.rect(left + 1, top + 8, 1, 1, "#1A1A20");
    kit2.rect(left + 18, top + 8, 1, 1, "#1A1A20");
    for (const deck of [left + 1, left + 13]) {
      kit2.rect(deck, top, 6, 2, "#111116");
      const spin = on ? Math.floor(now * 10) % 4 : 0;
      kit2.rect(deck + 1 + spin, top + spin % 2, 1, 1, "#C8C8D0");
    }
    kit2.rect(left + 8, top, 4, 2, "#55556A");
    kit2.rect(left + 8, top - 3, 4, 3, "#C8C8D0");
    kit2.rect(left + 9, top - 2, 2, 1, on ? "#7CFFB2" : "#6A6A72");
    const colors = ["#F06595", "#4FA3F7", "#5DBB46", "#F5C542", "#B56CE0"];
    for (let led = 0; led < 8; led++) {
      const lit = on && (led + Math.floor(now * 8)) % 4 === 0;
      kit2.rect(left + 2 + led * 2, top + 4, 1, 1, lit ? colors[led % colors.length] : "#3A3A48");
    }
  }
  function drawMagicTable(kit2, box, show, now) {
    const left = box.left - 1;
    const top = box.top + 11;
    kit2.rect(left, top, 14, 1, "#9A3AAA");
    kit2.rect(left + 1, top + 1, 12, 5, "#5E1F6A");
    kit2.rect(left + 1, top + 5, 12, 1, "#E8B931");
    kit2.rect(left + 2, top + 6, 1, 1, "#E8B931");
    kit2.rect(left + 11, top + 6, 1, 1, "#E8B931");
    const cue = show.lastCue;
    const age = cue === void 0 ? Infinity : now - cue.at;
    if ((cue?.cue === "gasp" || cue?.cue === "applause") && age < 3.5) {
      const rise = Math.min(3, Math.floor(age * 10));
      const rabbitTop = top - 3 - rise;
      kit2.rect(left + 9, rabbitTop - 3, 1, 3, "#F4F4F4");
      kit2.rect(left + 11, rabbitTop - 3, 1, 3, "#F4F4F4");
      kit2.rect(left + 9, rabbitTop - 2, 1, 1, "#F7A8C4");
      kit2.rect(left + 11, rabbitTop - 2, 1, 1, "#F7A8C4");
      kit2.rect(left + 8, rabbitTop, 5, 3, "#F4F4F4");
      kit2.rect(left + 9, rabbitTop + 1, 1, 1, "#1A1A2E");
      kit2.rect(left + 11, rabbitTop + 1, 1, 1, "#1A1A2E");
      kit2.rect(left + 10, rabbitTop + 2, 1, 1, "#F48FB1");
    }
    kit2.rect(left + 7, top - 1, 7, 1, "#141620");
    kit2.rect(left + 8, top - 4, 5, 3, "#141620");
    kit2.rect(left + 8, top - 2, 5, 1, "#C0392B");
  }
  var NOTE_COLORS = ["#F5C542", "#F06595", "#4FA3F7", "#7CFFB2", "#B56CE0", "#FF8A3D"];
  var CONFETTI = ["#F5C542", "#F06595", "#4FA3F7", "#5DBB46", "#B56CE0", "#FFFFFF", "#FF8A3D"];
  var NOTES = [
    [".##", ".#.", ".#.", "##.", "##."],
    ["####", "#..#", "#..#", "##.##"]
  ];
  var ShowEffects = class {
    particles = [];
    lastCueAt = -1;
    nextEmitAt = 0;
    lastTime;
    clear() {
      this.particles = [];
      this.lastCueAt = -1;
      this.lastTime = void 0;
    }
    step(show, performers, roomWidth, now, random2) {
      const dt = this.lastTime === void 0 ? 0 : Math.max(0, Math.min(0.25, now - this.lastTime));
      this.lastTime = now;
      for (const particle of this.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        if (particle.kind === "confetti") {
          particle.vx = Math.sin((now - particle.born) * 4 + particle.variant) * 8;
        }
      }
      this.particles = this.particles.filter((particle) => now - particle.born < particle.life);
      if (show === void 0) {
        return;
      }
      const effect = PERFORMANCES[show.kind].effect;
      const playing = show.phase !== "arriving";
      const players = performers.filter((performer) => performer.performing);
      if (playing && players.length > 0 && now >= this.nextEmitAt) {
        const performer = players[Math.floor(random2() * players.length)];
        const centerX = performer.box.left + FRAME / 2;
        if (effect === "notes" || effect === "disco") {
          this.nextEmitAt = now + (effect === "disco" ? 0.5 : 0.32);
          this.particles.push({
            kind: "note",
            x: centerX - 6 + random2() * 12,
            y: performer.box.top - 1,
            vx: (random2() - 0.5) * 6,
            vy: -9 - random2() * 5,
            born: now,
            life: 2.6,
            color: NOTE_COLORS[Math.floor(random2() * NOTE_COLORS.length)],
            variant: random2() < 0.7 ? 0 : 1
          });
        } else if (effect === "food" && performer.role === "cart") {
          this.nextEmitAt = now + 0.22;
          this.particles.push({ kind: "steam", x: performer.box.left - 2 + random2() * 16, y: performer.box.top + 5, vx: (random2() - 0.5) * 2, vy: -6 - random2() * 3, born: now, life: 1.6, color: "#FFFFFF", variant: 0 });
        } else if (effect === "sparkles" && performer.role === "magician") {
          this.nextEmitAt = now + 0.6;
          this.particles.push({ kind: "star", x: performer.box.left + 12 + random2() * 3, y: performer.box.top + 7 + random2() * 3, vx: 0, vy: -3, born: now, life: 0.6, color: "#FFE48A", variant: 0 });
        } else {
          this.nextEmitAt = now + 1;
        }
      }
      const cue = show.lastCue;
      if (cue !== void 0 && cue.at !== this.lastCueAt) {
        this.lastCueAt = cue.at;
        const lead = performers[0];
        if ((effect === "notes" || effect === "disco") && cue.cue === "cheer") {
          for (let piece = 0; piece < 36; piece++) {
            this.particles.push({
              kind: "confetti",
              x: random2() * roomWidth,
              y: -4 - random2() * 20,
              vx: 0,
              vy: 16 + random2() * 14,
              born: now,
              life: 3 + random2(),
              color: CONFETTI[Math.floor(random2() * CONFETTI.length)],
              variant: random2() * 6
            });
          }
        }
        if (effect === "sparkles" && lead !== void 0 && (cue.cue === "gasp" || cue.cue === "applause")) {
          const centerX = lead.box.left + FRAME / 2 + 4;
          const centerY = lead.box.top + 8;
          for (let star = 0; star < 12; star++) {
            const angle = star / 12 * Math.PI * 2;
            const speed = 14 + random2() * 10;
            this.particles.push({ kind: "star", x: centerX, y: centerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, born: now, life: 1.1, color: star % 2 === 0 ? "#FFE48A" : "#FFFFFF", variant: 0 });
          }
          for (let puff = 0; puff < 6; puff++) {
            this.particles.push({ kind: "puff", x: centerX + 6 + (random2() - 0.5) * 8, y: centerY + 4 + (random2() - 0.5) * 4, vx: (random2() - 0.5) * 6, vy: -4, born: now, life: 1.2, color: "#D8D8E4", variant: 0 });
          }
        }
      }
    }
    draw(kit2, now) {
      const context2 = kit2.context;
      for (const particle of this.particles) {
        const age = (now - particle.born) / particle.life;
        const x = Math.round(particle.x);
        const y = Math.round(particle.y);
        switch (particle.kind) {
          case "note": {
            context2.globalAlpha = age > 0.7 ? (1 - age) / 0.3 : 1;
            const sway2 = Math.round(Math.sin((now - particle.born) * 4 + particle.x) * 1.5);
            NOTES[particle.variant].forEach((row, dy) => [...row].forEach((cell, dx) => {
              if (cell === "#") {
                kit2.rect(x + dx + sway2, y + dy, 1, 1, particle.color);
              }
            }));
            break;
          }
          case "confetti":
            context2.globalAlpha = age > 0.8 ? (1 - age) / 0.2 : 1;
            kit2.rect(x, y, 1, Math.floor(now * 6 + particle.variant) % 2 === 0 ? 2 : 1, particle.color);
            break;
          case "steam":
            context2.globalAlpha = 0.5 * (1 - age);
            kit2.rect(x, y, age < 0.5 ? 1 : 2, 1, particle.color);
            break;
          case "star":
            context2.globalAlpha = 1 - age;
            kit2.rect(x, y, 1, 1, particle.color);
            if (age < 0.5) {
              kit2.rect(x - 1, y, 3, 1, particle.color);
              kit2.rect(x, y - 1, 1, 3, particle.color);
            }
            break;
          case "puff": {
            context2.globalAlpha = 0.6 * (1 - age);
            const size = 2 + Math.floor(age * 4);
            kit2.rect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size, particle.color);
            break;
          }
        }
      }
      context2.globalAlpha = 1;
    }
  };
  function showLightLevel(show, now) {
    if (show === void 0 || show.phase === "arriving") {
      return 0;
    }
    return Math.max(0, Math.min(1, (now - show.startedAt) / 1.5));
  }
  function drawSpotlight(kit2, show, roomWidth, roomHeight, level) {
    if (level <= 0) {
      return;
    }
    const context2 = kit2.context;
    const centerX = show.stage.x * TILE + TILE / 2;
    const feetY = show.stage.y * TILE + TILE - 1;
    const poolX = 11;
    const poolY = 3;
    const halfWidth = (y) => {
      if (y <= feetY) {
        return Math.round(3 + (poolX - 3) * (y / feetY));
      }
      const dy = (y - feetY) / poolY;
      return dy >= 1 ? -1 : Math.round(poolX * Math.sqrt(1 - dy * dy));
    };
    context2.globalAlpha = 0.5 * level;
    for (let y = 0; y < roomHeight; y++) {
      const half = halfWidth(y);
      if (half < 0) {
        kit2.rect(0, y, roomWidth, 1, "#05040C");
        continue;
      }
      kit2.rect(0, y, Math.max(0, centerX - half), 1, "#05040C");
      kit2.rect(centerX + half, y, Math.max(0, roomWidth - centerX - half), 1, "#05040C");
    }
    context2.globalCompositeOperation = "lighter";
    context2.globalAlpha = 0.12 * level;
    for (let y = 0; y < roomHeight; y++) {
      const half = halfWidth(y);
      if (half >= 0) {
        kit2.rect(centerX - half, y, half * 2, 1, "#FFE9B8");
      }
    }
    context2.globalCompositeOperation = "source-over";
    context2.globalAlpha = 1;
  }
  function drawDisco(kit2, show, roomWidth, roomHeight, now, level) {
    if (level <= 0) {
      return;
    }
    const context2 = kit2.context;
    const centerX = show.stage.x * TILE + TILE / 2;
    context2.globalAlpha = 0.3 * level;
    kit2.rect(0, 0, roomWidth, roomHeight, "#14062A");
    context2.globalAlpha = level;
    const ballY = 8;
    kit2.rect(centerX, 0, 1, ballY - 3, "#8A8A96");
    const widths = [3, 5, 7, 7, 7, 5, 3];
    const facets = ["#E8E8F0", "#9AA0B0", "#FFFFFF", "#C0C4D0"];
    widths.forEach((width2, row) => {
      for (let column = 0; column < width2; column++) {
        const x = centerX - Math.floor(width2 / 2) + column;
        kit2.rect(x, ballY - 3 + row, 1, 1, facets[(column + row + Math.floor(now * 6)) % facets.length]);
      }
    });
    context2.globalCompositeOperation = "lighter";
    const colors = ["#F06595", "#4FA3F7", "#7CFFB2", "#F5C542", "#B56CE0", "#FF8A3D"];
    for (let spot = 0; spot < 16; spot++) {
      const angle = spot / 16 * Math.PI * 2 + now * (spot % 2 === 0 ? 0.6 : -0.45);
      const reach = 0.35 + spot * 37 % 10 / 16;
      const x = Math.round(centerX + Math.cos(angle) * roomWidth * 0.45 * reach);
      const y = Math.round(roomHeight * 0.55 + Math.sin(angle) * roomHeight * 0.38 * reach);
      context2.globalAlpha = 0.5 * level;
      kit2.rect(x, y, 3, 2, colors[(spot + Math.floor(now * 2)) % colors.length]);
    }
    context2.globalAlpha = (Math.floor(now * 2) % 2 === 0 ? 0.06 : 0.02) * level;
    kit2.rect(0, 0, roomWidth, roomHeight, colors[Math.floor(now / 2) % colors.length]);
    context2.globalCompositeOperation = "source-over";
    context2.globalAlpha = 1;
  }

  // src/officeView/scenery.ts
  var TILE2 = 16;
  var noise = (value) => {
    const wave = Math.sin(value * 12.9898) * 43758.5453;
    return wave - Math.floor(wave);
  };
  function backdropHasSky(backdrop) {
    return backdrop === "sea" || backdrop === "peaks" || backdrop === "mesa" || backdrop === "skyline";
  }
  function skyBottom(backdrop, x) {
    switch (backdrop) {
      case "sea":
        return SEA_HORIZON;
      case "peaks":
        return peakTop(x);
      case "mesa":
        return Math.min(mesaTop(x), duneTop(x));
      case "skyline":
        return skylineTop(x);
      default:
        return 0;
    }
  }
  function drawBackdrop(kit2, palette2, width2, seconds, light2) {
    switch (palette2.backdrop) {
      case "sea":
        drawSea(kit2, palette2, width2, seconds);
        return;
      case "peaks":
        drawPeaks(kit2, palette2, width2, seconds, light2);
        return;
      case "mesa":
        drawMesa(kit2, palette2, width2);
        return;
      case "water":
        drawWater(kit2, palette2, width2, seconds);
        return;
      case "bookcases":
        drawBookcases(kit2, palette2, width2, light2);
        return;
      case "skyline":
        drawSkyline(kit2, palette2, width2);
        return;
    }
  }
  var SEA_HORIZON = 6;
  function drawSea(kit2, palette2, width2, seconds) {
    const { rect: rect2 } = kit2;
    rect2(0, SEA_HORIZON, width2, TILE2 - SEA_HORIZON, palette2.wall);
    rect2(0, SEA_HORIZON, width2, 1, "#1E7AA8");
    for (let glint = 0; glint < width2 / 8; glint++) {
      const x = Math.floor((noise(glint) * width2 + seconds * (3 + glint % 3 * 2)) % width2);
      rect2(x, SEA_HORIZON + 1 + Math.floor(glint % 4 * 1.5), 2 + glint % 2, 1, glint % 3 === 0 ? "#BFE8F8" : "#6CC4E8");
    }
    const wash = Math.round(Math.sin(seconds * 0.8) * 1.2);
    rect2(0, 13, width2, 3, "#D8C08A");
    rect2(0, 12 + wash, width2, 2, "#7ACBE6");
    for (let x = 0; x < width2; x += 3) {
      rect2(x, 12 + wash + (noise(x + Math.floor(seconds)) > 0.5 ? 0 : 1), 3, 1, palette2.wallTrim);
    }
    rect2(0, 14 + Math.max(0, wash), width2, 1, "#CDB27A");
  }
  function peakTop(x) {
    const ridge = Math.abs((x / 15 + noise(Math.floor(x / 30)) * 0.6) % 2 - 1);
    return 3 + Math.round(ridge * 6);
  }
  function snowHill(x) {
    return 11 + Math.round(Math.sin(x / 11) * 1.2 + Math.sin(x / 4.5) * 0.4);
  }
  function drawPeaks(kit2, palette2, width2, seconds, light2) {
    const { rect: rect2, context: context2 } = kit2;
    if (light2.stars > 0.3) {
      context2.globalAlpha = Math.min(0.55, light2.stars * 0.6);
      for (let x = 0; x < width2; x++) {
        const y = 2 + Math.sin(x / 9 + seconds * 0.5) * 1.3 + Math.sin(x / 23 - seconds * 0.3);
        const bright = 0.5 + 0.5 * Math.sin(x / 17 + seconds * 0.8);
        rect2(x, Math.round(y), 1, 2, bright > 0.4 ? "#5AF0A0" : "#3AC890");
        if (bright > 0.6) {
          rect2(x, Math.round(y) + 2, 1, 1, "#B080F0");
        }
      }
      context2.globalAlpha = 1;
    }
    for (let x = 0; x < width2; x += 2) {
      const top = peakTop(x);
      rect2(x, top, 2, TILE2 - top, palette2.wall);
      rect2(x, top, 2, top < 6 ? 2 : 1, "#FFFFFF");
      if (noise(x) > 0.6) {
        rect2(x, top + 3, 1, 2, "#6E86A8");
      }
    }
    for (let x = 0; x < width2; x += 2) {
      const top = snowHill(x);
      rect2(x, top, 2, TILE2 - top, "#F4F8FC");
      rect2(x, top, 2, 1, "#FFFFFF");
    }
    for (let x = 5; x < width2; x += 13) {
      const base2 = snowHill(x);
      rect2(x, base2 - 4, 1, 1, "#2F5A4E");
      rect2(x - 1, base2 - 3, 3, 2, "#2F5A4E");
      rect2(x - 1, base2 - 3, 1, 1, "#FFFFFF");
      rect2(x, base2 - 1, 1, 1, "#4A3220");
    }
  }
  function mesaTop(x) {
    const segment = Math.floor(x / 40);
    const local = x - segment * 40;
    if (noise(segment + 3) < 0.3 || local < 5 || local > 34) {
      return 13;
    }
    const top = 4 + Math.floor(noise(segment * 3) * 3);
    const edge = Math.min(local - 5, 34 - local);
    return edge < 3 ? top + (3 - edge) * 2 : top;
  }
  function duneTop(x) {
    return 11 + Math.round(Math.sin(x / 13) * 1.5 + Math.sin(x / 5) * 0.5);
  }
  function drawMesa(kit2, palette2, width2) {
    const { rect: rect2 } = kit2;
    for (let x = 0; x < width2; x += 2) {
      const top = mesaTop(x);
      if (top < 13) {
        rect2(x, top, 2, TILE2 - top, palette2.wall);
        rect2(x, top, 2, 1, "#E09A6A");
        rect2(x, top + 3, 2, 1, "#B0603A");
        rect2(x, top + 5, 2, 1, "#D8885A");
      }
    }
    for (let x = 0; x < width2; x += 2) {
      const top = duneTop(x);
      rect2(x, top, 2, TILE2 - top, palette2.wallTrim);
      rect2(x, top, 2, 1, "#F4D8A8");
    }
    for (let x = 23; x < width2; x += 47) {
      const base2 = duneTop(x);
      rect2(x, base2 - 4, 1, 4, "#4E8A4A");
      rect2(x - 1, base2 - 3, 1, 1, "#4E8A4A");
      rect2(x + 1, base2 - 2, 1, 1, "#4E8A4A");
    }
  }
  function drawWater(kit2, palette2, width2, seconds) {
    const { rect: rect2, context: context2 } = kit2;
    rect2(0, 0, width2, TILE2, palette2.wall);
    rect2(0, 0, width2, 4, "#2A78B0");
    for (let x = 0; x < width2; x += 4) {
      const shimmer = Math.round(Math.sin(seconds * 2 + x / 5) * 1.5);
      rect2(x + shimmer + 2, 0, 2, 1, "#8ED0F4");
    }
    context2.globalAlpha = 0.25;
    for (let ray = 0; ray < width2 / 30; ray++) {
      const start = (ray * 37 + seconds * 2) % (width2 + 30) - 15;
      for (let y = 0; y < 12; y++) {
        rect2(Math.round(start + y * 0.6), y, 3, 1, "#8ED0F4");
      }
    }
    context2.globalAlpha = 1;
    for (let x = 0; x < width2; x += 2) {
      const top = 10 + Math.round(noise(Math.floor(x / 6)) * 3);
      rect2(x, top, 2, TILE2 - top, palette2.wallTrim);
    }
    for (let x = 9; x < width2; x += 17) {
      const sway2 = Math.round(Math.sin(seconds * 1.1 + x) * 1);
      rect2(x + sway2, 4, 1, 8, "#174A70");
      rect2(x + sway2 + 1, 6, 1, 2, "#174A70");
    }
    rect2(0, TILE2 - 2, width2, 2, "#0B3254");
  }
  var LIBRARY_WINDOW_EVERY = 5;
  function drawBookcases(kit2, palette2, width2, light2) {
    const { rect: rect2 } = kit2;
    rect2(0, 0, width2, TILE2, palette2.wall);
    const colors = ["#8A2E2E", "#2E5A8A", "#3E7A3E", "#8A6A2E", "#5A2E7A", "#2E2E3A", "#A8743A"];
    for (const shelfTop of [0, 5, 10]) {
      for (let x = 0; x < width2; x += 2) {
        const height2 = 3 + Math.floor(noise(x * 7 + shelfTop) * 2);
        rect2(x, shelfTop + 4 - height2, 2, height2, colors[Math.floor(noise(x * 3 + shelfTop * 11) * colors.length)]);
      }
      rect2(0, shelfTop + 4, width2, 1, palette2.wallTrim);
    }
    for (let column = 3; column * TILE2 < width2 - TILE2; column += LIBRARY_WINDOW_EVERY) {
      const left = column * TILE2 + 1;
      rect2(left, 0, 14, 13, palette2.wallTrim);
      rect2(left + 1, 2, 12, 10, light2.sky);
      rect2(left + 3, 1, 8, 1, light2.sky);
      if (light2.stars > 0) {
        kit2.context.globalAlpha = light2.stars;
        rect2(left + 4, 4, 1, 1, "#FFFFFF");
        rect2(left + 9, 3, 1, 1, "#FFF6C8");
        rect2(left + 7, 8, 1, 1, "#FFFFFF");
        kit2.context.globalAlpha = 1;
      }
      rect2(left + 7, 1, 1, 11, palette2.wallTrim);
      rect2(left + 1, 6, 12, 1, palette2.wallTrim);
    }
    rect2(0, TILE2 - 3, width2, 3, palette2.wallTrim);
    rect2(0, TILE2 - 3, width2, 1, "#7A5232");
  }
  function skylineTowers(width2) {
    const towers = [];
    for (const near of [false, true]) {
      let left = near ? -3 : -6;
      for (let index = 0; left < width2; index++) {
        const towerWidth = 7 + Math.floor(noise(index * 5 + (near ? 50 : 0)) * 9);
        const top = near ? 6 + Math.floor(noise(index * 7 + 9) * 5) : 2 + Math.floor(noise(index * 3 + 1) * 5);
        towers.push({ left, width: towerWidth, top, near });
        left += towerWidth + (near ? 2 + Math.floor(noise(index + 70) * 6) : 0);
      }
    }
    return towers;
  }
  function skylineTop(x) {
    let top = 13;
    for (const tower of skylineTowers(x + 1)) {
      if (x >= tower.left && x < tower.left + tower.width) {
        top = Math.min(top, tower.top);
      }
    }
    return top;
  }
  function drawSkyline(kit2, palette2, width2) {
    const { rect: rect2 } = kit2;
    for (const tower of skylineTowers(width2)) {
      const color = tower.near ? palette2.wall : "#9AA8BC";
      rect2(tower.left, tower.top, tower.width, TILE2 - tower.top, color);
      if (tower.near) {
        for (let y = tower.top + 2; y < 13; y += 2) {
          for (let x = tower.left + 1; x < tower.left + tower.width - 1; x += 2) {
            rect2(x, y, 1, 1, "#8A9AB0");
          }
        }
      } else if (noise(tower.left) > 0.7) {
        rect2(tower.left + Math.floor(tower.width / 2), tower.top - 3, 1, 3, "#9AA8BC");
      }
    }
    const tank = Math.floor(width2 * 0.62);
    rect2(tank, 4, 7, 5, "#8A5A3A");
    rect2(tank + 1, 3, 5, 1, "#6A4428");
    rect2(tank + 3, 2, 1, 1, "#6A4428");
    rect2(tank + 1, 9, 1, 4, "#4A3A30");
    rect2(tank + 5, 9, 1, 4, "#4A3A30");
    rect2(tank, 6, 7, 1, "#6A4428");
    rect2(0, 13, width2, 3, palette2.wallTrim);
    rect2(0, 13, width2, 1, "#A8A296");
  }
  function drawGroundDetail(kit2, palette2, seed, at) {
    const { rect: rect2 } = kit2;
    switch (palette2.floorStyle) {
      case "sand": {
        for (let speck = 0; speck < 3; speck++) {
          const spot = at(60 + speck);
          rect2(spot.x, spot.y, 1, 1, palette2.floorLine);
        }
        if (noise(seed + 64) > 0.82) {
          const shell = at(65);
          rect2(shell.x, shell.y, 2, 1, "#F8EEE0");
          rect2(shell.x, shell.y + 1, 2, 1, "#E8A8A0");
        }
        return;
      }
      case "snow": {
        const sparkle = at(70);
        rect2(sparkle.x, sparkle.y, 1, 1, "#FFFFFF");
        const dip = at(71);
        rect2(dip.x, dip.y, 2, 1, palette2.floorLine);
        if (noise(seed + 72) > 0.78) {
          const track = at(73);
          rect2(track.x, track.y, 1, 1, "#D4E0EC");
          rect2(track.x + 2, track.y + 2, 1, 1, "#D4E0EC");
        }
        return;
      }
      case "dunes": {
        const ripple = at(80);
        rect2(ripple.x, ripple.y, 4, 1, palette2.floorLine);
        rect2(ripple.x + 3, ripple.y + 1, 3, 1, palette2.floorLine);
        if (noise(seed + 81) > 0.85) {
          const pebble = at(82);
          rect2(pebble.x, pebble.y, 2, 1, "#A07A4A");
        }
        return;
      }
      case "seabed": {
        for (let speck = 0; speck < 2; speck++) {
          const spot = at(90 + speck);
          rect2(spot.x, spot.y, 1, 1, palette2.floorLine);
        }
        if (noise(seed + 93) > 0.75) {
          const tuft = at(94);
          rect2(tuft.x, tuft.y, 1, 3, "#4E9A5A");
          rect2(tuft.x + 2, tuft.y - 1, 1, 4, "#5AAE5A");
        } else if (noise(seed + 95) > 0.85) {
          const shell = at(96);
          rect2(shell.x, shell.y, 2, 1, "#F4D0C8");
        }
        return;
      }
      case "gravel": {
        for (let speck = 0; speck < 5; speck++) {
          const spot = at(100 + speck);
          rect2(spot.x, spot.y, 1, 1, speck % 2 === 0 ? "#48484E" : "#74747A");
        }
        if (seed % 5 === 0) {
          const seam = at(106);
          rect2(seam.x, seam.y, 6, 1, "#3A3A40");
        }
        return;
      }
    }
  }
  function drawSceneryProp(kit2, kind, left, top, seconds, index) {
    const { rect: rect2, glow: glow2, context: context2 } = kit2;
    switch (kind) {
      case "palm": {
        for (let row = 0; row < 22; row++) {
          const x = left + 7 + Math.round(Math.sin(row / 7) * 1.5);
          rect2(x, top + 16 - row, 2, 1, row % 3 === 0 ? "#7A5230" : "#9A6A3E");
        }
        const crown = top - 6;
        const sway2 = Math.round(Math.sin(seconds * 0.9 + index) * 0.6);
        rect2(left + 6, crown, 4, 2, "#3E9A4A");
        rect2(left - 1 + sway2, crown - 1, 8, 2, "#5ABE5A");
        rect2(left - 3 + sway2, crown + 1, 3, 2, "#3E9A4A");
        rect2(left + 9 + sway2, crown - 1, 8, 2, "#5ABE5A");
        rect2(left + 16 + sway2, crown + 1, 3, 2, "#3E9A4A");
        rect2(left + 4, crown - 3, 3, 2, "#3E9A4A");
        rect2(left + 9, crown - 3, 3, 2, "#3E9A4A");
        rect2(left + 6, crown + 2, 2, 2, "#6A4424");
        rect2(left + 8, crown + 2, 2, 2, "#5A3A20");
        return;
      }
      case "tiki":
        rect2(left + 1, top - 4, 2, 12, "#8A5A2E");
        rect2(left + 13, top - 4, 2, 12, "#8A5A2E");
        rect2(left, top - 8, 16, 4, "#D8B060");
        for (let x = 0; x < 16; x += 2) {
          rect2(left + x, top - 4, 1, 1 + (x / 2 + index) % 2, "#B8903E");
        }
        rect2(left, top + 6, 16, 10, "#A0703E");
        rect2(left, top + 6, 16, 2, "#C08A50");
        rect2(left + 3, top + 10, 1, 6, "#7A5230");
        rect2(left + 8, top + 10, 1, 6, "#7A5230");
        rect2(left + 12, top + 10, 1, 6, "#7A5230");
        rect2(left + 4, top + 3, 2, 3, "#F06595");
        rect2(left + 3, top + 2, 3, 1, "#4CB944");
        rect2(left + 9, top + 3, 3, 3, "#6A4424");
        rect2(left + 10, top + 2, 1, 1, "#F4C848");
        return;
      case "umbrella": {
        rect2(left + 7, top - 6, 1, 22, "#E8E8E8");
        const stripe = (x) => Math.floor(x / 3) % 2 === 0 ? "#E8404A" : "#FFFFFF";
        for (let x = 5; x < 11; x++) {
          rect2(left + x, top - 10, 1, 1, stripe(x));
        }
        for (let x = 2; x < 14; x++) {
          rect2(left + x, top - 9, 1, 1, stripe(x));
        }
        for (let x = 0; x < 16; x++) {
          rect2(left + x, top - 8, 1, 2, stripe(x));
        }
        rect2(left + 7, top - 11, 1, 1, "#E8E8E8");
        rect2(left + 1, top + 13, 12, 3, "#F4E4BA");
        return;
      }
      case "sandcastle": {
        rect2(left + 1, top + 8, 14, 8, "#E0C080");
        rect2(left + 2, top + 3, 4, 6, "#E0C080");
        rect2(left + 10, top + 3, 4, 6, "#E0C080");
        rect2(left + 2, top + 2, 1, 1, "#E0C080");
        rect2(left + 5, top + 2, 1, 1, "#E0C080");
        rect2(left + 10, top + 2, 1, 1, "#E0C080");
        rect2(left + 13, top + 2, 1, 1, "#E0C080");
        rect2(left + 1, top + 8, 14, 1, "#F0D498");
        rect2(left + 7, top + 11, 2, 5, "#B89858");
        rect2(left + 3, top + 5, 1, 1, "#B89858");
        rect2(left + 12, top + 5, 1, 1, "#B89858");
        rect2(left + 11, top - 2, 1, 5, "#B8B8B8");
        rect2(left + 12, top - 2, 2 + Math.floor(seconds * 3) % 2, 2, "#E8404A");
        return;
      }
      case "snowPine":
        rect2(left + 7, top + 9, 2, 7, "#4A3220");
        for (let row = 0; row < 18; row++) {
          const half = 1 + Math.floor(row % 6 * 0.9 + row / 4);
          rect2(left + 8 - half, top - 9 + row, half * 2, 1, row % 6 < 2 ? "#3E6E5A" : "#2F5A4E");
          if (row % 6 === 0) {
            rect2(left + 8 - half, top - 9 + row, half * 2, 1, "#FFFFFF");
          }
        }
        return;
      case "cocoa": {
        rect2(left + 1, top + 5, 14, 11, "#8A5A34");
        rect2(left, top + 4, 16, 2, "#A8784A");
        rect2(left + 3, top + 9, 10, 4, "#F4EEDC");
        rect2(left + 4, top + 10, 8, 1, "#8A5A34");
        rect2(left + 6, top + 12, 4, 1, "#8A5A34");
        rect2(left + 3, top - 1, 7, 5, "#3A3A44");
        rect2(left + 3, top - 1, 7, 1, "#6A4A30");
        rect2(left + 12, top + 1, 2, 3, "#C0392B");
        rect2(left + 14, top + 2, 1, 1, "#C0392B");
        context2.globalAlpha = 0.6;
        for (let puff = 0; puff < 3; puff++) {
          const rise = (seconds * 4 + puff * 3) % 9;
          rect2(left + 5 + puff + Math.round(Math.sin(seconds * 2 + puff)), top - 2 - Math.floor(rise), 1, 1, "#FFFFFF");
        }
        context2.globalAlpha = 1;
        return;
      }
      case "snowman":
        rect2(left + 4, top + 6, 8, 10, "#FFFFFF");
        rect2(left + 3, top + 8, 10, 6, "#FFFFFF");
        rect2(left + 4, top + 14, 8, 2, "#DCE6F0");
        rect2(left + 5, top, 6, 7, "#FFFFFF");
        rect2(left + 4, top + 1, 8, 5, "#FFFFFF");
        rect2(left + 7, top + 2, 1, 1, "#2A2A30");
        rect2(left + 7, top + 4, 1, 1, "#2A2A30");
        rect2(left + 7, top + 9, 1, 1, "#2A2A30");
        rect2(left + 5, top - 6, 6, 6, "#FFFFFF");
        rect2(left + 6, top - 4, 1, 1, "#2A2A30");
        rect2(left + 9, top - 4, 1, 1, "#2A2A30");
        rect2(left + 10, top - 3, 3, 1, "#F08C3A");
        rect2(left + 4, top - 1, 8, 2, "#C0392B");
        rect2(left + 5, top + 1, 2, 3, "#C0392B");
        rect2(left + 4, top - 7, 8, 1, "#2A2A30");
        rect2(left + 5, top - 10, 6, 3, "#2A2A30");
        rect2(left + 1, top + 1, 3, 1, "#6A4424");
        rect2(left, top, 1, 1, "#6A4424");
        rect2(left + 12, top + 1, 3, 1, "#6A4424");
        rect2(left + 15, top, 1, 1, "#6A4424");
        return;
      case "igloo": {
        for (let row = 0; row < 13; row++) {
          const rise = (12 - row) / 12;
          const half = Math.round(Math.sqrt(Math.max(0, 1 - rise * rise)) * 8);
          rect2(left + 8 - half, top + 3 + row, half * 2, 1, row % 3 === 2 ? "#C9D6E4" : "#F4F8FC");
        }
        for (let row = 2; row < 13; row += 3) {
          rect2(left + 4 + row * 3 % 5, top + 3 + row - 2, 1, 2, "#C9D6E4");
          rect2(left + 10 + row * 2 % 3, top + 3 + row - 2, 1, 2, "#C9D6E4");
        }
        rect2(left + 5, top + 11, 6, 5, "#C9D6E4");
        rect2(left + 6, top + 12, 4, 4, "#2A3450");
        rect2(left + 7, top + 11, 2, 1, "#2A3450");
        return;
      }
      case "cactus":
        rect2(left + 6, top - 6, 4, 22, "#4E9A4A");
        rect2(left + 7, top - 7, 2, 1, "#4E9A4A");
        rect2(left + 7, top - 5, 1, 20, "#3E7A3A");
        rect2(left + 2, top + 1, 4, 2, "#4E9A4A");
        rect2(left + 2, top - 3, 2, 5, "#4E9A4A");
        rect2(left + 10, top + 4, 3, 2, "#4E9A4A");
        rect2(left + 12, top - 1, 2, 6, "#4E9A4A");
        rect2(left + 2, top - 3, 1, 4, "#3E7A3A");
        rect2(left + 7, top - 8, 2, 1, "#F06595");
        return;
      case "oasis": {
        rect2(left + 1, top + 8, 14, 7, "#C49558");
        rect2(left + 2, top + 9, 12, 5, "#3C9AC8");
        const ring = Math.floor(seconds * 2) % 4;
        rect2(left + 8 - ring, top + 11, 1 + ring * 2, 1, "#8FD3F4");
        for (let reed = 0; reed < 3; reed++) {
          const sway2 = Math.round(Math.sin(seconds * 1.2 + reed) * 0.8);
          rect2(left + 2 + reed * 2 + sway2, top + 2 + reed, 1, 7 - reed, "#4E9A4A");
        }
        rect2(left + 12, top + 4, 1, 5, "#4E9A4A");
        return;
      }
      case "skull":
        rect2(left + 5, top + 10, 6, 4, "#F4EEE0");
        rect2(left + 6, top + 14, 4, 2, "#F4EEE0");
        rect2(left + 6, top + 11, 1, 1, "#3A2A1A");
        rect2(left + 9, top + 11, 1, 1, "#3A2A1A");
        rect2(left + 2, top + 9, 3, 1, "#E8E0CC");
        rect2(left + 1, top + 7, 1, 2, "#E8E0CC");
        rect2(left + 11, top + 9, 3, 1, "#E8E0CC");
        rect2(left + 14, top + 7, 1, 2, "#E8E0CC");
        rect2(left + 3, top + 15, 10, 1, "#C49558");
        return;
      case "urn":
        rect2(left + 4, top + 4, 8, 11, "#C9784A");
        rect2(left + 3, top + 6, 10, 7, "#C9784A");
        rect2(left + 6, top + 1, 4, 3, "#C9784A");
        rect2(left + 5, top, 6, 1, "#B0603A");
        rect2(left + 3, top + 8, 10, 1, "#F0D4A0");
        for (let x = 4; x < 12; x += 2) {
          rect2(left + x, top + 10, 1, 1, "#7A3A20");
        }
        rect2(left + 4, top + 5, 1, 4, "#E09A6A");
        rect2(left + 5, top + 15, 6, 1, "#8A4A2A");
        return;
      case "kelp":
        for (let strand = 0; strand < 3; strand++) {
          for (let row = 0; row < 24; row++) {
            const bend = Math.round(Math.sin(seconds * 1.2 + row * 0.35 + strand + index) * 1.4 * (row / 24));
            const x = left + 2 + strand * 5 + bend;
            rect2(x, top + 16 - row, 2, 1, strand === 1 ? "#5AAE5A" : "#3E8A4A");
            if (row % 5 === 3) {
              rect2(x + 2, top + 16 - row, 2, 1, "#6AC46A");
            }
          }
        }
        return;
      case "vent": {
        rect2(left + 3, top + 6, 10, 10, "#6E6A60");
        rect2(left + 5, top + 3, 6, 3, "#6E6A60");
        rect2(left + 6, top + 3, 4, 1, "#2A2A30");
        rect2(left + 4, top + 8, 2, 4, "#8E8574");
        rect2(left + 10, top + 10, 2, 3, "#5A564E");
        for (let bubble = 0; bubble < 4; bubble++) {
          const rise = (seconds * 10 + bubble * 6) % 22;
          const x = left + 7 + Math.round(Math.sin(seconds * 3 + bubble * 2) * 1.5);
          const size = bubble % 2 === 0 ? 2 : 1;
          rect2(x, top + 2 - Math.floor(rise), size, size, "#CFEFFF");
        }
        return;
      }
      case "coral":
        rect2(left + 2, top + 13, 12, 3, "#B86A5A");
        rect2(left + 4, top + 2, 2, 11, "#F06595");
        rect2(left + 2, top + 5, 2, 2, "#F06595");
        rect2(left + 1, top + 2, 2, 3, "#F06595");
        rect2(left + 6, top + 6, 2, 2, "#F06595");
        rect2(left + 7, top + 3, 2, 3, "#F06595");
        rect2(left + 4, top + 1, 2, 1, "#F8A8C8");
        rect2(left + 9, top + 5, 5, 8, "#B197FC");
        rect2(left + 10, top + 3, 3, 2, "#B197FC");
        rect2(left + 10, top + 6, 1, 1, "#7A5AC8");
        rect2(left + 12, top + 8, 1, 1, "#7A5AC8");
        rect2(left + 11, top + 10, 1, 1, "#7A5AC8");
        rect2(left + 7, top + 10, 2, 3, "#F08C4A");
        return;
      case "chest": {
        rect2(left + 2, top + 7, 12, 9, "#8A5A2E");
        rect2(left + 2, top + 1, 12, 3, "#A06A36");
        rect2(left + 3, top + 4, 10, 3, "#F4C848");
        rect2(left + 2, top + 7, 12, 1, "#E8C048");
        rect2(left + 2, top + 12, 12, 1, "#6A4424");
        rect2(left + 7, top + 8, 2, 3, "#E8C048");
        const glint = Math.floor(seconds * 2 + index) % 5;
        rect2(left + 4 + glint * 2, top + 4, 1, 1, "#FFFFFF");
        glow2(left + 8, top + 5, 6, "#F4D860", 0.15);
        return;
      }
      case "cauldron": {
        for (let flame = 0; flame < 3; flame++) {
          const height2 = 2 + Math.floor(noise(flame * 7 + Math.floor(seconds * 8)) * 3);
          rect2(left + 5 + flame * 2, top + 16 - height2, 2, height2, flame % 2 === 0 ? "#F76707" : "#FFD43B");
        }
        rect2(left + 3, top + 6, 10, 8, "#2A2A30");
        rect2(left + 2, top + 7, 12, 5, "#2A2A30");
        rect2(left + 2, top + 5, 12, 2, "#3A3A44");
        rect2(left + 3, top + 5, 10, 1, "#7AF07A");
        rect2(left + 3, top + 14, 2, 2, "#2A2A30");
        rect2(left + 11, top + 14, 2, 2, "#2A2A30");
        const pop = Math.floor(seconds * 3 + index) % 4;
        rect2(left + 4 + pop * 2, top + 4, 2, 1, "#B8FFB0");
        context2.globalAlpha = 0.5;
        for (let puff = 0; puff < 3; puff++) {
          const rise = (seconds * 5 + puff * 4) % 12;
          rect2(left + 6 + puff * 2 + Math.round(Math.sin(seconds + puff) * 1.5), top + 3 - Math.floor(rise), 1, 1, "#9AF09A");
        }
        context2.globalAlpha = 1;
        return;
      }
      case "globe": {
        rect2(left + 4, top + 14, 8, 2, "#5A3A22");
        rect2(left + 7, top + 10, 2, 4, "#8A5A2E");
        const turn = seconds * 3;
        for (let dy = -5; dy <= 5; dy++) {
          const half = Math.round(Math.sqrt(25 - dy * dy));
          for (let dx = -half; dx < half; dx++) {
            const land = noise(Math.floor((dx + turn) / 3) * 7 + Math.floor((dy + 5) / 3) * 13) > 0.55;
            rect2(left + 8 + dx, top + 4 + dy, 1, 1, land ? "#5AAE5A" : "#3A78B8");
          }
        }
        rect2(left + 2, top + 3, 1, 3, "#E8C048");
        rect2(left + 13, top + 3, 1, 3, "#E8C048");
        rect2(left + 3, top - 2, 1, 2, "#E8C048");
        rect2(left + 12, top + 6, 1, 3, "#E8C048");
        rect2(left + 7, top - 2, 2, 1, "#E8C048");
        return;
      }
      case "candelabra": {
        rect2(left + 7, top - 2, 2, 16, "#C8A040");
        rect2(left + 4, top + 14, 8, 2, "#C8A040");
        rect2(left + 3, top + 1, 10, 1, "#C8A040");
        rect2(left + 3, top - 1, 1, 2, "#C8A040");
        rect2(left + 12, top - 1, 1, 2, "#C8A040");
        rect2(left + 2, top - 4, 3, 3, "#F4EEDC");
        rect2(left + 6, top - 7, 4, 5, "#F4EEDC");
        rect2(left + 11, top - 4, 3, 3, "#F4EEDC");
        for (const [x, y, salt] of [[3, -6, 1], [7, -9, 2], [12, -6, 3]]) {
          const tall = noise(salt + Math.floor(seconds * 7)) > 0.5;
          rect2(left + x, top + y + (tall ? 0 : 1), 1, tall ? 2 : 1, "#FFD43B");
          rect2(left + x, top + y + 1, 1, 1, "#F76707");
        }
        glow2(left + 8, top - 6, 9, "#FFC870", 0.25 + 0.05 * Math.sin(seconds * 6));
        return;
      }
      case "ac": {
        rect2(left + 1, top + 4, 14, 12, "#B8BCC4");
        rect2(left + 1, top + 3, 14, 1, "#D8DCE4");
        rect2(left + 3, top + 6, 10, 8, "#5A5E66");
        const spin = Math.floor(seconds * 10) % 2;
        if (spin === 0) {
          rect2(left + 7, top + 6, 2, 8, "#9AA0AA");
          rect2(left + 3, top + 9, 10, 2, "#9AA0AA");
        } else {
          for (let step = 0; step < 4; step++) {
            rect2(left + 4 + step * 2, top + 7 + step * 2, 2, 1, "#9AA0AA");
            rect2(left + 10 - step * 2, top + 7 + step * 2, 2, 1, "#9AA0AA");
          }
        }
        rect2(left + 7, top + 9, 2, 2, "#3A3E46");
        rect2(left + 1, top + 15, 14, 1, "#8A8E96");
        return;
      }
      case "grill": {
        rect2(left + 3, top + 5, 10, 5, "#2A2A30");
        rect2(left + 4, top + 10, 8, 1, "#2A2A30");
        rect2(left + 2, top + 4, 12, 1, "#8A8E96");
        rect2(left + 4, top + 3, 3, 1, "#C0603A");
        rect2(left + 8, top + 3, 3, 1, "#C0603A");
        rect2(left + 4, top + 11, 1, 5, "#3A3A44");
        rect2(left + 11, top + 11, 1, 5, "#3A3A44");
        rect2(left + 7, top + 11, 2, 5, "#3A3A44");
        context2.globalAlpha = 0.45;
        for (let puff = 0; puff < 4; puff++) {
          const rise = (seconds * 4 + puff * 3) % 14;
          rect2(left + 5 + puff * 2 + Math.round(Math.sin(seconds * 1.5 + puff) * 1.5), top + 2 - Math.floor(rise), 2, 1, "#C8C8D0");
        }
        context2.globalAlpha = 1;
        return;
      }
      case "antenna": {
        rect2(left + 7, top - 12, 1, 28, "#8A8E96");
        rect2(left + 4, top - 9, 7, 1, "#8A8E96");
        rect2(left + 3, top - 5, 9, 1, "#8A8E96");
        rect2(left + 5, top - 1, 5, 1, "#8A8E96");
        rect2(left + 9, top + 3, 4, 4, "#D8DCE4");
        rect2(left + 8, top + 4, 1, 2, "#8A8E96");
        rect2(left + 5, top + 13, 6, 3, "#6A6E76");
        rect2(left + 7, top - 13, 1, 1, Math.floor(seconds * 1.2) % 2 === 0 ? "#FF5050" : "#5C2A2A");
        return;
      }
    }
  }
  function propLight(kind) {
    switch (kind) {
      case "tiki":
        return { dx: 8, dy: 2, radius: 16, color: "#FFB060", alpha: 0.5 };
      case "cocoa":
        return { dx: 8, dy: 4, radius: 11, color: "#FFB070", alpha: 0.35 };
      case "igloo":
        return { dx: 8, dy: 14, radius: 10, color: "#FFB060", alpha: 0.4 };
      case "cauldron":
        return { dx: 8, dy: 6, radius: 18, color: "#7AF07A", alpha: 0.45 };
      case "candelabra":
        return { dx: 8, dy: -5, radius: 28, color: "#FFC870", alpha: 0.75 };
      case "chest":
        return { dx: 8, dy: 4, radius: 9, color: "#F4D860", alpha: 0.3 };
      case "grill":
        return { dx: 8, dy: 5, radius: 12, color: "#FF8040", alpha: 0.35 };
      case "antenna":
        return { dx: 8, dy: -12, radius: 6, color: "#FF5050", alpha: 0.4 };
      default:
        return void 0;
    }
  }
  function drawWeather(kit2, sceneId2, roomWidth, roomHeight, seconds) {
    const { rect: rect2, context: context2 } = kit2;
    if (sceneId2 === "snowfield") {
      context2.globalAlpha = 0.85;
      for (let flake = 0; flake < roomWidth * roomHeight / 500; flake++) {
        const fall = 8 + noise(flake * 5) * 8;
        const x = (noise(flake) * roomWidth + Math.sin(seconds * 0.7 + flake) * 4 + seconds * 3) % roomWidth;
        const y = (noise(flake * 3) * roomHeight + seconds * fall) % roomHeight;
        rect2(Math.floor(x), Math.floor(y), 1, 1, "#FFFFFF");
      }
      context2.globalAlpha = 1;
    } else if (sceneId2 === "reef") {
      context2.globalAlpha = 0.55;
      for (let bubble = 0; bubble < roomWidth / 18; bubble++) {
        const rise = (seconds * (8 + noise(bubble * 9) * 6) + noise(bubble) * roomHeight) % (roomHeight + 8);
        const x = noise(bubble * 7) * roomWidth + Math.sin(seconds * 2 + bubble) * 2;
        const size = bubble % 3 === 0 ? 2 : 1;
        rect2(Math.floor(x), Math.floor(roomHeight - rise), size, size, "#CFEFFF");
      }
      context2.globalAlpha = 1;
    }
  }
  function drawAfterLight(kit2, sceneId2, roomWidth, light2) {
    if (sceneId2 !== "rooftop" || light2.stars < 0.15) {
      return;
    }
    const { rect: rect2, context: context2 } = kit2;
    context2.save();
    context2.beginPath();
    context2.rect(0, 0, roomWidth, 13);
    context2.clip();
    context2.globalAlpha = Math.min(1, light2.stars * 1.6);
    for (const tower of skylineTowers(roomWidth)) {
      const step = tower.near ? 2 : 3;
      for (let y = tower.top + 2; y < 13; y += step) {
        for (let x = tower.left + 1; x < tower.left + tower.width - 1; x += step) {
          if (noise(x * 13 + y * 7) > 0.55) {
            rect2(x, y, 1, 1, noise(x + y) > 0.8 ? "#BFE0FF" : "#FFD98A");
          }
        }
      }
    }
    context2.restore();
  }

  // src/officeView/main.ts
  var TILE3 = 16;
  var SEATED_LIFT = 5;
  var GUY_HEIGHT = FRAME_HEIGHT - HEAD_ROOM;
  var vscode = acquireVsCodeApi();
  var canvas = document.getElementById("office");
  var context = canvas.getContext("2d");
  var statusLabel = document.getElementById("status");
  var sceneLabel = document.getElementById("scene");
  var tooltip = document.getElementById("tooltip");
  var kit = { rect, glow, context };
  var sceneId = "office";
  var latestInputs = [];
  var hasSynced = false;
  var state = createOffice(buildOfficeLayout(12, 8, sceneId));
  var width = 0;
  var height = 0;
  var scale = 1;
  var originX = 0;
  var originY = 0;
  var hoveredId;
  var youKey;
  var youHovered = false;
  var sceneEvent;
  var roomReactions = [];
  var focusedId;
  var visitorsSetting = "normal";
  var visits = /* @__PURE__ */ new Map();
  var visitCount = 0;
  var nextVisitorAt = visitorGap(Math.random, "normal", true);
  var REMARK_REACH = 4;
  var chatterSetting = "tidy";
  var LOG_LINE = 16;
  var LOG_LINES = 3;
  var LOG_RESERVE = 20 + LOG_LINES * LOG_LINE + 6;
  var performancesSetting = "normal";
  var nextShowAt = performanceGap(Math.random, "normal", true);
  var showCount = 0;
  var showEffects = new ShowEffects();
  var random = Math.random;
  var crittersOn = true;
  var racesOn = true;
  var critterRun;
  var critterWatchers = /* @__PURE__ */ new Set();
  var nextCritterAt = 5;
  var fliersOn = true;
  var flight;
  var flightWatchers = /* @__PURE__ */ new Set();
  var nextFlightAt = 20;
  var dayNightOn = true;
  var skyCache;
  var light = sceneLight("office", DAYTIME_SKY);
  var lightMap;
  function currentSky() {
    if (!dayNightOn) {
      return DAYTIME_SKY;
    }
    const now = Date.now();
    if (skyCache === void 0 || Math.abs(now - skyCache.at) > 5e3) {
      skyCache = { at: now, sky: skyNow(new Date(now)) };
    }
    return skyCache.sky;
  }
  function fitLayout() {
    const withStation = youKey !== void 0;
    const roomHeight = Math.max(TILE3 * 4, height - (chatterSetting === "log" ? LOG_RESERVE : 0));
    const shape = officeShape(desksNeeded(latestInputs.length) + (withStation ? STATION_DESKS : 0), width, roomHeight, TILE3, withStation);
    const layout = state.layout;
    if (shape.cols !== layout.cols || shape.rows !== layout.rows || sceneChanged || layout.station !== void 0 !== withStation) {
      sceneChanged = false;
      relayoutOffice(state, buildOfficeLayout(shape.cols, shape.rows, sceneId, withStation), random);
    }
    const pixelRatio = window.devicePixelRatio || 1;
    const fit = Math.min(width / (state.layout.cols * TILE3), roomHeight / (state.layout.rows * TILE3));
    const snapped = Math.floor(fit * pixelRatio) / pixelRatio;
    scale = snapped >= fit * 0.85 ? snapped : fit;
    originX = Math.floor((width - state.layout.cols * TILE3 * scale) / 2);
    originY = Math.floor(height - state.layout.rows * TILE3 * scale);
  }
  var sceneChanged = false;
  new ResizeObserver(() => {
    const pixelRatio = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    if (width > 0 && height > 0) {
      fitLayout();
    }
  }).observe(canvas);
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (data !== null && typeof data === "object" && data.type === "maker") {
      const requestId = data.requestId;
      openMaker({ look: data.look, title: data.title }, (look) => vscode.postMessage({ type: "makerDone", requestId, look: look ?? null }));
      return;
    }
    if (data !== null && typeof data === "object" && data.type === "visitor") {
      sendVisitor(typeof data.kind === "string" ? data.kind : void 0);
      return;
    }
    if (data !== null && typeof data === "object" && data.type === "say") {
      sayLine(data);
      return;
    }
    if (data !== null && typeof data === "object" && data.type === "performance") {
      playShow(isPerformanceKind(data.kind) ? data.kind : void 0);
      return;
    }
    if (data !== null && typeof data === "object" && data.type === "sceneEvent") {
      startSceneEvent(data);
      return;
    }
    if (data !== null && typeof data === "object" && data.type === "tint") {
      setTint(data);
      return;
    }
    if (data === null || typeof data !== "object" || data.type !== "office" || !Array.isArray(data.agents)) {
      return;
    }
    const nextYouKey = data.you === null || typeof data.you !== "object" ? void 0 : `you|${JSON.stringify(data.you)}`;
    if (nextYouKey !== youKey) {
      youKey = nextYouKey;
      if (data.you !== null && nextYouKey !== void 0) {
        lookCache.set(nextYouKey, data.you);
      }
    }
    const nextScene = officeSceneId(data.scene);
    crittersOn = data.critters !== false;
    fliersOn = data.fliers !== false;
    const nextRaces = data.races !== false;
    if (nextRaces !== racesOn) {
      racesOn = nextRaces;
      for (const key of [...lookCache.keys()]) {
        if (!key.startsWith("you|") && !key.startsWith("visitor|") && !key.startsWith("show|") && !customLooks.has(key)) {
          lookCache.delete(key);
        }
      }
      spriteCache.clear();
    }
    dayNightOn = data.dayNight !== false;
    const nextVisitors = visitorFrequency(data.visitors);
    if (nextVisitors !== visitorsSetting && nextVisitors !== "off") {
      nextVisitorAt = Math.min(nextVisitorAt, state.time + visitorGap(random, nextVisitors, true));
    }
    visitorsSetting = nextVisitors;
    const nextPerformances = performanceFrequency(data.performances);
    if (nextPerformances !== performancesSetting && nextPerformances !== "off") {
      nextShowAt = Math.min(nextShowAt, state.time + performanceGap(random, nextPerformances, true));
    }
    performancesSetting = nextPerformances;
    state.talk = talkFactor(talkFrequency(data.talk));
    bubbleLookSetting = bubbleLook(data.bubbleLook);
    const nextChatter = chatterStyle(data.chatter);
    if (nextChatter !== chatterSetting) {
      chatterSetting = nextChatter;
      if (width > 0 && height > 0) {
        fitLayout();
      }
    }
    focusedId = typeof data.focusedId === "string" ? data.focusedId : void 0;
    if (nextScene !== sceneId) {
      sceneId = nextScene;
      sceneChanged = true;
      critterRun = void 0;
      nextCritterAt = state.time + 3;
      flight = void 0;
      nextFlightAt = state.time + 12;
      showEffects.clear();
      if (width > 0 && height > 0) {
        fitLayout();
      }
    }
    const agents = data.agents.filter(
      (agent) => typeof agent?.id === "string" && typeof agent.seed === "string" && (agent.status === "working" || agent.status === "idle" || agent.status === "asleep")
    );
    setCustomLooks(agents);
    latestInputs = agents.map(({ id, seed, status, title }) => ({ id, seed, status, title: typeof title === "string" ? title : "" }));
    const nextYouStatus = data.youStatus === "busy" || data.youStatus === "idle" ? data.youStatus : "auto";
    if (width > 0 && height > 0) {
      fitLayout();
    }
    syncOffice(state, latestInputs, random, hasSynced ? "door" : "seated");
    syncYou(state, youKey, random);
    setYouStatus(state, nextYouStatus, random);
    hasSynced = true;
    sceneLabel.textContent = OFFICE_SCENES.find((scene) => scene.id === sceneId)?.label.toLowerCase() ?? "office";
  });
  function startSceneEvent(data) {
    if (document.hidden || !SCENE_EVENT_KINDS.includes(data.kind)) {
      return;
    }
    const start = state.time;
    sceneEvent = { kind: data.kind, variant: Math.floor(Number(data.variant) || 0), age: 0, start };
    roomReactions = [];
    callYouBack(state, random);
    for (const agent of state.agents) {
      const text = agent.status === "asleep" || agent.leaving || agent.you ? void 0 : roomReaction(data.kind, random);
      if (text !== void 0) {
        roomReactions.push({ id: agent.id, text, at: start + 0.2 + random() * 0.9 });
      }
    }
  }
  function playRoomReactions() {
    const due = roomReactions.filter((reaction) => reaction.at <= state.time);
    roomReactions = roomReactions.filter((reaction) => reaction.at > state.time);
    for (const reaction of due) {
      const agent = state.agents.find((candidate) => candidate.id === reaction.id);
      if (agent !== void 0) {
        agent.bubble = { text: reaction.text, until: state.time + (reaction.seconds ?? 1.6) };
      }
    }
  }
  function stepVisitors() {
    const here2 = visitorAgents(state);
    for (const id of [...visits.keys()]) {
      if (!here2.some((agent) => agent.id === id)) {
        visits.delete(id);
      }
    }
    for (const visitor of here2) {
      const known = visits.get(visitor.id);
      const remarks = visitor.visitor?.remarks ?? 0;
      if (known === void 0 || remarks <= known.heard) {
        continue;
      }
      const arriving = known.heard === 0;
      known.heard = remarks;
      answerVisitor(visitor, known.kind, arriving);
    }
    if (visitorsSetting === "off" || sceneEvent !== void 0 || state.time < nextVisitorAt) {
      return;
    }
    if (state.show !== void 0) {
      nextVisitorAt = state.time + 20;
      return;
    }
    nextVisitorAt = state.time + visitorGap(random, visitorsSetting);
    sendVisitor(void 0);
  }
  function sendVisitor(kindId) {
    if (!state.agents.some((agent) => agent.visitor === void 0)) {
      return;
    }
    const plan = planVisit(random, kindId);
    visitCount += 1;
    const seed = `visitor|${plan.kind.id}|${visitCount % 12}`;
    const id = `${seed}|${visitCount}`;
    const look = pixelGuyLook(seed, racesOn);
    lookCache.set(seed, { ...look, shirt: plan.kind.shirt, pants: plan.kind.pants, accessory: plan.kind.accessory ?? look.accessory, tie: plan.kind.tie });
    const arrived = visitorArrives(state, {
      id,
      seed,
      title: plan.kind.title,
      lines: plan.lines,
      boss: plan.kind.boss,
      smallTalk: visitorSmallTalk(plan.kind),
      farewell: plan.farewell,
      stay: plan.stay
    }, random);
    if (arrived !== void 0) {
      visits.set(id, { kind: plan.kind, heard: 0 });
    }
  }
  function answerVisitor(visitor, kind, wholeRoom) {
    for (const agent of state.agents) {
      if (agent === visitor || agent.leaving || agent.bubble !== void 0 || agent.crew !== void 0) {
        continue;
      }
      if (!wholeRoom && Math.hypot(agent.x - visitor.x, agent.y - visitor.y) > REMARK_REACH) {
        continue;
      }
      lookToward(state, agent, visitor, 3);
      const text = agent.visitor !== void 0 ? random() < 0.3 ? "mhm" : void 0 : visitorReaction(personalityOf(agent.seed), kind.boss, agent.status === "asleep", random);
      if (text !== void 0) {
        roomReactions.push({ id: agent.id, text, at: state.time + 0.9 + random() * 1.8, seconds: 2 });
      }
    }
  }
  function stepShows() {
    if (state.show !== void 0 || performancesSetting === "off" || sceneEvent !== void 0 || state.time < nextShowAt) {
      return;
    }
    nextShowAt = state.time + performanceGap(random, performancesSetting);
    const crowd = state.agents.some(
      (agent) => !agent.leaving && agent.performer === void 0 && agent.crew === void 0 && (agent.status === "idle" || agent.status === "asleep")
    );
    if (!crowd) {
      nextShowAt = state.time + 120;
      return;
    }
    playShow(void 0);
  }
  function playShow(kind) {
    if (state.show !== void 0) {
      endShow(state, random);
    }
    const plan = planPerformance(random, kind);
    showCount += 1;
    const performers = PERFORMANCES[plan.kind].roles.map((role, index) => {
      const seed = `show|${plan.kind}|${role}|${showCount % 5}`;
      const look = pixelGuyLook(seed, racesOn);
      const outfit = ROLE_OUTFITS[role];
      lookCache.set(seed, {
        ...look,
        shirt: outfit.shirt,
        pants: outfit.pants,
        accessory: outfit.accessory ?? look.accessory,
        accessoryColor: outfit.accessoryColor ?? look.accessoryColor,
        tie: outfit.tie
      });
      return { id: `${seed}|${showCount}`, seed, title: plan.titles[index] ?? plan.title, role };
    });
    if (startShow(state, { kind: plan.kind, title: plan.title, performers, lines: plan.lines, closer: plan.closer, length: plan.length, food: plan.food }, random)) {
      nextShowAt = Math.max(nextShowAt, state.time + plan.length + 120);
      vscode.postMessage({ type: "showStart", kind: plan.kind });
    }
  }
  function currentEvent() {
    if (sceneEvent === void 0) {
      return void 0;
    }
    sceneEvent.age = state.time - sceneEvent.start;
    if (sceneEvent.age >= yourEventSeconds(sceneEvent.kind)) {
      vscode.postMessage({ type: "eventEnd", kind: sceneEvent.kind });
      sceneEvent = void 0;
    }
    return sceneEvent;
  }
  var lookCache = /* @__PURE__ */ new Map();
  var customLooks = /* @__PURE__ */ new Map();
  function setCustomLooks(agents) {
    const next = /* @__PURE__ */ new Map();
    for (const agent of agents) {
      if (agent.look !== null && typeof agent.look === "object") {
        next.set(agent.seed, agent.look);
      }
    }
    for (const seed of /* @__PURE__ */ new Set([...customLooks.keys(), ...next.keys()])) {
      const look = next.get(seed);
      const text = look === void 0 ? void 0 : JSON.stringify(look);
      if (text === customLooks.get(seed)) {
        continue;
      }
      if (look === void 0 || text === void 0) {
        customLooks.delete(seed);
        lookCache.delete(seed);
      } else {
        customLooks.set(seed, text);
        lookCache.set(seed, look);
      }
      forgetSprites(seed);
    }
  }
  function forgetSprites(seed) {
    for (const key of [...spriteCache.keys()]) {
      if (key.startsWith(`${seed}|`)) {
        spriteCache.delete(key);
      }
    }
  }
  var CREW_UNIFORM = { shirt: "#F28C28", pants: "#2F3E55", shoes: "#3A2B26", accessory: "cap", accessoryColor: "#E8B931" };
  function lookOf(seed) {
    let look = lookCache.get(seed);
    if (look === void 0) {
      look = pixelGuyLook(seed, racesOn);
      if (seed.startsWith("crew|")) {
        look = { ...look, ...CREW_UNIFORM };
      }
      lookCache.set(seed, look);
    }
    return look;
  }
  function deskStyleOf(seed) {
    return deskStyleFor(seed === void 0 ? void 0 : lookOf(seed).race);
  }
  var spriteCache = /* @__PURE__ */ new Map();
  function sprite(seed, pose, facing, frame) {
    const key = `${seed}|${pose}|${facing}|${frame}`;
    const cached = spriteCache.get(key);
    if (cached !== void 0) {
      return cached;
    }
    const look = lookOf(seed);
    const image = document.createElement("canvas");
    image.width = FRAME_WIDTH;
    image.height = FRAME_HEIGHT;
    const imageContext = image.getContext("2d");
    pixelGuyFrame(look, pose, facing, frame).forEach((row, y) => row.forEach((color, x) => {
      if (color !== null) {
        imageContext.fillStyle = color;
        imageContext.fillRect(x, y, 1, 1);
      }
    }));
    if (spriteCache.size > 4e3) {
      spriteCache.clear();
    }
    spriteCache.set(key, image);
    return image;
  }
  function rect(x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  }
  var noise2 = (value) => {
    const wave = Math.sin(value * 12.9898) * 43758.5453;
    return wave - Math.floor(wave);
  };
  function drawFloor(layout, palette2) {
    for (let y = 1; y < layout.rows; y++) {
      for (let x = 0; x < layout.cols; x++) {
        const left = x * TILE3;
        const top = y * TILE3;
        if (palette2.floorStyle === "planks" || palette2.floorStyle === "tiles") {
          rect(left, top, TILE3, TILE3, (x + y) % 2 === 0 ? palette2.floor : palette2.floorAlt);
          rect(left, top + TILE3 - 1, TILE3, 1, palette2.floorLine);
          if (palette2.floorStyle === "planks") {
            rect(left + y * 5 % TILE3, top, 1, TILE3 - 1, palette2.floorLine);
          } else {
            rect(left + TILE3 - 1, top, 1, TILE3, palette2.floorLine);
          }
        } else {
          drawGround(left, top, x * 31 + y * 17, palette2);
        }
      }
    }
    rect(0, TILE3, layout.cols * TILE3, 2, palette2.shadow);
  }
  function drawGround(left, top, seed, palette2) {
    rect(left, top, TILE3, TILE3, palette2.floor);
    const at = (salt) => ({
      x: left + Math.floor(noise2(seed + salt) * (TILE3 - 2)),
      y: top + Math.floor(noise2(seed * 3 + salt) * (TILE3 - 2))
    });
    const patch = at(1);
    rect(patch.x, patch.y, 5, 3, palette2.floorAlt);
    switch (palette2.floorStyle) {
      case "grass":
      case "meadow":
        for (let blade = 0; blade < 4; blade++) {
          const spot = at(10 + blade);
          rect(spot.x, spot.y, 1, 2, palette2.floorLine);
          rect(spot.x + 1, spot.y + 1, 1, 1, palette2.floorLine);
        }
        if (palette2.floorStyle === "meadow" && noise2(seed + 40) > 0.55) {
          const flower = at(41);
          rect(flower.x, flower.y, 1, 1, ["#FFFFFF", "#FFD43B", "#F783AC", "#B197FC"][Math.floor(noise2(seed + 42) * 4)]);
        }
        return;
      case "pebbles":
        for (let pebble = 0; pebble < 3; pebble++) {
          const spot = at(20 + pebble);
          rect(spot.x, spot.y, 2, 1, ["#8E8574", "#A39A88", "#7A7264"][pebble]);
        }
        return;
      case "stone": {
        const crack = at(30);
        rect(crack.x, crack.y, 3, 1, palette2.floorLine);
        rect(crack.x + 2, crack.y + 1, 2, 1, palette2.floorLine);
        if (noise2(seed + 31) > 0.6) {
          const rock = at(32);
          rect(rock.x, rock.y, 2, 2, palette2.floorLine);
          rect(rock.x, rock.y, 1, 1, "#5E5752");
        }
        return;
      }
      case "regolith": {
        if (noise2(seed + 50) > 0.6) {
          const crater = at(51);
          rect(crater.x, crater.y, 4, 1, palette2.floorLine);
          rect(crater.x, crater.y + 1, 1, 1, palette2.floorLine);
          rect(crater.x + 1, crater.y + 2, 3, 1, "#BDBDC4");
        }
        const dust = at(52);
        rect(dust.x, dust.y, 1, 1, "#BDBDC4");
        return;
      }
      default:
        drawGroundDetail(kit, palette2, seed, at);
    }
  }
  function drawWall(layout, palette2, seconds) {
    const width2 = layout.cols * TILE3;
    context.save();
    context.beginPath();
    context.rect(0, 0, width2, TILE3);
    context.clip();
    switch (palette2.backdrop) {
      case "windows":
      case "panels":
        rect(0, 0, width2, TILE3, palette2.wall);
        rect(0, TILE3 - 3, width2, 3, palette2.wallTrim);
        for (let x = 3; x < layout.cols - 1; x += 5) {
          if (palette2.backdrop === "windows") {
            drawWindow(x * TILE3 + 1, 2, palette2);
          } else {
            drawWallPanel(x * TILE3 + 1, 2, palette2, seconds, x);
          }
        }
        break;
      case "trees":
        drawTrees(width2, palette2);
        break;
      case "sky":
        drawSky(width2, palette2, seconds);
        break;
      case "river":
        drawRiver(width2, palette2, seconds);
        break;
      case "rock":
        drawRockWall(width2, palette2, seconds);
        break;
      case "space":
        drawSpace(width2, palette2, seconds);
        break;
      default:
        if (backdropHasSky(palette2.backdrop)) {
          drawSkyBodies(width2, seconds);
        }
        drawBackdrop(kit, palette2, width2, seconds, light);
    }
    context.restore();
    drawLuckyCat(rect, TILE3 + 8, 1, seconds, /* @__PURE__ */ new Date(), currentEvent() !== void 0);
    drawDoor(layout.door, palette2);
  }
  function drawWindow(left, top, palette2) {
    rect(left, top, 14, 10, palette2.windowFrame);
    rect(left + 1, top + 1, 12, 8, light.sky);
    if (light.stars > 0) {
      context.globalAlpha = light.stars;
      rect(left + 3, top + 3, 1, 1, "#FFFFFF");
      rect(left + 9, top + 2, 1, 1, "#FFF6C8");
      rect(left + 7, top + 6, 1, 1, "#FFFFFF");
      context.globalAlpha = 1;
    }
    if (light.stars < 0.8) {
      rect(left + 2, top + 6, 5, 2, light.cloud);
      rect(left + 3, top + 5, 3, 1, light.cloud);
    }
    rect(left + 7, top + 1, 1, 8, palette2.windowFrame);
    rect(left + 1, top + 5, 12, 1, palette2.windowFrame);
  }
  function drawWallPanel(left, top, palette2, seconds, index) {
    rect(left, top, 14, 10, palette2.windowFrame);
    rect(left + 1, top + 1, 12, 8, "#0B0F14");
    for (let led = 0; led < 6; led++) {
      const on = noise2(index * 7 + led + Math.floor(seconds * 3 + led)) > 0.4;
      rect(left + 2 + led * 2, top + 3, 1, 1, on ? led % 3 === 0 ? "#F1C24B" : "#3DDC6A" : "#1B2A1F");
      rect(left + 2 + led * 2, top + 6, 1, 1, noise2(index * 3 + led * 5 + Math.floor(seconds * 2)) > 0.5 ? "#4FC3F7" : "#132530");
    }
  }
  function drawTrees(width2, palette2) {
    rect(0, 0, width2, TILE3, palette2.wall);
    for (let x = 2; x < width2; x += 7) {
      const shift = Math.floor(noise2(x) * 3);
      rect(x + shift, 5, 2, 9, "#4A3220");
    }
    for (let x = -4; x < width2; x += 6) {
      const height2 = 5 + Math.floor(noise2(x * 5) * 4);
      rect(x, 0, 8, height2, "#2F5A2E");
      rect(x + 2, 0, 4, height2 - 2, "#3E6E36");
    }
    for (let x = 0; x < width2; x += 4) {
      rect(x, 12 - Math.floor(noise2(x * 7) * 2), 4, 4, palette2.wallTrim);
      rect(x + 1, 12, 2, 1, "#3E7A38");
    }
  }
  function drawFireflies(width2, seconds) {
    if (sceneId !== "forest" || light.stars < 0.3) {
      return;
    }
    for (let fly = 0; fly < Math.ceil(width2 / 24); fly++) {
      const glowing = Math.sin(seconds * 2 + fly * 1.7) > 0.2;
      if (glowing) {
        const x = Math.floor((noise2(fly * 9) * width2 + Math.sin(seconds * 0.5 + fly) * 6 + width2) % width2);
        rect(x, 4 + Math.floor(noise2(fly * 13) * 8), 1, 1, "#E9F77A");
      }
    }
  }
  function drawSky(width2, palette2, seconds) {
    drawSkyBodies(width2, seconds);
    for (let x = 0; x < width2; x += 2) {
      const hill = hillTop(x);
      rect(x, hill, 2, TILE3 - hill, "#6FA84A");
    }
    rect(0, 12, width2, 1, palette2.wallTrim);
    rect(0, 14, width2, 1, palette2.wallTrim);
    for (let x = 3; x < width2; x += 8) {
      rect(x, 10, 1, 6, palette2.wallTrim);
    }
  }
  function drawSkyBodies(width2, seconds) {
    const sky = currentSky();
    rect(0, 0, width2, TILE3, light.sky);
    if (light.stars > 0) {
      context.globalAlpha = light.stars;
      for (let star = 0; star < width2 / 10; star++) {
        rect(Math.floor(noise2(star * 3) * width2), Math.floor(noise2(star * 7) * 7), 1, 1, "#FFF6C8");
      }
      context.globalAlpha = 1;
    }
    if (sky.moon.elevation > -2 && sky.moon.illumination > 0.03) {
      drawMoonDisc(skyX(sky.moon.hourAngle, width2), skyY(sky.moon.elevation), sky.moon.illumination, sky.moon.phase < 0.5);
    }
    if (sky.sun.elevation > -3) {
      const sunX = skyX(sky.sun.hourAngle, width2);
      const sunY = skyY(sky.sun.elevation);
      if (sky.sun.elevation < 8) {
        glow(sunX, sunY, 7, light.sun, 0.25);
      }
      rect(sunX - 2, sunY - 2, 4, 4, light.sun);
      rect(sunX - 3, sunY - 1, 6, 2, light.sun);
    }
    for (let cloud = 0; cloud < Math.ceil(width2 / 70); cloud++) {
      const x = Math.floor((seconds * 1.5 + cloud * 70 + noise2(cloud) * 30) % (width2 + 20) - 10);
      rect(x, 2 + cloud % 2 * 2, 9, 2, light.cloud);
      rect(x + 2, 1 + cloud % 2 * 2, 4, 1, light.cloud);
    }
  }
  function hillTop(x) {
    return 8 + Math.round(Math.sin(x / 19) * 1.5 + Math.sin(x / 7) * 0.8);
  }
  function skyX(hourAngle, width2) {
    return Math.round(width2 / 2 + hourAngle / 120 * (width2 / 2 - 8));
  }
  function skyY(elevation2) {
    return Math.max(2, Math.round(8 - elevation2 / 55 * 6));
  }
  function drawMoonDisc(centerX, centerY, illumination, waxing) {
    const lit = light.stars > 0.3 ? "#F4F1DE" : mix(light.sky, "#FFFFFF", 0.65);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx + dy * dy > 10) {
          continue;
        }
        if (discLit(dx / 3.2, dy / 3.2, illumination, waxing)) {
          rect(centerX + dx, centerY + dy, 1, 1, lit);
        } else if (light.stars > 0.3) {
          rect(centerX + dx, centerY + dy, 1, 1, mix(light.sky, "#FFFFFF", 0.08));
        }
      }
    }
  }
  function drawRiver(width2, palette2, seconds) {
    rect(0, 0, width2, 3, "#5E8F3E");
    rect(0, 3, width2, 10, palette2.wall);
    rect(0, 3, width2, 1, "#2F6E9C");
    for (let ripple = 0; ripple < width2 / 9; ripple++) {
      const x = Math.floor((noise2(ripple) * width2 + seconds * (8 + ripple % 3 * 4)) % width2);
      rect(x, 5 + ripple % 4 * 2, 3, 1, ripple % 2 === 0 ? "#8FD3F4" : "#5FAEDC");
    }
    for (let x = 0; x < width2; x += 5) {
      const rise = Math.floor(noise2(x * 3) * 2);
      rect(x, 12 - rise, 5, 4 + rise, x % 10 === 0 ? palette2.wallTrim : "#A39A88");
      rect(x + 1, 12 - rise, 2, 1, "#C2B9A6");
    }
  }
  function drawRockWall(width2, palette2, seconds) {
    rect(0, 0, width2, TILE3, palette2.wall);
    for (let x = 0; x < width2; x += 5) {
      rect(x, Math.floor(noise2(x) * 10), 4, 3, palette2.wallTrim);
    }
    for (let x = 4; x < width2; x += 11) {
      const length = 3 + Math.floor(noise2(x * 7) * 4);
      for (let row = 0; row < length; row++) {
        const half = Math.max(0, 2 - Math.floor(row * 3 / length));
        rect(x - half, row, half * 2 + 1, 1, "#4A4440");
      }
    }
    for (let x = 30; x < width2; x += 37) {
      const pulse = 0.5 + 0.5 * Math.sin(seconds * 1.5 + x);
      const color = x % 2 === 0 ? "#B197FC" : "#63E6BE";
      glow(x + 1, 8, 5, color, 0.15 + pulse * 0.2);
      rect(x, 6, 1, 5, color);
      rect(x + 2, 8, 1, 3, color);
      rect(x - 1, 9, 1, 2, color);
    }
    rect(0, TILE3 - 3, width2, 3, "#1E1B19");
  }
  function drawSpace(width2, palette2, seconds) {
    rect(0, 0, width2, TILE3, palette2.wall);
    for (let star = 0; star < width2 / 6; star++) {
      const twinkle = noise2(star * 5 + Math.floor(seconds * 1.5 + star)) > 0.15;
      rect(Math.floor(noise2(star * 3) * width2), Math.floor(noise2(star * 7) * 11), 1, 1, twinkle ? "#FFFFFF" : "#555A70");
    }
    const phase = currentSky().moon.phase;
    const sunUp = lunarSunElevation(phase);
    if (sunUp > -4) {
      const sunX = skyX((phase - 0.5) * 240, width2);
      const sunY = Math.max(2, Math.round(10 - sunUp / 90 * 8));
      rect(sunX - 1, sunY - 1, 3, 3, "#FFFFFF");
      rect(sunX - 2, sunY, 5, 1, "#FFF6E0");
      rect(sunX, sunY - 2, 1, 5, "#FFF6E0");
    }
    const earthX = width2 - 36;
    rect(earthX + 1, 1, 6, 8, "#2E86DE");
    rect(earthX, 2, 8, 6, "#2E86DE");
    rect(earthX + 2, 2, 3, 2, "#4CB944");
    rect(earthX + 4, 5, 3, 2, "#4CB944");
    rect(earthX + 1, 4, 2, 1, "#FFFFFF");
    context.globalAlpha = 0.82;
    for (let y = 1; y < 9; y++) {
      for (let x = earthX; x < earthX + 8; x++) {
        const inside = y >= 2 && y < 8 || x > earthX && x < earthX + 7;
        if (inside && !discLit((x + 0.5 - (earthX + 4)) / 4, (y + 0.5 - 5) / 4, earthIllumination(phase), phase > 0.5)) {
          rect(x, y, 1, 1, "#070A18");
        }
      }
    }
    context.globalAlpha = 1;
    for (let x = 0; x < width2; x += 3) {
      const ridge = ridgeTop(x);
      rect(x, ridge, 3, TILE3 - ridge, palette2.wallTrim);
    }
    rect(0, TILE3 - 1, width2, 1, "#6A6A72");
  }
  function ridgeTop(x) {
    return 11 + Math.round(Math.sin(x / 13) * 1.2 + noise2(x) * 0.8);
  }
  function drawDoor(door, palette2) {
    const open2 = state.agents.some((agent) => Math.abs(agent.x - door.x) + Math.abs(agent.y - door.y) < 1.2);
    const left = door.x * TILE3 + 2;
    switch (palette2.doorStyle) {
      case "door":
        rect(left, 1, 12, TILE3 - 1, palette2.doorFrame);
        rect(left + 1, 2, 10, TILE3 - 2, open2 ? "#121212" : palette2.door);
        if (!open2) {
          rect(left + 8, 9, 1, 1, "#F1C24B");
        }
        return;
      case "trail":
        for (let row = 0; row < TILE3; row++) {
          const half = 2 + Math.floor(row * 4 / TILE3);
          rect(left + 6 - half - 1, row, half * 2 + 2, 1, palette2.doorFrame);
          rect(left + 6 - half, row, half * 2, 1, palette2.door);
        }
        rect(left + 4, 5, 1, 1, palette2.doorFrame);
        rect(left + 7, 10, 2, 1, palette2.doorFrame);
        return;
      case "gate": {
        rect(left, 6, 1, TILE3 - 6, palette2.doorFrame);
        rect(left + 11, 6, 1, TILE3 - 6, palette2.doorFrame);
        rect(left + 1, 7, 10, TILE3 - 7, "#6FA84A");
        const span = open2 ? 3 : 10;
        rect(left + 1, 9, span, 1, palette2.door);
        rect(left + 1, 13, span, 1, palette2.door);
        rect(left + span, 9, 1, 5, palette2.door);
        return;
      }
      case "tunnel":
        rect(left - 1, 3, 14, TILE3 - 3, palette2.doorFrame);
        rect(left + 1, 2, 10, 2, palette2.doorFrame);
        rect(left + 1, 5, 10, TILE3 - 5, palette2.door);
        rect(left + 2, 4, 8, 1, palette2.door);
        return;
      case "hatch":
        rect(left, 2, 12, TILE3 - 2, palette2.doorFrame);
        rect(left + 1, 3, 10, TILE3 - 3, open2 ? "#05060C" : palette2.door);
        if (!open2) {
          rect(left + 4, 5, 4, 3, "#1B2340");
          rect(left + 4, 5, 1, 1, "#7FD1FF");
          rect(left + 2, 10, 8, 1, palette2.doorFrame);
        }
        rect(left + 10, 4, 1, 1, Math.floor(Date.now() / 600) % 2 === 0 ? "#FF6B6B" : "#5C2A2A");
        return;
    }
  }
  function eventCodeColor(event) {
    if (event === void 0) {
      return void 0;
    }
    if (event.kind === "error") {
      return event.age < ERROR_FLASH_SECONDS && Math.floor(event.age / ERROR_BEAT_SECONDS) % 2 === 0 ? "#FF5A4F" : void 0;
    }
    if (event.kind === "hack") {
      return event.age < EVENT_SECONDS.hack ? "#3DDC6A" : void 0;
    }
    const beat = DEFENSE_BEATS.filter((start) => event.age >= start).length - 1;
    return event.age >= EVENT_SECONDS.defense ? void 0 : ["#FF5A4F", "#F1C24B", "#F1C24B", "#4FC3F7"][beat];
  }
  function drawDesk(desk, owner, palette2, seconds, index, eventColor, style) {
    const left = desk.desk.x * TILE3;
    const top = desk.desk.y * TILE3;
    rect(left + 3, top, 10, 8, palette2.monitor);
    const typing2 = owner !== void 0 && owner.mode === "type" && owner.path.length === 0;
    const present = owner !== void 0 && !owner.leaving && owner.status !== "asleep";
    rect(left + 4, top + 1, 8, 6, typing2 ? palette2.screenOn : present ? palette2.screenIdle : palette2.screenOff);
    if (typing2) {
      for (let line = 0; line < 3; line++) {
        const scroll = Math.floor(seconds * 4) + line;
        const lineWidth = 2 + Math.floor(noise2(index * 31 + scroll) * 6);
        const indent = Math.floor(noise2(index * 17 + scroll) * 2);
        rect(left + 5 + indent, top + 2 + line * 2, Math.min(lineWidth, 6 - indent), 1, eventColor ?? palette2.code[(scroll + index) % palette2.code.length]);
      }
    } else if (present) {
      const bounce = Math.floor(seconds * 2) % 6;
      rect(left + 5 + bounce, top + 3 + bounce % 2, 1, 1, palette2.code[0]);
    }
    rect(left + 7, top + 8, 2, 1, palette2.monitor);
    const deskTop = style.top ?? palette2.deskTop;
    const deskFront = style.front ?? palette2.deskFront;
    rect(left, top + 9, TILE3, 3, deskTop);
    rect(left + 4, top + 10, 8, 1, palette2.keyboard);
    rect(left, top + 12, TILE3, 4, deskFront);
    rect(left + 1, top + 12, 1, 4, deskTop);
    rect(left + TILE3 - 2, top + 12, 1, 4, deskTop);
    drawDeskDecor(left, top, style, palette2, seconds, index);
  }
  function drawDeskDecor(left, top, style, palette2, seconds, index) {
    const edge = style.edge ?? palette2.deskFront;
    const accent = style.accent ?? palette2.mug;
    switch (style.decor) {
      case "mug":
        if (index % 3 === 1) {
          rect(left + 13, top + 7, 2, 2, palette2.mug);
        }
        return;
      case "planks":
        rect(left, top + 14, TILE3, 1, edge);
        [3, 12].forEach((x) => rect(left + x, top + 12, 1, 1, accent));
        [3, 12].forEach((x) => rect(left + x, top + 15, 1, 1, accent));
        rect(left + 6, top + 12, 1, 1, edge);
        rect(left + 9, top + 15, 1, 1, edge);
        return;
      case "hammer":
        rect(left + 12, top + 9, 1, 3, edge);
        rect(left + 11, top + 8, 3, 1, accent);
        rect(left + 2, top + 12, 3, 2, accent);
        return;
      case "leaves":
        [4, 8, 11].forEach((x) => rect(left + x, top + 12, 1, 4, edge));
        rect(left, top + 8, 2, 1, accent);
        rect(left + 1, top + 7, 1, 1, accent);
        rect(left + TILE3 - 2, top + 8, 2, 1, accent);
        rect(left + 14, top + 13, 1, 1, "#F28FB8");
        return;
      case "candle": {
        rect(left + 1, top + 12, TILE3 - 2, 1, edge);
        rect(left + 13, top + 5, 2, 4, "#EDE6D8");
        const flicker = Math.floor(seconds * 8 + index) % 3;
        rect(left + 13 + (flicker === 2 ? 1 : 0), top + 3, 1, 2, accent);
        rect(left + 13, top + 4, 2, 1, flicker === 0 ? "#FFE48A" : accent);
        return;
      }
      case "glowStrip": {
        rect(left, top + 15, 1, 1, palette2.floor);
        rect(left + TILE3 - 1, top + 15, 1, 1, palette2.floor);
        const pulse = 0.55 + Math.sin(seconds * 2 + index) * 0.3;
        context.globalAlpha = pulse;
        rect(left + 2, top + 13, TILE3 - 4, 1, accent);
        context.globalAlpha = 1;
        return;
      }
      case "led": {
        const lit = Math.floor(seconds * 3 + index) % (TILE3 - 4);
        rect(left + 2, top + 13, TILE3 - 4, 1, edge);
        rect(left + 2 + lit, top + 13, 2, 1, accent);
        return;
      }
      case "shell":
        rect(left + 1, top + 4, 1, 5, accent);
        rect(left, top + 5, 1, 1, accent);
        rect(left + 2, top + 6, 1, 1, accent);
        rect(left + 12, top + 7, 3, 2, "#F7EEDF");
        rect(left + 13, top + 7, 1, 1, edge);
        return;
      case "rune": {
        const glow2 = 0.5 + Math.sin(seconds * 1.5 + index) * 0.4;
        context.globalAlpha = glow2;
        rect(left + 7, top + 12, 2, 1, accent);
        rect(left + 7, top + 13, 1, 2, accent);
        rect(left + 8, top + 14, 1, 1, accent);
        context.globalAlpha = 1;
        rect(left + 3, top + 14, 1, 1, edge);
        rect(left + 12, top + 13, 1, 1, edge);
        return;
      }
      case "coins":
        rect(left + 11, top + 7, 4, 2, accent);
        rect(left + 12, top + 6, 2, 1, accent);
        rect(left + 12, top + 7, 1, 1, "#FFF0A0");
        rect(left + 2, top + 8, 1, 1, accent);
        context.globalAlpha = Math.floor(seconds * 2 + index) % 5 === 0 ? 1 : 0;
        rect(left + 13, top + 6, 1, 1, "#FFFFFF");
        context.globalAlpha = 1;
        return;
      case "yarn":
        rect(left + 12, top + 7, 3, 2, accent);
        rect(left + 13, top + 7, 1, 1, "#FF8A80");
        rect(left + 11, top + 9, 1, 1, accent);
        rect(left + 10, top + 10, 1, 1, accent);
        return;
      case "egg":
        [12, 14].forEach((y) => rect(left + 1, top + y, TILE3 - 2, 1, edge));
        rect(left + 12, top + 6, 2, 3, accent);
        rect(left + 13, top + 7, 1, 1, "#C9BFAE");
        return;
    }
  }
  function drawCarried(box, style, bob, palette2) {
    const left = box.left - 1;
    const top = box.top - HEAD_ROOM - 5 + bob;
    if (style === void 0) {
      rect(left + 4, top + 1, 6, 2, palette2.chair);
      rect(left + 4, top - 2, 1, 3, palette2.chair);
      rect(left + 5, top + 3, 1, 1, "#000");
      rect(left + 8, top + 3, 1, 1, "#000");
      return;
    }
    rect(left, top, 14, 2, style.top ?? palette2.deskTop);
    rect(left, top + 2, 14, 2, style.front ?? palette2.deskFront);
    rect(left + 1, top + 4, 1, 1, style.front ?? palette2.deskFront);
    rect(left + 12, top + 4, 1, 1, style.front ?? palette2.deskFront);
  }
  var TINT_SWEEP_SECONDS = 0.8;
  var tintIndex = 0;
  var tintSweep;
  var tintList;
  new MutationObserver(() => {
    tintList = void 0;
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  function tintColors() {
    if (tintList === void 0) {
      const style = getComputedStyle(document.documentElement);
      const pick3 = (fallback, ...names) => names.map((name) => style.getPropertyValue(name).trim()).find(Boolean) || fallback;
      tintList = [
        pick3("#888", "--vscode-textLink-foreground", "--vscode-focusBorder"),
        pick3("#E0624A", "--vscode-charts-red"),
        pick3("#E08A55", "--vscode-charts-orange"),
        pick3("#F0C24B", "--vscode-charts-yellow"),
        pick3("#5FC27E", "--vscode-charts-green"),
        pick3("#8FD0F5", "--vscode-terminal-ansiBrightCyan"),
        pick3("#4FC3F7", "--vscode-charts-blue", "--vscode-terminal-ansiBrightBlue"),
        pick3("#9A72E0", "--vscode-charts-purple")
      ];
    }
    return tintList;
  }
  function setTint(data) {
    if (!Number.isInteger(data.index)) {
      return;
    }
    const count = tintColors().length;
    const index = (data.index % count + count) % count;
    tintSweep = data.burst === true && !document.hidden && index !== tintIndex ? { from: tintColors()[tintIndex], at: state.time } : void 0;
    tintIndex = index;
  }
  function graphColor(column, width2, seconds) {
    const color = tintColors()[tintIndex];
    if (tintSweep === void 0) {
      return color;
    }
    const progress = (seconds - tintSweep.at) / TINT_SWEEP_SECONDS;
    if (progress >= 1) {
      tintSweep = void 0;
      return color;
    }
    return column < progress * width2 ? color : tintSweep.from;
  }
  function sideScreen(screen) {
    switch (screen) {
      case "code":
      case "idle":
        return "graph";
      case "error":
      case "alert":
        return "log";
      case "matrix":
      case "granted":
        return "matrix";
      case "progress":
        return "radar";
      case "shield":
        return "ok";
    }
  }
  function drawStation(station, reaction, palette2, seconds) {
    const left = station.desk.x * TILE3;
    const top = station.desk.y * TILE3;
    const width2 = TILE3 * STATION_DESKS;
    rect(left + 1, top + 2, 4, 2, palette2.monitor);
    rect(left + 2, top + 4, 1, 5, palette2.monitor);
    context.globalAlpha = 0.25;
    rect(left + 1, top + 9, 6, 2, "#FFE7A0");
    context.globalAlpha = 1;
    rect(left + 5, top - 2, 14, 9, palette2.monitor);
    const glow2 = drawYourScreen(left + 6, top - 1, reaction.screen, reaction.progress, palette2, seconds);
    rect(left + 20, top - 1, 11, 8, palette2.monitor);
    drawYourScreen(left + 21, top, sideScreen(reaction.screen), reaction.progress, palette2, seconds, 9, 6);
    rect(left + 11, top + 7, 2, 2, palette2.monitor);
    rect(left + 25, top + 7, 2, 2, palette2.monitor);
    rect(left, top + 9, width2, 3, palette2.deskTop);
    rect(left + 11, top + 10, 10, 1, palette2.keyboard);
    rect(left + 23, top + 10, 2, 1, palette2.keyboard);
    rect(left, top + 12, width2, 4, palette2.deskFront);
    rect(left + 1, top + 12, 1, 4, palette2.deskTop);
    rect(left + width2 - 2, top + 12, 1, 4, palette2.deskTop);
    rect(left + 3, top + 13, width2 - 6, 1, glow2);
    rect(left + 7, top + 9, 2, 2, palette2.mug);
    rect(left + 8, top + 8, 1, 1, "rgba(255,255,255,0.5)");
  }
  function drawYourScreen(left, top, screen, progress, palette2, seconds, width2 = 12, height2 = 7) {
    context.save();
    context.beginPath();
    context.rect(left, top, width2, height2);
    context.clip();
    const glow2 = paintScreen(left, top, screen, progress, palette2, seconds, width2, height2);
    context.restore();
    return glow2;
  }
  function paintScreen(left, top, screen, progress, palette2, seconds, width2, height2) {
    const blink = Math.floor(seconds / ERROR_BEAT_SECONDS) % 2 === 0;
    const pixels = (rows, color, offsetX, offsetY) => rows.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === "#") {
        rect(left + offsetX + x, top + offsetY + y, 1, 1, color);
      }
    }));
    switch (screen) {
      case "graph": {
        rect(left, top, width2, height2, palette2.screenOn);
        rect(left, top + height2 - 1, width2, 1, palette2.screenIdle);
        const shift = Math.floor(seconds * 3);
        for (let x = 0; x < width2; x++) {
          const value = Math.floor(noise2((shift + x) * 0.37) * (height2 - 2));
          rect(left + x, top + height2 - 2 - value, 1, 1, graphColor(x, width2, seconds));
        }
        return graphColor(width2, width2, seconds);
      }
      case "log":
        rect(left, top, width2, height2, "#1A0505");
        for (let line = 0; line < 3; line++) {
          const scroll = Math.floor(seconds * 8) + line;
          rect(left + 1, top + 1 + line * 2, 1 + Math.floor(noise2(scroll * 5.3) * (width2 - 3)), 1, line === 2 && blink ? "#FFFFFF" : "#FF5A4F");
        }
        return "#FF5A4F";
      case "radar": {
        rect(left, top, width2, height2, "#04140A");
        const centerX = left + Math.floor(width2 / 2);
        const centerY = top + Math.floor(height2 / 2);
        const angle = seconds * 5;
        for (let reach = 1; reach <= 4; reach++) {
          rect(Math.round(centerX + Math.cos(angle) * reach), Math.round(centerY + Math.sin(angle) * reach * 0.8), 1, 1, "#3DDC6A");
        }
        rect(centerX, centerY, 1, 1, "#B6FFC8");
        if (Math.floor(seconds * 3) % 2 === 0) {
          rect(left + 2, top + 1, 1, 1, "#FF5A4F");
          rect(left + width2 - 3, top + height2 - 2, 1, 1, "#FF5A4F");
        }
        return "#3DDC6A";
      }
      case "ok":
        rect(left, top, width2, height2, "#06260F");
        pixels(["....#", "...#.", "#.#..", ".#..."], "#3DDC6A", Math.floor((width2 - 5) / 2), 1);
        return "#3DDC6A";
      case "code":
        rect(left, top, 12, 7, palette2.screenOn);
        for (let line = 0; line < 3; line++) {
          const scroll = Math.floor(seconds * 5) + line;
          const indent = Math.floor(noise2(scroll * 3.1) * 3);
          rect(left + 1 + indent, top + 1 + line * 2, 2 + Math.floor(noise2(scroll * 7.7) * (8 - indent)), 1, palette2.code[scroll % palette2.code.length]);
        }
        return palette2.code[0];
      case "idle": {
        rect(left, top, 12, 7, palette2.screenIdle);
        const bounce = Math.floor(seconds * 2) % 10;
        rect(left + 1 + bounce, top + 3 + bounce % 2, 1, 1, palette2.code[0]);
        return palette2.screenIdle;
      }
      case "error":
        rect(left, top, 12, 7, blink ? "#B3261E" : "#2A0A0A");
        pixels(["#...#", ".#.#.", "..#..", ".#.#.", "#...#"], blink ? "#FFFFFF" : "#FF5A4F", 4, 1);
        return "#FF5A4F";
      case "alert":
        rect(left, top, 12, 7, blink ? "#B3261E" : "#1A0505");
        pixels(["#", "#", "#", ".", "#"], "#FFFFFF", 6, 1);
        rect(left, top, 12, 1, "#FF5A4F");
        rect(left, top + 6, 12, 1, "#FF5A4F");
        return "#FF5A4F";
      case "matrix":
        rect(left, top, 12, 7, "#020A04");
        for (let column = 0; column < 12; column++) {
          const head = Math.floor(seconds * (6 + noise2(column) * 8) + noise2(column * 9) * 7) % 10;
          for (let trail = 0; trail < 4; trail++) {
            const y = head - trail;
            if (y >= 0 && y < 7) {
              rect(left + column, top + y, 1, 1, trail === 0 ? "#B6FFC8" : trail === 1 ? "#3DDC6A" : "#14692E");
            }
          }
        }
        return "#3DDC6A";
      case "granted":
        rect(left, top, 12, 7, "#06260F");
        pixels([".###.", "#####", "#.#.#", "#####", ".#.#."], blink ? "#3DDC6A" : "#B6FFC8", 4, 1);
        return "#3DDC6A";
      case "progress": {
        rect(left, top, 12, 7, "#231A04");
        rect(left + 1, top + 3, 10, 3, "#F1C24B");
        rect(left + 2, top + 4, 8, 1, "#231A04");
        rect(left + 2, top + 4, Math.round(progress / 100 * 8), 1, "#FFE08A");
        rect(left + 1, top + 1, blink ? 6 : 4, 1, "#F1C24B");
        return "#F1C24B";
      }
      case "shield":
        rect(left, top, 12, 7, "#071B2C");
        pixels(["#####", "#####", "#####", ".###.", "..#.."], "#4FC3F7", 4, 1);
        rect(left + 6, top + 2, 1, 2, "#FFFFFF");
        return "#4FC3F7";
    }
  }
  function drawChairBack(seat, palette2, shiftX = 0) {
    const left = seat.x * TILE3 + shiftX;
    const top = seat.y * TILE3;
    rect(left + 3, top + 6, 10, 6, palette2.chair);
    rect(left + 4, top + 7, 8, 1, palette2.chairLight);
    rect(left + 7, top + 12, 2, 3, palette2.chairLeg);
    rect(left + 4, top + 15, 8, 1, palette2.chairLeg);
  }
  function drawProp(prop, palette2, seconds, index) {
    const left = prop.at.x * TILE3;
    const top = prop.at.y * TILE3;
    switch (prop.kind) {
      case "plant":
        rect(left + 4, top + 9, 8, 7, palette2.pot);
        rect(left + 3, top + 9, 10, 2, shadeColor(palette2.pot));
        rect(left + 5, top - 2, 6, 11, "#3E8E41");
        rect(left + 2, top + 1, 4, 5, "#57A85A");
        rect(left + 10, top, 4, 6, "#57A85A");
        rect(left + 6, top - 5, 3, 4, "#6BBF59");
        return;
      case "cooler":
        rect(left + 4, top - 6, 8, 8, "#9ED8F5");
        rect(left + 5, top - 5, 2, 6, "#CFEFFF");
        rect(left + 3, top + 2, 10, 14, "#E8E8EC");
        rect(left + 5, top + 5, 2, 2, "#4E9BE0");
        rect(left + 9, top + 5, 2, 2, "#E0624A");
        rect(left + 4, top + 12, 8, 1, "#B9B9C2");
        return;
      case "coffee":
        rect(left + 1, top + 4, 14, 12, "#5A4636");
        rect(left + 2, top - 2, 12, 7, "#3A2D23");
        rect(left + 5, top + 6, 6, 5, "#1E1612");
        rect(left + 7, top + 9, 2, 2, "#FFFFFF");
        rect(left + 11, top, 2, 1, Math.floor(seconds * 2) % 2 === 0 ? "#E0624A" : "#5C2A20");
        return;
      case "vending":
        rect(left + 1, top - 8, 14, 24, "#C0392B");
        rect(left + 2, top - 7, 9, 18, "#1B2340");
        for (let row = 0; row < 4; row++) {
          for (let column = 0; column < 3; column++) {
            rect(left + 3 + column * 3, top - 6 + row * 4, 2, 2, ["#F1C24B", "#3DDC6A", "#4FC3F7", "#F06595"][(row + column + index) % 4]);
          }
        }
        rect(left + 12, top - 5, 2, 6, "#ECECEC");
        return;
      case "shelf":
        rect(left + 1, top - 8, 14, 24, "#7A5230");
        for (let shelf = 0; shelf < 3; shelf++) {
          const shelfTop = top - 6 + shelf * 7;
          rect(left + 2, shelfTop, 12, 6, "#3B2716");
          for (let book = 0; book < 5; book++) {
            const bookHeight = 3 + Math.floor(noise2(index * 11 + shelf * 5 + book) * 3);
            rect(left + 3 + book * 2, shelfTop + 6 - bookHeight, 2, bookHeight, ["#C0392B", "#2E86AB", "#F3A712", "#4CB944", "#7950F2"][(book + shelf) % 5]);
          }
        }
        return;
      case "rack":
        rect(left + 1, top - 10, 14, 26, "#1C1F26");
        rect(left + 2, top - 9, 12, 24, "#2A2F3A");
        for (let unit = 0; unit < 6; unit++) {
          const unitTop = top - 8 + unit * 4;
          rect(left + 3, unitTop, 10, 3, "#14171D");
          const blink = noise2(index * 13 + unit * 7 + Math.floor(seconds * (2 + unit % 3))) > 0.35;
          rect(left + 4, unitTop + 1, 1, 1, blink ? "#3DDC6A" : "#123018");
          rect(left + 6, unitTop + 1, 1, 1, noise2(index + unit + Math.floor(seconds * 5)) > 0.7 ? "#F1C24B" : "#2A2410");
        }
        return;
      case "couch":
        if (palette2.couchStyle === "towel") {
          for (let x = 1; x < TILE3 * 2 - 1; x++) {
            rect(left + x, top + 5, 1, 9, Math.floor((x - 1) / 3) % 2 === 0 ? palette2.couch : palette2.couchLight);
          }
          rect(left + 1, top + 13, TILE3 * 2 - 2, 1, palette2.shadow);
          return;
        }
        rect(left + 1, top + 4, TILE3 * 2 - 2, 6, palette2.couch);
        if (palette2.couchStyle === "sofa") {
          rect(left + 2, top + 5, TILE3 - 3, 4, palette2.couchLight);
          rect(left + TILE3 + 1, top + 5, TILE3 - 3, 4, palette2.couchLight);
        } else {
          rect(left + 2, top + 4, TILE3 * 2 - 4, 1, palette2.couchLight);
        }
        return;
      case "pine":
        rect(left + 7, top + 9, 2, 7, "#4A3220");
        for (let row = 0; row < 18; row++) {
          const half = 1 + Math.floor(row % 6 * 0.9 + row / 4);
          rect(left + 8 - half, top - 9 + row, half * 2, 1, row % 6 < 2 ? "#3E7A38" : "#2F5A2E");
        }
        return;
      case "campfire": {
        rect(left + 1, top + 13, 3, 2, "#7A7264");
        rect(left + 12, top + 13, 3, 2, "#7A7264");
        rect(left + 3, top + 14, 10, 2, "#8E8574");
        rect(left + 3, top + 11, 10, 2, "#5B3A21");
        glow(left + 8, top + 9, 9, "#FFB347", 0.22 + 0.08 * Math.sin(seconds * 9));
        for (let flame = 0; flame < 4; flame++) {
          const height2 = 3 + Math.floor(noise2(flame * 7 + Math.floor(seconds * 8)) * 5);
          rect(left + 4 + flame * 2, top + 11 - height2, 2, height2, flame % 2 === 0 ? "#F76707" : "#FFD43B");
        }
        for (let row = 0; row < 12; row++) {
          rect(left + 2 + Math.floor(row / 2), top - 1 + row, 1, 1, "#3A2716");
          rect(left + 13 - Math.floor(row / 2), top - 1 + row, 1, 1, "#3A2716");
        }
        rect(left + 8, top, 1, 2, "#3A2716");
        rect(left + 6, top + 2, 5, 4, "#2B2B33");
        rect(left + 7, top + 2, 2, 1, "#55556A");
        return;
      }
      case "stump":
        rect(left + 3, top + 6, 10, 10, "#6B4424");
        rect(left + 3, top + 4, 10, 3, "#C99A5E");
        rect(left + 5, top + 5, 6, 1, "#A47A44");
        rect(left + 4, top + 9, 1, 6, "#4A2E17");
        rect(left + 10, top + 8, 1, 7, "#4A2E17");
        return;
      case "mushroom": {
        const glows = sceneId === "cave";
        const cap = glows ? "#63E6BE" : "#E03131";
        if (glows) {
          glow(left + 8, top + 7, 8, cap, 0.2 + 0.1 * Math.sin(seconds * 2 + index));
        }
        rect(left + 6, top + 8, 4, 8, "#F1EBDD");
        rect(left + 2, top + 4, 12, 5, cap);
        rect(left + 4, top + 2, 8, 2, cap);
        rect(left + 5, top + 4, 2, 2, "#FFFFFF");
        rect(left + 10, top + 5, 2, 1, "#FFFFFF");
        rect(left + 8, top + 3, 1, 1, "#FFFFFF");
        return;
      }
      case "hay":
        rect(left + 1, top + 4, 14, 12, "#D9B44A");
        rect(left + 1, top + 4, 14, 2, "#EED27A");
        rect(left + 1, top + 9, 14, 1, "#B8902E");
        rect(left + 4, top + 4, 1, 12, "#9A6B3E");
        rect(left + 11, top + 4, 1, 12, "#9A6B3E");
        return;
      case "well":
        rect(left + 2, top + 7, 12, 9, "#8E8574");
        rect(left + 2, top + 9, 12, 1, "#7A7264");
        rect(left + 2, top + 12, 12, 1, "#7A7264");
        rect(left + 3, top + 6, 10, 2, "#1B2A3A");
        rect(left + 2, top - 6, 1, 13, "#6E4A27");
        rect(left + 13, top - 6, 1, 13, "#6E4A27");
        rect(left, top - 8, 16, 2, "#B5562F");
        rect(left + 2, top - 9, 12, 1, "#B5562F");
        rect(left + 8, top - 6, 1, 5 + Math.round(Math.sin(seconds) * 1), "#3A2716");
        rect(left + 7, top - 1 + Math.round(Math.sin(seconds)), 3, 3, "#9A6B3E");
        return;
      case "flowers":
        for (let stem = 0; stem < 4; stem++) {
          const sway2 = Math.round(Math.sin(seconds * 1.5 + stem + index) * 0.8);
          const x = left + 2 + stem * 3;
          const height2 = 6 + (stem * 3 + index) % 4;
          rect(x, top + 16 - height2, 1, height2, "#3E7A38");
          rect(x - 1 + sway2, top + 14 - height2, 3, 3, ["#F783AC", "#FFD43B", "#FFFFFF", "#B197FC"][(stem + index) % 4]);
          rect(x + sway2, top + 15 - height2, 1, 1, "#F59F00");
        }
        return;
      case "scarecrow":
        rect(left + 7, top - 2, 2, 18, "#6E4A27");
        rect(left + 1, top + 1, 14, 2, "#6E4A27");
        rect(left + 4, top, 8, 7, "#C0392B");
        rect(left + 4, top + 3, 8, 1, "#8E2A1F");
        rect(left + 1, top + 3, 2, 2, "#EED27A");
        rect(left + 13, top + 3, 2, 2, "#EED27A");
        rect(left + 5, top - 6, 6, 5, "#EED27A");
        rect(left + 6, top - 4, 1, 1, "#2B2B33");
        rect(left + 9, top - 4, 1, 1, "#2B2B33");
        rect(left + 3, top - 7, 10, 1, "#9A6B3E");
        rect(left + 5, top - 9, 6, 2, "#9A6B3E");
        return;
      case "reeds":
        for (let reed = 0; reed < 5; reed++) {
          const sway2 = Math.round(Math.sin(seconds * 1.2 + reed * 0.9 + index) * 1);
          const x = left + 2 + reed * 3;
          const height2 = 12 + (reed * 5 + index) % 7;
          rect(x, top + 16 - height2 + 3, 1, height2 - 3, "#4F7A3A");
          rect(x + sway2, top + 16 - height2, 1, 4, "#6E4A2A");
        }
        return;
      case "spring": {
        rect(left + 1, top + 8, 14, 7, "#8E8574");
        rect(left + 2, top + 9, 12, 5, "#3C8FC4");
        const ring = Math.floor(seconds * 3) % 4;
        rect(left + 8 - ring, top + 11, 1 + ring * 2, 1, "#8FD3F4");
        rect(left + 7, top + 10 - Math.floor(seconds * 4) % 2, 1, 1, "#CFEFFF");
        rect(left + 1, top + 14, 3, 2, "#7A7264");
        rect(left + 11, top + 14, 4, 2, "#7A7264");
        return;
      }
      case "boulder":
        rect(left + 2, top + 6, 12, 10, "#8E8574");
        rect(left + 4, top + 4, 8, 2, "#8E8574");
        rect(left + 4, top + 5, 4, 2, "#B5AD9C");
        rect(left + 2, top + 13, 12, 3, "#6E6A60");
        rect(left + 9, top + 4, 3, 1, "#4F7A3A");
        return;
      case "stalagmite":
        for (let row = 0; row < 20; row++) {
          const half = 1 + Math.floor(row / 3.5);
          rect(left + 8 - half, top - 4 + row, half * 2, 1, row % 5 === 0 ? "#6A625C" : "#7A716A");
          rect(left + 8 - half, top - 4 + row, 1, 1, "#5A524D");
        }
        rect(left + 7, top - 3, 1, 8, "#958B83");
        return;
      case "crystal": {
        const pulse = 0.5 + 0.5 * Math.sin(seconds * 2 + index);
        glow(left + 8, top + 5, 10, "#B197FC", 0.12 + pulse * 0.18);
        rect(left + 6, top - 3, 3, 18, "#9775FA");
        rect(left + 7, top - 5, 1, 2, "#E5DBFF");
        rect(left + 2, top + 5, 3, 10, "#63E6BE");
        rect(left + 3, top + 3, 1, 2, "#C3FAE8");
        rect(left + 10, top + 2, 3, 13, "#B197FC");
        rect(left + 11, top, 1, 2, "#E5DBFF");
        rect(left + 1, top + 14, 14, 2, "#3D3734");
        return;
      }
      case "moonRock":
        rect(left + 2, top + 8, 12, 8, "#8E8E96");
        rect(left + 4, top + 6, 7, 2, "#8E8E96");
        rect(left + 4, top + 7, 3, 2, "#BDBDC4");
        rect(left + 9, top + 11, 3, 2, "#6E6E78");
        return;
      case "oxygen":
        rect(left + 1, top - 6, 14, 22, "#6E6E78");
        for (let tank = 0; tank < 3; tank++) {
          rect(left + 2 + tank * 4, top - 4, 3, 16, "#F1F1F5");
          rect(left + 2 + tank * 4, top + 1, 3, 2, "#F08C00");
        }
        rect(left + 3, top + 13, 10, 2, "#2B2B33");
        rect(left + 4, top + 13, 1 + Math.floor(seconds * 2) % 8, 1, "#3DDC6A");
        return;
      case "dish": {
        const turn = Math.round(Math.sin(seconds * 0.4) * 2);
        rect(left + 7, top + 2, 2, 14, "#B8B8C2");
        rect(left + 4, top + 13, 8, 3, "#8E8E96");
        rect(left + 2 + turn, top - 6, 12, 2, "#E4E4EA");
        rect(left + 3 + turn, top - 4, 10, 2, "#D0D0D8");
        rect(left + 5 + turn, top - 2, 6, 2, "#B8B8C2");
        rect(left + 7 + turn, top - 9, 1, 3, "#8E8E96");
        rect(left + 7 + turn, top - 10, 1, 1, Math.floor(seconds * 1.5) % 2 === 0 ? "#FF6B6B" : "#5C2A2A");
        return;
      }
      case "flag":
        rect(left + 3, top - 8, 1, 24, "#D8D8E0");
        rect(left + 4, top - 8, 10, 1, "#D8D8E0");
        rect(left + 4, top - 7, 10, 7, "#F08C00");
        rect(left + 8, top - 5, 2, 3, "#FFFFFF");
        rect(left + 7, top - 4, 4, 1, "#FFFFFF");
        rect(left + 2, top + 14, 3, 2, "#8E8E96");
        return;
      default:
        drawSceneryProp(kit, prop.kind, left, top, seconds, index);
    }
  }
  function glow(centerX, centerY, radius, color, alpha) {
    context.globalAlpha = alpha / 3;
    for (let step = 3; step >= 1; step--) {
      const r = Math.round(radius * step / 3);
      const inner = Math.round(r * 0.6);
      rect(centerX - r, centerY - inner, r * 2, inner * 2, color);
      rect(centerX - inner, centerY - r, inner * 2, r * 2, color);
    }
    context.globalAlpha = 1;
  }
  function drawCouchBack(prop, palette2) {
    const left = prop.at.x * TILE3;
    const top = prop.at.y * TILE3;
    if (palette2.couchStyle === "towel") {
      return;
    }
    if (palette2.couchStyle !== "sofa") {
      rect(left + 1, top + 9, TILE3 * 2 - 2, 6, shadeColor(palette2.couch));
      rect(left + 1, top + 15, TILE3 * 2 - 2, 1, palette2.shadow);
      if (palette2.couchStyle === "log") {
        for (let x = 5; x < TILE3 * 2 - 4; x += 6) {
          rect(left + x, top + 11, 3, 1, palette2.couch);
        }
        rect(left, top + 5, 3, 10, palette2.couchLight);
        rect(left + 1, top + 8, 1, 3, palette2.couch);
        rect(left + TILE3 * 2 - 3, top + 5, 3, 10, palette2.couchLight);
        rect(left + TILE3 * 2 - 2, top + 8, 1, 3, palette2.couch);
      } else {
        rect(left + 6, top + 11, 4, 1, palette2.couchLight);
        rect(left + 18, top + 12, 3, 1, palette2.couchLight);
      }
      return;
    }
    rect(left, top + 9, TILE3 * 2, 7, shadeColor(palette2.couch));
    rect(left, top + 4, 3, 12, palette2.couch);
    rect(left + TILE3 * 2 - 3, top + 4, 3, 12, palette2.couch);
    rect(left + 3, top + 10, TILE3 * 2 - 6, 1, palette2.couchLight);
  }
  function shadeColor(color) {
    const match = /^#([0-9a-f]{6})$/i.exec(color);
    if (match === null) {
      return color;
    }
    const value = parseInt(match[1], 16);
    return "rgb(" + [value >> 16 & 255, value >> 8 & 255, value & 255].map((channel) => Math.round(channel * 0.75)).join(",") + ")";
  }
  function agentBox(agent, seated) {
    const left = Math.round((agent.x + stationSlide(agent)) * TILE3 + (TILE3 - FRAME_WIDTH) / 2);
    const top = Math.round(agent.y * TILE3 + TILE3 - GUY_HEIGHT - (seated ? SEATED_LIFT : 0));
    return { agent, left, top };
  }
  function stationSlide(agent) {
    if (!agent.you) {
      return 0;
    }
    const distance = Math.hypot(agent.x - agent.workSpot.x, agent.y - agent.workSpot.y);
    return 0.5 * Math.max(0, 1 - distance);
  }
  function drawAgent(agent, seconds) {
    const pose = agentPose(agent, seconds);
    const box = agentBox(agent, pose.seated);
    if (!pose.seated) {
      context.globalAlpha = 0.25;
      rect(box.left + 2, Math.round(agent.y * TILE3) + TILE3 - 2, FRAME_WIDTH - 4, 2, "#000");
      context.globalAlpha = 1;
    }
    const show = state.show;
    const dancing = agent.mode === "watch" && pose.pose !== "cheer" && show !== void 0 && show.phase === "playing" && (PERFORMANCES[show.kind].effect === "notes" || PERFORMANCES[show.kind].effect === "disco") && Math.floor(seconds * 2.5 + agent.x) % 2 === 0;
    const bob = pose.pose === "walk" && pose.frame % 2 === 1 || dancing ? -1 : 0;
    const performer = agent.performer;
    const gearBox = { left: box.left, top: box.top + bob };
    if (performer !== void 0) {
      drawGear(kit, performer.role, gearBox, pose.facing, "behind", show, seconds, agent.mode === "perform");
    }
    context.globalAlpha = agent.leaving && agent.visitor === void 0 && performer === void 0 ? 0.7 : 1;
    context.drawImage(sprite(agent.seed, pose.pose, pose.facing, pose.frame), box.left, box.top + bob - HEAD_ROOM);
    context.globalAlpha = 1;
    if (performer !== void 0) {
      drawGear(kit, performer.role, gearBox, pose.facing, "front", show, seconds, agent.mode === "perform");
    }
    if (pose.pose === "eat" && agent.snack !== void 0) {
      drawSnack(kit, agent.snack, gearBox, pose.facing, pose.frame % 2);
    }
    const crew = agent.crew;
    const settingDown = crew?.phase === "build" && crew.job?.kind === "deliver";
    if (crew !== void 0 && (crew.carrying !== void 0 || crew.chair) && !settingDown) {
      drawCarried(box, crew.carrying === void 0 ? void 0 : deskStyleOf(crew.carrying), bob, SCENE_PALETTES[sceneId]);
    }
    return box;
  }
  var CROWN = ["#..#..#", "##.#.##", "#######", "#######"];
  function drawCrown(box, seconds) {
    const left = box.left + Math.floor((FRAME_WIDTH - 7) / 2);
    const top = box.top - 2 + (Math.floor(seconds * 2) % 2 === 0 ? 0 : -1);
    CROWN.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === "#") {
        rect(left + x - 1, top + y, 1, 1, "#5A3A00");
        rect(left + x + 1, top + y, 1, 1, "#5A3A00");
        rect(left + x, top + y + 1, 1, 1, "#5A3A00");
      }
    }));
    CROWN.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === "#") {
        rect(left + x, top + y, 1, 1, y === 2 ? "#FFE48A" : "#F5B82E");
      }
    }));
    rect(left + 3, top + 3, 1, 1, "#E0413A");
    rect(left + 1, top + 3, 1, 1, "#4FA3F7");
    rect(left + 5, top + 3, 1, 1, "#4FA3F7");
    const glint = Math.floor(seconds / 1.5) % 3;
    if (seconds % 1.5 < 0.25) {
      rect(left + glint * 3, top - 1, 1, 1, "#FFFFFF");
    }
  }
  function drawYou(station, reaction) {
    const left = Math.round(station.seat.x * TILE3 + TILE3 / 2 + (TILE3 - FRAME_WIDTH) / 2);
    const top = Math.round(station.seat.y * TILE3 + TILE3 - GUY_HEIGHT - (reaction.seated ? SEATED_LIFT : 0) - reaction.hop);
    if (!reaction.seated) {
      context.globalAlpha = 0.25;
      rect(left + 2, station.seat.y * TILE3 + TILE3 - 2, FRAME_WIDTH - 4, 2, "#000");
      context.globalAlpha = 1;
    }
    if (youKey !== void 0) {
      context.drawImage(sprite(youKey, reaction.pose, reaction.facing, reaction.frame), left, top - HEAD_ROOM);
    }
    return { left, top };
  }
  var BUBBLE_WRAP = 96;
  var bubbleLookSetting = "soft";
  function layoutBubble(box, text, bubbleTop = box.top - 11, hovered = false) {
    const { font, fill } = bubbleStyle(bubbleLookSetting, hovered);
    context.font = `${font}px monospace`;
    const lines = wrapText(text, Math.min(BUBBLE_WRAP, state.layout.cols * TILE3 - 8));
    const textWidth = Math.max(...lines.map((line) => Math.ceil(context.measureText(line).width)));
    const width2 = textWidth + 6;
    const height2 = font + 2 + (lines.length - 1) * font;
    const left = Math.max(1, Math.min(state.layout.cols * TILE3 - width2 - 1, Math.round(box.left + FRAME_WIDTH / 2 - width2 / 2)));
    return { lines, left, top: bubbleTop + 9 - height2, width: width2, height: height2, tailX: box.left + FRAME_WIDTH / 2 - 1, tailY: bubbleTop + 9, font, fill };
  }
  function spreadBubbles(bubbles) {
    const placed = [];
    for (const bubble of [...bubbles].sort((first, second) => second.tailY - first.tailY)) {
      for (let tries = 0; tries < 8; tries++) {
        const hit = placed.find(
          (other) => bubble.left < other.left + other.width + 1 && other.left < bubble.left + bubble.width + 1 && bubble.top < other.top + other.height + 1 && other.top < bubble.top + bubble.height + 1
        );
        if (hit === void 0 || hit.top - bubble.height - 1 < 1) {
          break;
        }
        bubble.top = hit.top - bubble.height - 1;
      }
      placed.push(bubble);
    }
  }
  function paintBubbleStem(bubble, palette2) {
    context.globalAlpha = bubble.alpha ?? 1;
    const stem = bubble.tailY - (bubble.top + bubble.height);
    if (stem > 0) {
      rect(Math.round(bubble.tailX), bubble.top + bubble.height, 1, stem, palette2.bubbleEdge);
    }
    context.globalAlpha = 1;
  }
  function paintBubble(bubble, palette2) {
    const { lines, left, top, width: width2, height: height2 } = bubble;
    context.globalAlpha = bubble.alpha ?? 1;
    const base2 = bubble.alpha ?? 1;
    context.globalAlpha = base2 * Math.min(1, bubble.fill + 0.25);
    rect(left, top, width2, 1, palette2.bubbleEdge);
    rect(left, top + height2 - 1, width2, 1, palette2.bubbleEdge);
    rect(left, top + 1, 1, height2 - 2, palette2.bubbleEdge);
    rect(left + width2 - 1, top + 1, 1, height2 - 2, palette2.bubbleEdge);
    rect(bubble.tailX, bubble.tailY, 2, 1, palette2.bubbleEdge);
    context.globalAlpha = base2 * bubble.fill;
    rect(left + 1, top + 1, width2 - 2, height2 - 2, palette2.bubble);
    context.globalAlpha = base2;
    context.font = `${bubble.font}px monospace`;
    context.fillStyle = palette2.bubbleText;
    context.textBaseline = "top";
    lines.forEach((line, index) => context.fillText(line, left + 3, top + 1.5 + index * bubble.font));
    context.globalAlpha = 1;
  }
  function wrapText(text, maxWidth) {
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      const next = line === "" ? word : `${line} ${word}`;
      if (line !== "" && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
    return lines;
  }
  var bubbleSince = /* @__PURE__ */ new WeakMap();
  var loggedBubbles = /* @__PURE__ */ new WeakSet();
  var shownLines = /* @__PURE__ */ new Set();
  var chatLog = [];
  function spokenLine(id, seed, bubble, priority, box, bubbleTop) {
    let since = bubbleSince.get(bubble);
    if (since === void 0) {
      since = state.time;
      bubbleSince.set(bubble, since);
    }
    return { id, seed, key: bubble, text: bubble.text, since, until: bubble.until, priority, box, bubbleTop };
  }
  function logRoomLines() {
    return Math.floor((Math.max(0, originY) - 22) / LOG_LINE);
  }
  function drawChatter(lines, palette2, seconds) {
    const logOn = showsChatLog(chatterSetting, logRoomLines() >= 2);
    const logged = new Set(lines.filter((line) => loggedBubbles.has(line.key)).map((line) => line.id));
    const chat = layoutChatter(lines, chatterSetting, shownLines, bubbleLimit(state.layout.cols), state.time, hoveredId, logged);
    shownLines = chat.full;
    if (logOn) {
      lines.filter((line) => line.priority !== "must" && !loggedBubbles.has(line.key) && (chatterSetting === "log" || chat.pips.has(line.id))).forEach((line) => {
        loggedBubbles.add(line.key);
        chatLog = pushChatLog(chatLog, { id: line.seed, text: line.text, at: state.time });
      });
    }
    lines.filter((line) => chat.pips.has(line.id)).forEach((line) => paintPip(line, palette2, seconds));
    const bubbles = lines.filter((line) => chat.full.has(line.id)).map((line) => ({
      ...layoutBubble(line.box, line.text, line.bubbleTop, line.id === hoveredId),
      alpha: line.id === hoveredId ? 1 : bubbleAlpha(line.since, line.until, state.time)
    }));
    spreadBubbles(bubbles);
    bubbles.forEach((bubble) => paintBubbleStem(bubble, palette2));
    bubbles.forEach((bubble) => paintBubble(bubble, palette2));
  }
  function paintPip(line, palette2, seconds) {
    const left = Math.round(line.box.left + FRAME_WIDTH / 2 - 4);
    const top = line.bubbleTop + 4;
    const alpha = bubbleAlpha(line.since, line.until, state.time) * 0.8;
    context.globalAlpha = alpha;
    rect(left, top, 9, 5, palette2.bubbleEdge);
    rect(left + 1, top + 1, 7, 3, palette2.bubble);
    rect(left + 3, top + 5, 2, 1, palette2.bubbleEdge);
    const lit = Math.floor((seconds + line.since) * 3) % 3;
    for (let dot = 0; dot < 3; dot++) {
      context.globalAlpha = alpha * (dot === lit ? 1 : 0.4);
      rect(left + 2 + dot * 2, top + 2, 1, 1, palette2.bubbleText);
    }
    context.globalAlpha = 1;
  }
  var logStyle = { font: "11px monospace", text: "#ccc", background: "#1e1e1e", stamp: -1 };
  function drawChatLog(seconds) {
    const above = logRoomLines();
    if (!showsChatLog(chatterSetting, above >= 2)) {
      return;
    }
    if (seconds - logStyle.stamp > 2 || logStyle.stamp < 0) {
      const css = getComputedStyle(document.body);
      const family = css.getPropertyValue("--vscode-editor-font-family").trim() || "monospace";
      logStyle = {
        font: `11px ${family}`,
        text: css.getPropertyValue("--vscode-foreground").trim() || "#ccc",
        background: css.getPropertyValue("--vscode-sideBar-background").trim() || "#1e1e1e",
        stamp: seconds
      };
    }
    const roomTop = Math.max(0, originY);
    const overlay = above < 2;
    const visible = visibleChatLog(chatLog, state.time, overlay ? LOG_LINES : Math.min(5, above));
    if (visible.length === 0) {
      return;
    }
    const pixelRatio = window.devicePixelRatio || 1;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.imageSmoothingEnabled = false;
    const bottom = overlay ? 20 + visible.length * LOG_LINE + 4 : roomTop - 4;
    if (overlay) {
      context.globalAlpha = 0.78 * Math.max(...visible.map((line) => line.alpha));
      context.fillStyle = logStyle.background;
      context.fillRect(0, 18, width, bottom - 18);
    }
    context.font = logStyle.font;
    context.textBaseline = "middle";
    const textLeft = 8 + 20;
    visible.forEach(({ entry, alpha }, index) => {
      const middle = bottom - (visible.length - index) * LOG_LINE + LOG_LINE / 2;
      context.globalAlpha = alpha;
      context.drawImage(sprite(entry.id, "stand", "down", 0), 0, 0, FRAME_WIDTH, 11, 8, middle - 8, 18, 16.5);
      context.fillStyle = logStyle.text;
      context.fillText(fitText(entry.text, width - textLeft - 8), textLeft, middle + 0.5);
    });
    context.globalAlpha = 1;
  }
  function fitText(text, maxWidth) {
    if (context.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 1 && context.measureText(cut + "\u2026").width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return cut.trimEnd() + "\u2026";
  }
  function drawSnore(box, seconds, palette2) {
    const offset = box.agent.id.length * 0.73 % 3;
    context.textBaseline = "alphabetic";
    for (let index = 0; index < 3; index++) {
      const age = (seconds + offset + index) % 3;
      const rise = age / 3;
      context.globalAlpha = Math.sin(rise * Math.PI);
      context.font = `${5 + index}px monospace`;
      context.fillStyle = palette2.snore;
      context.fillText("z", box.left + 8 + rise * 6 + Math.sin(age * 3) * 1.5, box.top + 6 - rise * 12);
    }
    context.globalAlpha = 1;
  }
  function drawNameTag(box, palette2) {
    const text = box.agent.title.length > 28 ? box.agent.title.slice(0, 27) + "\u2026" : box.agent.title;
    context.font = "7px monospace";
    const textWidth = Math.ceil(context.measureText(text).width);
    const tagLeft = Math.max(1, Math.min(state.layout.cols * TILE3 - textWidth - 5, Math.round(box.left + FRAME_WIDTH / 2 - textWidth / 2 - 2)));
    const tagTop = box.top + GUY_HEIGHT + 1;
    rect(tagLeft, tagTop, textWidth + 4, 9, palette2.bubbleEdge);
    context.fillStyle = palette2.bubble;
    context.textBaseline = "top";
    context.fillText(text, tagLeft + 2, tagTop + 1.5);
  }
  function drawEventTint(event, layout) {
    if (event === void 0) {
      return;
    }
    let color;
    let alpha = 0;
    if (event.kind === "error" && event.age < ERROR_FLASH_SECONDS) {
      color = "#FF2A1F";
      alpha = Math.floor(event.age / ERROR_BEAT_SECONDS) % 2 === 0 ? 0.16 : 0.06;
    } else if (event.kind === "hack" && event.age < EVENT_SECONDS.hack) {
      color = "#3DDC6A";
      alpha = 0.08 * Math.min(1, event.age / 0.6, (EVENT_SECONDS.hack - event.age) / 0.6);
    } else if (event.kind === "defense" && event.age < EVENT_SECONDS.defense) {
      const beat = DEFENSE_BEATS.filter((start) => event.age >= start).length - 1;
      const beatAge = event.age - DEFENSE_BEATS[beat];
      color = ["#FF2A1F", "#F1C24B", "#F1C24B", "#4FC3F7"][beat];
      alpha = beat === 0 ? 0.06 + 0.08 * (0.5 + 0.5 * Math.sin(event.age * 14)) : beat === 3 ? 0.3 * Math.max(0, 1 - beatAge / 0.6) : 0.05;
    }
    if (color === void 0 || alpha <= 0) {
      return;
    }
    context.globalAlpha = alpha;
    rect(0, 0, layout.cols * TILE3, layout.rows * TILE3, color);
    context.globalAlpha = 1;
  }
  var boxes = [];
  var youArea;
  function draw(seconds) {
    const pixelRatio = window.devicePixelRatio || 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    const event = currentEvent();
    const station = state.layout.station;
    const you = youAgent(state);
    const atStation = you !== void 0 && isAtStation(you);
    const deskReaction = yourReaction(event, seconds);
    const reaction = atStation || event !== void 0 ? deskReaction : { ...deskReaction, screen: "idle", shake: 0 };
    const shake = reaction.shake * (Math.floor(seconds * 30) % 2 === 0 ? 1 : -1) * scale;
    context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, pixelRatio * (originX + shake), pixelRatio * originY);
    context.imageSmoothingEnabled = false;
    const palette2 = SCENE_PALETTES[sceneId];
    const layout = state.layout;
    const eventColor = eventCodeColor(event);
    light = sceneLight(sceneId, currentSky());
    drawFloor(layout, palette2);
    drawWall(layout, palette2, seconds);
    const owners = /* @__PURE__ */ new Map();
    state.agents.forEach((agent) => {
      if (agent.deskIndex !== void 0) {
        owners.set(agent.deskIndex, agent);
      }
    });
    const layers = [];
    state.placed.forEach((seed, index) => {
      const desk = layout.desks[index];
      if (desk === void 0) {
        return;
      }
      const style = deskStyleOf(seed);
      layers.push({ depth: desk.desk.y + 0.4, paint: () => drawDesk(desk, owners.get(index), palette2, seconds, index, eventColor, style) });
      layers.push({ depth: desk.seat.y + 0.7, paint: () => drawChairBack(desk.seat, palette2) });
    });
    for (const member of state.agents) {
      const job = member.crew?.job;
      const desk = job === void 0 ? void 0 : layout.desks[job.deskIndex];
      if (member.crew?.phase === "build" && job?.kind === "deliver" && desk !== void 0) {
        const style = deskStyleOf(job.seed);
        layers.push({ depth: desk.desk.y + 0.4, paint: () => drawDesk(desk, void 0, palette2, seconds, job.deskIndex, eventColor, style) });
      }
    }
    layout.props.forEach((prop, index) => {
      layers.push({ depth: prop.at.y + (prop.kind === "couch" ? 0.3 : 0.8), paint: () => drawProp(prop, palette2, seconds, index) });
      if (prop.kind === "couch") {
        layers.push({ depth: prop.at.y + 0.7, paint: () => drawCouchBack(prop, palette2) });
      }
    });
    let youBox;
    if (station !== void 0 && you !== void 0) {
      layers.push({ depth: station.desk.y + 0.4, paint: () => drawStation(station, reaction, palette2, seconds) });
      layers.push({ depth: station.seat.y + 0.7, paint: () => drawChairBack(station.seat, palette2, TILE3 / 2) });
      if (atStation) {
        layers.push({ depth: station.seat.y + 0.5, paint: () => {
          youBox = drawYou(station, reaction);
        } });
      }
    }
    const nextBoxes = [];
    state.agents.forEach((agent) => {
      if (agent.you && atStation) {
        return;
      }
      layers.push({ depth: agent.y + 0.5, paint: () => nextBoxes.push(drawAgent(agent, seconds)) });
    });
    const show = state.show;
    if (show !== void 0) {
      const roles = PERFORMANCES[show.kind].roles.slice(0, show.spots.length);
      show.spots.forEach((spot, index) => {
        const role = roles[index];
        if (role !== void 0) {
          layers.push({ depth: spot.y + 0.55, paint: () => drawSetPiece(kit, role, spot, show, seconds) });
        }
      });
      if (show.food.length > 0 && show.phase !== "arriving") {
        state.placed.forEach((_, index) => {
          const owner = owners.get(index);
          const desk = layout.desks[index];
          if (owner !== void 0 && owner.status === "working" && desk !== void 0) {
            layers.push({ depth: desk.desk.y + 0.45, paint: () => drawDeskPlate(kit, show.food[index % show.food.length], desk.desk.x, desk.desk.y) });
          }
        });
      }
    }
    const run = critterRun;
    if (run !== void 0) {
      layers.push({ depth: run.row + 0.6, paint: () => drawCritters(run, palette2, seconds) });
    }
    const overhead = flight;
    if (overhead !== void 0) {
      layers.push({ depth: -1, paint: () => drawFlightShadows(overhead, palette2, seconds) });
    }
    layers.sort((first, second) => first.depth - second.depth).forEach((layer) => layer.paint());
    boxes = nextBoxes;
    if (overhead !== void 0) {
      drawFlight(overhead, seconds, false);
    }
    drawWeather(kit, sceneId, layout.cols * TILE3, layout.rows * TILE3, seconds);
    drawLighting(layout, owners, atStation || event !== void 0, seconds);
    drawAfterLight(kit, sceneId, layout.cols * TILE3, light);
    drawShowLights(seconds);
    if (overhead !== void 0) {
      drawFlight(overhead, seconds, true);
    }
    drawFireflies(layout.cols * TILE3, seconds);
    const lines = [];
    boxes.forEach((box) => {
      if (box.agent.mode === "sleep" && box.agent.path.length === 0 && box.agent.bubble === void 0) {
        drawSnore(box, seconds, palette2);
      }
      const crowned = box.agent.id === focusedId;
      if (crowned) {
        drawCrown(box, seconds);
      }
      const bubble = box.agent.bubble;
      if (bubble !== void 0) {
        const priority = box.agent.performer !== void 0 ? "must" : box.agent.visitor !== void 0 || hostLines.has(bubble) ? "high" : "normal";
        lines.push(spokenLine(box.agent.id, box.agent.seed, bubble, priority, box, box.top - (crowned ? 14 : 11)));
      }
    });
    youArea = youBox;
    const finalYouBox = youBox;
    if (finalYouBox !== void 0 && youKey !== void 0) {
      const monitorsTop = station === void 0 ? finalYouBox.top : station.desk.y * TILE3 - 2;
      const bubbleTop = Math.min(finalYouBox.top, monitorsTop) - 11;
      if (reaction.bubble !== void 0) {
        lines.push({ id: "you", seed: youKey, key: {}, text: reaction.bubble, since: -Infinity, until: Infinity, priority: "must", box: finalYouBox, bubbleTop });
      } else if (you?.bubble !== void 0) {
        lines.push(spokenLine("you", youKey, you.bubble, "high", finalYouBox, bubbleTop));
      }
    }
    drawChatter(lines, palette2, seconds);
    drawEventTint(event, layout);
    const hovered = boxes.find((box) => box.agent.id === hoveredId);
    if (hovered !== void 0) {
      drawNameTag(hovered, palette2);
    }
    const counts = officeCounts(state);
    const countText = [`${counts.working} working`, `${counts.idle} idle`, ...counts.asleep > 0 ? [`${counts.asleep} asleep`] : []];
    statusLabel.textContent = state.agents.length === 0 ? "quiet" : countText.join(" \xB7 ");
    drawChatLog(seconds);
  }
  function drawShowLights(seconds) {
    const show = state.show;
    const roomWidth = state.layout.cols * TILE3;
    const roomHeight = state.layout.rows * TILE3;
    if (show !== void 0) {
      const level = showLightLevel(show, seconds);
      const effect = PERFORMANCES[show.kind].effect;
      if (effect === "spotlight") {
        drawSpotlight(kit, show, roomWidth, roomHeight, level);
      } else if (effect === "disco") {
        drawDisco(kit, show, roomWidth, roomHeight, seconds, level);
      }
    }
    const performers = [];
    for (const id of show?.performerIds ?? []) {
      const box = boxes.find((candidate) => candidate.agent.id === id);
      const performer = box?.agent.performer;
      if (box !== void 0 && performer !== void 0) {
        performers.push({ role: performer.role, box, performing: box.agent.mode === "perform" });
      }
    }
    showEffects.step(show, performers, roomWidth, seconds, random);
    showEffects.draw(kit, seconds);
  }
  function drawLighting(layout, owners, stationOn, seconds) {
    if (light.darkness < 0.01) {
      return;
    }
    const roomWidth = layout.cols * TILE3;
    const roomHeight = layout.rows * TILE3;
    lightMap ??= document.createElement("canvas");
    if (lightMap.width !== roomWidth || lightMap.height !== roomHeight) {
      lightMap.width = roomWidth;
      lightMap.height = roomHeight;
    }
    const map = lightMap.getContext("2d");
    map.globalCompositeOperation = "source-over";
    map.fillStyle = light.ambient;
    map.fillRect(0, 0, roomWidth, roomHeight);
    map.fillStyle = "#FFFFFF";
    paintOpenSky(map, layout);
    map.globalCompositeOperation = "lighter";
    const strength = Math.min(1, light.darkness / 0.6);
    const pool = (x, y, radius, color, alpha) => {
      const gradient = map.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, rgba(color, alpha * strength));
      gradient.addColorStop(1, rgba(color, 0));
      map.fillStyle = gradient;
      map.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };
    layout.desks.forEach((desk, index) => {
      if (!state.placed.has(index)) {
        return;
      }
      const owner = owners.get(index);
      const typing2 = owner !== void 0 && owner.mode === "type" && owner.path.length === 0;
      const present = owner !== void 0 && !owner.leaving && owner.status !== "asleep";
      if (typing2 || present) {
        pool(desk.desk.x * TILE3 + 8, desk.desk.y * TILE3 + 5, typing2 ? 15 : 10, "#8CC8FF", typing2 ? 0.42 : 0.22);
      }
    });
    const station = layout.station;
    if (station !== void 0) {
      const left = station.desk.x * TILE3;
      const top = station.desk.y * TILE3;
      pool(left + 3, top + 8, 14, "#FFD98A", 0.5);
      if (stationOn) {
        pool(left + 16, top + 3, 22, "#9AD0FF", 0.45);
      }
    }
    layout.props.forEach((prop, index) => {
      const left = prop.at.x * TILE3;
      const top = prop.at.y * TILE3;
      switch (prop.kind) {
        case "campfire":
          pool(left + 8, top + 9, 38 + Math.sin(seconds * 9) * 2 + noise2(Math.floor(seconds * 6) + index) * 3, "#FFB060", 0.85);
          return;
        case "vending":
          pool(left + 6, top, 14, "#A8C0FF", 0.4);
          return;
        case "cooler":
          pool(left + 8, top - 2, 10, "#9ED8F5", 0.35);
          return;
        case "coffee":
          pool(left + 8, top + 8, 9, "#FFB070", 0.3);
          return;
        case "oxygen":
        case "dish":
          pool(left + 8, top, 10, "#FF8A80", 0.25);
          return;
        default: {
          const glowing = propLight(prop.kind);
          if (glowing !== void 0) {
            pool(left + glowing.dx, top + glowing.dy, glowing.radius, glowing.color, glowing.alpha);
          }
        }
      }
    });
    if (layout.door !== void 0 && palette().doorStyle === "hatch") {
      pool(layout.door.x * TILE3 + 8, 8, 14, "#9AD0FF", 0.4);
    }
    const show = state.show;
    const stageLevel = showLightLevel(show, seconds);
    if (show !== void 0 && stageLevel > 0 && PERFORMANCES[show.kind].effect !== "spotlight") {
      const spots = show.spots;
      const middleX = (Math.min(...spots.map((spot) => spot.x)) + Math.max(...spots.map((spot) => spot.x))) / 2;
      pool(middleX * TILE3 + 8, show.stage.y * TILE3 + 6, 26 + spots.length * 6, "#FFE2B0", 0.75 * stageLevel);
    }
    map.globalCompositeOperation = "source-over";
    context.save();
    context.globalCompositeOperation = "multiply";
    context.drawImage(lightMap, 0, 0);
    context.restore();
  }
  function palette() {
    return SCENE_PALETTES[sceneId];
  }
  function paintOpenSky(map, layout) {
    const roomWidth = layout.cols * TILE3;
    const backdrop = palette().backdrop;
    if (backdropHasSky(backdrop)) {
      for (let x = 0; x < roomWidth; x++) {
        map.fillRect(x, 0, 1, skyBottom(backdrop, x));
      }
      return;
    }
    switch (backdrop) {
      case "windows":
        for (let x = 3; x < layout.cols - 1; x += 5) {
          map.fillRect(x * TILE3 + 2, 3, 12, 8);
        }
        return;
      case "bookcases":
        for (let x = 3; x * TILE3 < roomWidth - TILE3; x += LIBRARY_WINDOW_EVERY) {
          map.fillRect(x * TILE3 + 2, 2, 12, 10);
        }
        return;
      case "sky":
        for (let x = 0; x < roomWidth; x += 2) {
          map.fillRect(x, 0, 2, hillTop(x));
        }
        return;
      case "space":
        for (let x = 0; x < roomWidth; x += 3) {
          map.fillRect(x, 0, 3, ridgeTop(x));
        }
        return;
    }
  }
  function rgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${value >> 16 & 255},${value >> 8 & 255},${value & 255},${Math.max(0, Math.min(1, alpha))})`;
  }
  function stepCritters() {
    const now = state.time;
    if (critterRun !== void 0 && (critterRunDone(critterRun, now) || !crittersOn)) {
      critterRun = void 0;
      nextCritterAt = now + critterGap(random);
    }
    if (critterRun === void 0) {
      if (crittersOn && now >= nextCritterAt && width > 0) {
        critterRun = planCritterRun(state.layout, sceneId, now, random, TILE3);
        critterWatchers = /* @__PURE__ */ new Set();
        if (critterRun === void 0) {
          nextCritterAt = now + critterGap(random);
        }
      }
      return;
    }
    for (const pose of critterPoses(critterRun, now)) {
      const at = { x: pose.x / TILE3 - 0.5, y: pose.y / TILE3 - 0.9 };
      reactToCritter(state, at, critterLines(pose.kind), critterWatchers, random).forEach((id) => critterWatchers.add(id));
    }
  }
  function drawCritters(run, palette2, seconds) {
    const layout = state.layout;
    context.save();
    context.beginPath();
    context.rect(0, 0, layout.cols * TILE3, layout.rows * TILE3);
    context.clip();
    const flies = run.row >= layout.rows;
    critterPoses(run, seconds).forEach((pose) => drawCritter(rect, pose, run.groundY, flies ? void 0 : palette2.shadow));
    context.restore();
  }
  function fliersNight() {
    return OUTDOOR_SCENES.has(sceneId) ? light.stars > 0.3 : void 0;
  }
  function stepFliers() {
    const now = state.time;
    if (flight !== void 0 && (flightDone(flight, now) || !fliersOn)) {
      flight = void 0;
      nextFlightAt = now + flierGap(random);
    }
    if (flight === void 0) {
      if (fliersOn && now >= nextFlightAt && width > 0) {
        flight = planFlight(state.layout, sceneId, now, random, TILE3, fliersNight());
        flightWatchers = /* @__PURE__ */ new Set();
        if (flight === void 0) {
          nextFlightAt = now + flierGap(random);
        }
      }
      return;
    }
    for (const pose of flierPoses(flight, now)) {
      const at = { x: pose.x / TILE3 - 0.5, y: pose.y / TILE3 + 1 };
      reactToCritter(state, at, flierLines(pose.kind), flightWatchers, random).forEach((id) => flightWatchers.add(id));
    }
  }
  function clipToRoom() {
    context.save();
    context.beginPath();
    context.rect(0, 0, state.layout.cols * TILE3, state.layout.rows * TILE3);
    context.clip();
  }
  function drawFlightShadows(current, palette2, seconds) {
    clipToRoom();
    for (const pose of flierPoses(current, seconds)) {
      if (FLIERS[pose.kind].shadow === true) {
        drawFlierShadow(rect, context, pose, current.shadowY, palette2.shadow);
      }
    }
    context.restore();
  }
  function drawFlight(current, seconds, glowing) {
    clipToRoom();
    const poses = flierPoses(current, seconds);
    poses.forEach((pose, index) => {
      const spec = FLIERS[pose.kind];
      if (spec.glow === true !== glowing) {
        return;
      }
      if (spec.trail !== void 0) {
        const points2 = [];
        for (let step = 1; step <= 10; step++) {
          const back = flierPoses(current, seconds - step * 0.035)[index];
          points2.push({ x: back.x - back.facing * (spec.width / 2 - 1), y: back.y + Math.sin(seconds * 20 + step) * 0.6 });
        }
        drawFlierTrail(rect, context, points2, spec.trail);
      }
      drawFlier(rect, context, pose);
    });
    context.restore();
  }
  var showOn;
  function noticeShowEnd() {
    const now = state.show?.kind;
    if (showOn !== void 0 && now !== showOn) {
      vscode.postMessage({ type: "showEnd", kind: showOn });
    }
    showOn = now;
  }
  function sayLine(data) {
    if (typeof data.text !== "string" || data.text.trim() === "") {
      return;
    }
    const agent = state.agents.find((candidate) => data.id === "you" ? candidate.you : candidate.id === data.id);
    if (agent === void 0) {
      return;
    }
    const seconds = typeof data.seconds === "number" && Number.isFinite(data.seconds) ? Math.min(20, Math.max(1, data.seconds)) : 3;
    agent.bubble = { text: data.text.trim().slice(0, 80), until: state.time + seconds };
    hostLines.add(agent.bubble);
  }
  var hostLines = /* @__PURE__ */ new WeakSet();
  var frameHandle = 0;
  var lastTime;
  function loop(now) {
    frameHandle = requestAnimationFrame(loop);
    const seconds = now / 1e3;
    if (lastTime !== void 0) {
      stepOffice(state, seconds - lastTime, random);
      stepVisitors();
      stepShows();
      playRoomReactions();
      stepCritters();
      stepFliers();
      noticeShowEnd();
    }
    lastTime = seconds;
    if (width > 0 && height > 0) {
      draw(state.time);
    }
  }
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frameHandle);
    lastTime = void 0;
    if (!document.hidden) {
      frameHandle = requestAnimationFrame(loop);
    }
  });
  frameHandle = requestAnimationFrame(loop);
  function agentAt(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    const roomX = (clientX - bounds.left - originX) / scale;
    const roomY = (clientY - bounds.top - originY) / scale;
    return [...boxes].reverse().find(
      (box) => roomX >= box.left && roomX < box.left + FRAME_WIDTH && roomY >= box.top && roomY < box.top + GUY_HEIGHT
    )?.agent;
  }
  function isOverYou(clientX, clientY) {
    if (youArea === void 0) {
      return false;
    }
    const bounds = canvas.getBoundingClientRect();
    const roomX = (clientX - bounds.left - originX) / scale;
    const roomY = (clientY - bounds.top - originY) / scale;
    return roomX >= youArea.left && roomX < youArea.left + FRAME_WIDTH && roomY >= youArea.top && roomY < youArea.top + GUY_HEIGHT;
  }
  canvas.addEventListener("mousemove", (event) => {
    const hit = agentAt(event.clientX, event.clientY);
    const agent = hit?.you ? void 0 : hit;
    hoveredId = agent?.id;
    youHovered = hit?.you === true || agent === void 0 && isOverYou(event.clientX, event.clientY);
    canvas.style.cursor = agent === void 0 || agent.visitor !== void 0 || agent.crew !== void 0 || agent.performer !== void 0 ? "default" : "pointer";
    if (youHovered) {
      tooltip.hidden = false;
      tooltip.textContent = sceneEvent !== void 0 ? `you \xB7 ${sceneEvent.kind}!` : hit?.you ? "you \xB7 on break" : "you \xB7 on watch";
      return;
    }
    if (agent === void 0) {
      tooltip.hidden = true;
      return;
    }
    tooltip.hidden = false;
    if (agent.visitor !== void 0) {
      tooltip.textContent = `${agent.title} \xB7 visiting`;
      return;
    }
    if (agent.performer !== void 0) {
      tooltip.textContent = `${agent.title} \xB7 ${agent.performer.role === "cart" ? "serving" : "performing"}`;
      return;
    }
    if (agent.crew !== void 0) {
      tooltip.textContent = `${agent.title} \xB7 ${agent.crew.carrying !== void 0 ? "carrying a desk" : agent.crew.phase === "build" ? "on a desk" : "on the job"}`;
      return;
    }
    tooltip.textContent = `${agent.title}${agent.id === focusedId ? " \xB7 selected" : ""} \xB7 ${agent.status === "asleep" ? "suspended" : agent.status}`;
  });
  canvas.addEventListener("mouseleave", () => {
    hoveredId = void 0;
    youHovered = false;
    tooltip.hidden = true;
  });
  canvas.addEventListener("click", (event) => {
    const agent = agentAt(event.clientX, event.clientY);
    if (agent !== void 0 && !agent.you && agent.visitor === void 0 && agent.crew === void 0 && agent.performer === void 0) {
      vscode.postMessage({ type: "click", id: agent.id });
    } else if (agent?.you === true) {
      vscode.postMessage({ type: "click", id: "you" });
    }
  });
  vscode.postMessage({ type: "ready" });
})();
//# sourceMappingURL=officeView.js.map
