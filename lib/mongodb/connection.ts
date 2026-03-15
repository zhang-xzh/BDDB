import {MongoClient, Document} from 'mongodb'

const MONGO_HOST = process.env.MONGO_HOST || 'localhost'
const MONGO_PORT = process.env.MONGO_PORT || '27017'
const NODE_ENV = process.env.NODE_ENV || 'development'

// 产品数据库：固定 suruga_ya，所有环境相同
const SURUGA_YA_DB = process.env.SURUGA_YA_DB || 'suruga_ya'

// Bangumi 离线数据库：固定 bangumi，所有环境相同
const BANGUMI_DB = process.env.BANGUMI_DB || 'bangumi'

// BDDB 运营数据库：按环境区分
function resolveBddbDbName(): string {
    if (NODE_ENV === 'production') {
        return process.env.MONGO_DB_PROD || 'bddb_prod'
    }
    if (NODE_ENV === 'test') {
        return process.env.MONGO_DB_TEST || 'bddb_test'
    }
    return process.env.MONGO_DB_DEV || 'bddb_dev'
}

const BDDB_DB = resolveBddbDbName()
const MONGO_URI = process.env.MONGO_URI || `mongodb://${MONGO_HOST}:${MONGO_PORT}`

const g = global as typeof globalThis & {_mongoClient?: MongoClient}

export function getMongoClient(): MongoClient {
    if (!g._mongoClient) {
        g._mongoClient = new MongoClient(MONGO_URI)
        console.log(`[mongodb] Connecting to ${MONGO_URI}, suruga_ya=${SURUGA_YA_DB}, bangumi=${BANGUMI_DB}, bddb=${BDDB_DB}, env=${NODE_ENV}`)
    }
    return g._mongoClient
}

export async function ensureMongoConnected(): Promise<void> {
    const client = getMongoClient()
    try {
        await client.db().admin().ping()
        console.log('[mongodb] Connected successfully')
    } catch (error) {
        console.error('[mongodb] Connection failed:', error)
        throw error
    }
}

// BDDB 运营数据集合（torrents/volumes/medias），按环境使用 bddb_prod/bddb_dev/bddb_test
export function getMongoCollection<T extends Document = Document>(collectionName: string): import('mongodb').Collection<T> {
    return getMongoClient().db(BDDB_DB).collection<T>(collectionName)
}

// 产品数据集合（suruga_ya），所有环境固定同一数据库
export function getSurugaYaCollection<T extends Document = Document>(collectionName: string): import('mongodb').Collection<T> {
    return getMongoClient().db(SURUGA_YA_DB).collection<T>(collectionName)
}

// Bangumi 离线数据集合（bangumi），所有环境固定同一数据库
export function getBangumiCollection<T extends Document = Document>(collectionName: string): import('mongodb').Collection<T> {
    return getMongoClient().db(BANGUMI_DB).collection<T>(collectionName)
}
