import { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { getTitle } from '../lib/title';
import { useSettings } from '../contexts/SettingsContext';
import { AnimeMedia } from '../types';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#a855f7',
];

interface Props {
  entries: AnimeMedia[];
  loading: boolean;
  onResult: (anime: AnimeMedia) => void;
}

export default function Wheel({ entries, loading, onResult }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettings();
  const [spinning, setSpinning] = useState(false);

  const animRef = useRef({ angle: 0, velocity: 0, prevSeg: -1, rafId: 0 });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  function draw(angle: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width: w, height: h } = canvas;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, w, h);

    const list = entriesRef.current;

    if (list.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1f2937';
      ctx.fill();
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '13px system-ui';
      ctx.fillText('No unwatched shows', cx, cy);
      return;
    }

    const n = list.length;
    const slice = (Math.PI * 2) / n;

    list.forEach((anime, i) => {
      const start = angle + i * slice - Math.PI / 2;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Segment label
      const mid = start + slice / 2;
      const tr = radius * 0.62;
      const tx = cx + Math.cos(mid) * tr;
      const ty = cy + Math.sin(mid) * tr;
      const label = getTitle(anime.title, settings.titleLanguage);
      const short = label.length > 14 ? label.slice(0, 11) + '…' : label;
      const fontSize = Math.max(8, Math.min(11, 160 / n));

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${fontSize}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(short, 0, 0);
      ctx.restore();
    });

    // Centre hub
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer (top, pointing down into wheel)
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - radius - 4);
    ctx.lineTo(cx + 11, cy - radius - 4);
    ctx.lineTo(cx, cy - radius + 18);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }

  useEffect(() => {
    draw(animRef.current.angle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, settings.titleLanguage]);

  useEffect(() => () => cancelAnimationFrame(animRef.current.rafId), []);

  function topSegmentIndex(angle: number): number {
    const n = entriesRef.current.length;
    if (n === 0) return -1;
    const norm = (((-angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(norm / ((Math.PI * 2) / n)) % n;
  }

  function playTick() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ac = audioCtxRef.current;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.value = 700;
      gain.gain.setValueAtTime(0.18, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.04);
      osc.start();
      osc.stop(ac.currentTime + 0.04);
    } catch { /* audio blocked */ }
  }

  function spin() {
    if (spinning || loading || entries.length === 0) return;
    const anim = animRef.current;
    anim.velocity = 14 + Math.random() * 9;
    anim.prevSeg = topSegmentIndex(anim.angle);
    setSpinning(true);

    function frame() {
      anim.angle += anim.velocity / 60;
      anim.velocity *= 0.984;

      const seg = topSegmentIndex(anim.angle);
      if (seg !== anim.prevSeg) { playTick(); anim.prevSeg = seg; }

      draw(anim.angle);

      if (anim.velocity < 0.04) {
        setSpinning(false);
        const winner = entriesRef.current[topSegmentIndex(anim.angle)];
        if (winner) {
          confetti({ particleCount: 120, spread: 80, origin: { x: 0.5, y: 0.55 } });
          onResult(winner);
        }
        return;
      }
      anim.rafId = requestAnimationFrame(frame);
    }
    anim.rafId = requestAnimationFrame(frame);
  }

  const size = 320;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70 rounded-full z-10">
            <svg className="animate-spin w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        <canvas ref={canvasRef} width={size} height={size} className="rounded-full shadow-xl" />
      </div>
      <button
        onClick={spin}
        disabled={spinning || loading || entries.length === 0}
        className="px-8 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-lg transition-colors shadow-lg"
      >
        {spinning ? 'Spinning…' : 'Spin!'}
      </button>
    </div>
  );
}
