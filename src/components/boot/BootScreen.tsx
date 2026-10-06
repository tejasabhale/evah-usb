import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { EvahLogo } from '@/components/common/EvahLogo';
import { TtsService } from '@/services/tts/TtsService';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';

interface BootScreenProps {
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLParagraphElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);

  const [currentStepText, setCurrentStepText] = useState('Initializing EVAH kernel...');
  const settings = useSessionStore((s) => s.settings);
  const isDevSimulation = useSessionStore((s) => s.isDevSimulation);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: async () => {
          // Play Welcome to EVAH female voice if enabled
          if (settings.welcomeVoiceEnabled) {
            try {
              await TtsService.getInstance().playWelcomeGreeting(settings.welcomeVoiceVolume);
            } catch (e) {
              console.warn('TTS playback skipped:', e);
            }
          }
          // Small settle delay then transition to Login
          setTimeout(() => {
            onComplete();
          }, 350);
        },
      });

      // Step 1: Fade in dark environment and logo
      tl.fromTo(
        logoRef.current,
        { scale: 0.8, opacity: 0, filter: 'blur(10px)' },
        { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' }
      );

      // Step 2: Show EVAH branding text
      tl.fromTo(
        titleRef.current,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
        '-=0.3'
      );

      // Step 3: Sequential boot checklist
      const steps = [
        { label: 'Verifying USB security marker: EVAH_DEVICE...', progress: 25 },
        { label: 'Mounting encrypted filesystem /EVAH/data...', progress: 50 },
        { label: 'Initializing AES-256 session vault...', progress: 75 },
        { label: 'Loading design tokens and wallpaper...', progress: 92 },
        { label: 'Ready.', progress: 100 },
      ];

      steps.forEach((step, idx) => {
        tl.to(
          barFillRef.current,
          {
            width: `${step.progress}%`,
            duration: 0.35,
            ease: 'power1.inOut',
            onStart: () => {
              setCurrentStepText(step.label);
            },
          },
          `+=${0.18 + idx * 0.05}`
        );
      });

      // Final quick fadeout of boot sequence
      tl.to(containerRef.current, {
        opacity: 0,
        scale: 1.02,
        duration: 0.45,
        ease: 'power2.inOut',
        delay: 0.2,
      });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete, settings.welcomeVoiceEnabled, settings.welcomeVoiceVolume]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black text-white select-none overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--evah-accent, #14B8A6) 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center max-w-sm w-full px-6 text-center z-10">
        <div ref={logoRef} className="mb-6">
          <EvahLogo size={90} animate={true} />
        </div>

        <div ref={titleRef} className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold tracking-wider font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            EVAH
          </h1>
          <p className="text-xs uppercase tracking-widest text-evah-text-muted mt-1 font-mono">
            Personal Digital Environment
          </p>
          {isDevSimulation && (
            <span className="mt-2 text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border border-amber-500/30 bg-amber-950/30 text-amber-300">
              Dev Mode (USB Simulated)
            </span>
          )}
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden relative mb-3">
          <div
            ref={barFillRef}
            className="h-full rounded-full transition-all duration-300"
            style={{ width: '0%', background: 'var(--evah-accent, #14B8A6)' }}
          />
        </div>

        {/* Dynamic status label */}
        <p
          ref={progressTextRef}
          className="text-xs font-mono text-evah-text-secondary h-4 tracking-tight transition-opacity duration-200"
        >
          {currentStepText}
        </p>
      </div>

      <div className="absolute bottom-6 text-[11px] text-white/30 font-mono tracking-wider">
        USB-Bound Secure Host • Offline First
      </div>
    </div>
  );
};
