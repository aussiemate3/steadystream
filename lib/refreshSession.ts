import { SupabaseClient } from '@supabase/supabase-js';

const FIFTEEN_MIN = 15 * 60 * 1000;

export function startSessionRefresher(supabase: SupabaseClient) {
  const intervalId = setInterval(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error checking session:', error);
        return;
      }

      if (!data?.session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('Error refreshing session:', refreshError);
        } else if (refreshData?.session) {
          console.log('🔄 Session refreshed successfully');
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, FIFTEEN_MIN);

  return () => clearInterval(intervalId);
}
