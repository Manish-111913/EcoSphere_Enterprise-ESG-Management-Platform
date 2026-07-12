# EcoSphere — THE COMPLETE BACKEND DOCUMENT (v2.0 — Unified)
> ONE file, everything backend: full specification (original design + all gap
> closures merged in) + the phased build prompts. This is the ONLY document
> you attach when building the backend. Supersedes docs 02, 07 and 08.
>
> Structure: PART A = Specification (attach & reference) · PART B = Build
> Prompts B0–B7 (paste one at a time) · PART C = Correctives & Final Checklist.

═══════════════════════════════════════════════════════════════════════════
# PART A — COMPLETE BACKEND SPECIFICATION
═══════════════════════════════════════════════════════════════════════════

# A1. Backend Responsibilities
1. **System of record** for all ESG master + transactional data (PostgreSQL).
2. **Rules & configuration engine** — settings, toggles, lookups, weights,
   unlock rules, approval rules, notification rules: ALL data-driven, nothing
   hardcoded.
3. **Calculation engines** — carbon (qty × emission factor with snapshots),
   scoring (pillar → department → weighted org score), gamification (XP
   ledger, badge rule evaluation, leaderboards).
4. **Workflow enforcement** — configurable state machines (challenge, issue),
   approval flows, atomic reward redemption.
5. **Security** — JWT auth (login/register/invite/reset), dynamic RBAC,
   validation, audit logging.
6. **Async processing** — reminders, overdue flagging, score recompute,
   deadline transitions, exports.
7. **Reporting** — 4 standard reports + custom builder + CSV/XLSX/PDF export.
8. **Notifications** — event bus → rules → in-app (+ email adapter).
9. **Dashboard analytics** — role-scoped aggregate endpoints powering all 7
   role dashboards.

# A2. Domains & Interactions
| Domain | Owns | Emits | Consumes |
|---|---|---|---|
| Authentication | users, tokens, invitations, resets | user.created | settings (policies, expiries) |
| Configuration | settings, lookups, transitions, weights, rules, templates | config.updated (cache-bust) | — |
| Administration | departments, categories, roles/permissions | department.updated | — |
| Environmental | emission_factors, operational_records, carbon_transactions, goals | carbon.recorded | auto-calc toggle, factors |
| Social | csr_activities, participations, diversity, training | csr.decided | categories, approval rules, evidence toggle |
| Governance | policies, acknowledgements, audits, compliance_issues | issue.raised, issue.overdue, policy.reminder | notification rules |
| Gamification | challenges, participations, xp_ledger, badges, rewards, redemptions | xp.credited, badge.awarded, reward.redeemed | categories, toggles |
| Scoring | department_scores | score.computed | E/S/G data + weight config |
| Notifications | notifications, rules, templates | — | all domain events |
| Reports/Dashboards | report_templates, exports, aggregate views | — | read models of everything |

Chain example: participation approved → XP credit → `xp.credited` → badge
engine → `badge.awarded` → notification dispatcher → in-app row (+ email).

# A3. DATABASE DESIGN (PostgreSQL, 3NF + transactional snapshots)
Conventions: PK `id UUID`, audit columns (`created_at/by, updated_at/by,
deleted_at`) everywhere, soft delete, `status_id` columns FK →
`lookup_values`, every FK indexed.

## A3.1 Identity, RBAC & Auth
- **users** — `id, employee_code UNIQUE, first_name, last_name, email UNIQUE,
  password_hash (argon2), department_id FK RESTRICT, designation, join_date,
  avatar_key, email_verified_at NULL, is_active, last_login_at`.
- **roles** — `id, name UNIQUE, description, is_system` (system roles
  undeletable, still remappable).
- **permissions** — `id, resource, action, UNIQUE(resource, action)`.
- **role_permissions** — `PK(role_id, permission_id)`, CASCADE — **the
  Admin-editable mapping**.
- **user_roles** — `PK(user_id, role_id)`.
- **refresh_tokens** — `id, user_id FK CASCADE, token_hash, expires_at,
  revoked_at`.
- **invitations** — `id, email, role_id FK, department_id FK, token_hash
  UNIQUE, invited_by FK, expires_at, accepted_at NULL`.
- **password_reset_tokens** — `id, user_id FK, token_hash, expires_at,
  used_at NULL` (single-use).

## A3.2 Configuration & Lookups (the "nothing hardcoded" backbone)
- **app_settings** — `key UNIQUE, value TEXT, value_type ENUM(string,number,
  boolean,json), category, description, is_public`. Seeded keys (values
  editable): `auto_emission_calc, evidence_required_csr,
  evidence_required_challenge, badge_auto_award, email_notifications_enabled,
  max_upload_mb, allowed_mime_types, redemption_limit_per_month,
  leaderboard_default_period, org_name, dept_weight_basis,
  default_signup_role, invite_expiry_hours, reset_expiry_minutes,
  dev_return_tokens, level_thresholds, storage_driver, dashboard_cache_ttl`.
