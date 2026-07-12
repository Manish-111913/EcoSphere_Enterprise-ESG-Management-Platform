/**
 * EcoSphere seed — mirrors the frontend mocks (spec §A11).
 * Idempotent: truncates all data tables (except _prisma_migrations) then
 * re-inserts a fixed dataset, so `npm run seed` can run any number of times.
 *
 * Produces exactly: 6 departments (one parent-child) · 25 users (7 roles,
 * password Demo@123) · 8 emission factors (electricity date-versioned) ·
 * 60 carbon transactions/12 months · 6 CSR activities + 20 participations ·
 * 10 challenges (all 5 states) + 30 participations · per-employee XP ledgers
 * (one employee just below a badge threshold) · 8 badges + awards · 6 rewards
 * (stock 0 and stock 2) · 12 redemptions · 5 policies (varied ack %) ·
 * 4 audits · 12 compliance issues (exactly 3 overdue) · 4 quarters of dept
 * scores · 15 notifications · full lookups/transitions/settings/weights/
 * scoring/approval/notification configs + complete role_permissions matrix.
 */
import {
  ApprovalEntityType,
  ApprovalScope,
  AwardMode,
  CalculationMode,
  MetricDirection,
  NotificationChannel,
  PolicyAudience,
  Prisma,
  PrismaClient,
  RecipientStrategy,
  RecordType,
  ScoringPillar,
  SettingValueType,
  XpEntryType,
  XpSourceType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

// ─────────────────────────── date helpers ───────────────────────────
const NOW = new Date();
const dateOnly = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const monthsAgo = (n: number): Date => {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - n);
  return d;
};
const daysAgo = (n: number): Date => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
};
const daysFromNow = (n: number): Date => daysAgo(-n);

// deterministic-ish pseudo values without Math.random (stable per index)
const pick = <T>(arr: T[], i: number): T => arr[i % arr.length];

