import { useEffect, useRef } from 'react';
import type { SakuraIntensity } from '@/types';
import { useSettings } from '@/state/SettingsProvider';
import { PETAL_COLORS, getTheme } from '@/lib/themes';

/** Density multiplier per intensity preset. */
export const INTENSITY_SCALE: Record<SakuraIntensity, number> = {
  gentle: 0.55,
  normal: 1,
  heavy: 1.7,
};

/** Base petal budget, before intensity/theme/performance scaling. */
export function petalBudget(width: number, intensity: SakuraIntensity, themePetals = 1): number {
  const mobile = width < 720;
  const base = mobile ? 54 : 104;
  return Math.max(12, Math.round(base * INTENSITY_SCALE[intensity] * themePetals));
}

interface Petal {
  x: number;
  y: number;
  z: number;
  size: number;
  rotation: number;
  spin: number;
  vy: number;
  drift: number;
  phase: number;
  sway: number;
  alpha: number;
  sprite: number;
  life: number;
}

interface Mote {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  color: string;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  life: number;
  ttl: number;
  color: number;
}

const TAU = Math.PI * 2;

/** Pre-render one notched cherry-blossom petal into an offscreen canvas. */
function createPetalSprite(color: string, light: string, blur: number): HTMLCanvasElement {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.translate(size / 2, size / 2);
  ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';

  const gradient = ctx.createRadialGradient(0, -6, 4, 0, 4, size * 0.46);
  gradient.addColorStop(0, light);
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, `${color}22`);

  ctx.beginPath();
  ctx.moveTo(0, size * 0.46);
  ctx.bezierCurveTo(-size * 0.44, size * 0.22, -size * 0.36, -size * 0.3, -size * 0.13, -size * 0.44);
  ctx.bezierCurveTo(-size * 0.05, -size * 0.36, 0, -size * 0.24, 0, -size * 0.2);
  ctx.bezierCurveTo(0.02 * size, -size * 0.24, size * 0.05, -size * 0.36, size * 0.13, -size * 0.44);
  ctx.bezierCurveTo(size * 0.36, -size * 0.3, size * 0.44, size * 0.22, 0, size * 0.46);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.filter = 'none';
  ctx.strokeStyle = `${light}aa`;
  ctx.lineWidth = 1.2;
  for (const offset of [-0.12, 0, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(0, size * 0.4);
    ctx.quadraticCurveTo(offset * size, 0, offset * size * 0.6, -size * 0.3);
    ctx.stroke();
  }
  return canvas;
}

function createStarSprite(color: string): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.translate(size / 2, size / 2);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.28, color);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ffffffcc';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.34);
  ctx.lineTo(0, size * 0.34);
  ctx.moveTo(-size * 0.34, 0);
  ctx.lineTo(size * 0.34, 0);
  ctx.stroke();
  return canvas;
}

/**
 * Continuous Sakura petal field.
 *
 * One animation loop, two canvases (distant petals behind the UI, a sparse
   large layer in front), gravity plus a slow wind field, drifting light motes
 * and rare sparkles. Petals are drawn from pre-rendered sprites so the frame
 * cost stays flat. The loop pauses while the tab is hidden and a static frame
 * replaces the animation when the user prefers reduced motion. If the device
 * cannot hold ~45 FPS the active budget is trimmed automatically.
 */
