<template>
  <a-modal
    v-model:open="visible"
    :title="torrentName || '编辑产品信息'"
    wrap-class-name="disc-editor-modal"
    :width="900"
    :confirm-loading="saving"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-space direction="vertical" style="width: 100%" :size="16">
      <!-- 卷类型选择 -->
      <a-radio-group size="small" v-model:value="volumeType" button-style="solid">
        <a-radio-button value="volume">分卷</a-radio-button>
        <a-radio-button value="box">BOX</a-radio-button>
      </a-radio-group>

      <!-- 卷信息表单 - 根据选择的卷号动态显示 -->
      <a-card size="small" v-if="selectedVolumes.length > 0">
        <template #title>
          <a-space>
            <span>卷信息</span>
          </a-space>
        </template>
        <a-space direction="vertical" style="width: 100%" :size="12">
          <div v-for="vol in selectedVolumes" :key="vol" style="display: flex; align-items: center; gap: 8px">
            <span style="font-weight: 500; min-width: 60px">第{{ vol }}卷</span>
            <a-input v-model:value="getVolumeForm(vol).catalog_no" placeholder="型番" style="width: 120px" />
            <a-input v-model:value="getVolumeForm(vol).volume_name" placeholder="标题" style="width: 240px" />
          </div>
        </a-space>
      </a-card>

      <!-- 文件树 -->
      <a-card size="small" v-if="files.length > 0" :body-style="{ padding: '12px' }">
        <template #title>
          <a-space>
            <span>文件列表</span>
            <a-tag color="blue">{{ files.length }} 个文件</a-tag>
          </a-space>
        </template>
        <a-tree :tree-data="treeData" :expand-on-click="false" :default-expanded-keys="defaultExpandedKeys">
          <template #title="{ key, title, isLeaf }">
            <div class="tree-node">
              <a-typography-text class="node-title" :ellipsis="{ tooltip: title }" :content="title" />
              <a-select
                :value="nodeData.get(key)?.volume_no"
                @change="(val) => onVolumeChange(key, val)"
                style="width: 100px"
                size="small"
                placeholder="卷号"
                allow-clear
              >
                <a-select-option v-for="vol in maxVolumes" :key="vol" :value="vol">第 {{ vol }} 卷</a-select-option>
              </a-select>
            </div>
          </template>
        </a-tree>
      </a-card>

      <a-empty v-else description="暂无文件数据" />
    </a-space>
  </a-modal>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import type { DataNode } from 'ant-design-vue/es/tree'

interface FileItem {
  _id?: string
  name: string
  size: number
  progress: number
}

interface VolumeForm {
  catalog_no: string
  volume_name: string
}

interface NodeData {
  volume_no?: number
  files?: string[]
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

const props = defineProps<{ torrentHash?: string; discId?: number }>()
const emit = defineEmits<{ (e: 'saved'): void; (e: 'closed'): void }>()

const visible = ref(false)
const saving = ref(false)
const torrentName = ref('')
const torrentId = ref('')
const volumeType = ref('volume')
const maxVolumes = 20

// 卷表单数据
const volumeForms = ref<Record<number, VolumeForm>>({})

// 文件列表
const files = ref<FileItem[]>([])

// 树数据
const treeData = ref<DataNode[]>([])
// 节点数据
const nodeData = ref<Map<string, NodeData>>(new Map())
// 扁平树结构
const flatTree = ref<FlatTree>({ map: new Map(), order: [], leaves: [] })
// 默认展开的键
const defaultExpandedKeys = ref<string[]>([])
// 卷号到节点 keys 的映射
const volumeToKeys = ref<Map<number, Set<string>>>(new Map())
// 文件 ID 到节点 key 的映射
const fileToKey = ref<Map<string, string>>(new Map())

// 计算已选择的卷号
const selectedVolumes = computed(() => {
  return Array.from(volumeToKeys.value.keys()).sort((a, b) => a - b)
})

// 构建树结构
const buildTree = () => {
  const root: Record<string, any> = {}

  // 构建树形结构
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
        isLeaf: isFile
      })
    })

    if (level === 0) defaultExpandedKeys.value = keys
    return result
  }

  const treeDataResult = buildTreeRecursive(root)

  // 批量更新
  flatTree.value = { map: flatMap, order, leaves }
  nodeData.value = nodeDataMap
  fileToKey.value = fileToKeyMap
  treeData.value = treeDataResult

  return treeDataResult
}

