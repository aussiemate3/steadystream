'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase, Post, Profile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Camera, Edit, Users, Ticket, Copy, Check, LogOut, Trash2, Settings } from 'lucide-react';
import { useConfirmation } from '@/hooks/useConfirmation';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { confirm } = useConfirmation();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [thrownPosts, setThrownPosts] = useState<Post[]>([]);
  const [receivedPosts, setReceivedPosts] = useState<Post[]>([]);
  const [loadingThrows, setLoadingThrows] = useState(true);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>('following');
  const [connectionsDialogOpen, setConnectionsDialogOpen] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteSummary, setInviteSummary] = useState<{ total_invites: number; available_invites: number } | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchConnections();
      fetchMutualFollowers();
      fetchInvites();
      fetchThrows();
    }
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoadingPosts(false);
  };

  const fetchConnections = async () => {
    if (!user) return;

    const cacheKey = `connections_${user.id}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        const { following: cachedFollowing, followers: cachedFollowers } = JSON.parse(cached);
        setFollowing(cachedFollowing);
        setFollowers(cachedFollowers);
        return;
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(*)')
      .eq('follower_id', user.id);

    const { data: followersData } = await supabase
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(*)')
      .eq('following_id', user.id);

    if (followingData) {
      const followingProfiles = followingData.map((f: any) => f.profiles);
      setFollowing(followingProfiles);

      if (followersData) {
        const followersProfiles = followersData.map((f: any) => f.profiles);
        setFollowers(followersProfiles);

        sessionStorage.setItem(cacheKey, JSON.stringify({
          following: followingProfiles,
          followers: followersProfiles
        }));
      }
    } else if (followersData) {
      setFollowers(followersData.map((f: any) => f.profiles));
    }
  };

  const fetchMutualFollowers = async () => {
    if (!user) return;

    const { data: myFollowingIds } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (!myFollowingIds || myFollowingIds.length === 0) {
      return;
    }

    const followingIdsList = myFollowingIds.map(f => f.following_id);

    const { data: mutualData } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey(*)
      `)
      .eq('following_id', user.id)
      .in('follower_id', followingIdsList);

    if (mutualData && mutualData.length > 0) {
      setMutualFollowers(mutualData.map((m: any) => m.profiles));
    }
  };

  const invalidateConnectionsCache = () => {
    if (!user) return;
    sessionStorage.removeItem(`connections_${user.id}`);
  };

  const fetchThrows = async () => {
    if (!user) return;

    setLoadingThrows(true);

    const { data: thrownData } = await supabase
      .from('throws')
      .select('post_id, posts(*, profiles(*))')
      .eq('thrower_id', user.id)
      .order('created_at', { ascending: false });

    const { data: receivedData } = await supabase
      .from('throws')
      .select('post_id, posts(*, profiles(*))')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (thrownData) {
      setThrownPosts(thrownData.map((t: any) => t.posts).filter(Boolean));
    }

    if (receivedData) {
      setReceivedPosts(receivedData.map((t: any) => t.posts).filter(Boolean));
    }

    setLoadingThrows(false);
  };

  const fetchInvites = async () => {
    if (!user) return;

    const { data: invitesData } = await supabase
      .from('invites')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    const { data: summaryData } = await supabase
      .from('user_invite_summary')
      .select('*')
      .eq('created_by', user.id)
      .maybeSingle();

    if (invitesData) {
      setInvites(invitesData);
    }

    if (summaryData) {
      setInviteSummary(summaryData);
    }
  };

  const generateInvite = async () => {
    if (!user) return;

    setGeneratingInvite(true);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { error } = await supabase.from('invites').insert({
      code,
      created_by: user.id,
      max_uses: 5,
      active: true,
    });

    if (!error) {
      await fetchInvites();
    }

    setGeneratingInvite(false);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/auth/login');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: 'Delete Account',
      description: 'Account deletion is not yet available in this version.',
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
    });

    if (confirmed) {
      toast({
        title: 'Account deletion request acknowledged.',
        variant: 'info',
      });
    } else {
      toast({
        title: 'Deletion cancelled.',
        variant: 'info',
      });
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl p-4 mb-6 shadow-md transition-colors relative">
          <div className="flex items-start gap-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.name} fill className="object-cover" />
              ) : (
                <Camera className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2 dark:text-neutral-100">{profile.name}</h1>
              {mutualFollowers.length > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-xs text-neutral-500 dark:text-neutral-400 italic mb-3"
                >
                  Mutual followers: {mutualFollowers.slice(0, 3).map(m => m.name).join(', ')}
                  {mutualFollowers.length > 3 && ` +${mutualFollowers.length - 3} more`}
                </motion.p>
              )}
              {profile.bio && (
                <p className="text-foreground/80 mb-4">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4 flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/profile/settings">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/profile/edit">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit profile</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 mb-6 shadow-md transition-colors">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'following' | 'followers')}>
            <TabsList className="grid w-full grid-cols-2 bg-neutral-100 dark:bg-neutral-800">
              <TabsTrigger
                value="following"
                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all duration-200"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="followers"
                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all duration-200"
              >
                Followers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="following" className="mt-4">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {following.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                    Not following anyone yet
                  </p>
                ) : (
                  following.map((user) => (
                    <Link href={`/users/${user.id}`} key={user.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Camera className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate dark:text-neutral-100">{user.name}</p>
                          {user.bio && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="followers" className="mt-4">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {followers.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                    No followers yet
                  </p>
                ) : (
                  followers.map((user) => (
                    <Link href={`/users/${user.id}`} key={user.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Camera className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate dark:text-neutral-100">{user.name}</p>
                          {user.bio && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-300 mb-4">Your Posts</h2>
            {loadingPosts ? (
              <p className="text-center text-muted-foreground py-8">Loading posts...</p>
            ) : posts.length === 0 ? (
              <Card className="p-12 text-center dark:bg-neutral-900 dark:border-neutral-800">
                <EmptyState message="No posts yet" />
                <Link href="/post/create">
                  <Button>Create your first post</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800 cursor-pointer active:opacity-80 transition-opacity"
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

          <div>
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-300 mb-4">Thrown Posts</h2>
            {loadingThrows ? (
              <LoadingState />
            ) : thrownPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No thrown posts yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {thrownPosts.map((post) => (
                  <div
                    key={post.id}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800 cursor-pointer active:opacity-80 transition-opacity"
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

          <div>
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-300 mb-4">Received Throws</h2>
            {loadingThrows ? (
              <LoadingState />
            ) : receivedPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No received throws yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {receivedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800 cursor-pointer active:opacity-80 transition-opacity"
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

        <div className="bg-card rounded-2xl p-4 mt-8 shadow-md transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Invite Codes</h2>
            </div>
            <Button onClick={generateInvite} disabled={generatingInvite} size="sm" variant="outline">
              {generatingInvite ? 'Generating...' : 'Generate Invite'}
            </Button>
          </div>

          {inviteSummary && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Total</p>
                <p className="text-xl font-semibold dark:text-neutral-100">{inviteSummary.total_invites || 0}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Available</p>
                <p className="text-xl font-semibold dark:text-neutral-100">{inviteSummary.available_invites || 0}</p>
              </div>
            </div>
          )}

          {invites.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">
              No invite codes yet
            </p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium dark:text-neutral-200">{invite.code}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {invite.used_count} / {invite.max_uses} uses
                      {!invite.active && ' · Inactive'}
                      {invite.expires_at && new Date(invite.expires_at) < new Date() && ' · Expired'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(invite.code)}
                    disabled={!invite.active || invite.used_count >= invite.max_uses}
                  >
                    {copiedCode === invite.code ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl p-4 mt-6 shadow-md transition-colors">
          <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-4">Account</h3>
          <Separator className="mb-6 bg-neutral-200 dark:bg-neutral-700" />
          <div className="space-y-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign out of SteadyStream</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-800 transition-colors"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Permanently delete your account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <Dialog open={connectionsDialogOpen} onOpenChange={setConnectionsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Connections</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="following" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="following">
                Following ({following.length})
              </TabsTrigger>
              <TabsTrigger value="followers">
                Followers ({followers.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="following" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-2">
                {following.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                    Not following anyone yet
                  </p>
                ) : (
                  following.map((user) => (
                    <Link href={`/users/${user.id}`} key={user.id}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Camera className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate dark:text-neutral-100">{user.name}</p>
                          {user.bio && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="followers" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-2">
                {followers.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                    No followers yet
                  </p>
                ) : (
                  followers.map((user) => (
                    <Link href={`/users/${user.id}`} key={user.id}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Camera className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate dark:text-neutral-100">{user.name}</p>
                          {user.bio && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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
