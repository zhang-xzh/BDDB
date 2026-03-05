import React, { useState, useRef } from 'react'
import type { VolumeForm, NodeData, FileItem } from '@/lib/db/schema'
import { fetchApi, postApi } from '@/lib/api'
import { message } from 'antd'

interface NodePath {
  parent: string | null
  children: string[]
  isLeaf: boolean
  depth: number
}

interface FlatTree {
  map: Map<string, NodePath>
  order: string[]
  leaves: string[]
}

interface UseDiscEditorReturn {
  // 状态
  visible: boolean
  loading: boolean
  saving: boolean
  torrentName: string
  torrentId: string
  volumeType: 'volume' | 'box'
  volumeForms: Record<number, VolumeForm>
  files: FileItem[]
  treeData: any[]
  nodeData: Map<string, NodeData>
  flatTree: FlatTree
  defaultExpandedKeys: string[]
  selectedVolumes: number[]
  maxVolumes: number

  // 设置器
  setVisible: (v: boolean) => void
  setTorrentName: (n: string) => void
  setTorrentId: (i: string) => void
  setVolumeType: (t: 'volume' | 'box') => void
  setVolumeForms: (f: Record<number, VolumeForm>) => void
  setFiles: (f: FileItem[]) => void
  setTreeData: (t: any[]) => void
  setNodeData: (n: Map<string, NodeData>) => void
  setFlatTree: (f: FlatTree) => void
  setDefaultExpandedKeys: (k: string[]) => void
  setVolumeToKeys: (v: Map<number, Set<string>>) => void

  // 操作
  open: (torrentHash: string, name?: string, syncFiles?: boolean) => Promise<void>
  handleSubmit: () => Promise<void>
  handleCancel: () => void
  onVolumeChange: (key: string, volumeNo: number | null) => void
  getNodeVolume: (key: string) => number | undefined
  getVolumeForm: (vol: number) => VolumeForm
  updateVolumeForm: (vol: number, form: VolumeForm) => void
  formatSize: (bytes: number) => string
  resetAll: () => void
}

interface BuildTreeResult {
  treeData: any[]
  nodeData: Map<string, NodeData>
  fileToKeyMap: Map<string, string>
  flatTree: FlatTree
  defaultExpandedKeys: string[]
}

