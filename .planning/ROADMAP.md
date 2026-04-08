# ROADMAP: nova-agents SMS Authentication

**Milestone:** v1.0 SMS Auth
**Granularity:** Coarse (2 phases)
**Created:** 2026-04-08

## Phases

- [x] **Phase 1: Foundation** - Auth transport layer + token storage (completed 2026-04-08)
- [ ] **Phase 2: Core Flow** - Auth UI + global state management

---

## Phase Details

### Phase 1: Foundation

**Goal:** Auth HTTP transport and token storage work end-to-end

**Depends on:** Nothing (first phase)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-06, AUTH-07, AUTH-09

**Success Criteria** (what must be TRUE):
1. User can send SMS code via `TauriAuthClient` wrapper (SDK fetch bypasses proxy)
2. User can register account with phone + SMS code + username
3. User can login with phone + SMS code
4. Token persists to `~/.nova-agents/config.json` after successful auth
5. Auth API baseURL is configurable per environment

**Plans:** 1/1 plans complete

---

### Phase 2: Core Flow

**Goal:** Complete auth UX with global state and all interactive flows

**Depends on:** Phase 1

**Requirements:** AUTH-04, AUTH-05, AUTH-08, AUTH-10, UX-01, UX-02, UX-03

**Success Criteria** (what must be TRUE):
1. User can logout and token is cleared from disk
2. After logout, all open tabs reflect logged-out state immediately
3. 60-second countdown displays after sending SMS code, preventing rapid re-send
4. Login and register pages render as independent routes (separate from Chat/Settings)
5. OTP input accepts pasted 6-digit codes
6. All auth operations show loading states during network requests
7. Errors display clear messages (invalid code, expired code, rate limited, network error)

**Plans:**
2/2 plans executed
- [x] 02-02-PLAN.md - LoginPage + RegisterPage with countdown and error handling

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/1 | Complete   | 2026-04-08 |
| 2. Core Flow | 2/2 | Complete   | 2026-04-08 |

---

## Coverage

**Requirements:** 13/13 v1 requirements mapped

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 2 |
| AUTH-05 | Phase 2 |
| AUTH-06 | Phase 1 |
| AUTH-07 | Phase 1 |
| AUTH-08 | Phase 2 |
| AUTH-09 | Phase 1 |
| AUTH-10 | Phase 2 |
| UX-01 | Phase 2 |
| UX-02 | Phase 2 |
| UX-03 | Phase 2 |

## Plan List

### Phase 2 Plans

- [x] 02-01-PLAN.md - AuthContext + OtpInput + App.tsx integration
  - Creates: AuthContext.tsx, OtpInput.tsx
  - Modifies: App.tsx (add AuthProvider, extend tab views)
  - Requirements: AUTH-08, AUTH-04, UX-01, UX-02

- [x] 02-02-PLAN.md - LoginPage + RegisterPage
  - Creates: LoginPage.tsx, RegisterPage.tsx
  - Modifies: App.tsx (add login/register routing), tab.ts (extend view type)
  - Requirements: AUTH-05, AUTH-10, UX-02, UX-03
  - Status: Complete (2026-04-08)
