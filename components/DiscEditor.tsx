'use client'

import React, { useState, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import {
  Modal,
  Space,
  Radio,
  Card,
  Input,
  Tree,
  Select,
  Typography,
  Empty,
  message,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import type { Torrent, VolumeForm, NodeData, FileItem } from '@/lib/db/schema'
import { fetchApi, postApi } from '@/lib/api'

interface DiscEditorProps {
  torrentHash?: string
  discId?: number
  onSave?: () => void
  onClose?: () => void
}

export interface DiscEditorRef {
  open: (torrentHash: string, name?: string, syncFiles?: boolean) => Promise<void>
}

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

const DiscEditor = forwardRef<DiscEditorRef, DiscEditorProps>(function DiscEditor(_, ref) {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [torrentName, setTorrentName] = useState('')
  const [torrentId, setTorrentId] = useState('')
  const [volumeType, setVolumeType] = useState<'volume' | 'box'>('volume')
  const maxVolumes = 20

  // 卷表单数据
  const [volumeForms, setVolumeForms] = useState<Record<number, VolumeForm>>({})

  // 文件列表
  const [files, setFiles] = useState<FileItem[]>([])

  // 树数据
  const [treeData, setTreeData] = useState<DataNode[]>([])
  // 节点数据
  const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
  // 扁平树结构
  const [flatTree, setFlatTree] = useState<FlatTree>({ map: new Map(), order: [], leaves: [] })
  // 默认展开的键
  const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
  // 卷号到节点 keys 的映射
  const [volumeToKeys, setVolumeToKeys] = useState<Map<number, Set<string>>>(new Map())
  // 文件 ID 到节点 key 的映射
  const [fileToKey, setFileToKey] = useState<Map<string, string>>(new Map())

  // 计算已选择的卷号
  const selectedVolumes = useMemo(() => {
    return Array.from(volumeToKeys.keys()).sort((a, b) => a - b)
  }, [volumeToKeys])

  // 格式化大小
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }, [])

  // 获取或创建卷表单
  const getVolumeForm = useCallback((vol: number): VolumeForm => {
    if (!volumeForms[vol]) {
      return { catalog_no: '', volume_name: '' }
    }
    return volumeForms[vol]
  }, [volumeForms])

  // 更新卷表单
  const updateVolumeForm = useCallback((vol: number, form: VolumeForm) => {
    setVolumeForms(prev => ({ ...prev, [vol]: form }))
  }, [])

  // 获取节点的卷号
  const getNodeVolume = useCallback((key: string): number | undefined => {
    return nodeData.get(key)?.volume_no
  }, [nodeData])

  // 获取节点的所有子节点 keys（递归）
  const getAllChildrenKeys = useCallback((key: string): string[] => {
    const children: string[] = []
    const nodePath = flatTree.map.get(key)
    if (!nodePath) return children

    flatTree.order.forEach(k => {
      if (k.startsWith(key + '/') || k === key) {
        if (k !== key) {
          children.push(k)
        }
      }
    })
    return children
  }, [flatTree])

  // 构建树结构
  const buildTree = useCallback(() => {
    const root: Record<string, any> = {}

    // 构建树形结构
    files.forEach(file => {
      const parts = file.name.split('/')
      let current = root
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? { _file: file } : {}
        }
        current = current[part]
      })
    })

    // 扁平化树结构
    const flatMap = new Map<string, NodePath>()
    const order: string[] = []
    const leaves: string[] = []
    const nodeDataMap = new Map<string, NodeData>()
    const fileToKeyMap = new Map<string, string>()

    const buildTreeRecursive = (node: Record<string, any>, parentPath = '', parentKey: string | null = null, level = 0): DataNode[] => {
      const result: DataNode[] = []
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

        childNodes.forEach(child => {
          childKeys.push(child.key as string)
        })

        // 扁平化存储
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

      if (level === 0) setDefaultExpandedKeys(keys)
      return result
    }

    const treeDataResult = buildTreeRecursive(root)

    // 批量更新
    setFlatTree({ map: flatMap, order, leaves })
    setNodeData(nodeDataMap)
    setFileToKey(fileToKeyMap)
    setTreeData(treeDataResult)

    return treeDataResult
  }, [files, formatSize])

  // 卷号变更 - 父节点变更时同步到所有子节点
  const onVolumeChange = useCallback((key: string, volumeNo: number | null) => {
    const vol = volumeNo ?? undefined
    const oldVol = nodeData.get(key)?.volume_no

    // 获取所有需要更新的节点（当前节点 + 所有子节点）
    const nodesToUpdate = [key, ...getAllChildrenKeys(key)]

    // 批量更新节点数据
    const newMap = new Map(nodeData)
    nodesToUpdate.forEach(k => {
      const currentData = newMap.get(k) || {}
      newMap.set(k, { ...currentData, volume_no: vol })
    })
    setNodeData(newMap)

    // 更新反向索引
    const newVolumeToKeys = new Map(volumeToKeys)
    nodesToUpdate.forEach(k => {
      if (vol !== undefined) {
        if (!newVolumeToKeys.has(vol)) newVolumeToKeys.set(vol, new Set())
        newVolumeToKeys.get(vol)!.add(k)
      }
      // 从旧卷号中移除
      if (oldVol !== undefined && oldVol !== vol) {
        newVolumeToKeys.get(oldVol)?.delete(k)
        if (newVolumeToKeys.get(oldVol)?.size === 0) {
          newVolumeToKeys.delete(oldVol)
        }
      }
    })
    setVolumeToKeys(newVolumeToKeys)
  }, [nodeData, volumeToKeys, getAllChildrenKeys])

  // 根据文件 ID 设置卷号（用于从 API 加载数据）
  const setVolumeByFileId = useCallback((fileId: string, volumeNo: number) => {
    const key = fileToKey.get(fileId)

    if (!key) {
      console.warn('file not found in tree:', fileId)
      return
    }

    const vol = volumeNo
    const oldVol = nodeData.get(key)?.volume_no

    // 更新当前节点
    const newMap = new Map(nodeData)
    const currentData = newMap.get(key) || {}
    newMap.set(key, { ...currentData, volume_no: vol })
    setNodeData(newMap)

    // 更新反向索引
    const newVolumeToKeys = new Map(volumeToKeys)
    if (vol !== undefined) {
      if (!newVolumeToKeys.has(vol)) newVolumeToKeys.set(vol, new Set())
      newVolumeToKeys.get(vol)!.add(key)
    }
    // 从旧卷号中移除
    if (oldVol !== undefined && oldVol !== vol) {
      newVolumeToKeys.get(oldVol)?.delete(key)
      if (newVolumeToKeys.get(oldVol)?.size === 0) {
        newVolumeToKeys.delete(oldVol)
      }
    }
    setVolumeToKeys(newVolumeToKeys)
  }, [nodeData, fileToKey, volumeToKeys])

  // 重置所有数据
  const resetData = useCallback(() => {
    setVisible(false)
    setSaving(false)
    setTorrentName('')
    setTorrentId('')
    setVolumeType('volume')
    setVolumeForms({})
    setFiles([])
    setTreeData([])
    setNodeData(new Map())
    setFlatTree({ map: new Map(), order: [], leaves: [] })
    setDefaultExpandedKeys([])
    setVolumeToKeys(new Map())
    setFileToKey(new Map())
  }, [])

  // 打开弹窗
  const open = useCallback(async (torrentHash: string, name: string = '', syncFiles = false) => {
    setVisible(true)
    setTorrentName(name)

    // 重置状态
    setVolumeForms({})
    setTreeData([])
    setNodeData(new Map())
    setFlatTree({ map: new Map(), order: [], leaves: [] })
    setDefaultExpandedKeys([])
    setVolumeToKeys(new Map())
    setFileToKey(new Map())
    setFiles([])
    setTorrentId('')
    setVolumeType('volume')

    // 获取 torrent 信息
    try {
      const result = await fetchApi<string>(`/api/qb/torrents/info?hash=${torrentHash}`)
      if (result?.success && result.data) {
        const torrents = JSON.parse(result.data)
        const torrent = torrents?.[0]
        if (torrent) {
          setTorrentId(torrent._id)
          console.log('[DiscEditor] torrentId:', torrent._id)
        }
      }
    } catch (error) {
      console.error('获取 torrent 信息失败:', error)
    }

    // 获取文件列表
    try {
      const apiPath = syncFiles ? `/api/qb/torrents/files` : `/api/torrents/files`
      const result = await fetchApi<string>(`${apiPath}?hash=${torrentHash}`)
      if (result?.success && result.data) {
        const loadedFiles = JSON.parse(result.data)
        setFiles(loadedFiles)
        console.log('[DiscEditor] files loaded:', loadedFiles.length)
        
        // 文件加载完成后构建树
        await Promise.resolve()
        buildTree()
        console.log('[DiscEditor] tree built, treeData:', treeData.length, 'fileToKey size:', fileToKey.size)

        // 树构建完成后，加载已保存的 BD 信息
        if (torrentId) {
          try {
            const result = await fetchApi<string>(`/api/volumes?torrent_id=${torrentId}`)
            if (result?.success && result.data) {
              const volumes = JSON.parse(result.data)
              console.log('[DiscEditor] loaded volumes:', volumes)
              if (volumes?.length > 0) {
                volumes.forEach((vol: any) => {
                  // 恢复卷类型
                  if (vol.type) setVolumeType(vol.type)
                  // 恢复卷表单
                  const volNo = vol.volume_no
                  if (volNo !== undefined) {
                    setVolumeForms(prev => ({
                      ...prev,
                      [volNo]: {
                        catalog_no: vol.catalog_no || '',
                        volume_name: vol.volume_name || ''
                      }
                    }))
                    // 恢复文件到卷号的映射
                    if (vol.files?.length > 0) {
                      console.log('[DiscEditor] setting volume for files:', vol.files, 'volume:', volNo)
                      vol.files.forEach((fileId: string) => {
                        setVolumeByFileId(fileId, volNo)
                      })
                    }
                  }
                })
                console.log('[DiscEditor] after load, selectedVolumes:', selectedVolumes)
              }
            }
          } catch (error) {
            console.error('获取 BD 信息失败:', error)
          }
        }
      }
    } catch (error) {
      console.error('获取文件列表失败:', error)
    }
  }, [buildTree, setVolumeByFileId, torrentId, selectedVolumes])

  // 暴露 open 方法
  useImperativeHandle(ref, () => ({
    open,
  }), [open])

  // 提交保存
  const handleSubmit = useCallback(async () => {
    if (!torrentId) return

    setSaving(true)
    try {
      // 获取卷文件映射
      const files: Record<number, string[]> = {}
      selectedVolumes.forEach(vol => {
        files[vol] = []
      })
      nodeData.forEach((data, key) => {
        if (data.volume_no && data.files && data.files.length > 0) {
          const vol = data.volume_no
          if (!files[vol]) files[vol] = []
          data.files.forEach(fileId => {
            if (!files[vol].includes(fileId)) {
              files[vol].push(fileId)
            }
          })
        }
      })

      // 为每个卷保存数据
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
  }, [torrentId, selectedVolumes, nodeData, volumeType, volumeForms])

  const handleCancel = useCallback(() => {
    setVisible(false)
  }, [])

  // 渲染卷信息表单
  const renderVolumeForms = () => {
    if (selectedVolumes.length === 0) return null

    return (
      <Card size="small" title="卷信息">
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {selectedVolumes.map(vol => (
            <div key={vol} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 500, minWidth: '60px' }}>第{vol}卷</span>
              <Input
                value={getVolumeForm(vol).catalog_no}
                onChange={e => updateVolumeForm(vol, { ...getVolumeForm(vol), catalog_no: e.target.value })}
                placeholder="型番"
                style={{ width: '120px' }}
              />
              <Input
                value={getVolumeForm(vol).volume_name}
                onChange={e => updateVolumeForm(vol, { ...getVolumeForm(vol), volume_name: e.target.value })}
                placeholder="标题"
                style={{ width: '240px' }}
              />
            </div>
          ))}
        </Space>
      </Card>
    )
  }

  // 渲染文件树节点
  const renderTreeNode = (title: string, key: string, isLeaf: boolean) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <Typography.Text ellipsis={{ tooltip: title }} style={{ flex: 1 }}>
          {title}
        </Typography.Text>
        <Select
          value={getNodeVolume(key)}
          onChange={(val) => onVolumeChange(key, val)}
          style={{ width: '100px', flexShrink: 0 }}
          size="small"
          placeholder="卷号"
          allowClear
        >
          {Array.from({ length: maxVolumes }, (_, i) => i + 1).map(vol => (
            <Select.Option key={vol} value={vol}>第 {vol} 卷</Select.Option>
          ))}
        </Select>
      </div>
    )
  }

  // 自定义树节点标题渲染
  const titleRender = (node: DataNode) => {
    const { title, key, isLeaf } = node
    return renderTreeNode(title as string, key as string, isLeaf ?? false)
  }

  return (
    <Modal
      open={visible}
      title={torrentName || '编辑产品信息'}
      width={900}
      confirmLoading={saving}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {/* 卷类型选择 */}
        <Radio.Group
          size="small"
          value={volumeType}
          onChange={e => setVolumeType(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="volume">分卷</Radio.Button>
          <Radio.Button value="box">BOX</Radio.Button>
        </Radio.Group>

        {/* 卷信息表单 */}
        {renderVolumeForms()}

        {/* 文件树 */}
        {files.length > 0 ? (
          <Card size="small" title={
            <Space>
              <span>文件列表</span>
              <span>{files.length} 个文件</span>
            </Space>
          } bodyStyle={{ padding: '12px' }}>
            <Tree
              treeData={treeData}
              defaultExpandedKeys={defaultExpandedKeys}
              titleRender={titleRender}
            />
          </Card>
        ) : (
          <Empty description="暂无文件数据" />
        )}
      </Space>
    </Modal>
  )
})

export default DiscEditor
