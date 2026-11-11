// The group gatherings, drawn: yoga mats under everyone, the fire marshal's demo bin and extinguisher, the card table,
// the birthday cake, the all-hands screen on the back wall, the mic stand, the campfire, the boombox, the room's
// light while it's on (calm, disco, spotlight, firelight), and dust off the desks as they slide. All in room pixels.

import type { Facing } from "../pixelGuy";
import { GATHERINGS } from "../officeGatherings";
import type { Agent, GatheringState } from "../officeSim";
import type { Kit } from "./scenery";
import { DrawnArea, drawDisco, drawSpotlight, GuyBox } from "./shows";

const TILE = 16;
const FRAME = 12;

// How far into it the lights are: up over a second and a half once it starts, and down as it closes.
export function gatherLightLevel(gathering: GatheringState | undefined, now: number): number {
  if (gathering === undefined) {
    return 0;
  }
  if (gathering.phase === "on") {
    return Math.max(0, Math.min(1, (now - (gathering.endsAt - gathering.length)) / 1.5));
  }
  if (gathering.phase === "closing") {
    return Math.max(0, Math.min(1, (gathering.phaseEndsAt - now) / 4));
  }
  return 0;
}

const MAT_COLORS = ["#4FB3A9", "#9B6BD1", "#E37BA8", "#4F8FE0", "#E0A13B", "#5DBB46"];

// What lies on the floor under everyone: the yoga mats.
export function drawGatheringFloor(kit: Kit, gathering: GatheringState): void {
  if (GATHERINGS[gathering.kind].prop !== "mats" || gathering.phase === "call") {
    return;
  }
  const spots = [...gathering.spots.values(), ...(gathering.front === undefined ? [] : [gathering.front])];
  spots.forEach((spot, index) => {
    const color = MAT_COLORS[(spot.x * 7 + spot.y * 3 + index) % MAT_COLORS.length];
    const left = spot.x * TILE + 1;
    const top = spot.y * TILE + 9;
    kit.rect(left, top, TILE - 2, 6, color);
    kit.rect(left, top, TILE - 2, 1, "#FFFFFF33");
    kit.rect(left, top + 5, TILE - 2, 1, "#00000033");
  });
}

// The prop that stands in the room, with the depth to sort it among the guys.
export function gatheringPieces(gathering: GatheringState): { depth: number; paint: (kit: Kit, now: number) => void }[] {
  if (gathering.phase === "call") {
    return [];
  }
  const spec = GATHERINGS[gathering.kind];
  const pieces: { depth: number; paint: (kit: Kit, now: number) => void }[] = [];
  const at = gathering.propAt;
  switch (spec.prop) {
    case "fireDemo":
      if (at !== undefined) {
        pieces.push({ depth: at.y + 0.6, paint: (kit, now) => drawFireBin(kit, at.x, at.y, gathering, now) });
      }
      break;
    case "cardTable":
      if (at !== undefined) {
        pieces.push({ depth: at.y + 0.6, paint: (kit, now) => drawCardTable(kit, at.x, at.y, gathering, now) });
      }
      break;
    case "cake":
      if (at !== undefined) {
        pieces.push({ depth: at.y + 0.6, paint: (kit, now) => drawCake(kit, at.x, at.y, gathering, now) });
      }
      break;
    case "campfire":
      if (at !== undefined) {
        pieces.push({ depth: at.y + 0.4, paint: (kit, now) => drawCampfire(kit, at.x, at.y, now) });
      }
      break;
    case "boombox":
      if (at !== undefined) {
        pieces.push({ depth: at.y + 0.6, paint: (kit, now) => drawBoombox(kit, at.x, at.y, now) });
      }
      break;
    case "screen": {
      const front = gathering.front;
      if (front !== undefined) {
        // On the back wall, behind everyone.
        pieces.push({ depth: -0.5, paint: (kit, now) => drawScreen(kit, front.x, gathering, now) });
      }
      break;
    }
    case "mic": {
      // Beside the quiz master, or in the middle for the singer.
      const spot = spec.turns === "sing" ? gathering.center : gathering.front;
      if (spot !== undefined) {
        const offset = spec.turns === "sing" ? 0 : 11;
        pieces.push({ depth: spot.y + 0.6, paint: (kit) => drawMicStand(kit, spot.x * TILE + 3 + offset, spot.y * TILE) });
      }
      break;
    }
    default:
      break;
  }
  return pieces;
}

