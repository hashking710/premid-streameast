// Ambient declarations for globals injected by the PreMiD extension at runtime.
// These are NOT imported — Presence is a global available in the extension context.
//
// ActivityType is NOT declared here — it is defined as a plain const object in
// presence.ts so that esbuild emits the numeric literals instead of runtime
// references to a non-existent global.

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
