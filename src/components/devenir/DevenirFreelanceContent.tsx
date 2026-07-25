'use client'

import { Briefcase, Wallet, Search, Share2, Users } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { RoleUpgradeHero } from './RoleUpgradeHero'
import { BenefitGrid } from './BenefitGrid'
import { HowItWorks } from './HowItWorks'
import { FAQ } from './FAQ'
import { FinalCTA } from './FinalCTA'

// Assembles /devenir-freelance from the generic sections + the devenir.freelance.* copy.
// CTA target: the freelancer-profile-creation route when authenticated, else
// /inscription?next=… (the creation route 404s until built — U-curve).
export function DevenirFreelanceContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const lang = useLang()
  const createHref = isAuthenticated
    ? '/mon-profil-freelance/creer'
    : '/inscription?next=' + encodeURIComponent('/mon-profil-freelance/creer')
  const k = (s: string) => t(`devenir.freelance.${s}`, lang)

  return (
    <>
      <RoleUpgradeHero
        eyebrow={k('hero.eyebrow')}
        headline={k('hero.headline')}
        subheadline={k('hero.subheadline')}
        primaryCta={{ label: k('hero.primaryCta'), href: createHref }}
        secondaryCta={{ label: k('hero.secondaryCta'), href: '/marche?type=service' }}
        icon={<Briefcase className="h-32 w-32 text-brand-blue-600" aria-hidden="true" />}
      />
      <BenefitGrid
        sectionTitle={k('benefits.title')}
        sectionSubtitle={k('benefits.subtitle')}
        benefits={[
          { icon: <Wallet className="h-6 w-6" aria-hidden="true" />, title: k('benefit1.title'), description: k('benefit1.desc') },
          { icon: <Search className="h-6 w-6" aria-hidden="true" />, title: k('benefit2.title'), description: k('benefit2.desc') },
          { icon: <Share2 className="h-6 w-6" aria-hidden="true" />, title: k('benefit3.title'), description: k('benefit3.desc') },
          { icon: <Users className="h-6 w-6" aria-hidden="true" />, title: k('benefit4.title'), description: k('benefit4.desc') },
        ]}
      />
      <HowItWorks
        sectionTitle={k('how.title')}
        steps={[
          { number: '1', title: k('step1.title'), description: k('step1.desc') },
          { number: '2', title: k('step2.title'), description: k('step2.desc') },
          { number: '3', title: k('step3.title'), description: k('step3.desc') },
        ]}
      />
      <FAQ
        sectionTitle={k('faq.title')}
        faqs={[
          { question: k('faq1.q'), answer: k('faq1.a') },
          { question: k('faq2.q'), answer: k('faq2.a') },
          { question: k('faq3.q'), answer: k('faq3.a') },
          { question: k('faq4.q'), answer: k('faq4.a') },
          { question: k('faq5.q'), answer: k('faq5.a') },
        ]}
      />
      <FinalCTA
        headline={k('final.headline')}
        subheadline={k('final.subheadline')}
        primaryCta={{ label: k('final.cta'), href: createHref }}
        note={k('final.note')}
      />
    </>
  )
}
