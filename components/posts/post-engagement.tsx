'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import {
  type CreateInteractiveCommentState,
  submitInteractiveCommentAction,
} from '@/app/posts/[postId]/comments/actions';
import { generateCommentDraftAction } from '@/app/posts/[postId]/comments/ai-actions';

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
  canGenerateDraft: boolean;
  authorAccountOptions: Array<{
    id: string;
    displayName: string;
    accountType: 'OPERATOR' | 'PERSONA';
    cityName?: string | null;
  }>;
};

export function PostCommentComposer({
  postId,
  currentUserLoggedIn,
  canSelectAuthorAccount,
  canGenerateDraft,
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
  const [state, setState] = useState(INITIAL_COMMENT_STATE);
  const [commentSubmitPending, setCommentSubmitPending] = useState(false);
  const [commentListRefreshing, setCommentListRefreshing] = useState(false);
  const [isDraftPending, startDraftTransition] = useTransition();
  const [authorUserIdOverride, setAuthorUserIdOverride] = useState('');
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const submitRequestSequenceRef = useRef(0);
  const activeSubmitRequestIdRef = useRef<string | null>(null);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (commentSubmitPending) {
        return;
      }

      const formData = new FormData(event.currentTarget);
      const requestSequence = submitRequestSequenceRef.current + 1;
      submitRequestSequenceRef.current = requestSequence;
      const requestId = `comment-submit-${Date.now()}-${requestSequence}`;
      activeSubmitRequestIdRef.current = requestId;

      console.info(`[PostCommentComposer][${requestId}] submit started`);
      setState(INITIAL_COMMENT_STATE);
      setCommentSubmitPending(true);

      try {
        const result = await submitInteractiveCommentAction(formData);
        if (activeSubmitRequestIdRef.current !== requestId) {
          return;
        }

        console.info(
          `[PostCommentComposer][${requestId}] API response received`,
          result.status,
          result.createdCommentId,
        );
        setState(result);

        if (result.status !== 'success') {
          console.error(`[PostCommentComposer][${requestId}] submit failed`, result.message);
          return;
        }

        console.info(`[PostCommentComposer][${requestId}] comment created`, result.createdCommentId);
        unlockContact();
        setCommentBody('');
        console.info(`[PostCommentComposer][${requestId}] refresh triggered`);
        setCommentListRefreshing(true);
        router.refresh();
      } catch (error) {
        if (activeSubmitRequestIdRef.current !== requestId) {
          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : '댓글 등록 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
        console.error(`[PostCommentComposer][${requestId}] submit failed`, error);
        setState({
          status: 'error',
          message: errorMessage,
          createdCommentId: null,
        });
      } finally {
        if (activeSubmitRequestIdRef.current !== requestId) {
          return;
        }

        setCommentSubmitPending(false);
        setCommentListRefreshing(false);
        activeSubmitRequestIdRef.current = null;
        console.info(`[PostCommentComposer][${requestId}] loading state reset`);
      }
    },
    [commentSubmitPending, router, setCommentBody, unlockContact],
  );

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
    <form
      id={POST_COMMENT_COMPOSER_ID}
      className="space-y-2"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="authorUserIdOverride" value={authorUserIdOverride} />

      {canSelectAuthorAccount ? (
        <div className="space-y-1">
          <label htmlFor={`${POST_COMMENT_COMPOSER_ID}-author`} className="text-xs font-medium text-[#555]">
            작성 계정
          </label>
          <select
            id={`${POST_COMMENT_COMPOSER_ID}-author`}
            value={authorUserIdOverride}
            onChange={(event) => setAuthorUserIdOverride(event.target.value)}
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            <option value="">내 계정으로 작성</option>
            {authorAccountOptions.map((authorAccount) => (
              <option key={authorAccount.id} value={authorAccount.id}>
                [{authorAccount.accountType}] {authorAccount.displayName}{authorAccount.cityName ? ` (${authorAccount.cityName})` : ''}
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

      {canGenerateDraft ? (
        <div className="space-y-1 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3">
          <button
            type="button"
            disabled={isDraftPending}
            onClick={() => {
              setDraftError(null);
              setDraftMessage(null);
              if (!authorUserIdOverride) {
                setDraftError('운영 계정을 먼저 선택해 주세요.');
                return;
              }

              startDraftTransition(async () => {
                const result = await generateCommentDraftAction({
                  postId,
                  authorUserIdOverride,
                  currentCommentBody: commentBody,
                });

                if (!result.ok) {
                  setDraftMessage(null);
                  setDraftError(result.message);
                  return;
                }

                setCommentBody(result.commentBody);
                setDraftError(null);
                setDraftMessage(result.message);
              });
            }}
            className="rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-xs font-semibold text-[#444] hover:border-[#fee500] hover:bg-[#fffde7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDraftPending ? '댓글 초안 생성 중...' : '자동 댓글 추천'}
          </button>
          {draftError ? <p className="text-xs text-red-700">{draftError}</p> : null}
          {draftMessage ? <p className="text-xs text-green-700">{draftMessage}</p> : null}
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

      <button
        type="submit"
        disabled={commentSubmitPending}
        aria-busy={commentSubmitPending}
        className="rounded-xl bg-[#fee500] px-4 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {commentSubmitPending ? '등록 중...' : '댓글 작성'}
      </button>
      {commentListRefreshing ? <span className="sr-only">댓글 목록 새로고침 중</span> : null}
    </form>
  );
}
