/**
 * 后端 API 测试 - files 相关
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTorrentFiles, saveTorrentFiles, getTorrent } from '#server/db/repository'
import { getDb } from '#server/db/index'

vi.mock('#server/db/index', () => ({
  getDb: vi.fn()
}))

describe('Files API', () => {
  const mockDb = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    exec: vi.fn(),
    findOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as any)
  })

  describe('getTorrentFiles', () => {
    it('应该根据 torrent_id 获取文件列表', async () => {
      const mockFiles = [
        { _id: 'file-1', name: 'BDMV/INDEX.BDMV', size: 100, torrent_id: 'torrent-123' },
        { _id: 'file-2', name: 'BDMV/Movie.m2ts', size: 500000, torrent_id: 'torrent-123' }
      ]

      mockDb.exec.mockImplementation((callback) => {
        callback(null, mockFiles)
      })

      const files = await getTorrentFiles('torrent-123')

      expect(getDb).toHaveBeenCalledWith('files')
      expect(mockDb.find).toHaveBeenCalledWith({ torrent_id: 'torrent-123', is_deleted: false })
      expect(mockDb.sort).toHaveBeenCalledWith({ name: 1 })
      expect(files).toEqual(mockFiles)
    })

    it('应该处理空结果', async () => {
      mockDb.exec.mockImplementation((callback) => {
        callback(null, [])
      })

      const files = await getTorrentFiles('torrent-123')
      expect(files).toEqual([])
    })
  })

  describe('saveTorrentFiles', () => {
    it('应该先删除旧文件再插入新文件', async () => {
      const mockFiles = [
        { name: 'file1.txt', size: 100 },
        { name: 'file2.txt', size: 200 }
      ]

      mockDb.remove.mockImplementation((query, options, callback) => {
        callback(null, 2) // 删除了 2 个旧文件
      })

      mockDb.insert.mockImplementation((docs, callback) => {
        callback(null, docs)
      })

      await saveTorrentFiles('torrent-123', mockFiles as any)

      expect(mockDb.remove).toHaveBeenCalledWith({ torrent_id: 'torrent-123' }, { multi: true }, expect.any(Function))
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('应该为文件添加必要的字段', async () => {
      mockDb.remove.mockImplementation((query, options, callback) => {
        callback(null, 0)
      })

      mockDb.insert.mockImplementation((docs, callback) => {
        // 验证字段
        docs.forEach((doc: any) => {
          expect(doc.torrent_id).toBe('torrent-123')
          expect(doc.is_deleted).toBe(false)
          expect(doc.synced_at).toBeDefined()
        })
        callback(null, docs)
      })

      await saveTorrentFiles('torrent-123', [{ name: 'test.txt', size: 100 }] as any)
    })
  })

  describe('getTorrent', () => {
    it('应该根据 hash 获取 torrent', async () => {
      const mockTorrent = { _id: 'torrent-123', hash: 'abc123', name: 'Test' }

      mockDb.findOne.mockImplementation((query, callback) => {
        callback(null, mockTorrent)
      })

      const torrent = await getTorrent('abc123')

      expect(getDb).toHaveBeenCalledWith('torrents')
      expect(mockDb.findOne).toHaveBeenCalledWith({ hash: 'abc123' }, expect.any(Function))
      expect(torrent).toEqual(mockTorrent)
    })

    it('应该处理 torrent 不存在的情况', async () => {
      mockDb.findOne.mockImplementation((query, callback) => {
        callback(null, null)
      })

      const torrent = await getTorrent('invalid-hash')
      expect(torrent).toBeNull()
    })
  })
})
