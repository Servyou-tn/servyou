// The terms + privacy version that « Finalisez votre compte » shows and stores. It must equal the database's
// private.current_terms_version() (migration 20261115222457_two_step_signup.sql): complete_my_account refuses any other
// value (hint terms_outdated). The two dates are the « Mise à jour » lines of /conditions (legal.updatedDate, 17 juin 2026)
// and /confidentialite (legal.privacy.updatedDate, 14 novembre 2026).
//
// When either document changes: bump this AND the database function (a migration). terms-version.test.ts fails until the
// constant, both page dates and the migration agree.
export const TERMS_VERSION = 'cgu-2026-06-17+confidentialite-2026-11-14'
