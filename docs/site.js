// Live Offices for the docs site. Each demo is the real Office bundle in an iframe (office.html), driven with the
// same messages the extension sends its webview. A demo only runs while it's near the screen, so a long page doesn't
// run a dozen rooms at once; scrolling back rebuilds it from its current state.
(function () {
  const SITE = window.OFFICE_SITE;
  const demos = new Map();
  let nextId = 0;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (data === null || typeof data !== "object" || typeof data.officeFrame !== "string") {
      return;
    }
    demos.get(data.officeFrame)?.receive(data.message);
  });

  function baseState() {
    return {
      type: "office",
      scene: "office",
      agents: [],
      you: { ...SITE.defaultLook },
      critters: true,
      fliers: true,
      dayNight: true,
      visitors: "normal",
      performances: "off",
      invasions: "off",
      quiet: false,
      sky: null,
      chatter: "tidy",
      talk: "normal",
      activities: "some",
      activitySwaps: "normal",
      bubbleLook: "soft",
      races: true,
      focusedId: null,
      youStatus: "auto",
    };
  }

  class OfficeDemo {
    constructor(host, state = {}) {
      this.id = `demo-${nextId++}`;
      this.host = host;
      this.state = { ...baseState(), ...state };
      this.listeners = new Map();
      this.frame = undefined;
      this.ready = false;
      demos.set(this.id, this);
      host.classList.add("office-frame");
      const observer = new IntersectionObserver((entries) => {
        const near = entries.some((entry) => entry.isIntersecting);
        if (near && this.frame === undefined) {
          this.load();
        } else if (!near && this.frame !== undefined) {
          this.unload();
        }
      }, { rootMargin: "300px 0px" });
      observer.observe(host);
    }

    load() {
      this.ready = false;
      this.frame = document.createElement("iframe");
      this.frame.src = `office.html#${this.id}`;
      this.frame.title = "A live Office";
      this.host.appendChild(this.frame);
    }

    unload() {
      this.frame.remove();
      this.frame = undefined;
      this.ready = false;
    }

    receive(message) {
      if (message?.type === "ready") {
        this.ready = true;
        this.post(this.state);
      }
      (this.listeners.get(message?.type) ?? []).forEach((listener) => listener(message));
    }

    // What the Office posts back: "ready", "click" (id), "showStart" and "showEnd" (kind), "invasionStart" and
    // "invasionEnd" (kind), and "eventEnd" (kind).
    on(type, listener) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }

    post(message) {
      if (this.ready) {
        this.frame.contentWindow.postMessage(message, "*");
      }
    }

    set(patch) {
      Object.assign(this.state, patch);
      this.post(this.state);
    }

    sceneEvent(kind) {
      this.post({ type: "sceneEvent", kind, variant: Math.floor(Math.random() * SITE.eventVariants) });
    }

    show(kind) {
      this.post({ type: "performance", kind });
    }

    tint(index, burst = true) {
      this.post({ type: "tint", index, burst });
    }

    // The same calls as the extension's API, on this demo, so examples read like real host code.
    get api() {
      const demo = this;
      const statuses = { busy: "working", idle: "idle", asleep: "asleep" };
      return {
        setAgents(agents) {
          const focused = agents.find((agent) => agent.highlighted);
          demo.set({
            agents: agents.map((agent) => ({ id: agent.id, seed: agent.seed ?? agent.id, status: statuses[agent.status], title: agent.title ?? "", ...(agent.look ? { look: agent.look } : {}) })),
            focusedId: focused?.id ?? null,
          });
        },
        setMainGuy: (status) => demo.set({ youStatus: status }),
        playEvent: (kind, variant) => demo.post({ type: "sceneEvent", kind, variant: variant ?? Math.floor(Math.random() * SITE.eventVariants) }),
        setTint: (index, burst = true) => demo.tint(index, burst),
        playShow: (kind = "random") => demo.show(kind),
        startInvasion: (kind = "random") => demo.post({ type: "invasion", kind }),
        sendVisitor: (kind) => demo.post({ type: "visitor", kind }),
        say: (id, text, seconds = 3) => demo.post({ type: "say", id, text, seconds }),
        editLook: (look, title) => new Promise((resolve) => {
          const requestId = String(Math.random());
          demo.on("makerDone", (message) => {
            if (message.requestId === requestId) resolve(message.look ?? undefined);
          });
          demo.post({ type: "maker", requestId, look, title });
        }),
        onDidClickAgent: (listener) => demo.on("click", (message) => listener(message.id)),
        onDidStartShow: (listener) => demo.on("showStart", (message) => listener(message.kind)),
        onDidEndShow: (listener) => demo.on("showEnd", (message) => listener(message.kind)),
        onDidStartInvasion: (listener) => demo.on("invasionStart", (message) => listener(message.kind)),
        onDidEndInvasion: (listener) => demo.on("invasionEnd", (message) => listener(message.kind)),
        onDidFinishEvent: (listener) => demo.on("eventEnd", (message) => listener(message.kind)),
        // The page has no Trigger Event button, so nothing asks.
        onDidRequestEvent: () => undefined,
      };
    }
  }

  function randomSeed() {
    return Math.random().toString(16).slice(2, 18);
  }

  const NAMES = ["Fix the login bug", "Write the release notes", "Refactor the parser", "Add dark mode", "Speed up the build",
    "Triage the backlog", "Port the tests", "Review the PR", "Draft the RFC", "Clean up the CSS", "Chase a flaky test", "Ship the hotfix"];

  function worker(status, index) {
    return { id: `worker-${randomSeed()}`, seed: randomSeed(), status, title: NAMES[index % NAMES.length] };
  }

  function workers(statuses) {
    return statuses.map((status, index) => worker(status, index));
  }

  window.OfficeSite = { OfficeDemo, worker, workers, randomSeed, SITE };
})();
