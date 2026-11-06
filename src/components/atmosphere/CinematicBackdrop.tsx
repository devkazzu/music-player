import { useEffect, useMemo, useRef } from 'react';
import { useSettings } from '@/state/SettingsProvider';
import { getTheme } from '@/lib/themes';

const STARS = Array.from({ length: 68 }).map((_, index) => {
  const seed = (index * 9301 + 49297) % 233280;
  const rand = (seed / 233280) * 100;
  const second = ((index * 4243 + 12345) % 233280) / 233280;
  return {
    id: index,
    left: `${(rand * 1.7 + index * 1.3) % 98}%`,
    top: `${(second * 58 + (index % 7) * 2.4) % 62}%`,
    size: 1 + (index % 4) * 0.6,
    delay: `${(index % 11) * 0.7}s`,
    duration: `${4 + (index % 6)}s`,
    opacity: 0.25 + (index % 5) * 0.13,
  };
});

/**
 * Layered, theme-aware night scene: sky, stars, a glowing moon, mountain
 * ridges, a torii gate (or pagoda / bamboo / koi lanterns per theme), a
 * reflected lake, drifting fog and blossom branches.
 *
 * Everything is individual DOM/SVG layers tiled by CSS variables — no bitmap
 * wallpaper — so switching theme re-colours the whole scene instantly.
 */
