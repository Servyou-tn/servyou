'use client'

import { createRef, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { Manrope } from 'next/font/google'
import { motion, useReducedMotion } from 'motion/react'
import { t, type Lang } from '@/lib/i18n'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Particles } from '@/components/magicui/particles'
import { BorderBeam } from '@/components/magicui/border-beam'
import { AnimatedBeam } from '@/components/magicui/animated-beam'
import Link from 'next/link'

// Premium display font for the hero only (the app-wide default stays Inter).
// Loaded here and scoped to the hero container via the --font-display variable.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

// Six platform-function icons at fixed clock-position CENTRES (10·12·2·4·6·8, in
// clockwise DOM/tab order). `pos` places the wrapper centre (paired with
// -translate-x/y-1/2 in the map) so a card grows symmetrically from that point and
// the beam — pinned at the centre on mount — stays connected when it enlarges. All
// six share one size (96px closed → 224×288 portrait open); `curvature`/`beamDelay`
// shape + stagger the beam; the idle float is desynced by index in the map.
// (icon-chat/payment/shield are JPEG under a .png name — sharp decodes them; the
// opaque white square hides on the white card until re-exported transparent.)
const heroIcons = [
  { src: 'icon-shop',       key: 'shop',       href: '/signup?role=shop',       pos: 'left-[20%] top-[26%]', curvature: 50,  beamDelay: 0 },   // 10 o'clock
  { src: 'icon-payment',    key: 'payment',    href: '#faq',                    pos: 'left-1/2 top-[18%]',   curvature: 30,  beamDelay: 0.5 }, // 12 o'clock
  { src: 'icon-freelancer', key: 'freelancer', href: '/signup?role=freelancer', pos: 'left-[80%] top-[26%]', curvature: 50,  beamDelay: 1 },   //  2 o'clock
  { src: 'icon-cart',       key: 'cart',       href: '/',                       pos: 'left-[80%] top-[74%]', curvature: -50, beamDelay: 1.5 }, //  4 o'clock  (moved from 6)
  { src: 'icon-verified',   key: 'verified',   href: '#comment-ca-marche',      pos: 'left-1/2 top-[82%]',   curvature: -30, beamDelay: 2 },   //  6 o'clock  (new; curves up)
  { src: 'icon-shield',     key: 'shield',     href: '#a-propos',               pos: 'left-[20%] top-[74%]', curvature: -50, beamDelay: 2.5 }, //  8 o'clock
] as const

