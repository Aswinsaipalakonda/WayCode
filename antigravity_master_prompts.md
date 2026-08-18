🚀 WayCode: Complete Master Antigravity Prompt Suite (Setup to Deployment)

This document contains the step-by-step, production-ready execution prompts for building WayCode—an asynchronous, intent-driven mobile gateway for offloading software engineering tasks to a persistent cloud AI daemon.

📌 PHASE 1: Project Initialization, UI Setup & Local Infrastructure

Act as a Senior Frontend Architect and DevOps Engineer. Initialize the baseline foundation for WayCode.

1. **Next.js & Tailwind Initialization:**
   - Initialize a Next.js (App Router, TypeScript) application named `waycode`.
   - Configure Tailwind CSS with the brand palette:
     - Electric Cobalt Blue primary: `#0066FF`
     - Light surface background: `#FAFAFA`
     - Dark surface background: `#090D16` / `#0D1117`
     - Dark card surface: `#161B22` / `#1E293B`
   - Configure `Inter` as the primary UI font and `JetBrains Mono` for code/log blocks.

2. **Shadcn UI Installation:**
   - Install and configure Shadcn UI with CSS variables enabled.
   - Install key UI components: `button`, `dialog`, `drawer`, `dropdown-menu`, `toast`, `accordion`, `tabs`, `switch`, `badge`, `tooltip`, `input`, `textarea`, `avatar`.

3. **PWA & Mobile Manifest Configuration:**
   - Configure `@ducanh2912/next-pwa` or native Next.js `manifest.json` for full PWA capabilities.
   - Set viewport configurations for mobile devices (disable horizontal overflow, enable touch targets >= 44x44px).

4. **Local Infrastructure Script (Windows Docker Desktop):**
   - Create a helper script `scripts/docker-dev.sh` and `docker-compose.yml` for local Redis running on port `6379`.
   - Provide explicit commands for running Docker Desktop on Windows: `docker run -d --name waycode-redis -p 6379:6379 redis:alpine`.

Provide clean, modular code with clear folder organization and no placeholders.


📌 PHASE 2: Supabase BaaS Infrastructure & Database Schema

Act as a Principal Database Architect. Build the Supabase backend configuration for WayCode.

1. **SQL Migration Schema (`supabase/migrations/01_init.sql`):**
   - Create table `user_settings`:
     - `id` (uuid, primary key, default `gen_random_uuid()`)
     - `user_id` (uuid, references `auth.users(id)` ON DELETE CASCADE, unique)
     - `provider` (text, default `'openrouter'`)
     - `api_key` (text, encrypted or base string)
     - `selected_model` (text, default `'google/gemini-2.0-flash-exp:free'`)
     - `created_at`, `updated_at` (timestamptz)
   - Create table `repositories`:
     - `id` (uuid, primary key)
     - `user_id` (uuid, references `auth.users`)
     - `repo_name` (text, e.g. "username/repository")
     - `default_branch` (text, default `'main'`)
     - `created_at` (timestamptz)
   - Create table `task_jobs`:
     - `id` (uuid, primary key, default `gen_random_uuid()`)
     - `user_id` (uuid, references `auth.users`)
     - `repo_id` (uuid, references `repositories(id)`)
     - `prompt` (text)
     - `status` (text: `'queued'`, `'processing'`, `'verifying'`, `'completed'`, `'failed'`, `'rejected'`)
     - `diff_content` (text, nullable)
     - `branch_name` (text, nullable)
     - `created_at`, `updated_at` (timestamptz)
   - Create table `task_logs`:
     - `id` (bigserial, primary key)
     - `task_id` (uuid, references `task_jobs(id)` ON DELETE CASCADE)
     - `log_level` (text: `'info'`, `'tool_call'`, `'syntax_check'`, `'error'`)
     - `message` (text)
     - `timestamp` (timestamptz, default `now()`)

2. **Row Level Security (RLS) Policies:**
   - Enable RLS on all tables.
   - Define policies restricting users to read/write only their own settings, tasks, and logs.

3. **Supabase Realtime Enablement:**
   - Enable Postgres Change Data Capture (CDC) on `task_jobs` and `task_logs` so client PWAs receive instant real-time updates.

4. **Supabase Client Utilities (`lib/supabase/client.ts` & `server.ts`):**
   - Write SSR-compatible client helpers using `@supabase/ssr` and `@supabase/supabase-js`.


