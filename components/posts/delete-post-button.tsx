'use client';

import { useFormStatus } from 'react-dom';

import { deletePostAction } from '@/app/posts/actions';

const DISABLED_STATE_CLASSES = 'disabled:cursor-not-allowed disabled:opacity-60';

function DeleteButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        if (!window.confirm('정말 삭제하시겠어요?')) {
          e.preventDefault();
        }
      }}
      className={`${className ?? ''} ${DISABLED_STATE_CLASSES}`.trim()}
    >
      {pending ? '삭제 중...' : '삭제하기'}
    </button>
  );
}

type DeletePostButtonProps = {
  postId: string;
  className?: string;
};

export function DeletePostButton({ postId, className }: DeletePostButtonProps) {
  return (
    <form action={deletePostAction} className="w-full">
      <input type="hidden" name="postId" value={postId} />
      <DeleteButton className={className} />
    </form>
  );
}
