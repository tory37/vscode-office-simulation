// A small stand-in for the `vscode` module, enough to run the extension side in unit tests. Tests reach its state
// through `fake`.

type Listener<T> = (value: T) => void;

export class EventEmitter<T> {
  private listeners: Listener<T>[] = [];
  event = (listener: Listener<T>) => {
    this.listeners.push(listener);
    return new Disposable(() => (this.listeners = this.listeners.filter((other) => other !== listener)));
  };
  fire(value: T): void {
    this.listeners.forEach((listener) => listener(value));
  }
  dispose(): void {
    this.listeners = [];
  }
}

export class Disposable {
  constructor(private readonly onDispose: () => void = () => undefined) {}
  dispose(): void {
    this.onDispose();
  }
}

export class Uri {
  constructor(readonly fsPath: string, readonly query = "") {}
  static joinPath(base: Uri, ...parts: string[]): Uri {
    return new Uri([base.fsPath, ...parts].join("/"));
  }
  static file(path: string): Uri {
    return new Uri(path);
  }
  with(change: { query?: string }): Uri {
    return new Uri(this.fsPath, change.query ?? this.query);
  }
  toString(): string {
    return `file://${this.fsPath}${this.query ? `?${this.query}` : ""}`;
  }
}

export const ConfigurationTarget = { Global: 1 };
export const QuickPickItemKind = { Separator: -1 };

const configChange = new EventEmitter<{ affectsConfiguration: (key: string) => boolean }>();

export const fake = {
  settings: new Map<string, unknown>(),
  commands: [] as { command: string; args: unknown[] }[],
  registered: new Map<string, (...args: unknown[]) => unknown>(),
  setSetting(key: string, value: unknown): void {
    this.settings.set(key, value);
    configChange.fire({ affectsConfiguration: (changed) => key === changed || key.startsWith(`${changed}.`) });
  },
  reset(): void {
    this.settings.clear();
    this.commands = [];
    this.registered.clear();
  },
};

export const workspace = {
  getConfiguration: () => ({
    get: <T>(key: string, fallback?: T) => (fake.settings.has(key) ? (fake.settings.get(key) as T) : fallback),
    update: async (key: string, value: unknown) => fake.setSetting(key, value),
    inspect: (key: string) => ({ globalValue: fake.settings.get(key) }),
  }),
  onDidChangeConfiguration: configChange.event,
};

export const commands = {
  executeCommand: async (command: string, ...args: unknown[]) => {
    fake.commands.push({ command, args });
  },
  registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => {
    fake.registered.set(command, handler);
    return new Disposable(() => fake.registered.delete(command));
  },
};

export const window = {
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
  registerWebviewViewProvider: () => new Disposable(),
};

// A webview view whose posted messages the test can read, and that the test can send messages from.
export class FakeWebviewView {
  readonly posted: { type?: string; [key: string]: unknown }[] = [];
  visible = true;
  private readonly received = new EventEmitter<unknown>();
  private readonly disposed = new EventEmitter<void>();
  readonly webview = {
    options: {},
    html: "",
    cspSource: "fake-csp",
    asWebviewUri: (uri: Uri) => uri,
    postMessage: async (message: { type?: string }) => {
      this.posted.push(message);
      return true;
    },
    onDidReceiveMessage: this.received.event,
  };
  onDidDispose = this.disposed.event;
  send(message: unknown): void {
    this.received.fire(message);
  }
  dispose(): void {
    this.disposed.fire();
  }
  last(type: string): { [key: string]: unknown } | undefined {
    return [...this.posted].reverse().find((message) => message.type === type);
  }
}
