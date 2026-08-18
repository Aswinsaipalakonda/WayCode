<div align="center">

  <img src="public/logo.png" alt="WayCode Logo" width="120" height="120" />

  # 🚀 WayCode
  ### Asynchronous, Intent-Driven Mobile Gateway for Autonomous Software Engineering Agents

  [![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
  [![Redis](https://img.shields.io/badge/Redis-Queue-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
  [![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

  *Dispatch software engineering tasks from your phone in natural language. Executed by a persistent cloud daemon on your VPS. Reviewed and approved on mobile before pushing to production.*

  ---

</div>

## 📌 Executive Summary

**WayCode** reframes the relationship between a mobile device and a software repository: the phone becomes a **remote control for an autonomous engineering daemon**, not a terminal emulator. 

The developer expresses **intent** (*"Add a Supabase auth hook to the checkout page"*); WayCode's cloud agent handles **execution** (cloning, branching, editing, building, verifying); and the mobile UI makes execution legible, interruptible, and safely reviewable anywhere.

---

## ✨ Core Features & Guarantees

| Feature / Guarantee | Badge | Description |
| :--- | :---: | :--- |
| **Zero Local Compute** | ⚡ | The mobile client performs zero compilation, linting, or build execution — 100% offloaded to VPS. |
| **Asynchronous Task Queue** | 🔄 | Instant `HTTP 202 Accepted` response on intent submission; task execution is fully decoupled from client connection state. |
| **Bring Your Own Key (BYOK)** | 🔑 | Choose between **OpenRouter**, **Gemini API**, or **Custom OpenAI-Compatible** endpoints with in-app encrypted vault. |
| **Zero-Cost Model Support** | 🆓 | Native support for zero-cost models (`gemini-2.0-flash-exp:free`, `llama-3.3-70b-instruct:free`, `deepseek-r1:free`, `qwen-2.5-coder-32b:free`). |
| **Interactive Connection Tester** | 🧪 | Kiro-style validation ping checking API keys and models before saving (`Connected` vs `Invalid Key`). |
| **Self-Healing Agent Loop** | 🩹 | Bounded compiler error feedback loop (`npx tsc --noEmit`) automatically correcting syntax errors before final review. |
| **Mobile Git Diff Reviewer** | 🔍 | Mobile-optimized side-by-side / unified diff viewer with line additions (`#10B981`) & deletions (`#EF4444`). |
| **Supabase Realtime Telemetry** | 📡 | Live append-only execution log streamer via Postgres Change Data Capture (CDC). |
| **Out-of-Band Alerts** | 📱 | WhatsApp Business Cloud API notification containing live Vercel deployment preview links. |

---

## 🛠️ Architecture & System Topology

```
+------------------+        HTTPS/WSS        +---------------------------+
|   Mobile Client   |  <-------------------->  |     Next.js App Router    |
| (PWA, Next.js)    |                          |  (Client-facing API +     |
|  Tailwind, Shadcn |                          |   Auth Middleware)        |
+---------+---------+                          +-------------+-------------+
          |                                                   |
          | Supabase Realtime (CDC)                           | Enqueue Job
          v                                                   v
+---------------------------+                        +-----------------+
|   Supabase (BaaS Layer)   |  <-------------------->  |  Redis Queue    |
|  - Auth (GitHub OAuth)     |     Status Writes       | (Dockerized,    |
|  - PostgreSQL (jobs, logs) |                          |  redis:alpine)  |
|  - Realtime CDC Broadcast  |                          +--------+--------+
+---------------------------+                                    |
                                                                   | Consume
                                                                   v
                                                    +---------------------------+
                                                    |   Agent Daemon (VPS)       |
                                                    |  Node.js/Python + PM2      |
                                                    |  Antigravity ACI Harness   |
                                                    |  (tool calls + self-heal)  |
                                                    |  Git CLI + Sandbox FS      |
                                                    +-------------+-------------+
                                                                   |
                                                                   | BYOK request
                                                                   v
                                                    +---------------------------+
                                                    |  AI Provider (OpenRouter / |
                                                    |  Gemini / Custom OpenAI)  |
                                                    +---------------------------+
```

---

## 📊 Database Schema (Supabase BaaS)

<details>
<summary><b>Click to expand Database Tables & Models</b></summary>

- `user_settings`: User BYOK provider configuration, encrypted API keys, model selections.
- `repositories`: Connected GitHub repositories and default branch context.
- `task_jobs`: State machine tracking jobs (`queued` → `processing` → `verifying` → `completed` / `failed` / `rejected`).
- `task_logs`: Realtime append-only telemetry stream tagged by phase (`clone`, `plan`, `tool_call`, `edit`, `build`, `self_heal`).

</details>

---

## 🚀 Getting Started

### Prerequisites
- Node.js `20.x` or higher
- Docker Desktop (Windows / macOS)
- Supabase Project & Credentials

### 1. Clone & Install
```bash
git clone https://github.com/Aswinsaipalakonda/WayCode.git
cd WayCode
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://cczeusftmsaykelqyfgu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
REDIS_URL=redis://127.0.0.1:6379
```

### 3. Run Local Infrastructure (Redis Queue)
```bash
docker run -d --name waycode-redis -p 6379:6379 redis:alpine
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser or mobile device.

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
