type CursorPayload = {
  createdAt: string;
  id: string;
};

export type PaginationCursor = {
  createdAt: Date;
  id: string;
};

export function encodeCursor(cursor: PaginationCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
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

    return {
      id: parsed.id,
      createdAt,
    } as PaginationCursor;
  } catch {
    return null;
  }
}
