// The 24 Tunisian governorates: the canonical `city` value plus its FR/AR
// display label. `value` is exactly what gets written to profiles.city — it
// matches the strings the original /signup form wrote, so existing accounts and
// any city filtering stay consistent. Do NOT rename a value (notably "Le Kef"
// keeps its French article); renaming would silently drift stored data. The
// array is ordered alphabetically by the French label for the select; the form
// renders the fr or ar label per the active locale.
export type Governorate = {
  /** Canonical stored value (profiles.city). Never change — would drift data. */
  value: string
  /** French display label. */
  fr: string
  /** Arabic display label. */
  ar: string
}

export const GOVERNORATES: readonly Governorate[] = [
  { value: 'Ariana', fr: 'Ariana', ar: 'أريانة' },
  { value: 'Béja', fr: 'Béja', ar: 'باجة' },
  { value: 'Ben Arous', fr: 'Ben Arous', ar: 'بن عروس' },
  { value: 'Bizerte', fr: 'Bizerte', ar: 'بنزرت' },
  { value: 'Gabès', fr: 'Gabès', ar: 'قابس' },
  { value: 'Gafsa', fr: 'Gafsa', ar: 'قفصة' },
  { value: 'Jendouba', fr: 'Jendouba', ar: 'جندوبة' },
  { value: 'Kairouan', fr: 'Kairouan', ar: 'القيروان' },
  { value: 'Kasserine', fr: 'Kasserine', ar: 'القصرين' },
  { value: 'Kébili', fr: 'Kébili', ar: 'قبلي' },
  { value: 'Le Kef', fr: 'Le Kef', ar: 'الكاف' },
  { value: 'Mahdia', fr: 'Mahdia', ar: 'المهدية' },
  { value: 'Manouba', fr: 'Manouba', ar: 'منوبة' },
  { value: 'Médenine', fr: 'Médenine', ar: 'مدنين' },
  { value: 'Monastir', fr: 'Monastir', ar: 'المنستير' },
  { value: 'Nabeul', fr: 'Nabeul', ar: 'نابل' },
  { value: 'Sfax', fr: 'Sfax', ar: 'صفاقس' },
  { value: 'Sidi Bouzid', fr: 'Sidi Bouzid', ar: 'سيدي بوزيد' },
  { value: 'Siliana', fr: 'Siliana', ar: 'سليانة' },
  { value: 'Sousse', fr: 'Sousse', ar: 'سوسة' },
  { value: 'Tataouine', fr: 'Tataouine', ar: 'تطاوين' },
  { value: 'Tozeur', fr: 'Tozeur', ar: 'توزر' },
  { value: 'Tunis', fr: 'Tunis', ar: 'تونس' },
  { value: 'Zaghouan', fr: 'Zaghouan', ar: 'زغوان' },
] as const
