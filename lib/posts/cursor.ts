type CursorPayload = {
  createdAt: string;
  id: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
};

export type PaginationCursor = {
  createdAt: Date;
  id: string;
  isPinned?: boolean;
  pinnedAt?: Date | null;
};

export function encodeCursor(cursor: PaginationCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
      ...(typeof cursor.isPinned === 'boolean' ? { isPinned: cursor.isPinned } : {}),
      ...('pinnedAt' in cursor
        ? { pinnedAt: cursor.pinnedAt ? cursor.pinnedAt.toISOString() : null }
        : {}),
    }),
  ).toString('base64url');
}

export function decodeCursor(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as CursorPayload;
    if (!parsed?.id || !parsed?.createdAt) {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    let pinnedAt: Date | null | undefined;
    if ('pinnedAt' in parsed) {
      if (parsed.pinnedAt === null) {
        pinnedAt = null;
      } else if (typeof parsed.pinnedAt === 'string') {
        const parsedPinnedAt = new Date(parsed.pinnedAt);
        if (Number.isNaN(parsedPinnedAt.getTime())) {
          return null;
        }
        pinnedAt = parsedPinnedAt;
      } else {
        return null;
      }
    }

    return {
      id: parsed.id,
      createdAt,
      ...(typeof parsed.isPinned === 'boolean' ? { isPinned: parsed.isPinned } : {}),
      ...(pinnedAt !== undefined ? { pinnedAt } : {}),
    } as PaginationCursor;
  } catch {
    return null;
  }
}
