export class ProviderReadyGate {
  private ready = false;
  private readyListeners = new Set<() => void>();
  private errorListeners = new Set<(message: string) => void>();

  get isReady(): boolean {
    return this.ready;
  }

  reset(): void {
    this.ready = false;
  }

  markReady(): void {
    this.ready = true;
    for (const listener of this.readyListeners) listener();
  }

  fail(message: string): void {
    this.ready = false;
    for (const listener of this.errorListeners) listener(message);
  }

  onReady(callback: () => void): () => void {
    if (this.ready) {
      queueMicrotask(() => callback());
    }
    this.readyListeners.add(callback);
    return () => this.readyListeners.delete(callback);
  }

  onError(callback: (message: string) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  waitUntilReady(timeoutMs = 20000): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        offReady();
        offError();
        reject(new Error("Provider ready timeout"));
      }, timeoutMs);

      const offReady = this.onReady(() => {
        clearTimeout(timer);
        offError();
        resolve();
      });

      const offError = this.onError((message) => {
        clearTimeout(timer);
        offReady();
        reject(new Error(message));
      });
    });
  }
}