- **lookup_types** — `code UNIQUE` (CHALLENGE_STATUS, ISSUE_STATUS,
  PARTICIPATION_STATUS, AUDIT_STATUS, GOAL_PERIOD, SEVERITY, DIFFICULTY,
  UNIT, EMISSION_SCOPE, NOTIFICATION_CHANNEL, REWARD_STATUS…).
- **lookup_values** — `lookup_type_id FK, code, label, color, sort_order,
  is_active, metadata JSONB, UNIQUE(type,code)`.
- **lookup_transitions** — state machines as data: `lookup_type_id,
  from_value_id, to_value_id, allowed_permission, UNIQUE(from,to)`. Seed the
  challenge machine (Draft→Active→Under Review→Completed; any→Archived) and
  the issue machine (Open→In Progress→Resolved→Closed).
- **esg_weight_configs** — `environmental_weight, social_weight,
  governance_weight, effective_from/to, is_active` +
  `CHECK (e + s + g = 100)`, all ≥ 0, no overlapping active ranges.
  Seed 40/30/30.
- **scoring_configs** — `pillar ENUM(E,S,G), metric_code
  (emission_vs_goal, csr_participation_rate, training_completion,
  diversity_index, policy_ack_rate, audit_score, open_issue_penalty),
  weight, normalization JSONB {min,max,direction}, is_active,
  UNIQUE(pillar, metric_code)`. Per-pillar weights sum to 100
  (service-validated).
- **approval_rules** — `entity_type ENUM(CSR_PARTICIPATION,
  CHALLENGE_PARTICIPATION), approver_role_id FK, scope ENUM(ANY,
  SAME_DEPARTMENT), evidence_required_override BOOL NULL, is_active`.
- **notification_templates** — `code UNIQUE, title_template, body_template,
  channel_defaults JSONB` (placeholders `{{employee_name}}` etc.).
- **notification_rules** — `event_code, template_id FK, channels JSONB,
  recipient_strategy ENUM(ACTOR, OWNER, ROLE, DEPARTMENT_HEAD,
  ALL_AFFECTED), recipient_role_id NULL, schedule_cron NULL, is_enabled`.
- **dashboard_widget_configs** — `role_id, widget_code, position,
  is_visible, config JSONB, UNIQUE(role, widget)`.
- **report_templates** — `name, owner_id, module_scope JSONB, columns JSONB,
  filters JSONB, group_by JSONB, aggregations JSONB, chart_type, is_shared`.
- **metric_definitions** — Admin-defined diversity/social metrics: `code
  UNIQUE, name, unit, direction ENUM(higher_better, lower_better),
  is_active`.

## A3.3 Master Tables
- **departments** — `name, code UNIQUE, head_user_id FK SET NULL,
  parent_department_id FK self RESTRICT, employee_count (derived), is_active`.
  Cycle check in service; RESTRICT delete when employees/transactions exist.
- **categories** — shared master: `name, type ENUM(CSR_ACTIVITY, CHALLENGE),
  description, is_active, UNIQUE(name, type)`. RESTRICT delete when
  referenced.
- **emission_factors** — `name, category, unit_id FK, scope_id FK,
  factor_value NUMERIC(14,6) CHECK (> 0), source_reference,
  effective_from/to, is_active`. No overlapping active versions per
  (category, unit). Index `(category, unit_id, effective_from)`.
- **products** — `name, sku UNIQUE, category, is_active` ·
  **product_esg_profiles** — 1:1 CASCADE: `carbon_footprint_per_unit,
  recyclability_pct, sustainability_rating, certifications JSONB`.
- **environmental_goals** — `title, department_id NULL (org-wide),
  metric_code, target_value, baseline_value, unit_id, period_start/end
  CHECK (end > start), status_id, progress_pct (derived)`.
- **esg_policies** — `title, description, version INT, document_attachment_id
  FK, effective_date, acknowledgement_deadline, audience ENUM(ALL,
  DEPARTMENT), audience_department_id NULL, status_id
  (Draft/Published/Archived), published_at/by`.
- **badges** — `name UNIQUE, description, icon_key, unlock_rule JSONB
  NOT NULL {metric, operator, threshold}, is_active`. Metric ∈ registered
  list (xp_total, challenges_completed, csr_completed), threshold > 0.
- **rewards** — `name, description, points_required CHECK (> 0), stock
  CHECK (>= 0), image_key, status_id (Active/Inactive/OutOfStock)`.

## A3.4 Transaction Tables
- **operational_records** — `record_type ENUM(PURCHASE, MANUFACTURING,
  EXPENSE, FLEET), department_id FK, description, quantity CHECK (> 0),
  unit_id FK, amount NULL, occurred_at (≤ today), external_ref,
  emission_category`. Index `(record_type, occurred_at)`.
