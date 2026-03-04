// NeDB 数据库连接模块（持久化存储）
import Datastore from '@seald-io/nedb'
import { join } from 'path'

const DATA_PATH = join(process.cwd(), 'data')

// 为每个集合创建独立的数据库实例
const databases: Record<string, Datastore<any>> = {}

export function getDb(collection: string): Datastore<any> {
  if (!databases[collection]) {
    databases[collection] = new Datastore({
      filename: join(DATA_PATH, `${collection}.nedb`),
      autoload: true,
    })
    // 移除 _id 字段的下划线前缀显示问题
    databases[collection].persistence.setAutocompactionInterval(1000)
  }
  return databases[collection]
}

// 获取所有数据库实例
export function getAllDbs(): Record<string, Datastore<any>> {
  return databases
}

// 导出 schema 供外部使用
export * from './schema'
