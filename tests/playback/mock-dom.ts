/**
 * @internal Minimal browser DOM for playback contract tests in Node.
 */
export function installPlaybackMockDom(): void {
  const g = globalThis as typeof globalThis & {
    document?: Document;
    HTMLElement?: typeof HTMLElement;
  };

  if (g.document?.getElementById) return;

  const elements = new Map<string, MockElement>();

  class MockElement {
    tagName: string;
    style = { cssText: "" };
    children: MockElement[] = [];
    parent: MockElement | null = null;
    attributes = new Map<string, string>();
    private listeners = new Map<string, Set<() => void>>();
    src = "";
    isConnected = true;

    constructor(tagName: string) {
      this.tagName = tagName.toUpperCase();
      Object.defineProperty(this, "id", {
        set: (value: string) => {
          this.attributes.set("id", value);
          elements.set(value, this);
        },
        get: () => this.attributes.get("id") ?? "",
      });
    }

    setAttribute(name: string, value: string): void {
      this.attributes.set(name, value);
    }

    getAttribute(name: string): string | null {
      return this.attributes.get(name) ?? null;
    }

    appendChild(child: MockElement): MockElement {
      child.parent = this;
      this.children.push(child);
      return child;
    }

    remove(): void {
      this.isConnected = false;
      if (this.parent) {
        this.parent.children = this.parent.children.filter((c) => c !== this);
      }
    }

    querySelector(selector: string): MockElement | null {
      const all = this.querySelectorAll(selector);
      return all[0] ?? null;
    }

    querySelectorAll(selector: string): MockElement[] {
      if (selector === "iframe") {
        return this.collectDescendants().filter((el) => el.tagName === "IFRAME");
      }
      if (selector.includes("data-spotify-embed-host")) {
        return this.collectDescendants().filter((el) =>
          el.attributes.get("data-spotify-embed-host"),
        );
      }
      if (selector.includes("data-youtube-embed-host")) {
        return this.collectDescendants().filter((el) =>
          el.attributes.get("data-youtube-embed-host"),
        );
      }
      if (selector.startsWith("#")) {
        const id = selector.slice(1);
        const el = elements.get(id);
        return el ? [el] : [];
      }
      return [];
    }

    private collectDescendants(): MockElement[] {
      const out: MockElement[] = [];
      for (const child of this.children) {
        out.push(child, ...child.collectDescendants());
      }
      return out;
    }

    addEventListener(event: string, handler: () => void): void {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event)!.add(handler);
    }

    removeEventListener(event: string, handler: () => void): void {
      this.listeners.get(event)?.delete(handler);
    }

    emit(event: string): void {
      for (const handler of this.listeners.get(event) ?? []) handler();
    }

    pause(): void {
      this.emit("pause");
    }

    async play(): Promise<void> {
      this.emit("play");
    }

    load(): void {
      this.emit("loadedmetadata");
      this.emit("canplay");
    }

    removeAttribute(): void {}
  }

  class MockDocument {
    head = new MockElement("head");
    body = new MockElement("body");

    getElementById(id: string): MockElement | null {
      return elements.get(id) ?? null;
    }

    createElement(tag: string): MockElement {
      return new MockElement(tag);
    }

    querySelector(selector: string): MockElement | null {
      const all = this.querySelectorAll(selector);
      return all[0] ?? null;
    }

    querySelectorAll(selector: string): MockElement[] {
      if (selector.startsWith("#")) {
        const id = selector.slice(1);
        const el = elements.get(id);
        return el ? [el] : [];
      }
      if (selector.startsWith("script[src=")) {
        const match = selector.match(/script\[src="([^"]+)"\]/);
        const src = match?.[1];
        if (!src) return [];
        return this.collectAllElements().filter(
          (el) => el.tagName === "SCRIPT" && el.attributes.get("src") === src,
        );
      }
      return this.body.querySelectorAll(selector);
    }

    private collectAllElements(): MockElement[] {
      const out: MockElement[] = [];
      const walk = (el: MockElement) => {
        out.push(el);
        for (const child of el.children) walk(child);
      };
      walk(this.head);
      walk(this.body);
      for (const el of elements.values()) {
        if (!out.includes(el)) out.push(el);
      }
      return out;
    }
  }

  const doc = new MockDocument();
  g.document = doc as unknown as Document;
  g.HTMLElement = MockElement as unknown as typeof HTMLElement;
  g.window = globalThis as typeof globalThis & Window;
  if (!(g.window as Window & { location?: Location }).location?.origin) {
    Object.defineProperty(g.window, "location", {
      value: { origin: "http://localhost" },
      writable: true,
      configurable: true,
    });
  }

  if (typeof g.requestAnimationFrame !== "function") {
    g.requestAnimationFrame = (cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 0) as unknown as number;
    g.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }

  const originalCreate = doc.createElement.bind(doc);
  doc.createElement = (tag: string) => {
    const el = originalCreate(tag);
    if (tag === "div") {
      const setAttr = el.setAttribute.bind(el);
      el.setAttribute = (name: string, value: string) => {
        setAttr(name, value);
        if (name === "id") elements.set(value, el);
      };
    }
    if (tag === "iframe") {
      Object.defineProperty(el, "src", {
        set(value: string) {
          el.attributes.set("src", value);
          queueMicrotask(() => el.emit("load"));
        },
        get() {
          return el.attributes.get("src") ?? "";
        },
      });
    }
    if (tag === "script") {
      Object.defineProperty(el, "src", {
        set(value: string) {
          el.attributes.set("src", value);
          if (value.includes("open.spotify.com/embed/iframe-api")) {
            queueMicrotask(() => {
              const w = globalThis as typeof globalThis & {
                onSpotifyIframeApiReady?: (api: {
                  createController: (
                    element: MockElement,
                    options: Record<string, unknown>,
                    callback: (controller: Record<string, unknown>) => void,
                  ) => void;
                }) => void;
              };
              w.onSpotifyIframeApiReady?.({
                createController(_element, _options, callback) {
                  const listeners = new Map<string, Set<() => void>>();
                  const controller = {
                    loadUri() {
                      queueMicrotask(() => {
                        for (const handler of listeners.get("ready") ?? []) handler();
                      });
                    },
                    play() {},
                    pause() {},
                    resume() {},
                    togglePlay() {},
                    seek() {},
                    destroy() {},
                    addListener(event: string, handler: () => void) {
                      if (!listeners.has(event)) listeners.set(event, new Set());
                      listeners.get(event)!.add(handler);
                      if (event === "ready") {
                        queueMicrotask(() => handler());
                      }
                    },
                    removeListener(event: string, handler: () => void) {
                      listeners.get(event)?.delete(handler);
                    },
                  };
                  queueMicrotask(() => {
                    callback(controller);
                  });
                },
              });
            });
            return;
          }
          if (value.includes("youtube.com/iframe_api")) {
            queueMicrotask(() => {
              const w = globalThis as typeof globalThis & {
                YT?: {
                  Player: new (
                    host: MockElement,
                    options: {
                      events?: {
                        onReady?: (event: { target: MockYouTubePlayer }) => void;
                        onStateChange?: (event: { data: number; target: MockYouTubePlayer }) => void;
                        onError?: (event: { data: number }) => void;
                      };
                    },
                  ) => MockYouTubePlayer;
                  PlayerState: Record<string, number>;
                };
                onYouTubeIframeAPIReady?: () => void;
              };

              const PlayerState = {
                UNSTARTED: -1,
                ENDED: 0,
                PLAYING: 1,
                PAUSED: 2,
                BUFFERING: 3,
                CUED: 5,
              };

              class MockYouTubePlayer {
                private options: {
                  events?: {
                    onReady?: (event: { target: MockYouTubePlayer }) => void;
                    onStateChange?: (event: { data: number; target: MockYouTubePlayer }) => void;
                    onError?: (event: { data: number }) => void;
                  };
                };
                currentTime = 0;
                duration = 3600;
                state = PlayerState.UNSTARTED;

                constructor(
                  _host: MockElement,
                  options: typeof this.options,
                ) {
                  this.options = options;
                  queueMicrotask(() => {
                    this.options.events?.onReady?.({ target: this });
                  });
                }

                playVideo(): void {
                  this.state = PlayerState.PLAYING;
                  this.options.events?.onStateChange?.({
                    data: PlayerState.PLAYING,
                    target: this,
                  });
                }

                pauseVideo(): void {
                  this.state = PlayerState.PAUSED;
                  this.options.events?.onStateChange?.({
                    data: PlayerState.PAUSED,
                    target: this,
                  });
                }

                stopVideo(): void {
                  this.state = PlayerState.ENDED;
                  this.currentTime = 0;
                }

                seekTo(seconds: number): void {
                  this.currentTime = seconds;
                  this.options.events?.onStateChange?.({
                    data: PlayerState.BUFFERING,
                    target: this,
                  });
                  queueMicrotask(() => {
                    this.options.events?.onStateChange?.({
                      data: PlayerState.PLAYING,
                      target: this,
                    });
                  });
                }

                getCurrentTime(): number {
                  return this.currentTime;
                }

                getDuration(): number {
                  return this.duration;
                }

                destroy(): void {}

                getPlayerState(): number {
                  return this.state;
                }
              }

              w.YT = {
                PlayerState,
                Player: MockYouTubePlayer,
              };
              w.onYouTubeIframeAPIReady?.();
            });
          }
        },
        get() {
          return el.attributes.get("src") ?? "";
        },
      });
    }
    if (tag === "audio") {
      Object.defineProperty(el, "currentTime", {
        value: 0,
        writable: true,
      });
    }
    return el;
  };
}
