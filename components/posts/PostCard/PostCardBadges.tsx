import { Badge } from '@/components/posts/post-badge';
import type { PostCardEntity } from './types';

type PostCardBadgesProps = {
  post: PostCardEntity;
  compact?: boolean;
};

function LocationPinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 fill-current">
      <path d="M12 2a7 7 0 0 0-7 7c0 4.98 6.15 12.36 6.41 12.67a.75.75 0 0 0 1.16 0C12.85 21.36 19 13.98 19 9a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
    </svg>
  );
}

export function PostCardBadges({ post, compact = false }: PostCardBadgesProps) {
  const cityLabel = post.city?.name ?? '전 지역';
  const shouldShowSalePrice = post.category?.type === 'SALE' && Boolean(post.price);

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'min-h-6' : ''}`.trim()}>
      <Badge variant="city" className="gap-1">
        <LocationPinIcon />
        {cityLabel}
      </Badge>
      {post.category ? <Badge variant="category">{post.category.name}</Badge> : null}
      {shouldShowSalePrice ? <Badge variant="status">NZD {post.price}</Badge> : null}
      {(post.tags ?? []).slice(0, compact ? 1 : 4).map((tag) => (
        <Badge key={tag.id} variant="tag" accentColor={post.category?.color}>
          {tag.label}
        </Badge>
      ))}
      {post.isPinned ? <Badge variant="status">고정</Badge> : null}
      {post.isRecommended ? <Badge variant="recommendation">추천</Badge> : null}
      {typeof post.reportCount === 'number' ? <Badge variant="status">신고 {post.reportCount}</Badge> : null}
    </div>
  );
}
