import { Badge } from '@/components/posts/post-badge';
import type { PostCardEntity } from './types';

type PostCardBadgesProps = {
  post: PostCardEntity;
  compact?: boolean;
};

export function PostCardBadges({ post, compact = false }: PostCardBadgesProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'min-h-6' : ''}`.trim()}>
      {post.isPinned ? <Badge variant="status">고정</Badge> : null}
      {post.category ? <Badge variant="category">{post.category.name}</Badge> : null}
      {post.city ? <Badge variant="city">{post.city.name}</Badge> : <Badge variant="city">전 지역</Badge>}
      {post.isRecommended ? <Badge variant="recommendation">추천</Badge> : null}
      {typeof post.reportCount === 'number' ? <Badge variant="status">신고 {post.reportCount}</Badge> : null}
      {(post.tags ?? []).slice(0, compact ? 1 : 4).map((tag) => (
        <Badge key={tag.id} variant="tag" accentColor={post.category?.color}>
          {tag.label}
        </Badge>
      ))}
    </div>
  );
}
