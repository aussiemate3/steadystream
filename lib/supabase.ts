import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string;
  invite_code: string | null;
  throw_privacy: 'mutuals_only' | 'followers' | 'following' | 'off';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  profiles?: Profile;
};

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type Throw = {
  id: string;
  post_id: string;
  thrower_id: string;
  recipient_id: string;
  message?: string | null;
  is_public?: boolean;
  created_at: string;
};

export type PostWithThrow = Post & {
  thrown_by?: Profile;
  throw_id?: string;
};
