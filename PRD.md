# PRD.md — WayCode

**Product:** WayCode — Asynchronous, Intent-Driven Mobile Gateway for Autonomous Software Engineering Agents
**Document Type:** Product Requirement Document (PRD)
**Version:** 1.0
**Status:** Draft for Major Project Review
**Prepared As:** Principal Technical Product Manager / Lead UI-UX Designer / Enterprise Solutions Architect

---

## Table of Contents

1. Executive Summary
2. Problem Statement & Vision
3. Target Users & Personas
4. Brand Identity & Design System
5. UI/UX Specifications
6. Information Architecture & Navigation Map
7. Functional Requirements & Feature Breakdown
8. System Architecture & Tech Stack
9. Data Models & Database Schema
10. System Flows & Sequence Diagrams (ASCII)
11. API Contract Overview
12. Security, Non-Functional Requirements & Zero-Cost Resilience
13. DevOps, Deployment & Migration Blueprint
14. Observability, Monitoring & Alerting
15. Success Metrics & KPIs
16. Risks, Assumptions & Mitigations
17. Release Roadmap & Milestones
18. Appendix

---

## 1. Executive Summary

WayCode is an asynchronous, intent-driven mobile gateway that allows a developer to dispatch software engineering tasks — feature additions, bug fixes, refactors — from a mobile device in natural language, and have those tasks executed by a persistent, headless AI coding agent running on a cloud VPS. The mobile client performs **zero local compilation**; all heavy compute (repository cloning, code generation, build verification, git operations) is offloaded to a durable background daemon. The mobile app's sole responsibilities are: capturing intent, displaying real-time execution telemetry, and enabling human-in-the-loop review and approval of generated diffs before they are pushed to production branches.

The product is architected around three guarantees:

| Guarantee | Description |
|---|---|
| **Asynchrony** | Task submission is decoupled from task execution via a durable queue; the client never blocks on long-running agent work. |
| **Continuity** | Mobile network loss, app backgrounding, or device switching never interrupts a queued or in-flight agent task. |
| **Human Oversight** | No code is pushed to a remote branch without an explicit, mobile-native diff review and approval gesture from the developer. |

---

## 2. Problem Statement & Vision

### 2.1 Problem Statement

Modern developers are frequently away from their primary workstation — commuting, in meetings, or context-switching between projects — yet routine engineering tasks (small bug fixes, boilerplate scaffolding, dependency bumps, simple component creation) continue to accumulate. Existing mobile developer tools either:

- Require a persistent SSH session or remote-desktop tunnel (high friction, battery-intensive, breaks on network transitions), or
- Offer read-only repository browsing without any capability to *execute* engineering work, or
- Assume synchronous, chat-only interaction with no durable task state, meaning an app crash or connectivity drop silently discards in-progress work.

There is no purpose-built mobile-first system that treats a coding task as a **durable, resumable job** rather than an ephemeral chat exchange.

### 2.2 Vision

WayCode reframes the relationship between a mobile device and a software repository: the phone becomes a **remote control for an autonomous engineering daemon**, not a terminal emulator. The developer expresses *intent* ("Fix the null pointer exception in the checkout API route"); WayCode's cloud agent handles *execution* (branching, editing, building, verifying); and the mobile UI's job is to make that execution legible, interruptible, and safely reviewable — anywhere, on any connection quality.

### 2.3 Design Principles

1. **Intent over instruction** — the developer describes an outcome; the agent determines the implementation path.
2. **Nothing is lost** — every task, log line, and diff persists server-side; the mobile client is a thin, disposable viewport.
3. **No silent writes** — the agent may read, branch, and build autonomously, but a human always approves before `git push` to a protected remote.
4. **Offline-tolerant, not offline-first** — the daemon keeps working even when the phone is offline; the phone catches up on reconnect.

---

## 3. Target Users & Personas

### Persona A — "The Async Maintainer"
A mid-to-senior developer or tech lead responsible for triaging small issues across multiple repositories. Spends significant time outside a laptop (commuting, on-site client visits). Wants to clear a backlog of minor tickets without opening a laptop.

**Needs:** Fast intent capture, trustworthy diff review, notification when work is ready.

### Persona B — "The Solo Founder / Indie Hacker"
Runs a small SaaS product single-handedly. Wants to ship small fixes and landing-page tweaks from a phone while traveling, without provisioning a full remote dev environment.

**Needs:** Preset task templates, direct-to-production deployment pipeline, WhatsApp-based deployment confirmation.

### Persona C — "The Engineering Manager (Reviewer)"
Doesn't write the code personally but wants visibility into what autonomous agents changed, and the final approval authority before anything reaches `main`.

**Needs:** Clear, syntax-highlighted diff visualization; audit trail of who approved what and when.

---

## 4. Brand Identity & Design System

### 4.1 Brand Rationale

The WayCode mark is built around Electric Cobalt Blue — a color chosen to evoke motion, signal-transmission, and trust, echoing the product's core metaphor of a "gateway" that routes intent from a handheld device to a remote execution engine. The visual language borrows conventions from best-in-class conversational AI mobile apps (ChatGPT, Gemini) so the interaction pattern is instantly familiar, while diff/log surfaces borrow from developer-tool conventions (GitHub, VS Code) so the technical content reads with the correct visual grammar.

### 4.2 Color Palette

#### Brand Primary

| Token | Hex / Value | Usage |
|---|---|---|
| `brand.primary` | `#0066FF` / `#0070F3` | Primary buttons, active states, brand marks, progress traces |
| `brand.primary.hover` | `#0052CC` | Hover / pressed state for primary actions |
| `brand.tint.light` | `#E6F0FF` | Light-mode soft badges, selected-row backgrounds |
| `brand.tint.dark` | `rgba(0, 102, 255, 0.15)` | Dark-mode soft badges, selected-row backgrounds |

