import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { EvahLogo } from '@/components/common/EvahLogo';
import { TtsService } from '@/services/tts/TtsService';
import { useSessionStore } from '@/stores/useSessionStore';

interface BootScreenProps {
  onComplete: () => void;
}

type BootPhase = 
  | 'BOOT_INIT'
  | 'DEVICE_CHECK'
  | 'USB_VERIFY'
  | 'FILESYSTEM_INIT'
  | 'SECURITY_INIT'
  | 'THEME_INIT'
  | 'WALLPAPER_INIT'
  | 'VOICE'
  | 'LOGIN_READY';

interface PhaseStep {
  phase: BootPhase;
  label: string;
  progress: number;
}

const BOOT_SEQUENCE: PhaseStep[] = [
  { phase: 'BOOT_INIT', label: 'Initializing EVAH...', progress: 15 },
  { phase: 'DEVICE_CHECK', label: 'Verifying hardware environment...', progress: 32 },
  { phase: 'USB_VERIFY', label: 'Validating security signature...', progress: 50 },
  { phase: 'FILESYSTEM_INIT', label: 'Mounting workspace filesystem...', progress: 68 },
  { phase: 'SECURITY_INIT', label: 'Arming memory protection...', progress: 82 },
  { phase: 'THEME_INIT', label: 'Applying personal environment...', progress: 95 },
  { phase: 'LOGIN_READY', label: 'Ready.', progress: 100 },
];

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const logoWrapperRef = useRef<HTMLDivElement>(null);
  const textGroupRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [currentLabel, setCurrentLabel] = useState('Initializing EVAH...');
  const settings = useSessionStore((s) => s.settings);

  // Deep subtle space starfield canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Subtle micro-stars (deep, calm, non-flashy)
    const stars = Array.from({ length: 85 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 0.9 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.08 + 0.02,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        s.y -= s.speed;
        if (s.y < 0) s.y = height;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  // GSAP Boot timeline
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: async () => {
          if (settings.welcomeVoiceEnabled) {
            try {
              await TtsService.getInstance().playWelcomeGreeting(settings.welcomeVoiceVolume);
            } catch (e) {
              console.warn('Voice playback skipped', e);
            }
          }

          // Refined exit transition
          gsap.to(containerRef.current, {
            opacity: 0,
            scale: 1.015,
            duration: 0.55,
            ease: 'power2.inOut',
            onComplete: () => {
              onComplete();
            },
          });
        },
      });

      // 1. Atmospheric light field soft emergence
      tl.fromTo(
        atmosphereRef.current,
        { opacity: 0, scale: 0.85 },
        { opacity: 0.35, scale: 1, duration: 1.2, ease: 'power2.out' },
        0
      );

      // 2. Logo graceful entry and settle
      tl.fromTo(
        logoWrapperRef.current,
        { scale: 0.88, opacity: 0, y: 14, filter: 'blur(8px)' },
        { scale: 1, opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' },
        0.2
      );

      // 3. Identity text appearance
      tl.fromTo(
        textGroupRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        0.5
      );

      // 4. Staged sequence progression
      BOOT_SEQUENCE.forEach((step, idx) => {
        tl.to(
          progressBarRef.current,
          {
            width: `${step.progress}%`,
            duration: 0.38,
            ease: 'power1.inOut',
            onStart: () => {
              setCurrentLabel(step.label);
            },
          },
          `+=${0.16 + idx * 0.04}`
        );
      });

      // Settle pause before completion
      tl.to({}, { duration: 0.35 });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete, settings.welcomeVoiceEnabled, settings.welcomeVoiceVolume]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#060911] text-slate-100 select-none overflow-hidden"
    >
      {/* Background Micro-Starfield Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-80" />

      {/* Atmospheric Soft Light Field (Cosmic deep ambiance) */}
      <div
        ref={atmosphereRef}
        className="absolute w-[680px] h-[680px] rounded-full blur-[160px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.45) 0%, rgba(14, 116, 144, 0.2) 45%, transparent 70%)',
        }}
      />

      {/* Center OS Brand Identity */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        <div ref={logoWrapperRef} className="mb-6 drop-shadow-2xl">
          <EvahLogo size={84} animate={false} />
        </div>

        <div ref={textGroupRef} className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold tracking-[0.2em] font-sans text-white/95">
            EVAH
          </h1>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 mt-1 font-mono">
            Personal Digital Environment
          </p>
        </div>

        {/* Minimal Progress Indicator */}
        <div className="w-48 bg-white/[0.08] rounded-full h-[3px] overflow-hidden relative mb-3 backdrop-blur-sm">
          <div
            ref={progressBarRef}
            className="h-full rounded-full transition-all duration-300"
            style={{ width: '0%', background: 'var(--evah-accent, #14B8A6)' }}
          />
        </div>

        {/* State Machine Status Label */}
        <p className="text-[11px] font-mono text-slate-400/90 h-4 tracking-tight transition-opacity duration-200">
          {currentLabel}
        </p>
      </div>

      <div className="absolute bottom-6 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
        Hardware-Bound • Offline First
      </div>
    </div>
  );
};
