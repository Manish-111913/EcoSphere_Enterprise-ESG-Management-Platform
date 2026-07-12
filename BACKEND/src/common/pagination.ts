export interface PageQuery {
  page?: string | number;
  size?: string | number;
  sort?: string;
  search?: string;
}

export interface Pagination {
  page: number;
  size: number;
  skip: number;
  take: number;
  sort?: string;
  search?: string;
}

export interface PageMeta {
  page: number;
  size: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

export function parsePagination(q: PageQuery): Pagination {
  const page = Math.max(1, Number(q.page) || 1);
  const size = Math.min(MAX_SIZE, Math.max(1, Number(q.size) || DEFAULT_SIZE));
  return {
    page,
    size,
    skip: (page - 1) * size,
    take: size,
    sort: q.sort,
    search: q.search?.trim() || undefined,
  };
}

export function paginate<T>(
  data: T[],
  total: number,
  p: Pagination,
): Paginated<T> {
  return { data, meta: { page: p.page, size: p.size, total } };
}
