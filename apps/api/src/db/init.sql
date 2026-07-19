-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mock / Mirror Supabase auth schema for standalone dev if needed
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default dev user for standalone development
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@gamescribe.local')
ON CONFLICT (id) DO NOTHING;

-- Users Profile
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO profiles (id, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Developer')
ON CONFLICT (id) DO NOTHING;

-- Reference Corpus (curated reference scripts)
CREATE TABLE IF NOT EXISTS reference_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  subgenre TEXT,
  tags TEXT[] DEFAULT '{}',
  raw_text TEXT NOT NULL,
  structured JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reference_scripts_embedding
  ON reference_scripts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_reference_scripts_genre ON reference_scripts (genre);
CREATE INDEX IF NOT EXISTS idx_reference_scripts_tags ON reference_scripts USING GIN (tags);

-- User Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  idea TEXT NOT NULL,
  genre TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id);

-- Generated Assets per project
CREATE TABLE IF NOT EXISTS project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, asset_name, version)
);
CREATE INDEX IF NOT EXISTS idx_project_assets_project ON project_assets (project_id);

-- Project Memory (lore, character facts, established continuity)
CREATE TABLE IF NOT EXISTS project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, key)
);
