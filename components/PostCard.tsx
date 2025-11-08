'use client';

import { Post, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { memo } from 'react';
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
  user_has_thrown?: boolean;
};

type PostCardProps = {
  post: PostWithProfile;
  onThrow?: (post: PostWithProfile) => void;
  showToast?: boolean;
};

export const PostCard = memo(function PostCard({ post, onThrow, showToast = true }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!post.profiles) {
    return null;
  }

  const isThrown = post.thrown_by && post.thrown_by.length > 0;
  const thrower = isThrown ? post.thrown_by![0] : null;

  const visibleThrowMessages = post.throw_data?.filter(throwData => {
    const hasMessage = throwData.message && throwData.message.trim().length > 0;
    if (!hasMessage) return false;
    return throwData.is_public || throwData.thrower.id === user?.id || throwData.recipient_id === user?.id;
  }) || [];

  const handleThrowClick = () => {
    if (post.user_has_thrown) {
      if (showToast) {
        toast({
          description: "You've already thrown this post.",
          duration: 3000,
        });
      }
      return;
    }

    if (onThrow) {
      onThrow(post);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative w-full mb-8"
    >
      <div className="rounded-2xl overflow-hidden bg-card shadow-md transition-colors">
        {post.image_url && (
          <div className="relative">
            <img
              src={post.image_url}
              alt={post.caption || 'Post image'}
              className="w-full object-cover"
              loading="lazy"
            />

            {onThrow && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <motion.button
                  onClick={handleThrowClick}
                  whileTap={post.user_has_thrown ? {} : { scale: 0.95 }}
                  className={`p-3 rounded-full transition-all duration-300 ease-in-out min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    post.user_has_thrown
                      ? 'opacity-40 cursor-pointer text-neutral-500 dark:text-neutral-400'
                      : 'opacity-60 hover:opacity-100 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:shadow-[0_0_12px_rgba(255,255,255,0.6)] dark:hover:shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  }`}
                  aria-label="Throw to connection"
                  title={post.user_has_thrown ? "Already thrown" : "Throw this post"}
                >
                  <Send className="w-5 h-5" strokeWidth={1.5} />
                </motion.button>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/users/${post.profiles.id}`}
              className="font-semibold text-primary hover:text-primary/80 transition-colors duration-200 ease-in-out min-h-[40px] flex items-center"
            >
              {post.profiles.name}
            </Link>

            {isThrown && thrower && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-muted-foreground">
                  Thrown by{' '}
                  <Link
                    href={`/users/${thrower.id}`}
                    className="hover:underline transition-colors duration-200 ease-in-out"
                  >
                    {thrower.name}
                  </Link>
                </span>
              </>
            )}
          </div>

          {post.caption && (
            <p className="text-sm text-foreground/80 leading-snug">
              {post.caption}
            </p>
          )}
        </div>
      </div>

      {visibleThrowMessages.length > 0 && (
        <div className="mt-4 space-y-3 pl-3">
          {visibleThrowMessages.map((throwData, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative chat-bubble-tail bg-white dark:bg-neutral-800 border border-primary/20 dark:border-primary/30 rounded-xl px-4 py-3 shadow-md backdrop-blur-sm"
            >
              <Link
                href={`/users/${throwData.thrower.id}`}
                className="block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 hover:text-primary transition-colors duration-200 ease-in-out mb-1.5"
              >
                {throwData.thrower.name}
                {!throwData.is_public && (
                  <span className="ml-2 normal-case lowercase text-neutral-400/70 dark:text-neutral-500/70">(private)</span>
                )}
              </Link>
              <p className="text-sm text-foreground dark:text-neutral-100 italic leading-relaxed">
                {throwData.message}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.article>
  );
});
