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
