// The Office's invasions, drawn: the room's tint, the banner, the aliens' beams and zaps, the vampires' smoke and
// bats, the words that pop off a hit, stars over a guy who's down, the mess on the floor, the invaders' gear (a
// vampire's cape, an alien's ray gun, a raider's club and his loot), and the broom the guys sweep up with.
// All in room pixels. A guy's box is the top-left of his 12-wide frame at the top of his head; a point (x, y) of his
// pixel grid is at (box.left + x + 1, box.top + y + 1).

import type { Facing, PixelGuyLook } from "../pixelGuy";
import { lookWithRace, mixHex } from "../pixelGuy";
import { DebrisKind, INVASIONS, InvasionKindId, WARNING_SECONDS } from "../officeInvasions";
import type { Agent, Debris, InvasionState, LookVariant } from "../officeSim";
import type { Kit } from "./scenery";

const TILE = 16;
const FRAME = 12;

export interface GuyBox {
  left: number;
  top: number;
}

type Paint = (x: number, y: number, w: number, h: number, color: string) => void;

// Draws in the guy's own frame, mirrored for left so each piece is drawn once, facing right.
function painter(kit: Kit, box: GuyBox, mirror: boolean): Paint {
  return (x, y, w, h, color) => kit.rect(mirror ? box.left + FRAME - x - w : box.left + x, box.top + y, w, h, color);
}

// A turned guy's look: the zombie race, his own clothes. A bitten one's: his skin gone pale.
export function variantLook(look: PixelGuyLook, variant: LookVariant): PixelGuyLook {
  if (variant === "zombie") {
    return lookWithRace(look, "zombie");
  }
  return { ...look, skin: mixHex(look.skin, "#F2EEF8", 0.65) };
}

// ----- The room -----

// How strong the invasion's tint is now: it flickers on at the warning, holds through the attack, and fades as they go.
function tintLevel(invasion: InvasionState, time: number): number {
  const age = time - invasion.phaseStartedAt;
  switch (invasion.phase) {
    case "warning":
      return Math.min(1, age / WARNING_SECONDS) * (Math.floor(time * 9) % 3 === 0 ? 0.3 : 1);
    case "attack":
      return Math.floor(time * 5) % 9 === 0 ? 0.7 : 1;
    case "retreat":
      return Math.max(0, 1 - age / 3);
    default:
      return 0;
  }
}

export function drawInvasionTint(kit: Kit, invasion: InvasionState | undefined, width: number, height: number, time: number): void {
  if (invasion === undefined) {
    return;
  }
  const { context } = kit;
  const level = tintLevel(invasion, time);
  if (level > 0) {
    if (invasion.kind === "vampires") {
      // The room goes dark.
      context.globalAlpha = 0.3 * level;
      kit.rect(0, 0, width, height, "#0A0614");
    }
    context.globalAlpha = 0.16 * level;
    kit.rect(0, 0, width, height, INVASIONS[invasion.kind].tint);
    context.globalAlpha = 1;
  }
  if (invasion.kind === "vampires" && invasion.phase === "retreat") {
    // Sunrise sends them packing.
    const age = time - invasion.phaseStartedAt;
    context.globalAlpha = 0.45 * Math.max(0, 1 - age / 1.6);
    kit.rect(0, 0, width, height, "#FFD27A");
    context.globalAlpha = 1;
  }
}

// The invasion's name across the top as it starts, blinking through the warning.
export function drawInvasionBanner(kit: Kit, invasion: InvasionState | undefined, width: number, time: number): void {
  if (invasion === undefined) {
    return;
  }
  const age = time - invasion.startedAt;
  if (age > WARNING_SECONDS + 2.5 || (age < WARNING_SECONDS && Math.floor(age * 4) % 2 === 1)) {
    return;
  }
  const { context } = kit;
  const text = INVASIONS[invasion.kind].banner;
  context.font = "bold 9px monospace";
  const textWidth = context.measureText(text).width;
  const top = 3;
  context.globalAlpha = 0.6;
  kit.rect(Math.floor((width - textWidth) / 2) - 6, top, Math.ceil(textWidth) + 12, 12, "#120A0A");
  context.globalAlpha = 1;
  // Hazard stripes either side.
  for (let index = 0; index < 4; index++) {
    const color = index % 2 === 0 ? "#F5C542" : "#1A1A1A";
    kit.rect(Math.floor((width - textWidth) / 2) - 6 + index, top, 1, 12, color);
    kit.rect(Math.floor((width + textWidth) / 2) + 2 + index, top, 1, 12, color);
  }
  context.textBaseline = "top";
  context.fillStyle = Math.floor(time * 6) % 2 === 0 ? "#FF4B3B" : "#FFE14A";
  context.fillText(text, Math.round((width - textWidth) / 2), top + 2);
}