// ─────────────────────────── reset ───────────────────────────
async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  if (list) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${list} RESTART IDENTITY CASCADE`,
    );
  }
}

// ─────────────────────────── lookups ───────────────────────────
const lookupMap = new Map<string, string>();
const lv = (type: string, code: string): string => {
  const id = lookupMap.get(`${type}:${code}`);
  if (!id) throw new Error(`missing lookup ${type}:${code}`);
  return id;
};

interface LookupSpec {
  type: string;
  description: string;
  values: {
    code: string;
    label: string;
    color?: string;
    metadata?: Prisma.InputJsonValue;
  }[];
}

const LOOKUPS: LookupSpec[] = [
  {
    type: 'CHALLENGE_STATUS',
    description: 'Challenge lifecycle',
    values: [
      { code: 'DRAFT', label: 'Draft', color: '#9CA3AF' },
      { code: 'ACTIVE', label: 'Active', color: '#10B981' },
      { code: 'UNDER_REVIEW', label: 'Under Review', color: '#F59E0B' },
      { code: 'COMPLETED', label: 'Completed', color: '#3B82F6' },
      { code: 'ARCHIVED', label: 'Archived', color: '#6B7280' },
    ],
  },
  {
    type: 'CHALLENGE_PARTICIPATION_STATUS',
    description: 'Challenge participation',
    values: [
      { code: 'JOINED', label: 'Joined', color: '#9CA3AF' },
      { code: 'SUBMITTED', label: 'Submitted', color: '#F59E0B' },
      { code: 'APPROVED', label: 'Approved', color: '#10B981' },
      { code: 'REJECTED', label: 'Rejected', color: '#EF4444' },
      { code: 'WITHDRAWN', label: 'Withdrawn', color: '#6B7280' },
    ],
  },
  {
    type: 'CSR_ACTIVITY_STATUS',
    description: 'CSR activity lifecycle',
    values: [
      { code: 'DRAFT', label: 'Draft', color: '#9CA3AF' },
      { code: 'OPEN', label: 'Open', color: '#10B981' },
      { code: 'CLOSED', label: 'Closed', color: '#3B82F6' },
      { code: 'ARCHIVED', label: 'Archived', color: '#6B7280' },
    ],
  },
  {
    type: 'CSR_PARTICIPATION_STATUS',
    description: 'CSR participation',
    values: [
      { code: 'PENDING', label: 'Pending', color: '#9CA3AF' },
      { code: 'SUBMITTED', label: 'Submitted', color: '#F59E0B' },
      { code: 'APPROVED', label: 'Approved', color: '#10B981' },
      { code: 'REJECTED', label: 'Rejected', color: '#EF4444' },
      { code: 'WITHDRAWN', label: 'Withdrawn', color: '#6B7280' },
    ],
  },
  {
    type: 'ISSUE_STATUS',
    description: 'Compliance issue lifecycle',
    values: [
      { code: 'OPEN', label: 'Open', color: '#EF4444' },
      { code: 'IN_PROGRESS', label: 'In Progress', color: '#F59E0B' },
      { code: 'RESOLVED', label: 'Resolved', color: '#10B981' },
      { code: 'CLOSED', label: 'Closed', color: '#6B7280' },
    ],
  },
  {
    type: 'AUDIT_STATUS',
    description: 'Governance audit lifecycle',
    values: [
      { code: 'PLANNED', label: 'Planned', color: '#9CA3AF' },
      { code: 'IN_PROGRESS', label: 'In Progress', color: '#F59E0B' },
      { code: 'COMPLETED', label: 'Completed', color: '#10B981' },
      { code: 'CANCELLED', label: 'Cancelled', color: '#6B7280' },
    ],
  },
  {
    type: 'GOAL_STATUS',
    description: 'Environmental goal status',
    values: [
      { code: 'DRAFT', label: 'Draft', color: '#9CA3AF' },
      { code: 'ACTIVE', label: 'Active', color: '#10B981' },
      { code: 'ACHIEVED', label: 'Achieved', color: '#3B82F6' },
      { code: 'MISSED', label: 'Missed', color: '#EF4444' },
    ],
  },
  {
    type: 'POLICY_STATUS',
    description: 'Policy status',
    values: [
      { code: 'DRAFT', label: 'Draft', color: '#9CA3AF' },
      { code: 'PUBLISHED', label: 'Published', color: '#10B981' },
      { code: 'ARCHIVED', label: 'Archived', color: '#6B7280' },
    ],
  },
  {
    type: 'REWARD_STATUS',
    description: 'Reward status',
    values: [
      { code: 'ACTIVE', label: 'Active', color: '#10B981' },
      { code: 'INACTIVE', label: 'Inactive', color: '#6B7280' },
      { code: 'OUT_OF_STOCK', label: 'Out of Stock', color: '#EF4444' },
    ],
  },
  {
    type: 'REDEMPTION_STATUS',
    description: 'Reward redemption status',
    values: [
      { code: 'REDEEMED', label: 'Redeemed', color: '#F59E0B' },
      { code: 'FULFILLED', label: 'Fulfilled', color: '#10B981' },
      { code: 'CANCELLED', label: 'Cancelled', color: '#6B7280' },
    ],
  },
  {
    type: 'TRAINING_STATUS',
    description: 'Training record status',
    values: [
      { code: 'NOT_STARTED', label: 'Not Started', color: '#9CA3AF' },
      { code: 'IN_PROGRESS', label: 'In Progress', color: '#F59E0B' },
      { code: 'COMPLETED', label: 'Completed', color: '#10B981' },
    ],
  },
  {
    type: 'SEVERITY',
    description: 'Issue severity (metadata.weight feeds open_issue_penalty)',
    values: [
      { code: 'CRITICAL', label: 'Critical', color: '#DC2626', metadata: { weight: 5 } },
      { code: 'HIGH', label: 'High', color: '#F97316', metadata: { weight: 3 } },
      { code: 'MEDIUM', label: 'Medium', color: '#F59E0B', metadata: { weight: 2 } },
      { code: 'LOW', label: 'Low', color: '#10B981', metadata: { weight: 1 } },
    ],
  },
  {
    type: 'DIFFICULTY',
    description: 'Challenge difficulty',
    values: [
      { code: 'EASY', label: 'Easy', color: '#10B981' },
      { code: 'MEDIUM', label: 'Medium', color: '#F59E0B' },
      { code: 'HARD', label: 'Hard', color: '#EF4444' },
    ],
  },
  {
    type: 'UNIT',
    description: 'Units of measure',
    values: [
      { code: 'KWH', label: 'kWh' },
      { code: 'M3', label: 'm³' },
      { code: 'LITRE', label: 'litre' },
      { code: 'KG', label: 'kg' },
      { code: 'TONNE', label: 'tonne' },
      { code: 'KM', label: 'km' },
      { code: 'SHEET', label: 'sheet' },
      { code: 'HOUR', label: 'hour' },
    ],
  },
  {
    type: 'EMISSION_SCOPE',
    description: 'GHG protocol scopes',
    values: [
      { code: 'SCOPE_1', label: 'Scope 1' },
      { code: 'SCOPE_2', label: 'Scope 2' },
      { code: 'SCOPE_3', label: 'Scope 3' },
    ],
  },
  {
    type: 'NOTIFICATION_CHANNEL',
    description: 'Notification channels',
    values: [
      { code: 'IN_APP', label: 'In-App' },
      { code: 'EMAIL', label: 'Email' },
    ],
  },
];

async function seedLookups(): Promise<void> {
  for (const spec of LOOKUPS) {
    const type = await prisma.lookupType.create({
      data: { code: spec.type, description: spec.description },
    });
    for (let i = 0; i < spec.values.length; i++) {
      const v = spec.values[i];
      const value = await prisma.lookupValue.create({
        data: {
          lookupTypeId: type.id,
          code: v.code,
          label: v.label,
          color: v.color,
          sortOrder: i,
          metadata: v.metadata ?? undefined,
        },
      });
      lookupMap.set(`${spec.type}:${v.code}`, value.id);
    }
  }

  // State machines as data (spec §A3.2): challenge + issue transitions.
  const challengeType = 'CHALLENGE_STATUS';
  const challengeEdges: [string, string][] = [
    ['DRAFT', 'ACTIVE'],
    ['ACTIVE', 'UNDER_REVIEW'],
    ['UNDER_REVIEW', 'COMPLETED'],
    ['DRAFT', 'ARCHIVED'],
    ['ACTIVE', 'ARCHIVED'],
    ['UNDER_REVIEW', 'ARCHIVED'],
    ['COMPLETED', 'ARCHIVED'],
  ];
  const issueType = 'ISSUE_STATUS';
  const issueEdges: [string, string][] = [
    ['OPEN', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'RESOLVED'],
    ['RESOLVED', 'CLOSED'],
    ['IN_PROGRESS', 'OPEN'],
  ];

  const typeIdByCode = new Map<string, string>();
  for (const t of await prisma.lookupType.findMany())
    typeIdByCode.set(t.code, t.id);

  for (const [from, to] of challengeEdges) {
    await prisma.lookupTransition.create({
      data: {
        lookupTypeId: typeIdByCode.get(challengeType)!,
        fromValueId: lv(challengeType, from),
        toValueId: lv(challengeType, to),
        allowedPermission: 'challenges:transition',
      },
    });
  }
  for (const [from, to] of issueEdges) {
    await prisma.lookupTransition.create({
      data: {
        lookupTypeId: typeIdByCode.get(issueType)!,
        fromValueId: lv(issueType, from),
        toValueId: lv(issueType, to),
        allowedPermission: 'issues:transition',
      },
    });
  }
}

// ─────────────────────────── settings & config ───────────────────────────
async function seedSettings(): Promise<void> {
  const settings: {
    key: string;
    value: string;
    valueType: SettingValueType;
    category: string;
    isPublic?: boolean;
    description?: string;
  }[] = [
    { key: 'auto_emission_calc', value: 'true', valueType: SettingValueType.boolean, category: 'toggles' },
    { key: 'evidence_required_csr', value: 'true', valueType: SettingValueType.boolean, category: 'toggles' },
    { key: 'evidence_required_challenge', value: 'true', valueType: SettingValueType.boolean, category: 'toggles' },
    { key: 'badge_auto_award', value: 'true', valueType: SettingValueType.boolean, category: 'toggles' },
    { key: 'email_notifications_enabled', value: 'true', valueType: SettingValueType.boolean, category: 'toggles' },
    { key: 'max_upload_mb', value: '10', valueType: SettingValueType.number, category: 'files', isPublic: true },
    { key: 'allowed_mime_types', value: JSON.stringify(['image/png', 'image/jpeg', 'application/pdf']), valueType: SettingValueType.json, category: 'files', isPublic: true },
    { key: 'redemption_limit_per_month', value: '5', valueType: SettingValueType.number, category: 'gamification' },
    { key: 'leaderboard_default_period', value: 'month', valueType: SettingValueType.string, category: 'gamification', isPublic: true },
    { key: 'org_name', value: 'EcoSphere Inc.', valueType: SettingValueType.string, category: 'branding', isPublic: true },
    { key: 'dept_weight_basis', value: 'employee_count', valueType: SettingValueType.string, category: 'scoring' },
    { key: 'default_signup_role', value: 'Employee', valueType: SettingValueType.string, category: 'auth' },
    { key: 'invite_expiry_hours', value: '72', valueType: SettingValueType.number, category: 'auth' },
    { key: 'reset_expiry_minutes', value: '30', valueType: SettingValueType.number, category: 'auth' },
    { key: 'dev_return_tokens', value: 'true', valueType: SettingValueType.boolean, category: 'auth' },
    { key: 'level_thresholds', value: JSON.stringify([0, 100, 300, 600, 1000, 1500]), valueType: SettingValueType.json, category: 'gamification', isPublic: true },
    { key: 'storage_driver', value: 'disk', valueType: SettingValueType.string, category: 'files' },
    { key: 'dashboard_cache_ttl', value: '60', valueType: SettingValueType.number, category: 'dashboards' },
    { key: 'scoring_missing_default', value: '50', valueType: SettingValueType.number, category: 'scoring' },
    { key: 'password_min_length', value: '8', valueType: SettingValueType.number, category: 'auth' },
    { key: 'login_lockout_threshold', value: '5', valueType: SettingValueType.number, category: 'auth' },
    { key: 'login_lockout_minutes', value: '15', valueType: SettingValueType.number, category: 'auth' },
    { key: 'access_token_ttl_minutes', value: '15', valueType: SettingValueType.number, category: 'auth' },
    { key: 'refresh_token_ttl_days', value: '7', valueType: SettingValueType.number, category: 'auth' },
  ];
  await prisma.appSetting.createMany({ data: settings });

  // ESG weights 40/30/30 (active).
  await prisma.esgWeightConfig.create({
    data: {
      environmentalWeight: 40,
      socialWeight: 30,
      governanceWeight: 30,
      effectiveFrom: dateOnly(monthsAgo(24)),
      isActive: true,
    },
  });

  // Scoring configs — per-pillar weights sum to 100 (spec §A7.1).
  const scoring: {
    pillar: ScoringPillar;
    metricCode: string;
    weight: number;
    normalization: Prisma.InputJsonValue;
  }[] = [
    { pillar: ScoringPillar.E, metricCode: 'emission_vs_goal', weight: 100, normalization: { min: 0, max: 2, direction: 'lower_better' } },
    { pillar: ScoringPillar.S, metricCode: 'csr_participation_rate', weight: 40, normalization: { min: 0, max: 100, direction: 'higher_better' } },
    { pillar: ScoringPillar.S, metricCode: 'training_completion', weight: 30, normalization: { min: 0, max: 100, direction: 'higher_better' } },
    { pillar: ScoringPillar.S, metricCode: 'diversity_index', weight: 30, normalization: { min: 0, max: 100, direction: 'higher_better' } },
    { pillar: ScoringPillar.G, metricCode: 'policy_ack_rate', weight: 40, normalization: { min: 0, max: 100, direction: 'higher_better' } },
    { pillar: ScoringPillar.G, metricCode: 'audit_score', weight: 30, normalization: { min: 0, max: 100, direction: 'higher_better' } },
    { pillar: ScoringPillar.G, metricCode: 'open_issue_penalty', weight: 30, normalization: { min: 0, max: 20, direction: 'lower_better' } },
  ];
  await prisma.scoringConfig.createMany({ data: scoring });

  // Metric definitions (diversity / social).
  const metricDefs: { code: string; name: string; unit: string; direction: MetricDirection }[] = [
    { code: 'gender_balance', name: 'Gender Balance Index', unit: '%', direction: MetricDirection.higher_better },
    { code: 'leadership_diversity', name: 'Leadership Diversity', unit: '%', direction: MetricDirection.higher_better },
    { code: 'pay_gap', name: 'Gender Pay Gap', unit: '%', direction: MetricDirection.lower_better },
  ];
  await prisma.metricDefinition.createMany({ data: metricDefs });
}

// ─────────────────────────── RBAC ───────────────────────────
const roleIdByName = new Map<string, string>();
const permIdByKey = new Map<string, string>();

const PERMISSION_CATALOG: Record<string, string[]> = {
  users: ['read', 'create', 'update', 'delete', 'manage_roles'],
  departments: ['read', 'create', 'update', 'delete'],
  categories: ['read', 'create', 'update', 'delete'],
  emission_factors: ['read', 'create', 'update', 'delete'],
  operational_records: ['read', 'create', 'update', 'delete', 'import', 'calculate'],
  carbon: ['read', 'create', 'update', 'delete'],
  goals: ['read', 'create', 'update', 'delete'],
  csr_activities: ['read', 'create', 'update', 'delete'],
  csr_participations: ['read', 'create', 'approve', 'reject', 'withdraw'],
  diversity: ['read', 'create', 'update', 'delete'],
  training: ['read', 'create', 'update', 'delete'],
  policies: ['read', 'create', 'update', 'delete', 'publish', 'acknowledge'],
  audits: ['read', 'create', 'update', 'delete', 'execute'],
  issues: ['read', 'create', 'update', 'delete', 'transition'],
  challenges: ['read', 'create', 'update', 'delete', 'transition'],
  challenge_participations: ['read', 'create', 'approve', 'reject', 'withdraw'],
  badges: ['read', 'create', 'update', 'delete', 'award'],
  rewards: ['read', 'create', 'update', 'delete', 'redeem', 'fulfill'],
  leaderboard: ['read'],
  scores: ['read', 'recompute'],
  dashboards: ['read'],
  reports: ['read', 'create', 'export'],
  notifications: ['read', 'update', 'manage'],
  files: ['read', 'upload'],
  invitations: ['read', 'create', 'delete'],
  settings: ['read', 'update'],
  lookups: ['read', 'create', 'update', 'delete'],
  roles: ['read', 'create', 'update', 'delete'],
  audit_logs: ['read'],
};

const allPerms = (): string[] =>
  Object.entries(PERMISSION_CATALOG).flatMap(([r, acts]) =>
    acts.map((a) => `${r}:${a}`),
  );
const readAll = (): string[] =>
  Object.keys(PERMISSION_CATALOG).map((r) => `${r}:read`);

// Default matrix (Admin-editable), spec §A9.
const ROLE_GRANTS: Record<string, string[]> = {
  Admin: allPerms(),
  'ESG Manager': [
    ...['emission_factors', 'operational_records', 'carbon', 'goals'].flatMap((r) =>
      PERMISSION_CATALOG[r].map((a) => `${r}:${a}`),
    ),
    ...PERMISSION_CATALOG.challenges.map((a) => `challenges:${a}`),
    'challenge_participations:read', 'challenge_participations:approve', 'challenge_participations:reject',
    'categories:read', 'badges:read', 'leaderboard:read', 'scores:read',
    'reports:read', 'reports:create', 'reports:export',
    'dashboards:read', 'files:read', 'files:upload',
    'notifications:read', 'notifications:update',
  ],
  'CSR Manager': [
    ...PERMISSION_CATALOG.csr_activities.map((a) => `csr_activities:${a}`),
    'csr_participations:read', 'csr_participations:create', 'csr_participations:approve', 'csr_participations:reject',
    ...PERMISSION_CATALOG.diversity.map((a) => `diversity:${a}`),
    ...PERMISSION_CATALOG.training.map((a) => `training:${a}`),
    'categories:read', 'leaderboard:read', 'scores:read',
    'reports:read', 'reports:create', 'reports:export',
    'dashboards:read', 'files:read', 'files:upload',
    'notifications:read', 'notifications:update',
  ],
  'Compliance Officer': [
    ...PERMISSION_CATALOG.policies.map((a) => `policies:${a}`),
    ...PERMISSION_CATALOG.audits.map((a) => `audits:${a}`),
    ...PERMISSION_CATALOG.issues.map((a) => `issues:${a}`),
    'audit_logs:read', 'scores:read',
    'reports:read', 'reports:create', 'reports:export',
    'dashboards:read', 'files:read', 'files:upload',
    'notifications:read', 'notifications:update',
  ],
  'Department Head': [
    'csr_participations:read', 'csr_participations:approve', 'csr_participations:reject',
    'challenge_participations:read', 'challenge_participations:approve', 'challenge_participations:reject',
    'goals:read', 'goals:create', 'goals:update',
    'users:read', 'scores:read',
    'reports:read', 'reports:export',
    'dashboards:read', 'files:read', 'files:upload',
    'notifications:read', 'notifications:update',
  ],
  Employee: [
    'csr_activities:read', 'csr_participations:read', 'csr_participations:create', 'csr_participations:withdraw',
    'challenges:read', 'challenge_participations:read', 'challenge_participations:create', 'challenge_participations:withdraw',
    'policies:read', 'policies:acknowledge',
    'rewards:read', 'rewards:redeem', 'badges:read', 'leaderboard:read',
    'dashboards:read', 'files:read', 'files:upload',
    'notifications:read', 'notifications:update',
  ],
  Auditor: [
    ...readAll(),
    'audits:execute', 'issues:create', 'issues:transition', 'audit_logs:read',
    'reports:export', 'files:upload',
  ],
};

async function seedRbac(): Promise<void> {
  // permissions
  for (const [resource, actions] of Object.entries(PERMISSION_CATALOG)) {
    for (const action of actions) {
      const p = await prisma.permission.create({ data: { resource, action } });
      permIdByKey.set(`${resource}:${action}`, p.id);
    }
  }
  // roles + mapping
  for (const [name, grants] of Object.entries(ROLE_GRANTS)) {
    const role = await prisma.role.create({
      data: { name, description: `${name} role`, isSystem: true },
    });
    roleIdByName.set(name, role.id);
    const unique = Array.from(new Set(grants));
    await prisma.rolePermission.createMany({
      data: unique
        .filter((k) => permIdByKey.has(k))
        .map((k) => ({ roleId: role.id, permissionId: permIdByKey.get(k)! })),
    });
  }
}

// ─────────────────────────── org: departments + users ───────────────────────────
interface SeededUser {
  id: string;
  email: string;
  departmentId: string;
  role: string;
}
const users: SeededUser[] = [];
const deptIdByCode = new Map<string, string>();

async function seedOrg(): Promise<void> {
  const passwordHash = await argon2.hash('Demo@123');

  // 6 departments, one parent-child (Manufacturing → Operations).
  const deptSpecs = [
    { name: 'Sustainability', code: 'SUST', parent: null },
    { name: 'Operations', code: 'OPS', parent: null },
    { name: 'Human Resources', code: 'HR', parent: null },
    { name: 'Finance', code: 'FIN', parent: null },
    { name: 'Corporate', code: 'CORP', parent: null },
    { name: 'Manufacturing', code: 'MFG', parent: 'OPS' },
  ];
  for (const d of deptSpecs) {
    const dept = await prisma.department.create({
      data: {
        name: d.name,
        code: d.code,
        parentDepartmentId: d.parent ? deptIdByCode.get(d.parent) : null,
      },
    });
    deptIdByCode.set(d.code, dept.id);
  }
  const deptCodes = ['SUST', 'OPS', 'HR', 'FIN', 'CORP', 'MFG'];

  // 25 users: 7 canonical role holders + 18 employees.
  const canonical: { email: string; first: string; last: string; role: string }[] = [
    { email: 'admin@ecosphere.demo', first: 'Ava', last: 'Admin', role: 'Admin' },
    { email: 'esg@ecosphere.demo', first: 'Ethan', last: 'Green', role: 'ESG Manager' },
    { email: 'csr@ecosphere.demo', first: 'Carla', last: 'Rivera', role: 'CSR Manager' },
    { email: 'compliance@ecosphere.demo', first: 'Colin', last: 'Ford', role: 'Compliance Officer' },
    { email: 'head@ecosphere.demo', first: 'Hana', last: 'Ito', role: 'Department Head' },
    { email: 'employee@ecosphere.demo', first: 'Evan', last: 'Lee', role: 'Employee' },
    { email: 'auditor@ecosphere.demo', first: 'Aisha', last: 'Osei', role: 'Auditor' },
  ];

  const makeUser = async (
    email: string,
    first: string,
    last: string,
    role: string,
    deptCode: string,
    idx: number,
  ): Promise<void> => {
    const u = await prisma.user.create({
      data: {
        employeeCode: `EMP${String(idx + 1).padStart(4, '0')}`,
        firstName: first,
        lastName: last,
        email,
        passwordHash,
        departmentId: deptIdByCode.get(deptCode)!,
        designation: role,
        joinDate: dateOnly(daysAgo(400 - idx * 5)),
        emailVerifiedAt: daysAgo(390 - idx * 5),
        isActive: true,
      },
    });
    await prisma.userRole.create({
      data: { userId: u.id, roleId: roleIdByName.get(role)! },
    });
    users.push({ id: u.id, email, departmentId: u.departmentId, role });
  };

  let idx = 0;
  for (const c of canonical) {
    await makeUser(c.email, c.first, c.last, c.role, pick(deptCodes, idx), idx);
    idx++;
  }
  // 18 more employees; give emp1 & emp2 the Department Head role.
  const firstNames = ['Liam', 'Mia', 'Noah', 'Zoe', 'Omar', 'Ivy', 'Leo', 'Nina', 'Kai', 'Ruth', 'Sam', 'Tara', 'Umar', 'Vera', 'Will', 'Xena', 'Yves', 'Zara'];
  for (let i = 0; i < 18; i++) {
    const role = i < 2 ? 'Department Head' : 'Employee';
    await makeUser(
      `emp${i + 1}@ecosphere.demo`,
      pick(firstNames, i),
      `Emp${i + 1}`,
      role,
      pick(deptCodes, i),
      idx,
    );
    idx++;
  }

  // Assign department heads (head@ → OPS; emp1 → SUST; emp2 → FIN).
  const headUser = users.find((u) => u.email === 'head@ecosphere.demo')!;
  const emp1 = users.find((u) => u.email === 'emp1@ecosphere.demo')!;
  const emp2 = users.find((u) => u.email === 'emp2@ecosphere.demo')!;
  await prisma.department.update({ where: { id: deptIdByCode.get('OPS')! }, data: { headUserId: headUser.id } });
  await prisma.department.update({ where: { id: deptIdByCode.get('SUST')! }, data: { headUserId: emp1.id } });
  await prisma.department.update({ where: { id: deptIdByCode.get('FIN')! }, data: { headUserId: emp2.id } });

  // employee_count derived cache.
  for (const code of deptCodes) {
    const count = await prisma.user.count({ where: { departmentId: deptIdByCode.get(code)! } });
    await prisma.department.update({ where: { id: deptIdByCode.get(code)! }, data: { employeeCount: count } });
  }
}

// ─────────────────────────── categories ───────────────────────────
const categoryIdByKey = new Map<string, string>();
async function seedCategories(): Promise<void> {
  const cats: { name: string; type: string }[] = [
    { name: 'Community', type: 'CSR_ACTIVITY' },
    { name: 'Environment', type: 'CSR_ACTIVITY' },
    { name: 'Education', type: 'CSR_ACTIVITY' },
    { name: 'Energy Saving', type: 'CHALLENGE' },
    { name: 'Waste Reduction', type: 'CHALLENGE' },
    { name: 'Sustainable Transport', type: 'CHALLENGE' },
  ];
  for (const c of cats) {
    const cat = await prisma.category.create({ data: c });
    categoryIdByKey.set(`${c.type}:${c.name}`, cat.id);
  }
}

// ─────────────────────────── environmental ───────────────────────────
interface FactorRow { id: string; category: string; unit: string; snapshot: number }
const activeFactors: FactorRow[] = [];

async function seedEnvironmental(): Promise<void> {
  const deptIds = Array.from(deptIdByCode.values());
  const factorSpecs: { category: string; unit: string; scope: string; value: number }[] = [
    { category: 'electricity', unit: 'KWH', scope: 'SCOPE_2', value: 0.42 },
    { category: 'natural_gas', unit: 'M3', scope: 'SCOPE_1', value: 2.02 },
    { category: 'diesel', unit: 'LITRE', scope: 'SCOPE_1', value: 2.68 },
    { category: 'petrol', unit: 'LITRE', scope: 'SCOPE_1', value: 2.31 },
    { category: 'water', unit: 'M3', scope: 'SCOPE_3', value: 0.34 },
    { category: 'waste', unit: 'KG', scope: 'SCOPE_3', value: 0.58 },
    { category: 'air_travel', unit: 'KM', scope: 'SCOPE_3', value: 0.15 },
    { category: 'paper', unit: 'KG', scope: 'SCOPE_3', value: 1.2 },
  ];
  for (const f of factorSpecs) {
    const factor = await prisma.emissionFactor.create({
      data: {
        name: `${f.category} emission factor`,
        category: f.category,
        unitId: lv('UNIT', f.unit),
        scopeId: lv('EMISSION_SCOPE', f.scope),
        factorValue: f.value,
        sourceReference: 'GHG Protocol / DEFRA 2024',
        effectiveFrom: dateOnly(monthsAgo(12)),
        isActive: true,
      },
    });
    activeFactors.push({ id: factor.id, category: f.category, unit: f.unit, snapshot: f.value });
  }
  // Electricity date-versioned older entry (spec §A11: "one with 2 versions").
  await prisma.emissionFactor.create({
    data: {
      name: 'electricity emission factor (2023)',
      category: 'electricity',
      unitId: lv('UNIT', 'KWH'),
      scopeId: lv('EMISSION_SCOPE', 'SCOPE_2'),
      factorValue: 0.45,
      sourceReference: 'GHG Protocol / DEFRA 2023',
      effectiveFrom: dateOnly(monthsAgo(24)),
      effectiveTo: dateOnly(monthsAgo(12)),
      isActive: false,
    },
  });

  // 20 operational records, each linked 1:1 to an AUTO carbon transaction.
  for (let i = 0; i < 20; i++) {
    const f = pick(activeFactors, i);
    const dept = pick(deptIds, i);
    const qty = 50 + i * 7;
    const occurred = dateOnly(monthsAgo(i % 12));
    const rec = await prisma.operationalRecord.create({
      data: {
        recordType: pick([RecordType.PURCHASE, RecordType.MANUFACTURING, RecordType.EXPENSE, RecordType.FLEET], i),
        departmentId: dept,
        description: `Auto record #${i + 1} (${f.category})`,
        quantity: qty,
        unitId: lv('UNIT', f.unit),
        amount: qty * 1.5,
        occurredAt: occurred,
        emissionCategory: f.category,
      },
    });
    await prisma.carbonTransaction.create({
      data: {
        operationalRecordId: rec.id,
        departmentId: dept,
        emissionFactorId: f.id,
        factorValueSnapshot: f.snapshot,
        quantity: qty,
        unitId: lv('UNIT', f.unit),
        co2eKg: Number((qty * f.snapshot).toFixed(4)),
        calculationMode: CalculationMode.AUTO,
        occurredAt: occurred,
      },
    });
  }
  // 40 MANUAL carbon transactions → 60 total across 12 months.
  for (let i = 0; i < 40; i++) {
    const f = pick(activeFactors, i + 3);
    const dept = pick(deptIds, i + 1);
    const qty = 30 + i * 5;
    const occurred = dateOnly(monthsAgo(i % 12));
    await prisma.carbonTransaction.create({
      data: {
        departmentId: dept,
        emissionFactorId: f.id,
        factorValueSnapshot: f.snapshot,
        quantity: qty,
        unitId: lv('UNIT', f.unit),
        co2eKg: Number((qty * f.snapshot).toFixed(4)),
        calculationMode: CalculationMode.MANUAL,
        occurredAt: occurred,
        notes: `Manual entry #${i + 1}`,
      },
    });
  }

  // Environmental goals (some dept-scoped, one org-wide).
  const goalDefs = [
    { title: 'Cut electricity emissions 15%', dept: 'OPS', target: 850, baseline: 1000 },
    { title: 'Reduce fleet diesel 10%', dept: 'MFG', target: 900, baseline: 1000 },
    { title: 'Org-wide net emissions reduction', dept: null, target: 4000, baseline: 5000 },
    { title: 'Water usage down 20%', dept: 'SUST', target: 800, baseline: 1000 },
  ];
  for (const g of goalDefs) {
    await prisma.environmentalGoal.create({
      data: {
        title: g.title,
        departmentId: g.dept ? deptIdByCode.get(g.dept) : null,
        metricCode: 'co2e_reduction',
        targetValue: g.target,
        baselineValue: g.baseline,
        unitId: lv('UNIT', 'TONNE'),
        periodStart: dateOnly(monthsAgo(6)),
        periodEnd: dateOnly(daysFromNow(180)),
        statusId: lv('GOAL_STATUS', 'ACTIVE'),
        progressPct: 45,
      },
    });
  }

  // A few products with ESG profiles.
  for (let i = 0; i < 3; i++) {
    const p = await prisma.product.create({
      data: { name: `EcoProduct ${i + 1}`, sku: `SKU-${1000 + i}`, category: 'consumer' },
    });
    await prisma.productEsgProfile.create({
      data: {
        productId: p.id,
        carbonFootprintPerUnit: 1.2 + i,
        recyclabilityPct: 60 + i * 10,
        sustainabilityRating: pick(['A', 'B', 'C'], i),
        certifications: ['FSC', 'EnergyStar'],
      },
    });
  }
}

