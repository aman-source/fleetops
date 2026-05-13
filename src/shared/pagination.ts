import { z } from 'zod';

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginationMeta {
  [key: string]: unknown;
  cursor: string | null;
  has_more: boolean;
  count: number;
}

export function paginationMeta(items: { id: string }[], limit: number): PaginationMeta {
  const hasMore = items.length === limit;
  return {
    cursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    has_more: hasMore,
    count: items.length,
  };
}