- **carbon_transactions** — `operational_record_id FK NULL UNIQUE (null =
  manual), department_id FK RESTRICT, emission_factor_id FK RESTRICT,
  factor_value_snapshot NOT NULL, quantity CHECK (> 0), unit_id,
  co2e_kg NOT NULL CHECK (>= 0), calculation_mode ENUM(AUTO, MANUAL),
  occurred_at, notes`. Invariant: `co2e = quantity × snapshot`.
  Index `(department_id, occurred_at)`.
- **csr_activities** — `title, category_id FK (type=CSR) RESTRICT,
  description, department_id NULL, location, start/end_date CHECK
  (end >= start), capacity NULL, points_value CHECK (>= 0),
  evidence_required_override NULL, status_id (Draft/Open/Closed/Archived)`.
- **csr_participations** — `csr_activity_id FK, employee_id FK, status_id
  (Pending/Submitted/Approved/Rejected/Withdrawn), proof_attachment_id NULL,
  points_earned NULL (snapshot on approval), completion_date, decided_by/at,
  decision_remarks, UNIQUE(activity, employee)`.
- **challenges** — `title, category_id FK (type=CHALLENGE), description,
  xp_value CHECK (> 0), difficulty_id FK, evidence_required BOOL,
  start_date, deadline CHECK (> start), status_id (Draft/Active/Under
  Review/Completed/Archived), created_by`. Transitions via
  lookup_transitions only.
- **challenge_participations** — `challenge_id FK, employee_id FK,
  progress_pct CHECK (0..100), proof_attachment_id NULL, status_id
  (Joined/Submitted/Approved/Rejected/Withdrawn), xp_awarded NULL
  (snapshot), decided_by/at, decision_remarks, UNIQUE(challenge, employee)`.
- **xp_ledger** — **APPEND-ONLY single points currency (XP = Points)**:
  `employee_id FK, entry_type ENUM(EARN, REDEEM, ADJUST), points INT
  (signed), source_type ENUM(CSR, CHALLENGE, REDEMPTION, MANUAL),
  source_id UUID, balance_after INT CHECK (>= 0), remarks, created_at`.
  `UNIQUE(source_type, source_id, entry_type)` = **idempotency: XP granted
  exactly once per approval**. Never UPDATE/DELETE — revoke = compensating
  row. Index `(employee_id, created_at)`.
- **badge_awards** — `badge_id, employee_id, awarded_at, awarded_mode
  ENUM(AUTO, MANUAL), rule_snapshot JSONB, UNIQUE(badge, employee)`
  (race safety).
- **reward_redemptions** — `reward_id FK, employee_id FK, points_spent
  (snapshot), status_id (Redeemed/Fulfilled/Cancelled), redeemed_at,
  fulfilled_at/by NULL`.
- **policy_acknowledgements** — `policy_id, policy_version, employee_id,
  acknowledged_at, ip_address, UNIQUE(policy, version, employee)`.
  Immutable rows.
- **governance_audits** — `title, audit_type, scope_description,
  department_id NULL, auditor_id FK, planned_start/end CHECK (end >= start),
  actual_start/end, status_id (Planned/In Progress/Completed/Cancelled),
  findings_summary, audit_score NULL (0..100)`. Immutable once Completed.
- **compliance_issues** — `governance_audit_id NULL, title, description
  NOT NULL, severity_id FK NOT NULL, owner_id FK **NOT NULL**, due_date
  **NOT NULL** CHECK (>= raised_date), raised_by, raised_date, status_id,
  is_overdue BOOL DEFAULT false, resolution_notes NULL, resolved_at,
  closed_at`. Index `(status_id, due_date)`, `(owner_id)`.
- **department_scores** — `department_id, period_start/end,
  environmental/social/governance_score CHECK (0..100), total_score,
  weight_config_snapshot JSONB, metric_breakdown JSONB, computed_at,
  UNIQUE(department, period)`.
- **diversity_metric_records** — `department_id, metric_definition_id,
  period, value, metadata JSONB`.
- **training_records** — `employee_id, training_name, completed_at, hours,
  status_id`.
- **notifications** — `user_id FK CASCADE, rule_id NULL, title, body,
  event_code, entity_type/id, channel ENUM(IN_APP, EMAIL), is_read,
  read_at`. Index `(user_id, is_read, created_at)`.
- **attachments** — polymorphic: `entity_type, entity_id, file_key,
  original_name, mime_type, size_bytes, uploaded_by`. Mime/size validated
  from settings.
- **audit_logs** — system trail, append-only: `actor_id SET NULL, action
  ENUM(CREATE, UPDATE, DELETE, LOGIN, APPROVE, REJECT, TRANSITION, REDEEM,
  EXPORT, CONFIG_CHANGE), entity_type/id, before JSONB, after JSONB,
  ip, user_agent, created_at`.
