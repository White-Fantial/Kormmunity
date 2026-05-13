import { Prisma } from '@prisma/client';

import type { PaginationCursor } from '@/lib/posts/cursor';

export const PINNED_POST_ORDER_DESC = [
  { isPinned: 'desc' },
  { pinnedAt: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.PostOrderByWithRelationInput[];

export const PINNED_POST_ORDER_ASC = [
  { isPinned: 'asc' },
  { pinnedAt: { sort: 'asc', nulls: 'first' } },
  { createdAt: 'asc' },
  { id: 'asc' },
] satisfies Prisma.PostOrderByWithRelationInput[];

function buildCreatedAtCursorWhere(
  cursor: Pick<PaginationCursor, 'createdAt' | 'id'>,
  direction: 'next' | 'prev',
): Prisma.PostWhereInput {
  return direction === 'prev'
    ? {
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          {
            AND: [{ createdAt: cursor.createdAt }, { id: { gt: cursor.id } }],
          },
        ],
      }
    : {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          {
            AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
          },
        ],
      };
}

export function buildPinnedPostCursorWhere(
  cursor: PaginationCursor | null,
  direction: 'next' | 'prev',
): Prisma.PostWhereInput | undefined {
  if (!cursor) {
    return undefined;
  }

  if (typeof cursor.isPinned !== 'boolean') {
    return buildCreatedAtCursorWhere(cursor, direction);
  }

  if (!cursor.isPinned) {
    const createdAtCursorWhere = buildCreatedAtCursorWhere(cursor, direction);

    return direction === 'prev'
      ? {
          OR: [
            { isPinned: true },
            {
              AND: [{ isPinned: false }, createdAtCursorWhere],
            },
          ],
        }
      : {
          AND: [{ isPinned: false }, createdAtCursorWhere],
        };
  }

  if (!cursor.pinnedAt) {
    return buildCreatedAtCursorWhere(cursor, direction);
  }

  const createdAtCursorWhere = buildCreatedAtCursorWhere(cursor, direction);

  return direction === 'prev'
    ? {
        AND: [
          { isPinned: true },
          {
            OR: [
              { pinnedAt: { gt: cursor.pinnedAt } },
              {
                AND: [{ pinnedAt: cursor.pinnedAt }, createdAtCursorWhere],
              },
            ],
          },
        ],
      }
    : {
        OR: [
          { isPinned: false },
          {
            AND: [
              { isPinned: true },
              {
                OR: [
                  { pinnedAt: { lt: cursor.pinnedAt } },
                  {
                    AND: [{ pinnedAt: cursor.pinnedAt }, createdAtCursorWhere],
                  },
                ],
              },
            ],
          },
        ],
      };
}
