import React, { useState, useRef, useEffect, useCallback } from 'react'
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
  torrentId: string | null
  volumeForms: Record<number, VolumeForm>
  files: FileItem[]
  treeData: any[]
  nodeData: Map<string, NodeData>
  flatTree: FlatTree
  defaultExpandedKeys: string[]
  selectedVolumes: number[]
  visibleVolumes: number
  loadMoreVolumes: () => void
  worksCount: number
  setWorksCount: (n: number) => void

  // 设置器
  setVisible: (v: boolean) => void
  setTorrentName: (n: string) => void
  setTorrentId: (i: string | null) => void
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
  hasChanges: () => boolean
  onVolumeChange: (key: string, volumeNo: number | null) => void
  onSharedVolumeChange: (key: string, volumes: number[]) => void
  onToggleShared: (key: string, shared: boolean) => void
  getNodeVolume: (key: string) => number | undefined
  getNodeShared: (key: string) => boolean
  getNodeSharedVolumes: (key: string) => number[]
  getVolumeForm: (vol: number) => VolumeForm
  updateVolumeForm: (vol: number, form: VolumeForm) => void
  formatSize: (bytes: number) => string
  resetAll: () => void
  resetVolumeAssignments: () => void
  deleteVolume: (vol: number) => void
}

interface BuildTreeResult {
  treeData: any[]
  nodeData: Map<string, NodeData>
  fileToKeyMap: Map<string, string>
  flatTree: FlatTree
  defaultExpandedKeys: string[]
}

