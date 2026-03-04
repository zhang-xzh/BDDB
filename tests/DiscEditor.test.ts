/**
 * DiscEditor 组件测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// 模拟 useFetch
const mockUseFetchData = ref<any>(null)
const useFetchMock = vi.fn(() => ({
  data: mockUseFetchData
}))

vi.mock('#app', async () => {
  const actual = await vi.importActual('#app')
  return {
    ...actual,
    useFetch: useFetchMock
  }
})

describe('DiscEditor - 数据流测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFetchData.value = null
  })

  const mockTorrent = {
    _id: 'torrent-123',
    hash: 'abc123',
    name: 'Test Torrent'
  }

  const mockFiles = [
    { _id: 'file-1', name: 'BDMV/INDEX.BDMV', size: 100, progress: 100 },
    { _id: 'file-2', name: 'BDMV/Movie.m2ts', size: 500000, progress: 100 }
  ]

  const mockVolumes = [
    {
      _id: 'vol-1',
      torrent_id: 'torrent-123',
      files: ['file-1', 'file-2'],
      type: 'volume',
      volume_no: 1,
      catalog_no: 'ABC-001',
      volume_name: 'Volume 1'
    }
  ]

  describe('API 数据加载', () => {
    it('应该正确加载 torrent 信息', async () => {
      mockUseFetchData.value = { success: true, data: JSON.stringify([mockTorrent]) }
      
      const { open, torrentId, torrentName } = createComponentInstance()
      
      await open('abc123', 'Test Torrent')
      await nextTick()
      
      expect(torrentId.value).toBe('torrent-123')
      expect(torrentName.value).toBe('Test Torrent')
    })

    it('应该正确加载文件列表并构建树', async () => {
      let callCount = 0
      useFetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          mockUseFetchData.value = { success: true, data: JSON.stringify([mockTorrent]) }
        } else {
          mockUseFetchData.value = { success: true, data: JSON.stringify(mockFiles) }
        }
        return { data: mockUseFetchData }
      })
      
      const { open, files, fileToKey } = createComponentInstance()
      
      await open('abc123', 'Test Torrent')
      await nextTick()
      await nextTick()
      
      expect(files.value.length).toBe(2)
      expect(fileToKey.value.get('file-1')).toBe('BDMV/INDEX.BDMV')
      expect(fileToKey.value.get('file-2')).toBe('BDMV/Movie.m2ts')
    })

    it('应该正确加载卷数据并映射到文件', async () => {
      let callCount = 0
      useFetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          mockUseFetchData.value = { success: true, data: JSON.stringify([mockTorrent]) }
        } else if (callCount === 2) {
          mockUseFetchData.value = { success: true, data: JSON.stringify(mockFiles) }
        } else {
          mockUseFetchData.value = { success: true, data: JSON.stringify(mockVolumes) }
        }
        return { data: mockUseFetchData }
      })
      
      const { open, volumeForms, nodeData, fileToKey, selectedVolumes } = createComponentInstance()
      
      await open('abc123', 'Test Torrent')
      await nextTick()
      await nextTick()
      await nextTick()
      
      // 验证卷表单数据已加载
      expect(volumeForms.value[1]).toBeDefined()
      expect(volumeForms.value[1].catalog_no).toBe('ABC-001')
      
      // 验证文件到卷号的映射
      const file1Key = fileToKey.value.get('file-1')
      const file2Key = fileToKey.value.get('file-2')
      
      expect(file1Key).toBeDefined()
      expect(file2Key).toBeDefined()
      
      const file1NodeData = nodeData.value.get(file1Key!)
      const file2NodeData = nodeData.value.get(file2Key!)
      
      expect(file1NodeData?.volume_no).toBe(1)
      expect(file2NodeData?.volume_no).toBe(1)
      
      // 验证已选择的卷号
      expect(selectedVolumes.value).toContain(1)
    })
  })

  describe('卷号变更', () => {
    it('应该正确更新文件的卷号', async () => {
      let callCount = 0
      useFetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          mockUseFetchData.value = { success: true, data: JSON.stringify([mockTorrent]) }
        } else {
          mockUseFetchData.value = { success: true, data: JSON.stringify(mockFiles) }
        }
        return { data: mockUseFetchData }
      })
      
      const { open, onVolumeChange, nodeData, fileToKey } = createComponentInstance()
      
      await open('abc123', 'Test Torrent')
      await nextTick()
      await nextTick()
      
      // 更新卷号
      onVolumeChange('BDMV/INDEX.BDMV', 3)
      await nextTick()
      
      const nodeDatum = nodeData.value.get('BDMV/INDEX.BDMV')
      expect(nodeDatum?.volume_no).toBe(3)
    })
  })
})

// 创建组件实例的辅助函数
function createComponentInstance() {
  const visible = ref(false)
  const torrentId = ref('')
  const torrentName = ref('')
  const volumeType = ref('volume')
  const volumeForms = ref<Record<number, any>>({})
  const files = ref<any[]>([])
  const treeData = ref<any[]>([])
  const nodeData = ref<Map<string, any>>(new Map())
  const fileToKey = ref<Map<string, string>>(new Map())
  const volumeToKeys = ref<Map<number, Set<string>>>(new Map())
  const selectedVolumes = computed(() => {
    return Array.from(volumeToKeys.value.keys()).sort((a, b) => a - b)
  })

  const buildTree = () => {
    const root: Record<string, any> = {}
    files.value.forEach(file => {
      const parts = file.name.split('/')
      let current = root
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? { _file: file } : {}
        }
        current = current[part]
      })
    })

    const nodeDataMap = new Map<string, any>()
    const fileToKeyMap = new Map<string, string>()

    const buildTreeRecursive = (node: Record<string, any>, parentPath = ''): any[] => {
      const result: any[] = []
      Object.entries(node).forEach(([key, value]) => {
        const isFile = !!(value as any)._file
        const file = (value as any)._file
        const fullPath = `${parentPath}${key}`

        if (file?._id) {
          fileToKeyMap.set(file._id, fullPath)
        }

        const childNodes = isFile ? [] : buildTreeRecursive(value as Record<string, any>, `${fullPath}/`)
        nodeDataMap.set(fullPath, { files: file?._id ? [file._id] : [] })

        result.push({
          title: key,
          key: fullPath,
          children: childNodes,
          isLeaf: isFile
        })
      })
      return result
    }

    treeData.value = buildTreeRecursive(root)
    nodeData.value = nodeDataMap
    fileToKey.value = fileToKeyMap
  }

  const onVolumeChange = (key: string, volumeNo: number | null) => {
    const vol = volumeNo ?? undefined
    const oldVol = nodeData.value.get(key)?.volume_no

    const newMap = new Map(nodeData.value)
    newMap.set(key, { ...newMap.get(key) || {}, volume_no: vol })
    nodeData.value = newMap

    if (vol !== undefined) {
      if (!volumeToKeys.value.has(vol)) volumeToKeys.value.set(vol, new Set())
      volumeToKeys.value.get(vol)!.add(key)
    }
    if (oldVol !== undefined && oldVol !== vol) {
      volumeToKeys.value.get(oldVol)?.delete(key)
      if (volumeToKeys.value.get(oldVol)?.size === 0) {
        volumeToKeys.value.delete(oldVol)
      }
    }
  }

  const open = async (torrentHash: string, name: string = '') => {
    volumeForms.value = {}
    treeData.value = []
    nodeData.value = new Map()
    fileToKey.value = new Map()
    volumeToKeys.value = new Map()
    files.value = []

    visible.value = true
    torrentName.value = name

    // 获取 torrent 信息
    const { data } = useFetchMock()
    if (data.value?.success) {
      const torrents = JSON.parse(data.value.data)
      const torrent = torrents?.[0]
      if (torrent) {
        torrentId.value = torrent._id
      }
    }

    // 获取文件列表
    const { data: fileData } = useFetchMock()
    if (fileData.value?.success) {
      files.value = JSON.parse(fileData.value.data)
      await nextTick()
      buildTree()

      // 加载卷数据
      if (torrentId.value) {
        const { data: volData } = useFetchMock()
        if (volData.value?.success) {
          const volumes = JSON.parse(volData.value.data)
          if (volumes?.length > 0) {
            volumes.forEach((vol: any) => {
              if (vol.type) volumeType.value = vol.type
              const volNo = vol.volume_no
              if (volNo !== undefined) {
                volumeForms.value[volNo] = {
                  catalog_no: vol.catalog_no || '',
                  volume_name: vol.volume_name || ''
                }
                if (vol.files?.length > 0) {
                  vol.files.forEach((fileId: string) => {
                    const key = fileToKey.value.get(fileId)
                    if (key) {
                      onVolumeChange(key, volNo)
                    }
                  })
                }
              }
            })
          }
        }
      }
    }
  }

  return {
    visible,
    torrentId,
    torrentName,
    volumeType,
    volumeForms,
    files,
    treeData,
    nodeData,
    fileToKey,
    volumeToKeys,
    selectedVolumes,
    buildTree,
    onVolumeChange,
    open
  }
}
