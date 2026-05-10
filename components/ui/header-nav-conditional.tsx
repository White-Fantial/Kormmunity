import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/session';
import { canHoldPost, canMakeFinalUserDecision } from '@/lib/permissions';

export async function HeaderNavConditional() {
  const currentUser = await getCurrentUser();

  return (
    <>
      {currentUser && canHoldPost(currentUser) ? (
        <Link
          href="/coordinator"
          className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2"
        >
          운영 관리
        </Link>
      ) : null}
      {currentUser && canMakeFinalUserDecision(currentUser) ? (
        <Link
          href="/admin"
          className="shrink-0 rounded-full border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2"
        >
          관리자
        </Link>
      ) : null}
    </>
  );
}