📌 PHASE 3: Navigation, BYOK Provider Switcher & Connection Tester

Act as a Lead UI/UX Engineer. Implement the App Header, Repository Switcher, and the Settings Provider Vault with real-time connection validation.

1. **Header Bar (`components/header.tsx`):**
   - Sticky top navbar with WayCode logo in Electric Cobalt Blue (`#0066FF`).
   - GitHub profile avatar and light/dark theme toggle (`next-themes` + Shadcn `ThemeToggle`).
   - Repository Selector Pill: Dropdown styled like ChatGPT/Gemini model selector showing user's connected GitHub repositories.

2. **Settings & Provider Drawer (`components/settings-drawer.tsx`):**
   - Slide-over drawer / modal using Shadcn `Drawer` or `Dialog`.
   - Provider Selection (`Select` component):
     - `OpenRouter API` (Default)
     - `Direct Gemini API`
     - `Custom OpenAI-Compatible`
   - Model Selection Dropdown populated with zero-cost models:
     - `google/gemini-2.0-flash-exp:free`
     - `meta-llama/llama-3.3-70b-instruct:free`
     - `deepseek/deepseek-r1:free`
     - `qwen/qwen-2.5-coder-32b-instruct:free`
   - Masked input field for API Key.

3. **Kiro-Style Connection Validation Endpoint (`app/api/settings/test-connection/route.ts`):**
   - POST route receiving `{ provider, apiKey, model }`.
   - Performs lightweight ping request (`max_tokens: 5`) to OpenRouter/Gemini endpoint.
   - Returns `{ success: true, latency: string }` or `{ success: false, error: string }`.
   - Interactive "Test Connection" button on UI showing real-time loading state, success badge (`Connected`), or error toast.


📌 PHASE 4: Mobile Intent Canvas & Chat Feed

Act as a Mobile UI Developer. Build the core chat interaction feed optimized for touch devices.

1. **Chat Stream Layout (`app/chat/page.tsx` & `components/chat-feed.tsx`):**
   - Continuous scrollable feed matching mobile ChatGPT/Gemini app layout.
   - User Intent Bubbles: Right-aligned, electric blue accent background (`#0066FF`), displaying developer prompt and timestamp.
   - System/Agent Cards: Left-aligned structured cards displaying step-by-step progress, current status badges (`Queued`, `Analyzing Repo`, `Running Syntax Check`), and tool call accordion items.

2. **Preset Prompt Selector:**
   - Quick-action prompt chips for mobile developers:
     - ⚡ "Add Supabase Auth Hook"
     - 🎨 "Create Tailwind Landing Section"
     - 🐛 "Fix API Route Error & Types"

3. **Sticky Mobile Input Bar (`components/input-bar.tsx`):**
   - Bottom fixed position container with rounded search/chat input styling.
   - File attachment trigger button, prompt expansion modal trigger, and animated send button (`#0066FF`).
   - Submits intent payload to asynchronous job API endpoint.


📌 PHASE 5: Asynchronous Task Queue & Ingestion Pipeline

Act as a Distributed Systems Backend Engineer. Create the ingestion route and Redis queue pipeline.

1. **Redis Client Setup (`lib/redis.ts`):**
   - Instantiate `ioredis` client pointing to local Redis (`127.0.0.1:6379`) or `REDIS_URL` environment variable.
   - Implement connection fallback and error logging.

2. **Task Ingestion API Endpoint (`app/api/tasks/submit/route.ts`):**
   - Handles POST request with user intent, repository ID, and user ID.
   - Fetches active provider key and selected model from Supabase `user_settings`.
   - Inserts record into `task_jobs` table with status `'queued'`.
   - Pushes job payload (`JSON.stringify({ taskId, userId, repoName, prompt, apiKey, model })`) to Redis queue key `waycode:tasks`.
   - Returns immediate `HTTP 202 Accepted` status with payload `{ taskId, status: 'queued' }` to prevent mobile client timeouts during network switches.


📌 PHASE 6: Headless Agent Execution Sandbox (Antigravity ACI Core)

Act as an AI Agent Architect and Systems Engineer. Build the persistent background execution daemon that pulls tasks from Redis and executes code edits inside a sandboxed repository context.

