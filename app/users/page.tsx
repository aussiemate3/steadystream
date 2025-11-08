'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, Profile, Post } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { DiscoverUserCard } from '@/components/DiscoverUserCard';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

type UserWithData = Profile & {
  isFollowing: boolean;
  recentPosts: Post[];
  postCount: number;
  followerCount: number;
  mutualCount?: number;
};

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'suggested' | 'all'>('suggested');
  const [showFallbackMessage, setShowFallbackMessage] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    sessionStartRef.current = Date.now();

    return () => {
      if (user) {
        const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
        supabase.from('analytics').insert({
          user_id: user.id,
          event_type: 'discover_session',
          metadata: { duration },
        }).then(({ error }) => {
          if (error) console.error('Failed to log session:', error);
        });
      }
    };
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;

    setLoadingUsers(true);
    setError(null);

    try {

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw new Error('Failed to load user profiles');
      }

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        setLoadingUsers(false);
        return;
      }

      const { data: myFollowsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) {
        console.error('Error fetching follows:', followsError);
      }

      const myFollowingIds = new Set(myFollowsData?.map((f) => f.following_id) || []);

      const userIds = profilesData.map((p) => p.id);

      if (userIds.length === 0) {
        setUsers([]);
        setLoadingUsers(false);
        return;
      }

      const mutualConnectionsPromise =
        filter === 'suggested' && myFollowingIds.size > 0
          ? supabase
              .from('follows')
              .select('following_id, follower_id')
              .in('following_id', userIds)
              .in('follower_id', Array.from(myFollowingIds))
          : Promise.resolve({ data: null, error: null });

      const [postsData, followerCountsData, mutualConnectionsData] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('follows')
          .select('following_id')
          .in('following_id', userIds),
        mutualConnectionsPromise,
      ]);

      if (postsData.error) {
        console.error('Error fetching posts:', postsData.error);
      }
      if (followerCountsData.error) {
        console.error('Error fetching follower counts:', followerCountsData.error);
      }
      if (mutualConnectionsData.error) {
        console.error('Error fetching mutual connections:', mutualConnectionsData.error);
      }

      const postsByUser = new Map<string, Post[]>();
      const postCountByUser = new Map<string, number>();

      if (postsData.data) {
        for (const post of postsData.data) {
          if (!postsByUser.has(post.user_id)) {
            postsByUser.set(post.user_id, []);
            postCountByUser.set(post.user_id, 0);
          }
          if (postsByUser.get(post.user_id)!.length < 4) {
            postsByUser.get(post.user_id)!.push(post);
          }
          postCountByUser.set(post.user_id, (postCountByUser.get(post.user_id) || 0) + 1);
        }
      }

      const followerCountByUser = new Map<string, number>();
      if (followerCountsData.data) {
        for (const follow of followerCountsData.data) {
          followerCountByUser.set(
            follow.following_id,
            (followerCountByUser.get(follow.following_id) || 0) + 1
          );
        }
      }

      const mutualCountByUser = new Map<string, number>();
      if (mutualConnectionsData.data) {
        for (const connection of mutualConnectionsData.data) {
          mutualCountByUser.set(
            connection.following_id,
            (mutualCountByUser.get(connection.following_id) || 0) + 1
          );
        }
      }

      let usersWithData: UserWithData[] = profilesData.map((profile) => ({
        ...profile,
        isFollowing: myFollowingIds.has(profile.id),
        recentPosts: postsByUser.get(profile.id) || [],
        postCount: postCountByUser.get(profile.id) || 0,
        followerCount: followerCountByUser.get(profile.id) || 0,
        mutualCount: mutualCountByUser.get(profile.id) || 0,
      }));

      if (filter === 'suggested') {
        const suggestedUsers = usersWithData.filter((u) => (u.mutualCount || 0) > 0);

        if (suggestedUsers.length === 0) {
          setShowFallbackMessage(true);
        } else {
          usersWithData = suggestedUsers.sort((a, b) => (b.mutualCount || 0) - (a.mutualCount || 0));
          setShowFallbackMessage(false);
        }
      } else {
        setShowFallbackMessage(false);
      }

      setUsers(usersWithData);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [user, filter]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const toggleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user) return;

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
    } else {
      await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: userId,
      });
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, isFollowing: !isFollowing } : u
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />

      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Discover Users</h1>
          <Select value={filter} onValueChange={(value: 'suggested' | 'all') => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suggested">Suggested for You</SelectItem>
              <SelectItem value="all">All Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showFallbackMessage && filter === 'suggested' && users.length > 0 && (
          <Alert className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Follow more users so we can see your tastes and suggest people you might like.
            </AlertDescription>
          </Alert>
        )}

        {error ? (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-8 text-center">
            <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button
              onClick={() => fetchUsers()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : loadingUsers ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-md">
            <p className="text-muted-foreground mb-2">
              {filter === 'suggested'
                ? 'No suggested users right now'
                : 'No users to discover yet'}
            </p>
            {filter === 'suggested' && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                Try viewing all users or follow more people to get suggestions
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {users.map((userProfile) => (
              <DiscoverUserCard
                key={userProfile.id}
                user={userProfile}
                onToggleFollow={toggleFollow}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