- **report_exports** — `requested_by, template_id NULL, format ENUM(PDF,
  XLSX, CSV), filters JSONB, file_key, status (Queued/Ready/Failed)`.

## A3.5 Normalization & Snapshot Policy
3NF throughout; lookups extracted; shared category master. **Deliberate
denormalized snapshots** — `factor_value_snapshot, points_earned,
xp_awarded, points_spent, weight_config_snapshot, rule_snapshot,
policy_version` — so history never changes when Admin edits masters.
`balance_after` and `employee_count` are recomputable derived caches.

# A4. Everything Admin-Configurable (single list)
Departments · categories · emission factors (versioned) · ESG weights
(default 40/30/30) · pillar metric weights + normalization · badge unlock
rules · rewards (points/stock/status) · difficulties/severities/units/
scopes · status values + **allowed transitions** · approval rules ·
notification rules/templates/channels/reminder crons · feature toggles
(auto emission calc, evidence requirement, badge auto-award, email) ·
validation parameters (file size/mime, redemption limits, password policy,
token expiries) · dashboard widgets per role · report templates ·
role→permission mapping · metric definitions · level thresholds · org
branding. Runtime: ConfigService reads DB → in-memory cache → busted by
`config.updated`. Every config change writes audit_logs with before/after.

# A5. Relationships & Delete Rules
Masters referenced by transactions: **RESTRICT** (deactivate instead) —
departments↛employees, factors↛transactions, categories↛activities/
challenges, activities/challenges↛participations, policies↛acks,
audits↛issues, users↛ledger/awards/redemptions/acks. **CASCADE** only pure
children: attachments, notifications, role/user mapping rows, refresh
tokens, product_esg_profiles. Self-ref: departments.parent (RESTRICT +
cycle check). M:M: roles↔permissions, users↔roles, badges↔employees (via
awards, unique pair). History tables (ledger, acks, audit_logs) append-only.

# A6. COMPLETE REST API
Conventions: base `/api/v1` · JWT Bearer · envelope `{success, data,
error:{code,message,details}, meta:{page,size,total}}` · lists support
`?page&size&sort&search` + module filters · permissions as
`resource:action` · all mutations audited.

## A6.1 Authentication (full suite)
| Method+Path | Purpose | Notes |
|---|---|---|
| POST /auth/login | {email,password} → token pair + user + permissions | rate-limited, lockout counter from settings |
| POST /auth/refresh | rotate pair | revocable |
| POST /auth/logout | revoke refresh | |
| GET /auth/me | user + roles + permissions | |
| PUT /auth/change-password | policy from settings; revokes refresh tokens | |
| POST /auth/register | self-signup → default role from `default_signup_role`, unverified | dev mode (`dev_return_tokens`) returns verify token |
| POST /auth/verify-email | {token} → sets email_verified_at | expired → 422 |
| POST /auth/forgot-password | {email} → **always 200** (never reveal existence) | dev mode returns token |
| POST /auth/reset-password | {token,newPassword} single-use, revokes refresh tokens | |
| POST /invitations | Admin: {email, roleId, departmentId} → invite token/link | expiry from settings |
| GET /invitations · DELETE /invitations/:id | manage | |
| POST /invitations/accept | {token, firstName, lastName, password} → verified user with invited role+dept, consumes token, returns login pair | |

## A6.2 Users & Departments
Users: CRUD `/users` · `PUT /users/:id/roles` · activate/deactivate
(**"last Admin" guard**) · `GET /users/:id/xp` · `GET /users/:id/badges` ·
`GET /me/summary` → `{xpBalance, level (thresholds from settings),
badges[], activeChallenges[], pendingAcknowledgementsCount,
affordableRewardsCount, leaderboardRank}`.
Departments: CRUD · `GET /departments/tree` · `GET /departments/:id/scores`
· cycle check · delete → 422 `DEPARTMENT_IN_USE`.

## A6.3 Categories & Lookups-adjacent masters
Categories: CRUD `?type=CSR_ACTIVITY|CHALLENGE` · `GET /categories/:id/
usage` → {count, entities} · delete → 422 `CATEGORY_IN_USE`.

## A6.4 Environmental
Emission factors: CRUD · `GET /emission-factors/active?category=&unit=
&date=` · overlap validation · value > 0.
Environmental goals: CRUD · `GET /environmental-goals/:id/progress`
(computed vs carbon actuals) · filters dept/status/period.
Operational records: CRUD · `POST /operational-records/import` (CSV) ·
`POST /operational-records/:id/calculate`.
Carbon transactions: `GET` (filters: department, dateFrom/To, mode,
factor) · `POST` manual (factor active on date, snapshot, co2e = qty ×
snapshot) · auto-creation when `auto_emission_calc` ON (unmapped → warn +
skip) · `GET /carbon-transactions/summary?groupBy=department|category|
month`.

