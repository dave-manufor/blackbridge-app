class WebStorageService {
  protected prefix: string = "blackbridge.";
  private storage: Storage;

  constructor(type: "local" | "session" = "local") {
    this.storage = type === "local" ? localStorage : sessionStorage;
  }

  setItem<T>(key: string, value: T): void {
    try {
      this.storage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error saving ${key}`, err);
    }
  }

  getItem<T>(key: string): T | null {
    try {
      const value = this.storage.getItem(this.prefix + key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (err) {
      console.error(`Error reading ${key}`, err);
      return null;
    }
  }

  removeItem(key: string): void {
    this.storage.removeItem(this.prefix + key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export class LocalStorageService extends WebStorageService {
  constructor() {
    super("local");
  }
}

export class SessionStorageService extends WebStorageService {
  constructor() {
    super("session");
  }
}