// ─────────────────────────── XP ledger accumulator ───────────────────────────
interface LedgerEvent {
  employeeId: string;
  entryType: XpEntryType;
  points: number; // signed
  sourceType: XpSourceType;
  sourceId: string | null;
  remarks: string;
  at: Date;
}
const ledgerEvents: LedgerEvent[] = [];
const approvedCsrByEmployee = new Map<string, number>();
const approvedChallengeByEmployee = new Map<string, number>();

// ─────────────────────────── social ───────────────────────────
async function seedSocial(): Promise<void> {
  // participant pool = employee-like users, excluding the near-threshold user.
  const nearEmployee = users.find((u) => u.email === 'emp18@ecosphere.demo')!;
  const pool = users.filter(
    (u) => u.email !== nearEmployee.email && u.role !== 'Admin',
  );

  const csrCatKeys = ['CSR_ACTIVITY:Community', 'CSR_ACTIVITY:Environment', 'CSR_ACTIVITY:Education'];
  const activityStatuses = ['DRAFT', 'OPEN', 'OPEN', 'OPEN', 'CLOSED', 'ARCHIVED'];
  const activities: { id: string; points: number; status: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const points = 50 + i * 10;
    const a = await prisma.csrActivity.create({
      data: {
        title: `CSR Activity ${i + 1}`,
        categoryId: categoryIdByKey.get(pick(csrCatKeys, i))!,
        description: `Community initiative #${i + 1}`,
        departmentId: pick(Array.from(deptIdByCode.values()), i),
        location: pick(['HQ', 'Plant', 'City Center'], i),
        startDate: dateOnly(monthsAgo(4)),
        endDate: dateOnly(monthsAgo(1)),
        capacity: 30,
        pointsValue: points,
        statusId: lv('CSR_ACTIVITY_STATUS', activityStatuses[i]),
      },
    });
    activities.push({ id: a.id, points, status: activityStatuses[i] });
  }

  // 20 participations across the non-draft activities, mixed statuses (~8 approved).
  const openish = activities.filter((a) => a.status !== 'DRAFT' && a.status !== 'ARCHIVED');
  const statusCycle = ['APPROVED', 'SUBMITTED', 'APPROVED', 'PENDING', 'REJECTED', 'APPROVED', 'WITHDRAWN', 'SUBMITTED'];
  for (let i = 0; i < 20; i++) {
    const activity = pick(openish, i);
    const emp = pool[i % pool.length];
    const status = i < 8 ? statusCycle[i] : pick(['SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'], i);
    const approved = status === 'APPROVED';
    const decidedAt = daysAgo(30 - (i % 25));
    const part = await prisma.csrParticipation.create({
      data: {
        csrActivityId: activity.id,
        employeeId: emp.id,
        statusId: lv('CSR_PARTICIPATION_STATUS', status),
        pointsEarned: approved ? activity.points : null,
        completionDate: approved ? dateOnly(decidedAt) : null,
        decidedBy: approved || status === 'REJECTED' ? users[2].id : null,
        decidedAt: approved || status === 'REJECTED' ? decidedAt : null,
        decisionRemarks: status === 'REJECTED' ? 'Insufficient evidence' : approved ? 'Approved' : null,
      },
    });
    if (approved) {
      ledgerEvents.push({
        employeeId: emp.id,
        entryType: XpEntryType.EARN,
        points: activity.points,
        sourceType: XpSourceType.CSR,
        sourceId: part.id,
        remarks: `CSR approval: ${activity.id.slice(0, 8)}`,
        at: decidedAt,
      });
      approvedCsrByEmployee.set(emp.id, (approvedCsrByEmployee.get(emp.id) ?? 0) + 1);
    }
  }

  // Diversity records (current period, per metric, some departments).
  const metricDefs = await prisma.metricDefinition.findMany();
  const deptIds = Array.from(deptIdByCode.values());
  for (let i = 0; i < metricDefs.length; i++) {
    for (let d = 0; d < 3; d++) {
      await prisma.diversityMetricRecord.create({
        data: {
          departmentId: pick(deptIds, d),
          metricDefinitionId: metricDefs[i].id,
          period: dateOnly(monthsAgo(1)),
          value: 45 + i * 5 + d * 3,
          metadata: { source: 'HRIS' },
        },
      });
    }
  }

  // Training records (~15), mostly completed.
  for (let i = 0; i < 15; i++) {
    const emp = pool[i % pool.length];
    const completed = i % 4 !== 0;
    await prisma.trainingRecord.create({
      data: {
        employeeId: emp.id,
        trainingName: pick(['ESG Fundamentals', 'Ethics & Compliance', 'Safety 101', 'Diversity Awareness'], i),
        completedAt: completed ? dateOnly(daysAgo(20 + i)) : null,
        hours: 2 + (i % 3),
        statusId: lv('TRAINING_STATUS', completed ? 'COMPLETED' : 'IN_PROGRESS'),
      },
    });
  }
}