export function CinematicBackdrop() {
  const { settings, reducedMotion } = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const theme = getTheme(settings.theme);
  const motif = theme.scene.motif;

  const branches = useMemo(
    () =>
      [
        { id: 'left', className: 'cb-branch cb-branch-left', flip: false },
        { id: 'right', className: 'cb-branch cb-branch-right', flip: true },
      ] as const,
    [],
  );

  // Gentle pointer parallax — one rAF tick per frame at most, disabled with
  // background animation or reduced motion.
  useEffect(() => {
    const element = rootRef.current;
    if (!element || !settings.backgroundAnimation || reducedMotion) return;
    let frame = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      frame = 0;
      element.style.setProperty('--par-x', `${(px * 16).toFixed(2)}px`);
      element.style.setProperty('--par-y', `${(py * 12).toFixed(2)}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      px = event.clientX / window.innerWidth - 0.5;
      py = event.clientY / window.innerHeight - 0.5;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      element.style.removeProperty('--par-x');
      element.style.removeProperty('--par-y');
    };
  }, [settings.backgroundAnimation, reducedMotion]);

  return (
    <div ref={rootRef} className="cinematic-backdrop" data-motif={motif} aria-hidden>
      <div className="cb-sky" />
      <div className="cb-stars">
        {STARS.map((star) => (
          <span
            key={star.id}
            className="cb-star"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      <div className="cb-moon cb-anim">
        <div className="cb-moon-core" />
        <div className="cb-moon-craters" />
        <div className="cb-moon-halo" />
      </div>

      <svg className="cb-ridges" viewBox="0 0 1440 520" preserveAspectRatio="none">
        <path
          className="cb-ridge-far"
          d="M0 360 L120 300 L210 336 L320 246 L430 320 L540 268 L660 336 L780 236 L900 318 L1030 258 L1140 322 L1260 268 L1360 330 L1440 292 L1440 520 L0 520 Z"
        />
        <path
          className="cb-ridge-near"
          d="M0 430 L90 386 L190 414 L300 350 L420 418 L560 366 L700 430 L820 372 L960 424 L1090 368 L1210 428 L1320 386 L1440 430 L1440 520 L0 520 Z"
        />
      </svg>

      <div className="cb-lake">
        <div className="cb-moon-reflection cb-anim" />
        <div className="cb-ripples cb-anim" />
        <div className="cb-ripples cb-ripples-2 cb-anim" />
      </div>

      {motif === 'pagoda' ? (
        <svg key="pagoda" className="cb-landmark cb-pagoda" viewBox="0 0 160 200">
          <g>
            <path d="M80 16 L120 44 H40 Z" />
            <path d="M80 38 L134 72 H26 Z" />
            <path d="M80 64 L148 104 H12 Z" />
            <rect x="56" y="104" width="48" height="70" />
            <rect x="70" y="118" width="8" height="18" className="cb-window" />
            <rect x="84" y="118" width="8" height="18" className="cb-window" />
            <rect x="70" y="146" width="8" height="18" className="cb-window" />
            <rect x="84" y="146" width="8" height="18" className="cb-window" />
            <path d="M40 174 H120 V178 H40 Z" />
          </g>
        </svg>
      ) : motif === 'bamboo' ? (
        <svg key="bamboo" className="cb-landmark cb-bamboo" viewBox="0 0 220 240">
          <g className="cb-bamboo-stalks">
            <rect x="26" y="10" width="7" height="230" rx="3" />
            <rect x="58" y="34" width="5" height="206" rx="3" />
            <rect x="152" y="0" width="7" height="240" rx="3" />
            <rect x="184" y="46" width="5" height="194" rx="3" />
            <rect x="104" y="70" width="4" height="170" rx="2" />
            <path d="M29 60 q26 -20 52 -6" className="cb-bamboo-leaf" />
            <path d="M155 40 q-30 -18 -58 -4" className="cb-bamboo-leaf" />
            <path d="M157 120 q30 -16 54 -2" className="cb-bamboo-leaf" />
            <path d="M31 170 q-24 8 -34 26" className="cb-bamboo-leaf" />
            <path d="M186 150 q22 -14 34 -6" className="cb-bamboo-leaf" />
          </g>
        </svg>
      ) : motif === 'koi' ? (
        <svg key="koi" className="cb-landmark cb-koi" viewBox="0 0 260 160">
          <g>
            <path
              d="M36 92 c22 -34 62 -38 90 -18 c16 11 26 11 44 2 c-4 16 -4 24 0 40 c-18 -9 -28 -9 -44 2 c-28 20 -68 16 -90 -18 Z"
              className="cb-koi-body"
            />
            <path d="M170 76 l30 -24 l-6 24 l22 20 l-30 -2 l-14 20 l-4 -22 l-24 -12 Z" className="cb-koi-fin" />
            <circle cx="66" cy="84" r="3.5" className="cb-koi-eye" />
            <path d="M96 74 q22 16 0 34" className="cb-koi-line" />
            <path d="M120 70 q18 20 0 40" className="cb-koi-line" />
            <path d="M60 150 q22 -10 44 0" className="cb-ripple-line" />
            <path d="M120 158 q26 -10 52 0" className="cb-ripple-line" />
          </g>
        </svg>
      ) : (
        <svg key="torii" className="cb-landmark cb-torii" viewBox="0 0 260 220">
          <g>
            <path d="M14 42 q116 -26 232 0 l-10 16 q-106 -20 -212 0 Z" />
            <rect x="30" y="62" width="200" height="13" rx="4" />
            <rect x="66" y="84" width="18" height="122" rx="4" />
            <rect x="176" y="84" width="18" height="122" rx="4" />
            <rect x="60" y="112" width="140" height="10" rx="3" />
            <path d="M66 206 h18 l6 -8 h-30 Z" className="cb-torii-base" />
            <path d="M176 206 h18 l6 -8 h-30 Z" className="cb-torii-base" />
            <circle cx="130" cy="100" r="4" className="cb-torii-lamp" />
          </g>
        </svg>
      )}

      <div className="cb-houses">
        <svg viewBox="0 0 360 120" preserveAspectRatio="none">
          <g>
            <path d="M8 96 L8 66 L38 48 L68 66 L68 96 Z" />
            <path d="M74 96 L74 60 L112 36 L150 60 L150 96 Z" />
            <path d="M156 96 L156 70 L182 54 L208 70 L208 96 Z" />
            <path d="M214 96 L214 58 L252 34 L290 58 L290 96 Z" />
            <rect x="28" y="72" width="9" height="11" className="cb-window" />
            <rect x="90" y="64" width="9" height="11" className="cb-window" />
            <rect x="120" y="64" width="9" height="11" className="cb-window" />
            <rect x="232" y="62" width="9" height="11" className="cb-window" />
            <rect x="262" y="62" width="9" height="11" className="cb-window" />
            <rect x="176" y="76" width="8" height="9" className="cb-window" />
          </g>
        </svg>
      </div>

      {branches.map((branch) => (
        <svg
          key={branch.id}
          className={branch.className}
          viewBox="0 0 320 240"
          style={branch.flip ? { transform: 'scaleX(-1)' } : undefined}
        >
          <g className="cb-branch-anim">
            <path d="M-10 8 C60 18 96 46 132 78 C168 110 214 128 268 132" className="cb-branch-line" />
            <path d="M62 26 C84 56 108 66 138 68" className="cb-branch-line" />
            <path d="M150 94 C172 88 196 92 214 106" className="cb-branch-line" />
            {[
              [58, 20],
              [96, 44],
              [134, 74],
              [168, 50],
              [196, 96],
              [228, 116],
              [112, 102],
              [250, 126],
            ].map(([cx, cy], index) => (
              <g key={`${cx}-${cy}`} className="cb-blossom" style={{ animationDelay: `${index * 0.6}s` }}>
                <circle cx={cx} cy={cy} r={9} className="cb-blossom-glow" />
                <circle cx={cx} cy={cy} r={4.4} className="cb-blossom-core" />
                <circle cx={cx + 7} cy={cy + 5} r={3.4} className="cb-blossom-core" />
                <circle cx={cx - 7} cy={cy + 4} r={3.1} className="cb-blossom-core" />
                <circle cx={cx + 1} cy={cy - 7} r={2.8} className="cb-blossom-core" />
              </g>
            ))}
          </g>
        </svg>
      ))}

      <div className="cb-fog cb-fog-1 cb-anim" />
      <div className="cb-fog cb-fog-2 cb-anim" />
      <div className="cb-vignette" />
    </div>
  );
}