// 获取节点的所有子节点 keys（递归）
const getAllChildrenKeys = (key: string): string[] => {
  const children: string[] = []
  const nodePath = flatTree.value.map.get(key)
  if (!nodePath) return children

  // 遍历扁平树，找到所有子节点
  flatTree.value.order.forEach(k => {
    if (k.startsWith(key + '/') || k === key) {
      if (k !== key) {
        children.push(k)
      }
    }
  })
  return children
}

// 卷号变更 - 父节点变更时同步到所有子节点
const onVolumeChange = (key: string, volumeNo: number | null) => {
  const vol = volumeNo ?? undefined
  const oldVol = nodeData.value.get(key)?.volume_no

  // 获取所有需要更新的节点（当前节点 + 所有子节点）
  const nodesToUpdate = [key, ...getAllChildrenKeys(key)]

  // 批量更新节点数据
  nodesToUpdate.forEach(k => {
    const currentData = nodeData.value.get(k) || {}
    nodeData.value.set(k, { ...currentData, volume_no: vol })
  })

  // 更新反向索引
  nodesToUpdate.forEach(k => {
    if (vol !== undefined) {
      if (!volumeToKeys.value.has(vol)) volumeToKeys.value.set(vol, new Set())
      volumeToKeys.value.get(vol)!.add(k)
    }
    // 从旧卷号中移除
    if (oldVol !== undefined && oldVol !== vol) {
      volumeToKeys.value.get(oldVol)?.delete(k)
      if (volumeToKeys.value.get(oldVol)?.size === 0) {
        volumeToKeys.value.delete(oldVol)
      }
    }
  })

  emitUpdate()
}

// 发出更新事件
const emitUpdate = () => {
  // 发出 volumeFiles 更新
  const volumeFiles: Record<number, string[]> = {}
  selectedVolumes.value.forEach(vol => {
    volumeFiles[vol] = []
  })
  nodeData.value.forEach((data, key) => {
    if (data.volume_no && data.files?.length > 0) {
      const vol = data.volume_no
      if (!volumeFiles[vol]) volumeFiles[vol] = []
      data.files.forEach(fileId => {
        if (!volumeFiles[vol].includes(fileId)) {
          volumeFiles[vol].push(fileId)
        }
      })
    }
  })
}

// 获取或创建卷表单
const getVolumeForm = (vol: number) => {
  if (!volumeForms.value[vol]) {
    volumeForms.value[vol] = { catalog_no: '', volume_name: '' }
  }
  return volumeForms.value[vol]
}

// 判断是否是 BDMV 或 VIDEO_TS 相关
const isBDMVOrVideoTS = (key: string): boolean => {
  return key.includes('BDMV') || key.includes('VIDEO_TS') || key.endsWith('.m2ts') || key.endsWith('.vob') || key.endsWith('.iso')
}

// 重置所有数据
const resetData = () => {
  visible.value = false
  saving.value = false
  torrentName.value = ''
  torrentId.value = ''
  volumeType.value = 'volume'
  volumeForms.value = {}
  files.value = []
  treeData.value = []
  nodeData.value = new Map()
  flatTree.value = { map: new Map(), order: [], leaves: [] }
  defaultExpandedKeys.value = []
  volumeToKeys.value = new Map()
  fileToKey.value = new Map()
}

