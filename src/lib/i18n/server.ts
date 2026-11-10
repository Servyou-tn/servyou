import { cookies } from 'next/headers'
import { LANG_COOKIE, toLang, type Lang } from './index'

/** Read the current language from the cookie. Server components only. */
export async function getLang(): Promise<Lang> {
  const jar = await cookies()
  const val = jar.get(LANG_COOKIE)?.value
  return toLang(val)
}
