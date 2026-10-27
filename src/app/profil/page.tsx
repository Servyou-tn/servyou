import { redirect } from 'next/navigation'

// Legacy stub (was a « bientôt disponible » card). « Mon profil » in the topbar menu still links here, so the route stays and
// forwards to /mon-compte — the real account surface (I1). A logged-out visitor is bounced to sign-in by /mon-compte's own guard.
export default function ProfilPage() {
  redirect('/mon-compte')
}
