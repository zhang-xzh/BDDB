/**
 * 后端 API 测试 - volumes 相关
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getVolumesByTorrent, getVolumesByFile, saveVolume, addVolume } from '#server/db/repository'
import { getDb } from '#server/db/index'

// 模拟 NeDB
vi.mock('#server/db/index', () => ({
  getDb: vi.fn()
}))

describe('Volumes API', () => {
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

  describe('getVolumesByTorrent', () => {
    it('应该根据 torrent_id 获取卷列表', async () => {
      const mockVolumes = [
        { _id: 'vol-1', torrent_id: 'torrent-123', volume_no: 1, files: ['file-1'] },
        { _id: 'vol-2', torrent_id: 'torrent-123', volume_no: 2, files: ['file-2'] }
      ]

      mockDb.exec.mockImplementation((callback) => {
        callback(null, mockVolumes)
      })

      const volumes = await getVolumesByTorrent('torrent-123')

      expect(getDb).toHaveBeenCalledWith('volumes')
      expect(mockDb.find).toHaveBeenCalledWith({ torrent_id: 'torrent-123', is_deleted: false })
      expect(mockDb.sort).toHaveBeenCalledWith({ volume_no: 1, sort_order: 1 })
      expect(volumes).toEqual(mockVolumes)
    })

    it('应该处理空结果', async () => {
      mockDb.exec.mockImplementation((callback) => {
        callback(null, [])
      })

      const volumes = await getVolumesByTorrent('torrent-123')

      expect(volumes).toEqual([])
    })

    it('应该处理错误', async () => {
      const error = new Error('DB error')
      mockDb.exec.mockImplementation((callback) => {
        callback(error)
      })

      await expect(getVolumesByTorrent('torrent-123')).rejects.toThrow('DB error')
    })
  })

  describe('getVolumesByFile', () => {
    it('应该根据文件 ID 获取卷列表', async () => {
      const mockVolumes = [
        { _id: 'vol-1', torrent_id: 'torrent-123', volume_no: 1, files: ['file-1', 'file-2'] }
      ]

      mockDb.exec.mockImplementation((callback) => {
        callback(null, mockVolumes)
      })

      const volumes = await getVolumesByFile('file-1')

      expect(getDb).toHaveBeenCalledWith('volumes')
      expect(mockDb.find).toHaveBeenCalledWith({ files: 'file-1', is_deleted: false })
      expect(volumes).toEqual(mockVolumes)
    })

    it('应该处理文件不属于任何卷的情况', async () => {
      mockDb.exec.mockImplementation((callback) => {
        callback(null, [])
      })

      const volumes = await getVolumesByFile('file-999')

      expect(volumes).toEqual([])
    })
  })

  describe('saveVolume', () => {
    const mockTorrentId = 'torrent-123'
    const mockFiles = ['file-1', 'file-2']
    const mockVolumeData = {
      type: 'volume' as const,
      volume_no: 1,
      sort_order: 1,
      catalog_no: 'ABC-001',
      volume_name: 'Test Volume'
    }

    it('应该插入新卷', async () => {
      mockDb.findOne.mockImplementation((query, callback) => {
        callback(null, null) // 不存在
      })

      mockDb.insert.mockImplementation((doc, callback) => {
        callback(null, { ...doc, _id: 'new-id' })
      })

      await saveVolume(mockTorrentId, mockFiles, mockVolumeData)

      expect(mockDb.findOne).toHaveBeenCalledWith(
        { torrent_id: mockTorrentId, volume_no: mockVolumeData.volume_no },
        expect.any(Function)
      )
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('应该更新已存在的卷', async () => {
      const existingVolume = { _id: 'vol-1', torrent_id: mockTorrentId, volume_no: 1 }

      mockDb.findOne.mockImplementation((query, callback) => {
        callback(null, existingVolume)
      })

      mockDb.update.mockImplementation((query, update, options, callback) => {
        callback(null, 1)
      })

      await saveVolume(mockTorrentId, mockFiles, mockVolumeData)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('应该使用默认值处理缺失的字段', async () => {
      mockDb.findOne.mockImplementation((query, callback) => {
        callback(null, null)
      })

      mockDb.insert.mockImplementation((doc, callback) => {
        // 验证默认值
        expect(doc.type).toBe('volume')
        expect(doc.volume_no).toBe(0)
        expect(doc.sort_order).toBe(0)
        expect(doc.catalog_no).toBe('')
        callback(null, doc)
      })

      await saveVolume(mockTorrentId, mockFiles, {})
    })
  })
})
