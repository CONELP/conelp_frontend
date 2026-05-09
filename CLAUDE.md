# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

CONELP Frontend: a Vue 3 + TypeScript + Vite demo for a construction-site document conversion service. The user uploads site images; the backend (not in this repo) runs OCR and document generation. This repo currently focuses on the **frontend click-through demo** — no real API, OCR, or file upload yet. All state is driven by mock/seed data.

Supported document types (see seed + catalog contract in `docs/plans/frontend-ui-ux-plan.md`): `daily_report`, `material_inspection_rebar`, `concrete_delivery_csi`, `concrete_strength_csi`, `inspection_request`.

Demo flow: `Document Selection → Upload → Upload Feedback → Conversion Loading → Result`. Each screen is reachable as its own `/preview/*` route so it can be reviewed in isolation before the integrated walkthrough stage.

## Commands

- `npm run dev` — start Vite dev server (main way to review screens during implementation).
- `npm run build` — typecheck with `vue-tsc --noEmit` and build with Vite. Use this as the typecheck command; there is no separate `lint` or `test` script.
- `npm run preview` — preview the production build.

No test runner is configured. Don't invent lint/test commands.

## Architecture

Feature-based Clean Architecture (see `docs/guidelines/dev_structure.md` — this is the authoritative structure doc; follow it when adding new features).

```
src/
  app/           # app init: router, pinia provider, global styles/tokens, App.vue
  features/<feature>/
    ui/          # *Page.vue entry pages (imported directly by the router) + ui/components/
    state/       # Pinia store + useViewModel composable
    services/    # one <feature>.service.ts of pure functions (don't pre-split into use cases)
    model/       # feature-local TS types (separate input types from page output types)
    data/        # seed / mock data
    index.ts     # public re-exports
  shared/        # only when something is actually reused across features
```

Key conventions:

- **Data flow:** `Pinia store → useViewModel (store + service) → Page → Components`. Pages assemble layout, components take props/emit — judgment logic lives in service, not in pages.
- **Routing:** the app router (`src/app/router/index.ts`) imports feature `ui/*Page.vue` files directly. Do not add a top-level `src/pages/` folder.
- **Keep service files consolidated.** Don't split into `repository`/`adapter`/`api` layers until complexity actually demands it.
- **Naming:** feature folders and `.service.ts`/`.types.ts`/`.seed.ts` files are `kebab-case`; Vue SFCs are `PascalCase`; composables/stores match their exported name (`useFooStore.ts`).
- **Path alias:** `@/*` → `src/*` (configured in both `vite.config.ts` and `tsconfig.json`).
- **Vue style:** Composition API with `<script setup lang="ts">`.

## Design System

Follow `docs/guidelines/design.md`. Design tokens are defined as CSS variables in `src/app/styles/tokens.css` — **use the tokens**, don't hardcode colors or radii.

- Neutral gray canvas (`--canvas: #f4f4f4`) + single primary blue (`--primary: #1e1888`). No additional accent colors in the base system.
- Mobile-first, desktop-second. One "compact desktop" breakpoint only — adjust density/columns, don't introduce separate mobile patterns.
- Restrained, flat UI by default. **Glow / gradient / animation are allowed only in AI-experience zones** (primarily the conversion-loading screen) and must serve status communication, not decoration.
- State (success/error/progress) must never be conveyed by color alone — pair with text, icon, outline, or structural marker.

## Planning Docs

- `docs/plans/frontend-ui-ux-plan.md` is the live, stage-by-stage plan for the conversion demo (including fixed contracts A–F for catalog, upload data, loading states, result data, screen flow, and messaging). Treat the stage checklist as source of truth for what's done and what's next — update it rather than creating new plan files.
- `docs/guidelines/plan_document.md` is the meta-rule for how to write/update plan documents: minimize new files, prefer updating the existing plan, each stage needs `목표 / 커밋 메시지 / 결과물 / 체크포인트 / 완료 기준`, last stage is QA.

## Commit Style

Conventional-commit prefixes seen so far: `feat:`, `docs:`. Messages are short imperative English phrases (e.g. `feat: build conversion loading demo screen`). Each plan stage pre-specifies its commit message — use it.