export function useDiscEditor(): UseDiscEditorReturn {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [torrentName, setTorrentName] = useState('')
  const [torrentId, setTorrentId] = useState('')
  const [volumeType, setVolumeType] = useState<'volume' | 'box'>('volume')
  const maxVolumes = 20

  const [volumeForms, setVolumeForms] = useState<Record<number, VolumeForm>>({})
  const [files, setFiles] = useState<FileItem[]>([])
  const [treeData, setTreeData] = useState<any[]>([])
  const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
  const [flatTree, setFlatTree] = useState<FlatTree>({ map: new Map(), order: [], leaves: [] })
  const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
  const [volumeToKeys, setVolumeToKeys] = useState<Map<number, Set<string>>>(new Map())

  const currentHashRef = useRef<string | null>(null)

  const selectedVolumes = React.useMemo(() => {
    return Array.from(volumeToKeys.keys()).sort((a, b) => a - b)
  }, [volumeToKeys])

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }

  const getVolumeForm = (vol: number): VolumeForm => {
    return volumeForms[vol] || { catalog_no: '', volume_name: '' }
  }

  const updateVolumeForm = (vol: number, form: VolumeForm) => {
    setVolumeForms(prev => ({ ...prev, [vol]: form }))
  }

  const getNodeVolume = (key: string): number | undefined => {
    return nodeData.get(key)?.volume_no
  }

  const getAllChildrenKeys = (key: string): string[] => {
    const children: string[] = []
    const nodePath = flatTree.map.get(key)
    if (!nodePath) return children

    flatTree.order.forEach(k => {
      if (k.startsWith(key + '/') || k === key) {
        if (k !== key) children.push(k)
      }
    })
    return children
  }

  const buildTree = (fileList: FileItem[]): BuildTreeResult => {
    const root: Record<string, any> = {}
    const flatMap = new Map<string, NodePath>()
    const order: string[] = []
    const leaves: string[] = []
    const nodeDataMap = new Map<string, NodeData>()
    const fileToKeyMap = new Map<string, string>()
    const expandedKeys: string[] = []

    fileList.forEach(file => {
      const parts = file.name.split('/')
      let current = root
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? { _file: file } : {}
        }
        current = current[part]
      })
    })

    function buildTreeRecursive(node: Record<string, any>, parentPath = '', parentKey: string | null = null, level = 0): any[] {
      const result: any[] = []
      const keys: string[] = []

      Object.entries(node).forEach(([key, value]) => {
        const isFile = !!(value as Record<string, any>)._file
        const file = (value as Record<string, any>)._file
        const fullPath = `${parentPath}${key}`

        const nodeDatum: NodeData = {}
        if (file?._id) {
          nodeDatum.files = [file._id]
          fileToKeyMap.set(file._id, fullPath)
        }

        const childKeys: string[] = []
        const childNodes = isFile ? [] : buildTreeRecursive(value as Record<string, any>, `${fullPath}/`, fullPath, level + 1)

        childNodes.forEach(child => childKeys.push(child.key as string))

        flatMap.set(fullPath, { parent: parentKey, children: childKeys, isLeaf: isFile, depth: level })
        nodeDataMap.set(fullPath, nodeDatum)

        if (isFile) leaves.push(fullPath)
        if (level === 0) keys.push(fullPath)
        order.push(fullPath)

        result.push({
          title: `${key}${isFile ? ` (${formatSize(file.size)})` : ''}`,
          key: fullPath,
          children: childNodes,
          isLeaf: isFile,
        })
      })

      if (level === 0) expandedKeys.push(...keys)
      return result
    }

    const treeDataResult = buildTreeRecursive(root)

    return {
      treeData: treeDataResult,
      nodeData: nodeDataMap,
      fileToKeyMap,
      flatTree: { map: flatMap, order, leaves },
      defaultExpandedKeys: expandedKeys,
    }
  }

  const onVolumeChange = (key: string, volumeNo: number | null) => {
    const vol = volumeNo ?? undefined
    const oldVol = nodeData.get(key)?.volume_no
    const nodesToUpdate = [key, ...getAllChildrenKeys(key)]

    const newMap = new Map(nodeData)
    nodesToUpdate.forEach(k => {
      const currentData = newMap.get(k) || {}
      newMap.set(k, { ...currentData, volume_no: vol })
    })
    setNodeData(newMap)

    const newVolumeToKeys = new Map(volumeToKeys)
    nodesToUpdate.forEach(k => {
      if (vol !== undefined) {
        if (!newVolumeToKeys.has(vol)) newVolumeToKeys.set(vol, new Set())
        newVolumeToKeys.get(vol)!.add(k)
      }
      if (oldVol !== undefined && oldVol !== vol) {
        newVolumeToKeys.get(oldVol)?.delete(k)
        if (newVolumeToKeys.get(oldVol)?.size === 0) newVolumeToKeys.delete(oldVol)
      }
    })
    setVolumeToKeys(newVolumeToKeys)
  }

  const resetAll = () => {
    setVolumeForms({})
    setFiles([])
    setTreeData([])
    setNodeData(new Map())
    setFlatTree({ map: new Map(), order: [], leaves: [] })
    setDefaultExpandedKeys([])
    setVolumeToKeys(new Map())
    setTorrentId('')
    setVolumeType('volume')
  }

  const open = async (torrentHash: string, name: string = '', syncFiles = false) => {
    currentHashRef.current = torrentHash
    setVisible(true)
    setTorrentName(name)
    setLoading(true)
    resetAll()

    try {
      const torrentResult = await fetchApi<string>(`/api/qb/torrents/info?hash=${torrentHash}`)
      if (!torrentResult?.success || !torrentResult.data) {
        setLoading(false)
        return
      }

      const torrents = JSON.parse(torrentResult.data)
      const torrent = torrents?.[0]
      if (!torrent) {
        setLoading(false)
        return
      }

      const tid = torrent._id
      setTorrentId(tid)

      const apiPath = syncFiles ? `/api/qb/torrents/files` : `/api/torrents/files`
      const filesResult = await fetchApi<string>(`${apiPath}?hash=${torrentHash}`)
      if (!filesResult?.success || !filesResult.data) {
        setLoading(false)
        return
      }

      const loadedFiles: FileItem[] = JSON.parse(filesResult.data)
      setFiles(loadedFiles)

      const { treeData: newTreeData, nodeData: builtNodeData, fileToKeyMap, flatTree: newFlatTree, defaultExpandedKeys: newExpandedKeys } = buildTree(loadedFiles)

      setTreeData(newTreeData)
      setNodeData(builtNodeData)
      setFlatTree(newFlatTree)
      setDefaultExpandedKeys(newExpandedKeys)

      if (tid) {
        const volumesResult = await fetchApi<string>(`/api/volumes?torrent_id=${tid}`)
        if (volumesResult?.success && volumesResult.data) {
          const volumes = JSON.parse(volumesResult.data)
          if (volumes?.length > 0) {
            if (volumes[0].type) setVolumeType(volumes[0].type)

            const newVolumeForms: Record<number, VolumeForm> = {}
            const fileToVolumeMap: Map<string, number> = new Map()

            volumes.forEach((vol: any) => {
              const volNo = vol.volume_no
              if (volNo !== undefined) {
                newVolumeForms[volNo] = {
                  catalog_no: vol.catalog_no || '',
                  volume_name: vol.volume_name || ''
                }
                if (vol.files?.length > 0) {
                  vol.files.forEach((fileId: string) => fileToVolumeMap.set(fileId, volNo))
                }
              }
            })

            setVolumeForms(newVolumeForms)

            const newNodeData = new Map(builtNodeData)
            const newVolumeToKeys = new Map<number, Set<string>>()

            // 第一步：更新所有文件节点的 volume_no
            fileToKeyMap.forEach((key, fileId) => {
              const volumeNo = fileToVolumeMap.get(fileId)
              if (volumeNo !== undefined) {
                const existingData = newNodeData.get(key) || {}
                newNodeData.set(key, { ...existingData, volume_no: volumeNo })
                if (!newVolumeToKeys.has(volumeNo)) newVolumeToKeys.set(volumeNo, new Set())
                newVolumeToKeys.get(volumeNo)!.add(key)
              }
            })

            // 第二步：自底向上更新父目录节点的 volume_no
            // 按深度从大到小排序，确保先处理深层节点
            const sortedKeys = Array.from(newFlatTree.order).sort((a, b) => {
              const depthA = newFlatTree.map.get(a)?.depth ?? 0
              const depthB = newFlatTree.map.get(b)?.depth ?? 0
              return depthB - depthA
            })

            sortedKeys.forEach(key => {
              const nodePath = newFlatTree.map.get(key)
              if (!nodePath || nodePath.isLeaf) return // 跳过叶子节点

              // 获取所有直接子节点
              const directChildren = nodePath.children
              if (directChildren.length === 0) return

              // 获取所有子节点的 volume_no
              const childVolumes = new Set<number>()
              let allChildrenHaveVolume = true

              directChildren.forEach(childKey => {
                const childData = newNodeData.get(childKey)
                const childVol = childData?.volume_no
                if (childVol !== undefined) {
                  childVolumes.add(childVol)
                } else {
                  allChildrenHaveVolume = false
                }
              })

              // 如果所有子节点都有相同的 volume_no，则父节点也设置为该值
              if (allChildrenHaveVolume && childVolumes.size === 1) {
                const volumeNo = childVolumes.values().next().value
                const existingData = newNodeData.get(key) || {}
                newNodeData.set(key, { ...existingData, volume_no: volumeNo })
                if (!newVolumeToKeys.has(volumeNo)) newVolumeToKeys.set(volumeNo, new Set())
                newVolumeToKeys.get(volumeNo)!.add(key)
              }
            })

            setNodeData(newNodeData)
            setVolumeToKeys(newVolumeToKeys)
            
            // 调试日志：确认数据已正确更新
            console.log('[DiscEditor] volumes 加载完成')
            console.log('[DiscEditor] fileToVolumeMap:', Array.from(fileToVolumeMap.entries()))
            console.log('[DiscEditor] newNodeData size:', newNodeData.size)
            console.log('[DiscEditor] 有 volume_no 的节点:', Array.from(newNodeData.entries()).filter(([_, d]) => d.volume_no !== undefined).length)
            console.log('[DiscEditor] 前 5 个有 volume 的节点:', Array.from(newNodeData.entries()).filter(([_, d]) => d.volume_no !== undefined).slice(0, 5))
          }
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!torrentId) return

    setSaving(true)
    try {
      const files: Record<number, string[]> = {}
      selectedVolumes.forEach(vol => {
        files[vol] = []
      })
      nodeData.forEach((data, key) => {
        if (data.volume_no && data.files && data.files.length > 0) {
          const vol = data.volume_no
          if (!files[vol]) files[vol] = []
          data.files.forEach(fileId => {
            if (!files[vol].includes(fileId)) files[vol].push(fileId)
          })
        }
      })

      const savePromises = selectedVolumes.map(volNo =>
        postApi(`/api/volumes`, {
          torrent_id: torrentId,
          files: files[volNo] || [],
          volumes: [{
            type: volumeType,
            volume_no: volNo,
            sort_order: volNo,
            volume_name: volumeForms[volNo]?.volume_name || '',
            catalog_no: volumeForms[volNo]?.catalog_no || '',
          }],
        })
      )

      await Promise.all(savePromises)
      message.success('保存成功')
      setVisible(false)
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setVisible(false)
  }

  return {
    visible,
    loading,
    saving,
    torrentName,
    torrentId,
    volumeType,
    volumeForms,
    files,
    treeData,
    nodeData,
    flatTree,
    defaultExpandedKeys,
    selectedVolumes,
    maxVolumes,
    setVisible,
    setTorrentName,
    setTorrentId,
    setVolumeType,
    setVolumeForms,
    setFiles,
    setTreeData,
    setNodeData,
    setFlatTree,
    setDefaultExpandedKeys,
    setVolumeToKeys,
    open,
    handleSubmit,
    handleCancel,
    onVolumeChange,
    getNodeVolume,
    getVolumeForm,
    updateVolumeForm,
    formatSize,
    resetAll,
  }
}
