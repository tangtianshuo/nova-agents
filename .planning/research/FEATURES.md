# Feature Landscape: SMS Authentication Desktop UX

**Domain:** Desktop application SMS authentication (phone + verification code login/register)
**Researched:** 2026-04-08
**Confidence:** MEDIUM (SDK interface verified; general UX patterns from training data, search tools unavailable for verification)

---

## Executive Summary

SMS authentication on desktop differs fundamentally from mobile: no native SMS auto-read, keyboard-first navigation, and users often switching between phone and desktop. The UX must bridge this gap with clear input patterns, clipboard support, and fallbacks when SMS fails. For nova-agents specifically, the auth flow must integrate with the existing warm paper design system and respect the Rust proxy architecture constraint.

---

## SDK Capabilities (Verified)

From `src/SDK/nova-auth-sdk/src/client/AuthClient.ts`:

| Method | Purpose |
|--------|---------|
| `sendSmsCode(phone, type)` | Send verification code (`'login'` \| `'register'`) |
| `smsLogin(phone, code)` | Verify code + receive tokens |
| `smsRegister(phone, code, username)` | Register new account + receive tokens |
| `getSmsStats(phone)` | Get today's SMS send count (for rate limit UI) |
| Token auto-refresh | Built-in via `AuthClient` |
| Storage | localStorage by default (PROJECT.md requires disk-first override) |

---

## 1. Table Stakes Features

Features users expect in any SMS auth flow. Missing these = product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | nova-agents Status |
|---------|--------------|------------|-------------------|
| **Phone number input** | Core identifier for SMS auth | Low | Must build |
| **Country code selector** | International users must select prefix (+1, +86, etc.) | Medium | Must build |
| **Verification code input** | 4-6 digit OTP entry field | Low | Must build |
| **Countdown timer (resend)** | Rate limit feedback; standard 60s cooldown | Low | Must build |
| **"Resend code" button** | Required after countdown expires | Low | Must build |
| **Error: invalid code** | Clear message when code wrong/mismatch | Low | Must build |
| **Error: expired code** | Clear message with resend CTA | Low | Must build |
| **Error: rate limited** | Show when SMS quota exceeded (use `getSmsStats`) | Medium | Must build |
| **Loading states** | During send and verify API calls | Low | Must build |
| **Success confirmation** | Visual confirmation on successful login/register | Low | Must build |
| **Keyboard navigation** | Tab/Enter support for form submission | Low | Must build |
| **Logout** | User-initiated session termination | Low | Must build |

### Desktop-Specific Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Clipboard paste for code** | Users copy SMS code from phone to desktop | Low | Must support full-code paste (split digits optional) |
| **Auto-focus management** | Focus phone input first, then code input after send | Low | Critical for keyboard-first flow |
| **No SMS auto-read** | Desktop cannot access phone SMS; must display code instructions | Low | Remind user to check phone |
| **Window focus on login** | If OAuth deep link used, handle window refocus | Medium | Only if future OAuth added |

---

## 2. Differentiators

Features that set the product apart. Not expected but valued when present.

| Feature | Value Proposition | Complexity | When to Include |
|---------|-------------------|------------|-----------------|
| **Remember this device** | Skip SMS on trusted devices for N days | Medium | v2 (out of scope for v1) |
| **Real-time phone validation** | Validate format (E.164) before send; show error inline | Medium | v1 (prevents failed sends) |
| **Phone number formatting** | Auto-format as user types (e.g., `138 1234 5678`) | Medium | v1 (reduces friction) |
| **Auto-submit on complete code** | When all 6 digits entered, auto-verify (no "submit" button needed) | Low | v1 (reduces click) |
| **Single-digit OTP input (6 boxes)** | One input per digit; auto-advance on type; paste splits across boxes | High | v1 (modern expectation) |
| **"Call me instead" fallback** | Voice call as alternative when SMS fails | High | v2 (requires backend support) |
| **WhatsApp/email fallback** | Alternative verification channels | High | v2 |
| **SMS quota warning** | "You have 3 SMS remaining today" before send | Medium | v1 (good UX + rate limit awareness) |
| **Logged-in indicator** | Show user identity in UI after login (avatar/name in header) | Medium | v1 (confirms auth state) |
| **Skip login for guest** | Browse product before auth (auth-gated features show login prompt) | Medium | v2 (depends on feature gating strategy) |
| **Concurrent session indicator** | "Logged into 2 devices" for transparency | High | v2 |

---

## 3. Anti-Features