// ----- Effects -----

// The beams, zaps, smoke, bats, and words in the air. boxOf finds a guy's box this frame.
export function drawInvasionEffects(kit: Kit, invasion: InvasionState | undefined, agents: readonly Agent[], boxOf: (agent: Agent) => GuyBox | undefined, time: number): void {
  if (invasion === undefined) {
    return;
  }
  const { context } = kit;
  // Guys up in a beam.
  for (const agent of agents) {
    if (agent.mode === "float") {
      drawBeam(kit, agent.x * TILE + TILE / 2, agent.y * TILE + TILE - 1, time, 0.3);
    }
  }
  for (const puff of invasion.puffs) {
    const age = time - puff.at;
    const x = puff.x * TILE + TILE / 2;
    const y = puff.y * TILE + TILE - 2;
    if (INVASIONS[invasion.kind].entry === "beam") {
      if (age < 1.3) {
        drawBeam(kit, x, y, time, 0.65 * Math.sin((Math.PI * age) / 1.3));
      }
    } else if (invasion.kind === "vampires") {
      drawSmoke(kit, x, y - 6, age);
      if (puff.exit) {
        drawBats(kit, x, y - 8, age, puff.x + puff.y);
      }
    }
  }
  for (const zap of invasion.zaps) {
    const from = agents.find((agent) => agent.id === zap.fromId);
    const to = agents.find((agent) => agent.id === zap.toId);
    const fromBox = from === undefined ? undefined : boxOf(from);
    const toBox = to === undefined ? undefined : boxOf(to);
    if (from !== undefined && fromBox !== undefined && toBox !== undefined) {
      drawZap(kit, fromBox, from.facing, toBox, time);
    }
  }
  context.textBaseline = "middle";
  for (const hit of invasion.hits) {
    drawWord(kit, hit.word, hit.x * TILE + TILE / 2, hit.y * TILE - 2, time - hit.at, invasion.kind);
  }
}

function drawBeam(kit: Kit, x: number, floorY: number, time: number, alpha: number): void {
  if (alpha <= 0) {
    return;
  }
  const { context } = kit;
  context.globalAlpha = alpha * 0.55;
  kit.rect(x - 6, 0, 12, floorY, "#9DFFB0");
  context.globalAlpha = alpha;
  kit.rect(x - 7, 0, 1, floorY, "#E8FFE8");
  kit.rect(x + 6, 0, 1, floorY, "#E8FFE8");
  // Rings rising up it.
  for (let ring = 0; ring < 3; ring++) {
    const y = floorY - (((time * 22 + ring * (floorY / 3)) % floorY) || 0);
    kit.rect(x - 5, Math.round(y), 10, 1, "#FFFFFF");
  }
  context.globalAlpha = 1;
  kit.glow(x, floorY, 10, "#9DFFB0", alpha * 0.5);
}

function drawSmoke(kit: Kit, x: number, y: number, age: number): void {
  if (age > 1.2) {
    return;
  }
  const { context } = kit;
  const spread = 3 + age * 9;
  context.globalAlpha = Math.max(0, 0.8 * (1 - age / 1.2));
  for (let index = 0; index < 6; index++) {
    const angle = index * 1.05 + age;
    const size = Math.max(2, Math.round(5 - age * 3));
    kit.rect(Math.round(x + Math.cos(angle) * spread - size / 2), Math.round(y + Math.sin(angle) * spread * 0.6 - size / 2), size, size, index % 2 === 0 ? "#6B4A8A" : "#3A2A4A");
  }
  context.globalAlpha = 1;
}

// A vampire off as bats: a few, flapping up and away.
function drawBats(kit: Kit, x: number, y: number, age: number, seed: number): void {
  if (age > 2.8) {
    return;
  }
  for (let index = 0; index < 3; index++) {
    const direction = index === 1 ? 0.3 : index === 0 ? -1 : 1;
    const batX = Math.round(x + direction * age * (26 + index * 6) + Math.sin(age * 9 + index + seed) * 2);
    const batY = Math.round(y - age * (22 + index * 5));
    const up = Math.floor(age * 12 + index) % 2 === 0;
    kit.rect(batX - 1, batY, 3, 2, "#1A1420");
    kit.rect(batX - 3, batY + (up ? -1 : 1), 2, 1, "#1A1420");
    kit.rect(batX + 2, batY + (up ? -1 : 1), 2, 1, "#1A1420");
    kit.rect(batX, batY, 1, 1, "#E04050");
  }
}

