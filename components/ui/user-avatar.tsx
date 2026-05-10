import Image from 'next/image';

type UserAvatarProps = {
  displayName: string;
  profileImageUrl?: string | null;
  className?: string;
  sizes?: string;
};

function getInitial(displayName: string) {
  const trimmed = displayName.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : '?';
}

export function UserAvatar({ displayName, profileImageUrl, className, sizes }: UserAvatarProps) {
  const sizeClassName = className ?? 'h-8 w-8';

  if (profileImageUrl) {
    return (
      <span className={`relative overflow-hidden rounded-full bg-zinc-200 ${sizeClassName}`}>
        <Image
          src={profileImageUrl}
          alt={`${displayName} 프로필 이미지`}
          fill
          sizes={sizes ?? '32px'}
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 ${sizeClassName}`}>
      {getInitial(displayName)}
    </span>
  );
}
