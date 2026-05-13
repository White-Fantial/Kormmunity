import { formatNeighbourWarmthWithLabel } from '@/lib/neighbour-warmth';

type NeighbourWarmthLabelProps = {
  warmth: number;
  className?: string;
};

export function NeighbourWarmthLabel({ warmth, className }: NeighbourWarmthLabelProps) {
  return (
    <span className={className ?? ''}>
      {formatNeighbourWarmthWithLabel(warmth)}
    </span>
  );
}
