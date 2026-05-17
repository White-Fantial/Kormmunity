export type PostCardVariant = 'featured' | 'compact' | 'minimal';
export type PostCardDisplayVariant = 'feed' | 'my-posts' | 'saved';

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
  price?: string | null;
  thumbnailUrl?: string | null;
  category?: { name: string; type?: string; color?: string | null };
  city?: { name: string } | null;
  tags?: PostCardTag[];
  isPinned?: boolean;
  isRecommended?: boolean;
  author?: {
    displayName: string;
    profileImageUrl: string | null;
    isOperator?: boolean;
  };
  commentCount?: number;
  likeCount?: number;
  viewCount?: number;
  reportCount?: number;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
};

export type PostCardFeaturedProps = {
  variant: 'featured';
  displayVariant?: PostCardDisplayVariant;
  post: PostCardEntity;
  showLikeAction?: boolean;
  showSaveAction?: boolean;
  returnTo?: string;
};

export type PostCardCompactProps = {
  variant: 'compact';
  displayVariant?: PostCardDisplayVariant;
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
