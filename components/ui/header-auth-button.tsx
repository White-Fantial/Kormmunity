import Link from 'next/link';

import { logoutAction } from '@/app/login/actions';
import { getCurrentUser } from '@/lib/auth/session';

export async function HeaderAuthButton() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    return (
      <form action={logoutAction}>
        <button type="submit" className="text-sm text-zinc-600 underline">
          로그아웃
        </button>
      </form>
    );
  }

  return (
    <Link href="/login" className="text-sm text-zinc-600 underline">
      로그인
    </Link>
  );
}
