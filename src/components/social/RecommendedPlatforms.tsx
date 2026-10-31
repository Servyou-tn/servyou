'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { platformName, type PlatformId } from '@/lib/social/platforms'
import { t, type Lang } from '@/lib/i18n'

// The « + LinkedIn » buttons shown first in the links editor: the platforms suggested for the freelancer's trade (lib/social/platforms
// RECOMMENDED_BY_SECTOR). DS secondary-sm Button, one per suggested platform. A platform already added is NOT offered again; the caller passes only
// what is still free. Picking one hands its id back — the editor adds a row pre-set to it. The « + » is an icon: as text it is bidi-neutral and lands
// on the wrong side of the name in Arabic.
export function RecommendedPlatforms({
  platforms,
  onPick,
  lang,
}: {
  platforms: readonly PlatformId[]
  onPick: (platform: PlatformId) => void
  lang: Lang
}) {
  if (platforms.length === 0) return null
  return (
    <div role="group" aria-label={t('links.editor.suggested', lang)} className="flex flex-wrap gap-2">
      {platforms.map((id) => {
        const name = platformName(id, lang === 'ar' ? 'ar' : 'fr')
        return (
          <Button key={id} variant="secondary" size="sm" onClick={() => onPick(id)} aria-label={t('links.editor.add_named', lang, { platform: name })}>
            <Plus className="size-4" aria-hidden="true" />
            {name}
          </Button>
        )
      })}
    </div>
  )
}
