# 🧠 CogniCanvas / SynapseLearn (v1.3)

> **Master Knowledge & Visual Thinking Desktop System**  
> Built with **Electron**, **TypeScript** (Strict Mode), **React**, **Tailwind CSS**, and **Vite**.

---

## 🌟 Key Features

1. **Local-First Hybrid Architecture:**
   - Pure Markdown (`.md`) files in `notes/` and JSON Canvas (`.canvas.json`) files in `canvases/` serve as the permanent source of truth.
   - Relational SQLite-compatible query index with WAL mode and **FTS5 Full-Text Search (BM25 ranking)**.
   - 3-step atomic write protocol (`.tmp` write $\rightarrow$ `fsync` $\rightarrow$ atomic rename) with 30-day diff histories in `.workspace/history/`.

2. **Deterministic Session FSM & Anti-Idle Focus Engine:**
   - 8-state deterministic finite state machine (`IDLE`, `CONFIGURING`, `ACTIVE_FOCUS`, `AUTO_PAUSED`, `MANUAL_PAUSED`, `EVALUATION_MODAL`, `COMMITTED`, `TERMINATED_ABORT`).
   - Anti-idle heartbeat tracker with 180s idle warning and 300s inactivity auto-pause cutoff (deducts 300s immediately upon cutoff).
   - In-memory `SessionDeltaBuffer` aggregating mutations in real-time ($<1\text{ ms}$) for zero-overhead HUD and session evaluation.
   - Task prioritization: `Topics to Learn` (P1/P2/P3) mapped into frozen session snapshots `Things to Do`.

3. **Dynamic Knowledge Graph Engine & Session Glow Shaders:**
   - Off-main-thread Force-Directed physics simulation (Coulomb repulsion, Hooke spring attraction, center gravity).
   - 3-tier Level of Detail (LOD 1–3).
   - **Session Glow Effect:** Neon Emerald (`#10B981`) 1.2 Hz pulsing glow on nodes created during the session; Neon Blue (`#38BDF8`) edges with 40 px/s flowing photon particles.

4. **Visual Entity Standard & Transclusion:**
   - Semantic Visual Entities (`@entity_<slug>_<hash>`) with SHA-256 deduplication and WebP thumbnail generation (64x64, 256x256).
   - Multi-canvas transclusion with live cross-canvas synchronization.
   - Real-time AST Markdown parser recognizing `[[@entity_id|Label]]`, `[[Note Title]]`, `#tag`, and `#test [Q]|[A]`.

5. **Keyboard-First Command Palette & CLI:**
   - Floating command palette (`Ctrl+K` / `Cmd+K`).
   - Complete 14-command registry: `#links`, `#test`, `#tag`, `#graph`, `#stats`, `#todo`, `#canvas`, `#note`, `#review`, `#orphan`, `#session`, `#filter`, `#focus`, `#export`.
   - Virtualized Asset Drawer with streamed FTS5 BM25 search results.
   - 3-mode Drag-and-Drop pipeline (`application/x-cogni-entity` $\rightarrow$ Visual Node, Inline Backlink, or Quiz Card).

6. **Spaced Repetition (FSRS) & Deep Analytics:**
   - Modified Free Spaced Repetition Scheduler (FSRS) with Stability ($S$), Difficulty ($D$), and Retrievability ($R$) updating across 4 review grades (Again, Hard, Good, Easy).
   - Fullscreen `#review` flashcard runner.
   - Deep analytics metrics: Flow Index ($FI$), Graph Growth Rate ($GGR$), Retention Rate, and Streak Engine with 14-day freeze protection.
   - Automated Feedback Loop (Score 1.0–5.0) updating task priorities and review intervals.

7. **Zero-Trust Electron Security:**
   - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
   - Strict Content Security Policy (CSP).
   - Path traversal validation on all file operations.
   - Intercepted navigation opening external links strictly in the system default browser via `shell.openExternal`.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ or v20+ recommended)
- npm / pnpm / yarn

### Installation
```bash
npm install
```

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Type Checking & Automated Tests
```bash
# Strict TypeScript Typecheck
npm run typecheck

# Run Core Test Suite (FSRS, FSM, AST Parser, Analytics)
npx tsx tests/core.test.ts
```

---

## 📂 Project Structure

```
├── src/
│   ├── main/                 # Electron Main Process (Privileged Node.js)
│   │   ├── services/         # FileSystem, Database (FTS5), Asset, Recovery services
│   │   ├── ipc/              # Typed IPC request/response dispatchers
│   │   ├── security.ts       # CSP headers and navigation blockers
│   │   └── index.ts          # BrowserWindow lifecycle
│   │
│   ├── preload/              # Isolated Preload Script (ContextBridge)
│   │   ├── index.ts          # window.electronAPI exposure
│   │   └── index.d.ts        # TypeScript ambient definitions
│   │
│   ├── renderer/             # Sandboxed React 18+ UI (Strict TypeScript)
│   │   ├── src/components/   # Viewports, Modals, Editor, Canvas, Graph, Drawer
│   │   ├── src/state/        # FSM SessionManager, Workspace store
│   │   └── src/styles/       # Tailwind CSS & custom neon glow animations
│   │
│   └── shared/               # Shared TypeScript interfaces & FSRS algorithms
│       ├── types/            # Database, Canvas v1.3, Session, FSRS, Analytics, Commands
│       ├── ipc/              # Channels and typed contracts
│       └── constants/        # System thresholds, limits, and color palettes
│
├── tests/                    # Automated test suites
├── electron.vite.config.ts   # Vite bundler configuration
└── package.json
```

---

## 📄 License
MIT © CogniCanvas Team
