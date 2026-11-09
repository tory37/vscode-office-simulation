// The character maker: an overlay on the Office for designing a guy's look, with a live preview that turns and walks
// through his poses. The extension opens it with a "maker" message and gets the look back in "makerDone" (or null
// when cancelled). Styles are in maker.css; nothing here sets a style attribute, so the webview's CSP holds.

import { ACCESSORY_LABELS, changeRace, HAIR_STYLE_LABELS, makerOptions, randomLook } from "../characterMaker";
import { Accessory, Facing, FRAME_HEIGHT, FRAME_WIDTH, PixelGuyLook, pixelGuyFrame, Pose } from "../pixelGuy";
import { RaceId } from "../pixelRaces";

export interface MakerRequest {
  look: PixelGuyLook;
  title?: string;
}

interface OpenMaker {
  root: HTMLElement;
  done: (look: PixelGuyLook | undefined) => void;
  frameHandle: number;
}

let open: OpenMaker | undefined;

// The preview's loop: a few seconds of each, turning as he goes.
const PREVIEW: readonly { pose: Pose; facing: Facing; seconds: number; fps: number }[] = [
  { pose: "stand", facing: "down", seconds: 1.4, fps: 1 },
  { pose: "walk", facing: "down", seconds: 1.6, fps: 6 },
  { pose: "walk", facing: "right", seconds: 1.6, fps: 6 },
  { pose: "walk", facing: "up", seconds: 1.6, fps: 6 },
  { pose: "walk", facing: "left", seconds: 1.6, fps: 6 },
  { pose: "cheer", facing: "down", seconds: 1.4, fps: 3 },
  { pose: "talk", facing: "down", seconds: 1.4, fps: 4 },
];
const PREVIEW_SECONDS = PREVIEW.reduce((sum, step) => sum + step.seconds, 0);

export function isMakerOpen(): boolean {
  return open !== undefined;
}

// Opens the maker over the Office. Opening it again cancels the one already open.
export function openMaker(request: MakerRequest, done: (look: PixelGuyLook | undefined) => void): void {
  closeMaker(undefined);
  let look: PixelGuyLook = { ...request.look };
  const root = element("div", "maker");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", request.title ?? "Character maker");
  const panel = element("div", "maker-panel");
  const head = element("div", "maker-head");
  head.append(element("span", "maker-title", request.title ?? "Make your guy"));
  const body = element("div", "maker-body");
  const preview = element("div", "maker-preview");
  const canvas = document.createElement("canvas");
  canvas.className = "maker-canvas";
  canvas.setAttribute("aria-label", "Preview");
  preview.append(canvas);
  const fields = element("div", "maker-fields");
  body.append(preview, fields);
  const actions = element("div", "maker-actions");
  const randomize = button("Randomize", () => update(randomLook(Math.random)));
  const cancel = button("Cancel", () => closeMaker(undefined));
  const save = button("Save", () => closeMaker(look));
  save.classList.add("primary");
  actions.append(randomize, element("span", "maker-spacer"), cancel, save);
  panel.append(head, body, actions);
  root.append(panel);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMaker(undefined);
    }
  });
  document.body.append(root);

  function update(next: PixelGuyLook): void {
    look = next;
    const scroll = fields.scrollTop;
    renderFields(fields, look, update);
    fields.scrollTop = scroll;
  }
  update(look);

  const started = performance.now();
  const draw = (now: number) => {
    if (open?.root !== root) {
      return;
    }
    drawPreview(canvas, look, (now - started) / 1000);
    open.frameHandle = requestAnimationFrame(draw);
  };
  open = { root, done, frameHandle: requestAnimationFrame(draw) };
  (fields.querySelector("select, button") as HTMLElement | null)?.focus();
}

// Closes the maker, handing back the look (or undefined for a cancel).
export function closeMaker(look: PixelGuyLook | undefined): void {
  const current = open;
  if (current === undefined) {
    return;
  }
  open = undefined;
  cancelAnimationFrame(current.frameHandle);
  current.root.remove();
  current.done(look);
}

