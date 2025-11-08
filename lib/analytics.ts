import { supabase } from './supabase';

const isAnalyticsEnabled = () => {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
};

export const logEvent = (eventName: string, metadata?: Record<string, any>) => {
  if (!isAnalyticsEnabled()) {
    return;
  }

  supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
    if (authError || !user) {
      return;
    }

    supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_name: eventName,
        metadata: metadata || {},
      })
      .then(({ error }) => {
        if (error) {
          console.warn('Analytics event failed:', eventName, error);
        }
      });
  });
};

let sessionStartTime: number | null = null;

export const startSession = () => {
  sessionStartTime = Date.now();
  logEvent('session_start');
};

export const endSession = () => {
  if (sessionStartTime) {
    const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    logEvent('session_end', { duration_seconds: durationSeconds });
    sessionStartTime = null;
  }
};
