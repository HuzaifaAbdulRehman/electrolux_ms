'use client';

import { useEffect, useRef, useState } from 'react';

// Vanta.js types
interface VantaEffect {
  destroy: () => void;
}

interface Window {
  VANTA?: {
    NET: (options: VantaNetOptions) => VantaEffect;
  };
  THREE?: any;
}

interface VantaNetOptions {
  el: HTMLElement;
  mouseControls: boolean;
  touchControls: boolean;
  gyroControls: boolean;
  minHeight: number;
  minWidth: number;
  scale: number;
  scaleMobile: number;
  color: number;
  backgroundColor: number;
  points: number;
  maxDistance: number;
  spacing: number;
  showDots: boolean;
}

/**
 * Vanta.js NET Effect Background Component
 * Creates an animated 3D network grid representing an electrical power distribution system
 *
 * Features:
 * - WebGL-based 3D animation
 * - Responsive to mouse/touch movement
 * - Theme-consistent colors (electric blue/purple)
 * - Auto-cleanup on unmount
 * - Performance optimized
 */
export default function VantaBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<VantaEffect | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [vantaReady, setVantaReady] = useState(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Check if scripts are already loaded
    if ((window as any).VANTA && (window as any).THREE) {
      setScriptsLoaded(true);
      return;
    }

    // Load THREE.js (required by Vanta)
    const threeScript = document.createElement('script');
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js';
    threeScript.async = true;

    // Load Vanta.js NET effect
    const vantaScript = document.createElement('script');
    vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js';
    vantaScript.async = true;

    threeScript.onload = () => {
      console.log('[VantaBackground] THREE.js loaded successfully');
      document.head.appendChild(vantaScript);
    };

    vantaScript.onload = () => {
      console.log('[VantaBackground] Vanta.js loaded successfully');
      setScriptsLoaded(true);
    };

    threeScript.onerror = () => {
      console.error('[VantaBackground] Failed to load THREE.js');
    };

    vantaScript.onerror = () => {
      console.error('[VantaBackground] Failed to load Vanta.js');
    };

    document.head.appendChild(threeScript);

    // Cleanup scripts on unmount
    return () => {
      if (threeScript.parentNode) threeScript.remove();
      if (vantaScript.parentNode) vantaScript.remove();
    };
  }, []);

  useEffect(() => {
    // Initialize Vanta effect once scripts are loaded and ref is ready
    if (!scriptsLoaded || !vantaRef.current) return;
    if (vantaEffect.current) return; // Already initialized

    try {
      const windowWithVanta = window as any;

      if (windowWithVanta.VANTA && windowWithVanta.VANTA.NET) {
        console.log('[VantaBackground] Initializing Vanta NET effect...');

        vantaEffect.current = windowWithVanta.VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,

          // Theme colors - Electric Blue/Purple Network
          color: 0x3b82f6, // Electric blue (#3b82f6)
          backgroundColor: 0x1e1b4b, // Dark purple (#1e1b4b)

          // Network configuration
          points: 12.0, // Number of network nodes (moderate for performance)
          maxDistance: 25.0, // Connection distance between nodes
          spacing: 18.0, // Space between nodes
          showDots: true // Show node points
        });

        console.log('[VantaBackground] Vanta NET effect initialized successfully');
        // Mark as ready after a small delay to ensure smooth transition
        setTimeout(() => setVantaReady(true), 100);
      }
    } catch (error) {
      console.error('[VantaBackground] Error initializing Vanta effect:', error);
    }

    // Cleanup on unmount
    return () => {
      if (vantaEffect.current) {
        console.log('[VantaBackground] Destroying Vanta effect...');
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, [scriptsLoaded]);

  return (
    <>
      {/* Loading overlay - matches homepage gradient */}
      {!vantaReady && (
        <div
          className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 transition-opacity duration-300"
          style={{ zIndex: 1 }}
        />
      )}

      {/* Vanta effect container */}
      <div
        ref={vantaRef}
        className="fixed inset-0 w-full h-full transition-opacity duration-300"
        style={{
          zIndex: 1,
          pointerEvents: 'none',
          opacity: vantaReady ? 1 : 0
        }}
        aria-hidden="true"
      />
    </>
  );
}