// The room's light while it's on, over the light map so it shows at night too.
export function drawGatheringLights(kit: Kit, gathering: GatheringState | undefined, area: DrawnArea, now: number): void {
  const level = gatherLightLevel(gathering, now);
  if (gathering === undefined || level <= 0) {
    return;
  }
  const spec = GATHERINGS[gathering.kind];
  const stage = spec.formation === "rows" ? gathering.front ?? gathering.center : gathering.center;
  const context = kit.context;
  switch (spec.effect) {
    case "spotlight":
      drawSpotlight(kit, { stage }, area, level * 0.8);
      break;
    case "disco":
      drawDisco(kit, { stage: gathering.center }, area, now, level);
      break;
    case "calm":
      // A soft, warm wash.
      context.globalAlpha = 0.12 * level;
      kit.rect(area.left, 0, area.width, area.height, "#FFD9A8");
      context.globalAlpha = 1;
      break;
    case "flicker": {
      // The room goes dim and the fire lights the faces around it.
      context.globalAlpha = 0.35 * level;
      kit.rect(area.left, 0, area.width, area.height, "#0A0612");
      context.globalAlpha = 1;
      const flicker = 0.8 + Math.sin(now * 11) * 0.1 + Math.sin(now * 17.3) * 0.08;
      kit.glow(gathering.center.x * TILE + TILE / 2, gathering.center.y * TILE + 10, 44 * flicker, "#FF9A3C", 0.32 * level);
      break;
    }
    default:
      break;
  }
}

// The fire marshal's extinguisher, in his hands (and its spray while he's dousing the bin).
export function drawHostGear(kit: Kit, agent: Agent, gathering: GatheringState | undefined, box: GuyBox, facing: Facing, now: number): void {
  if (gathering === undefined || agent.id !== gathering.hostId || gathering.kind !== "fireSafety" || facing === "up") {
    return;
  }
  const mirror = facing === "left";
  const x = (offset: number, width: number) => (mirror ? box.left + FRAME - offset - width : box.left + offset);
  kit.rect(x(8, 3), box.top + 9, 3, 6, "#D0302A");
  kit.rect(x(8, 3), box.top + 9, 3, 1, "#2A2A2A");
  kit.rect(x(9, 1), box.top + 7, 1, 2, "#2A2A2A");
  const douse = gathering.acts.douse;
  const target = gathering.propAt;
  if (douse !== undefined && now < douse + 3.5 && target !== undefined) {
    // Foam from the nozzle to the bin.
    const fromX = x(10, 1);
    const fromY = box.top + 8;
    const toX = target.x * TILE + 8;
    const toY = target.y * TILE + 6;
    for (let index = 0; index < 10; index++) {
      const along = ((now * 2.5 + index / 10) % 1);
      const px = Math.round(fromX + (toX - fromX) * along + Math.sin(index * 5 + now * 9) * 1.5);
      const py = Math.round(fromY + (toY - fromY) * along - Math.sin(along * Math.PI) * 4);
      kit.rect(px, py, 2, 2, index % 3 === 0 ? "#DDE6EE" : "#FFFFFF");
    }
  }
}

// Little puffs of dust off a desk as it slides, at the end it's leaving from.
export function drawSlideDust(kit: Kit, deskX: number, deskY: number, dx: number, now: number): void {
  const left = dx > 0 ? deskX * TILE - 3 : deskX * TILE + TILE;
  for (let index = 0; index < 3; index++) {
    const rise = (now * 3 + index * 0.33) % 1;
    kit.context.globalAlpha = 0.5 * (1 - rise);
    kit.rect(Math.round(left + index), Math.round(deskY * TILE + 30 - rise * 5 - index), 2, 2, "#C9C2B4");
  }
  kit.context.globalAlpha = 1;
}

function flames(kit: Kit, centerX: number, baseY: number, now: number, size: number): void {
  for (let column = -size; column <= size; column++) {
    const height = Math.max(1, Math.round((size + 1 - Math.abs(column)) * 2 + Math.sin(now * 13 + column * 2.1) * 1.5));
    kit.rect(centerX + column, baseY - height, 1, height, "#E8572A");
    if (height > 2) {
      kit.rect(centerX + column, baseY - height + 2, 1, height - 2, "#F5A623");
    }
    if (height > 4 && Math.abs(column) < size) {
      kit.rect(centerX + column, baseY - height + 4, 1, height - 4, "#FFE07A");
    }
  }
}

