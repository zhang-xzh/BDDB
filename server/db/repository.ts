import { getDb } from './index'
import type { Torrent, Volume, QueryCondition } from './schema'

const now = () => Math.floor(Date.now() / 1000)

export function initDb() {
  const torrentsDb = getDb('torrents')
  torrentsDb.ensureIndex({ fieldName: 'hash', unique: true }, () => {})
  torrentsDb.ensureIndex({ fieldName: 'is_deleted' }, () => {})
  const volumesDb = getDb('volumes')
  volumesDb.ensureIndex({ fieldName: 'torrent_hash' }, () => {})
  volumesDb.ensureIndex({ fieldName: 'box_id' }, () => {})
  console.log('NeDB initialized')
}

export function torrentExists(hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    getDb('torrents').findOne({ hash, is_deleted: false }, (err, doc) => {
      if (err) reject(err)
      else resolve(!!doc)
    })
  })
}

export async function addTorrent(data: Partial<Torrent>) {
  const doc = { ...data, synced_at: now() }
  return new Promise<void>((resolve, reject) => {
    getDb('torrents').findOne({ hash: data.hash }, (err, existing) => {
      if (err) return reject(err)
      const op = existing
        ? getDb('torrents').update({ hash: data.hash }, { $set: doc }, {}, (err) => err ? reject(err) : resolve())
        : getDb('torrents').insert(doc, (err) => err ? reject(err) : resolve())
    })
  })
}

export function updateTorrentStatus(hash: string, data: Partial<Torrent>): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('torrents').update({ hash }, { $set: { ...data, synced_at: now() } }, {}, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function softDeleteTorrent(hash: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('torrents').update({ hash }, { $set: { is_deleted: true, synced_at: now() } }, {}, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function getTorrent(hash: string): Promise<Torrent | null> {
  return new Promise((resolve, reject) => {
    getDb('torrents').findOne({ hash }, (err, doc) => {
      if (err) reject(err)
      else resolve(doc as Torrent | null)
    })
  })
}

export function getAllTorrents(includeDeleted = false): Promise<Torrent[]> {
  return new Promise((resolve, reject) => {
    const query: QueryCondition = includeDeleted ? {} : { is_deleted: false }
    getDb('torrents').find(query).sort({ added_on: -1 }).exec((err, docs) => {
      if (err) reject(err)
      else resolve(docs as Torrent[])
    })
  })
}

export function searchTorrents(keyword: string): Promise<Torrent[]> {
  return new Promise((resolve, reject) => {
    getDb('torrents').find({ is_deleted: false, name: { $regex: keyword, $options: 'i' } })
      .sort({ added_on: -1 }).exec((err, docs) => {
        if (err) reject(err)
        else resolve(docs as Torrent[])
      })
  })
}

export function addVolume(data: Partial<Volume>): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('volumes').insert({ ...data, created_at: now(), updated_at: now() }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function updateVolume(id: string, data: Partial<Volume>): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('volumes').update({ _id: id }, { $set: { ...data, updated_at: now() } }, {}, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function deleteVolume(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('volumes').remove({ _id: id }, {}, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function deleteVolumesByTorrent(hash: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('volumes').remove({ torrent_hash: hash }, { multi: true }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function getVolumesByTorrent(hash: string): Promise<Volume[]> {
  return new Promise((resolve, reject) => {
    getDb('volumes').find({ torrent_hash: hash }).sort({ volume_no: 1, sort_order: 1 }).exec((err, docs) => {
      if (err) reject(err)
      else resolve(docs as Volume[])
    })
  })
}

export function getVolumeById(id: string): Promise<Volume | null> {
  return new Promise((resolve, reject) => {
    getDb('volumes').findOne({ _id: id }, (err, doc) => {
      if (err) reject(err)
      else resolve(doc as Volume | null)
    })
  })
}

export function getAllVolumes(): Promise<Volume[]> {
  return new Promise((resolve, reject) => {
    getDb('volumes').find({}).sort({ created_at: -1 }).exec((err, docs) => {
      if (err) reject(err)
      else resolve(docs as Volume[])
    })
  })
}

export function getVolumesByBoxId(boxId: string): Promise<Volume[]> {
  return new Promise((resolve, reject) => {
    getDb('volumes').find({ box_id: boxId }).sort({ sort_order: 1, volume_no: 1 }).exec((err, docs) => {
      if (err) reject(err)
      else resolve(docs as Volume[])
    })
  })
}

export async function saveVolume(torrentHash: string, data: Partial<Volume>): Promise<void> {
  const doc = {
    torrent_hash: torrentHash,
    box_id: data.box_id || '',
    type: data.type || 'volume',
    volume_no: data.volume_no || 0,
    sort_order: data.sort_order || 0,
    volume_name: data.volume_name || '',
    catalog_no: data.catalog_no || '',
    suruga_id: data.suruga_id || '',
    note: data.note || '',
    updated_at: now(),
  }
  return new Promise((resolve, reject) => {
    getDb('volumes').findOne({ torrent_hash: torrentHash }, (err, existing) => {
      if (err) return reject(err)
      const op = existing
        ? getDb('volumes').update({ torrent_hash: torrentHash }, { $set: doc }, {}, (err) => err ? reject(err) : resolve())
        : getDb('volumes').insert({ ...doc, created_at: now() }, (err) => err ? reject(err) : resolve())
    })
  })
}