export function Hero({ lang }: { lang: Lang }) {
  const reduce = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  // One stable RefObject per icon for the beams (created once via lazy init —
  // not read from a ref's `.current` during render, per react-hooks/refs).
  const [iconRefs] = useState(() => heroIcons.map(() => createRef<HTMLDivElement>()))

  // Which flip-card is open (only one at a time). Esc or a click outside any card
  // closes it — global listeners so it works regardless of focus/pointer location.
  const [openIconId, setOpenIconId] = useState<string | null>(null)
  useEffect(() => {
    if (openIconId === null) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIconId(null)
    }
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null
      if (!el?.closest?.('[data-flip-card]')) setOpenIconId(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [openIconId])

  // Fewer particles on small screens (skill #8) — measured client-side.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return (
    // Radial luminance background — a small ellipse whose bright point sits at 65%
    // down the section, so the top ~35% is pure white before any blue tint.
    // overflow-hidden contains the ambient particles.
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_70%_50%_at_50%_65%,_var(--brand-ice)_0%,_white_65%)] pb-6 pt-12">
        {/* Belt-and-braces with the constrained gradient: a solid white strip pinned
            to the top of the section guarantees the hero's top 160px has no blue. */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-0 h-40 bg-white" aria-hidden="true" />
        {/* Layer 1 — ambient drifting particles (disabled under reduced motion) */}
        {!reduce && (
          <Particles
            className="absolute inset-0 z-0"
            quantity={isMobile ? 30 : 80}
            ease={80}
            size={0.6}
            color="#2563EB"
            refresh={false}
          />
        )}

        <div className={`${manrope.variable} relative z-10 mx-auto max-w-5xl px-6 text-center`}>
          {/* Layer 2 — blur-to-sharp entrance */}
          <BlurFade delay={0.1} inView>
            <h1 className="mx-auto max-w-5xl font-[family-name:var(--font-display)] text-2xl font-bold leading-[1.15] tracking-tight lg:text-3xl xl:text-4xl">
              <span className="text-[var(--text-primary)]">{t('landing.hero.h1_chez', lang)}</span>
              <span className="text-[var(--brand-accent)]">{t('landing.hero.h1_brand', lang)}</span>
              <span className="text-[var(--text-primary)]">{t('landing.hero.h1_middle', lang)}</span>
              <span className="text-[var(--brand-accent)]">{t('landing.hero.h1_accent', lang)}</span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.25} inView>
            <p className="mx-auto mt-6 max-w-2xl font-[family-name:var(--font-display)] text-lg font-normal text-[var(--text-muted)] lg:text-xl">
              {t('landing.hero.subheadline', lang)}
            </p>
          </BlurFade>

          {/* Beam composition: 6 static icons streaming gradient beams into the S */}
          <div
            ref={containerRef}
            className="relative isolate mx-auto mt-16 h-[420px] w-full max-w-4xl sm:h-[500px]"
          >
            {/* Layer 3 — double halo behind the S. Outer (sky, larger, 2s-offset
                start) gives a sonar ripple; inner (accent) is the original pulse. */}
            <div
              aria-hidden="true"
              className="animate-halo-outer pointer-events-none absolute left-1/2 top-1/2 z-0 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-sky)]/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="animate-glow-pulse absolute left-1/2 top-1/2 z-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-80 sm:w-80"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.30) 0%, transparent 70%)' }}
            />

            {/* Layer 5 — gradient light beams from each icon into the S (behind the
                icons + S). Staggered delays so the energy flows in sequence. */}
            {heroIcons.map((icon, i) => (
              <AnimatedBeam
                key={`beam-${icon.src}`}
                containerRef={containerRef}
                fromRef={iconRefs[i]}
                toRef={centerRef}
                curvature={icon.curvature}
                duration={4}
                delay={icon.beamDelay}
                gradientStartColor="#2563EB"
                gradientStopColor="#3B82F6"
                pathColor="rgba(37,99,235,0.22)"
                pathWidth={2}
                pathOpacity={1}
              />
            ))}

            {/* Layer 3 — central S floating directly on the page (the PNG is truly
                transparent). No white card; a soft drop-shadow grounds it and the
                BorderBeam travels the rounded container that wraps the S. */}
            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <div ref={centerRef} className="relative rounded-full">
                <Image
                  src="/brand/logo/servyou-hero.png"
                  alt="Servyou"
                  width={120}
                  height={120}
                  priority
                  className="h-28 w-28 drop-shadow-[0_10px_28px_rgba(15,23,42,0.20)] sm:h-32 sm:w-32"
                />
                {!reduce && (
                  <BorderBeam
                    size={70}
                    duration={12}
                    borderWidth={2}
                    colorFrom="#2563EB"
                    colorTo="#7DAEED"
                  />
                )}
              </div>
            </div>

            {/* Layers 4/6 — six flip cards. The wrapper centres on the clock point
                (beam ref) and rises to z-50 while open so the enlarged card clears
                its neighbours; the float pauses while a card is open. */}
            {heroIcons.map((icon, i) => {
              const isOpen = openIconId === icon.key
              return (
                <div
                  key={icon.src}
                  ref={iconRefs[i]}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${isOpen ? 'z-50' : 'z-30'} ${icon.pos}`}
                >
                  <motion.div
                    className="will-change-transform"
                    animate={{ y: isOpen || reduce ? 0 : [0, -6, 0] }}
                    transition={
                      isOpen || reduce
                        ? { duration: 0.4, ease: 'easeOut' }
                        : { duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }
                    }
                  >
                    <FlipIcon
                      icon={icon}
                      lang={lang}
                      reduce={reduce}
                      isOpen={isOpen}
                      onToggle={() => setOpenIconId(prev => (prev === icon.key ? null : icon.key))}
                    />
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>

      </section>
  )
}

// Inline ArrowRight (lucide's exact path) — avoids pulling in the lucide-react
// package for a single glyph while honouring the no-new-dependencies constraint.
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

// The shared back-face content — a white card: mini icon on top, navy title and
// muted body in the middle, and a blue-gradient pill CTA with a white arrow-circle
// at the bottom. The CTA stops click propagation so following it never also closes
// the card.
function FlipBack({
  iconSrc,
  title,
  body,
  cta,
  href,
}: {
  iconSrc: string
  title: string
  body: string
  cta: string
  href: string
}) {
  return (
    <>
      <div className="relative h-12 w-12 flex-shrink-0">
        <Image src={iconSrc} alt="" fill sizes="48px" className="object-contain" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-2 py-2">
        <h4 className="text-sm font-bold leading-tight text-[var(--text-primary)]">{title}</h4>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{body}</p>
      </div>
      <Link
        href={href}
        onClick={e => e.stopPropagation()}
        className="group relative mx-auto flex w-full max-w-[180px] items-center justify-between gap-2 rounded-full py-1 pl-4 pr-1 text-xs font-semibold text-white sm:whitespace-nowrap"
        style={{
          background: 'linear-gradient(135deg, var(--brand-accent) 0%, var(--brand-primary) 100%)',
          boxShadow: 'inset 0 1px 0 var(--brand-accent-light), 0 4px 12px rgba(37, 99, 235, 0.3)',
        }}
      >
        <span>{cta}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="h-3.5 w-3.5 text-[#2563EB]" />
        </span>
      </Link>
    </>
  )
}

// A click-to-flip-AND-grow card. Closed: the small 3D icon on its white card.
// Open: the card rotates 180° on Y while its size class swaps small→large — the
// CSS `.flip-size` helper transitions width/height ONLY (never transform) so it
// can't fight Motion's rotateY — revealing the white CTA card. It is a
// div[role=button] (not a <button>) so it can legally hold the focusable CTA link;
// keyboard flip is wired (Enter/Space) and `inert` keeps the hidden face out of the
// tab order. Open state is owned by the parent (one card at a time). Under reduced
// motion the rotation becomes an opacity cross-dissolve (no perspective/3d/backface).
function FlipIcon({
  icon,
  lang,
  reduce,
  isOpen,
  onToggle,
}: {
  icon: (typeof heroIcons)[number]
  lang: Lang
  reduce: boolean | null
  isOpen: boolean
  onToggle: () => void
}) {
  const title = t(`landing.hero.icons.${icon.key}.title`, lang)
  const body = t(`landing.hero.icons.${icon.key}.body`, lang)
  const cta = t(`landing.hero.icons.${icon.key}.cta`, lang)
  const iconSrc = `/brand/icons/${icon.src}.png`

  // Uniform for all six: 96px closed (80px mobile) → 224×288 portrait open
  // (176×240 mobile). The CSS .flip-size animates the width/height swap.
  const small = 'w-20 h-20 sm:w-24 sm:h-24'
  const large = 'w-44 h-60 sm:w-56 sm:h-72'
  const sizeClass = isOpen ? large : small

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }
  const a11y = {
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': isOpen,
    'aria-label': `Découvrir: ${title}`,
    onClick: onToggle,
    onKeyDown,
  }
  const ring =
    'outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2'
  const front =
    'absolute inset-0 overflow-hidden rounded-2xl border border-[var(--brand-sky)]/30 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08),inset_0_1px_2px_rgba(191,219,254,0.4)]'
  const back =
    'absolute inset-0 flex flex-col items-center justify-between rounded-2xl border border-[var(--brand-sky)] bg-[linear-gradient(180deg,_#FFFFFF_0%,_var(--brand-ice)_100%)] p-4 text-center shadow-[0_12px_32px_rgba(15,23,42,0.10)]'

  // Reduced motion: opacity cross-dissolve (size still grows via .flip-size).
  if (reduce) {
    return (
      <div className={`flip-size relative ${sizeClass}`}>
        <div {...a11y} data-flip-card="" className={`absolute inset-0 cursor-pointer rounded-2xl ${ring}`}>
          <div aria-hidden={isOpen} inert={isOpen || undefined} className={`${front} transition-opacity duration-200`} style={{ opacity: isOpen ? 0 : 1 }}>
            <Image src={iconSrc} alt="" fill sizes="96px" className="object-contain p-2" />
          </div>
          <div aria-hidden={!isOpen} inert={!isOpen || undefined} className={`${back} transition-opacity duration-200`} style={{ opacity: isOpen ? 1 : 0 }}>
            <FlipBack iconSrc={iconSrc} title={title} body={body} cta={cta} href={icon.href} />
          </div>
        </div>
      </div>
    )
  }

  // Full 3D flip + grow.
  return (
    <div className="[perspective:1200px]">
      <div className={`flip-size relative ${sizeClass}`}>
        <motion.div
          {...a11y}
          data-flip-card=""
          className={`absolute inset-0 cursor-pointer rounded-2xl [transform-style:preserve-3d] will-change-transform ${ring}`}
          animate={{ rotateY: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          whileHover={isOpen ? {} : { scale: 1.1, y: -4 }}
        >
          <div aria-hidden={isOpen} inert={isOpen || undefined} className={`${front} [backface-visibility:hidden]`}>
            <Image src={iconSrc} alt="" fill sizes="96px" className="object-contain p-2" />
          </div>
          <div
            aria-hidden={!isOpen}
            inert={!isOpen || undefined}
            className={`${back} [backface-visibility:hidden] [transform:rotateY(180deg)]`}
          >
            <FlipBack iconSrc={iconSrc} title={title} body={body} cta={cta} href={icon.href} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
