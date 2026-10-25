-- Schema for members, meters, readings and the ingest audit trail.
-- Safe to re-run: every statement uses IF NOT EXISTS.
-- Tables are created in dependency order (a table must exist before another references it).

CREATE TABLE IF NOT EXISTS members (
  id   text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS meters (
  id           text PRIMARY KEY,
  member_id    text NOT NULL REFERENCES members (id),
  fuel         text NOT NULL CHECK (fuel IN ('electricity', 'gas')),
  unit         text NOT NULL CHECK (unit IN ('kWh', 'm3')),
  installed_on date NOT NULL,
  is_public    boolean NOT NULL DEFAULT false
);

-- One row per execution of the ingest. Counts always sum to rows_read.
CREATE TABLE IF NOT EXISTS ingest_runs (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_name   text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,                         -- null while running, or if the run crashed
  rows_read   integer NOT NULL DEFAULT 0,
  inserted    integer NOT NULL DEFAULT 0,          -- new reading_id
  updated     integer NOT NULL DEFAULT 0,          -- same reading_id, different value; later one wins
  unchanged   integer NOT NULL DEFAULT 0,          -- already stored and identical (typical on a re-run)
  rejected    integer NOT NULL DEFAULT 0,          -- did not land; reason in ingest_issues
  CHECK (finished_at IS NULL OR rows_read = inserted + updated + unchanged + rejected)
);

CREATE TABLE IF NOT EXISTS readings (
  reading_id       text PRIMARY KEY,
  meter_id         text NOT NULL REFERENCES meters (id),
  taken_at         date NOT NULL,
  value            numeric(12, 2) NOT NULL CHECK (value >= 0),
  source           text NOT NULL,
  verified         boolean NOT NULL,
  loaded_by_run_id integer NOT NULL REFERENCES ingest_runs (id), -- changes only when the value changes
  UNIQUE (meter_id, taken_at)
);

-- Every row the ingest had to repair or reject, kept as it arrived.
-- reading_id is deliberately not a foreign key: rejected rows never reach readings,
-- and some rows have no usable reading_id at all.
CREATE TABLE IF NOT EXISTS ingest_issues (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingest_run_id integer NOT NULL REFERENCES ingest_runs (id),
  line_number   integer NOT NULL,                  -- line in the CSV, header = 1
  reading_id    text,
  raw_row       jsonb NOT NULL,
  outcome       text NOT NULL CHECK (outcome IN ('repaired', 'rejected')),
  reason        text NOT NULL
);

-- Usage queries filter by meter and date range.
-- (UNIQUE (meter_id, taken_at) above already creates this index; ingest_issues needs its own.)
CREATE INDEX IF NOT EXISTS ingest_issues_run_idx ON ingest_issues (ingest_run_id);
