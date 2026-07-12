import { api } from './apiClient';

export interface LookupValue {
  id: string;
  code: string;
  label: string;
  color: string | null;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
}
export interface LookupType {
  id: string;
  code: string;
  values: LookupValue[];
}
export interface DeptRef {
  id: string;
  name: string;
  code: string;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
  departmentId: string;
}

let lookupsCache: LookupType[] | null = null;
let deptsCache: DeptRef[] | null = null;
let usersCache: UserRef[] | null = null;

async function loadLookups(): Promise<LookupType[]> {
  if (!lookupsCache) lookupsCache = await api.get<LookupType[]>('/lookups');
  return lookupsCache;
}

async function loadDepts(): Promise<DeptRef[]> {
  if (!deptsCache) deptsCache = await api.get<DeptRef[]>('/departments?size=200');
  return deptsCache;
}

export const reference = {
  invalidate() {
    lookupsCache = null;
    deptsCache = null;
    usersCache = null;
  },

  async users(): Promise<UserRef[]> {
    if (!usersCache) usersCache = await api.get<UserRef[]>('/users/directory');
    return usersCache;
  },

  async userNameById(id: string | null | undefined): Promise<string> {
    if (!id) return 'Unassigned';
    const users = await this.users();
    return users.find((u) => u.id === id)?.name ?? 'Unknown';
  },

  async valuesOf(typeCode: string): Promise<LookupValue[]> {
    const types = await loadLookups();
    return types.find((t) => t.code === typeCode)?.values ?? [];
  },

  /** Resolve a lookup value id by its code within a type. */
  async idOf(typeCode: string, valueCode: string): Promise<string> {
    const vals = await this.valuesOf(typeCode);
    const v = vals.find((x) => x.code === valueCode);
    if (!v) throw new Error(`lookup ${typeCode}:${valueCode} not found`);
    return v.id;
  },

  /** Resolve a lookup value id by its (human) label within a type. */
  async idByLabel(typeCode: string, label: string): Promise<string | undefined> {
    const vals = await this.valuesOf(typeCode);
    return vals.find((x) => x.label === label || x.code === label)?.id;
  },

  async byId(typeCode: string, id: string | null | undefined): Promise<LookupValue | undefined> {
    if (!id) return undefined;
    const vals = await this.valuesOf(typeCode);
    return vals.find((x) => x.id === id);
  },

  async departments(): Promise<DeptRef[]> {
    return loadDepts();
  },

  async deptNameById(id: string | null | undefined): Promise<string> {
    if (!id) return 'Organization-wide';
    const depts = await loadDepts();
    return depts.find((d) => d.id === id)?.name ?? 'Unknown';
  },

  async deptIdByName(name: string): Promise<string | undefined> {
    const depts = await loadDepts();
    return depts.find((d) => d.name === name || d.code === name)?.id;
  },
};

/** Emission-scope helpers: backend SCOPE_1/2/3 ↔ frontend 1|2|3. */
export const scopeUtil = {
  toNum(code: string | undefined): 1 | 2 | 3 {
    if (code === 'SCOPE_1') return 1;
    if (code === 'SCOPE_3') return 3;
    return 2;
  },
  toCode(n: 1 | 2 | 3): string {
    return `SCOPE_${n}`;
  },
};
