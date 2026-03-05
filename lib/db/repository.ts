import { getDb } from './index'
import type { Torrent, TorrentFile, Volume, QueryCondition } from './schema'

const now = () => Math.floor(Date.now() / 1000)

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
        ? getDb('torrents').update({ hash: data.hash! }, { $set: doc }, {}, (err) => err ? reject(err) : resolve())
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

export function deleteVolumesByTorrent(torrentId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('volumes').remove({ torrent_id: torrentId }, { multi: true }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function getVolumesByTorrent(torrentId: string): Promise<Volume[]> {
  return new Promise((resolve, reject) => {
    const db = getDb('volumes')
    db.ensureIndex({ fieldName: 'torrent_id' }, () => {})
    db.ensureIndex({ fieldName: 'is_deleted' }, () => {})
    db.find({ torrent_id: torrentId, is_deleted: { $ne: true } })
      .sort({ volume_no: 1, sort_order: 1 }).exec((err, docs) => {
        if (err) reject(err)
        else resolve(docs as Volume[])
      })
  })
}

export function getVolumesByFile(fileId: string): Promise<Volume[]> {
  return new Promise((resolve, reject) => {
    const db = getDb('volumes')
    db.ensureIndex({ fieldName: 'files' }, () => {})
    db.ensureIndex({ fieldName: 'is_deleted' }, () => {})
    db.find({ files: fileId, is_deleted: { $ne: true } })
      .sort({ volume_no: 1, sort_order: 1 }).exec((err, docs) => {
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

export function getVolumesByBoxId(): Promise<Volume[]> {
  return Promise.resolve([])
}

export async function saveVolume(torrentId: string, files: string[], data: Partial<Volume>): Promise<void> {
  const doc = {
    torrent_id: torrentId,
    files: files,
    type: data.type || 'volume',
    volume_no: data.volume_no || 0,
    sort_order: data.sort_order || 0,
    volume_name: data.volume_name || '',
    catalog_no: data.catalog_no || '',
    suruga_id: data.suruga_id || '',
    note: data.note || '',
    is_deleted: false,
    updated_at: now(),
  }
  return new Promise((resolve, reject) => {
    getDb('volumes').findOne({ torrent_id: torrentId, volume_no: data.volume_no }, (err, existing) => {
      if (err) return reject(err)
      const op = existing
        ? getDb('volumes').update({ torrent_id: torrentId, volume_no: data.volume_no }, { $set: doc }, {}, (err) => err ? reject(err) : resolve())
        : getDb('volumes').insert({ ...doc, created_at: now() }, (err) => err ? reject(err) : resolve())
    })
  })
}

export function clearAllData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbs = ['torrents', 'files', 'volumes']
    let completed = 0
    dbs.forEach(dbName => {
      const db = getDb(dbName)
      db.remove({}, { multi: true }, (err) => {
        if (err) return reject(err)
        completed++
        if (completed === dbs.length) resolve()
      })
    })
  })
}

// TorrentFile CRUD
export function saveTorrentFiles(torrentId: string, files: Partial<TorrentFile>[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDb('files')
    const nowTs = now()
    const docs = files.map(f => ({
      ...f,
      torrent_id: torrentId,
      is_deleted: f.is_deleted ?? false,
      synced_at: f.synced_at ?? nowTs,
    }))

    // 先删除旧文件，再插入新文件
    db.remove({ torrent_id: torrentId }, { multi: true }, (err) => {
      if (err) return reject(err)
      if (docs.length === 0) return resolve()

      // 分批插入，避免堆栈溢出
      const batchSize = 100
      let inserted = 0

      const insertBatch = (index: number) => {
        const batch = docs.slice(index, index + batchSize)
        if (batch.length === 0) {
          resolve()
          return
        }
        db.insert(batch, (err) => {
          if (err) return reject(err)
          inserted += batch.length
          if (inserted >= docs.length) {
            resolve()
          } else {
            insertBatch(index + batchSize)
          }
        })
      }

      insertBatch(0)
    })
  })
}

export function getTorrentFiles(torrentId: string): Promise<TorrentFile[]> {
  return new Promise((resolve, reject) => {
    const db = getDb('files')
    // 确保索引存在
    db.ensureIndex({ fieldName: 'torrent_id' }, () => {})
    db.ensureIndex({ fieldName: 'is_deleted' }, () => {})
    // 简化查询条件，避免 $or 导致的全表扫描
    db.find({ torrent_id: torrentId, is_deleted: { $ne: true } })
      .sort({ name: 1 }).exec((err, docs) => {
        if (err) reject(err)
        else resolve(docs as TorrentFile[])
      })
  })
}

export function softDeleteTorrentFiles(torrentId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb('files').update(
      { torrent_id: torrentId },
      { $set: { is_deleted: true, synced_at: now() } },
      { multi: true },
      (err) => err ? reject(err) : resolve()
    )
  })
}
