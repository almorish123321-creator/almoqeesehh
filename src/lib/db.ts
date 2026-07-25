/**
 * Database module — uses Vercel Postgres directly.
 * Works locally (if POSTGRES_URL is set) and on Vercel.
 *
 * Tables: users, nationalities, hospitals, doctors, sick_leaves
 *
 * Setup: run `bun run db:init` once after setting env vars, or execute
 * schema.sql from Vercel Dashboard -> Storage -> Query.
 *
 * DEMO_MODE: when env var DEMO_MODE=true is set, the app uses an in-memory
 * store for local preview/demo only. In production on Vercel, leave it
 * unset to use real Vercel Postgres.
 */

import { sql as vercelSql } from "@vercel/postgres";
import { put, list } from "@vercel/blob";
import fs from "fs";
import path from "path";

const DEMO_MODE = process.env.DEMO_MODE === "true";
const IS_VERCEL = !!process.env.VERCEL;

export const sql: any = vercelSql;

// =================================================================
//  In-memory store (DEMO_MODE only — NOT for production)
//  NOTE: in dev, each API route may run in a separate worker, so we
//  persist DEMO records to a JSON file on disk to share state.
// =================================================================
interface DemoRecord {
  id: number;
  gsl_code: string;
  identity_number: string;
  name_ar: string;
  name_en: string | null;
  date_from: string;
  date_to: string;
  day_count: number;
  issue_date: string | null;
  time_from: string | null;
  nationality_ar: string | null;
  nationality_en: string | null;
  employer: string | null;
  employer_en: string | null;
  doctor_name_ar: string | null;
  doctor_name_en: string | null;
  doctor_specialty_ar: string | null;
  doctor_specialty_en: string | null;
  hospital_name_ar: string | null;
  hospital_name_en: string | null;
  license_number: string | null;
  leave_type: string;
  created_at: string;
}

// Path to the DEMO JSON file (only used when DEMO_MODE=true AND not on Vercel)
// On Vercel, the filesystem is read-only except for /tmp, AND /tmp is per-instance,
// so we use Vercel Blob storage instead to share state across serverless instances.
const DEMO_FILE = IS_VERCEL
  ? "/tmp/.demo-store.json"  // fallback only — Blob is preferred on Vercel
  : path.join(process.cwd(), ".demo-store.json");

// In Vercel Blob, we store each record as a separate JSON file under the
// "sick-leaves/" prefix. The pathname is `sick-leaves/{id}.json`. This lets
// us list all records and read them individually.
const BLOB_PREFIX = "sick-leaves/";

