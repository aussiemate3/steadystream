'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Profile, Post, supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FollowButton } from '@/components/FollowButton';
import { ConnectionsDialog } from '@/components/ConnectionsDialog';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

export default function UserProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [mutualFollowersCount, setMutualFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (user && userId === user.id) {
      router.push('/profile');
      return;
    }

    if (user && userId) {
      logEvent('profile_view', { profile_id: userId });
    }

    if (userId) {
      fetchUserData();
    }
  }, [userId, user]);

  const fetchUserData = async () => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profileData) {
      router.push('/feed');
      return;
    }

    setProfile(profileData);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (postsData) {
      setPosts(postsData);
    }

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(*)')
      .eq('follower_id', userId);

    const { data: followersData } = await supabase
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(*)')
      .eq('following_id', userId);

    if (followingData) {
      setFollowing(followingData.map((f: any) => f.profiles));
    }

    if (followersData) {
      setFollowers(followersData.map((f: any) => f.profiles));
    }

    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      setIsFollowing(!!followData);

      const { data: mutualData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', user.id)
        .maybeSingle();

      setIsMutual(!!followData && !!mutualData);

      const { data: myFollowingIds } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const myFollowingSet = new Set(myFollowingIds?.map((f) => f.following_id) || []);

      const mutualCount = followersData?.filter((f: any) =>
        myFollowingSet.has(f.follower_id)
      ).length || 0;

      setMutualFollowersCount(mutualCount);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/feed">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-2xl p-4 mb-6 shadow-md transition-colors">
          <div className="flex items-start gap-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <Camera className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold dark:text-neutral-100">{profile.name}</h1>
              </div>
              {profile.bio && <p className="text-neutral-600 dark:text-neutral-300 mb-4">{profile.bio}</p>}
              {mutualFollowersCount > 0 && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  {mutualFollowersCount} mutual {mutualFollowersCount === 1 ? 'follower' : 'followers'}
                </p>
              )}
              {user && (
                <FollowButton
                  currentUserId={user.id}
                  targetUserId={userId}
                  targetUserName={profile.name}
                  initialIsFollowing={isFollowing}
                  initialIsMutual={isMutual}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card className="p-12 text-center dark:bg-neutral-900 dark:border-neutral-800">
              <EmptyState message="No posts yet" />
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedPost(post)}
                >
                  <Image
                    src={post.image_url}
                    alt={post.caption || 'Post'}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/90 dark:bg-black/90 backdrop-blur-sm border-0 transition-opacity duration-300 ease-in-out">
          {selectedPost && (
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-full flex items-center justify-center">
                <img
                  src={selectedPost.image_url}
                  alt={selectedPost.caption || 'Post'}
                  className="object-contain w-full max-h-[90vh] rounded-lg"
                />
              </div>
              {selectedPost.caption && (
                <p className="text-neutral-300 dark:text-neutral-300 text-sm mt-4 text-center max-w-2xl">
                  {selectedPost.caption}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