// ─────────────────────────── gamification ───────────────────────────
const rewardIdByName = new Map<string, string>();

async function seedGamification(): Promise<void> {
  const nearEmployee = users.find((u) => u.email === 'emp18@ecosphere.demo')!;
  const pool = users.filter((u) => u.email !== nearEmployee.email && u.role !== 'Admin');
  const chalCatKeys = ['CHALLENGE:Energy Saving', 'CHALLENGE:Waste Reduction', 'CHALLENGE:Sustainable Transport'];

  // 10 challenges across all 5 states.
  const statePlan = ['DRAFT', 'DRAFT', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'UNDER_REVIEW', 'UNDER_REVIEW', 'COMPLETED', 'COMPLETED', 'ARCHIVED'];
  const challenges: { id: string; xp: number; status: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const xp = 40 + i * 10;
    const c = await prisma.challenge.create({
      data: {
        title: `Challenge ${i + 1}`,
        categoryId: categoryIdByKey.get(pick(chalCatKeys, i))!,
        description: `Sustainability challenge #${i + 1}`,
        xpValue: xp,
        difficultyId: lv('DIFFICULTY', pick(['EASY', 'MEDIUM', 'HARD'], i)),
        evidenceRequired: true,
        startDate: dateOnly(monthsAgo(3)),
        deadline: dateOnly(daysFromNow(30 - (i % 40))),
        statusId: lv('CHALLENGE_STATUS', statePlan[i]),
        createdBy: users[1].id,
      },
    });
    challenges.push({ id: c.id, xp, status: statePlan[i] });
  }

  // 30 participations on Active / Under Review / Completed challenges (~12 approved).
  const joinable = challenges.filter((c) => ['ACTIVE', 'UNDER_REVIEW', 'COMPLETED'].includes(c.status));
  let approvedCount = 0;
  for (let i = 0; i < 30; i++) {
    const challenge = joinable[i % joinable.length];
    const emp = pool[i % pool.length];
    let status: string;
    if (challenge.status === 'COMPLETED' || challenge.status === 'UNDER_REVIEW') {
      status = pick(['APPROVED', 'SUBMITTED', 'APPROVED', 'REJECTED'], i);
    } else {
      status = pick(['JOINED', 'SUBMITTED', 'WITHDRAWN'], i);
    }
    if (status === 'APPROVED') approvedCount++;
    const approved = status === 'APPROVED';
    const decidedAt = daysAgo(20 - (i % 18));
    const part = await prisma.challengeParticipation.create({
      data: {
        challengeId: challenge.id,
        employeeId: emp.id,
        progressPct: approved ? 100 : status === 'SUBMITTED' ? 90 : 40,
        statusId: lv('CHALLENGE_PARTICIPATION_STATUS', status),
        xpAwarded: approved ? challenge.xp : null,
        decidedBy: approved || status === 'REJECTED' ? users[1].id : null,
        decidedAt: approved || status === 'REJECTED' ? decidedAt : null,
        decisionRemarks: status === 'REJECTED' ? 'Did not meet criteria' : approved ? 'Great work' : null,
      },
    });
    if (approved) {
      ledgerEvents.push({
        employeeId: emp.id,
        entryType: XpEntryType.EARN,
        points: challenge.xp,
        sourceType: XpSourceType.CHALLENGE,
        sourceId: part.id,
        remarks: `Challenge approval: ${challenge.id.slice(0, 8)}`,
        at: decidedAt,
      });
      approvedChallengeByEmployee.set(emp.id, (approvedChallengeByEmployee.get(emp.id) ?? 0) + 1);
    }
  }

  // 6 rewards — one stock 0 (OutOfStock), one stock 2 (spec §A11).
  const rewardSpecs = [
    { name: 'Eco Water Bottle', points: 100, stock: 50, status: 'ACTIVE' },
    { name: 'Reusable Tote Bag', points: 150, stock: 2, status: 'ACTIVE' },
    { name: 'Plant a Tree', points: 200, stock: 100, status: 'ACTIVE' },
    { name: 'Coffee Voucher', points: 250, stock: 0, status: 'OUT_OF_STOCK' },
    { name: 'Bike Voucher', points: 300, stock: 5, status: 'ACTIVE' },
    { name: 'Extra Day Off', points: 400, stock: 10, status: 'ACTIVE' },
  ];
  for (const r of rewardSpecs) {
    const reward = await prisma.reward.create({
      data: {
        name: r.name,
        description: `Redeem for ${r.name}`,
        pointsRequired: r.points,
        stock: r.stock,
        statusId: lv('REWARD_STATUS', r.status),
      },
    });
    rewardIdByName.set(r.name, reward.id);
  }

  // Grant onboarding XP so a set of employees can afford redemptions.
  const activeEmployees = pool.slice(0, 8);
  for (let i = 0; i < activeEmployees.length; i++) {
    ledgerEvents.push({
      employeeId: activeEmployees[i].id,
      entryType: XpEntryType.EARN,
      points: 800,
      sourceType: XpSourceType.MANUAL,
      sourceId: null,
      remarks: 'Onboarding XP grant',
      at: daysAgo(200),
    });
  }
  // One employee seeded just below a badge threshold: exactly 950 (< 1000).
  ledgerEvents.push({
    employeeId: nearEmployee.id,
    entryType: XpEntryType.EARN,
    points: 950,
    sourceType: XpSourceType.MANUAL,
    sourceId: null,
    remarks: 'Near XP Champion threshold',
    at: daysAgo(120),
  });

  // 12 redemptions among the funded employees (2 cancelled → compensating credit).
  const redeemableRewards = rewardSpecs.filter((r) => r.status === 'ACTIVE');
  for (let i = 0; i < 12; i++) {
    const emp = activeEmployees[i % activeEmployees.length];
    const r = pick(redeemableRewards, i);
    const status = i >= 10 ? 'CANCELLED' : i % 3 === 0 ? 'FULFILLED' : 'REDEEMED';
    const redeemedAt = daysAgo(15 - i);
    const redemption = await prisma.rewardRedemption.create({
      data: {
        rewardId: rewardIdByName.get(r.name)!,
        employeeId: emp.id,
        pointsSpent: r.points,
        statusId: lv('REDEMPTION_STATUS', status),
        redeemedAt,
        fulfilledAt: status === 'FULFILLED' ? redeemedAt : null,
        fulfilledBy: status === 'FULFILLED' ? users[0].id : null,
      },
    });
    ledgerEvents.push({
      employeeId: emp.id,
      entryType: XpEntryType.REDEEM,
      points: -r.points,
      sourceType: XpSourceType.REDEMPTION,
      sourceId: redemption.id,
      remarks: `Redeemed ${r.name}`,
      at: redeemedAt,
    });
    if (status === 'CANCELLED') {
      ledgerEvents.push({
        employeeId: emp.id,
        entryType: XpEntryType.ADJUST,
        points: r.points,
        sourceType: XpSourceType.REDEMPTION,
        sourceId: redemption.id,
        remarks: `Cancellation credit for ${r.name}`,
        at: new Date(redeemedAt.getTime() + 60_000),
      });
    }
  }

  await writeLedger();
  await seedBadges();
}