## A6.5 Social
CSR: CRUD `/csr-activities` · `POST /:id/participate` (capacity, unique) ·
`POST /csr-participations/:id/proof` · `/submit` · `/approve` · `/reject`
{remarks required} · `/withdraw` · list with filters. Approve = **one DB
transaction**: evidence guard (setting or activity override) → status +
points snapshot → XP credit (idempotent) → post-commit events.
Diversity: CRUD `/metric-definitions` (Admin) · `GET/POST
/diversity-records` (filters) · `GET /diversity-records/summary?period=`.
Training: `GET/POST /training-records` · `GET /training-records/summary`
(completion % by dept). Both summaries feed Social pillar metrics.

## A6.6 Gamification
Challenges: CRUD (free edits only in Draft) · `POST /:id/transition`
{toStatus} validated against lookup_transitions + permission · `POST
/:id/join` (Active only, before deadline, unique) · participation:
progress (0–100), proof, submit, approve/reject (transactional, XP =
xp_value, exactly-once), withdraw · `GET /challenges/:id/participations`.
Deadline cron: Active past deadline → Under Review.
Badges: CRUD (unlock_rule validated) · `GET /badge-awards?employee=` ·
`POST /badges/:id/award` (manual) · `POST /badges/reevaluate`.
Rewards: CRUD · **POST /rewards/:id/redeem** (workflow W5, atomic) →
`{redemption, newBalance, newStock}` · `GET /redemptions` ·
`POST /redemptions/:id/fulfill|cancel` (cancel = compensating credit +
stock restore) · auto OutOfStock at 0.
Leaderboard: `GET /leaderboard?scope=individual|department&period=month|
quarter|all&departmentId=` (ledger-computed, cached).

## A6.7 Governance
Policies: CRUD · `POST /:id/publish` (version freeze; needs document +
deadline) · `POST /:id/acknowledge` (unique per version, immutable, only
Published) · `GET /:id/acknowledgements` · `GET /policies/
pending-acknowledgement` (self).
Audits: CRUD · start · complete {findingsSummary, auditScore} → immutable ·
`GET /:id/issues`.
Compliance: CRUD (**owner_id + due_date required**) · `POST /:id/
transition` (resolve needs notes) · `GET /compliance-issues/overdue` ·
`PUT /:id/owner`. Nightly cron: Open/In-Progress past due → is_overdue +
`issue.overdue` event.

## A6.8 Dashboards (role-scoped, cached ~60s)
`GET /dashboard/summary` → `{kpis[{code,label,value,delta,sparkline[]}],
orgEsgScore:{total,e,s,g,weights}, pendingApprovalsCount, openIssuesCount,
overdueIssuesCount}` · `GET /dashboard/carbon-trend?months=12&
departmentId=` · `GET /dashboard/department-rankings?period=` ·
`GET /dashboard/csr-trend?months=6` · `GET /dashboard/activity-feed?
limit=15` (whitelisted audit_log actions) · `GET /dashboard/
pending-approvals` (union of CSR + challenge submissions the caller may
decide per approval_rules). Dept Head automatically scoped to own dept.

## A6.9 Reports
`GET /reports/environmental|social|governance|summary` — ALL SIX filters:
department, dateFrom/dateTo, module, employee, challenge, esgCategory ·
`POST /reports/custom` {moduleScope, columns, filters, groupBy,
aggregations} (whitelisted per module) · report-templates CRUD ·
`POST /reports/export` {format: pdf|xlsx|csv} (CSV sync, XLSX via exceljs,
PDF may 501 with clear message) · `GET /report-exports/:id`. Role-scoped
data everywhere.

## A6.10 Notifications, Files, Settings, Ops
Notifications: `GET /notifications?unread=` · `PUT /:id/read` ·
`PUT /read-all` · Admin CRUD rules + templates + `POST /notification-
rules/:id/test`.
Files: `POST /files/upload` multipart (mime/size from settings → storage
adapter (disk default) → attachments row → `{attachmentId, url}`) ·
`GET /files/:id` (authorized: uploader, entity participants, reviewer).
Settings: `GET /settings` (public subset for non-admins) · `PUT
/settings/:key` (type-validated, audited, cache-bust) · lookups + values +
transitions CRUD (system lookups deactivate-only) · esg-weights (sum=100)
· scoring-configs · approval-rules · dashboard-configs · roles CRUD +
`PUT /roles/:id/permissions` · `GET /audit-logs` (filters).
Ops: `GET /health` → {status, db, version} · `POST /scores/recompute`
(Admin, sync, returns rows).