Features to explicitly NOT build (per PROJECT.md and general SMS UX wisdom).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Password login/register** | Out of scope | SMS-only per PROJECT.md |
| **OAuth third-party login** | Out of scope | SMS-only per PROJECT.md |
| **Account binding (WeChat/Alipay)** | Future v2 | Keep SMS as sole auth method |
| **Multi-device login management** | Future v2 | Simple logout only for now |
| **Biometric auth (fingerprint/face)** | Meaningless on desktop | N/A |
| **SMS on every launch** | Annoying for returning users | Token persistence; only re-auth when token expires |
| **Countdown > 60s** | Feels eternal; user abandons | 60s is standard; show "Resend" only after countdown |
| **No fallback when SMS fails** | Users get stuck | At minimum, show "Contact support" with error reference |
| **Forcing SMS before seeing product** | Kills conversion | Allow guest browsing with auth-gated features |
| **Countdown starts before SMS sent** | Misleading | Start countdown only after confirmed send success |

---

## 4. Desktop vs Mobile SMS Auth UX Differences

| Dimension | Mobile SMS Auth | Desktop SMS Auth | Implication for nova-agents |
|-----------|-----------------|-----------------|---------------------------|
| **SMS access** | Phone receives code; often auto-read via keyboard | User manually checks phone; copies code | Must support clipboard paste prominently |
| **Auto-read capability** | iOS/Android can auto-fill from SMS | No native auto-fill | Design code input for manual entry |
| **Input method** | Touch keyboard, large taps | Physical keyboard, Tab/Enter | Keyboard-first form design; auto-advance on digit entry |
| **Display size** | Small screen, single column | Large window, more real estate | Can show more context (privacy notice, terms) |
| **Notification reliance** | Push notification brings user back | User must manually switch to SMS app | Show clear "Check your phone" message with instructions |
| **Code delivery time** | Near-instant via carrier | Same (carrier-dependent) | No difference; still show loading + timeout handling |
| **Resend urgency** | High (user in flow on same device) | Lower (user context-switched) | Consider "Didn't get it?" with clear next steps |
| **Trust device option** | "Remember this device" checkbox common | Same, but checkbox UI fits better in desktop | Plan for v2 |
| **Session persistence** | App backgrounding keeps session | Desktop app runs continuously | Token persistence is critical (disk-first per PROJECT.md) |

---

## 5. Feature Dependencies

```
Phone Input
    │
    ├── Country Code Selector (required for international)
    │
    ├── Real-time Phone Validation ──► Prevents failed sends
    │       │
    │       └── E.164 Formatting
    │
    └── Send Button ──► [SDK: sendSmsCode()]
            │
            ├── Success: Start 60s Countdown Timer
            │       │
            │       ├── Show Resend after countdown
            │       └── Update SMS quota (getSmsStats)
            │
            ├── Error: Rate Limited ──► Show quota exceeded message
            │
            └── Error: Network ──► Show retry with fallback

Code Input (6 separate boxes OR single field)
    │
    ├── Paste Handler (splits clipboard code into digits)
    │
    ├── Auto-advance on digit entry
    │
    ├── Auto-submit when all digits filled
    │
    └── Submit Button (if not auto-submit)
            │
            ├── [SDK: smsLogin() or smsRegister()]
            │
            ├── Success: Store Token (disk-first per PROJECT.md) ──► Navigate to app
            │
            ├── Error: Invalid Code ──► Clear input, show error
            │
            └── Error: Expired ──► Prompt resend

Logout ──► [SDK: logout()] ──► Clear Token ──► Navigate to login
```

---

## 6. MVP Recommendation

### Phase 1 (v1 - Login/Register screens)

**Prioritize:**
1. Phone input with country code selector (foundation)
2. Verification code input (6-digit, single field with paste support)
3. Send code + countdown timer + resend
4. Login flow (`smsLogin`) + Register flow (`smsRegister` with username)
5. Error handling (invalid, expired, rate limited)
6. Loading states
7. Token persistence (disk-first override per PROJECT.md)
8. Logout
9. Auth state indicator in UI (user identity visible after login)

**Defer:**
- Single-digit OTP boxes (high complexity, single field + paste is sufficient for v1)
- Auto-submit on complete code (add submit button instead)
- SMS quota warning (nice to have, needs `getSmsStats` integration)
- Remember device (v2)
- Fallback channels (v2)
- Guest browsing (v2, depends on feature gating)

### Phase 2 (v2 - Enhanced)

- Single-digit OTP boxes with auto-advance
- Auto-submit on complete code
- SMS quota warning (`getSmsStats`)
- Phone number formatting (auto-format as type)
- Real-time phone validation

---

## 7. Design System Alignment

### Colors (from `design_guide.md`)

