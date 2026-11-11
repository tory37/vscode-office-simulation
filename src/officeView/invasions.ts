// The Office's invasions, drawn: the room's tint, the banner, the aliens' beams, zaps (bolts, lasers, and fireballs),
// puffs of smoke and bats, the words that pop off a hit, stars over a guy who's down, the mess on the floor, the
// invaders' gear (a vampire's cape, an alien's ray gun, a raider's club and his loot, a demon's pitchfork, a mummy's
// loose bandage, a slime's drips), and the broom the guys sweep up with.
// All in room pixels. A guy's box is the top-left of his 12-wide frame at the top of his head; a point (x, y) of his
// pixel grid is at (box.left + x + 1, box.top + y + 1).

import type { Facing, PixelGuyLook } from "../pixelGuy";
import { lookWithRace, mixHex } from "../pixelGuy";
import { DebrisKind, INVASIONS, WARNING_SECONDS, ZapStyle } from "../officeInvasions";
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

// A turned guy's look: the zombie or wolf race, his own clothes. Pale: his skin gone white. Wrapped: bandages all
// over. Slimed: green and sticky. Sooty: blackened by a fireball.
export function variantLook(look: PixelGuyLook, variant: LookVariant): PixelGuyLook {
  const tinted = (color: string, amount: number): PixelGuyLook => ({
    ...look,
    skin: mixHex(look.skin, color, amount),
    hair: mixHex(look.hair, color, amount),
    shirt: mixHex(look.shirt, color, amount),
    pants: mixHex(look.pants, color, amount),
  });
  switch (variant) {
    case "zombie":
      return lookWithRace(look, "zombie");
    case "wolf":
      return lookWithRace(look, "wolffolk");
    case "pale":
      return { ...look, skin: mixHex(look.skin, "#F2EEF8", 0.65) };
    case "wrapped":
      return { ...tinted("#E6DCBF", 0.85), accessory: "none" };
    case "slimed":
      return tinted("#6EDC5A", 0.5);
    case "sooty":
      return tinted("#2A2420", 0.5);
  }
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
    const dark = INVASIONS[invasion.kind].dark ?? 0;
    if (dark > 0) {
      // The room goes dark.
      context.globalAlpha = dark * level;
      kit.rect(0, 0, width, height, "#0A0614");
    }
    context.globalAlpha = 0.16 * level;
    kit.rect(0, 0, width, height, INVASIONS[invasion.kind].tint);
    context.globalAlpha = 1;
  }
  if (INVASIONS[invasion.kind].sunrise === true && invasion.phase === "retreat") {
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
  const spec = INVASIONS[invasion.kind];
  for (const puff of invasion.puffs) {
    const age = time - puff.at;
    const x = puff.x * TILE + TILE / 2;
    const y = puff.y * TILE + TILE - 2;
    const way = puff.exit ? spec.exit : spec.entry;
    if (way === "beam") {
      if (age < 1.3) {
        drawBeam(kit, x, y, time, 0.65 * Math.sin((Math.PI * age) / 1.3));
      }
    } else if (way !== "door") {
      drawSmoke(kit, x, y - 6, age, spec.puff ?? ["#6B4A8A", "#3A2A4A"]);
      if (way === "bats") {
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
      drawZap(kit, fromBox, from.facing, toBox, time, zap.until, spec.zapStyle ?? "bolt", spec.zapColor ?? "#B4FF5A", spec.strikeSeconds);
    }
  }
  context.textBaseline = "middle";
  for (const hit of invasion.hits) {
    drawWord(kit, hit.word, hit.x * TILE + TILE / 2, hit.y * TILE - 2, time - hit.at, spec.wordColor);
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

function drawSmoke(kit: Kit, x: number, y: number, age: number, colors: readonly [string, string]): void {
  if (age > 1.2) {
    return;
  }
  const { context } = kit;
  const spread = 3 + age * 9;
  context.globalAlpha = Math.max(0, 0.8 * (1 - age / 1.2));
  for (let index = 0; index < 6; index++) {
    const angle = index * 1.05 + age;
    const size = Math.max(2, Math.round(5 - age * 3));
    kit.rect(Math.round(x + Math.cos(angle) * spread - size / 2), Math.round(y + Math.sin(angle) * spread * 0.6 - size / 2), size, size, colors[index % 2]);
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

// A zap from his hand to the guy: a crackling bolt, a straight laser, or a fireball flying across and flaring as it
// lands.
function drawZap(kit: Kit, from: GuyBox, facing: Facing, to: GuyBox, time: number, until: number, style: ZapStyle, color: string, length: number): void {
  const { context } = kit;
  const startX = from.left + (facing === "left" ? 0 : facing === "right" ? FRAME : FRAME / 2);
  const startY = from.top + 8;
  const endX = to.left + FRAME / 2;
  const endY = to.top + 7;
  if (style === "laser") {
    context.strokeStyle = Math.floor(time * 24) % 2 === 0 ? color : "#FFE0E0";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    kit.glow(endX, endY, 6, color, 0.7);
    kit.glow(startX, startY, 3, color, 0.6);
    return;
  }
  if (style === "fireball") {
    // Across in the first part of the strike, then a flare on him.
    const t = Math.max(0, Math.min(1, (length - (until - time)) / (length * 0.7)));
    const x = Math.round(startX + (endX - startX) * t);
    const y = Math.round(startY + (endY - startY) * t - Math.sin(Math.PI * t) * 4);
    for (let trail = 1; trail <= 3; trail++) {
      const back = Math.max(0, t - trail * 0.08);
      context.globalAlpha = 0.6 - trail * 0.15;
      kit.rect(Math.round(startX + (endX - startX) * back) - 1, Math.round(startY + (endY - startY) * back - Math.sin(Math.PI * back) * 4) - 1, 2, 2, trail === 1 ? color : "#7A1A10");
    }
    context.globalAlpha = 1;
    kit.rect(x - 2, y - 2, 4, 4, color);
    kit.rect(x - 1, y - 1, 2, 2, "#FFE48A");
    kit.glow(x, y, t >= 1 ? 10 : 6, color, 0.7);
    return;
  }
  context.strokeStyle = Math.floor(time * 20) % 2 === 0 ? color : "#F0FFE0";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(startX, startY);
  for (let step = 1; step < 4; step++) {
    const t = step / 4;
    context.lineTo(startX + (endX - startX) * t + Math.sin(time * 40 + step) * 1.5, startY + (endY - startY) * t + Math.cos(time * 37 + step) * 2);
  }
  context.lineTo(endX, endY);
  context.stroke();
  kit.glow(endX, endY, 7, color, 0.6);
  kit.glow(startX, startY, 4, color, 0.5);
}

// A comic word off a hit: pops in big, then drifts up and fades.
function drawWord(kit: Kit, word: string, x: number, y: number, age: number, color: string): void {
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
  context.fillStyle = color;
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
  bolts: { rows: ["s..d.", ".ss..", "...sd", "d.s.."], colors: { s: "#B8BEC4", d: "#6E767E" } },
  ecto: { rows: [".eee.", "eelee", ".ee.e"], colors: { e: "#9FE8E0", l: "#E8FFFC" } },
  fur: { rows: ["b.b..", ".bbb.", "..b.b"], colors: { b: "#7A5A3A" } },
  sand: { rows: ["..yy..", ".yyyy.", "yyoyyy"], colors: { y: "#E2C27A", o: "#C9A45A" } },
};

export function drawDebris(kit: Kit, piece: Debris): void {
  const art = DEBRIS_ART[piece.kind];
  const width = art.rows[0].length;
  const left = Math.round(piece.x * TILE + TILE / 2 + piece.ox - width / 2);
  const top = Math.round(piece.y * TILE + 10 + piece.oy);
  const { context } = kit;
  if (piece.kind === "scorch" || piece.kind === "cobweb" || piece.kind === "ecto") {
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
  if (kind === "demons") {
    // A pitchfork, held up, jabbed forward on a throw.
    const iron = "#3A3A40";
    const throwing = agent.mode === "attack";
    if (side) {
      paint(throwing ? 9 : 10, throwing ? 8 : 2, 1, throwing ? 1 : 12, iron);
      if (throwing) {
        paint(9, 8, 4, 1, iron);
        paint(13, 7, 1, 1, iron);
        paint(13, 9, 1, 1, iron);
      } else {
        paint(9, 0, 3, 1, iron);
        paint(9, -1, 1, 1, iron);
        paint(11, -1, 1, 1, iron);
        paint(10, -2, 1, 2, iron);
      }
    } else if (facing === "down") {
      paint(10, 2, 1, 12, iron);
      paint(9, 0, 3, 1, iron);
      paint(9, -1, 1, 1, iron);
      paint(11, -1, 1, 1, iron);
    }
    return;
  }
  if (kind === "mummies") {
    // Bandage seams across his head and body.
    const seam = "#B8AC88";
    if (facing !== "up") {
      paint(3, 2, 6, 1, seam);
    }
    paint(3, 9, 6, 1, seam);
    paint(3, 12, 6, 1, seam);
    // A loose bandage trailing behind him.
    if (agent.path.length > 0 && side) {
      const wave = frame % 2;
      paint(0, 11 + wave, 2, 1, "#D8CDA8");
      paint(-2, 12 - wave, 2, 1, "#CFC3A0");
    }
    return;
  }
  if (kind === "slimes") {
    // Drips falling off him.
    const drip = (Math.floor(frame / 2) % 4);
    paint(3, 12 + drip, 1, 1, "#6EDC5A");
    paint(8, 14 - drip / 2, 1, 1, "#9AF07A");
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
