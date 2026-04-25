# Milestones

## v1.0.1 Startup Optimization (Shipped: 2026-04-25)

**Phases completed:** 2 phases, 4 plans, 8 tasks

**Key accomplishments:**

- Added Rust startup profiling with ulog_info! timing logs at each initialization stage
- Added frontend startup profiling with performance.now() for cross-layer timing comparison
- Redesigned native splash overlay with warm brand aesthetics and 4-stage horizontal progress indicators
- Implemented spinner animations and staggered fadeSlideIn transitions
- Added dark/light mode support via prefers-color-scheme media query
- Fixed overlay window configuration (explicit size, center, visible)

---

## v1.0 Settings Componentization (Shipped: 2026-04-12)

**Phases completed:** 6 phases, 18 plans, ~50 tasks

**Key accomplishments:**

- Settings.tsx refactored from 5707 lines to 16 modular components (~4000 lines total)
- JWT auth with refresh rotation using jose library
- CustomProviderDialog with full form validation, protocol selection
- CustomMcpDialog with dual-mode (form/JSON), transport selector
- DeleteConfirmDialog using click-outside-to-close pattern
- PlaywrightConfig, EdgeTtsConfig, GeminiImageConfig panels extracted
- TypeScript strict mode 100% compliant
- ESLint react-hooks rules fully compliant
- All component files under 500 lines

---
