# vault-ai

Local-first desktop app for personal finance management, built with a Tauri (Rust) backend and a React + TypeScript frontend. All data is stored locally in SQLite — no backend server required.

## Tech stack

- **Shell / runtime**: [Tauri v2](https://tauri.app/) (Rust backend, native webview)
- **Frontend**: React 19 + TypeScript, bundled with [Vite](https://vitejs.dev/)
- **Styling**: Tailwind CSS v4
- **UI components**: [shadcn/ui](https://ui.shadcn.com/)
- **Local data**: SQLite via `tauri-plugin-sql`

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Tauri's platform-specific system dependencies — follow the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS

## Getting started

Install dependencies:

```bash
npm install
```

Run the app in development mode (starts Vite and opens the native window with hot reload):

```bash
npm run tauri dev
```

## Other commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run only the Vite dev server (frontend in the browser, no native shell) |
| `npm run tauri dev` | Run the full desktop app in development mode |
| `npm run tauri build` | Build the production desktop app bundle |
| `npm run build` | Type-check and build the frontend only |
| `npm run test` | Run the test suite (Vitest) |

## Project structure

- `src/components` — React components (`src/components/ui` holds shadcn-generated primitives)
- `src/lib` — shared utilities
- `src/hooks` — custom React hooks
- `src/context` — React context providers
- `src/db` — local SQLite access layer (queries, schema, migrations)
- `src-tauri` — Rust backend, Tauri commands, and native integrations

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
