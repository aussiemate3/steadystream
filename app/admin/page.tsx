'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Users, Eye, Clock, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type AnalyticsEvent = {
  id: string;
  user_id: string;
  event_name: string;
  metadata: any;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
};

type UserStats = {
  total_users: number;
  new_users_today: number;
  new_users_week: number;
  active_users_today: number;
};

type EventStats = {
  event_name: string;
  count: number;
  avg_duration?: number;
};

type DailyMetric = {
  date: string;
  count: number;
};

type EngagementMetric = {
  event_name: string;
  total: number;
  dailyData: DailyMetric[];
};

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetric[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) {
      router.push('/feed');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (user && profile?.is_admin) {
      fetchAnalytics();
    }
  }, [user, profile, timeRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      default:
        return null;
    }
  };

  const fetchAnalytics = async () => {
    setLoadingData(true);

    try {
      const dateFilter = getDateFilter();
      let eventsQuery = supabase
        .from('analytics_events')
        .select('*, profiles(name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dateFilter) {
        eventsQuery = eventsQuery.gte('created_at', dateFilter);
      }

      const { data: eventsData, error: eventsError } = await eventsQuery;

      if (eventsError) {
        console.error('Error fetching analytics_events:', eventsError);
      }

      setEvents(eventsData || []);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at');

      if (profilesError) throw profilesError;

      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.setDate(now.getDate() - 7));

      const userStats: UserStats = {
        total_users: profilesData.length,
        new_users_today: profilesData.filter(
          (p) => new Date(p.created_at) >= today
        ).length,
        new_users_week: profilesData.filter(
          (p) => new Date(p.created_at) >= weekAgo
        ).length,
        active_users_today: 0,
      };

      const activeUsersQuery = supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: false })
        .gte('created_at', today.toISOString());

      const { data: activeData } = await activeUsersQuery;
      userStats.active_users_today = new Set(
        activeData?.map((a) => a.user_id)
      ).size;

      setUserStats(userStats);

      const eventTypeStats: { [key: string]: { count: number; durations: number[] } } = {};

      eventsData?.forEach((event) => {
        if (!eventTypeStats[event.event_name]) {
          eventTypeStats[event.event_name] = { count: 0, durations: [] };
        }
        eventTypeStats[event.event_name].count++;

        if (event.metadata?.duration) {
          eventTypeStats[event.event_name].durations.push(event.metadata.duration);
        }
      });

      const stats: EventStats[] = Object.entries(eventTypeStats).map(
        ([event_name, data]) => ({
          event_name,
          count: data.count,
          avg_duration:
            data.durations.length > 0
              ? Math.round(
                  data.durations.reduce((a, b) => a + b, 0) / data.durations.length
                )
              : undefined,
        })
      );

      setEventStats(stats.sort((a, b) => b.count - a.count));

      const keyEvents = ['feed_view', 'throw', 'throw_with_message', 'post_created', 'profile_view'];
      const engagementData: EngagementMetric[] = [];

      for (const eventName of keyEvents) {
        const { data: dailyData } = await supabase
          .from('analytics_events')
          .select('created_at')
          .eq('event_name', eventName)
          .gte('created_at', dateFilter || '2020-01-01');

        const dailyGroups: { [key: string]: number } = {};
        dailyData?.forEach((event) => {
          const date = new Date(event.created_at).toISOString().split('T')[0];
          dailyGroups[date] = (dailyGroups[date] || 0) + 1;
        });

        const dailyMetrics: DailyMetric[] = Object.entries(dailyGroups)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        engagementData.push({
          event_name: eventName,
          total: dailyData?.length || 0,
          dailyData: dailyMetrics,
        });
      }

      setEngagementMetrics(engagementData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <LoadingState />
      </div>
    );
  }

  if (!profile.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Analytics Dashboard</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Platform insights and user activity</p>
          </div>
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">Loading analytics...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-100">Total Users</p>
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {userStats?.total_users || 0}
                </p>
              </Card>

              <Card className="p-6 dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-100">New Today</p>
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {userStats?.new_users_today || 0}
                </p>
              </Card>

              <Card className="p-6 dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-100">New This Week</p>
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {userStats?.new_users_week || 0}
                </p>
              </Card>

              <Card className="p-6 dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Eye className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-100">Active Today</p>
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {userStats?.active_users_today || 0}
                </p>
              </Card>
            </div>

            <Card className="p-6 mb-8 dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-neutral-600 dark:text-neutral-100" />
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">User Engagement</h2>
              </div>

              {loadingData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {engagementMetrics.map((metric) => (
                    <div key={metric.event_name} className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-100 capitalize">
                          {metric.event_name.replace(/_/g, ' ')}
                        </p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{metric.total}</p>
                      </div>
                      <div className="h-24">
                        {metric.dailyData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metric.dailyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.15} />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#f5f5f5' }}
                                tickFormatter={(date) => new Date(date).getDate().toString()}
                              />
                              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1f2937',
                                  border: '1px solid #374151',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                }}
                                labelStyle={{ color: '#f3f4f6' }}
                                itemStyle={{ color: '#60a5fa' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-neutral-400 dark:text-neutral-100 text-xs">
                            No data
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Tabs defaultValue="events" className="space-y-6">
              <TabsList>
                <TabsTrigger value="events">Event Summary</TabsTrigger>
                <TabsTrigger value="recent">Recent Events</TabsTrigger>
              </TabsList>

              <TabsContent value="events" className="space-y-4">
                <Card className="p-6 dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart className="w-5 h-5 text-neutral-600 dark:text-neutral-100" />
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Event Statistics</h2>
                  </div>

                  {eventStats.length === 0 ? (
                    <p className="text-neutral-500 dark:text-neutral-100 text-center py-8">No events recorded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {eventStats.map((stat) => (
                        <div
                          key={stat.event_name}
                          className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                              {stat.event_name.replace(/_/g, ' ')}
                            </p>
                            {stat.avg_duration && (
                              <p className="text-sm text-neutral-500 dark:text-neutral-100 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                Avg: {stat.avg_duration}s
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stat.count}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-100">events</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="recent" className="space-y-4">
                <Card className="p-6 dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">Recent Activity</h2>

                  {events.length === 0 ? (
                    <p className="text-neutral-500 dark:text-neutral-100 text-center py-8">No events recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100 capitalize">
                                {event.event_name.replace(/_/g, ' ')}
                              </p>
                              <span className="text-xs text-neutral-400 dark:text-neutral-100">•</span>
                              <p className="text-sm text-neutral-600 dark:text-neutral-100">
                                {event.profiles?.name || 'Unknown User'}
                              </p>
                            </div>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-100 mt-1">
                                {JSON.stringify(event.metadata)}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 dark:text-neutral-100 whitespace-nowrap ml-4">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
