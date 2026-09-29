import React, { useEffect, useRef, useState } from 'react';
import { WinterModeOption } from '../types';
import { isWinterModeActive, prefersReducedMotion, getRecommendedParticleCount } from '../lib/winter';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftAmp: number;
  driftSpeed: number;
  driftOffset: number;
  opacity: number;
  layer: 'bg' | 'mid' | 'fg';
  color: string;
}

interface WinterSnowfallProps {
  mode?: WinterModeOption;
  isLowData?: boolean;
  className?: string;
}

export const WinterSnowfall: React.FC<WinterSnowfallProps> = ({
  mode = 'auto',
  isLowData = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const flakesRef = useRef<Snowflake[]>([]);
  const isVisibleRef = useRef<boolean>(true);
  const [active, setActive] = useState<boolean>(() => isWinterModeActive(mode));
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Sync active state when mode changes with smooth transition
  useEffect(() => {
    const shouldBeActive = isWinterModeActive(mode);
    setActive(shouldBeActive);
  }, [mode]);

  // Track prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      // If inactive, cancel any running animation
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Handle high DPI displays responsibly (cap at 2 for performance)
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    // Generate 3-layer particles
    const particleCount = getRecommendedParticleCount(isLowData);
    const flakes: Snowflake[] = [];

    // Distribution: 45% background (small/slow), 40% middle, 15% foreground (larger/soft)
    const bgCount = Math.round(particleCount * 0.45);
    const midCount = Math.round(particleCount * 0.4);
    const fgCount = Math.max(2, particleCount - bgCount - midCount);

    // Layer 1: Background (Small, slow, distant)
    for (let i = 0; i < bgCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.8 + Math.random() * 0.8,
        speedY: 0.35 + Math.random() * 0.35,
        driftAmp: 0.4 + Math.random() * 0.5,
        driftSpeed: 0.006 + Math.random() * 0.008,
        driftOffset: Math.random() * Math.PI * 2,
        opacity: 0.2 + Math.random() * 0.25,
        layer: 'bg',
        color: 'rgba(215, 235, 255, ',
      });
    }

    // Layer 2: Middle (Medium, natural drifting)
    for (let i = 0; i < midCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.8 + Math.random() * 1.1,
        speedY: 0.75 + Math.random() * 0.6,
        driftAmp: 0.8 + Math.random() * 1.0,
        driftSpeed: 0.01 + Math.random() * 0.012,
        driftOffset: Math.random() * Math.PI * 2,
        opacity: 0.4 + Math.random() * 0.3,
        layer: 'mid',
        color: 'rgba(235, 245, 255, ',
      });
    }

    // Layer 3: Foreground (A few larger, gentle soft bokeh snowflakes)
    for (let i = 0; i < fgCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 3.2 + Math.random() * 2.0,
        speedY: 1.3 + Math.random() * 0.8,
        driftAmp: 1.2 + Math.random() * 1.4,
        driftSpeed: 0.012 + Math.random() * 0.015,
        driftOffset: Math.random() * Math.PI * 2,
        opacity: 0.5 + Math.random() * 0.3,
        layer: 'fg',
        color: 'rgba(245, 250, 255, ',
      });
    }

    flakesRef.current = flakes;

    // Static render for reduced motion
    const renderStaticScene = () => {
      ctx.clearRect(0, 0, width, height);
      for (const flake of flakesRef.current) {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${flake.color}${flake.opacity * 0.7})`;
        ctx.fill();
      }
    };

    if (reducedMotion || prefersReducedMotion()) {
      renderStaticScene();
      return;
    }

    let lastTime = performance.now();
    let tick = 0;

    const render = (time: number) => {
      // If tab is hidden or element unmounted, pause execution
      if (!isVisibleRef.current || !active) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      // Delta time capping to avoid large jumps when tab regains focus
      const delta = Math.min((time - lastTime) / 16.667, 2.5);
      lastTime = time;
      tick += 0.016 * delta;

      ctx.clearRect(0, 0, width, height);

      const items = flakesRef.current;
      const count = items.length;

      for (let i = 0; i < count; i++) {
        const flake = items[i];

        // Natural vertical fall
        flake.y += flake.speedY * delta;

        // Gentle horizontal drift via sine wave
        const drift = Math.sin(tick * flake.driftSpeed * 100 + flake.driftOffset) * flake.driftAmp;
        flake.x += drift * 0.35 * delta;

        // Screen wrapping with buffer
        if (flake.y > height + 10) {
          flake.y = -10;
          flake.x = Math.random() * width;
        } else if (flake.y < -15) {
          flake.y = height + 5;
        }

        if (flake.x > width + 10) {
          flake.x = -10;
        } else if (flake.x < -10) {
          flake.x = width + 10;
        }

        // Render based on layer depth
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);

        if (flake.layer === 'fg') {
          // Soft glowing edge for foreground flakes
          const grad = ctx.createRadialGradient(
            flake.x,
            flake.y,
            flake.radius * 0.2,
            flake.x,
            flake.y,
            flake.radius
          );
          grad.addColorStop(0, `${flake.color}${flake.opacity})`);
          grad.addColorStop(0.7, `${flake.color}${flake.opacity * 0.5})`);
          grad.addColorStop(1, `${flake.color}0)`);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = `${flake.color}${flake.opacity})`;
        }

        ctx.fill();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    // Window resize handler
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        // Re-scatter any out of bounds
        for (const flake of flakesRef.current) {
          if (flake.x > width) flake.x = Math.random() * width;
          if (flake.y > height) flake.y = Math.random() * height;
        }
      }, 150);
    };

    // Tab visibility handling: pause RAF when tab is hidden to save 100% CPU
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        lastTime = performance.now();
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [active, reducedMotion, isLowData]);

  return (
    <div
      ref={containerRef}
      id="winter-snowfall-overlay"
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-700 ease-in-out ${
        active ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{ willChange: 'opacity' }}
    >
      {/* 1. Subtle Atmospheric Winter Glow & Depth Scrim */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.05) 0%, rgba(139, 92, 246, 0.03) 45%, transparent 75%), radial-gradient(ellipse at 50% 100%, rgba(30, 58, 138, 0.05) 0%, transparent 60%)',
        }}
      />

      {/* 2. Optimized 60FPS Snowfall Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full pointer-events-none"
      />
    </div>
  );
};

export default WinterSnowfall;
