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
      chatter: "tidy",
      talk: "normal",
      bubbleLook: "soft",
      races: true,
      focusedId: null,
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

    // What the Office posts back: "ready", and "open" with the clicked guy's id.
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
