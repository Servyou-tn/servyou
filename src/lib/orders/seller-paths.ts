// The routes a seller-side order transition may ask to have revalidated. A plain module, not the
// 'use server' action file, because a server-action file may export only async functions — and both the
// action (z.enum) and its client buttons need the same list.
//
// A fixed allow-list rather than an arbitrary string from the client: `revalidatePath` takes a route, and
// letting a caller name any route is a needless capability. G4 / G8 / G9 are the shop owner's pages,
// /mes-engagements (H8) the freelancer's. Detail routes are revalidated by id inside the action instead.
export const SELLER_ORDER_PATHS = ['/tableau-de-bord-vendeur', '/commandes-recues', '/mes-engagements'] as const
export type SellerOrderPath = (typeof SELLER_ORDER_PATHS)[number]
