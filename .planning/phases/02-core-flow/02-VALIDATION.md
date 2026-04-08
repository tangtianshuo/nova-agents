---
phase: 2
slug: core-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Vite-native testing) |
| **Config file** | vitest.config.ts (exists at project root) |
| **Quick run command** | `bun test --run` |
| **Full suite command** | `bun test --run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --run` (watch mode: `bun test`)
- **After every plan wave:** Run `bun test --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-08, AUTH-04 | unit | `bun test src/renderer/context/__tests__/AuthContext.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | UX-01 | unit | `bun test src/renderer/components/__tests__/OtpInput.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-08 | integration | `grep -c "AuthProvider" src/renderer/App.tsx` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | AUTH-05, AUTH-10, UX-02 | unit | `bun test src/renderer/pages/__tests__/LoginPage.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | AUTH-05, AUTH-10, UX-02 | unit | `bun test src/renderer/pages/__tests__/RegisterPage.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/renderer/context/__tests__/AuthContext.test.tsx` — stubs for AUTH-04, AUTH-08
  - Test: `AuthContext initializes with isLoading=true`
  - Test: `AuthContext.validateToken() sets isAuthenticated on valid token`
  - Test: `AuthContext.logout() clears AppConfig.auth and dispatches auth:logout event`
- [ ] `src/renderer/components/__tests__/OtpInput.test.tsx` — stubs for UX-01
  - Test: `OtpInput accepts 6-digit pasted codes`
  - Test: `OtpInput auto-focuses next input on digit entry`
- [ ] `src/renderer/pages/__tests__/LoginPage.test.tsx` — stubs for AUTH-05, AUTH-10
  - Test: `LoginPage shows 60-second countdown after sendSmsCode()`
  - Test: `LoginPage shows loading state during login`
  - Test: `LoginPage displays error messages for invalid/expired/rate-limited codes`
- [ ] `src/renderer/pages/__tests__/RegisterPage.test.tsx` — stubs for AUTH-05, AUTH-10
  - Test: `RegisterPage shows 60-second countdown after sendSmsCode()`
  - Test: `RegisterPage validates username (2-20 chars)`
  - Test: `RegisterPage shows loading state during register`
- [ ] `src/renderer/context/__tests__/testHelpers.ts` — shared fixtures (mock TauriAuthClient, mock AppConfig)

**Framework status:** vitest.config.ts exists at project root (Vite-native testing).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-tab logout sync | AUTH-04 | Requires 2+ browser tabs | 1. Open app in 2 tabs, 2. Login in Tab 1, 3. Logout in Tab 1, 4. Verify Tab 2 shows logged-out state |
| SMS countdown timer accuracy | AUTH-05 | Requires real-time observation | 1. Click "Send SMS", 2. Verify countdown starts at 60, 3. Verify button disabled until 0 |
| Error message copy accuracy | AUTH-10 | Requires Chinese language verification | Compare displayed errors with UI-SPEC copy contract (Section 3.2) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (4 test files to create in Wave 0)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
