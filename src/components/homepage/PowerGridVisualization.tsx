'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';

/**
 * Power Grid Network Visualization
 * A simplified visual representation of an electrical distribution network
 *
 * Features:
 * - Animated nodes representing zones/substations
 * - Pulsing connections showing power flow
 * - Interactive hover effects
 * - Responsive design
 * - Electric blue/yellow theme
 *
 * Note: Uses CSS animations instead of D3 for better performance and simpler code
 */

interface GridNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'main' | 'substation' | 'zone';
}

export default function PowerGridVisualization() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Define network topology - 5 ZONES (A-E) matching real database
  const nodes: GridNode[] = [
    // Main power source (center)
    { id: 'main', x: 50, y: 50, label: 'Main Grid', type: 'main' },

    // Distribution zones (ZONE A to ZONE E) in a star pattern
    { id: 'zoneA', x: 50, y: 15, label: 'Zone A', type: 'zone' },
    { id: 'zoneB', x: 80, y: 35, label: 'Zone B', type: 'zone' },
    { id: 'zoneC', x: 80, y: 65, label: 'Zone C', type: 'zone' },
    { id: 'zoneD', x: 50, y: 85, label: 'Zone D', type: 'zone' },
    { id: 'zoneE', x: 20, y: 50, label: 'Zone E', type: 'zone' }
  ];

  // Define connections (Main grid to all 5 zones)
  const connections = [
    { from: 'main', to: 'zoneA' },
    { from: 'main', to: 'zoneB' },
    { from: 'main', to: 'zoneC' },
    { from: 'main', to: 'zoneD' },
    { from: 'main', to: 'zoneE' }
  ];

  // Draw connections on canvas for performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw connections
    connections.forEach(({ from, to }) => {
      const fromNode = nodes.find(n => n.id === from);
      const toNode = nodes.find(n => n.id === to);
      if (!fromNode || !toNode) return;

      const x1 = (fromNode.x / 100) * rect.width;
      const y1 = (fromNode.y / 100) * rect.height;
      const x2 = (toNode.x / 100) * rect.width;
      const y2 = (toNode.y / 100) * rect.height;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = activeNode === from || activeNode === to
        ? 'rgba(251, 191, 36, 0.6)' // Yellow when active
        : 'rgba(59, 130, 246, 0.3)'; // Blue normally
      ctx.lineWidth = activeNode === from || activeNode === to ? 2 : 1;
      ctx.stroke();
    });
  }, [activeNode, nodes, connections]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Connection lines canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {/* Nodes */}
      {nodes.map((node) => {
        const sizeClass = node.type === 'main' ? 'w-16 h-16' : 'w-12 h-12';

        const colorClass =
          node.type === 'main'
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
            : 'bg-gradient-to-br from-purple-500 to-pink-500';

        return (
          <div
            key={node.id}
            className="absolute transition-all duration-300 cursor-pointer"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseEnter={() => setActiveNode(node.id)}
            onMouseLeave={() => setActiveNode(null)}
          >
            {/* Node circle with pulse animation */}
            <div
              className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center relative group`}
            >
              {/* Pulse ring */}
              <div
                className={`absolute inset-0 ${colorClass} rounded-full opacity-0 group-hover:opacity-30 group-hover:scale-150 transition-all duration-500`}
              />

              {/* Electric pulse animation (only for main grid) */}
              {node.type === 'main' && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{
                  background: 'radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(251,191,36,0) 70%)'
                }} />
              )}

              {/* Icon */}
              <Zap className={`${node.type === 'main' ? 'w-8 h-8' : 'w-6 h-6'} text-white drop-shadow-lg`} />

              {/* Label on hover */}
              {activeNode === node.id && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                  {node.label}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend - Consistent with theme */}
      <div className="absolute bottom-3 left-3 bg-slate-800/60 backdrop-blur-md rounded-xl p-3 border border-purple-500/20 shadow-lg z-20">
        <div className="text-xs text-purple-300 mb-2 font-semibold tracking-wide">Distribution Network</div>
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-sm shadow-yellow-500/50" />
            <span className="text-xs text-gray-300">Main Grid</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-sm shadow-purple-500/50" />
            <span className="text-xs text-gray-300">5 Zones (A-E)</span>
          </div>
        </div>
      </div>

      {/* Hover instruction */}
      {!activeNode && (
        <div className="absolute top-2 right-2 text-xs text-gray-400/60 animate-pulse">
          Hover over nodes
        </div>
      )}
    </div>
  );
}