# A7. BUSINESS WORKFLOWS (authoritative)
**W1 Carbon Calculation:** operational record → if `auto_emission_calc` ON:
resolve factor (category+unit, active on occurred_at) → co2e = qty ×
factor → insert with snapshot + mode → emit carbon.recorded; no factor →
warn + skip. OFF → manual entry (factor still from master) or bulk/single
calculate endpoints.
**W2 CSR Approval:** join (capacity/unique) → proof → submit → approver per
approval_rules (≠ participant) → reject (remarks) OR approve inside ONE tx:
evidence guard → status + points snapshot → XP EARN (idempotent) → commit →
events (badge engine + notification).
**W3 Challenge Lifecycle:** Draft (editable) → transition validated
(machine + permission) → Active (join/progress/submit) → deadline cron or
manual → Under Review (no new joins; decisions per W2 pattern, XP =
xp_value) → Completed. Archive from any state (locks writes, keeps
history).
**W4 Badge Auto-Award:** on xp.credited / approval: toggle OFF → stop.
Else compute employee metrics → evaluate every active badge's unlock_rule →
satisfied ∧ not awarded → insert award (unique = race guard) with
rule_snapshot → badge.awarded → notify.
**W5 Reward Redemption (ONE transaction):** SELECT reward FOR UPDATE →
validate Active, stock > 0, balance ≥ points_required (under lock), period
limit → ledger REDEEM (−points, balance_after) → stock −1 (CHECK ≥ 0
backstop) → redemption row (points_spent snapshot) → commit; any failure →
full rollback → notify; status auto-flip at stock 0. Errors: OUT_OF_STOCK,
INSUFFICIENT_POINTS.
**W6 Policy Acknowledgement:** publish (version freeze, audience resolve) →
reminders per notification_rules cron → acknowledge (immutable, versioned,
unique) → ack-rate → Governance score; post-deadline escalation
rule-driven.
**W7 Audit:** Planned → In Progress (findings; may raise linked issues) →
Complete {summary, score} → immutable → Governance pillar.
**W8 Compliance Issue:** create (owner + due date enforced) → notify
owner → Open → In Progress → Resolved {notes} → Closed. Nightly cron:
unresolved past due → is_overdue → issue.overdue → notify owner +
Compliance Officer.
**W9 Department Score:** per dept+period: pull metric values per
scoring_configs → normalize (min/max/direction) → pillar = Σ(wᵢ×normᵢ)/100
→ upsert with metric_breakdown + snapshot.
**W10 Org Score:** dept_total = (E·wE + S·wS + G·wG)/100 from ACTIVE
weight config (snapshot) → org = Σ(dept_total × dept_weight)/Σ,
dept_weight per `dept_weight_basis` (employee_count | equal) → cached;
history retained for trends.
**W11 Notification Flow:** domain event → enabled rules by event_code →
recipients per strategy → render template → bulk in-app inserts → email
channel ∧ enabled → mail adapter (console/log in dev). Scheduled rules
(reminders/overdue) via cron scanner. Events dispatched POST-COMMIT.

## A7.1 SCORING & CALCULATION MATH (exact formulas — implement verbatim)
> The scoring engine must be explainable. Every number below must be
> reproducible by hand from the metric_breakdown JSON stored with each
> department_score row.

**Normalization (applies to every metric):** given a raw metric value `v`
and the metric's scoring_config `normalization {min, max, direction}`:
`n = clamp((v − min) / (max − min), 0, 1)`; if `direction =
lower_better` then `n = 1 − n`; **metric score = n × 100**. If a metric
has no data for the period, use the neutral default from settings key
`scoring_missing_default` (seed: 50) and mark `"missing": true` in
metric_breakdown.

**Per-metric raw values `v` (period + department scoped):**
- `emission_vs_goal` (E, lower_better): if an active environmental goal
  covers the dept+period → `v = actual_co2e / goal_target` (ratio; min 0,
  max 2 in seed config). No active goal → fallback
  `v = dept_total_co2e / dept_employee_count` (kg CO₂e per employee),
  normalized against the seeded min/max.
- `csr_participation_rate` (S, higher_better):
  `v = distinct employees with ≥1 APPROVED csr_participation in period /
  active employees in dept × 100`.
- `training_completion` (S, higher_better):
  `v = employees with ≥1 completed training_record in period /
  active employees in dept × 100`.
- `diversity_index` (S, higher_better): for each active
  metric_definition with a record in the period, normalize its value per
  that definition's own direction against its configured range, then
  `v = average of those normalized values × 100`. No records → missing.
- `policy_ack_rate` (G, higher_better):
  `v = acknowledgements by dept employees for policies applicable to them
  and due in/before the period / (applicable policies × dept employees)
  × 100`.
- `audit_score` (G, higher_better): `v = average audit_score of COMPLETED
  governance_audits scoped to the dept (or org-wide audits) whose
  actual_end falls in the period`. None → missing (neutral).