#### Light Theme

| Token | Hex | Usage |
|---|---|---|
| `bg.app` | `#FAFAFA` / `#FFFFFF` | Screen background |
| `surface.card` | `#FFFFFF` | Cards, panels, sheets |
| `border.default` | `#E5E7EB` | Card borders, dividers |
| `text.primary` | `#111827` | Headings, primary body text |
| `text.secondary` | `#6B7280` | Secondary labels, metadata |
| `text.muted` | `#9CA3AF` | Placeholder, disabled text |
| `status.success` | `#10B981` | Success states, diff additions |
| `status.warning` | `#F59E0B` | Warning states, retry banners |
| `status.error` | `#EF4444` | Error states, diff deletions |

#### Dark Theme

| Token | Hex | Usage |
|---|---|---|
| `bg.app` | `#090D16` / `#0D1117` | Screen background |
| `surface.card` | `#161B22` / `#1E293B` | Cards, panels, sheets |
| `border.default` | `rgba(255,255,255,0.08)` | Card borders, dividers |
| `text.primary` | `#F9FAFB` | Headings, primary body text |
| `text.secondary` | `#9CA3AF` | Secondary labels, metadata |
| `text.muted` | `#64748B` | Placeholder, disabled text |
| `surface.glass` | `rgba(22,27,34,0.75)` + `backdrop-filter: blur(12px)` | Floating input bar, modal overlays |

### 4.3 UI Component Framework

WayCode standardizes on **Shadcn UI** as its component primitive layer, giving the product a consistent, accessible, and themeable foundation without the overhead of a fully custom design system build-out. The following Shadcn primitives are used as the backbone of the interface:

| Primitive | Product Usage |
|---|---|
| `Dialog` | Diff Review Modal, destructive-action confirmations (e.g., reject task) |
| `Drawer` | Settings & Provider Configuration Drawer, Telemetry Drawer on mobile widths |
| `DropdownMenu` | Repository Selector Pill, Model Selection dropdown, profile menu |
| `Toast` | Job status transition notifications, connection-test results |
| `Accordion` | Real-Time Log Streamer (collapsed/expanded phase groups) |
| `Tabs` | Multi-file diff navigator, Job History status filters |
| `Switch` | Dark/Light `ThemeToggle`, notification preference toggles |
| `Badge` | Job status pills, connection-health indicators (`Connected` / `Invalid Key`) |
| `Tooltip` | Icon-only affordances (attach, expand composer, settings) |

All Shadcn primitives are themed via CSS variables mapped to the token tables in §4.2, ensuring dark/light parity without per-component overrides.

### 4.4 Typography

| Role | Font Stack | Notes |
|---|---|---|
| UI / Body | `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Geist`, sans-serif | All interface chrome, chat bubbles, labels |
| Code / Logs / Diffs | `JetBrains Mono`, `Fira Code`, monospace | Telemetry stream, tool-call trace, diff viewer, commit hashes |

**Type Scale (mobile base 16px):**

| Level | Size / Line-height | Weight | Usage |
|---|---|---|---|
| Display | 28 / 34 | 700 | Onboarding, empty states |
| H1 | 22 / 28 | 700 | Screen titles |
| H2 | 18 / 24 | 600 | Section headers, card titles |
| Body | 15 / 22 | 400 | Chat content, descriptions |
| Caption | 13 / 18 | 500 | Timestamps, metadata, status pills |
| Code | 13 / 20 | 400 (mono) | Log lines, diff content |

### 4.5 Layout & Responsiveness

- **Target viewport:** 360px – 430px mobile width (primary), fluid scaling to tablet (768px+) and desktop (up to 4K) for the companion web dashboard.
- **Grid:** 4px base spacing unit; 8/16/24/32 spacing scale for margins and gaps.
- **Corner radii:** 12px (cards), 20px (chat bubbles), 999px (pills, floating action buttons).
- **Elevation:** Two-tier shadow system — `elevation.1` for resting cards, `elevation.2` for floating/sticky elements (input bar, modals).
- **Safe areas:** All bottom-anchored elements respect device safe-area insets (notch/home-indicator aware).

---

## 5. UI/UX Specifications

### 5.1 Global Navigation Shell

