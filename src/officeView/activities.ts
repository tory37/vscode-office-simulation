// The Office's activities, drawn: each one on its desk spot, the little picture of it the crew carries, and what a player holds
// (a paddle, a barbell, the VR headset). All in room pixels. A machine stands on the desk tile and reaches down into
// the seat tile below it where its player stands; a floor one lies on the seat tile; a table spans two desk tiles.

import { CARRY_ICONS, carryIconPixels } from "../activityCarryIcons";
import { ACTIVITIES, ActivityKindId } from "../officeActivities";
import type { ActivityFit } from "../officeSim";
import type { Facing } from "../pixelGuy";
import type { Kit } from "./scenery";

const TILE = 16;
const FRAME = 12;

// Where a kind's glow sits on its desk tile, for the light map at night.
export function activityLight(kind: ActivityKindId): { dx: number; dy: number; radius: number; color: string } | undefined {
  const color = ACTIVITIES[kind].glow;
  if (color === undefined) {
    return undefined;
  }
  return { dx: kind === "arcadeDuo" || kind === "airHockey" ? 16 : 8, dy: kind === "airHockey" ? 8 : -1, radius: kind === "arcadeDuo" ? 22 : 14, color };
}

// One activity at its spot. playing: someone's on it now, so the screens and balls move.
export function drawActivity(kit: Kit, kind: ActivityKindId, fit: ActivityFit, playing: boolean, seconds: number, index: number): void {
  const desk = fit.blocked[0] ?? { x: fit.seats[0].x, y: fit.seats[0].y - 1 };
  const left = desk.x * TILE;
  const top = desk.y * TILE;
  const seatTop = top + TILE;
  const r = kit.rect;
  const t = playing ? seconds : 0;
  const blink = Math.floor(seconds * 3 + index) % 2 === 0;
  switch (kind) {
    case "pinball": {
      // Backbox with its lit screen, the playfield sloping toward the player, legs.
      r(left + 3, top - 8, 10, 9, "#2A1640");
      r(left + 4, top - 7, 8, 6, blink ? "#FF7AD9" : "#B24FA0");
      r(left + 5, top - 5, 6, 2, "#FFE08A");
      r(left + 2, top + 1, 12, 11, "#4A2380");
      r(left + 3, top + 2, 10, 9, "#1D6FA3");
      for (const [x, y, color] of [[5, 3, "#F5C542"], [9, 4, "#FF5C5C"], [7, 6, "#5CFF9D"]] as const) {
        r(left + x, top + y, 2, 2, blink ? color : "#0E3F63");
      }
      const ballX = left + 4 + Math.round((Math.sin(t * 3.1) + 1) * 3.5);
      const ballY = top + 3 + Math.round((Math.cos(t * 2.3) + 1) * 3.5);
      r(ballX, ballY, 1, 1, "#FFFFFF");
      r(left + 5, top + 10, 2, 1, "#FFFFFF");
      r(left + 9, top + 10, 2, 1, "#FFFFFF");
      r(left + 3, top + 12, 1, 4, "#2A1640");
      r(left + 12, top + 12, 1, 4, "#2A1640");
      return;
    }
    case "arcade":
      drawCabinet(kit, left, top, "#24304F", "#F5C542", t, index);
      return;
    case "arcadeDuo":
      drawCabinet(kit, left, top, "#4A2380", "#5CFFB0", t, index);
      drawCabinet(kit, left + TILE, top, "#7A1F3D", "#6EC8FF", t * 1.3, index + 3);
      return;
    case "clawMachine": {
      r(left + 2, top - 8, 12, 24, "#D64545");
      r(left + 3, top - 7, 10, 12, "#BFE8FF");
      r(left + 3, top - 7, 10, 1, "#FFFFFF");
      // Prizes in the bottom, and the claw drifting over them.
      for (const [x, color] of [[3, "#F48FB1"], [5, "#F5C542"], [8, "#7BD389"], [10, "#8CB8FF"]] as const) {
        r(left + x, top + 2, 2, 3, color);
      }
      const clawX = left + 4 + Math.round((Math.sin(t * 1.4) + 1) * 3);
      const drop = playing ? Math.max(0, Math.round(Math.sin(t * 0.7) * 4)) : 0;
      r(clawX + 1, top - 7, 1, 2 + drop, "#888888");
      r(clawX, top - 5 + drop, 3, 1, "#C0C0C0");
      r(clawX, top - 4 + drop, 1, 1, "#C0C0C0");
      r(clawX + 2, top - 4 + drop, 1, 1, "#C0C0C0");
      r(left + 2, top + 6, 12, 2, "#A12E2E");
      r(left + 5, top + 8, 2, 1, "#222222");
      r(left + 9, top + 7, 2, 2, blink ? "#F5C542" : "#8A6A1A");
      r(left + 3, top + 13, 3, 3, "#7A1F1F");
      r(left + 10, top + 13, 3, 3, "#7A1F1F");
      return;
    }
    case "hoops": {
      r(left + 3, top - 8, 10, 7, "#F2F2F2");
      r(left + 6, top - 6, 4, 3, "#D64545");
      r(left + 7, top - 5, 2, 1, "#F2F2F2");
      r(left + 6, top - 1, 4, 1, "#FF6A00");
      r(left + 6, top, 1, 2, "#DDDDDD");
      r(left + 9, top, 1, 2, "#DDDDDD");
      // The ramp, with a ball or two rolling back down.
      r(left + 2, top + 2, 12, 10, "#2E6FD8");
      r(left + 3, top + 3, 10, 7, "#1A4FA8");
      const ballY = top + 3 + Math.round(((t * 1.5) % 1) * 6);
      r(left + 7, ballY, 2, 2, "#FF7A1A");
      r(left + 4, top + 8, 2, 2, "#FF7A1A");
      r(left + 2, top + 12, 12, 4, "#244E9E");
      r(left + 4, top + 13, 3, 1, blink ? "#FF5C5C" : "#5C1A1A");
      r(left + 9, top + 13, 3, 1, blink ? "#5CFF9D" : "#1A5C2E");
      return;
    }
    case "dartboard": {
      r(left + 7, top + 2, 2, 14, "#5A4636");
      r(left + 4, top + 14, 8, 2, "#5A4636");
      r(left + 3, top - 7, 10, 10, "#1E1E1E");
      r(left + 4, top - 6, 8, 8, "#D64545");
      r(left + 5, top - 5, 6, 6, "#F2E6C8");
      r(left + 6, top - 4, 4, 4, "#2E8B57");
      r(left + 7, top - 3, 2, 2, "#D64545");
      if (playing) {
        r(left + 5 + (Math.floor(seconds * 0.8) % 4), top - 4 + (Math.floor(seconds * 1.3) % 3), 1, 1, "#F5C542");
        r(left + 8, top - 2 + (Math.floor(seconds * 0.6) % 2), 1, 1, "#4FA3F7");
      }
      return;
    }
    case "karaoke": {
      r(left + 1, top - 7, 14, 10, "#111111");
      r(left + 2, top - 6, 12, 7, "#2A1A4A");
      // The lyrics, lighting up as they go.
      const sung = Math.floor(t * 4) % 10;
      r(left + 3, top - 3, 10, 1, "#8888AA");
      r(left + 3, top - 3, Math.max(1, sung), 1, "#FF6FAE");
      r(left + 4, top - 1, 8, 1, "#666688");
      r(left + 1, top + 4, 3, 8, "#222222");
      r(left + 12, top + 4, 3, 8, "#222222");
      r(left + 2, top + 6, 1, 1, "#555555");
      r(left + 13, top + 6, 1, 1, "#555555");
      r(left + 7, top + 8, 1, 8, "#888888");
      r(left + 6, top + 6, 3, 2, "#333333");
      return;
    }
    case "jukebox": {
      r(left + 3, top - 7, 10, 3, "#F5A623");
      r(left + 2, top - 5, 12, 21, "#8B3A1A");
      r(left + 4, top - 3, 8, 5, "#FFE08A");
      for (let bar = 0; bar < 4; bar++) {
        r(left + 4 + bar * 2, top + 4, 1, 6, ["#FF5C5C", "#F5C542", "#5CFF9D", "#6EC8FF"][(bar + Math.floor(seconds * 2)) % 4]);
      }
      r(left + 4, top + 11, 8, 3, "#5A2410");
      return;
    }
    case "pingPong": {
      r(left + 1, top + 4, 30, 8, "#1F7A4D");
      r(left + 1, top + 4, 30, 1, "#FFFFFF");
      r(left + 1, top + 11, 30, 1, "#FFFFFF");
      r(left + 15, top + 2, 2, 10, "#EEEEEE");
      r(left + 3, top + 12, 1, 4, "#333333");
      r(left + 28, top + 12, 1, 4, "#333333");
      if (playing) {
        const across = (Math.sin(seconds * 3.2) + 1) / 2;
        const hop = Math.round(Math.abs(Math.sin(seconds * 6.4)) * 4);
        r(left + 3 + Math.round(across * 25), top + 5 - hop, 1, 1, "#FFB347");
      }
      return;
    }
    case "foosball": {
      r(left + 2, top + 3, 28, 10, "#8B5A2B");
      r(left + 4, top + 4, 24, 8, "#2E8B3E");
      r(left + 15, top + 4, 1, 8, "#E8F5E8");
      for (let rod = 0; rod < 4; rod++) {
        const x = left + 7 + rod * 6;
        const slide = playing ? Math.round(Math.sin(seconds * 4 + rod) * 1.5) : 0;
        r(x, top + 2, 1, 12, "#C0C0C0");
        r(x, top + 5 + slide, 1, 2, rod % 2 === 0 ? "#D64545" : "#2D5BD0");
        r(x, top + 9 + slide, 1, 2, rod % 2 === 0 ? "#D64545" : "#2D5BD0");
      }
      if (playing) {
        r(left + 5 + Math.round((Math.sin(seconds * 2.5) + 1) * 11), top + 7 + Math.round(Math.sin(seconds * 3.7)), 1, 1, "#FFFFFF");
      }
      r(left + 4, top + 13, 2, 3, "#5A3A1A");
      r(left + 26, top + 13, 2, 3, "#5A3A1A");
      return;
    }
    case "airHockey": {
      r(left + 1, top + 4, 30, 9, "#1E3A8A");
      r(left + 2, top + 5, 28, 7, "#E8F4FF");
      r(left + 15, top + 5, 2, 7, "#8CB8FF");
      r(left + 2, top + 7, 1, 3, "#D64545");
      r(left + 29, top + 7, 1, 3, "#D64545");
      if (playing) {
        r(left + 4 + Math.round((Math.sin(seconds * 4.1) + 1) * 11.5), top + 7 + Math.round(Math.sin(seconds * 5.3) * 1.5), 2, 2, "#D64545");
      }
      r(left + 3, top + 13, 2, 3, "#14285E");
      r(left + 27, top + 13, 2, 3, "#14285E");
      return;
    }
    case "chess": {
      r(left + 3, top + 5, 26, 7, "#7A5230");
      r(left + 3, top + 11, 26, 1, "#5A3A1A");
      // The clock at one end.
      r(left + 4, top + 6, 3, 2, "#222222");
      r(left + 5, top + 6, 1, 1, Math.floor(seconds) % 2 === 0 ? "#FF5C5C" : "#555555");
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 6; x++) {
          r(left + 10 + x * 2, top + 6 + y * 2, 2, 2, (x + y) % 2 === 0 ? "#F2E6C8" : "#3B2716");
        }
      }
      r(left + 11, top + 4, 1, 2, "#FFFFFF");
      r(left + 14, top + 4, 1, 2, "#FFFFFF");
      r(left + 19, top + 4, 1, 2, "#111111");
      r(left + 21, top + 4, 1, 2, "#111111");
      r(left + 5, top + 12, 2, 4, "#5A3A1A");
      r(left + 25, top + 12, 2, 4, "#5A3A1A");
      return;
    }
    case "punchingBag": {
      r(left + 13, top - 8, 1, 24, "#555555");
      r(left + 7, top - 8, 7, 1, "#555555");
      r(left + 11, top + 14, 4, 2, "#444444");
      const swing = playing ? Math.round(Math.sin(seconds * 7)) : 0;
      r(left + 8 + swing, top - 7, 1, 2, "#999999");
      r(left + 5 + swing, top - 5, 7, 13, "#B22222");
      r(left + 5 + swing, top - 5, 7, 1, "#7A1515");
      r(left + 5 + swing, top + 7, 7, 1, "#7A1515");
      r(left + 6 + swing, top - 3, 1, 8, "#D64545");
      return;
    }
    case "treadmill": {
      r(left + 3, top + 1, 10, 5, "#333333");
      r(left + 4, top + 2, 8, 2, playing ? "#5CFF9D" : "#1A3A2A");
      r(left + 2, top + 5, 1, 14, "#888888");
      r(left + 13, top + 5, 1, 14, "#888888");
      // The belt, under the walker on the tile below, stripes rolling back.
      r(left + 2, seatTop + 6, 12, 9, "#222222");
      for (let stripe = 0; stripe < 3; stripe++) {
        r(left + 3, seatTop + 6 + ((stripe * 3 + Math.floor(t * 8)) % 9), 10, 1, "#3A3A3A");
      }
      r(left + 2, seatTop + 14, 12, 2, "#555555");
      return;
    }
    case "exerciseBike": {
      r(left + 5, top + 9, 6, 4, "#333333");
      r(left + 6, top + 10, 4, 1, playing ? "#6EC8FF" : "#1A2A3A");
      r(left + 3, top + 12, 10, 1, "#888888");
      r(left + 7, top + 13, 2, 8, "#C0C0C0");
      r(left + 4, seatTop + 8, 8, 6, "#3A3A3A");
      r(left + 7, seatTop + 10, 2, 2, Math.floor(t * 6) % 2 === 0 ? "#888888" : "#555555");
      r(left + 3, seatTop + 14, 10, 2, "#555555");
      return;
    }
    case "piano": {
      r(left + 1, top - 5, 14, 16, "#2B1B14");
      r(left + 2, top - 4, 12, 3, "#3E2A20");
      r(left + 1, top + 9, 14, 3, "#F8F8F0");
      for (const x of [3, 5, 8, 10, 12]) {
        r(left + x, top + 9, 1, 2, "#111111");
      }
      if (playing) {
        r(left + 2 + (Math.floor(seconds * 6) % 12), top + 11, 1, 1, "#C8C8C0");
      }
      r(left + 2, top + 12, 2, 4, "#2B1B14");
      r(left + 12, top + 12, 2, 4, "#2B1B14");
      r(left + 3, seatTop + 7, 10, 3, "#3B2716");
      r(left + 4, seatTop + 10, 1, 4, "#3B2716");
      r(left + 11, seatTop + 10, 1, 4, "#3B2716");
      return;
    }
    case "easel": {
      r(left + 4, top + 2, 1, 14, "#8B6A3A");
      r(left + 11, top + 2, 1, 14, "#8B6A3A");
      r(left + 7, top - 2, 2, 16, "#A07A44");
      r(left + 3, top - 7, 10, 10, "#FFFFFF");
      // The painting fills in as he works.
      const strokes = playing ? 1 + (Math.floor(seconds / 2) % 7) : 3;
      const colors = ["#6EC8FF", "#5DBB46", "#F5C542", "#D64545", "#7B5CD6", "#FF9A4D", "#3E8E41"];
      for (let stroke = 0; stroke < strokes; stroke++) {
        r(left + 4 + ((stroke * 3) % 7), top - 6 + ((stroke * 5) % 7), 2 + (stroke % 2), 2, colors[(stroke + index) % colors.length]);
      }
      r(left + 3, top + 3, 10, 1, "#8B6A3A");
      return;
    }
    case "yogaMat":
      r(left + 2, seatTop + 2, 12, 13, "#7B5CD6");
      r(left + 2, seatTop + 2, 12, 1, "#9C82E8");
      r(left + 2, seatTop + 14, 12, 1, "#5A3FB0");
      r(left + 12, top + 12, 3, 4, "#4FA3F7");
      r(left + 12, top + 11, 3, 1, "#FFFFFF");
      return;
    case "weights": {
      r(left + 2, top + 3, 1, 12, "#444444");
      r(left + 13, top + 3, 1, 12, "#444444");
      r(left + 2, top + 6, 12, 1, "#666666");
      r(left + 2, top + 11, 12, 1, "#666666");
      for (const x of [4, 7, 10]) {
        r(left + x, top + 4, 2, 2, "#2A2A2A");
        r(left + x, top + 9, 2, 2, "#2A2A2A");
      }
      r(left + 1, seatTop + 11, 14, 4, "#333333");
      return;
    }
    case "trampoline":
      r(left + 1, seatTop + 8, 14, 6, "#1E1E1E");
      r(left + 1, seatTop + 8, 14, 1, "#3D7BE0");
      r(left + 1, seatTop + 13, 14, 1, "#3D7BE0");
      r(left + 2, seatTop + 14, 1, 2, "#888888");
      r(left + 13, seatTop + 14, 1, 2, "#888888");
      return;
    case "beanbag":
      r(left + 3, seatTop + 3, 10, 12, "#E07A2E");
      r(left + 2, seatTop + 6, 12, 8, "#E07A2E");
      r(left + 4, seatTop + 4, 4, 2, "#F29A52");
      r(left + 3, seatTop + 13, 10, 2, "#B85E1E");
      return;
    case "massageChair":
      r(left + 2, seatTop - 7, 12, 14, "#4A3A30");
      r(left + 3, seatTop - 6, 10, 11, "#5A4636");
      r(left + 5, seatTop - 4, 6, 1, "#6E5A48");
      r(left + 1, seatTop + 4, 3, 7, "#3A2D23");
      r(left + 12, seatTop + 4, 3, 7, "#3A2D23");
      r(left + 4, seatTop + 12, 8, 4, "#3A2D23");
      r(left + 13, seatTop + 6, 1, 1, blink ? "#5CFF9D" : "#1A5C2E");
      return;
    case "meditation": {
      r(left + 3, seatTop + 11, 10, 4, "#C94F7C");
      r(left + 4, seatTop + 10, 8, 1, "#E06A96");
      // A stick of incense, its smoke curling up.
      r(left + 13, seatTop + 8, 1, 6, "#8B5A2B");
      r(left + 13, seatTop + 7, 1, 1, "#FF6A00");
      for (let puff = 0; puff < 3; puff++) {
        const rise = (seconds * 2 + puff * 2) % 6;
        r(left + 13 + Math.round(Math.sin(seconds + puff) * 1), seatTop + 6 - Math.round(rise), 1, 1, "#BBBBBB");
      }
      return;
    }
    case "vr": {
      r(left + 1, seatTop + 3, 14, 12, "#2A2A3A");
      r(left + 1, seatTop + 3, 14, 1, "#22D3EE");
      r(left + 1, seatTop + 14, 14, 1, "#22D3EE");
      r(left + 1, top + 4, 2, 10, "#333333");
      r(left + 13, top + 4, 2, 10, "#333333");
      r(left + 1, top + 4, 2, 1, blink ? "#FF3B3B" : "#5C1A1A");
      r(left + 13, top + 4, 2, 1, blink ? "#5C1A1A" : "#FF3B3B");
      return;
    }
  }
}

