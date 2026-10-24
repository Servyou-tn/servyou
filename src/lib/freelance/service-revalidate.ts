import { revalidatePath } from 'next/cache'

// Every surface a service's status reaches — shared by the H5 write actions (app/actions/services.ts) and
// H6's « Publier mon service » (app/mes-services/creer/actions.ts). Lives in a plain module because a
// 'use server' file may export only async functions (a sync export would itself become a server action).
//
// `/freelance/[id]` is revalidated too (D4): a status change can flip freelancer_profiles.is_published via
// sync_freelancer_is_published, and that route is a dynamic segment — `revalidatePath` needs the CONCRETE
// path or it silently no-ops.
export function revalidateServiceSurfaces(freelancerProfileId: string) {
  revalidatePath('/mes-services')
  revalidatePath('/tableau-de-bord')
  revalidatePath('/marche/services')
  revalidatePath(`/freelance/${freelancerProfileId}`)
}
