// Pure: the little picture of each activity the crew carries over his head, in and out, so it doesn't look like a desk.
// Each row is one pixel row; "." is clear, "k" the outline, "w" white, and the other letters come from the icon's own
// colors. The view draws them in officeView/activities.ts.

import type { ActivityKindId } from "./officeActivities";

export interface CarryIcon {
  rows: readonly string[];
  colors: Record<string, string>;
}

export const CARRY_ICONS: Record<ActivityKindId, CarryIcon> = {
  pinball: {
    rows: ["..kkkkkkkk..", "..kmmmmmmk..", "..kmyyyymk..", "..kkkkkkkk..", ".kggggggggk.", ".kgwggggggk.", ".kggggrrggk.", ".kkkkkkkkkk.", "..k......k.."],
    colors: { m: "#FF7AD9", y: "#FFE08A", g: "#2E3A8C", r: "#FF5A5A" },
  },
  arcade: {
    rows: ["..kkkkkkkk..", "..kmmmmmmk..", "..kkkkkkkk..", "..kssssssk..", "..ksgsssgk..", "..kssssssk..", "..kbbbbbbk..", "..kbrbybbk..", "..kbbbbbbk..", "..kkkkkkkk.."],
    colors: { m: "#6EE7FF", s: "#14203A", g: "#7CFF8A", b: "#2E4C9E", r: "#FF4D4D", y: "#FFE066" },
  },
  arcadeDuo: {
    rows: ["kkkkkk.kkkkkk", "kmmmmk.kmmmmk", "kssssk.kssssk", "ksgssk.kssgsk", "kbbbbk.kbbbbk", "kbrbbk.kbbrbk", "kkkkkk.kkkkkk"],
    colors: { m: "#B98CFF", s: "#14203A", g: "#7CFF8A", b: "#6A3FB5", r: "#FF4D4D" },
  },
  clawMachine: {
    rows: ["..kkkkkkkk..", "..kyyyyyyk..", "..kckkkkck..", "..kc.k..ck..", "..kc.v..ck..", "..kcpbgyck..", "..kkkkkkkk..", "..krrrrrrk..", "..kkkkkkkk.."],
    colors: { y: "#FFD25E", c: "#BFE9FF", v: "#C0C0C0", p: "#FF8FC8", b: "#6EB5FF", g: "#7CE08A", r: "#D64545" },
  },
  hoops: {
    rows: ["..kkkkkkkk..", "..kwwwwwwk..", "..kwkkkkwk..", "..kwwwwwwk..", "..kkkookkk..", "...kooook...", "....kwwk....", "..kbbbbbbk..", "..kbnnnnbk..", "..kkkkkkkk.."],
    colors: { o: "#FF7A1A", b: "#2A2A2A", n: "#FF9A4D" },
  },
  dartboard: {
    rows: ["...kkkkkk...", "..kgrrrrgk..", ".kgrggggrgk.", ".krgryyrgrk.", ".krgryyrgrk.", ".kgrggggrgk.", "..kgrrrrgk..", "...kkkkkk..."],
    colors: { g: "#2E8B57", r: "#D64545", y: "#FFE066" },
  },
  karaoke: {
    rows: [".kkkkkkkkkk.", ".kssssssssk.", ".kswswswssk.", ".kkkkkkkkkk.", "..kppppppk..", "..kpkkkkpk..", "..kpkppkpk..", "..kkkkkkkk.."],
    colors: { s: "#3A1640", p: "#E0457B" },
  },
  jukebox: {
    rows: ["...kkkkkk...", "..kyyyyyyk..", ".kyooooooyk.", ".kyowwwwoyk.", ".kyoyyyyoyk.", ".kyooooooyk.", ".kbbbbbbbbk.", ".kbrbgbybbk.", ".kkkkkkkkkk."],
    colors: { y: "#FFB347", o: "#C8641A", b: "#5A2E14", r: "#FF4D4D", g: "#7CE08A" },
  },
  pingPong: {
    rows: ["kkkkkkkkkkkkkk", "kggggggwgggggk", "kggggggwgggggk", "kwwwwwwwwwwwwk", "kggggggwgggggk", "kggggggwgggggk", "kkkkkkkkkkkkkk", ".k..........k."],
    colors: { g: "#1F7A4D" },
  },
  foosball: {
    rows: ["kkkkkkkkkkkkkk", "kffffffffffffk", "kfvvvvvvvvvvfk", "kfgrggbggrggfk", "kfgggbggrgggfk", "kfvvvvvvvvvvfk", "kffffffffffffk", "kkkkkkkkkkkkkk", ".k..........k."],
    colors: { f: "#8B5A2B", v: "#C0C0C0", g: "#2E8B57", r: "#D64545", b: "#2D5BD0" },
  },
  airHockey: {
    rows: ["kkkkkkkkkkkkkk", "kbbbbbbbbbbbbk", "kbrbbbbwbbbbbk", "kbbbbbwwwbbbbk", "kbbbbbbwbbbrbk", "kbbbbbbbbbbbbk", "kkkkkkkkkkkkkk", ".k..........k."],
    colors: { b: "#2D5BD0", r: "#FF4D4D", w: "#BFF4FF" },
  },
  chess: {
    rows: ["kkkkkkkkkkkk", "kcdcdcdcdcdk", "kdcdcdcdcdck", "kcdcdcdcdcdk", "kdcdcdcdcdck", "kcdcdcdcdcdk", "kkkkkkkkkkkk"],
    colors: { c: "#E8E0C8", d: "#5A3A22" },
  },
  punchingBag: {
    rows: [".....kk.....", ".....kk.....", "....kkkk....", "...krrrrk...", "...krwrrk...", "...krrrrk...", "...krrrrk...", "...krrrrk...", "...kddddk...", "....kkkk...."],
    colors: { r: "#B22222", d: "#7A1515" },
  },
  treadmill: {
    rows: ["..........kk", "..........kk", ".........kgk", "........kk.k", "kkkkkkkkkkkk", "kbbbbbbbbbbk", "kddddddddddk", "kkkkkkkkkkkk"],
    colors: { g: "#7CFF8A", b: "#3A3A3A", d: "#222222" },
  },
  exerciseBike: {
    rows: ["...kkk......", "....k...kkk.", "....k...kgk.", "....kkkkkk..", "...kvvk..k..", "..kv..vk.k..", "..kv..vk.k..", "...kvvk.kkk.", "....kkkkk..."],
    colors: { v: "#D0D0D0", g: "#7CFF8A" },
  },
  piano: {
    rows: ["kkkkkkkkkkkk", "kppppppppppk", "kppppppppppk", "kkkkkkkkkkkk", "kwkwkwwkwkwk", "kwkwkwwkwkwk", "kwwwwwwwwwwk", "kkkkkkkkkkkk", "kp........pk"],
    colors: { p: "#2B1B14" },
  },
  easel: {
    rows: [".....kk.....", "..kkkkkkkk..", "..kwwwwwwk..", "..kwbbwwwk..", "..kwwgggwk..", "..kwrwwwwk..", "..kkkkkkkk..", "...e.ee.e...", "..e..ee..e..", ".e...ee...e."],
    colors: { b: "#6EB5FF", g: "#4CAF50", r: "#FF6B6B", e: "#C8A46A" },
  },
  yogaMat: {
    rows: ["..kkkkkkkkk.", ".kmmmmmmmmmk", "kmlmmmmmmmmk", "kmlmmmmmmmmk", ".kmmmmmmmmmk", "..kkkkkkkkk."],
    colors: { m: "#7B5CD6", l: "#A88BFF" },
  },
  weights: {
    rows: ["kk........kk", "kdk......kdk", "kdkvvvvvvkdk", "kdk......kdk", "kk........kk", "............", ".kk..kk..kk.", "kddkkddkkddk", ".kk..kk..kk."],
    colors: { d: "#2A2A2A", v: "#9A9A9A" },
  },
  trampoline: {
    rows: ["..kkkkkkkkk.", ".kbbbbbbbbbk", "kbddddddddbk", ".kbbbbbbbbbk", "..kkkkkkkkk.", "..k.k...k.k."],
    colors: { b: "#3D7BE0", d: "#1E2A44" },
  },
  beanbag: {
    rows: ["....kkkk....", "..kkoooookk.", ".kooooolook.", "kooooooooook", "koooooooodok", "kddoooooddk.", ".kkkkkkkkk.."],
    colors: { o: "#E07A2E", l: "#F4A460", d: "#A8551A" },
  },
  massageChair: {
    rows: ["..kkkkk.....", "..kcccck....", "..kcccck....", "..kcccckkkk.", "..kccccccck.", "..kccccccck.", "..kkkkkkkkk.", "...k.....k.."],
    colors: { c: "#5A4636" },
  },
  meditation: {
    rows: ["...kkkkkk...", ".kkppppppkk.", "kppplllpppk.", "kpppppppppk.", ".kkppppppkk.", "...kkkkkk..."],
    colors: { p: "#C94F7C", l: "#E8789F" },
  },
  vr: {
    rows: ["..kkkkkkkk..", ".kddddddddk.", "kdccdddccdk.", "kdccdddccdk.", ".kddddddddk.", "..kk....kk.."],
    colors: { d: "#2A2A2A", c: "#22D3EE" },
  },
};

const CARRY_OUTLINE = "#1E1A24";

// The icon's colored pixels, from its top left.
export function carryIconPixels(kind: ActivityKindId): { x: number; y: number; color: string }[] {
  const icon = CARRY_ICONS[kind];
  const pixels: { x: number; y: number; color: string }[] = [];
  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      const color = key === "." ? undefined : key === "k" ? CARRY_OUTLINE : key === "w" ? "#FFFFFF" : icon.colors[key];
      if (color !== undefined) {
        pixels.push({ x, y, color });
      }
    }
  });
  return pixels;
}
