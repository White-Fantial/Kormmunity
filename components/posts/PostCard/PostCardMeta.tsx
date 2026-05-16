import { DateTimeText } from '@/components/ui/date-time-text';

type PostCardMetaProps = {
  createdAt: Date;
  commentCount?: number;
  likeCount?: number;
  authorName?: string;
  isOperator?: boolean;
  compact?: boolean;
  showCommentCount?: boolean;
  showLikeCount?: boolean;
};

export function PostCardMeta({
  createdAt,
  commentCount,
  likeCount,
  authorName,
  isOperator = false,
  compact = false,
  showCommentCount = true,
  showLikeCount = true,
}: PostCardMetaProps) {
  const metaItems = [
    showCommentCount && typeof commentCount === 'number' ? `댓글 ${commentCount}` : null,
    showLikeCount && typeof likeCount === 'number' ? `좋아요 ${likeCount}` : null,
    <DateTimeText key="created-at" value={createdAt} />,
  ].filter(Boolean);

  return (
    <p
      className={`flex items-center gap-1.5 text-[#777] ${
        compact ? 'overflow-hidden text-xs whitespace-nowrap' : 'flex-wrap text-sm'
      }`}
    >
      {authorName ? (
        <span className={`inline-flex items-center gap-1.5 ${compact ? 'shrink-0' : ''}`}>
          <span>{authorName}</span>
          {isOperator ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">운영자</span>
          ) : null}
        </span>
      ) : null}
      {metaItems.map((item, index) => (
        <span key={`${String(item)}-${index}`} className={`inline-flex items-center gap-1.5 ${compact ? 'shrink-0' : ''}`}>
          {(index > 0 || authorName) ? <span aria-hidden="true">·</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </p>
  );
}
