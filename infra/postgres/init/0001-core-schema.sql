CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_steps (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  step_order integer NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (project_id, step_order)
);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY,
  project_step_id uuid REFERENCES project_steps(id),
  content text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS checkpoint_answers (
  id uuid PRIMARY KEY,
  project_step_id uuid REFERENCES project_steps(id),
  answer jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parts_catalog (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  electrical_specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  datasheet_url text,
  source_url text,
  license text
);

CREATE TABLE IF NOT EXISTS user_inventory (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  part_id uuid REFERENCES parts_catalog(id),
  quantity integer NOT NULL DEFAULT 1,
  raw_label text
);

CREATE TABLE IF NOT EXISTS cad_assets (
  id uuid PRIMARY KEY,
  part_id uuid REFERENCES parts_catalog(id),
  file_path text NOT NULL,
  sha256 text NOT NULL,
  source_url text NOT NULL,
  license text NOT NULL,
  mating_features jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS embeddings (
  id uuid PRIMARY KEY,
  source_id text NOT NULL,
  content text NOT NULL,
  citation jsonb NOT NULL,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assembly_transforms (
  id uuid PRIMARY KEY,
  project_step_id uuid REFERENCES project_steps(id),
  part_id uuid REFERENCES parts_catalog(id),
  position_mm jsonb NOT NULL,
  quaternion jsonb NOT NULL,
  parent_frame text NOT NULL,
  coordinate_convention text NOT NULL DEFAULT 'z-up-parent-relative'
);
