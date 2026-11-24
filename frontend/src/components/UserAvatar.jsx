import { getAvatarPresetClass, getInitials } from '../utils/formatters';

export default function UserAvatar({ user, size = 'md' }) {
  const sizeClasses = {
    sm: 'h-7 w-7 text-[11px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-16 w-16 text-lg',
  }[size] || 'h-9 w-9 text-xs';

  const avatarValue = user?.avatar || '';
  const isImageAvatar =
    avatarValue.startsWith('data:image/') ||
    avatarValue.startsWith('http://') ||
    avatarValue.startsWith('https://');

  if (isImageAvatar) {
    return (
      <img
        src={avatarValue}
        alt={user?.name || 'Avatar Pengguna'}
        className={`${sizeClasses} shrink-0 rounded-lg border border-[#E6E6E2] object-cover dark:border-[#242730]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} ${getAvatarPresetClass(avatarValue)} flex shrink-0 items-center justify-center rounded-lg font-mono font-semibold tracking-tight`}
    >
      {getInitials(user?.name)}
    </div>
  );
}

