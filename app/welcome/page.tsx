'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/feed');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <motion.div
        className="max-w-3xl mx-auto px-6 py-16 text-center space-y-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.h1
          className="text-4xl font-bold text-neutral-900"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Made for slow sharing.
        </motion.h1>

        <motion.p
          className="text-lg text-neutral-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          At SteadyStream, we want you to feel better, not busier.
        </motion.p>

        <motion.p
          className="text-neutral-700 leading-relaxed max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          We believe connection should feel calm, not competitive. So we built
          SteadyStream to be the quiet corner of the internet — a place for
          genuine moments, shared gently.
        </motion.p>

        <motion.div
          className="grid md:grid-cols-3 gap-6 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div className="bg-white rounded-xl shadow-sm p-6 border border-neutral-100">
            <h2 className="text-lg font-semibold mb-2">💬 Connection</h2>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Share with people who matter — not everyone at once.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-neutral-100">
            <h2 className="text-lg font-semibold mb-2">🎨 Expression</h2>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Post without pressure. No likes. No noise.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-neutral-100">
            <h2 className="text-lg font-semibold mb-2">🌿 Reflection</h2>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Step back, scroll slow, and feel present again.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="text-neutral-700 leading-relaxed max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
        >
          <p>
            <strong>Design ethos:</strong> Chronological feed. Mutual circles only.
            Throws instead of likes. No badges, no buzzers — quiet design, clear
            mind.
          </p>
        </motion.div>

        <motion.p
          className="text-neutral-600 italic text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          SteadyStream is a social space for a slower internet. Where sharing
          feels human again.
        </motion.p>

        <motion.div
          className="flex gap-4 justify-center pt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          <Link href="/auth/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline">Sign In</Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
