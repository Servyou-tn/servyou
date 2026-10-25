import { z } from 'zod'

/** Whether a route segment can be a uuid at all — a malformed one would reach PostgREST as a 22P02 and 500 instead of 404. */
export const isUuid = (value: string): boolean => z.string().uuid().safeParse(value).success
