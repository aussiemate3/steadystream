import Link from 'next/link';

export function Footer() {
  return (
    <footer className="text-center text-neutral-500 dark:text-neutral-400 text-xs py-8 px-4">
      <p>
        SteadyStream - feel better, not busier.{' '}
        <Link href="/about" className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 underline transition-colors">
          About
        </Link>
      </p>
    </footer>
  );
}
