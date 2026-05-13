import { Badge } from '@/components/posts/post-badge';

type PostTagBadgeProps = {
  label: string;
  categoryColor?: string | null;
  className?: string;
};

export function PostTagBadge({ label, categoryColor, className }: PostTagBadgeProps) {
  return (
    <Badge
      variant="tag"
      className={className}
      accentColor={categoryColor}
    >
      {label}
    </Badge>
  );
}

export function withPostTagPrefix(title: string, tagLabel?: string | null) {
  if (!tagLabel) {
    return title;
  }

  return `[${tagLabel}] ${title}`;
}