// A tall arcade cabinet on one desk tile: marquee, screen with a little game on it, controls.
function drawCabinet(kit: Kit, left: number, top: number, body: string, marquee: string, t: number, index: number): void {
  const r = kit.rect;
  r(left + 2, top - 8, 12, 24, body);
  r(left + 3, top - 7, 10, 3, marquee);
  r(left + 4, top - 3, 8, 7, "#0B1020");
  const hero = Math.round((Math.sin(t * 2 + index) + 1) * 2.5);
  r(left + 5 + hero, top + 1, 1, 2, "#5CFF9D");
  r(left + 10 - ((Math.floor(t * 3) + index) % 5), top - 2, 1, 1, "#FF5C5C");
  r(left + 4, top + 3, 8, 1, "#2A3A6A");
  r(left + 2, top + 5, 12, 3, "#3B4A75");
  r(left + 5, top + 5, 1, 2, "#D64545");
  r(left + 9, top + 6, 1, 1, "#F5C542");
  r(left + 11, top + 6, 1, 1, "#4FA3F7");
}

// The crate the crew carries an activity in, held up over his head like a desk.
// The thing a crew guy carries, over his head, centered on him.
export function drawCarriedActivity(kit: Kit, kind: ActivityKindId, box: { left: number; top: number }, headRoom: number, bob: number): void {
  const pixels = carryIconPixels(kind);
  const height = CARRY_ICONS[kind].rows.length;
  const left = box.left + Math.floor((FRAME - CARRY_ICONS[kind].rows[0].length) / 2);
  const top = box.top - headRoom - height + 2 + bob;
  for (const pixel of pixels) {
    kit.rect(left + pixel.x, top + pixel.y, 1, 1, pixel.color);
  }
}