// Build append-only ledger with running balance_after per employee.
async function writeLedger(): Promise<void> {
  const byEmployee = new Map<string, LedgerEvent[]>();
  for (const e of ledgerEvents) {
    const arr = byEmployee.get(e.employeeId) ?? [];
    arr.push(e);
    byEmployee.set(e.employeeId, arr);
  }
  for (const [employeeId, events] of byEmployee) {
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    let balance = 0;
    for (const ev of events) {
      balance += ev.points;
      if (balance < 0) {
        throw new Error(`ledger balance negative for employee ${employeeId}`);
      }
      await prisma.xpLedger.create({
        data: {
          employeeId,
          entryType: ev.entryType,
          points: ev.points,
          sourceType: ev.sourceType,
          sourceId: ev.sourceId,
          balanceAfter: balance,
          remarks: ev.remarks,
          createdAt: ev.at,
        },
      });
    }
  }
}

const finalBalanceByEmployee = (): Map<string, number> => {
  const bal = new Map<string, number>();
  for (const e of ledgerEvents) bal.set(e.employeeId, (bal.get(e.employeeId) ?? 0) + e.points);
  return bal;
};

async function seedBadges(): Promise<void> {
  const badgeSpecs = [
    { name: 'First Steps', metric: 'xp_total', threshold: 100, icon: '👣' },
    { name: 'Rising Star', metric: 'xp_total', threshold: 500, icon: '⭐' },
    { name: 'XP Champion', metric: 'xp_total', threshold: 1000, icon: '🏆' },
    { name: 'Sustainability Legend', metric: 'xp_total', threshold: 1500, icon: '👑' },
    { name: 'Challenge Rookie', metric: 'challenges_completed', threshold: 1, icon: '🌱' },
    { name: 'Challenge Master', metric: 'challenges_completed', threshold: 5, icon: '🥇' },
    { name: 'Community Helper', metric: 'csr_completed', threshold: 1, icon: '🤝' },
    { name: 'CSR Hero', metric: 'csr_completed', threshold: 5, icon: '💚' },
  ];
  const badges: { id: string; metric: string; threshold: number; rule: object }[] = [];
  for (const b of badgeSpecs) {
    const rule = { metric: b.metric, operator: '>=', threshold: b.threshold };
    const badge = await prisma.badge.create({
      data: { name: b.name, description: `${b.name} badge`, iconKey: b.icon, unlockRule: rule },
    });
    badges.push({ id: badge.id, metric: b.metric, threshold: b.threshold, rule });
  }

  const balances = finalBalanceByEmployee();
  for (const u of users) {
    const metrics: Record<string, number> = {
      xp_total: balances.get(u.id) ?? 0,
      challenges_completed: approvedChallengeByEmployee.get(u.id) ?? 0,
      csr_completed: approvedCsrByEmployee.get(u.id) ?? 0,
    };
    for (const badge of badges) {
      if (metrics[badge.metric] >= badge.threshold) {
        await prisma.badgeAward.create({
          data: {
            badgeId: badge.id,
            employeeId: u.id,
            awardedMode: AwardMode.AUTO,
            ruleSnapshot: badge.rule,
            awardedAt: daysAgo(10),
          },
        });
      }
    }
  }
}

