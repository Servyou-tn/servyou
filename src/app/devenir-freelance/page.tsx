import { permanentRedirect } from 'next/navigation'

// /devenir-freelance's content moved to /devenir-vendeur/freelance (the shared role-choice
// entry at /devenir-vendeur now sits in front of both pitches). A 308 keeps any bookmarked
// or externally-linked URL working, per SEO discipline.
export default function DevenirFreelanceRedirect(): never {
  permanentRedirect('/devenir-vendeur/freelance')
}
