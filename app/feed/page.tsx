'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, Post, Profile, PostWithThrow } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/PostCard';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

type ThrowData = {
  thrower: Profile;
  recipient_id?: string;
  message?: string | null;
  is_public?: boolean;
};

type PostWithProfile = Post & {
  profiles: Profile;
  thrown_by?: Profile[];
  throw_data?: ThrowData[];
  throw_id?: string;
  user_has_thrown?: boolean;
};

export default function FeedPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const initialLoadRef = useRef(false);
  const [throwDialogOpen, setThrowDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithProfile | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Profile[]>([]);
  const [throwing, setThrowing] = useState(false);
  const [throwMessage, setThrowMessage] = useState('');
  const [isPublicMessage, setIsPublicMessage] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPosts = useCallback(async (options?: { reset?: boolean; force?: boolean } | boolean) => {
    let reset = false;
    let force = false;
    if (typeof options === 'boolean') reset = options;
    else if (options) ({ reset = false, force = false } = options);

    if (!user) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    if (reset) setPosts([]);

    const startTime = Date.now();

    try {
      setLoadingPosts(true);
      if (force) toast({ description: 'Refreshing feed…', duration: 2000 });

      const { data: followsData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followError) throw followError;

      const followingIds = followsData?.map(f => f.following_id) || [];
      const userIds = [...followingIds, user.id];

      const { data: regularPosts, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles:user_id(*)')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const { data: thrownToMe, error: throwsToMeError } = await supabase
        .from('throws')
        .select(`
          id,
          created_at,
          message,
          is_public,
          posts:post_id (
            id,
            user_id,
            image_url,
            caption,
            created_at,
            profiles:user_id (*)
          ),
          thrower:thrower_id (*)
        `)
        .eq('recipient_id', user.id);

      if (throwsToMeError) {
        console.error('[Feed] Error fetching thrown posts to me:', throwsToMeError);
      }

      const { data: publicThrows, error: publicThrowsError } = await supabase
        .from('throws')
        .select(`
          id,
          created_at,
          message,
          is_public,
          posts:post_id (
            id,
            user_id,
            image_url,
            caption,
            created_at,
            profiles:user_id (*)
          ),
          thrower:thrower_id (*)
        `)
        .eq('is_public', true)
        .in('post_owner_id', userIds);

      if (publicThrowsError) {
        console.error('[Feed] Error fetching public throws:', publicThrowsError);
      }

      const allThrows = [
        ...(thrownToMe || []),
        ...(publicThrows || [])
      ];

      const uniqueThrowsMap = new Map();
      allThrows.forEach((t: any) => {
        if (!uniqueThrowsMap.has(t.id)) {
          uniqueThrowsMap.set(t.id, t);
        }
      });
      const thrownPosts = Array.from(uniqueThrowsMap.values());

      const postMap = new Map<string, PostWithProfile>();

      if (regularPosts && regularPosts.length > 0) {
        for (const post of regularPosts as PostWithProfile[]) {
          if (post.profiles) {
            postMap.set(post.id, post);
          }
        }
      }

      if (thrownPosts && thrownPosts.length > 0) {
        const formattedThrows = thrownPosts
          .filter((t: any) => t.posts && t.posts.profiles)
          .map((t: any) => ({
            ...t.posts,
            thrown_by: [t.thrower],
            throw_data: [{
              thrower: t.thrower,
              recipient_id: user.id,
              message: t.message,
              is_public: t.is_public,
            }],
            throw_id: t.id,
          })) as PostWithProfile[];

        for (const thrownPost of formattedThrows) {
          const existingPost = postMap.get(thrownPost.id);
          if (existingPost && existingPost.thrown_by) {
            const existingThrowerIds = new Set(existingPost.thrown_by.map(t => t.id));
            const newThrowers = thrownPost.thrown_by!.filter(t => !existingThrowerIds.has(t.id));
            existingPost.thrown_by.push(...newThrowers);

            if (!existingPost.throw_data) {
              existingPost.throw_data = [];
            }
            if (thrownPost.throw_data) {
              existingPost.throw_data.push(...thrownPost.throw_data);
            }
          } else {
            postMap.set(thrownPost.id, thrownPost);
          }
        }
      }

      const allPosts = Array.from(postMap.values());
      allPosts.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (!isMountedRef.current) return;

      if (allPosts && allPosts.length > 0) {
        const postIds = allPosts.map(p => p.id);
        const { data: userThrows } = await supabase
          .from('throws')
          .select('post_id')
          .eq('thrower_id', user.id)
          .in('post_id', postIds);

        const thrownPostIds = new Set(userThrows?.map(t => t.post_id) || []);
        allPosts.forEach(post => {
          post.user_has_thrown = thrownPostIds.has(post.id);
        });

        setPosts(allPosts);
      } else {
        setPosts(allPosts);
      }

      const loadDuration = Date.now() - startTime;
      if (loadDuration > 2000) {
        logEvent('slow_feed_load', { duration_ms: loadDuration });
      }
    } catch (err) {
      console.error('Feed refresh error:', err);
    } finally {
      setLoadingPosts(false);
      fetchingRef.current = false;
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !initialLoadRef.current) {
      console.log('[Feed] User changed, fetching posts');
      initialLoadRef.current = true;
      fetchPosts({ reset: true });
      logEvent('feed_view');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let hasLogged80 = false;

    const handleScroll = () => {
      const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;

      if (scrollPercent >= 80 && !hasLogged80) {
        hasLogged80 = true;
        logEvent('feed_scroll_depth', { depth_percent: 80 });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('throws_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'throws', filter: `recipient_id=eq.${user.id}` },
        () => {
          console.log('[Feed] New throw received, refreshing');
          if (!fetchingRef.current) {
            fetchPosts({ reset: true, force: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleFocus = async () => {
      console.log('[Feed] Refetching feed on focus...');
      await fetchPosts({ reset: false, force: true });
    };

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Feed] Refetching feed on visibility...');
        await fetchPosts({ reset: false, force: true });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  const handleThrowClick = async (post: PostWithProfile) => {
    setSelectedPost(post);
    setSelectedRecipient(null);
    setThrowMessage('');
    setIsPublicMessage(false);

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user!.id);

    const followingIds = followingData?.map((f) => f.following_id) || [];

    if (followingIds.length === 0) {
      setFollowedUsers([]);
      setThrowDialogOpen(true);
      return;
    }

    const { data: mutualFollowsData } = await supabase
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(*)')
      .eq('following_id', user!.id)
      .in('follower_id', followingIds);

    if (mutualFollowsData) {
      const users = mutualFollowsData.map((f: any) => f.profiles);
      setFollowedUsers(users);
    }

    setThrowDialogOpen(true);
  };

  const handleSelectRecipient = (recipientId: string) => {
    setSelectedRecipient(recipientId);
  };

  const handleSendThrow = async () => {
    if (!selectedPost || !user || !selectedRecipient) return;

    setThrowing(true);
    const recipientName = followedUsers.find(u => u.id === selectedRecipient)?.name || 'them';

    const { data: existingThrow } = await supabase
      .from('throws')
      .select('id')
      .eq('post_id', selectedPost.id)
      .eq('thrower_id', user.id)
      .eq('recipient_id', selectedRecipient)
      .maybeSingle();

    if (existingThrow) {
      toast({
        description: `You've already shared this post with ${recipientName}.`,
        duration: 3000,
      });
      setThrowDialogOpen(false);
      setThrowing(false);
      return;
    }

    const trimmedMessage = throwMessage.trim();
    const { error } = await supabase.from('throws').insert({
      post_id: selectedPost.id,
      thrower_id: user.id,
      recipient_id: selectedRecipient,
      post_owner_id: selectedPost.user_id,
      message: trimmedMessage || null,
      is_public: trimmedMessage ? isPublicMessage : false,
    });

    if (error) {
      if (error.code === '23505') {
        toast({
          description: `You've already shared this post with ${recipientName}.`,
          duration: 3000,
        });
      } else {
        toast({
          description: 'Failed to share post. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
      setThrowing(false);
      return;
    }

    if (trimmedMessage) {
      logEvent('throw_with_message', { post_id: selectedPost.id, recipient_id: selectedRecipient });
    } else {
      logEvent('throw', { post_id: selectedPost.id, recipient_id: selectedRecipient });
    }

    // Update the post state immediately to show the badge
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === selectedPost.id
          ? { ...p, user_has_thrown: true }
          : p
      )
    );

    setThrowDialogOpen(false);
    setSelectedPost(null);
    setSelectedRecipient(null);
    setThrowMessage('');
    setIsPublicMessage(false);

    const messageType = trimmedMessage
      ? (isPublicMessage ? 'a public message' : 'a private message')
      : '';

    toast({
      description: (
        <span className="flex items-center gap-2">
          <span className="text-lg">👋</span>
          {trimmedMessage
            ? `You threw this post with ${messageType} to ${recipientName}`
            : `Sent quietly to ${recipientName}`
          }
        </span>
      ),
      duration: 3000,
    });
    setThrowing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f5] dark:bg-neutral-950">
      <Header />

      <main className="max-w-4xl mx-auto px-8 py-12">
        {loadingPosts ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading feed...</p>
          </div>
        ) : error ? (
          <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-2xl shadow-md p-12 text-center">
            <h3 className="font-semibold mb-3 tracking-tight">Error Loading Feed</h3>
            <p className="text-foreground/80 text-sm mb-6">{error}</p>
            <Button onClick={() => fetchPosts({ reset: true })} variant="outline" className="tracking-wider">
              Try Again
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-2xl shadow-md p-16 text-center">
            <p className="text-muted-foreground mb-8 text-lg">
              You're all caught up. No noise today.
            </p>
            <div className="flex flex-col gap-4 items-center">
              <Link href="/post/create">
                <Button className="tracking-wider">Create your first post</Button>
              </Link>
              <Link href="/users">
                <Button variant="outline" className="tracking-wider">Discover people</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.throw_id || post.id}
                  post={post}
                  onThrow={handleThrowClick}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <Dialog open={throwDialogOpen} onOpenChange={setThrowDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRecipient ? 'Add a message' : 'Throw to a mutual connection'}
            </DialogTitle>
          </DialogHeader>

          {!selectedRecipient ? (
            <div className="space-y-2">
              {followedUsers.length === 0 ? (
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    No mutual connections yet
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    You can only throw to people who follow you back
                  </p>
                </div>
              ) : (
                followedUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectRecipient(user.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <p className="font-medium dark:text-neutral-100">{user.name}</p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Sending to:</p>
                <p className="font-medium dark:text-neutral-100">
                  {followedUsers.find(u => u.id === selectedRecipient)?.name}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="throw-message" className="text-sm text-neutral-700 dark:text-neutral-300">
                  Add an optional message (max 200 chars)
                </Label>
                <Textarea
                  id="throw-message"
                  placeholder="Say something about this post..."
                  value={throwMessage}
                  onChange={(e) => setThrowMessage(e.target.value.slice(0, 200))}
                  maxLength={200}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-right">
                  {throwMessage.length}/200
                </p>
              </div>

              {throwMessage.trim() && (
                <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <Label htmlFor="public-toggle" className="text-sm cursor-pointer dark:text-neutral-200">
                    Make message visible to everyone who can see this post
                  </Label>
                  <Switch
                    id="public-toggle"
                    checked={isPublicMessage}
                    onCheckedChange={setIsPublicMessage}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRecipient(null);
                    setThrowMessage('');
                    setIsPublicMessage(false);
                  }}
                  disabled={throwing}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSendThrow}
                  disabled={throwing}
                  className="flex-1"
                >
                  {throwing ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
