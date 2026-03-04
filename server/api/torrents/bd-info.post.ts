import { defineEventHandler, getQuery, readBody } from 'h3'
import { saveVolume } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const hash = getQuery(event).hash as string
  if (!hash) return { success: false, error: 'Missing hash' }
  const body = await readBody(event)
  await saveVolume(hash, body || {})
  return { success: true, data: 'ok' }
})