- `open_issue_penalty` (G, lower_better): `v = Σ over unresolved issues
  owned by dept employees of severity_weight`, where severity_weight
  comes from lookup_values.metadata (seed: Critical 5, High 3, Medium 2,
  Low 1); overdue issues count DOUBLE. Seed normalization min 0, max 20.

**Pillar score:** `pillar = Σ(metric_weightᵢ × metric_scoreᵢ) / 100`
using scoring_configs weights for that pillar (weights sum to 100).
**Department total:** `total = (E×wE + S×wS + G×wG) / 100` using the
ACTIVE esg_weight_config, snapshotted onto the row.
**Org score:** `org = Σ(dept_totalᵈ × dept_weightᵈ) / Σ(dept_weightᵈ)`
where `dept_weight = employee_count` when settings
`dept_weight_basis = employee_count`, else `1` (equal). Clamp all scores
0–100, round to 1 decimal.

**Goal progress (environmental_goals.progress_pct):** reduction-type
goals (target < baseline): `progress = clamp((baseline − actual) /
(baseline − target), 0, 1) × 100`. Achievement-type (target ≥ baseline
or no baseline): `progress = clamp(actual / target, 0, 1) × 100`.

**Employee level (for /me/summary):** settings `level_thresholds` is a
sorted JSON array (seed: [0, 100, 300, 600, 1000, 1500]); `level = 1 +
index of the highest threshold ≤ xpBalance`; also return
`nextLevelAt = next threshold` (null at max).

**KPI deltas (dashboards):** `delta = (current_period_value −
previous_period_value) / previous_period_value × 100`, previous period =
same length immediately before; previous = 0 → delta null (render "—").
**Leaderboard periods:** month = current calendar month, quarter =
current calendar quarter, all = no filter; rank by SUM of EARN entries in
the window (ties broken by earliest achievement timestamp).

# A8. VALIDATION RULES (exhaustive; DTO → service → DB constraint layers)
**Global:** required/type/format; lengths; enum values must exist in
lookups; pagination bounds; file mime/size from config; RBAC on all writes;
unique codes.
**Auth:** email unique+format; password policy from settings; tokens
single-use with configured expiry; forgot-password never reveals existence;
verify/reset expired → 422; ≥ 1 Admin must remain; cannot self-delete.
**Departments:** code unique; no cycles; RESTRICT delete
(DEPARTMENT_IN_USE); head active user.
**Categories:** unique (name, type); CATEGORY_IN_USE on referenced delete;
type immutable after use.
**Emission factors:** value > 0 (never negative); valid unit/scope;
from ≤ to; no overlapping active versions; deactivate not delete.
**Operational/Carbon:** qty > 0; date ≤ today; factor active on date;
co2e = qty × snapshot; one auto transaction per record (409 on dupe); dept
active.
**CSR:** end ≥ start; capacity ≥ participants; points ≥ 0; category
type=CSR; unique participation; join only Open within capacity;
**no approval without proof when evidence rule ON** (EVIDENCE_REQUIRED);
reject needs remarks; approver authorized ∧ ≠ self; decisions only from
Submitted; snapshot immutable.
**Challenges:** deadline > start; XP > 0; category type=CHALLENGE; free
edits only Draft; transitions only per machine (INVALID_TRANSITION); join
only Active before deadline, unique; progress 0–100; evidence per flag;
approve only Submitted; **XP exactly once** (ledger unique).
**XP ledger:** append-only; REDEEM ≤ balance; balance_after ≥ 0; every row
has source; adjustments Admin-only with remarks.
**Badges:** metric registered; operator ∈ {>=, >, =}; threshold > 0;
unique award; manual award needs permission.
**Rewards:** points_required > 0; **stock ≥ 0 ALWAYS (CHECK + row lock —
can never go negative)**; redeem needs Active + stock + balance + within
period limit; atomic; cancel = compensating credit + stock restore.
**Policies:** publish needs document + deadline ≥ today; version bump on
file replace; ack unique per (policy, version, employee), only Published,
immutable.
**Audits:** end ≥ start; complete needs findings; completed immutable.
**Compliance:** owner NOT NULL; due_date NOT NULL ≥ raised; severity
valid; resolve needs notes; transitions per config; overdue flag only
while unresolved.
**Scores/weights:** E+S+G = 100 (WEIGHTS_NOT_100); each ≥ 0; pillar metric
weights sum 100; scores clamped 0–100; unique (dept, period).
**Settings/lookups:** value matches declared type; unknown keys rejected;
system lookups deactivate-only; transition edits can't orphan in-flight
records.
**Files:** size ≤ max_upload_mb; mime whitelist; access authorized.
**Reports:** fields whitelisted per module; from ≤ to; format ∈
{pdf,xlsx,csv}; preview row cap from settings; role-scoped.
**Notifications:** event codes from registry; templates render-validated;
crons validated.

