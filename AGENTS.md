# AGENTS.md

## Project Context

This is a WXT + React browser extension project named `human-language-translator`.
The product goal is to translate hard-to-read industry language into clearer human-readable text.

Primary development branch right now: `feat-col_reasoning-lhg`.
The project was actively developed in concentrated batches during 2025 and is now entering a stabilization and evolution phase.

## Package Manager Policy

Use Bun as the project-level default package manager for install, dev, compile, build, and packaging.

Do not introduce npm, pnpm, or yarn workflows unless the user explicitly asks for a package-manager migration.
If lock files diverge, treat Bun as the intended source of truth and ask before deleting or regenerating lock files.

Standard commands:

```bash
bun install
bun run dev
bun run dev:firefox
bun run compile
bun run build
bun run build:firefox
bun run zip
bun run zip:firefox
```

Notes:

- `bun run dev` starts the default WXT development workflow.
- `bun run compile` runs TypeScript without emitting files.
- `bun run build` creates the Chrome extension build.
- `bun run zip` creates the distributable extension archive.
- Local build artifacts should stay out of git. Use `artifacts/` for local exports and keep generated zip/7z files ignored.

## Stability Phase Priorities

1. Keep the current branch synchronized with `origin/feat-col_reasoning-lhg` before starting new feature work.
2. Keep local packaged artifacts outside version control.
3. Normalize package-manager usage around Bun.
4. Document the expected Node/Bun environment once the working version is confirmed.
5. Keep changes small and verify core extension flows after dependency, WXT, or Vite changes.

Estimated cost:

- Artifact and ignore cleanup: low, usually less than 0.5 hour.
- Bun workflow documentation and package-manager normalization: low to medium, about 0.5-1.5 hours depending on lock-file cleanup.
- Environment documentation: low, about 0.5 hour once the known-good Bun and Node versions are confirmed.
- Basic regression checklist for daily-use flows: medium, about 1-2 hours.

## Evolution Route

Focus on changes that preserve the extension's daily usability while making it easier to maintain.

Recommended order:

1. Provider abstraction: make translation providers and model settings easier to swap without touching UI code.
2. Text-processing resilience: add long-text chunking, retry, and fallback behavior around translation requests.
3. UX iteration: improve copy, history, search, keyboard flow, and state recovery where they directly affect daily use.
4. Shared logic cleanup: keep reusable logic in hooks/services/shared modules instead of scattering behavior across popup, content, and background entrypoints.
5. Release workflow: standardize versioned local exports and packaging checks.

Estimated cost:

- Provider abstraction: medium, about 0.5-1 day.
- Long-text chunking/retry/fallback: medium, about 0.5-1.5 days depending on edge cases.
- UX iteration for daily workflows: medium, about 1-2 days if scoped to the popup and translation result area.
- Shared logic cleanup: medium to high, about 1-3 days depending on how much cross-entrypoint behavior is touched.
- Release workflow hardening: low to medium, about 0.5-1 day.

## Working Rules For Agents

- Prefer existing project patterns over new abstractions.
- Do not run package-manager commands with npm, pnpm, or yarn unless explicitly requested.
- Do not commit generated extension archives or local artifact folders.
- Before changing build, WXT, Vite, or package-manager configuration, explain the reason and expected impact.
- Treat daily usability as the first constraint: avoid broad rewrites unless they unlock a clear maintenance or product benefit.