function readDemoStore(): DemoRecord[] {
  if (IS_VERCEL) {
    // Synchronous wrapper is not possible for async Blob calls — caller must
    // use readDemoStoreAsync instead.
    return [];
  }
  try {
    if (fs.existsSync(DEMO_FILE)) {
      const raw = fs.readFileSync(DEMO_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as DemoRecord[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeDemoStore(records: DemoRecord[]): void {
  if (IS_VERCEL) {
    // No-op for sync function on Vercel; use writeDemoStoreAsync instead.
    return;
  }
  try {
    fs.writeFileSync(DEMO_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch {
    /* ignore */
  }
}

// =================================================================
//  Async Blob-backed DEMO store (used on Vercel)
// =================================================================

/**
 * Read all DEMO records from Vercel Blob storage.
 * Each record is stored as `sick-leaves/{id}.json`.
 */
async function readDemoStoreAsync(): Promise<DemoRecord[]> {
  if (!IS_VERCEL) {
    return readDemoStore();
  }
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
    const records: DemoRecord[] = [];
    for (const blob of blobs) {
      try {
        const res = await fetch(blob.url);
        if (res.ok) {
          const text = await res.text();
          records.push(JSON.parse(text) as DemoRecord);
        }
      } catch {
        /* skip malformed blob */
      }
    }
    return records;
  } catch {
    return [];
  }
}

/**
 * Write a single DEMO record to Vercel Blob storage.
 */
async function writeDemoRecordAsync(record: DemoRecord): Promise<void> {
  if (!IS_VERCEL) {
    const store = readDemoStore();
    const idx = store.findIndex((r) => r.id === record.id);
    if (idx >= 0) store[idx] = record;
    else store.push(record);
    writeDemoStore(store);
    return;
  }
  try {
    const pathname = `${BLOB_PREFIX}${record.id}.json`;
    await put(pathname, JSON.stringify(record, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } catch (e) {
    console.error("[demo] writeDemoRecordAsync error:", e);
  }
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

/**
 * DEMO only: insert or update a sick leave record.
 * On Vercel: persisted to Vercel Blob storage (shared across instances).
 * Locally: persisted to a JSON file.
 * Returns the saved record (with id).
 */
export async function demoUpsertLeave(input: Omit<DemoRecord, "id" | "created_at">): Promise<DemoRecord> {
  const store = await readDemoStoreAsync();
  const existingIdx = store.findIndex(
    (r) => r.gsl_code === input.gsl_code && r.identity_number === input.identity_number,
  );
  if (existingIdx >= 0) {
    const updated = { ...store[existingIdx], ...input };
    await writeDemoRecordAsync(updated);
    return updated;
  }
  const nextId = store.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  const record: DemoRecord = {
    ...input,
    id: nextId,
    created_at: new Date().toISOString(),
  };
  await writeDemoRecordAsync(record);
  return record;
}

/**
 * DEMO only: search sick leave records.
 * On Vercel: reads from Vercel Blob storage (shared across instances).
 * Locally: reads from JSON file.
 */
export async function demoSearchLeave(opts: {
  gsl?: string;
  id?: string;
  q?: string;
  limit?: number;
}): Promise<DemoRecord[]> {
  const { gsl, id, q, limit = 50 } = opts;
  let results = [...(await readDemoStoreAsync())];
  if (gsl) {
    results = results.filter((r) => r.gsl_code.toLowerCase().includes(gsl.toLowerCase()));
  } else if (id) {
    results = results.filter((r) =>
      r.identity_number.toLowerCase().includes(id.toLowerCase()),
    );
  } else if (q) {
    const ql = q.toLowerCase();
    results = results.filter(
      (r) =>
        r.gsl_code.toLowerCase().includes(ql) ||
        r.identity_number.toLowerCase().includes(ql) ||
        (r.name_ar || "").toLowerCase().includes(ql) ||
        (r.name_en || "").toLowerCase().includes(ql),
    );
  }
  results.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return results.slice(0, limit);
}

// =================================================================
//  SQL SCHEMA — runs once during database setup
// =================================================================

export const SCHEMA_SQL = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nationalities
CREATE TABLE IF NOT EXISTS nationalities (
  id SERIAL PRIMARY KEY,
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  type VARCHAR(255) DEFAULT 'private',
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  logo TEXT,
  city VARCHAR(255),
  region VARCHAR(255),
  license_number VARCHAR(255),
  user_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  specialty_ar VARCHAR(255),
  specialty_en VARCHAR(255),
  doctor_group_id VARCHAR(255),
  hospital_id INT REFERENCES hospitals(id),
  user_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sick Leaves (main table)
CREATE TABLE IF NOT EXISTS sick_leaves (
  id SERIAL PRIMARY KEY,
  gsl_code VARCHAR(255) NOT NULL,
  identity_number VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  day_count INT NOT NULL,
  issue_date DATE,
  time_from VARCHAR(50),
  nationality_id INT REFERENCES nationalities(id),
  nationality_ar VARCHAR(255),
  nationality_en VARCHAR(255),
  employer VARCHAR(255),
  employer_en VARCHAR(255),
  doctor_id INT REFERENCES doctors(id),
  doctor_name_ar VARCHAR(255),
  doctor_name_en VARCHAR(255),
  doctor_specialty_ar VARCHAR(255),
  doctor_specialty_en VARCHAR(255),
  hospital_id INT REFERENCES hospitals(id),
  hospital_name_ar VARCHAR(255),
  hospital_name_en VARCHAR(255),
  license_number VARCHAR(255),
  leave_type VARCHAR(100) DEFAULT 'sick',
  hijri_admission_date VARCHAR(50),
  hijri_discharge_date VARCHAR(50),
  user_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sick_leaves_gsl ON sick_leaves(gsl_code);
CREATE INDEX IF NOT EXISTS idx_sick_leaves_identity ON sick_leaves(identity_number);
CREATE INDEX IF NOT EXISTS idx_sick_leaves_name ON sick_leaves(name_ar);
`;

/**
 * Initialize database schema — call once during setup.
 * Safe to call repeatedly (CREATE TABLE IF NOT EXISTS).
 */
export async function initDatabase(): Promise<void> {
  await sql.query(SCHEMA_SQL);
  console.log("[db] Schema initialized successfully");
}

// =================================================================
//  Helpers
// =================================================================

export function emptyToNull(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  const emptyIndicators = new Set([
    "",
    "غير محدد",
    "فارغ",
    "-",
    "None",
    "none",
    "null",
    "NULL",
    "Not Specified",
    "N/A",
    "n/a",
    "undefined",
  ]);
  return emptyIndicators.has(t) ? null : t;
}

// =================================================================
//  Types
// =================================================================

export interface SickLeaveRecord {
  id: number;
  gsl_code: string;
  identity_number: string;
  name_ar: string;
  name_en: string | null;
  date_from: string;
  date_to: string;
  day_count: number;
  issue_date: string | null;
  time_from: string | null;
  nationality_ar: string | null;
  nationality_en: string | null;
  employer: string | null;
  employer_en: string | null;
  doctor_name_ar: string | null;
  doctor_name_en: string | null;
  doctor_specialty_ar: string | null;
  doctor_specialty_en: string | null;
  hospital_name_ar: string | null;
  hospital_name_en: string | null;
  license_number: string | null;
  leave_type: string;
  created_at: string;
}
