'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

const SPLASH_DURATION_MS = 1800;
const SPLASH_FADE_MS = 500;

function SplashScreen({ visible, animateIn }: { visible: boolean; animateIn: boolean }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!animateIn) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [animateIn]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1f2937] transition-opacity ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ transitionDuration: `${SPLASH_FADE_MS}ms` }}
    >
      <div className={`flex flex-col items-center transition-all duration-700 ease-out ${entered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <p className="text-white/75 text-sm tracking-wide">What's your Letterboxd?</p>
      </div>
    </div>
  );
}

function MobileProfileCard({ posters, className }: { posters: string[][]; className: string }) {
  return (
    <div className={`absolute bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border-[5px] border-white ${className}`}>
      <div className="grid grid-cols-2 gap-1.5 p-2 h-full">
        {posters.map(([src, alt]) => (
          <div key={alt} className="rounded-lg overflow-hidden">
            <img src={src} alt={alt} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-12 h-12 rounded-full border-[3px] border-white overflow-hidden shrink-0" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)' }}>
            <img src="/images/khalil.jpg" alt="Khalil Ramos" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-bold text-base leading-tight truncate" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)' }}>Khalil Ramos</h3>
            <p className="text-white/80 text-xs" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.6)' }}>1.5 km away</p>
          </div>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileHero() {
  return (
    <div className="lg:hidden relative w-full max-w-[380px] h-[440px] mx-auto mb-1">
      <MobileProfileCard
        className="left-2 bottom-6 w-[225px] h-[325px] -rotate-12"
        posters={[
          ['/images/in the mood for love.jpg', 'In the Mood for Love'],
          ['/images/chungking.jpg', 'Chungking Express'],
          ['/images/happytogether.jpg', 'Happy Together'],
          ['/images/fallenangels.jpg', 'Fallen Angels'],
        ]}
      />
      <MobileProfileCard
        className="right-2 bottom-3 w-[245px] h-[352px] rotate-6 z-10"
        posters={[
          ['/images/chungking.jpg', 'Chungking Express'],
          ['/images/fallenangels.jpg', 'Fallen Angels'],
          ['/images/in the mood for love.jpg', 'In the Mood for Love'],
          ['/images/happytogether.jpg', 'Happy Together'],
        ]}
      />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [splashPhase, setSplashPhase] = useState<'show' | 'fading' | 'done'>('show');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');

    // Show the maroon splash once per app launch; skip it when returning to this screen
    let seen = false;
    try {
      seen = sessionStorage.getItem('splashShown') === '1';
    } catch {}

    if (seen) {
      setSplashPhase('done');
      if (token) router.replace('/discover');
      return;
    }

    const fadeTimer = setTimeout(() => {
      try {
        sessionStorage.setItem('splashShown', '1');
      } catch {}
      if (token) {
        router.replace('/discover');
      } else {
        setSplashPhase('fading');
      }
    }, SPLASH_DURATION_MS);
    const doneTimer = setTimeout(() => {
      if (!token) setSplashPhase('done');
    }, SPLASH_DURATION_MS + SPLASH_FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [mounted, router]);

  if (!mounted) {
    return <SplashScreen visible animateIn={false} />;
  }

  const handleNavigation = (path: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push(path);
    }, 300);
  };

  return (
    <>
    {splashPhase !== 'done' && <SplashScreen visible={splashPhase === 'show'} animateIn />}
    <div className={`theme-surface min-h-screen flex items-center justify-center px-4 lg:px-16 relative bg-white transition-[opacity,background-color] duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {/* Light / dark mode */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30">
        <ThemeToggle />
      </div>

      {/* Left Side - Decorative Cards */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative max-w-2xl">
        {/* Background Card 1 */}
        <div className="absolute left-20 top-1/2 -translate-y-1/2 w-80 h-[500px] bg-gray-800 rounded-3xl shadow-2xl transform -rotate-12 overflow-hidden border-8 border-white">
          {/* Movie Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 h-full">
            <div className="rounded-xl overflow-hidden">
              <img src="/images/in the mood for love.jpg" alt="In the Mood for Love" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img src="/images/chungking.jpg" alt="Chungking Express" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img src="/images/happytogether.jpg" alt="Happy Together" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img src="/images/fallenangels.jpg" alt="Fallen Angels" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-white border-4 border-white overflow-hidden shadow-lg" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)' }}>
                <img src="/images/khalil.jpg" alt="Khalil Ramos" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-white font-bold text-2xl" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)' }}>Khalil Ramos</h3>
                <p className="text-white/80 text-base" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.6)' }}>1.5 km away</p>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
            </div>
          </div>
        </div>

        {/* Foreground Card 2 */}
        <div className="relative left-32 w-96 h-[540px] bg-gray-800 rounded-3xl shadow-2xl transform rotate-6 overflow-hidden border-8 border-white z-10">
          {/* Movie Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 h-full">
            <div className="rounded-xl overflow-hidden">
              <img src="/images/chungking.jpg" alt="Chungking Express" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img src="/images/fallenangels.jpg" alt="Fallen Angels" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img src="/images/in the mood for love.jpg" alt="In the Mood for Love" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img src="/images/happytogether.jpg" alt="Happy Together" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-white border-4 border-white overflow-hidden shadow-lg" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)' }}>
                <img src="/images/khalil.jpg" alt="Khalil Ramos" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-white font-bold text-2xl" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)' }}>Khalil Ramos</h3>
                <p className="text-white/80 text-base" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.6)' }}>1.5 km away</p>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
              <div className="w-2 h-2 rounded-full bg-white/40"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Welcome Options */}
      <div className="w-full max-w-md lg:max-w-lg relative z-20">
        <div className="px-4 py-6 sm:p-8 lg:p-12 mx-auto">
          <MobileHero />
          <div className="flex flex-col items-center mt-4 mb-6 lg:mt-0 lg:mb-10">
            <Logo className="h-20 sm:h-24 mb-4" />
            <p className="w-full text-gray-600 text-center text-sm leading-relaxed text-balance">
              Follow mo naman ako sa Letterboxd.
              <br />
              Ano top 4 favorite films mo?
            </p>
          </div>

          <div className="space-y-3 mt-8 lg:mt-16">
            {/* Create Account Button */}
            <button 
              onClick={() => handleNavigation('/register')}
              className="group w-full h-14 px-6 inline-flex items-center justify-center gap-2 bg-[#1f2937] hover:bg-[#111827] text-white text-base font-semibold rounded-full transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
            >
              Create an Account
              <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            {/* Sign In Button */}
            <button 
              onClick={() => handleNavigation('/login')}
              className="w-full h-14 px-6 inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#1f2937] text-base font-semibold rounded-full transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
            >
              I Have an Account
            </button>
          </div>

          <div className="mt-8 lg:mt-12 text-center">
            <p className="text-sm text-gray-500">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-[#1f2937] hover:text-[#111827] underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-[#1f2937] hover:text-[#111827] underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
