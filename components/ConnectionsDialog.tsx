'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Camera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Profile } from '@/lib/supabase';

interface ConnectionsDialogProps {
  following: Profile[];
  followers: Profile[];
  followingCount: number;
  followersCount: number;
}

export function ConnectionsDialog({
  following,
  followers,
  followingCount,
  followersCount,
}: ConnectionsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          <Users className="w-4 h-4" />
          {followingCount} following · {followersCount} followers
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="following" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="following">Following ({followingCount})</TabsTrigger>
            <TabsTrigger value="followers">Followers ({followersCount})</TabsTrigger>
          </TabsList>
          <TabsContent value="following" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-2">
              {following.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                  Not following anyone yet
                </p>
              ) : (
                following.map((user) => (
                  <Link href={`/users/${user.id}`} key={user.id} onClick={() => setOpen(false)}>
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
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{user.bio}</p>
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
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">No followers yet</p>
              ) : (
                followers.map((user) => (
                  <Link href={`/users/${user.id}`} key={user.id} onClick={() => setOpen(false)}>
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
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{user.bio}</p>
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
  );
}
