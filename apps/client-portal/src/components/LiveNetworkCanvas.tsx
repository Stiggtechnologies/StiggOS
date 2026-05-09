// Premium "living network" canvas. Inspired by x.ai's animated background:
// a constellation of nodes representing the customer's monitored sites, with
// signal pulses flowing between them in real time. Communicates the entire
// product promise visually — "your portfolio is alive, monitored, end-to-end."
//
// Design choices:
//   - Pure Canvas 2D (no three.js, no extra deps; keeps bundle ~2kB).
//   - Soft Stigg red + ink palette to match the brand without overpowering.
//   - Honors prefers-reduced-motion: in that case, renders one static frame.
//   - Pauses when the tab is hidden (saves the laptop fan).

import { useEffect, useRef } from 'react';

interface Node { x: number; y: number; pulse: number; pulseSpeed: number; tier: 0 | 1 | 2; }
interface Pulse { from: number; to: number; t: number; speed: number; }

export function LiveNetworkCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let raf = 0;
    let running = true;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width  = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedNodes();
    }

    function seedNodes() {
      // Sparse, calm grid. Bigger cells = fewer nodes = quieter scene.
      const cols = Math.max(5, Math.floor(w / 130));
      const rows = Math.max(6, Math.floor(h / 130));
      const cellW = w / cols, cellH = h / rows;
      const out: Node[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.55) continue;          // very sparse
          const x = c * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.45;
          const y = r * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.45;
          const tier = (Math.random() < 0.025 ? 2 : Math.random() < 0.08 ? 1 : 0) as 0 | 1 | 2;
          out.push({ x, y, pulse: Math.random() * Math.PI * 2, pulseSpeed: 0.18 + Math.random() * 0.22, tier });
        }
      }
      nodes = out;
      pulses = [];
    }

    function spawnPulse() {
      if (nodes.length < 2) return;
      // Cap concurrent pulses so the scene never gets noisy.
      if (pulses.length >= 2) return;
      const fromIdx = Math.floor(Math.random() * nodes.length);
      const from = nodes[fromIdx]; if (!from) return;
      const candidates = nodes
        .map((n, i) => ({ i, d: (n.x - from.x) ** 2 + (n.y - from.y) ** 2 }))
        .filter((c) => c.i !== fromIdx)
        .sort((a, b) => a.d - b.d)
        .slice(0, Math.max(3, Math.floor(nodes.length * 0.1)));
      if (candidates.length === 0) return;
      const pick = candidates[Math.floor(Math.random() * candidates.length)]; if (!pick) return;
      pulses.push({ from: fromIdx, to: pick.i, t: 0, speed: 0.18 + Math.random() * 0.18 });
    }

    let last = performance.now();
    let pulseCooldown = 0;

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min(48, now - last) / 1000; last = now;

      // No background wash — keep the panel base clean.
      ctx!.clearRect(0, 0, w, h);

      // Static infrastructure lines between near neighbors. Very faint,
      // shorter range, neutral white — feels like a quiet wireframe.
      ctx!.lineCap = 'round';
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]; if (!a) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]; if (!b) continue;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 180 * 180) {
            const o = (1 - Math.sqrt(d2) / 180) * 0.05;
            ctx!.strokeStyle = `rgba(255, 255, 255, ${o})`;
            ctx!.lineWidth = 0.5;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // Pulses — slow, monochrome trail, no shadow.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        if (!p) continue;
        p.t += dt * p.speed;
        if (p.t >= 1) { pulses.splice(i, 1); continue; }
        const a = nodes[p.from], b = nodes[p.to];
        if (!a || !b) { pulses.splice(i, 1); continue; }

        const headFrac = p.t;
        const tailFrac = Math.max(0, p.t - 0.45);
        const headX = a.x + (b.x - a.x) * headFrac;
        const headY = a.y + (b.y - a.y) * headFrac;
        const tailX = a.x + (b.x - a.x) * tailFrac;
        const tailY = a.y + (b.y - a.y) * tailFrac;

        const lineGrad = ctx!.createLinearGradient(tailX, tailY, headX, headY);
        lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
        ctx!.strokeStyle = lineGrad;
        ctx!.lineWidth = 0.8;
        ctx!.beginPath();
        ctx!.moveTo(tailX, tailY);
        ctx!.lineTo(headX, headY);
        ctx!.stroke();

        ctx!.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx!.beginPath();
        ctx!.arc(headX, headY, 1.1, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Nodes — fully monochrome. Tier-2 just gets a slightly larger soft white halo.
      for (const n of nodes) {
        n.pulse += dt * n.pulseSpeed;
        const breath = (Math.sin(n.pulse) + 1) / 2;

        const baseR = n.tier === 2 ? 1.8 : n.tier === 1 ? 1.2 : 0.9;
        const r = baseR + breath * (n.tier === 2 ? 0.7 : 0.3);

        if (n.tier === 2) {
          const halo = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5);
          halo.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
          halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx!.fillStyle = halo;
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, r * 5, 0, Math.PI * 2);
          ctx!.fill();
        }

        ctx!.fillStyle = n.tier === 2
          ? 'rgba(255, 255, 255, 0.85)'
          : n.tier === 1
            ? 'rgba(255, 255, 255, 0.50)'
            : 'rgba(255, 255, 255, 0.28)';
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      pulseCooldown -= dt;
      if (pulseCooldown <= 0) {
        spawnPulse();
        pulseCooldown = 2.5 + Math.random() * 2.5;     // ~3-5s between pulses
      }

      raf = requestAnimationFrame(frame);
    }

    function paintStaticOnce() {
      // Reduced-motion: paint a single dignified frame, no animation loop.
      pulses = [];
      const grad = ctx!.createRadialGradient(w * 0.3, h * 0.2, 50, w * 0.5, h * 0.5, Math.max(w, h));
      grad.addColorStop(0, 'rgba(214, 31, 43, 0.08)');
      grad.addColorStop(1, 'rgba(5, 6, 10, 0)');
      ctx!.fillStyle = grad; ctx!.fillRect(0, 0, w, h);
      for (const n of nodes) {
        ctx!.fillStyle = n.tier === 2 ? 'rgba(255,255,255,0.95)' : 'rgba(252,154,163,0.65)';
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.tier === 2 ? 3.4 : n.tier === 1 ? 2.2 : 1.4, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    resize();
    if (reduce) {
      paintStaticOnce();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