| Element | Token | Value |
|---------|-------|-------|
| Primary button | `--button-primary-bg` | `#c26d3a` |
| Input border (default) | `--line` | `rgb(28 22 18 / 0.10)` |
| Input border (focus) | `--ink` | `#1c1612` |
| Error text | `--error` | `#dc2626` |
| Error background | `--error-bg` | `#fee2e2` |
| Success text | `--success` | `#2d8a5e` |
| Muted text | `--ink-muted` | `#6f6156` |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Page title | `--text-2xl` (22px) | font-semibold |
| Section label | `--text-xs` (11px) | font-semibold, uppercase |
| Input text | `--text-base` (14px) | font-normal |
| Button text | `--text-sm` (13px) | font-medium |
| Helper text | `--text-xs` (11px) | font-normal |

### Spacing

| Element | Value |
|---------|-------|
| Card padding | `--space-5` (20px) |
| Input height | 40px (py-2.5 px-3) |
| Button height | 36px (py-2 px-4) |
| Gap between elements | `--space-3` (12px) |

### Component Specifications

**OTP Input (single field with paste):**
```
- Single <input> field, maxlength=6
- Font: --font-mono (monospace for digit clarity)
- Border: --line, focus: --ink
- Width: 200px (fits 6 digits comfortably)
- Text-align: center
```

**Countdown Timer:**
```
- Text: --ink-muted, --text-xs
- Format: "Resend in 45s" or "45s"
- Color change to --accent when clickable
```

**Primary Button:**
```
- Background: --button-primary-bg (#c26d3a)
- Text: white, --text-sm font-medium
- Radius: --radius-full (pill) for main CTA
- Padding: py-2 px-5 for large CTA
```

---

## 8. Architecture-Specific Considerations

### Rust Proxy Enforcement (from PROJECT.md)

All SDK HTTP calls must go through `invoke('cmd_proxy_http')`. The `AuthClient` uses native `fetch()` which must be wrapped.

**Implication:** The frontend must create a Tauri invoke wrapper around SDK methods, or the SDK must be modified to use the invoke bridge. This affects:
- `sendSmsCode` (HTTP POST)
- `smsLogin` (HTTP POST)
- `smsRegister` (HTTP POST)
- `getSmsStats` (HTTP GET)

### Token Storage Conflict

- **SDK default:** localStorage
- **App requirement:** Disk-first (`~/.nova-agents/config.json`)

**Solution options:**
1. Custom `TokenStorage` adapter that writes to disk
2. Sync layer: SDK writes to localStorage, app reads and persists to disk on change

### Multi-Tab Auth State

All tabs share the same auth state. Changes in one tab (login/logout) must propagate to others.

**Options:**
1. SSE broadcast on auth state change
2. Polling on window focus
3. localStorage event listener (`storage` event for same-origin tabs)

---

## 9. Error Handling Matrix

| Error Scenario | User Message | Action |
|----------------|--------------|--------|
| Invalid phone format | "Please enter a valid phone number" | Highlight input, focus phone field |
| SMS send failed (network) | "Failed to send code. Check your connection and try again." | Show retry button |
| SMS rate limited | "Too many requests. Try again in X minutes." | Show countdown to retry |
| Invalid verification code | "Incorrect code. Please check and try again." | Clear code input, focus code field |
| Expired verification code | "Code expired. Request a new one." | Auto-trigger resend flow |
| Registration: username taken | "This username is already taken." | Highlight username input |
| Registration: phone registered | "This phone number is already registered. Try logging in." | Switch to login tab |
| Token refresh failed | "Session expired. Please log in again." | Redirect to login |
| Backend unreachable | "Cannot connect to server. Check your internet." | Show retry button |

---

## 10. Sources

- **SDK Interface:** `src/SDK/nova-auth-sdk/src/client/AuthClient.ts` (verified)
- **SDK Types:** `src/SDK/nova-auth-sdk/src/types/auth.types.ts` (verified)
- **Design System:** `specs/guides/design_guide.md` (verified)
- **Project Context:** `.planning/PROJECT.md` (verified)
- **General SMS Auth UX Patterns:** Training data (LOW confidence - search tools unavailable)

---

## Gaps to Address

1. **Backend auth-server address** - Not confirmed (dev vs prod environments)
2. **SMS rate limit values** - Specific cooldown duration and daily limits not confirmed with backend team
3. **Token expiry duration** - Not specified; affects logout/session management
4. **Whether `getSmsStats` returns real-time quota** - Needs backend confirmation
5. **Username uniqueness validation** - Should validate before send (frontend) or only on submit?
6. **Deep link handling** - If future OAuth added, deep link schema needs design