export function useDiscEditor(onSave?: () => void): UseDiscEditorReturn {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [torrentName, setTorrentName] = useState('')
  const [torrentId, setTorrentId] = useState<string | null>(null)
  const [visibleVolumes, setVisibleVolumes] = useState(20)
  const loadMoreVolumes = useCallback(() => setVisibleVolumes(v => v + 10), [])
  const [worksCount, setWorksCount] = useState(1)

  const [volumeForms, setVolumeForms] = useState<Record<number, VolumeForm>>({})
  const [files, setFiles] = useState<FileItem[]>([])
  const [treeData, setTreeData] = useState<any[]>([])
  const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
  const [flatTree, setFlatTree] = useState<FlatTree>({ map: new Map(), order: [], leaves: [] })
  const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
  const [volumeToKeys, setVolumeToKeys] = useState<Map<number, Set<string>>>(new Map())

  const currentHashRef = useRef<string | null>(null)

  // Refs for hasChanges detection
  const nodeDataRef = useRef(nodeData)
  const volumeFormsRef = useRef(volumeForms)
  const initialNodeDataRef = useRef<Map<string, NodeData>>(new Map())
  const initialVolumeFormsRef = useRef<Record<number, VolumeForm>>({})

  useEffect(() => { nodeDataRef.current = nodeData }, [nodeData])
  useEffect(() => { volumeFormsRef.current = volumeForms }, [volumeForms])

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
    return volumeForms[vol] || { catalog_no: '', volume_name: '', type: 'volume' }
  }

  const updateVolumeForm = (vol: number, form: VolumeForm) => {
    setVolumeForms(prev => ({ ...prev, [vol]: { ...form, type: 'volume' } }))
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

  const getNodeShared = useCallback((key: string): boolean => {
    return Array.isArray(nodeData.get(key)?.shared_volume_nos)
  }, [nodeData])

  const getNodeSharedVolumes = useCallback((key: string): number[] => {
    return nodeData.get(key)?.shared_volume_nos ?? []
  }, [nodeData])

  const onToggleShared = (key: string, shared: boolean) => {
    const nodesToUpdate = [key, ...getAllChildrenKeys(key)]
    const newMap = new Map(nodeData)
    const newVolumeToKeys = new Map(volumeToKeys)

    nodesToUpdate.forEach(k => {
      const current = newMap.get(k) || {}
      if (shared) {
        const vols = current.volume_no !== undefined ? [current.volume_no] : []
        newMap.set(k, { ...current, shared_volume_nos: vols, volume_no: undefined })
        if (current.volume_no !== undefined) {
          newVolumeToKeys.get(current.volume_no)?.delete(k)
          if (newVolumeToKeys.get(current.volume_no)?.size === 0) newVolumeToKeys.delete(current.volume_no)
        }
        vols.forEach(v => {
          if (!newVolumeToKeys.has(v)) newVolumeToKeys.set(v, new Set())
          newVolumeToKeys.get(v)!.add(k)
        })
      } else {
        const vols = current.shared_volume_nos ?? []
        const firstVol = vols[0]
        newMap.set(k, { ...current, volume_no: firstVol, shared_volume_nos: undefined })
        vols.forEach(v => {
          newVolumeToKeys.get(v)?.delete(k)
          if (newVolumeToKeys.get(v)?.size === 0) newVolumeToKeys.delete(v)
        })
        if (firstVol !== undefined) {
          if (!newVolumeToKeys.has(firstVol)) newVolumeToKeys.set(firstVol, new Set())
          newVolumeToKeys.get(firstVol)!.add(k)
        }
      }
    })
    setNodeData(newMap)
    setVolumeToKeys(newVolumeToKeys)
  }

  const onSharedVolumeChange = (key: string, volumes: number[]) => {
    const nodesToUpdate = [key, ...getAllChildrenKeys(key)]
    const newMap = new Map(nodeData)
    const newVolumeToKeys = new Map(volumeToKeys)

    nodesToUpdate.forEach(k => {
      const current = newMap.get(k) || {}
      const oldVolumes = current.shared_volume_nos ?? []
      newMap.set(k, { ...current, shared_volume_nos: volumes, volume_no: undefined })
      oldVolumes.forEach(v => {
        newVolumeToKeys.get(v)?.delete(k)
        if (newVolumeToKeys.get(v)?.size === 0) newVolumeToKeys.delete(v)
      })
      volumes.forEach(v => {
        if (!newVolumeToKeys.has(v)) newVolumeToKeys.set(v, new Set())
        newVolumeToKeys.get(v)!.add(k)
      })
    })
    setNodeData(newMap)
    setVolumeToKeys(newVolumeToKeys)
  }

  const resetVolumeAssignments = useCallback(() => {
    setNodeData(prev => {
      const newMap = new Map(prev)
      newMap.forEach((data, key) => {
        newMap.set(key, { files: data.files })
      })
      return newMap
    })
    setVolumeToKeys(new Map())
  }, [])

  const deleteVolume = useCallback((vol: number) => {
    // 从 volumeForms 中删除
    setVolumeForms(prev => {
      const next = { ...prev }
      delete next[vol]
      return next
    })
    // 清理 nodeData 中对应卷的选择
    setNodeData(prev => {
      const newMap = new Map(prev)
      newMap.forEach((data, key) => {
        if (data.volume_no === vol) {
          newMap.set(key, { ...data, volume_no: undefined })
        } else if (data.shared_volume_nos?.includes(vol)) {
          const filtered = data.shared_volume_nos.filter(v => v !== vol)
          newMap.set(key, {
            ...data,
            shared_volume_nos: filtered.length > 0 ? filtered : undefined,
            volume_no: filtered.length === 1 ? filtered[0] : data.volume_no,
          })
        }
      })
      return newMap
    })
    // 从 volumeToKeys 中删除
    setVolumeToKeys(prev => {
      const next = new Map(prev)
      next.delete(vol)
      return next
    })
  }, [])

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
        if (file?.id) {
          nodeDatum.files = [file.id]
          fileToKeyMap.set(file.id, fullPath)
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

  const hasChanges = useCallback((): boolean => {
    const curr = nodeDataRef.current
    const init = initialNodeDataRef.current
    for (const [key, data] of curr.entries()) {
      if ((data.volume_no ?? undefined) !== (init.get(key)?.volume_no ?? undefined)) return true
    }
    if (JSON.stringify(volumeFormsRef.current) !== JSON.stringify(initialVolumeFormsRef.current)) return true
    return false
  }, [])

  const resetAll = () => {
    initialNodeDataRef.current = new Map()
    initialVolumeFormsRef.current = {}
    setVolumeForms({})
    setFiles([])
    setTreeData([])
    setNodeData(new Map())
    setFlatTree({ map: new Map(), order: [], leaves: [] })
    setDefaultExpandedKeys([])
    setVolumeToKeys(new Map())
    setTorrentId(null)
    setWorksCount(1)
  }

  const open = async (torrentHash: string, name: string = '', syncFiles = false) => {
    currentHashRef.current = torrentHash
    setVisible(true)
    setTorrentName(name)
    setLoading(true)
    resetAll()

    try {
      // Parallel: torrent info + DB files (independent requests)
      const [torrentResult, dbFilesResult] = await Promise.all([
        fetchApi<string>(`/api/qb/torrents/info?hash=${torrentHash}`),
        fetchApi<string>(`/api/torrents/files?hash=${torrentHash}`),
      ])

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

      const tid = torrent.id
      setTorrentId(tid)

      // Start volumes fetch immediately after getting tid (runs concurrently)
      const volumesPromise = tid != null
        ? fetchApi<string>(`/api/volumes?torrent_id=${tid}`)
        : Promise.resolve(null)

      let loadedFiles: FileItem[] = []
      if (dbFilesResult?.success && dbFilesResult.data) {
        loadedFiles = JSON.parse(dbFilesResult.data)
      }

      // 如果数据库中没有文件，或者用户明确要求同步，则从 qBittorrent 同步
      if (loadedFiles.length === 0 || syncFiles) {
        console.log('[DiscEditor] 从 qBittorrent 同步文件...')
        const qbFilesResult = await fetchApi<string>(`/api/qb/torrents/files?hash=${torrentHash}`)
        if (qbFilesResult?.success && qbFilesResult.data) {
          loadedFiles = JSON.parse(qbFilesResult.data)
        }
      }

      if (loadedFiles.length === 0) {
        console.warn('[DiscEditor] 没有获取到文件数据')
        setLoading(false)
        return
      }

      console.log('[DiscEditor] 加载文件:', loadedFiles.length, '个')
      setFiles(loadedFiles)

      const { treeData: newTreeData, nodeData: builtNodeData, fileToKeyMap, flatTree: newFlatTree, defaultExpandedKeys: newExpandedKeys } = buildTree(loadedFiles)

      setTreeData(newTreeData)
      setNodeData(builtNodeData)
      setFlatTree(newFlatTree)
      setDefaultExpandedKeys(newExpandedKeys)

      // Track final state for hasChanges detection
      let snapshotNodeData: Map<string, NodeData> = builtNodeData
      let snapshotVolumeForms: Record<number, VolumeForm> = {}

      // Await volumes (started earlier in parallel with file processing)
      const volumesResult = await volumesPromise
      if (volumesResult?.success && volumesResult.data) {
          const volumes = JSON.parse(volumesResult.data)
          if (volumes?.length > 0) {
            const newVolumeForms: Record<number, VolumeForm> = {}
            // fileId -> 所有包含它的卷号（用于检测共享）
            const fileToVolumesMap: Map<string, number[]> = new Map()

            volumes.forEach((vol: any) => {
              const volNo = vol.volume_no
              if (volNo !== undefined) {
                newVolumeForms[volNo] = {
                  catalog_no: vol.catalog_no || '',
                  volume_name: vol.volume_name || '',
                  type: vol.type || undefined,
                  media_type: vol.media_type || undefined,
                }
                if (vol.torrent_file_ids?.length > 0) {
                  vol.torrent_file_ids.forEach((fileId: string) => {
                    if (!fileToVolumesMap.has(fileId)) fileToVolumesMap.set(fileId, [])
                    fileToVolumesMap.get(fileId)!.push(volNo)
                  })
                }
              }
            })

            setVolumeForms(newVolumeForms)

            // 自动检测是否为多作品模式：volume_no >= 1000 说明是编码过的
            const allVolNos = Object.keys(newVolumeForms).map(Number)
            const maxEncoded = Math.max(...allVolNos, 0)
            const detectedWorksCount = maxEncoded >= 1000 ? Math.floor(maxEncoded / 1000) : 1
            setWorksCount(detectedWorksCount)

            const newNodeData = new Map(builtNodeData)
            const newVolumeToKeys = new Map<number, Set<string>>()

            // 第一步：更新所有文件节点的 volume_no 或 shared_volume_nos
            fileToKeyMap.forEach((key, fileId) => {
              const volNos = fileToVolumesMap.get(fileId)
              if (!volNos || volNos.length === 0) return
              const existingData = newNodeData.get(key) || {}
              if (volNos.length === 1) {
                // 普通单卷
                newNodeData.set(key, { ...existingData, volume_no: volNos[0], shared_volume_nos: undefined })
                if (!newVolumeToKeys.has(volNos[0])) newVolumeToKeys.set(volNos[0], new Set())
                newVolumeToKeys.get(volNos[0])!.add(key)
              } else {
                // 共享：出现在多个卷的文件列表中
                newNodeData.set(key, { ...existingData, volume_no: undefined, shared_volume_nos: volNos })
                volNos.forEach(v => {
                  if (!newVolumeToKeys.has(v)) newVolumeToKeys.set(v, new Set())
                  newVolumeToKeys.get(v)!.add(key)
                })
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
              if (!nodePath || nodePath.isLeaf) return

              const directChildren = nodePath.children
              if (directChildren.length === 0) return

              // 收集所有子节点的有效卷号集合（单卷或共享）
              const childVolumeSets: Set<number>[] = []
              let allChildrenHaveVolume = true

              directChildren.forEach(childKey => {
                const childData = newNodeData.get(childKey)
                if (childData?.shared_volume_nos?.length) {
                  childVolumeSets.push(new Set(childData.shared_volume_nos))
                } else if (childData?.volume_no !== undefined) {
                  childVolumeSets.push(new Set([childData.volume_no]))
                } else {
                  allChildrenHaveVolume = false
                }
              })

              if (!allChildrenHaveVolume || childVolumeSets.length === 0) return

              // 求所有子节点卷号的交集（父目录只在所有子节点共同拥有的卷上）
              const intersection = childVolumeSets.reduce((acc, set) => {
                return new Set([...acc].filter(v => set.has(v)))
              })

              if (intersection.size === 0) return

              const existingData = newNodeData.get(key) || {}
              if (intersection.size === 1) {
                const volumeNo = intersection.values().next().value as number
                newNodeData.set(key, { ...existingData, volume_no: volumeNo, shared_volume_nos: undefined })
                if (!newVolumeToKeys.has(volumeNo)) newVolumeToKeys.set(volumeNo, new Set())
                newVolumeToKeys.get(volumeNo)!.add(key)
              } else {
                const sharedVols = Array.from(intersection)
                newNodeData.set(key, { ...existingData, volume_no: undefined, shared_volume_nos: sharedVols })
                sharedVols.forEach(v => {
                  if (!newVolumeToKeys.has(v)) newVolumeToKeys.set(v, new Set())
                  newVolumeToKeys.get(v)!.add(key)
                })
              }
            })

            setNodeData(newNodeData)
            setVolumeToKeys(newVolumeToKeys)
            snapshotNodeData = newNodeData
            snapshotVolumeForms = newVolumeForms
          }
      }

      // Snapshot initial state for hasChanges detection
      initialNodeDataRef.current = new Map(snapshotNodeData)
      initialVolumeFormsRef.current = { ...snapshotVolumeForms }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (torrentId == null) return

    const hasError = selectedVolumes.some(
      (vol) =>
        !volumeForms[vol]?.catalog_no?.trim() ||
        !volumeForms[vol]?.volume_name?.trim(),
    )
    if (hasError) {
      message.error('请填写所有卷的型番和标题')
      return
    }

    setSaving(true)
    try {
      const files: Record<number, string[]> = {}
      selectedVolumes.forEach(vol => {
        files[vol] = []
      })
      nodeData.forEach((data, key) => {
        if (data.files && data.files.length > 0) {
          const volumes: number[] = []
          if (data.volume_no !== undefined) volumes.push(data.volume_no)
          if (data.shared_volume_nos?.length) volumes.push(...data.shared_volume_nos)
          volumes.forEach(vol => {
            if (!files[vol]) files[vol] = []
            data.files!.forEach(fileId => {
              if (!files[vol].includes(fileId)) files[vol].push(fileId)
            })
          })
        }
      })

      const result = await postApi(`/api/volumes`, {
        torrent_id: torrentId,
        volumes: selectedVolumes.map(volNo => ({
          type: volumeForms[volNo]?.type,
          volume_no: volNo,
          sort_order: volNo,
          volume_name: (volumeForms[volNo]?.volume_name || '').trim(),
          catalog_no: (volumeForms[volNo]?.catalog_no || '').trim(),
          media_type: volumeForms[volNo]?.media_type,
          files: files[volNo] || [],
        })),
      })

      if (!result?.success) {
        message.error(result?.error || '保存失败')
        return
      }
      message.success('保存成功')
      setVisible(false)
      onSave?.()
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
    volumeForms,
    files,
    treeData,
    nodeData,
    flatTree,
    defaultExpandedKeys,
    selectedVolumes,
    visibleVolumes,
    loadMoreVolumes,
    worksCount,
    setWorksCount,
    setVisible,
    setTorrentName,
    setTorrentId,
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
    hasChanges,
    onVolumeChange,
    onSharedVolumeChange,
    onToggleShared,
    getNodeVolume,
    getNodeShared,
    getNodeSharedVolumes,
    getVolumeForm,
    updateVolumeForm,
    formatSize,
    resetAll,
    resetVolumeAssignments,
    deleteVolume,
  }
}