1. **Daemon Runner Script (`worker/daemon.ts` or `worker/daemon.py`):**
   - Persistent process running under PM2 listening continuously to Redis `rPop` or `blPop` on queue `waycode:tasks`.
   - Sandboxed Workspace Directory: `/var/waycode/sandbox/[task_id]/`.

2. **Deterministic Agent-Computer Interface (ACI) Tools:**
   Implement four deterministic tool functions:
   - `list_files(directory_path)`: Scans workspace, excluding `node_modules`, `.git`, `.next`. Returns directory structure.
   - `read_file(filepath)`: Reads file content and returns line-numbered text.
   - `edit_file(filepath, content)`: Writes or replaces file content cleanly.
   - `run_syntax_check(workspace_path)`: Executes `npx tsc --noEmit` or `npm run build` locally in the sandbox. Returns stdout/stderr.

3. **Self-Healing Agent Loop (OpenRouter / Gemini Tool Calling):**
   - Initialize conversation context with System Prompt defining the agent as an expert engineer.
   - Send system prompt, user intent, repository structure, and tool definitions to model (e.g. `google/gemini-2.0-flash-exp:free`).
   - Execute model tool calls recursively.
   - After code edits, call `run_syntax_check`. If syntax errors occur, feed compiler stderr back to model to automatically fix errors.
   - Once build passes, compute `git diff`, update `task_jobs` with `status: 'verifying'` and `diff_content`, and append logs to `task_logs`.


📌 PHASE 7: Real-Time Telemetry Streamer & Mobile Diff Review Drawer

Act as a Frontend Real-Time & Diff Review Engineer. Build the live execution monitor and interactive visual diff reviewer.

1. **Real-Time Telemetry Streamer (`components/telemetry-accordion.tsx`):**
   - Uses Supabase Realtime CDC subscription to listen for updates on `task_logs` for current `task_id`.
   - Renders animated monospace terminal feed displaying live tool calls (`[READ] app/page.tsx`, `[EDIT] components/card.tsx`, `[CHECK] Syntax Passed`).

2. **Mobile Git Diff Reviewer Modal (`components/diff-review-modal.tsx`):**
   - Mobile-optimized side-by-side or unified diff viewer using syntax highlighting (`react-diff-viewer-continued` or custom Tailwind blocks).
   - Color code additions (Green `#10B981`) and deletions (Red `#EF4444`).

3. **Task Resolution Actions:**
   - **[ Reject Task ] Button:** Updates task status in Supabase to `'rejected'`, cleans sandbox folder.
   - **[ Approve & Push to GitHub ] Button:**
     - Triggers POST API `/api/tasks/approve`.
     - Daemon creates Git branch `waycode/task-[id]`, commits changes, pushes to remote GitHub repository, and creates Pull Request.


📌 PHASE 8: Out-of-Band Alerts, CI/CD Webhooks & VPS Deployment

Act as a DevOps Lead & Cloud Solutions Architect. Implement notification alerts, automated deployment triggers, and host deployment guides.

1. **WhatsApp Cloud API Integration (`lib/notifications/whatsapp.ts`):**
   - Function sending template message via Meta WhatsApp Business API when job transitions to `'completed'`.
   - Message content: *"🚀 WayCode Task Completed! Repository: [repo_name]. Branch: waycode/task-[id]. View preview: [Vercel_Link]"*.

2. **Vercel Webhook & GitHub CI Integration:**
   - Configure GitHub action/webhook triggers so pushes to `waycode/*` branches automatically generate Vercel Preview Deployments.

3. **Hostinger VPS Deployment Script & PM2 Config (`ecosystem.config.js`):**
   - PM2 configuration file for managing the worker daemon (`pm2 start ecosystem.config.js`).
   - Setup instructions for installing Docker on Ubuntu VPS:
     ```bash
     sudo apt update && sudo apt install -y docker.io pm2
     sudo systemctl enable --now docker
     docker run -d --name waycode-redis -p 127.0.0.1:6379:6379 redis:alpine
     ```

4. **End-to-End Testing Verification Suite:**
   - Checklist for testing full lifecycle: Mobile Prompt Submission -> Redis Queue -> VPS Sandbox Execution -> Compiler Self-Healing -> Real-Time Log Streaming -> Mobile Visual Diff Review -> WhatsApp Push Notification -> Vercel Deployment.
