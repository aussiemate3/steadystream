'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  const { user, profile } = useAuth();

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/feed"
            className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 hover:opacity-75 transition-opacity tracking-tight"
          >
            SteadyStream
          </Link>

          {user && profile && (
            <Link
              href="/profile"
              className="hover:opacity-75 transition-opacity"
              aria-label="Profile"
            >
              <Avatar className="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