export function SakuraField() {
  const backRef = useRef<HTMLCanvasElement>(null);
  const foreRef = useRef<HTMLCanvasElement>(null);
  const { settings, reducedMotion } = useSettings();

  useEffect(() => {
    const backCanvas = backRef.current;
    const foreCanvas = foreRef.current;
    if (!backCanvas || !foreCanvas) return;

    const theme = getTheme(settings.theme);
    const colors = PETAL_COLORS[theme.id];
    const performanceTier = settings.performanceMode;
    const dprCap = performanceTier === 'battery' ? 1 : 2;
    const backCtx = backCanvas.getContext('2d');
    const foreCtx = foreCanvas.getContext('2d');
    if (!backCtx || !foreCtx) return;

    const sprites = {
      distant: [createPetalSprite(colors[1], colors[0], 1.8), createPetalSprite(colors[2], colors[1], 1.4)],
      mid: [createPetalSprite(colors[1], colors[0], 0), createPetalSprite(colors[0], '#ffffff', 0)],
      near: [createPetalSprite(colors[0], '#ffffff', 0), createPetalSprite(colors[1], colors[0], 0.5)],
    };
    const stars = [createStarSprite(colors[0]), createStarSprite(colors[2])];

    let width = 0;
    let height = 0;
    let frame = 0;
    let disposed = false;
    let budget = petalBudget(window.innerWidth, settings.sakuraIntensity, theme.scene.petals);
    let budgetFactor = 1;

    const backPetals: Petal[] = [];
    const forePetals: Petal[] = [];
    let motes: Mote[] = [];
    const sparkles: Sparkle[] = [];

    const random = (min: number, max: number) => min + Math.random() * (max - min);

    const spawnPetal = (layer: 'back' | 'fore', anywhere = true): Petal => {
      const near = layer === 'fore' || Math.random() > 0.62;
      const z = layer === 'fore' ? random(0.82, 1) : near ? random(0.5, 0.8) : random(0.12, 0.45);
      return {
        x: random(-40, width + 40),
        y: anywhere ? random(-height * 0.25, height) : random(-180, -30),
        z,
        size: (layer === 'fore' ? random(18, 34) : random(7, 20)) * (0.6 + z * 0.7),
        rotation: random(0, TAU),
        spin: random(-0.9, 0.9) * (0.4 + z),
        vy: (layer === 'fore' ? random(46, 78) : random(18, 44)) * (0.5 + z * 0.8),
        drift: random(-16, 16),
        phase: random(0, TAU),
        sway: random(16, 54) * (0.4 + z),
        alpha: layer === 'fore' ? random(0.3, 0.55) : random(0.32, 0.82),
        sprite: Math.floor(random(0, 2)),
        life: 0,
      };
    };

    const rebuild = () => {
      backPetals.length = 0;
      forePetals.length = 0;
      for (let i = 0; i < budget; i += 1) backPetals.push(spawnPetal('back'));
      const foreCount = Math.max(5, Math.round(budget * 0.1));
      for (let i = 0; i < foreCount; i += 1) forePetals.push(spawnPetal('fore'));
      motes = Array.from({ length: Math.max(10, Math.round(budget * 0.28)) }).map(() => ({
        x: random(0, width),
        y: random(0, height),
        radius: random(0.7, 2.4),
        speed: random(4, 16),
        phase: random(0, TAU),
        color: Math.random() > 0.5 ? colors[0] : colors[1],
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      width = Math.max(1, Math.floor(window.innerWidth));
      height = Math.max(1, Math.floor(window.innerHeight));
      for (const canvas of [backCanvas, foreCanvas]) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      budget = petalBudget(width, settings.sakuraIntensity, theme.scene.petals);
      rebuild();
    };

    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    let fpsWindow = 0;

    const drawPetal = (ctx: CanvasRenderingContext2D, petal: Petal, layer: 'back' | 'fore') => {
      const pool = layer === 'fore' ? sprites.near : petal.z > 0.55 ? sprites.mid : sprites.distant;
      const sprite = pool[petal.sprite % pool.length];
      const fadeIn = Math.min(1, petal.life / 1.4);
      const fadeOut = Math.min(1, Math.max(0, height - petal.y) / 90);
      ctx.globalAlpha = petal.alpha * fadeIn * Math.min(1, fadeOut + 0.25);
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.drawImage(sprite, -petal.size / 2, -petal.size / 2, petal.size, petal.size);
      ctx.restore();
    };

    const step = (dt: number, time: number) => {
      const wind = Math.sin(time * 0.23) * 18 + Math.sin(time * 0.071) * 26;

      const update = (petals: Petal[], layer: 'back' | 'fore') => {
        for (const petal of petals) {
          petal.life += dt;
          petal.y += petal.vy * dt;
          petal.x += (wind + petal.drift + Math.sin(time * 0.9 + petal.phase) * petal.sway) * dt;
          petal.rotation += petal.spin * dt;
          if (petal.y > height + 80 || petal.x < -180 || petal.x > width + 180) {
            Object.assign(petal, spawnPetal(layer, false));
          }
        }
      };

      update(backPetals, 'back');
      update(forePetals, 'fore');

      for (const mote of motes) {
        mote.y -= mote.speed * dt;
        mote.x += Math.sin(time * 0.6 + mote.phase) * 6 * dt;
        if (mote.y < -10) {
          mote.y = height + 10;
          mote.x = Math.random() * width;
        }
      }

      if (sparkles.length < 8 && Math.random() < dt * 1.1) {
        sparkles.push({
          x: random(width * 0.05, width * 0.95),
          y: random(height * 0.08, height * 0.85),
          size: random(8, 26),
          life: 0,
          ttl: random(0.9, 1.8),
          color: Math.random() > 0.5 ? 0 : 1,
        });
      }
    };

    const paint = (dt: number, time: number) => {
      backCtx.clearRect(0, 0, width, height);
      foreCtx.clearRect(0, 0, width, height);

      const activeBack = Math.round(backPetals.length * budgetFactor);
      const sorted = [...backPetals].sort((a, b) => a.z - b.z);
      for (let i = 0; i < activeBack; i += 1) drawPetal(backCtx, sorted[i], 'back');

      for (const mote of motes) {
        const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.6 + mote.phase));
        backCtx.globalAlpha = 0.4 * twinkle;
        backCtx.fillStyle = mote.color;
        backCtx.shadowBlur = 12;
        backCtx.shadowColor = mote.color;
        backCtx.beginPath();
        backCtx.arc(mote.x, mote.y, mote.radius, 0, TAU);
        backCtx.fill();
      }
      backCtx.shadowBlur = 0;
      backCtx.globalAlpha = 1;

      for (let i = sparkles.length - 1; i >= 0; i -= 1) {
        const sparkle = sparkles[i];
        sparkle.life += dt;
        const progress = sparkle.life / sparkle.ttl;
        if (progress >= 1) {
          sparkles.splice(i, 1);
          continue;
        }
        backCtx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;
        backCtx.globalCompositeOperation = 'lighter';
        backCtx.drawImage(
          stars[sparkle.color],
          sparkle.x - sparkle.size / 2,
          sparkle.y - sparkle.size / 2,
          sparkle.size,
          sparkle.size,
        );
        backCtx.globalCompositeOperation = 'source-over';
      }
      backCtx.globalAlpha = 1;

      const activeFore = Math.round(forePetals.length * budgetFactor);
      for (let i = 0; i < activeFore; i += 1) drawPetal(foreCtx, forePetals[i], 'fore');
      foreCtx.globalAlpha = 1;
    };

    const render = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = now / 1000;

      fpsAccum += dt;
      fpsFrames += 1;
      fpsWindow += dt;
      if (fpsWindow > 1.6) {
        const fps = fpsFrames / Math.max(fpsAccum, 0.001);
        if (performanceTier === 'auto') {
          if (fps < 45) budgetFactor = Math.max(0.45, budgetFactor - 0.18);
          else if (fps > 56) budgetFactor = Math.min(1, budgetFactor + 0.1);
        }
        fpsAccum = 0;
        fpsFrames = 0;
        fpsWindow = 0;
      }

      step(dt, time);
      paint(dt, time);
    };

    const start = () => {
      last = performance.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };
    const stop = () => cancelAnimationFrame(frame);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (reducedMotion) {
      // Calm, static scatter — no animation loop at all.
      budget = Math.max(16, Math.round(budget * 0.35));
      rebuild();
      paint(0, 0);
    } else {
      start();
    }

    return () => {
      disposed = true;
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    settings.sakura,
    settings.sakuraIntensity,
    settings.theme,
    settings.performanceMode,
    reducedMotion,
  ]);

  if (!settings.sakura) return null;

  return (
    <>
      <canvas ref={backRef} className="sakura-layer sakura-back" aria-hidden />
      <canvas ref={foreRef} className="sakura-layer sakura-fore" aria-hidden />
    </>
  );
}
