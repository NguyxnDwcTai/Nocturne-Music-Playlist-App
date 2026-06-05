import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import FloatingNav from '../components/FloatingNav.tsx';
import MusicPlayerWorkbench from '../components/MusicPlayerWorkbench.tsx';
import BentoFeatures from '../components/BentoFeatures.tsx';
import BetaSubscribe from '../components/BetaSubscribe.tsx';
import FooterStatement from '../components/FooterStatement.tsx';
import NeatBackground from '../components/NeatBackground.tsx';
import { ArrowDown } from '@phosphor-icons/react';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logoWallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP entrance animation for hero elements
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
      
      tl.fromTo(headlineRef.current, 
        { opacity: 0, y: 30 }, 
        { opacity: 1, y: 0, delay: 0.2 }
      )
      .fromTo(subtextRef.current, 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0 }, 
        '-=0.5'
      )
      .fromTo(ctaRef.current, 
        { opacity: 0, y: 15 }, 
        { opacity: 1, y: 0 }, 
        '-=0.5'
      )
      .fromTo(logoWallRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 1.2 }, 
        '-=0.3'
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div ref={heroRef} id="hero" className="relative w-full min-h-[100dvh] flex flex-col justify-between">
      
      {/* Neat animated gradient background */}
      <NeatBackground />

      {/* Floating navigation bar */}
      <FloatingNav 
        onCtaClick={() => handleScrollToSection('player')}
        onSectionScroll={handleScrollToSection}
      />

      {/* Hero Section - Capped padding and restricted word counts */}
      <main className="flex-1 flex flex-col justify-center items-center pt-24 pb-12 px-4 text-center max-w-4xl mx-auto">
        <div className="space-y-6">
          <h1 
            ref={headlineRef}
            className="font-display font-bold text-[36px] sm:text-[54px] md:text-[68px] leading-[1.05] tracking-tighter text-ink"
          >
            Curate your soundscapes.<br />Shape the night.
          </h1>
          
          <p 
            ref={subtextRef}
            className="font-body text-[14px] sm:text-[16px] text-neutral max-w-[50ch] mx-auto leading-relaxed"
          >
            A collaborative workspace built to capture late-night audio, build synchronized queues, and shape playlist vibes.
          </p>

          <div ref={ctaRef} className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => handleScrollToSection('player')}
              className="px-6 py-3 text-[13.5px] font-semibold tracking-wide bg-paper-2 hover:bg-paper-3 border border-rule hover:border-neutral/40 text-ink rounded-full cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
            >
              Demo Player <ArrowDown size={14} weight="bold" />
            </button>
            <a 
              href="/api/auth/login"
              className="px-6 py-3 text-[13.5px] font-semibold tracking-wide bg-accent hover:bg-accent-hover active:bg-accent-active text-paper rounded-full cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2 decoration-none"
            >
              Connect with Spotify
            </a>
          </div>
        </div>
      </main>

      {/* Logo wall (Social proof) - Bounded underneath the hero */}
      <div 
        ref={logoWallRef}
        className="w-full border-t border-b border-rule/50 bg-paper/20 backdrop-blur-sm py-6"
      >
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-45 hover:opacity-60 transition-opacity duration-300">
          <img src="https://cdn.simpleicons.org/spotify/8b8a95" alt="Spotify" className="h-5 object-contain" />
          <img src="https://cdn.simpleicons.org/soundcloud/8b8a95" alt="SoundCloud" className="h-5 object-contain" />
          <img src="https://cdn.simpleicons.org/bandcamp/8b8a95" alt="Bandcamp" className="h-5 object-contain" />
          <img src="https://cdn.simpleicons.org/applemusic/8b8a95" alt="Apple Music" className="h-5 object-contain" />
          <img src="https://cdn.simpleicons.org/vercel/8b8a95" alt="Vercel" className="h-5 object-contain" />
        </div>
      </div>

      {/* Interactive Music Player Section */}
      <section id="player" className="w-full py-20 px-4 bg-paper/10 border-b border-rule/30">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="font-display font-semibold text-[22px] sm:text-[28px] tracking-tight text-ink">
              The Workspace in Action
            </h2>
            <p className="text-[13px] text-neutral leading-relaxed">
              Toggle playback below. Swap moods to update artwork colors and tracks on the fly. Add your own tracks.
            </p>
          </div>
          
          <MusicPlayerWorkbench />
        </div>
      </section>

      {/* Bento features grid */}
      <BentoFeatures />

      {/* Invite form section */}
      <BetaSubscribe />

      {/* Statement Footer */}
      <FooterStatement />

    </div>
  );
}
