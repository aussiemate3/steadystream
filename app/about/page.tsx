'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href={user ? '/feed' : '/'}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-md space-y-6">
          <div>
            <h1 className="mb-2">SteadyStream</h1>
            <p className="text-lg text-muted-foreground">
              A calm, chronological, ad-free social network
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-2xl font-semibold mb-4">Feel Better, Not Busier</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              At SteadyStream, we believe social technology should make you feel better, not just keep you busy.
              We don't optimize for engagement. We don't use algorithms to keep you scrolling.
              We don't send notifications designed to create anxiety.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Instead, we built a space where you can share moments with people you care about,
              see posts in simple chronological order, and leave feeling calm rather than drained.
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-xl font-semibold mb-3">Our Principles</h3>
            <ul className="space-y-3 text-foreground/80">
              <li className="flex gap-3">
                <span className="text-lg flex-shrink-0">🧘</span>
                <span>
                  <strong className="text-foreground">Calm by design</strong> — No infinite scroll,
                  no anxiety-inducing notifications, no FOMO mechanics
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-lg flex-shrink-0">⏱️</span>
                <span>
                  <strong className="text-foreground">Respect your time</strong> — Chronological feed
                  means you know when you're caught up
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-lg flex-shrink-0">🤝</span>
                <span>
                  <strong className="text-foreground">Real connections</strong> — Share posts with
                  specific friends through "throws," not broadcast to everyone
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-lg flex-shrink-0">🛡️</span>
                <span>
                  <strong className="text-foreground">Privacy first</strong> — No ads, no tracking,
                  no selling your data
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-lg flex-shrink-0">🎯</span>
                <span>
                  <strong className="text-foreground">Intentional use</strong> — Every feature passes
                  the test: does it help you feel better, or just use it more?
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-xl font-semibold mb-3">Why "SteadyStream"?</h3>
            <p className="text-foreground/80 leading-relaxed">
              Because your feed should flow steadily and predictably, like a gentle stream.
              Not like a fire hose. Not like a slot machine. Just a calm, chronological
              flow of moments from people you chose to follow.
            </p>
          </div>

          <div className="border-t border-border pt-6 bg-accent/20 -mx-4 -mb-4 px-4 py-6 rounded-b-2xl">
            <p className="text-sm text-muted-foreground text-center italic">
              "Social media that makes you feel better, not busier."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