function drawFireBin(kit: Kit, tileX: number, tileY: number, gathering: GatheringState, now: number): void {
  const left = tileX * TILE + 4;
  const top = tileY * TILE + 7;
  kit.rect(left, top, 8, 8, "#7D8590");
  kit.rect(left, top, 8, 1, "#A9B0BA");
  kit.rect(left + 2, top + 2, 1, 5, "#656C75");
  kit.rect(left + 5, top + 2, 1, 5, "#656C75");
  const lit = gathering.acts.light;
  const doused = gathering.acts.douse;
  if (lit !== undefined && (doused === undefined || now < doused + 1.2)) {
    flames(kit, left + 4, top, now, 3);
  }
  if (doused !== undefined && now >= doused + 0.6) {
    // A heap of foam, and a wisp of smoke.
    kit.rect(left - 1, top - 2, 10, 3, "#F4F7FA");
    kit.rect(left + 1, top - 4, 6, 2, "#FFFFFF");
    const wisp = (now - doused) % 2;
    kit.context.globalAlpha = Math.max(0, 0.5 - wisp * 0.25);
    kit.rect(left + 3 + Math.round(Math.sin(now * 3) * 2), top - 7 - Math.round(wisp * 6), 3, 2, "#9A9A9A");
    kit.context.globalAlpha = 1;
  }
}

function drawCardTable(kit: Kit, tileX: number, tileY: number, gathering: GatheringState, now: number): void {
  const left = tileX * TILE;
  const top = tileY * TILE + 6;
  kit.rect(left + 1, top + 4, 1, 6, "#5A3A22");
  kit.rect(left + TILE - 2, top + 4, 1, 6, "#5A3A22");
  kit.rect(left, top, TILE, 4, "#2E6B3F");
  kit.rect(left, top + 4, TILE, 1, "#1E4A2B");
  // Cards laid down on each side.
  const card = (x: number, y: number, color: string) => {
    kit.rect(x, y, 3, 4, "#F4F4F4");
    kit.rect(x + 1, y + 1, 1, 2, color);
  };
  card(left + 2, top - 1, "#C0392B");
  card(left + 11, top - 1, "#2E86DE");
  card(left + 6, top, "#8E44AD");
  const played = gathering.acts.play;
  if (played !== undefined && now < played + 1.2) {
    // The card just played rises and glows.
    const rise = Math.round((now - played) * 8);
    kit.context.globalAlpha = Math.max(0, 1 - (now - played) / 1.2);
    kit.rect(left + 6, top - 4 - rise, 4, 5, "#FFF6D0");
    kit.rect(left + 7, top - 3 - rise, 2, 3, "#F5C542");
    kit.glow(left + 8, top - 2 - rise, 9, "#F5C542", 0.4);
    kit.context.globalAlpha = 1;
  }
}

function drawCake(kit: Kit, tileX: number, tileY: number, gathering: GatheringState, now: number): void {
  const left = tileX * TILE + 2;
  const top = tileY * TILE + 7;
  // A little table under it.
  kit.rect(left - 1, top + 6, 14, 2, "#E9E2D0");
  kit.rect(left, top + 8, 1, 4, "#B8AE96");
  kit.rect(left + 11, top + 8, 1, 4, "#B8AE96");
  const served = gathering.acts.serve !== undefined;
  const width = served ? 7 : 10;
  kit.rect(left + 1, top + 1, width, 5, "#F7A8C4");
  kit.rect(left + 1, top, width, 2, "#FFFFFF");
  kit.rect(left + 1, top + 3, width, 1, "#E8C88A");
  if (served) {
    return;
  }
  const blown = gathering.acts.blow;
  [3, 6, 9].forEach((x, index) => {
    kit.rect(left + x - 1, top - 3, 1, 3, ["#4FA3F7", "#F5C542", "#5DBB46"][index]);
    if (blown === undefined || now < blown + 0.3) {
      kit.rect(left + x - 1, top - 5 + (Math.floor(now * 8 + index) % 2), 1, 2, "#FFB13B");
    } else if (now < blown + 2.5) {
      kit.context.globalAlpha = Math.max(0, 0.6 - (now - blown) * 0.25);
      kit.rect(left + x - 1 + Math.round(Math.sin(now * 4 + index)), top - 6 - Math.round((now - blown) * 3), 1, 2, "#B0B0B0");
      kit.context.globalAlpha = 1;
    }
  });
}

