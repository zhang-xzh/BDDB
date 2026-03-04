/**
 * API Handler 测试 - 测试实际的 HTTP 端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock repository
vi.mock('#server/db/repository', () => ({
  getVolumesByTorrent: vi.fn(),
  getVolumesByFile: vi.fn(),
  getAllVolumes: vi.fn(),
  saveVolume: vi.fn(),
  getTorrent: vi.fn(),
  getTorrentFiles: vi.fn()
}))

// Mock h3
const mockGetQuery = vi.fn()
const mockReadBody = vi.fn()

vi.mock('h3', () => ({
  defineEventHandler: vi.fn((fn) => fn),
  getQuery: vi.fn((event) => mockGetQuery(event)),
  readBody: vi.fn((event) => mockReadBody(event))
}))

import { getVolumesByTorrent, getVolumesByFile, getAllVolumes, saveVolume, getTorrent, getTorrentFiles } from '#server/db/repository'

describe('API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/volumes', () => {
    it('应该通过 torrent_id 获取卷', async () => {
      const { default: handler } = await import('#server/api/volumes/index.get')
      const mockVolumes = [{ _id: 'vol-1', torrent_id: 't1', volume_no: 1 }]
      
      vi.mocked(getVolumesByTorrent).mockResolvedValue(mockVolumes as any)
      mockGetQuery.mockReturnValue({ torrent_id: 't1' })

      const result = await handler({} as any)

      expect(result).toEqual({ success: true, data: JSON.stringify(mockVolumes) })
      expect(getVolumesByTorrent).toHaveBeenCalledWith('t1')
    })

    it('应该通过 torrent_file_id 获取卷', async () => {
      const { default: handler } = await import('#server/api/volumes/index.get')
      const mockVolumes = [{ _id: 'vol-1', files: ['f1'] }]
      
      vi.mocked(getVolumesByFile).mockResolvedValue(mockVolumes as any)
      mockGetQuery.mockReturnValue({ torrent_file_id: 'f1' })

      const result = await handler({} as any)

      expect(result).toEqual({ success: true, data: JSON.stringify(mockVolumes) })
      expect(getVolumesByFile).toHaveBeenCalledWith('f1')
    })

    it('应该获取所有卷当没有参数时', async () => {
      const { default: handler } = await import('#server/api/volumes/index.get')
      const mockVolumes = [{ _id: 'vol-1' }]
      
      vi.mocked(getAllVolumes).mockResolvedValue(mockVolumes as any)
      mockGetQuery.mockReturnValue({})

      const result = await handler({} as any)

      expect(result).toEqual({ success: true, data: JSON.stringify(mockVolumes) })
    })
  })

  describe('GET /api/torrents/bd-info', () => {
    it('应该返回错误当缺少 torrent_file_id', async () => {
      const { default: handler } = await import('#server/api/torrents/bd-info.get')
      mockGetQuery.mockReturnValue({})

      const result = await handler({} as any)

      expect(result).toEqual({ success: false, error: 'Missing torrent_file_id' })
    })

    it('应该通过 torrent_file_id 获取卷信息', async () => {
      const { default: handler } = await import('#server/api/torrents/bd-info.get')
      const mockVolumes = [{ _id: 'vol-1', files: ['f1'], volume_no: 1 }]
      
      vi.mocked(getVolumesByFile).mockResolvedValue(mockVolumes as any)
      mockGetQuery.mockReturnValue({ torrent_file_id: 'f1' })

      const result = await handler({} as any)

      expect(result).toEqual({ success: true, data: JSON.stringify(mockVolumes) })
    })
  })

  describe('POST /api/torrents/bd-info', () => {
    it('应该返回错误当缺少必要参数', async () => {
      const { default: handler } = await import('#server/api/torrents/bd-info.post')
      mockGetQuery.mockReturnValue({})
      mockReadBody.mockResolvedValue({})

      const result = await handler({} as any)

      expect(result).toEqual({ success: false, error: 'Missing torrent_id or files' })
    })

    it('应该保存卷数据', async () => {
      const { default: handler } = await import('#server/api/torrents/bd-info.post')
      mockGetQuery.mockReturnValue({ torrent_id: 't1' })
      mockReadBody.mockResolvedValue({ 
        files: ['f1', 'f2'], 
        volume_no: 1, 
        catalog_no: 'ABC-001' 
      })

      vi.mocked(saveVolume).mockResolvedValue()

      const result = await handler({} as any)

      expect(result).toEqual({ success: true, data: 'ok' })
      expect(saveVolume).toHaveBeenCalledWith('t1', ['f1', 'f2'], { volume_no: 1, catalog_no: 'ABC-001' })
    })
  })

  describe('POST /api/volumes', () => {
    it('应该返回错误当缺少 torrent_id', async () => {
      const { default: handler } = await import('#server/api/volumes/index.post')
      mockReadBody.mockResolvedValue({})

      const result = await handler({} as any)

      expect(result).toEqual({ success: false, error: 'Missing torrent_id or files' })
    })

    it('应该返回错误当缺少 volumes', async () => {
      const { default: handler } = await import('#server/api/volumes/index.post')
      mockReadBody.mockResolvedValue({ torrent_id: 't1', files: ['f1'] })

      const result = await handler({} as any)

      expect(result).toEqual({ success: false, error: 'Missing volumes' })
    })

    it('应该保存多个卷', async () => {
      const { default: handler } = await import('#server/api/volumes/index.post')
      mockReadBody.mockResolvedValue({ 
        torrent_id: 't1', 
        files: ['f1', 'f2'],
        volumes: [
          { volume_no: 1, catalog_no: 'ABC-001' },
          { volume_no: 2, catalog_no: 'ABC-002' }
        ]
      })

      vi.mocked(saveVolume).mockResolvedValue()

      const result = await handler({} as any)

      expect(result).toEqual({ success: true, data: 'ok' })
      expect(saveVolume).toHaveBeenCalledTimes(2)
    })
  })

  describe('GET /api/torrents/files', () => {
    it('应该返回错误当缺少 hash', async () => {
      const { default: handler } = await import('#server/api/torrents/files.get')
      mockGetQuery.mockReturnValue({})

      const result = await handler({} as any)

      expect(result).toEqual({ success: false, error: 'Missing hash' })
    })

    it('应该返回错误当 torrent 不存在', async () => {
      const { default: handler } = await import('#server/api/torrents/files.get')
      mockGetQuery.mockReturnValue({ hash: 'abc123' })
      vi.mocked(getTorrent).mockResolvedValue(null)

      const result = await handler({} as any)

      expect(result).toEqual({ success: false, error: 'Torrent not found' })
    })

    it('应该获取文件列表', async () => {
      const { default: handler } = await import('#server/api/torrents/files.get')
      mockGetQuery.mockReturnValue({ hash: 'abc123' })
      
      vi.mocked(getTorrent).mockResolvedValue({ _id: 't1', hash: 'abc123' } as any)
      vi.mocked(getTorrentFiles).mockResolvedValue([
        { _id: 'f1', name: 'file1.txt', size: 100 }
      ] as any)

      const result = await handler({} as any)

      expect(result).toEqual({ 
        success: true, 
        data: JSON.stringify([{ _id: 'f1', name: 'file1.txt', size: 100 }]) 
      })
    })
  })
})
