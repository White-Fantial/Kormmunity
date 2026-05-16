'use client';

import Link from 'next/link';
import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import {
  createInteractiveCommentAction,
  type CreateInteractiveCommentState,
} from '@/app/posts/[postId]/comments/actions';
import { FormSubmitButton } from '@/components/ui/form-submit-button';

const POST_COMMENT_COMPOSER_ID = 'post-comment-composer';
const INITIAL_COMMENT_STATE: CreateInteractiveCommentState = {
  status: 'idle',
  message: null,
  createdCommentId: null,
};

type PostEngagementContextValue = {
  commentBody: string;
  setCommentBody: (value: string) => void;
  quickCommentTemplates: string[];
  shouldLockContact: boolean;
  isContactUnlocked: boolean;
  unlockContact: () => void;
  openComposerAndFocus: () => void;
};

const PostEngagementContext = createContext<PostEngagementContextValue | null>(null);

function usePostEngagement() {
  const value = useContext(PostEngagementContext);

  if (!value) {
    throw new Error('Post engagement components must be used within PostEngagementProvider.');
  }

  return value;
}

type PostEngagementProviderProps = {
  children: ReactNode;
  contactUrl: string | null;
  requireCommentBeforeContact: boolean;
  initialHasUnlockedContact: boolean;
  isOwner: boolean;
  bypassGate: boolean;
  quickCommentTemplates: string[];
};

export function PostEngagementProvider({
  children,
  contactUrl,
  requireCommentBeforeContact,
  initialHasUnlockedContact,
  isOwner,
  bypassGate,
  quickCommentTemplates,
}: PostEngagementProviderProps) {
  const [commentBody, setCommentBody] = useState('');
  const [isContactUnlocked, setIsContactUnlocked] = useState(
    !contactUrl ||
      !requireCommentBeforeContact ||
      isOwner ||
      bypassGate ||
      initialHasUnlockedContact,
  );

  const shouldLockContact = Boolean(
    contactUrl && requireCommentBeforeContact && !isOwner && !bypassGate,
  );

  const openComposerAndFocus = useCallback(() => {
    const composer = document.getElementById(POST_COMMENT_COMPOSER_ID);
    composer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = document.getElementById(`${POST_COMMENT_COMPOSER_ID}-body`) as
      | HTMLTextAreaElement
      | null;
    input?.focus();
  }, []);

  const unlockContact = useCallback(() => setIsContactUnlocked(true), []);

  const value = useMemo(
    () => ({
      commentBody,
      setCommentBody,
      quickCommentTemplates,
      shouldLockContact,
      isContactUnlocked,
      unlockContact,
      openComposerAndFocus,
    }),
    [
      commentBody,
      isContactUnlocked,
      openComposerAndFocus,
      quickCommentTemplates,
      shouldLockContact,
      unlockContact,
    ],
  );

  return (
    <PostEngagementContext.Provider value={value}>
      {children}
    </PostEngagementContext.Provider>
  );
}

type PostContactActionProps = {
  contactUrl: string | null;
  primaryActionButtonClass: string;
};

export function PostContactAction({
  contactUrl,
  primaryActionButtonClass,
}: PostContactActionProps) {
  const { isContactUnlocked, openComposerAndFocus, shouldLockContact } = usePostEngagement();

  if (!contactUrl) {
    return <p className="text-sm text-[#888]">작성자가 연락 링크를 등록하지 않았어요.</p>;
  }

  if (shouldLockContact && !isContactUnlocked) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={openComposerAndFocus}
          className={primaryActionButtonClass}
        >
          댓글을 남기고 연락하기
        </button>
        <p className="text-sm text-[#888]">댓글을 남기면 카카오 연락처가 열려요.</p>
      </div>
    );
  }

  return (
    <a
      href={contactUrl}
      target="_blank"
      rel="noreferrer"
      className={primaryActionButtonClass}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path fill="currentColor" d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.62 5.085 4.073 6.525L5.1 21l4.89-2.925c.65.09 1.32.135 2.01.135 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
      </svg>
      카카오로 연락하기
    </a>
  );
}

type PostCommentComposerProps = {
  postId: string;
  currentUserLoggedIn: boolean;
  canSelectAuthorAccount: boolean;
  authorAccountOptions: Array<{
    id: string;
    displayName: string;
    accountType: 'OPERATOR';
  }>;
};

export function PostCommentComposer({
  postId,
  currentUserLoggedIn,
  canSelectAuthorAccount,
  authorAccountOptions,
}: PostCommentComposerProps) {
  const router = useRouter();
  const {
    commentBody,
    setCommentBody,
    isContactUnlocked,
    quickCommentTemplates,
    shouldLockContact,
    unlockContact,
  } = usePostEngagement();
  const [state, formAction] = useActionState(createInteractiveCommentAction, INITIAL_COMMENT_STATE);
  const lastHandledCommentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      state.status !== 'success' ||
      !state.createdCommentId ||
      state.createdCommentId === lastHandledCommentIdRef.current
    ) {
      return;
    }

    lastHandledCommentIdRef.current = state.createdCommentId;
    unlockContact();
    setCommentBody('');
    router.refresh();
  }, [router, setCommentBody, state.createdCommentId, state.status, unlockContact]);

  if (!currentUserLoggedIn) {
    return (
      <p id={POST_COMMENT_COMPOSER_ID} className="text-sm text-[#888]">
        댓글을 작성하려면{' '}
        <Link href="/login" className="font-semibold text-[#3c1e1e] underline">
          로그인
        </Link>{' '}
        이 필요해요.
      </p>
    );
  }

  return (
    <form id={POST_COMMENT_COMPOSER_ID} action={formAction} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />

      {canSelectAuthorAccount ? (
        <div className="space-y-1">
          <label htmlFor={`${POST_COMMENT_COMPOSER_ID}-author`} className="text-xs font-medium text-[#555]">
            작성 계정
          </label>
          <select
            id={`${POST_COMMENT_COMPOSER_ID}-author`}
            name="authorUserIdOverride"
            defaultValue=""
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            <option value="">내 계정으로 작성</option>
            {authorAccountOptions.map((authorAccount) => (
              <option key={authorAccount.id} value={authorAccount.id}>
                [{authorAccount.accountType}] {authorAccount.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {quickCommentTemplates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quickCommentTemplates.map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => setCommentBody(template)}
              className="rounded-full border border-[#e8e8e8] px-3 py-1.5 text-xs text-[#555] hover:border-[#fee500] hover:bg-[#fffde7]"
            >
              {template}
            </button>
          ))}
        </div>
      ) : null}

      <label htmlFor={`${POST_COMMENT_COMPOSER_ID}-body`} className="sr-only">
        댓글 입력
      </label>
      <textarea
        id={`${POST_COMMENT_COMPOSER_ID}-body`}
        name="body"
        required
        rows={3}
        maxLength={500}
        value={commentBody}
        onChange={(event) => setCommentBody(event.target.value)}
        placeholder="댓글을 남겨보세요."
        className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
      />

      {state.message ? (
        <p
          className={`text-sm ${
            state.status === 'error' ? 'text-red-600' : 'text-green-700'
          }`}
        >
          {state.message}
          {state.status === 'success' && shouldLockContact && isContactUnlocked
            ? ' 카카오 연락처가 바로 열려요.'
            : null}
        </p>
      ) : null}

      <FormSubmitButton
        idleLabel="댓글 작성"
        pendingLabel="등록 중..."
        className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
      />
    </form>
  );
}
