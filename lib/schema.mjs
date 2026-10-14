// Single source of truth for the database schema (shared by lib/store.js and scripts/db-init.mjs).
export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS responses (
     id          BIGSERIAL PRIMARY KEY,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     ts          BIGINT      NOT NULL,
     version     TEXT        NOT NULL,
     zone        TEXT        NOT NULL,
     zone2       TEXT,
     level       SMALLINT    NOT NULL,
     tier        TEXT,
     x           SMALLINT,
     y           SMALLINT,
     readiness   SMALLINT,
     pct         JSONB       NOT NULL DEFAULT '{}'::jsonb,
     friction    JSONB       NOT NULL DEFAULT '[]'::jsonb,
     answers     JSONB       NOT NULL DEFAULT '{}'::jsonb,
     notes       JSONB       NOT NULL DEFAULT '{}'::jsonb,
     name        TEXT        NOT NULL,
     email       TEXT        NOT NULL,
     country     TEXT,
     phone       TEXT,
     interest    TEXT,
     consent     BOOLEAN     NOT NULL DEFAULT false,
     user_agent  TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS responses_dedupe_idx ON responses (email, ts, version)`,
  `CREATE INDEX IF NOT EXISTS responses_created_idx ON responses (created_at DESC)`,
];
