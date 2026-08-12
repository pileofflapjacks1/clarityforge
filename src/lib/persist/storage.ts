/**
 * Local-first persistence.
 *
 * Settings and the live session live in localStorage. A mirror is also
 * written to IndexedDB so a larger export/import path has somewhere to grow.
 *
 * Nothing is sent to a server. Export is explicit and user-initiated.
 */

import type {
  DecisionRecord,
  Order,
  Fill,
  Portfolio,
  SessionLogEntry,
  Settings,
} from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const STORAGE_VERSION = 1;
const LS_PREFIX = "clarityforge:v1:";

export interface PersistedSession {
  version: number;
  savedAt: number;
  settings: Settings;
  onboardingComplete: boolean;
  frozen: boolean;
  trading: {
    portfolio: Portfolio;
    orders: Order[];
    fills: Fill[];
  };
  decisions: DecisionRecord[];
  log: SessionLogEntry[];
}

export function lsKey(name: string): string {
  return `${LS_PREFIX}${name}`;
}

export function loadJson<T>(name: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(lsKey(name));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(name: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(lsKey(name), JSON.stringify(value));
  } catch {
    // Quota or private mode — ignore; the live session still runs.
  }
}

export function loadSettings(): Settings {
  const raw = loadJson<Partial<Settings>>("settings", {});
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(raw.thresholds ?? {}) },
    enabledSymbols: raw.enabledSymbols?.length
      ? raw.enabledSymbols
      : DEFAULT_SETTINGS.enabledSymbols,
  };
}

export function saveSettings(settings: Settings): void {
  saveJson("settings", settings);
}

export function loadOnboardingComplete(): boolean {
  return loadJson("onboarding", false);
}

export function saveOnboardingComplete(done: boolean): void {
  saveJson("onboarding", done);
}

export function loadSession(): PersistedSession | null {
  return normalizePersisted(loadJson<unknown>("session", null));
}

export function saveSession(session: PersistedSession): void {
  saveJson("session", session);
  void idbSet("session", session);
}

export function clearAllLocalData(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX)) keys.push(k);
  }
  for (const k of keys) localStorage.removeItem(k);
  void idbClear();
}

export function serializeExport(session: PersistedSession): string {
  return JSON.stringify({ ...session, exportedAt: Date.now() }, null, 2);
}

export function parseImport(text: string): PersistedSession | null {
  try {
    return normalizePersisted(JSON.parse(text));
  } catch {
    return null;
  }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Reject truncated / empty blobs so the desk never hydrates undefined cash/orders. */
export function normalizePersisted(raw: unknown): PersistedSession | null {
  if (!isRecord(raw)) return null;
  const settingsIn = raw.settings;
  const tradingIn = raw.trading;
  if (!isRecord(settingsIn) || !isRecord(tradingIn)) return null;

  const portfolioIn = tradingIn.portfolio;
  if (!isRecord(portfolioIn)) return null;
  if (!isFiniteNumber(portfolioIn.cash) || !isFiniteNumber(portfolioIn.startingCash)) return null;
  if (!isFiniteNumber(portfolioIn.realizedPnl)) return null;
  if (!Array.isArray(portfolioIn.positions)) return null;
  if (!Array.isArray(tradingIn.orders) || !Array.isArray(tradingIn.fills)) return null;

  const decisions = Array.isArray(raw.decisions) ? (raw.decisions as DecisionRecord[]) : [];
  const log = Array.isArray(raw.log) ? (raw.log as SessionLogEntry[]) : [];

  const enabled = Array.isArray(settingsIn.enabledSymbols)
    ? (settingsIn.enabledSymbols as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(settingsIn as Partial<Settings>),
      thresholds: {
        ...DEFAULT_SETTINGS.thresholds,
        ...(isRecord(settingsIn.thresholds)
          ? (settingsIn.thresholds as unknown as Partial<Settings["thresholds"]>)
          : {}),
      },
      enabledSymbols: enabled.length ? enabled : DEFAULT_SETTINGS.enabledSymbols,
    },
    onboardingComplete: Boolean(raw.onboardingComplete),
    frozen: Boolean(raw.frozen),
    trading: {
      portfolio: {
        cash: portfolioIn.cash,
        startingCash: portfolioIn.startingCash,
        realizedPnl: portfolioIn.realizedPnl,
        positions: portfolioIn.positions as Portfolio["positions"],
      },
      orders: tradingIn.orders as Order[],
      fills: tradingIn.fills as Fill[],
    },
    decisions,
    log,
  };
}

const IDB_NAME = "clarityforge";
const IDB_STORE = "kv";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  const value = await new Promise<T | null>((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  return value;
}

async function idbClear(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}
