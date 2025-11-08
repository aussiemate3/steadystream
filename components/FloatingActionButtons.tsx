'use client';

import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export function FloatingActionButtons() {
  const router = useRouter();

  return (
    <>
      <motion.button
        onClick={() => router.push('/users')}
        whileHover={{ scale: 1.05 }}
        className="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-full w-14 h-14 flex items-center justify-center fixed bottom-24 right-6 shadow-md z-40 transition-colors"
        aria-label="Discover Users"
      >
        <Search className="w-5 h-5" strokeWidth={2} />
      </motion.button>

      <motion.button
        onClick={() => router.push('/post/create')}
        whileHover={{ scale: 1.05 }}
        animate={{
          scale: [1, 1.05, 1],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="bg-teal-500 dark:bg-teal-600 text-white rounded-full w-14 h-14 flex items-center justify-center fixed bottom-6 right-6 shadow-lg z-50 transition-colors"
        aria-label="Create New Post"
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </motion.button>
    </>
  );
}