// ─────────────────────────── governance ───────────────────────────
async function seedGovernance(): Promise<void> {
  const auditor = users.find((u) => u.email === 'auditor@ecosphere.demo')!;
  const deptIds = Array.from(deptIdByCode.values());

  // 5 policies with varied acknowledgement rates.
  const policySpecs = [
    { title: 'Code of Conduct', status: 'PUBLISHED', ackFraction: 0.92 },
    { title: 'Environmental Policy', status: 'PUBLISHED', ackFraction: 0.6 },
    { title: 'Data Privacy Policy', status: 'PUBLISHED', ackFraction: 0.4 },
    { title: 'Health & Safety Policy', status: 'PUBLISHED', ackFraction: 0.76 },
    { title: 'Anti-Bribery Policy (Draft)', status: 'DRAFT', ackFraction: 0 },
  ];
  for (const p of policySpecs) {
    const published = p.status === 'PUBLISHED';
    const policy = await prisma.esgPolicy.create({
      data: {
        title: p.title,
        description: `${p.title} — organisational policy`,
        version: 1,
        audience: PolicyAudience.ALL,
        statusId: lv('POLICY_STATUS', p.status),
        effectiveDate: published ? dateOnly(monthsAgo(3)) : null,
        acknowledgementDeadline: published ? dateOnly(daysFromNow(30)) : null,
        publishedAt: published ? monthsAgo(3) : null,
        publishedBy: published ? users[3].id : null,
      },
    });
    if (published) {
      const count = Math.round(users.length * p.ackFraction);
      for (let i = 0; i < count; i++) {
        await prisma.policyAcknowledgement.create({
          data: {
            policyId: policy.id,
            policyVersion: 1,
            employeeId: users[i].id,
            acknowledgedAt: daysAgo(20 - (i % 15)),
            ipAddress: `10.0.0.${i + 1}`,
          },
        });
      }
    }
  }

  // 4 audits (Planned, In Progress, two Completed with scores).
  const auditPlan = [
    { title: 'Annual ESG Audit', status: 'PLANNED', score: null as number | null },
    { title: 'Supplier Compliance Review', status: 'IN_PROGRESS', score: null },
    { title: 'Carbon Data Assurance', status: 'COMPLETED', score: 88 },
    { title: 'Governance Controls Audit', status: 'COMPLETED', score: 75 },
  ];
  const auditIds: string[] = [];
  for (let i = 0; i < auditPlan.length; i++) {
    const a = auditPlan[i];
    const completed = a.status === 'COMPLETED';
    const audit = await prisma.governanceAudit.create({
      data: {
        title: a.title,
        auditType: pick(['Internal', 'External'], i),
        scopeDescription: `${a.title} scope`,
        departmentId: pick(deptIds, i),
        auditorId: auditor.id,
        plannedStart: dateOnly(monthsAgo(4)),
        plannedEnd: dateOnly(monthsAgo(2)),
        actualStart: a.status !== 'PLANNED' ? dateOnly(monthsAgo(3)) : null,
        actualEnd: completed ? dateOnly(monthsAgo(1)) : null,
        statusId: lv('AUDIT_STATUS', a.status),
        findingsSummary: completed ? 'Findings documented; issues raised.' : null,
        auditScore: a.score,
      },
    });
    auditIds.push(audit.id);
  }

  // 12 compliance issues — all owner + due date, EXACTLY 3 overdue (spec §A11).
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const pool = users.filter((u) => u.role !== 'Admin');
  for (let i = 0; i < 12; i++) {
    const overdue = i < 3; // first three are overdue
    let status: string;
    let dueDate: Date;
    let resolvedAt: Date | null = null;
    let closedAt: Date | null = null;
    let resolutionNotes: string | null = null;
    if (overdue) {
      status = i === 2 ? 'IN_PROGRESS' : 'OPEN';
      dueDate = dateOnly(daysAgo(10 + i * 3)); // past due, unresolved
    } else if (i < 6) {
      status = 'OPEN';
      dueDate = dateOnly(daysFromNow(20 + i));
    } else if (i < 8) {
      status = 'IN_PROGRESS';
      dueDate = dateOnly(daysFromNow(15 + i));
    } else if (i < 10) {
      status = 'RESOLVED';
      dueDate = dateOnly(daysAgo(5));
      resolvedAt = daysAgo(3);
      resolutionNotes = 'Remediated and verified.';
    } else {
      status = 'CLOSED';
      dueDate = dateOnly(daysAgo(20));
      resolvedAt = daysAgo(15);
      closedAt = daysAgo(12);
      resolutionNotes = 'Closed after verification.';
    }
    await prisma.complianceIssue.create({
      data: {
        governanceAuditId: i % 3 === 0 ? auditIds[2] : null,
        title: `Compliance Issue ${i + 1}`,
        description: `Detailed description for issue ${i + 1}.`,
        severityId: lv('SEVERITY', pick(severities, i)),
        ownerId: pool[i % pool.length].id,
        dueDate,
        raisedBy: auditor.id,
        raisedDate: dateOnly(daysAgo(40 - i)),
        statusId: lv('ISSUE_STATUS', status),
        isOverdue: overdue,
        resolutionNotes,
        resolvedAt,
        closedAt,
      },
    });
  }
}