# A9. AUTHENTICATION & RBAC
AuthN: argon2 → access JWT 15 min (sub, roles, perm-hash) + refresh 7 d
(rotated, revocable). Middleware: JWT verify → active check → permission
guard → controller. Lockout + rate limit from settings; refresh revoked on
password change/reset.
AuthZ: `@RequirePermission('resource:action')` reading cached
role_permissions; **data-scope decorator (OWN / DEPARTMENT / ALL)** filters
queries. Default matrix (Admin-editable):
| Role | Highlights |
|---|---|
| Admin | everything: settings, lookups, roles, audit logs, all modules |
| ESG Manager | environmental full, challenges full, E + summary reports |
| CSR Manager | CSR full + approvals, diversity/training write, social reports |
| Compliance Officer | policies, audits, issues full, governance reports, read audit logs |
| Department Head | own-dept approvals (per approval_rules), own-dept dashboards/reports/goals |
| Employee | join/submit/withdraw, acknowledge, redeem, own dashboard/profile/notifications |
| Auditor | read-only everywhere + execute audits + raise issues + read audit logs |

# A10. Architecture, Folder Structure, Errors, Ops
```
src/
├── core/ {config (DB-backed ConfigService + cache), guards, interceptors
│          (audit, logging, transform), filters (global errors), events
│          (in-process bus), queue/cron, storage (disk|s3 adapter), mail
│          (console|provider adapter), utils}
├── modules/ {auth, users, departments, categories,
│            environmental/{factors, operational-records, carbon, goals},
│            social/{csr-activities, participations, diversity, training},
│            governance/{policies, acks, audits, issues},
│            gamification/{challenges, participations, xp, badges,
│                          rewards, leaderboard},
│            scoring, dashboards, notifications, reports, settings}
│   └── each: controller (thin) · service (logic+tx+events) · repository
│             (only DB access) · dto/ · validators/ · events/
└── database/ {migrations, seeders}
```
**Errors:** 400 VALIDATION_ERROR (field map) · 401 · 403 (permission code
included) · 404 · 409 CONFLICT (dupe/idempotency) · 422 BUSINESS_RULE with
codes: INSUFFICIENT_POINTS, OUT_OF_STOCK, INVALID_TRANSITION,
EVIDENCE_REQUIRED, DEPARTMENT_IN_USE, CATEGORY_IN_USE, WEIGHTS_NOT_100 ·
500 generic (logged, not leaked). Structured JSON logs + correlation ids.
**Transactions:** service `withTransaction` for all multi-write flows;
pessimistic locks on stock/balance; unique constraints as final race
guard; events staged in-tx, dispatched post-commit; job retries + dead
letter.
**Jobs:** nightly overdue flagger · policy reminder scanner · challenge
deadline transition · score recompute · reward status flip · orphan
attachment cleanup.
**Env (.env = infra ONLY):** DATABASE_URL, JWT_SECRET, PORT. Business
config never in env.

# A11. SEED SPECIFICATION (must mirror the frontend mocks — integration
depends on this)
Idempotent `npm run seed` producing exactly: 6 departments (one
parent-child) · 25 users covering all 7 roles — ALL password `Demo@123`,
emails `admin@ecosphere.demo`, `esg@ecosphere.demo`, `csr@…`,
`compliance@…`, `head@…`, `employee@…`, `auditor@…` · 8 emission factors
(one with 2 date-versioned entries) · 60 carbon transactions across 12
months · 6 CSR activities + 20 participations in mixed statuses · 10
challenges covering **all five lifecycle states** · 30 challenge
participations · per-employee XP ledgers with EARN and REDEEM rows (one
employee seeded just below a badge threshold) · 8 badges with JSON unlock
rules + some awards · 6 rewards (one stock 0, one stock 2) · 12
redemptions · 5 policies with varied ack % · 4 audits · 12 compliance
issues, all with owner + due date, **exactly 3 overdue** · 4 quarters of
department scores · 15 notifications · full lookups + lookup_transitions
(challenge + issue machines) + all settings (toggles ON,
dev_return_tokens=true) + esg weights 40/30/30 + scoring configs +
approval rules + notification rules/templates + complete role_permissions
matrix per A9.

# A12. Future Scalability
Modular monolith → extract Scoring/Notifications/Reports first (event
contracts exist; swap in a broker). Read replicas + monthly partitions on
carbon_transactions/xp_ledger/audit_logs + materialized views. Multi-
tenancy = organization_id + RLS (settings already org-scopable). Redis for
config/leaderboards. operational_records importer → real ERP connectors
behind the same interface. Append-only ledgers give tamper-evident
history; add hash-chaining if regulators require. Optional AI layer
(anomaly detection, report narratives) consumes the same event stream.