**Header / Workspace Selector Bar** (fixed top, 56px height)
- WayCode wordmark/logo (left, brand primary color).
- **Repository Selector Pill** — center-aligned dropdown (Shadcn `DropdownMenu`) styled after a model-switcher pattern (e.g., ChatGPT's model picker), listing GitHub repositories fetched post-OAuth. Displays repo name, default branch, and a small connection-health dot.
- Dark/Light mode toggle (Shadcn `Switch`-based `ThemeToggle`, animated sun/moon icon).
- **Settings icon button** — opens the Settings & Provider Configuration Drawer (§5.2).
- User profile avatar (right) — opens account sheet (sign out, notification preferences).

### 5.2 Settings & Provider Configuration Drawer (BYOK)

A Shadcn `Drawer` (bottom sheet on mobile, side panel on tablet/desktop widths) that lets a developer bring their own AI provider credentials entirely in-app, with no host environment file editing required.

**Provider Selection**
- Segmented control / radio group choosing between: **OpenRouter**, **Direct Gemini API**, and **Custom OpenAI-Compatible Endpoint** (base URL + key fields shown conditionally for the custom option).

**API Key Field**
- Masked password-style input with a reveal toggle; keys are never echoed back in full after save (see §12.1 for storage handling).

**Model Selection**
- Dropdown (Shadcn `DropdownMenu`) listing available models for the selected provider, defaulting to zero-cost tiers where available:
  - `google/gemini-2.0-flash-exp:free`
  - `meta-llama/llama-3.3-70b-instruct:free`
  - `deepseek/deepseek-r1:free`
  - `qwen/qwen-2.5-coder-32b-instruct:free`
- Paid/higher-context models are listed below a visual divider for users who opt to supply a billed key.

**Interactive Connection Tester**
- A **"Test Connection"** button (Kiro-style validation pattern) sends a lightweight ping request to the configured provider/model combination *before* the key is persisted.
- Result surfaces as a Shadcn `Badge` with two states:
  - `Connected` — green badge (`#10B981` tint), key is eligible to save.
  - `Invalid Key` — red badge (`#EF4444` tint), inline error detail (e.g., "401 Unauthorized" or "Model unavailable"), save action remains disabled until resolved.
- A `Toast` confirms successful save once the tested configuration is persisted.

### 5.3 Conversational Intent Canvas (Home Screen)

- **Chat Stream Layout:** Continuous vertical scroll feed, most-recent-at-bottom, mirroring the Gemini mobile app interaction model.
- **User Messages:** Right-aligned rounded bubbles, brand-primary fill, white text, containing the raw natural-language intent as typed.
- **Agent Responses:** Left-aligned card layout (not a plain bubble) containing:
  - A collapsed-by-default step tracker (see §5.5).
  - Inline **tool-call trace chips** rendered in monospace as each deterministic tool invocation occurs — `list_files`, `read_file`, `edit_file`, `run_syntax_check` — each chip showing the tool name, target path (where applicable), and a completion checkmark or spinner.
  - A one-line current-status summary with animated status dot (`pending` grey, `in_progress` blue pulse, `build_verified` amber, `success` green, `failed` red).
  - A tap target that expands into the full Telemetry Drawer.
- **Empty State:** First-run illustration plus 3–4 suggested preset templates (see 5.3) to reduce blank-canvas friction.

### 5.4 Preset Task Templates

Displayed as horizontally scrollable chips above the input bar when the composer is empty:

| Template | Pre-filled Intent |
|---|---|
| Add Auth Hook | "Add a Supabase Auth hook to [selected repo]" |
| Landing Page Component | "Create a Tailwind landing page hero component" |
| Fix API Route Error | "Diagnose and fix the failing API route" |
| Dependency Bump | "Upgrade outdated dependencies and verify build" |

Tapping a chip populates the composer for editing before submission (never auto-submits).

### 5.5 Bottom Floating Input Bar

- Sticky, glassmorphic container anchored above the safe area.
- Elements (left to right): file/context attach icon, expandable multiline text field ("Describe what you want WayCode to do…"), prompt-expansion button (opens full-screen composer with template gallery and repo/branch context selectors), animated circular send button (brand primary, morphs to a stop/cancel icon while a submission request is in flight).
- Sending a message immediately renders the user bubble and an optimistic "Queued" agent card — the UI never appears to hang, consistent with the backend's `HTTP 202 Accepted` contract (see §7.3).

### 5.6 Live Telemetry & Diff Review Drawer

**Real-Time Log Streamer**
- Expandable accordion (Shadcn `Accordion`) nested inside the agent response card.
- Streams structured log lines from the VPS daemon via Supabase Realtime CDC, each line tagged with a phase label (`clone`, `plan`, `tool_call`, `edit`, `build`, `self_heal`, `verify`, `commit`).
- `tool_call` lines render the deterministic tool name and arguments (e.g., `read_file(src/api/checkout.ts)`); `self_heal` lines render a compiler-error-to-model feedback iteration count (e.g., "Self-heal attempt 2/3: fixing type mismatch").
- Auto-scrolls to newest line unless the user has manually scrolled up (in which case a "Jump to latest" pill appears).
- Long-press on any log line copies it to the clipboard.

**Mobile Git Diff Review Modal**
- Full-screen modal triggered from a "Review Changes" button once a job reaches `BUILD_VERIFIED`.
- File-by-file navigator (top horizontal tab strip) for multi-file changes.
- Unified diff view by default (toggle to side-by-side on tablet/desktop widths); additions highlighted `#10B981` background tint, deletions `#EF4444` background tint, syntax highlighting via monospace token coloring.
- Sticky footer with two primary actions:
  - **[ Reject Task ]** — secondary/destructive style, discards the branch, prompts for optional rejection reason (fed back to the agent for a retry attempt).
  - **[ Approve & Push to GitHub ]** — primary brand-filled button, triggers server-side push, CI/CD trigger, and deployment notification flow.

### 5.7 Notification & Status Surfaces

- In-app toast on job state transitions when the app is foregrounded.
- Push notification (via mobile OS channel) when a job reaches `BUILD_VERIFIED` (awaiting review) or `FAILED`.
- Out-of-band WhatsApp message (see §7.6) on successful deployment, containing the live Vercel URL — ensures visibility even if the app is closed and push permissions are denied.

### 5.8 Accessibility

- Minimum touch target 44x44pt.
- Color is never the sole indicator of status — every status dot pairs with a text label.
- Full VoiceOver/TalkBack labeling for diff additions/deletions ("Line added," "Line removed").
- Dynamic type support up to 200% scale without layout breakage on the chat stream.

---

## 6. Information Architecture & Navigation Map

```
+-----------------------------------------------------------+
|                        WayCode App                        |
+-----------------------------------------------------------+
        |                |                |              |
        v                v                v              v
  [ Onboarding ]   [ Home / Chat ]   [ Job History ]  [ Account ]
        |                |                |              |
   GitHub OAuth     Intent Canvas    List of past    Profile,
   Repo Selection   + Preset Chips   jobs w/ status   Notification
        |            + Composer       filter chips    Preferences,
        v                |                |            Sign Out,
   [ Home / Chat ]        v                v            Theme Toggle
                   [ Telemetry Drawer ] [ Job Detail ]
                          |                |
                          v                v
                  [ Diff Review Modal ] [ Diff Review Modal ]
                          |
                 +--------+--------+
                 v                 v
          [ Reject Task ]   [ Approve & Push ]
                                    |
                                    v
                        [ Deployment Confirmation ]
                          (in-app + WhatsApp)
```

---

## 7. Functional Requirements & Feature Breakdown

### 7.1 Authentication & Session Module
- Supabase Auth integration with native GitHub OAuth 2.0, requesting `repo` write scope only (least-privilege; no `admin:org` or unrelated scopes).
- Access/refresh token rotation handled transparently; refresh occurs in Next.js middleware before token expiry.
- Session persistence across app restarts via secure, encrypted device storage (not `localStorage`); biometric app-lock optional setting.
- Sign-out revokes the GitHub token server-side, not just locally.

### 7.2 Dynamic Provider & Key Vault Module
- In-app AI provider selection across **OpenRouter**, **Direct Gemini API**, and **Custom OpenAI-Compatible Endpoints** — no host `.env` editing required for a developer to bring their own key.
- Encrypted key storage in a dedicated Supabase `user_settings` table (see §9.2); keys are encrypted at rest and decrypted only within the VPS daemon process at call time, never returned in plaintext to the client after initial save.
- Real-time API key connection-testing endpoint (Kiro-style validation flow): a lightweight ping request validates the key/model pairing synchronously and returns a `Connected` / `Invalid Key` result before the configuration is persisted.
- Model catalog includes zero-cost tiers (`google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.3-70b-instruct:free`, `deepseek/deepseek-r1:free`, `qwen/qwen-2.5-coder-32b-instruct:free`) alongside paid options for users who supply a billed key.
- Per-user provider configuration is the default execution context for that user's jobs; falls back to a system-default free-tier configuration if none is set, so the product remains usable at zero cost out of the box.

### 7.3 Mobile Intent Workspace
- Free-text natural-language prompt submission with 2,000-character cap and live counter.
- Preset task templates (§5.3), editable before send.
- Optional context attachments: reference a specific file path, paste an error stack trace, or link an existing GitHub issue number — all folded into the agent's initial context payload.
- Repo + branch context selector accessible from the expanded composer (defaults to the repository's default branch as the base for the agent's working branch).

### 7.4 Asynchronous Redis Queue & Ingestion Pipeline
- Dockerized Redis (`redis:alpine`) as the task buffer, run via Docker Desktop in local development and on the Hostinger VPS in production.
- On submission, the API layer performs minimal validation (auth, repo access, payload shape), enqueues the job, writes an initial `PENDING` row to the `jobs` table, and immediately returns `HTTP 202 Accepted` with the job ID — the mobile client never holds an open connection waiting on agent execution.
- Queue consumers are idempotent; a redelivered message does not duplicate branch creation or duplicate commits (guarded by job-ID based locking).

### 7.5 Antigravity Headless Agent Execution Sandbox (ACI)
- Persistent background worker daemon managed via PM2 on the VPS, auto-restarting on crash and surviving VPS reboots.
- Integrates with the **OpenRouter API** and a **Antigravity Agent Harness** implementing an Agent-Computer Interface (ACI) pattern: the model does not free-form edit files, it issues **deterministic tool calls** that the harness executes and reports results back for.

**Deterministic Tool Set**

| Tool | Purpose |
|---|---|
| `list_files` | Enumerate repository/directory contents to build working context |
| `read_file` | Read the contents of a specific file into the model's context |
| `edit_file` | Apply a scoped, targeted edit to a specific file |
| `run_syntax_check` | Execute a build/type-check command and capture pass/fail output |

- **Self-Healing Compiler Loop:** After `edit_file` calls, the harness runs local TypeScript validation (`npx tsc --noEmit`, or the project's equivalent build/lint command) via `run_syntax_check`. If the check fails, the raw compiler error output is fed back to the model as the next turn's context, and the model issues corrective `edit_file` calls. This loop is bounded to a configurable maximum attempt count (default 3) before the job is marked `FAILED` and escalated for manual review rather than looping indefinitely.
- Per-job sandboxed workspace rooted at `/var/waycode/sandbox/{job-id}/`: shallow clone of the target repository into an isolated directory, creation of a uniquely named working branch (`waycode/task-{job-short-id}`), scoped tool-driven edits, and final build/lint verification before the job is allowed to progress to `BUILD_VERIFIED`.
- Sandbox teardown on job completion or terminal failure to bound disk usage on the VPS.

### 7.6 Real-Time Telemetry & State Management
- Supabase PostgreSQL `jobs` table as the single source of truth for job status, transitioning through `PENDING → IN_PROGRESS → BUILD_VERIFIED → SUCCESS`, with `FAILED` reachable from any non-terminal state.
- Supabase Realtime (CDC-based) streams both `jobs` row updates and append-only `job_logs` inserts directly to subscribed mobile clients — no polling.
- Reconnection logic: on app foreground/reconnect, the client re-subscribes and reconciles any missed log lines and status transitions via a catch-up query.

### 7.7 CI/CD Integration & Out-of-Band Alerts
- Automated Git branch management using the `waycode/task-{id}` naming convention, applied consistently across sandbox creation, commit, and push.
- On approval, the daemon performs the git commit and push to the designated working branch and opens an automated pull request (never a direct commit to a protected branch such as `main` unless explicitly configured by the repository owner).
- GitHub webhook triggers the corresponding Vercel deployment automatically for connected projects.
- On successful deployment, an out-of-band notification is sent via the Meta WhatsApp Business Cloud API to the developer's registered number, containing the job summary and a direct live Vercel deployment link — ensuring delivery independent of mobile push notification permission state.

### 7.8 Job History & Audit Trail
- Filterable, searchable list of all past jobs per repository (status, date range, free-text intent search).
- Each job detail view retains the full log stream, final diff, approver identity, and timestamp — a durable audit record for engineering-manager review (Persona C).

---

## 8. System Architecture & Tech Stack

### 8.1 High-Level Architecture Diagram

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
                                                    |  Gemini / Custom OpenAI-   |
                                                    |  Compatible Endpoint)      |
                                                    +---------------------------+
                                                                   |
                                          +------------------------+------------------------+
                                          |                                                 |
                                          v                                                 v
                                +------------------+                              +-------------------+
                                |  GitHub (Remote)  |                              |  WhatsApp Cloud API|
                                |  Branch / PR /     |----- Webhook ------->        |  Notification       |
                                |  Push to main       |                             |  (Deployment URL)   |
                                +--------+-----------+                             +-------------------+
                                         |
                                         v
                                +------------------+
                                |     Vercel        |
                                |  Auto-Deployment   |
                                +------------------+
```

### 8.2 Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons, PWA Manifest | Mobile-first web client installable as a PWA |
| Backend & Database | Supabase (Auth, PostgreSQL, Realtime CDC) | Identity, durable state, encrypted settings, live sync |
| Queue | Dockerized Redis (`redis:alpine`) — local Windows Docker Desktop / VPS | Durable async job queue, decouples ingestion from execution |
| Agent Harness | Node.js / Python daemon under PM2 on Hostinger VPS, implementing the Antigravity ACI tool-calling pattern + native Git CLI | Headless code generation, deterministic tool execution, self-healing build loop, git operations |
| AI Provider | OpenRouter API (zero-cost `:free` models) & Gemini API, selectable via in-app BYOK switcher | Pluggable, user-controlled model backend |
| Source Control | GitHub API (OAuth `repo` scope, webhooks) | Branching, commits, push, deployment trigger |
| Deployment | Vercel (auto-deploy on push), Hostinger VPS (daemon host) | Production hosting for client and agent daemon respectively |
| Notifications | Meta WhatsApp Business Cloud API | Out-of-band deployment confirmation |

### 8.3 Environment Topology

| Environment | Client | Queue | Agent Daemon | Notes |
|---|---|---|---|---|
| Local Dev | `next dev` on developer laptop | Docker Desktop (Windows), Redis container | Node worker run directly via `pm2-dev` or `nodemon` | Full local loop for daemon logic iteration |
| Staging | Vercel Preview Deployment | Redis container on VPS (staging namespace/DB index) | PM2 process on VPS (staging instance) | Mirrors production topology at reduced scale |
| Production | Vercel Production Deployment | Redis container on Hostinger VPS | PM2 process on Hostinger VPS (production instance) | Primary always-on environment |

---

## 9. Data Models & Database Schema

### 9.1 Entity Relationship Overview

```
+---------------+       1     N   +----------------+       1     N   +----------------+
|     users      |---------------->|   repositories  |---------------->|      jobs       |
+---------------+                  +----------------+                  +----------------+
| id (PK)        |                  | id (PK)        |                  | id (PK)         |
| github_id       |                  | user_id (FK)    |                  | repo_id (FK)     |
| email           |                  | full_name       |                  | user_id (FK)     |
| display_name    |                  | default_branch  |                  | status           |
| avatar_url      |                  | installed_at    |                  | intent_text      |
| created_at      |                  | connection_state|                  | working_branch   |
+-------+-------+                  +----------------+                  | build_verified_at|
        |
        | 1
        v 1
+----------------+
| user_settings   |
+----------------+
| id (PK)         |
| user_id (FK)     |
| provider         |
| model_id         |
| api_key_encrypted|
| custom_base_url  |
| last_test_status |
| last_test_at     |
+----------------+
                                                                          | approved_by (FK) |
                                                                          | approved_at      |
                                                                          | created_at        |
                                                                          | completed_at       |
                                                                          +--------+---------+
                                                                                   |
                                                                                   | 1
                                                                                   v N
                                                                          +----------------+
                                                                          |    job_logs     |
                                                                          +----------------+
                                                                          | id (PK)         |
                                                                          | job_id (FK)      |
                                                                          | phase            |
                                                                          | message          |
                                                                          | created_at        |
                                                                          +----------------+
                                                                                   |
                                                                                   | 1
                                                                                   v N
                                                                          +----------------+
                                                                          |  job_diffs      |
                                                                          +----------------+
                                                                          | id (PK)         |
                                                                          | job_id (FK)      |
                                                                          | file_path        |
                                                                          | diff_content      |
                                                                          | additions_count   |
                                                                          | deletions_count   |
                                                                          +----------------+
```

### 9.2 Table Definitions (Descriptive, Non-DDL)

**`users`** — Identity record synced from Supabase Auth on GitHub OAuth sign-in. Stores GitHub numeric ID, primary email, display name, and avatar URL for header/profile rendering.

**`repositories`** — One row per GitHub repository the user has connected. Tracks the repository's default branch, GitHub connection/installation state, and last-synced timestamp; used to populate the Repository Selector Pill.

**`user_settings`** — Stores each user's BYOK provider configuration: selected provider (`openrouter` / `gemini` / `custom_openai_compatible`), selected model identifier, encrypted API key ciphertext, optional custom base URL, and the timestamp/result of the last successful connection test. Decryption occurs only within the VPS daemon process at call time (see §12.1).

**`jobs`** — The core work-tracking entity. Fields include: current `status` (enum: `PENDING`, `IN_PROGRESS`, `BUILD_VERIFIED`, `SUCCESS`, `FAILED`), the raw `intent_text` submitted by the user, the generated `working_branch` name, timestamps for each major transition, and the identity of the approving user for audit purposes.

**`job_logs`** — Append-only telemetry stream. Each row is a single structured log line tagged with a `phase` (`clone`, `plan`, `tool_call`, `edit`, `build`, `self_heal`, `verify`, `commit`, `push`) consumed by the Realtime Log Streamer.

**`job_diffs`** — Stores the finalized diff content per changed file for a given job, along with addition/deletion line counts, consumed by the Mobile Git Diff Review Modal.

### 9.3 Job Status State Machine

```
        submit
          |
          v
     +----------+
     | PENDING  |
     +----+-----+
          | worker picks up job
          v
     +--------------+
     | IN_PROGRESS  |
     +----+----+----+
          |    |
   build  |    | unrecoverable error
   passes |    |
          v    v
+----------------+   +--------+
| BUILD_VERIFIED |   | FAILED |
+--------+-------+   +--------+
         |                 ^
   human review             |
   +----------+----------+  |
   |                     |  |
 approve               reject
   |                     |
   v                     |
+---------+               |
| SUCCESS |---------------+
+---------+   (rejection may
              re-queue as new
              PENDING job)
```

---

## 10. System Flows & Sequence Diagrams (ASCII)

### 10.1 End-to-End Task Submission Flow

```
Mobile Client        Next.js API         Redis Queue        Agent Daemon        Supabase          GitHub/Vercel        WhatsApp
     |                    |                    |                  |                 |                    |                  |
     |--Submit Intent---->|                    |                  |                 |                    |                  |
     |                    |--Validate+Auth---->|                  |                 |                    |                  |
     |                    |--Write PENDING------------------------------------------>|                    |                  |
     |<--202 Accepted-----|                    |                  |                 |                    |                  |
     |   (job_id)         |--Enqueue Job------>|                  |                 |                    |                  |
     |                    |                    |--Deliver Job---->|                 |                    |                  |
     |<===Realtime: IN_PROGRESS (CDC)========================================>|      |                    |                  |
     |                    |                    |                  |--Clone Repo----->|                    |                  |
     |                    |                    |                  |--Branch--------->|                    |                  |
     |<===Realtime: log lines (clone/plan/edit/build)========================>|      |                    |                  |
     |                    |                    |                  |--Run Build------>|                    |                  |
     |                    |                    |                  |--Write Diffs---------------->|         |                  |
     |<===Realtime: BUILD_VERIFIED============================================>|      |                    |                  |
     |--Open Diff Modal-->|                    |                  |                 |                    |                  |
     |--Approve & Push--->|                    |                  |                 |                    |                  |
     |                    |--Notify Daemon----------------------->|                 |                    |                  |
     |                    |                    |                  |--Push Commit------------------------>|                  |
     |                    |                    |                  |                 |    Webhook Trigger--->|                  |
     |                    |                    |                  |                 |                    |--Deploy--------->|
     |<===Realtime: SUCCESS===================================================>|      |                    |                  |
     |                    |                    |                  |                 |                    |--Deploy URL----------------->|
     |<-----------------------------------------------------------------------------------------------------------WhatsApp Msg---|
```

### 10.2 Rejection & Retry Flow

```
Mobile Client                 Next.js API              Agent Daemon           Redis Queue
     |                             |                          |                    |
     |--Reject Task (reason)------>|                          |                    |
     |                             |--Mark job FAILED--------->|                    |
     |                             |--Discard sandbox branch-->|                    |
     |                             |--(optional) Enqueue retry job with reason----->|
     |<--Ack----------------------|                          |                    |
     |<===Realtime: FAILED / new PENDING (if retried)========>|                    |
```

### 10.3 Network Interruption & Resume Flow

```
Mobile Client (backgrounded / offline)         Agent Daemon (continues on VPS)
     |                                                   |
     |     (device loses connectivity)                   |--- continues clone/edit/build ---
     |                                                   |
     |     (app reopened, connectivity restored)          |
     |--Re-subscribe to Realtime channel----------------->|
     |--Catch-up query: jobs.status + job_logs since ts--->|
     |<--Reconciled state (current status + missed logs)--|
     |     UI resumes exactly where the daemon currently is
```

---

## 11. API Contract Overview

| Endpoint | Method | Purpose | Response |
|---|---|---|---|
| `/api/auth/github/callback` | GET | GitHub OAuth callback, session creation | Redirect + session cookie |
| `/api/repos` | GET | List connected repositories for the authenticated user | `200 OK`, repo array |
| `/api/jobs` | POST | Submit a new intent as a job | `202 Accepted`, `{ job_id, status }` |
| `/api/jobs/:id` | GET | Fetch current job state + latest diffs | `200 OK`, job object |
| `/api/jobs/:id/logs` | GET | Catch-up log fetch since a given timestamp | `200 OK`, log array |
| `/api/jobs/:id/approve` | POST | Approve a `BUILD_VERIFIED` job for push | `202 Accepted` |
| `/api/jobs/:id/reject` | POST | Reject a `BUILD_VERIFIED` job, optional retry reason | `202 Accepted` |
| `/api/webhooks/vercel` | POST | Inbound deployment status callback | `200 OK` |

All authenticated endpoints require a valid Supabase session; job-mutating endpoints additionally verify the requesting user owns or has been granted access to the target repository.

---

## 12. Security, Non-Functional Requirements & Zero-Cost Resilience

### 12.1 Security Requirements

- **Token Isolation:** GitHub OAuth write tokens are stored server-side only (Supabase encrypted storage / VPS environment secrets) and are never serialized into client-side JS bundles, API responses, or logs. All git operations execute exclusively inside the VPS daemon process.
- **BYOK Key Encryption:** User-supplied AI provider API keys (OpenRouter, Gemini, custom endpoints) are encrypted at rest in the `user_settings` table; decryption occurs only inside the VPS daemon process at the moment of an outbound model call. Keys are never returned in plaintext to the client after initial save — the Settings Drawer displays a masked placeholder on subsequent visits.
- **Least-Privilege OAuth Scope:** Only `repo` write scope is requested; no organization-admin or account-level scopes.
- **Branch Protection Respect:** The daemon defaults to pushing to a dedicated working branch (`waycode/task-{id}`) and opening a pull request rather than committing directly to `main`/`master`, unless a repository owner has explicitly configured direct-push permissions.
- **Sandbox Isolation:** Each job executes inside its own isolated directory under `/var/waycode/sandbox/{job-id}/`, with no access to other jobs' workspaces, provider keys, or GitHub tokens.
- **Transport Security:** All client-server and realtime traffic over TLS (HTTPS/WSS); no plaintext fallback.
- **Audit Logging:** Every approve/reject action and every provider-configuration change is attributed to a specific authenticated user and timestamped immutably.

### 12.2 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Zero Local Compute** | The mobile client performs no compilation, linting, or build execution locally — 100% of compute is offloaded to the VPS daemon. |
| **Fault Tolerance** | Mobile network disconnects, backgrounding, or cell-tower handoffs (e.g., 5G to Wi-Fi) must never interrupt a queued or in-flight agent task; the daemon is fully decoupled from client connection state. |
| **Availability** | Agent daemon target uptime of 99.5%, enforced via PM2 auto-restart and VPS-level process monitoring. |
| **Latency** | Job submission acknowledgment (`202 Accepted`) returned within 500ms under normal load. |
| **Scalability** | Redis queue and worker pool designed to scale horizontally (multiple PM2 worker instances) as concurrent job volume grows. |
| **Data Durability** | All job state, logs, and diffs persisted in Supabase PostgreSQL; Redis is a transient buffer only, never the system of record. |
| **Portability** | Local-to-VPS migration path documented and reproducible (see §13). |
| **Mobile Optimization** | All touch targets ≥ 44x44px; no horizontal overflow at any supported viewport width; zero cumulative layout shift (CLS) on chat stream updates and log-line streaming. |

### 12.3 Zero-Cost Resilience

A core design constraint of WayCode is that the entire pipeline is demonstrable and fully functional using only free-tier infrastructure, ensuring the system is reproducible for academic evaluation and viable for an individual developer without a hosting budget:

| Component | Zero-Cost Path |
|---|---|
| AI Provider | OpenRouter `:free`-suffixed models (Gemini 2.0 Flash Exp, Llama 3.3 70B Instruct, DeepSeek R1, Qwen 2.5 Coder 32B Instruct) |
| Queue | Self-hosted Dockerized Redis (`redis:alpine`) — no managed-Redis subscription required |
| Backend/Database | Supabase Free Tier (Auth, PostgreSQL, Realtime included within free project limits) |
| Frontend Hosting | Vercel Hobby plan |
| Daemon Hosting | Any low-cost VPS tier sufficient to run a single PM2-managed Node/Python process (Hostinger VPS used as the reference deployment target) |

The BYOK model (§7.2) means a user who exceeds free-tier model rate limits can seamlessly supply a billed key without any code or infrastructure change — the zero-cost path is the default, not a hard ceiling.

---

## 13. DevOps, Deployment & Migration Blueprint

### 13.1 Local Development Setup (Windows / Docker Desktop)

1. Install Docker Desktop with WSL2 backend enabled.
2. Run the Redis container locally (`redis:alpine` image) bound to a development-only port, isolated via a dedicated Docker Compose network.
3. Run the Next.js client via standard local dev server, pointed at a Supabase development project (separate from production).
4. Run the agent daemon worker process directly (via a process manager suited for hot-reload during development), connected to the local Redis instance and development Supabase credentials.
5. Use a scratch/sandbox GitHub repository for end-to-end testing to avoid polluting real project history during development.

### 13.2 VPS Production Deployment (Hostinger)

1. Provision a Hostinger VPS instance with Docker installed.
2. Deploy the Redis container in production mode with persistence (AOF or RDB snapshotting enabled) and firewall rules restricting access to the daemon host only.
3. Install PM2 globally on the VPS; configure the agent daemon as a PM2-managed process with auto-restart, log rotation, and startup-on-boot enabled.
4. Configure environment secrets (GitHub App credentials, Gemini/Antigravity API keys, Supabase service role key, WhatsApp Cloud API credentials) via VPS-level environment variables — never committed to source control.
5. Configure SSH-key-based deployment access; disable password authentication on the VPS.
6. Point the GitHub webhook (for push events) at the Vercel deployment hook; confirm Vercel project is linked to the correct production branch.

### 13.3 Migration Blueprint Summary

```
+-----------------------+        +-----------------------+
| Local (Windows/Docker) |  --->  |  Hostinger VPS (Prod)  |
+-----------------------+        +-----------------------+
 - Redis (dev container)          - Redis (persistent container)
 - Daemon (hot-reload)            - Daemon (PM2-managed)
 - Dev Supabase project           - Prod Supabase project
 - Scratch GitHub repo            - Real connected repositories
```

Migration steps: (1) freeze and export any dev-only queue state if needed for debugging, (2) promote environment secrets to VPS secret storage, (3) point the client's environment configuration at production Supabase and API base URLs, (4) smoke-test the full submission-to-deployment flow against a low-risk repository before enabling for all connected repositories.

---

## 14. Observability, Monitoring & Alerting

| Signal | Tool / Mechanism | Alert Condition |
|---|---|---|
| Daemon process health | PM2 process monitoring | Process crash-loop (>3 restarts in 5 min) |
| Queue depth | Redis queue length metric | Queue depth exceeds threshold (backlog building) |
| Job failure rate | Supabase `jobs` table aggregation | Failure rate exceeds baseline over rolling 1-hour window |
| Realtime delivery latency | Client-side timestamp diffing | Log delivery latency exceeds 3s consistently |
| Deployment webhook failures | Vercel/GitHub webhook response codes | Non-2xx webhook response |

---

## 15. Success Metrics & KPIs

| Metric | Definition | Target (Post-Launch) |
|---|---|---|
| **Time-to-Acknowledgment** | Time from intent submission to `202 Accepted` | < 500ms (p95) |
| **Time-to-Review-Ready** | Time from submission to `BUILD_VERIFIED` | < 5 minutes for typical single-file changes (p50) |
| **Approval Rate** | % of `BUILD_VERIFIED` jobs approved without rejection | > 70% |
| **Task Continuity Rate** | % of jobs unaffected by client disconnection events | 100% (architectural guarantee) |
| **Deployment Notification Reliability** | % of successful deployments with delivered WhatsApp confirmation | > 99% |
| **Self-Heal Recovery Rate** | % of jobs that fail an initial `run_syntax_check` but reach `BUILD_VERIFIED` within the bounded self-heal attempt limit | > 60% |
| **Weekly Active Repositories** | Distinct repositories with at least one submitted job per week | Growth-tracked, no fixed launch target |

---

## 16. Risks, Assumptions & Mitigations

| Risk / Assumption | Impact | Mitigation |
|---|---|---|
| Agent-generated code fails to build repeatedly for complex intents | Poor user trust, wasted VPS compute | Cap automatic retry attempts; surface a clear "needs manual intervention" state rather than looping silently |
| GitHub API rate limiting under high concurrent job volume | Delayed clone/push operations | Use authenticated (higher-limit) API requests; queue-level backpressure when nearing rate limits |
| Single VPS instance as a single point of failure for the daemon | Full pipeline outage | PM2 auto-restart mitigates process-level failure; documented path to multi-instance horizontal scaling as a future milestone |
| WhatsApp Cloud API message template approval delays | Deployment notifications blocked | Pre-register and get template approval for notification message formats well ahead of launch |
| Sensitive code exposure via third-party LLM API (OpenRouter/Gemini/custom endpoints) | IP/security concern for private repos | Document data-handling policy clearly; scope sandbox context sent to the model to only the files relevant to the task |
| Free-tier model rate limits or degraded quality on `:free`-suffixed models | Job failures or repeated self-heal exhaustion under load | Surface a clear in-app prompt to configure a billed BYOK key when free-tier limits are consistently hit |

---

## 17. Release Roadmap & Milestones

| Phase | Scope | Key Deliverables |
|---|---|---|
| **Phase 0 — Foundations** | Auth, repo connection, basic job submission | GitHub OAuth, `jobs` table, `202 Accepted` ingestion pipeline |
| **Phase 1 — Core Loop (MVP)** | End-to-end single-file task execution and review | Redis queue, agent daemon MVP, diff review modal, approve/reject flow |
| **Phase 2 — Telemetry & Reliability** | Real-time log streaming, reconnection handling, PM2 hardening | Supabase Realtime integration, catch-up sync, crash-recovery daemon config |
| **Phase 3 — Notification & CI/CD** | Automated push, Vercel deploy trigger, WhatsApp confirmation | GitHub webhook wiring, WhatsApp Cloud API integration |
| **Phase 4 — Polish & Scale** | Multi-file diffs, job history/audit, template gallery expansion | Job History screen, expanded preset templates, horizontal worker scaling groundwork |

---

## 18. Appendix

### 18.1 Glossary

- **Intent:** The natural-language description of a desired engineering outcome submitted by the user.
- **Job:** A single durable unit of work tracked from submission through completion or failure.
- **Daemon:** The persistent background process on the VPS that executes agent tasks.
- **Sandbox:** An isolated, per-job filesystem workspace used for cloning, editing, and building.
- **CDC (Change Data Capture):** The mechanism by which Supabase Realtime streams database row changes to subscribed clients.
- **BYOK (Bring Your Own Key):** The pattern allowing a user to supply their own AI provider API key/model selection in-app rather than relying solely on a system-default configuration.
- **ACI (Agent-Computer Interface):** The tool-calling pattern by which the model interacts with the sandbox filesystem exclusively through deterministic, harness-mediated tools (`list_files`, `read_file`, `edit_file`, `run_syntax_check`) rather than free-form output.
- **Self-Healing Loop:** The bounded retry mechanism in which a failed `run_syntax_check` result is fed back to the model as corrective context, allowing it to re-attempt `edit_file` calls before a job is escalated to `FAILED`.

### 18.2 Out-of-Scope for v1.0

- Multi-agent collaboration on a single job.
- In-app code editing (manual edits to agent-generated diffs before approval).
- Support for non-GitHub source control providers (GitLab, Bitbucket).
- Native iOS/Android binaries (v1.0 targets installable PWA only).

### 18.3 Document Control

| Field | Value |
|---|---|
| Author | Generated per Principal PM / Lead UX / Solutions Architect brief |
| Audience | University academic review committee, engineering stakeholders |
| Review Cycle | Draft — pending major project review feedback |