// ─────────────────────────── scoring (4 quarters × depts) ───────────────────────────
async function seedScores(): Promise<void> {
  const weightSnapshot = { environmental: 40, social: 30, governance: 30 };
  const quarters = [0, 1, 2, 3].map((q) => {
    const end = monthsAgo(q * 3);
    const start = monthsAgo(q * 3 + 3);
    return { start: dateOnly(start), end: dateOnly(end) };
  });
  const deptCodes = Array.from(deptIdByCode.keys());
  for (let d = 0; d < deptCodes.length; d++) {
    const deptId = deptIdByCode.get(deptCodes[d])!;
    for (let q = 0; q < quarters.length; q++) {
      const e = 60 + ((d + q) % 30);
      const s = 55 + ((d * 2 + q) % 35);
      const g = 65 + ((d + q * 2) % 25);
      const total = Number(((e * 40 + s * 30 + g * 30) / 100).toFixed(1));
      await prisma.departmentScore.create({
        data: {
          departmentId: deptId,
          periodStart: quarters[q].start,
          periodEnd: quarters[q].end,
          environmentalScore: e,
          socialScore: s,
          governanceScore: g,
          totalScore: total,
          weightConfigSnapshot: weightSnapshot,
          metricBreakdown: {
            environmental: { emission_vs_goal: e },
            social: { csr_participation_rate: s, training_completion: s, diversity_index: s },
            governance: { policy_ack_rate: g, audit_score: g, open_issue_penalty: g },
          },
          computedAt: quarters[q].end,
        },
      });
    }
  }
}

