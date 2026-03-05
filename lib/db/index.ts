// NeDB 数据库连接模块（持久化存储）
import Datastore from '@seald-io/nedb'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data')
const databases: Record<string, Datastore<any>> = {}

export function getDb(collection: string): Datastore<any> {
  if (!databases[collection]) {
    databases[collection] = new Datastore({
      filename: path.join(DATA_PATH, `${collection}.nedb`),
      autoload: true,
    })
    databases[collection].setAutocompactionInterval(1000)
  }
  return databases[collection]
}

export function initDb() {
  const torrentsDb = getDb('torrents')
  torrentsDb.ensureIndex({ fieldName: 'hash', unique: true }, () => {})
  torrentsDb.ensureIndex({ fieldName: 'is_deleted' }, () => {})
  const filesDb = getDb('files')
  filesDb.ensureIndex({ fieldName: 'torrent_id' }, () => {})
  filesDb.ensureIndex({ fieldName: 'is_deleted' }, () => {})
  const volumesDb = getDb('volumes')
  volumesDb.ensureIndex({ fieldName: 'torrent_id' }, () => {})
  volumesDb.ensureIndex({ fieldName: 'files' }, () => {})
  volumesDb.ensureIndex({ fieldName: 'is_deleted' }, () => {})
  volumesDb.ensureIndex({ fieldName: 'volume_no' }, () => {})
  console.log('NeDB initialized')
}

export * from './schema'
