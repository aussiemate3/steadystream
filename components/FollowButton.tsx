'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  initialIsFollowing: boolean;
  initialIsMutual: boolean;
}

export function FollowButton({
  currentUserId,
  targetUserId,
  targetUserName,
  initialIsFollowing,
  initialIsMutual,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isMutual, setIsMutual] = useState(initialIsMutual);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const invalidateConnectionsCache = (userId: string) => {
    sessionStorage.removeItem(`connections_${userId}`);
  };

  const toggleFollow = async () => {
    const previousFollowingState = isFollowing;
    const previousMutualState = isMutual;

    setIsFollowing(!isFollowing);
    if (isFollowing) {
      setIsMutual(false);
    }
    setLoading(true);

    try {
      if (previousFollowingState) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);

        if (error) throw error;

        invalidateConnectionsCache(currentUserId);
        invalidateConnectionsCache(targetUserId);

        toast({
          description: `Unfollowed ${targetUserName}`,
        });
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });

        if (error) throw error;

        logEvent('follow_user', { followed_id: targetUserId });

        invalidateConnectionsCache(currentUserId);
        invalidateConnectionsCache(targetUserId);

        const { data: mutualData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', targetUserId)
          .eq('following_id', currentUserId)
          .maybeSingle();

        setIsMutual(!!mutualData);

        toast({
          description: `Following ${targetUserName}`,
        });
      }
    } catch (error) {
      setIsFollowing(previousFollowingState);
      setIsMutual(previousMutualState);
      toast({
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isMutual && (
        <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
          Mutual
        </span>
      )}
      <Button
        onClick={toggleFollow}
        disabled={loading}
        variant={isFollowing ? 'outline' : 'default'}
        size="sm"
      >
        {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
      </Button>
    </div>
  );
}