// What a player has in his hands, over his sprite: a paddle at ping pong, the barbell, the VR headset.
export function drawHeld(kit: Kit, kind: ActivityKindId, box: { left: number; top: number }, facing: Facing, frame: number): void {
  const r = kit.rect;
  switch (kind) {
    case "pingPong":
    case "airHockey": {
      if (facing !== "left" && facing !== "right") {
        return;
      }
      const x = facing === "right" ? box.left + 10 : box.left;
      const y = box.top + 7 + (frame % 2);
      r(x, y, 2, 3, kind === "pingPong" ? "#D64545" : "#2D5BD0");
      return;
    }
    case "weights": {
      // Hands overhead, then at the shoulders.
      const y = box.top + 1 + (frame % 2 === 0 ? 1 : 4);
      r(box.left - 2, y, FRAME + 4, 1, "#9A9A9A");
      r(box.left - 3, y - 2, 2, 5, "#2A2A2A");
      r(box.left + FRAME + 1, y - 2, 2, 5, "#2A2A2A");
      return;
    }
    case "vr":
      if (facing === "down") {
        r(box.left + 3, box.top + 4, 6, 3, "#222222");
        r(box.left + 4, box.top + 5, 4, 1, "#22D3EE");
      }
      return;
    case "beanbag":
      if (facing === "down") {
        r(box.left + 4, box.top + 10, 4, 2, "#555555");
        r(box.left + 5, box.top + 10, 2, 1, "#9AE66E");
      }
      return;
    case "karaoke":
      if (facing === "up") {
        r(box.left + 8, box.top + 6, 1, 3, "#888888");
      }
      return;
    default:
  }
}
