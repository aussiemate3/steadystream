'use client';

import { Profile, Post, supabase } from '@/lib/supabase';
import { generateGradient, getInitials } from '@/lib/gradient-generator';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logEvent } from '@/lib/analytics';

type UserWithPosts = Profile & {
  recentPosts: Post[];
  postCount: number;
  followerCount: number;
  isFollowing: boolean;
  mutualCount?: number;
};

interface DiscoverUserCardProps {
  user: UserWithPosts;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
}

export const DiscoverUserCard = memo(function DiscoverUserCard({ user, onToggleFollow }: DiscoverUserCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const gradient = generateGradient(user.name);
  const initials = getInitials(user.name);

  const handleProfileClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logEvent('discover_click', { profile_id: user.id });
    router.push(`/users/${user.id}`);
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-md active:opacity-80 transition-all border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div onClick={handleProfileClick} className="cursor-pointer">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
            <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-semibold`}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0" onClick={handleProfileClick}>
          <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate cursor-pointer hover:underline">
            {user.name}
          </p>
        </div>
      </div>

      {user.mutualCount !== undefined && user.mutualCount > 0 && (
        <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          <Users className="w-4 h-4" />
          <span>{user.mutualCount} mutual follower{user.mutualCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      <Button
        variant={user.isFollowing ? 'outline' : 'default'}
        size="sm"
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFollow(user.id, user.isFollowing);
        }}
      >
        {user.isFollowing ? 'Following' : 'Follow'}
      </Button>
    </div>
  );
});
