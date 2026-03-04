// NeDB 数据库连接模块（持久化存储）
import Datastore from '@seald-io/nedb'
import { join } from 'path'

const DATA_PATH = join(process.cwd(), 'data')
const databases: Record<string, Datastore<any>> = {}

export function getDb(collection: string): Datastore<any> {
  if (!databases[collection]) {
    databases[collection] = new Datastore({
      filename: join(DATA_PATH, `${collection}.nedb`),
      autoload: true,
    })
    databases[collection].setAutocompactionInterval(1000)
  }
  return databases[collection]
}

export function getAllDbs(): Record<string, Datastore<any>> {
  return databases
}

export * from './schema'