function drawCampfire(kit: Kit, tileX: number, tileY: number, now: number): void {
  const centerX = tileX * TILE + 8;
  const baseY = tileY * TILE + 13;
  // Stones round it, two logs crossed.
  for (const [dx, dy] of [[-6, 0], [-4, 2], [0, 3], [4, 2], [6, 0], [-4, -2], [4, -2]]) {
    kit.rect(centerX + dx - 1, baseY + dy - 1, 2, 2, "#8A8A8A");
  }
  kit.rect(centerX - 5, baseY - 1, 10, 2, "#6B4423");
  kit.rect(centerX - 2, baseY - 2, 4, 4, "#5A3A1C");
  flames(kit, centerX, baseY - 1, now, 3);
  // Sparks.
  for (let index = 0; index < 3; index++) {
    const rise = (now * 0.8 + index * 0.37) % 1;
    kit.context.globalAlpha = 1 - rise;
    kit.rect(centerX + Math.round(Math.sin(now * 2 + index * 4) * 4), baseY - 8 - Math.round(rise * 14), 1, 1, "#FFD27A");
  }
  kit.context.globalAlpha = 1;
}

function drawBoombox(kit: Kit, tileX: number, tileY: number, now: number): void {
  const left = tileX * TILE + 2;
  const top = tileY * TILE + 8;
  const beat = Math.floor(now * 4) % 2;
  kit.rect(left + 3, top - 2, 6, 1, "#2A2A2A");
  kit.rect(left, top, 12, 7, "#3A3A44");
  kit.rect(left, top, 12, 1, "#5A5A66");
  kit.rect(left + 1, top + 2, 4 + beat, 4 + beat, "#15151A");
  kit.rect(left + 7 - beat, top + 2, 4 + beat, 4 + beat, "#15151A");
  kit.rect(left + 2, top + 3, 2, 2, "#8A8A96");
  kit.rect(left + 8, top + 3, 2, 2, "#8A8A96");
  // Notes float up off it.
  for (let index = 0; index < 2; index++) {
    const rise = (now * 0.7 + index * 0.5) % 1;
    const x = left + 4 + index * 5 + Math.round(Math.sin(now * 3 + index) * 2);
    const y = top - 4 - Math.round(rise * 14);
    kit.context.globalAlpha = 1 - rise;
    kit.rect(x, y, 2, 2, index === 0 ? "#F06595" : "#7CFFB2");
    kit.rect(x + 1, y - 4, 1, 4, index === 0 ? "#F06595" : "#7CFFB2");
  }
  kit.context.globalAlpha = 1;
}

function drawMicStand(kit: Kit, x: number, tileTop: number): void {
  kit.rect(x - 2, tileTop + 15, 5, 1, "#2A2A2A");
  kit.rect(x, tileTop + 4, 1, 11, "#4A4A52");
  kit.rect(x - 1, tileTop + 2, 3, 3, "#1E1E22");
  kit.rect(x, tileTop + 2, 1, 1, "#8A8A96");
}

// The projector screen on the back wall over the CEO, with a chart that shoots up when he says so.
function drawScreen(kit: Kit, tileX: number, gathering: GatheringState, now: number): void {
  const width = 22;
  const left = tileX * TILE + 8 - width / 2;
  const top = 1;
  kit.rect(left - 1, top - 1, width + 2, 1, "#3A3A44");
  kit.rect(left, top, width, 13, "#F2F2F2");
  kit.rect(left, top + 13, width, 1, "#C8C8C8");
  const charted = gathering.acts.chart;
  const growth = charted === undefined ? 0 : Math.min(1, (now - charted) / 1.2);
  const bars = [3, 4, 3, 5, 9];
  bars.forEach((bar, index) => {
    const height = Math.max(1, Math.round(index === bars.length - 1 ? 2 + (bar - 2) * growth : bar));
    kit.rect(left + 3 + index * 4, top + 11 - height, 3, height, index === bars.length - 1 && growth > 0 ? "#2EB872" : "#4F8FE0");
  });
  if (growth >= 1) {
    // An arrow up and to the right.
    kit.rect(left + 18, top + 2, 2, 1, "#2EB872");
    kit.rect(left + 19, top + 3, 1, 1, "#2EB872");
  }
}