function drawZap(kit: Kit, from: GuyBox, facing: Facing, to: GuyBox, time: number): void {
  const { context } = kit;
  const startX = from.left + (facing === "left" ? 0 : facing === "right" ? FRAME : FRAME / 2);
  const startY = from.top + 8;
  const endX = to.left + FRAME / 2;
  const endY = to.top + 7;
  context.strokeStyle = Math.floor(time * 20) % 2 === 0 ? "#B4FF5A" : "#F0FFE0";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(startX, startY);
  for (let step = 1; step < 4; step++) {
    const t = step / 4;
    context.lineTo(startX + (endX - startX) * t + Math.sin(time * 40 + step) * 1.5, startY + (endY - startY) * t + Math.cos(time * 37 + step) * 2);
  }
  context.lineTo(endX, endY);
  context.stroke();
  kit.glow(endX, endY, 7, "#B4FF5A", 0.6);
  kit.glow(startX, startY, 4, "#B4FF5A", 0.5);
}

// A comic word off a hit: pops in big, then drifts up and fades.
function drawWord(kit: Kit, word: string, x: number, y: number, age: number, kind: InvasionKindId): void {
  if (age < 0 || age > 1.4) {
    return;
  }
  const { context } = kit;
  const size = age < 0.12 ? 10 : 8;
  context.font = `bold ${size}px monospace`;
  const width = context.measureText(word).width;
  const left = Math.round(x - width / 2);
  const top = Math.round(y - age * 10);
  context.globalAlpha = age > 0.9 ? Math.max(0, 1 - (age - 0.9) / 0.5) : 1;
  context.fillStyle = "#1A1A1A";
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    context.fillText(word, left + dx, top + dy);
  }
  context.fillStyle = kind === "aliens" ? "#B4FF5A" : kind === "vampires" ? "#FF6B8A" : "#FFE14A";
  context.fillText(word, left, top);
  context.globalAlpha = 1;
}

// Stars going round over a downed guy's head.
export function drawDizzy(kit: Kit, headX: number, headY: number, time: number): void {
  for (let index = 0; index < 3; index++) {
    const angle = time * 4 + index * 2.1;
    const x = Math.round(headX + Math.cos(angle) * 5);
    const y = Math.round(headY - 4 + Math.sin(angle) * 1.5);
    const color = index === 1 ? "#FFFFFF" : "#FFE14A";
    kit.rect(x, y, 1, 1, color);
    if (Math.floor(time * 6 + index) % 2 === 0) {
      kit.rect(x - 1, y, 3, 1, color);
      kit.rect(x, y - 1, 1, 3, color);
    }
  }
}

// Dust coming off a guy as he brushes himself down.
export function drawDust(kit: Kit, box: GuyBox, time: number): void {
  const { context } = kit;
  context.globalAlpha = 0.6;
  for (let index = 0; index < 4; index++) {
    const age = (time * 1.6 + index * 0.25) % 1;
    const x = box.left + 2 + ((index * 5 + Math.floor(time)) % 9);
    kit.rect(x, Math.round(box.top + 14 - age * 6), 1, 1, "#C9C2B0");
  }
  context.globalAlpha = 1;
}

// ----- The mess -----

const DEBRIS_ART: Record<DebrisKind, { rows: string[]; colors: Record<string, string> }> = {
  papers: { rows: ["ww...", "wgw.w", ".wwwg", "...ww"], colors: { w: "#F4F1E8", g: "#B9B3A3" } },
  mug: { rows: ["..cc..", "cccccc", "w.cc.r", ".w..r."], colors: { c: "#6B4226", w: "#F2EEE6", r: "#C0392B" } },
  goo: { rows: [".gggg.", "gglggg", ".ggg.g"], colors: { g: "#6EDC5A", l: "#C6F7AA" } },
  scorch: { rows: ["..kk..", ".kddk.", "kkdkkk", ".kkk.."], colors: { k: "#2A2622", d: "#4A3A30" } },
  cans: { rows: ["rr.", "rr.", "..s", ".ss"], colors: { r: "#C0392B", s: "#B8B8B8" } },
  cobweb: { rows: ["w.w.w", ".www.", "wwwww", ".www.", "w.w.w"], colors: { w: "#E8E8F0" } },
  plant: { rows: ["..gg.", ".ggg.", "g.g..", "bbsss"], colors: { g: "#4CB944", b: "#B5651D", s: "#5A3A22" } },
};