// 打开弹窗
const open = async (torrentHash: string, name: string = '', syncFiles = false) => {
  // 重置状态
  volumeForms.value = {}
  treeData.value = []
  nodeData.value = new Map()
  flatTree.value = { map: new Map(), order: [], leaves: [] }
  defaultExpandedKeys.value = []
  volumeToKeys.value = new Map()
  fileToKey.value = new Map()
  files.value = []

  visible.value = true
  torrentName.value = name

  // 获取 torrent 信息
  try {
    const { data } = await useFetch(`/api/qb/torrents/info`, { query: { hash: torrentHash } })
    if (data.value?.success) {
      const torrents = JSON.parse(data.value.data)
      const torrent = torrents?.[0]
      if (torrent) {
        torrentId.value = torrent._id
        console.log('[DiscEditor] torrentId:', torrentId.value)
      }
    }
  } catch (error) {
    console.error('获取 torrent 信息失败:', error)
  }

  // 获取文件列表
  try {
    const apiPath = syncFiles ? `/api/qb/torrents/files` : `/api/torrents/files`
    const { data } = await useFetch(apiPath, { query: { hash: torrentHash } })
    if (data.value?.success) {
      files.value = JSON.parse(data.value.data)
      console.log('[DiscEditor] files loaded:', files.value.length)
      // 文件加载完成后构建树
      await nextTick()
      buildTree()
      console.log('[DiscEditor] tree built, treeData:', treeData.value.length, 'fileToKey size:', fileToKey.value.size)

      // 树构建完成后，加载已保存的 BD 信息
      if (torrentId.value) {
        try {
          const { data } = await useFetch(`/api/torrents/bd-info`, { query: { torrent_id: torrentId.value } })
          if (data.value?.success) {
            const volumes = JSON.parse(data.value.data)
            console.log('[DiscEditor] loaded volumes:', volumes)
            if (volumes?.length > 0) {
              volumes.forEach((vol: any) => {
                // 恢复卷类型
                if (vol.volume_type) volumeType.value = vol.volume_type
                // 恢复卷表单
                const volNo = vol.volume_no
                if (volNo !== undefined) {
                  volumeForms.value[volNo] = {
                    catalog_no: vol.catalog_no || '',
                    volume_name: vol.volume_name || ''
                  }
                  // 恢复文件到卷号的映射
                  if (vol.files?.length > 0) {
                    console.log('[DiscEditor] setting volume for files:', vol.files, 'volume:', volNo)
                    vol.files.forEach((fileId: string) => {
                      setVolumeByFileId(fileId, volNo)
                    })
                  }
                }
              })
              console.log('[DiscEditor] after load, selectedVolumes:', selectedVolumes.value)
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
}

// 根据文件 ID 设置卷号（用于从 API 加载数据）
const setVolumeByFileId = (fileId: string, volumeNo: number) => {
  const key = fileToKey.value.get(fileId)
  console.log('[DiscEditor] setVolumeByFileId:', { fileId, key, volumeNo })

  if (!key) {
    console.warn('[DiscEditor] file not found in tree:', fileId)
    return
  }

  const vol = volumeNo
  const oldVol = nodeData.value.get(key)?.volume_no

  // 更新当前节点
  const currentData = nodeData.value.get(key) || {}
  nodeData.value.set(key, { ...currentData, volume_no: vol })
  console.log('[DiscEditor] updated node:', key, 'volume:', vol)

  // 更新反向索引
  if (vol !== undefined) {
    if (!volumeToKeys.value.has(vol)) volumeToKeys.value.set(vol, new Set())
    volumeToKeys.value.get(vol)!.add(key)
  }
  // 从旧卷号中移除
  if (oldVol !== undefined && oldVol !== vol) {
    volumeToKeys.value.get(oldVol)?.delete(key)
    if (volumeToKeys.value.get(oldVol)?.size === 0) {
      volumeToKeys.value.delete(oldVol)
    }
  }

  emitUpdate()
}

// 提交保存
const handleSubmit = async () => {
  if (!torrentId.value) return

  saving.value = true
  try {
    // 获取卷文件映射
    const files: Record<number, string[]> = {}
    selectedVolumes.value.forEach(vol => {
      files[vol] = []
    })
    nodeData.value.forEach((data, key) => {
      if (data.volume_no && data.files?.length > 0) {
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
    const savePromises = selectedVolumes.value.map(volNo =>
      useFetch(`/api/volumes`, {
        method: 'POST',
        body: {
          torrent_id: torrentId.value,
          files: files[volNo] || [],
          volumes: [{
            type: volumeType.value,
            volume_no: volNo,
            sort_order: volNo,
            volume_name: volumeForms.value[volNo]?.volume_name || '',
            catalog_no: volumeForms.value[volNo]?.catalog_no || '',
          }],
        },
      })
    )

    await Promise.all(savePromises)
    message.success('保存成功')
    emit('saved')
    visible.value = false
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  emit('closed')
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

defineExpose({ open })
</script>

<style scoped>
.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.node-title {
  flex: 1;
  min-width: 0;
}
</style>
