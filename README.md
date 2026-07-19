# 🎮 GameScribe — AI Game Script Generator

**GameScribe** is an AI-assisted creative narrative tool designed for game designers and writers. It takes a game idea and guided parameters (genre, tone, platform, reference games, branching endings count) along with a curated library of reference script exemplars, and automatically generates a complete, structured game narrative and design package (`STORY.md`, `CHARACTERS.md`, `DIALOGUE.md`, `QUESTS.md`, `ENDINGS.md`).

---

## 🌟 Key Features

- **Guided Multi-Step Narrative Form**: Customize genre, tone, target length, platform, reference games, and branching decision nodes.
- **RAG via PostgreSQL + `pgvector`**: Performs cosine similarity retrieval against a curated corpus of reference script exemplars to inform structure, dialogue formatting, and pacing.
- **Modular Multi-File Asset Package**:
  - `STORY.md` — Chapter outlines, scene progression, and decision branches.
  - `CHARACTERS.md` — Character dossiers, motivations, and relationships.
  - `DIALOGUE.md` — Screenplay-formatted scene scripts with audio and environmental cues.
  - `QUESTS.md` — Main quests, side objectives, and player choice triggers.
  - `ENDINGS.md` — Branching requirements and narrative resolution variants.
- **Section Revision Engine**: Regenerate or edit individual assets (e.g. just `CHARACTERS.md`) with natural language instructions without losing project context.
- **Per-Project Continuity Memory**: Maintains lore facts and character state across sessions.
- **Cross-Platform Mobile MVP**: Built with React Native and Expo Router, featuring encrypted Keychain/Keystore token storage via `expo-secure-store`.
- **Resilient Async Job Queues**: Background job handling with BullMQ & Redis, featuring polling hooks and inline fallbacks for mobile networks.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Mobile App (`apps/mobile`)** | React Native, Expo Managed Workflow, Expo Router (file-based navigation), Supabase RN Auth, `expo-secure-store` |
| **API Backend (`apps/api`)** | Node.js, Express, TypeScript, Zod, Helmet, `express-rate-limit`, Pino |
| **Database & Search** | PostgreSQL 16 with `pgvector` extension (`vector_cosine_ops`), Redis 7 |
| **AI Models & Embeddings** | Anthropic Claude 3.5 Sonnet SDK, Voyage AI (`voyage-3`) / OpenAI (`text-embedding-3-small`) |
| **Async Queues** | BullMQ & Redis (with dev inline fallback) |
| **Shared Types (`packages/shared-types`)** | TypeScript monorepo workspace package |

---

## 📁 Repository Structure

```
gamescribe/
├── apps/
│   ├── api/                     # Express.js API Backend (TypeScript)
│   │   ├── src/
│   │   │   ├── config/          # DB connections, env config, Redis
│   │   │   ├── controllers/     # Auth, Corpus, Project, Generation controllers
│   │   │   ├── middleware/      # Supabase Auth JWT, Zod validation, Rate limiting
│   │   │   ├── routes/          # Express API v1 routes
│   │   │   ├── services/        # Embedding, Retrieval, LLM Claude, Queue services
│   │   │   └── db/              # SQL init scripts & pgvector schema
│   │   └── prompts/             # Master system prompt & style guide templates
│   │
│   └── mobile/                  # React Native Mobile App (Expo Router)
│       ├── app/                 # File-based navigation (auth, dashboard, projects, generate)
│       ├── components/          # ScriptEditor, GenerateForm, Native UI components
│       ├── hooks/               # useProject, useGeneration resilient polling hook
│       └── lib/                 # Auth wrapper, API client with dynamic host resolution
│
├── packages/
│   └── shared-types/            # Shared DTOs and API contracts
│
├── scripts/
│   └── ingest-corpus.ts         # CLI script: Ingest, chunk, and embed reference scripts
│
└── docker-compose.yml           # Local Postgres 16 (pgvector) + Redis 7 setup
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- **Docker Desktop** (for PostgreSQL + `pgvector` and Redis)

---

### Step 1: Clone & Install Dependencies

```bash
git clone https://github.com/Torres0407/GameScribe.git
cd GameScribe
npm install
```

---

### Step 2: Configure Environment Variables

Copy the `.env.example` file to create `.env`:

```bash
cp .env.example .env
```

**`.env` Configuration Template:**
```ini
# Server Configuration
PORT=4000
NODE_ENV=development

# PostgreSQL + pgvector
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/gamescribe

# Redis (BullMQ queues)
REDIS_URL=redis://localhost:6379

# Supabase Auth
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# AI API Keys
ANTHROPIC_API_KEY=your-anthropic-api-key
VOYAGE_API_KEY=your-voyage-api-key
OPENAI_API_KEY=your-openai-api-key
```

---

### Step 3: Spin Up Infrastructure Containers

Start the PostgreSQL (pgvector) and Redis services via Docker Compose:

```bash
docker-compose up -d
```

---

### Step 4: Run Corpus Ingestion CLI

Seed reference script exemplars into the `pgvector` database:

```bash
npm run ingest
```

---

### Step 5: Launch Backend API

Start the Express API server in dev mode:

```bash
npm run dev:api
```
- API Endpoint: `http://localhost:4000/api/v1`
- Health Check: `http://localhost:4000/health`

---

### Step 6: Launch Mobile App (Expo)

In a separate terminal, launch the mobile developer server:

```bash
npm run dev:mobile
```

- Press **`w`** to open in **Web Browser**
- Press **`a`** to open in **Android Emulator**
- Press **`i`** to open in **iOS Simulator**
- Scan the QR code with the **Expo Go** app on your mobile device.

---

## 📡 API Endpoint Reference

All routes are prefixed with `/api/v1`. Authentication requires header `Authorization: Bearer <jwt>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register new user account |
| POST | `/auth/login` | Login and retrieve session JWT |
| POST | `/auth/logout` | Invalidate current session |
| GET | `/auth/me` | Fetch current user profile |

### Reference Corpus
| Method | Endpoint | Description |
|---|---|---|
| POST | `/corpus/scripts` | Upload and ingest reference script |
| GET | `/corpus/scripts` | List reference scripts (filter by genre) |
| GET | `/corpus/scripts/:id` | Fetch specific reference script details |
| DELETE | `/corpus/scripts/:id` | Remove script from corpus |
| POST | `/corpus/reindex` | Re-compute vector embeddings across whole corpus |

### Projects & Generation
| Method | Endpoint | Description |
|---|---|---|
| POST | `/projects` | Create a new game project |
| GET | `/projects` | List user's game projects |
| GET | `/projects/:id` | Fetch project + generated assets |
| PATCH | `/projects/:id` | Update project name, idea, genre, or metadata |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/generate` | Kick off async script package generation job |
| GET | `/projects/:id/status` | Poll status & progress of generation job |
| GET | `/projects/:id/assets` | List generated Markdown files |
| GET | `/projects/:id/assets/:assetName` | Fetch single asset content |
| POST | `/projects/:id/assets/:assetName/revise` | Regenerate/revise specific asset with instructions |

---

## 📄 License

MIT License. Developed for AI game script generation and creative narrative design workflows.