function renderFields(fields: HTMLElement, look: PixelGuyLook, update: (look: PixelGuyLook) => void): void {
  const options = makerOptions(look);
  const set = (change: Partial<PixelGuyLook>) => update({ ...look, ...change });
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
  race.addEventListener("change", () => update(changeRace(look, race.value as RaceId)));
  fields.append(section("Race", race));

  fields.append(section("Skin", swatches(options.skins, look.skin, (skin) => set({ skin }))));
  fields.append(section("Hair", chips(options.hairStyles, look.hairStyle, (id) => HAIR_STYLE_LABELS[id], (hairStyle) => set({ hairStyle })),
    swatches(options.hairs, look.hair, (hair) => set({ hair }))));
  fields.append(section("Eyes", swatches(options.eyes, look.eyes ?? options.eyes[0], (eyes) => set({ eyes }))));
  const extra = section("Extra", chips(options.accessories, look.accessory, (id) => ACCESSORY_LABELS[id], (accessory: Accessory) => set({ accessory })));
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
  if (options.marks.length === 3 && look.marks !== undefined) {
    const marks = look.marks;
    const markSection = section("Marks");
    options.marks.forEach((palette, index) => {
      markSection.append(swatches(palette, marks[index], (color) => {
        const next: [string, string, string] = [...marks];
        next[index] = color;
        set({ marks: next });
      }));
    });
    fields.append(markSection);
  }
}

function drawPreview(canvas: HTMLCanvasElement, look: PixelGuyLook, seconds: number): void {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * pixelRatio);
  const height = Math.round(canvas.clientHeight * pixelRatio);
  if (width === 0 || height === 0) {
    return;
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.clearRect(0, 0, width, height);
  let time = seconds % PREVIEW_SECONDS;
  let step = PREVIEW[0];
  for (const candidate of PREVIEW) {
    step = candidate;
    if (time < candidate.seconds) {
      break;
    }
    time -= candidate.seconds;
  }
  const scale = Math.max(1, Math.floor(Math.min(width / FRAME_WIDTH, (height * 0.92) / FRAME_HEIGHT)));
  const left = Math.floor((width - FRAME_WIDTH * scale) / 2);
  const top = Math.floor((height - FRAME_HEIGHT * scale) / 2);
  context.fillStyle = "rgba(0, 0, 0, 0.25)";
  context.beginPath();
  context.ellipse(width / 2, top + (FRAME_HEIGHT - 0.6) * scale, FRAME_WIDTH * scale * 0.38, scale * 1.1, 0, 0, Math.PI * 2);
  context.fill();
  pixelGuyFrame(look, step.pose, step.facing, Math.floor(time * step.fps)).forEach((row, y) => row.forEach((color, x) => {
    if (color !== null) {
      context.fillStyle = color;
      context.fillRect(left + x * scale, top + y * scale, scale, scale);
    }
  }));
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "maker-button";
  node.textContent = text;
  node.addEventListener("click", onClick);
  return node;
}

function label(text: string): HTMLElement {
  return element("div", "maker-label", text);
}

function section(title: string, ...children: HTMLElement[]): HTMLElement {
  const node = element("div", "maker-section");
  node.append(label(title), ...children);
  return node;
}

// A row of color swatches, plus a picker for any other color.
function swatches(colors: readonly string[], current: string, onPick: (color: string) => void): HTMLElement {
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

function chips<Id extends string>(ids: readonly Id[], current: Id, labelOf: (id: Id) => string, onPick: (id: Id) => void): HTMLElement {
  const row = element("div", "maker-chips");
  for (const id of ids) {
    const chip = button(labelOf(id), () => onPick(id));
    chip.classList.add("maker-chip");
    chip.setAttribute("aria-pressed", String(id === current));
    row.append(chip);
  }
  return row;
}

function toggle(text: string, checked: boolean, onChange: (checked: boolean) => void, disabled = false): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "maker-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.disabled = disabled;
  input.addEventListener("change", () => onChange(input.checked));
  wrap.append(input, document.createTextNode(` ${text}`));
  return wrap;
}

