import * as vscode from "vscode";
import { agentsFromHost, lineFromHost, youStatusFromHost } from "./apiAgents";
import { OfficeDirector } from "./officeDirector";
import { isEventKind } from "./officeEvents";
import { OfficePanelProvider } from "./officePanel";
import { isPerformanceKind } from "./officePerformances";
import { isInvasionKind } from "./officeInvasions";
import type { OfficeLook, OfficeSimulationApi } from "./officeSimulationApi";
import { VISITOR_KINDS } from "./officeVisitors";
import { pixelGuyLook, portraitSvg, raceOfSeed, readLook } from "./pixelGuy";
import { isRaceId, RACES, seedWithRace } from "./pixelRaces";
import type { YourGuy } from "./yourGuy";

const RACES_SETTING = "officeSim.races";

const racesOn = () => vscode.workspace.getConfiguration().get<boolean>(RACES_SETTING, true);

// What activate() returns. Every input is checked: a bad value is ignored, never thrown on.
export function createOfficeApi(office: OfficePanelProvider, director: OfficeDirector, yourGuy: YourGuy): OfficeSimulationApi {
  const openEmitter = new vscode.EventEmitter<void>();
  office.onDidBecomeReady(() => openEmitter.fire());
  return {
    apiVersion: 1,
    setAgents(agents) {
      const { agents: inputs, focusedId } = agentsFromHost(agents, racesOn());
      office.hostOwnsAgents = true;
      office.setAgents(inputs, focusedId);
    },
    setMainGuy(status) {
      office.hostOwnsMainGuy = true;
      office.setYouStatus(youStatusFromHost(status));
    },
    playEvent(kind, variant) {
      if (isEventKind(kind)) {
        director.playEvent(kind, Number.isInteger(variant) ? variant : undefined, true);
      }
    },
    setTint(index, burst = true) {
      if (Number.isInteger(index)) {
        director.setTint(index, burst !== false, true);
      }
    },
    takeOverEvents() {
      director.takeOver();
    },
    playShow(kind = "random") {
      office.playShow(isPerformanceKind(kind) ? kind : "random");
    },
    startInvasion(kind = "random") {
      office.playInvasion(isInvasionKind(kind) ? kind : "random");
    },
    sendVisitor(kind) {
      office.broadcast({ type: "visitor", kind: VISITOR_KINDS.some((visitor) => visitor.id === kind) ? kind : undefined });
    },
    say(agentId, text, seconds) {
      const line = lineFromHost(text, seconds);
      if (typeof agentId === "string" && line !== undefined) {
        office.broadcast({ type: "say", id: agentId, ...line });
      }
    },
    lookFromSeed: (seed) => pixelGuyLook(String(seed), racesOn()),
    races: () => RACES.map((race) => ({ id: race.id, label: race.label })),
    seedWithRace: (seed, race) => (isRaceId(race) ? seedWithRace(String(seed), race) : String(seed)),
    raceOfSeed: (seed) => raceOfSeed(String(seed), racesOn()),
    portraitSvg(look: OfficeLook, badge, dimmed = false) {
      const drawn = readLook(look, pixelGuyLook("portrait", false));
      const color = typeof badge?.color === "string" && /^#[0-9a-f]{6}$/i.test(badge.color) ? badge.color : undefined;
      return portraitSvg(drawn, color === undefined ? undefined : { color, pulse: badge?.pulse === true }, dimmed === true);
    },
    editLook(initial, title) {
      const start = readLook(initial, pixelGuyLook(typeof title === "string" ? title : "maker", racesOn()));
      return office.editLook(start, typeof title === "string" && title.trim() !== "" ? title.trim().slice(0, 60) : "Customize this guy");
    },
    attachView: (view) => office.attachView(view),
    onDidClickAgent: office.onDidClickAgent,
    onDidStartShow: office.onDidStartShow,
    onDidEndShow: office.onDidEndShow,
    onDidStartInvasion: office.onDidStartInvasion,
    onDidEndInvasion: office.onDidEndInvasion,
    onDidFinishEvent: office.onDidFinishEvent,
    onDidOpenView: openEmitter.event,
    onDidChangeYourLook: yourGuy.onDidChangeYourLook,
  };
}
