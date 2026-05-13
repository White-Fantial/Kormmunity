export type PostCardVariant = 'featured' | 'compact' | 'minimal';

export type PostCardTag = {
  id: string;
  label: string;
};

export type PostCardEntity = {
  id: string;
  title: string | null;
  bodyPreview: string;
  href?: string;
  createdAt: Date;
  thumbnailUrl?: string | null;
  category?: { name: string; color?: string | null };
  city?: { name: string } | null;
  tags?: PostCardTag[];
  isPinned?: boolean;
  isRecommended?: boolean;
  author?: {
    displayName: string;
    profileImageUrl: string | null;
  };
  commentCount?: number;
  likeCount?: number;
  reportCount?: number;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
};

export type PostCardFeaturedProps = {
  variant: 'featured';
  post: PostCardEntity;
  showLikeAction?: boolean;
  showSaveAction?: boolean;
  returnTo?: string;
};

export type PostCardCompactProps = {
  variant: 'compact';
  post: PostCardEntity;
  clickable?: boolean;
  showActiveBookmark?: boolean;
  moreMenu?: {
    editHref: string;
    postId: string;
  };
};

export type PostCardMinimalProps = {
  variant: 'minimal';
  post: Pick<PostCardEntity, 'id' | 'title' | 'bodyPreview' | 'createdAt' | 'href'> & {
    isUnread?: boolean;
  };
};

export type PostCardProps = PostCardFeaturedProps | PostCardCompactProps | PostCardMinimalProps;
