import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Eyebrow, TITLE } from './ui'

// Section 4 · Notre mission (#notre-mission) — Figma 1706:53757. Navy blue-950 box (hero-box shape:
// desktop 1392 r32 · phone 359 r24), one 760 / 319 manifesto column, signed by the founder.
export function Mission({ lang }: { lang: Lang }) {
  return (
    <section
      id="notre-mission"
      className="mx-2 mt-4 scroll-mt-20 rounded-3xl bg-brand-blue-950 px-5 py-16 lg:mx-6 lg:mt-8 lg:rounded-[32px] lg:py-[120px]"
    >
      <div className="mx-auto flex max-w-[760px] flex-col gap-4 lg:gap-6">
        <Eyebrow className="text-brand-blue-300">{t('lp.mission.eyebrow', lang)}</Eyebrow>
        <h2 className={cn(TITLE, 'text-text-inverse')}>{t('lp.mission.title', lang)}</h2>
        <div className="flex flex-col gap-3.5 lg:gap-[18px]">
          {(['p1', 'p2', 'p3', 'p4'] as const).map(p => (
            <p key={p} className="text-base leading-[26px] text-text-inverse/78 lg:text-lg lg:leading-7">
              {t(`lp.mission.${p}`, lang)}
            </p>
          ))}
        </div>
        <p className="text-xl leading-[26px] font-semibold tracking-[-0.01em] text-text-inverse rtl:tracking-normal">
          {t('lp.mission.ambition', lang)}
        </p>
        <div className="flex items-center gap-3">
          <span className="h-0.5 w-8 bg-brand-blue-300" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-base leading-[26px] font-semibold text-text-inverse">{t('lp.mission.name', lang)}</span>
            <span className="text-xs leading-[17px] text-text-inverse/60">{t('lp.mission.role', lang)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
