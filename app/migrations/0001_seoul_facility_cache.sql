-- Standalone database 'dongjak-seoul-facilities', not the existing Supabase store.
CREATE TABLE IF NOT EXISTS seoul_facilities (
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL, name TEXT NOT NULL,
 category TEXT NOT NULL, lng REAL NOT NULL, lat REAL NOT NULL,
 address TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
 website TEXT NOT NULL DEFAULT '', source TEXT NOT NULL, updated TEXT NOT NULL DEFAULT '',
 run_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seoul_category ON seoul_facilities(category);
CREATE INDEX IF NOT EXISTS idx_seoul_bounds ON seoul_facilities(lng,lat);
CREATE INDEX IF NOT EXISTS idx_seoul_source_run ON seoul_facilities(source_id,run_id);
CREATE TABLE IF NOT EXISTS seoul_facility_sync (
 source_id TEXT PRIMARY KEY, last_success TEXT, last_attempt TEXT,
 row_count INTEGER NOT NULL DEFAULT 0, received_count INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'pending', detail TEXT NOT NULL DEFAULT ''
);
