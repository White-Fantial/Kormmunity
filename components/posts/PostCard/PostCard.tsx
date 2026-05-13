import { PostCardCompact } from './PostCardCompact';
import { PostCardFeatured } from './PostCardFeatured';
import { PostCardMinimal } from './PostCardMinimal';
import type { PostCardProps } from './types';

export function PostCard(props: PostCardProps) {
  if (props.variant === 'featured') {
    return <PostCardFeatured {...props} />;
  }

  if (props.variant === 'compact') {
    return <PostCardCompact {...props} />;
  }

  return <PostCardMinimal {...props} />;
}
