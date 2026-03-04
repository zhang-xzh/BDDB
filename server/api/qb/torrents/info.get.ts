import { defineEventHandler, getQuery } from 'h3'
import { getAllTorrents } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const { state, search } = getQuery(event)
  let torrents = await getAllTorrents()

  if (state) {
    const s = state as string
    torrents = torrents.filter(t => {
      if (s === 'paused') return t.state?.includes('paused')
      if (s === 'completed') return t.progress === 100
      return t.state === s
    })
  }
  if (search) {
    const k = (search as string).toLowerCase()
    torrents = torrents.filter(t => t.name.toLowerCase().includes(k))
  }

  return { success: true, data: JSON.stringify(torrents.map(t => ({ ...t, file_count: t.files?.length || 0 }))) }
})
