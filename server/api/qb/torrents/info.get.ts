import { defineEventHandler, getQuery } from 'h3'
import { getAllTorrents, getTorrent } from '#server/db/repository'

export default defineEventHandler(async (event) => {
  const { state, search, hash } = getQuery(event)
  
  // 如果指定了 hash，返回单个 torrent
  if (hash) {
    const torrent = await getTorrent(hash as string)
    if (!torrent) return { success: false, error: 'Not found' }
    return { success: true, data: JSON.stringify([torrent]) }
  }
  
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

  return { success: true, data: JSON.stringify(torrents) }
})
