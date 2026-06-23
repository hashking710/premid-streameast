// Ambient declarations for globals injected by the PreMiD extension at runtime.
// These are NOT imported — Presence is a global available in the extension context.

declare enum ActivityType {
  Playing = 0,
  Streaming = 1,
  Listening = 2,
  Watching = 3,
  Competing = 5
}

interface PresenceData {
  type?: ActivityType;
  details?: string;
  state?: string;
  largeImageKey?: string;
  largeImageUrl?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageUrl?: string;
  smallImageText?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  buttons?: Array<{ label: string; url: string }>;
  instance?: boolean;
}

declare class Presence {
  constructor(options: { clientId: string });
  on(event: 'UpdateData', callback: () => void | Promise<void>): void;
  setActivity(data: PresenceData): Promise<void>;
  clearActivity(): void;
  getSetting<T extends string | boolean | number>(key: string): Promise<T>;
  getStrings<T extends Record<string, string>>(strings: T): Promise<{ [K in keyof T]: string }>;
}
