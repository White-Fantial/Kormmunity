type PostCardMetaProps = {
  createdAt: Date;
  commentCount?: number;
  likeCount?: number;
  authorName?: string;
  compact?: boolean;
  showCommentCount?: boolean;
  showLikeCount?: boolean;
};

export function PostCardMeta({
  createdAt,
  commentCount,
  likeCount,
  authorName,
  compact = false,
  showCommentCount = true,
  showLikeCount = true,
}: PostCardMetaProps) {
  const metaItems = [
    authorName,
    showCommentCount && typeof commentCount === 'number' ? `댓글 ${commentCount}` : null,
    showLikeCount && typeof likeCount === 'number' ? `좋아요 ${likeCount}` : null,
    new Date(createdAt).toLocaleString('ko-KR'),
  ].filter(Boolean);

  return (
    <p
      className={`flex items-center gap-1.5 text-[#777] ${
        compact ? 'overflow-hidden text-xs whitespace-nowrap' : 'flex-wrap text-sm'
      }`}
    >
      {metaItems.map((item, index) => (
        <span key={`${String(item)}-${index}`} className={`inline-flex items-center gap-1.5 ${compact ? 'shrink-0' : ''}`}>
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </p>
  );
}
