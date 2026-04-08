# Requirements: nova-agents SMS Auth

**Defined:** 2026-04-08
**Core Value:** 用户能够通过手机号 + 短信验证码安全地登录或注册 nova-agents，实现个人身份与工作区的绑定。

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: 用户可使用手机号 + 短信验证码注册新账号（输入手机号→发送验证码→输入验证码→输入用户名→注册成功）
- [ ] **AUTH-02**: 用户可使用手机号 + 短信验证码登录已有账号（输入手机号→发送验证码→输入验证码→登录成功）
- [ ] **AUTH-03**: 登录态持久化 — 重启应用后保持登录状态（Token 存入磁盘）
- [ ] **AUTH-04**: 用户可登出账号（清除 Token，所有 Tab 同步更新）
- [ ] **AUTH-05**: 短信发送频率限制 — 60s 倒计时防刷，显示剩余时间
- [ ] **AUTH-06**: SDK HTTP 通过 Rust 代理层 — TauriAuthClient 封装，路由经 `invoke('proxy_http_request')`
- [ ] **AUTH-07**: 自定义 DiskTokenStorage — 实现 SDK TokenStorage 接口，backend 为 `~/.nova-agents/config.json`，与现有 disk-first 模式一致
- [ ] **AUTH-08**: AuthContext 全局态 — 置于 App.tsx 根层级，位于 TabProvider 之上，所有 Tab 共享
- [ ] **AUTH-09**: Auth API baseURL 可配置 — 支持开发/生产环境不同地址
- [ ] **AUTH-10**: 错误处理完善 — 验证码错误/过期/频率限制/网络错误 有明确提示

### User Experience

- [ ] **UX-01**: 验证码输入支持粘贴
- [ ] **UX-02**: 加载状态 — 发送验证码/登录/注册 过程中有 loading 状态
- [ ] **UX-03**: 登录注册页面 — 独立路由，与现有 Chat/Settings/Launcher 并列

## v2 Requirements

### Authentication

- **AUTH-11**: 单个数字 OTP 输入框（6格），自动聚焦下一个
- **AUTH-12**: 验证码自动提交（输入完6位即触发验证）
- **AUTH-13**: 记住设备（免密登录）
- **AUTH-14**: 短信配额警告（显示剩余发送次数）
- **AUTH-15**: 语音验证码 fallback（电话呼叫）

### Multi-User

- **AUTH-16**: 多用户切换（同一设备多个账号）
- **AUTH-17**: 多设备登录管理（查看/注销其他设备）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 密码登录/注册 | 仅支持短信验证码 |
| OAuth 第三方登录 | 未来 v2 考虑 |
| 微信/支付宝账号绑定 | 未来 v2 |
| 人脸/指纹认证 | 桌面端无意义 |
| SMS 每次启动都验证 | 桌面端 TOKEN 机制足够 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| AUTH-08 | Phase 2 | Pending |
| AUTH-09 | Phase 1 | Pending |
| AUTH-10 | Phase 2 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation*
