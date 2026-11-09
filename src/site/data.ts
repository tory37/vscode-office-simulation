// The lists the docs site shows, taken from the code so the site can't drift from it. scripts/site.mjs bundles this
// into docs/siteData.js as the global OFFICE_SITE.
import { BUBBLE_LOOKS, CHATTER_LABELS, CHATTER_STYLES, TALK_FREQUENCIES } from "../officeChatter";
import { OFFICE_SCENES, OUTDOOR_SCENES } from "../officeLayout";
import { PERFORMANCE_KINDS, PERFORMANCES } from "../officePerformances";
import { VISITOR_KINDS } from "../officeVisitors";
import { DEFAULT_YOUR_LOOK } from "../pixelGuy";
import { RACES } from "../pixelRaces";
import { EVENT_VARIANTS, SCENE_EVENT_KINDS } from "../sceneEventSchedule";

export const OFFICE_SITE = {
  scenes: OFFICE_SCENES.map((scene) => ({ ...scene, outdoor: OUTDOOR_SCENES.has(scene.id) })),
  shows: PERFORMANCE_KINDS.map((id) => ({ id, label: PERFORMANCES[id].label })),
  events: [...SCENE_EVENT_KINDS],
  eventVariants: EVENT_VARIANTS,
  chatterStyles: CHATTER_STYLES.map((id) => ({ id, ...CHATTER_LABELS[id] })),
  bubbleLooks: [...BUBBLE_LOOKS],
  talkFrequencies: [...TALK_FREQUENCIES],
  visitorFrequencies: ["off", "rare", "normal", "often", "packed"],
  performanceFrequencies: ["off", "rare", "normal", "often"],
  visitorKinds: [...VISITOR_KINDS],
  races: RACES.map((race) => ({ id: race.id, label: race.label })),
  defaultLook: DEFAULT_YOUR_LOOK,
};
