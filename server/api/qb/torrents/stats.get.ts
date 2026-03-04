import { defineEventHandler } from 'h3'
import { getAllTorrents } from '#server/db/repository'

export default defineEventHandler(async () => {
  const torrents = await getAllTorrents()
  const stats = {
    total: torrents.length,
    downloading: torrents.filter(t => t.state === 'downloading').length,
    seeding: torrents.filter(t => t.state === 'uploading').length,
    paused: torrents.filter(t => t.state.includes('paused')).length,
    total_size: torrents.reduce((acc, t) => acc + (t.size || 0), 0),
  }
  return { success: true, data: JSON.stringify(stats) }
})
