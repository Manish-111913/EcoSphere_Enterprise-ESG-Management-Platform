import { api } from './apiClient';
import { reference } from './referenceData';
import { Challenge } from '../types';

interface BackendChallenge {
  id: string; title: string; categoryId: string; description: string | null;
  xpValue: number; difficultyId: string | null; evidenceRequired: boolean;
  startDate: string; deadline: string; statusId: string | null;
}
interface BackendCategory { id: string; name: string }

const STATUS_TO_CODE: Record<Challenge['status'], string> = {
  Draft: 'DRAFT', Active: 'ACTIVE', 'Under Review': 'UNDER_REVIEW', Completed: 'COMPLETED', Archived: 'ARCHIVED',
};
const CODE_TO_STATUS: Record<string, Challenge['status']> = {
  DRAFT: 'Draft', ACTIVE: 'Active', UNDER_REVIEW: 'Under Review', COMPLETED: 'Completed', ARCHIVED: 'Archived',
};
const CODE_TO_DIFFICULTY: Record<string, Challenge['difficulty']> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

const dateOnly = (d: string) => (d ? d.slice(0, 10) : d);

let categoryCache: BackendCategory[] | null = null;
async function challengeCategories(): Promise<BackendCategory[]> {
  if (!categoryCache) {
    categoryCache = await api.get<BackendCategory[]>('/categories?type=CHALLENGE').catch(() => []);
  }
  return categoryCache;
}

async function mapChallenge(c: BackendChallenge): Promise<Challenge> {
  const [status, difficulty, cats] = await Promise.all([
    reference.byId('CHALLENGE_STATUS', c.statusId),
    reference.byId('DIFFICULTY', c.difficultyId),
    challengeCategories(),
  ]);
  const catName = cats.find((x) => x.id === c.categoryId)?.name;
  const statusCode = status?.code;
  const diffCode = difficulty?.code;
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    category: catName,
    pillar: 'E',
    status: statusCode ? (CODE_TO_STATUS[statusCode] ?? 'Draft') : 'Draft',
    points: c.xpValue,
    xp: c.xpValue,
    startDate: dateOnly(c.startDate),
    endDate: dateOnly(c.deadline),
    difficulty: diffCode ? (CODE_TO_DIFFICULTY[diffCode] ?? 'Medium') : 'Medium',
  };
}

export const challengesService = {
  async getChallenges(): Promise<Challenge[]> {
    const res = await api.get<{ data: BackendChallenge[] }>('/challenges?size=200');
    const rows = Array.isArray(res) ? (res as unknown as BackendChallenge[]) : res.data;
    return Promise.all(rows.map(mapChallenge));
  },

  async getChallengeById(id: string): Promise<Challenge> {
    const row = await api.get<BackendChallenge>(`/challenges/${id}`);
    return mapChallenge(row);
  },

  async getCategories(): Promise<{ id: string; name: string }[]> {
    return challengeCategories();
  },

  async createChallenge(input: Omit<Challenge, 'id'>): Promise<Challenge> {
    const cats = await challengeCategories();
    const categoryId = cats.find((c) => c.name === input.category)?.id ?? cats[0]?.id;
    const [difficultyId, statusId] = await Promise.all([
      reference.idOf('DIFFICULTY', (input.difficulty || 'Medium').toUpperCase()).catch(() => undefined),
      reference.idOf('CHALLENGE_STATUS', STATUS_TO_CODE[input.status] || 'DRAFT').catch(() => undefined),
    ]);
    const created = await api.post<BackendChallenge>('/challenges', {
      title: input.title,
      categoryId,
      description: input.description,
      xpValue: input.xp,
      difficultyId,
      evidenceRequired: true,
      startDate: input.startDate,
      deadline: input.endDate,
      statusId,
    });
    return mapChallenge(created);
  },

  join(challengeId: string): Promise<unknown> {
    return api.post(`/challenges/${challengeId}/join`);
  },
};
