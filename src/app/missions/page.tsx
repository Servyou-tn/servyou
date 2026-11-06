import { redirect } from 'next/navigation'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveRole } from '@/lib/roles'

// /missions — the « Missions » link in the public header, the footer, the landing and the admin reports (journey G5,
// docs/discovery/journeys-2026-11-07.md). It used to redirect everyone to /trouver-des-missions, which is freelancer-only
// (requireFreelancer), so a client was bounced to /devenir-vendeur. Now each viewer lands on their own missions page:
//   • a freelancer → the board, /trouver-des-missions;
//   • any other signed-in user (a client, a shop owner) → the missions they posted, /mes-annonces;
//   • signed out → sign in, then back here to be sent the right way.
// No markup: a server redirect per request (307), as the old config redirect was.
export const dynamic = 'force-dynamic'

export default async function MissionsIndex() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent('/missions')}`)
  redirect(resolveRole(shell.topBarUser) === 'freelancer' ? '/trouver-des-missions' : '/mes-annonces')
}