// ─────────────────────────── notifications ───────────────────────────
async function seedNotifications(): Promise<void> {
  // Notification templates + rules (event bus → rules → dispatch, spec §A11).
  const templates: { code: string; title: string; body: string }[] = [
    { code: 'CSR_APPROVED', title: 'CSR participation approved', body: 'Hi {{employee_name}}, your participation in {{activity_title}} was approved (+{{points}} pts).' },
    { code: 'CHALLENGE_APPROVED', title: 'Challenge approved', body: 'Hi {{employee_name}}, your challenge {{challenge_title}} was approved (+{{xp}} XP).' },
    { code: 'BADGE_AWARDED', title: 'New badge unlocked', body: 'Congratulations {{employee_name}}, you earned the {{badge_name}} badge!' },
    { code: 'ISSUE_ASSIGNED', title: 'Compliance issue assigned', body: 'You have been assigned issue {{issue_title}} (due {{due_date}}).' },
    { code: 'ISSUE_OVERDUE', title: 'Compliance issue overdue', body: 'Issue {{issue_title}} is overdue. Please act.' },
    { code: 'POLICY_REMINDER', title: 'Policy acknowledgement due', body: 'Please acknowledge {{policy_title}} before {{deadline}}.' },
    { code: 'REWARD_REDEEMED', title: 'Reward redeemed', body: 'You redeemed {{reward_name}} for {{points}} points.' },
  ];
  const templateIdByCode = new Map<string, string>();
  for (const t of templates) {
    const tpl = await prisma.notificationTemplate.create({
      data: {
        code: t.code,
        titleTemplate: t.title,
        bodyTemplate: t.body,
        channelDefaults: { channels: ['IN_APP', 'EMAIL'] },
      },
    });
    templateIdByCode.set(t.code, tpl.id);
  }

  const complianceRole = roleIdByName.get('Compliance Officer')!;
  const rules: {
    event: string;
    template: string;
    channels: string[];
    strategy: RecipientStrategy;
    roleId?: string;
    cron?: string;
  }[] = [
    { event: 'csr.approved', template: 'CSR_APPROVED', channels: ['IN_APP', 'EMAIL'], strategy: RecipientStrategy.OWNER },
    { event: 'challenge.approved', template: 'CHALLENGE_APPROVED', channels: ['IN_APP', 'EMAIL'], strategy: RecipientStrategy.OWNER },
    { event: 'badge.awarded', template: 'BADGE_AWARDED', channels: ['IN_APP'], strategy: RecipientStrategy.OWNER },
    { event: 'issue.raised', template: 'ISSUE_ASSIGNED', channels: ['IN_APP', 'EMAIL'], strategy: RecipientStrategy.OWNER },
    { event: 'issue.overdue', template: 'ISSUE_OVERDUE', channels: ['IN_APP', 'EMAIL'], strategy: RecipientStrategy.ROLE, roleId: complianceRole, cron: '0 2 * * *' },
    { event: 'policy.reminder', template: 'POLICY_REMINDER', channels: ['IN_APP', 'EMAIL'], strategy: RecipientStrategy.ALL_AFFECTED, cron: '0 9 * * *' },
    { event: 'reward.redeemed', template: 'REWARD_REDEEMED', channels: ['IN_APP'], strategy: RecipientStrategy.ACTOR },
  ];
  for (const r of rules) {
    await prisma.notificationRule.create({
      data: {
        eventCode: r.event,
        templateId: templateIdByCode.get(r.template)!,
        channels: r.channels,
        recipientStrategy: r.strategy,
        recipientRoleId: r.roleId ?? null,
        scheduleCron: r.cron ?? null,
        isEnabled: true,
      },
    });
  }

  // Dashboard widget configs per role (unique role+widget).
  const widgets = ['org_esg_score', 'carbon_trend', 'pending_approvals', 'open_issues'];
  for (const [name, roleId] of roleIdByName) {
    for (let w = 0; w < widgets.length; w++) {
      await prisma.dashboardWidgetConfig.create({
        data: { roleId, widgetCode: widgets[w], position: w, isVisible: true, config: { role: name } },
      });
    }
  }

  // Approval rules (spec §A6.5 / §A9).
  const csrManager = roleIdByName.get('CSR Manager')!;
  const esgManager = roleIdByName.get('ESG Manager')!;
  const deptHead = roleIdByName.get('Department Head')!;
  const approvalRules: {
    entityType: ApprovalEntityType;
    roleId: string;
    scope: ApprovalScope;
  }[] = [
    { entityType: ApprovalEntityType.CSR_PARTICIPATION, roleId: csrManager, scope: ApprovalScope.ANY },
    { entityType: ApprovalEntityType.CSR_PARTICIPATION, roleId: deptHead, scope: ApprovalScope.SAME_DEPARTMENT },
    { entityType: ApprovalEntityType.CHALLENGE_PARTICIPATION, roleId: esgManager, scope: ApprovalScope.ANY },
    { entityType: ApprovalEntityType.CHALLENGE_PARTICIPATION, roleId: deptHead, scope: ApprovalScope.SAME_DEPARTMENT },
  ];
  for (const ar of approvalRules) {
    await prisma.approvalRule.create({
      data: { entityType: ar.entityType, approverRoleId: ar.roleId, scope: ar.scope, isActive: true },
    });
  }

  // 15 in-app notification rows, mixed read/unread.
  const events = ['csr.approved', 'challenge.approved', 'badge.awarded', 'issue.raised', 'policy.reminder'];
  for (let i = 0; i < 15; i++) {
    const u = users[i % users.length];
    const read = i % 3 === 0;
    await prisma.notification.create({
      data: {
        userId: u.id,
        title: pick(templates, i).title,
        body: pick(templates, i).body,
        eventCode: pick(events, i),
        channel: NotificationChannel.IN_APP,
        isRead: read,
        readAt: read ? daysAgo(2) : null,
        createdAt: daysAgo(i),
      },
    });
  }
}

// ─────────────────────────── main ───────────────────────────
async function main(): Promise<void> {
  console.log('⏳ Resetting database…');
  await resetDb();
  console.log('→ lookups & transitions');
  await seedLookups();
  console.log('→ settings, weights, scoring, metric defs');
  await seedSettings();
  console.log('→ RBAC (permissions, roles, mapping)');
  await seedRbac();
  console.log('→ departments & users');
  await seedOrg();
  console.log('→ categories');
  await seedCategories();
  console.log('→ environmental (factors, records, carbon, goals, products)');
  await seedEnvironmental();
  console.log('→ social (CSR, diversity, training)');
  await seedSocial();
  console.log('→ gamification (challenges, XP, badges, rewards, redemptions)');
  await seedGamification();
  console.log('→ governance (policies, audits, issues)');
  await seedGovernance();
  console.log('→ department scores (4 quarters)');
  await seedScores();
  console.log('→ notifications, rules, templates, approval/dashboard config');
  await seedNotifications();

  await printSummary();
}

async function printSummary(): Promise<void> {
  const counts = {
    departments: await prisma.department.count(),
    users: await prisma.user.count(),
    roles: await prisma.role.count(),
    permissions: await prisma.permission.count(),
    role_permissions: await prisma.rolePermission.count(),
    lookup_values: await prisma.lookupValue.count(),
    lookup_transitions: await prisma.lookupTransition.count(),
    app_settings: await prisma.appSetting.count(),
    emission_factors: await prisma.emissionFactor.count(),
    carbon_transactions: await prisma.carbonTransaction.count(),
    csr_activities: await prisma.csrActivity.count(),
    csr_participations: await prisma.csrParticipation.count(),
    challenges: await prisma.challenge.count(),
    challenge_participations: await prisma.challengeParticipation.count(),
    xp_ledger: await prisma.xpLedger.count(),
    badges: await prisma.badge.count(),
    badge_awards: await prisma.badgeAward.count(),
    rewards: await prisma.reward.count(),
    reward_redemptions: await prisma.rewardRedemption.count(),
    policies: await prisma.esgPolicy.count(),
    policy_acks: await prisma.policyAcknowledgement.count(),
    audits: await prisma.governanceAudit.count(),
    compliance_issues: await prisma.complianceIssue.count(),
    overdue_issues: await prisma.complianceIssue.count({ where: { isOverdue: true } }),
    department_scores: await prisma.departmentScore.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('\n✅ Seed complete. Row counts:');
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k.padEnd(26)} ${v}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
