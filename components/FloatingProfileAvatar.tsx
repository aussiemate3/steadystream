'use client';

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function FloatingProfileAvatar() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [hasNewActivity, setHasNewActivity] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkForNewActivity = async () => {
      const { data: unreadThrows } = await supabase
        .from('throws')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .limit(1);

      setHasNewActivity((unreadThrows?.length ?? 0) > 0);
    };

    checkForNewActivity();

    const channel = supabase
      .channel('profile-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'throws',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          setHasNewActivity(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`,
        },
        () => {
          setHasNewActivity(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleClick = () => {
    setHasNewActivity(false);
    router.push('/profile');
  };

  if (!user || !profile) return null;

  const initials = profile.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
      aria-label="View Profile"
    >
      <div className="relative">
        {hasNewActivity && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-purple-500 to-primary animate-pulse opacity-75 blur-sm" />
        )}
        <Avatar className="w-12 h-12 border-2 border-background relative">
          <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </button>
  );
}
