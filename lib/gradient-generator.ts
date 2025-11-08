export function generateGradient(name: string): string {
  const gradients = [
    'from-pink-400 via-rose-400 to-orange-400',
    'from-blue-400 via-cyan-400 to-teal-400',
    'from-purple-400 via-pink-400 to-red-400',
    'from-green-400 via-emerald-400 to-cyan-400',
    'from-yellow-400 via-orange-400 to-red-400',
    'from-indigo-400 via-purple-400 to-pink-400',
    'from-teal-400 via-green-400 to-lime-400',
    'from-red-400 via-pink-400 to-purple-400',
    'from-cyan-400 via-blue-400 to-indigo-400',
    'from-lime-400 via-yellow-400 to-orange-400',
    'from-fuchsia-400 via-purple-400 to-blue-400',
    'from-amber-400 via-orange-400 to-pink-400',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);

  if (words.length === 0) return '?';
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