export function drawDebris(kit: Kit, piece: Debris): void {
  const art = DEBRIS_ART[piece.kind];
  const width = art.rows[0].length;
  const left = Math.round(piece.x * TILE + TILE / 2 + piece.ox - width / 2);
  const top = Math.round(piece.y * TILE + 10 + piece.oy);
  const { context } = kit;
  if (piece.kind === "scorch" || piece.kind === "cobweb") {
    context.globalAlpha = 0.7;
  }
  art.rows.forEach((row, y) => [...row].forEach((cell, x) => {
    const color = art.colors[cell];
    if (color !== undefined) {
      kit.rect(left + x, top + y, 1, 1, color);
    }
  }));
  context.globalAlpha = 1;
}

// ----- Gear -----

// What an invader carries, behind or in front of him: a vampire's cape (in front when his back is to you), an
// alien's ray gun, a raider's club when he swings it, and the loot he runs off with.
export function drawInvaderGear(kit: Kit, agent: Agent, box: GuyBox, facing: Facing, frame: number, layer: "behind" | "front"): void {
  const kind = agent.invader?.kind;
  if (kind === undefined) {
    return;
  }
  const side = facing === "left" || facing === "right";
  const paint = painter(kit, box, facing === "left");
  if (kind === "vampires") {
    const cape = "#141018";
    const lining = "#8E1B2B";
    const moving = agent.path.length > 0;
    if (facing === "up" && layer === "front") {
      paint(2, 7, 8, 9, cape);
      paint(1, 6, 1, 3, lining);
      paint(10, 6, 1, 3, lining);
    } else if (facing !== "up" && layer === "behind") {
      if (side) {
        // Trailing out behind him.
        paint(moving ? 0 : 1, 7, moving ? 4 : 3, moving ? 8 : 9, cape);
        paint(moving ? 0 : 1, 14, moving ? 3 : 2, 1, lining);
      } else {
        paint(1, 7, 10, 9, cape);
        paint(1, 5, 1, 3, lining);
        paint(10, 5, 1, 3, lining);
      }
    }
    return;
  }
  if (layer !== "front") {
    return;
  }
  if (kind === "aliens") {
    if (side) {
      paint(9, 7, 3, 2, "#8A9BA8");
      paint(12, 7, 1, 1, "#7CFF6B");
    } else if (facing === "down") {
      paint(7, 9, 2, 2, "#8A9BA8");
      paint(7, 10, 1, 1, "#7CFF6B");
    }
    return;
  }
  if (kind === "raiders") {
    if (agent.invader?.loot === true && agent.path.length > 0) {
      drawLoot(kit, box, agent.id);
      return;
    }
    if (agent.mode === "attack") {
      const wood = "#8B5A2B";
      const swung = frame % 2 === 0;
      if (side) {
        if (swung) {
          paint(9, 7, 5, 2, wood);
        } else {
          paint(7, 1, 2, 6, wood);
        }
      } else {
        paint(swung ? 2 : 8, 0, 2, 6, wood);
      }
    }
  }
}

// A raider's loot over his head: a monitor, the coffee pot, or a potted plant.
function drawLoot(kit: Kit, box: GuyBox, id: string): void {
  const which = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  const left = box.left + 2;
  const top = box.top - 6;
  if (which === 0) {
    kit.rect(left, top, 8, 6, "#2E2E36");
    kit.rect(left + 1, top + 1, 6, 4, "#7FB8D8");
    kit.rect(left + 3, top + 6, 2, 1, "#2E2E36");
  } else if (which === 1) {
    kit.rect(left + 2, top, 4, 1, "#2E2E36");
    kit.rect(left + 1, top + 1, 6, 5, "#D8E2E8");
    kit.rect(left + 2, top + 3, 4, 3, "#6B4226");
    kit.rect(left + 7, top + 2, 1, 3, "#2E2E36");
  } else {
    kit.rect(left + 1, top - 1, 2, 3, "#4CB944");
    kit.rect(left + 4, top - 2, 2, 4, "#5DBB46");
    kit.rect(left + 2, top + 2, 4, 4, "#B5651D");
  }
}

// The broom a guy sweeps with, pushed side to side.
export function drawBroom(kit: Kit, box: GuyBox, facing: Facing, frame: number): void {
  const shift = frame % 2 === 0 ? -1 : 1;
  const handle = "#A0703A";
  const bristles = "#D9A441";
  if (facing === "left" || facing === "right") {
    const paint = painter(kit, box, facing === "left");
    paint(8, 7, 1, 2, handle);
    paint(9, 9, 1, 2, handle);
    paint(10, 11, 1, 3, handle);
    paint(9 + shift, 14, 4, 2, bristles);
    return;
  }
  kit.rect(box.left + 9, box.top + 7, 1, 8, handle);
  kit.rect(box.left + 7 + shift, box.top + 15, 5, 2, bristles);
}
