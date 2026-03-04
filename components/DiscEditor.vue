<template>
  <a-modal
    v-model:open="visible"
    title="编辑产品信息"
    wrap-class-name="disc-editor-modal"
    :width="modalWidth"
    :body-style="{ padding: '16px 24px' }"
    :confirm-loading="saving"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="disc-editor-content">
      <!-- 类型选择 -->
      <div class="type-selector">
        <a-radio-group v-model:value="volume_type" button-style="solid" @change="onTypeChange">
          <a-radio-button value="volume">分卷</a-radio-button>
          <a-radio-button value="box">BOX</a-radio-button>
        </a-radio-group>
      </div>

      <!-- 分卷信息栏 - 根据文件树中的选择动态显示 -->
      <div class="volume-forms" v-if="uniqueVolumes.length > 0">
        <a-card size="small" class="volume-card">
          <div class="volume-forms-grid">
            <div v-for="(vol, index) in uniqueVolumes" :key="vol" class="volume-form">
              <a-form :model="volumeForms[vol]" layout="inline">
                <a-form-item label="卷号">
                  <span class="volume-label">第 {{ vol }} 卷</span>
                </a-form-item>
                <a-form-item label="管理番号">
                  <a-input
                    v-model:value="volumeForms[vol].suruga_id"
                    placeholder="骏河屋管理番号"
                    style="width: 150px"
                  />
                </a-form-item>
                <a-form-item label="型番">
                  <a-input
                    v-model:value="volumeForms[vol].catalog_no"
                    placeholder="例：ANZX-1234"
                    style="width: 150px"
                  />
                </a-form-item>
              </a-form>
            </div>
          </div>
        </a-card>
      </div>

      <!-- 文件树 -->
      <div v-if="files.length > 0" class="file-tree-section">
        <div class="tree-header">
          <span class="tree-title">文件列表</span>
          <a-tag color="blue">{{ files.length }} 个文件</a-tag>
        </div>
        <div class="tree-container">
          <a-tree
            :tree-data="fileTreeData"
            :expand-on-click="false"
            :default-expanded-keys="firstLevelKeys"
          >
            <template #title="{ key, title, isLeaf }">
              <div class="tree-node">
                <span class="node-title" :title="title">{{ title }}</span>
                <div class="node-fields">
                  <a-select
                    v-if="!isLeaf || isBDMVOrVideoTS(key)"
                    :value="getNodeData(key, 'volume_no')"
                    @change="(val) => onNodeChange(key, 'volume_no', val)"
                    style="width: 100px"
                    size="small"
                    placeholder="卷号"
                    allow-clear
                  >
                    <a-select-option v-for="i in 20" :key="i" :value="i">
                      第 {{ i }} 卷
                    </a-select-option>
                  </a-select>
                </div>
              </div>
            </template>
          </a-tree>
        </div>
      </div>

      <!-- 空状态 -->
      <a-empty v-else description="暂无文件数据" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import type { DataNode } from 'ant-design-vue/es/tree'
import { message } from 'ant-design-vue'

// 合并 VolumeForm 和 NodeData 为一个统一类型
interface DiscFormData {
  suruga_id?: string
  catalog_no?: string
  volume_no?: number
}

interface FileItem {
  name: string
  size: number
  progress: number
}

const props = defineProps<{
  torrentHash?: string
  discId?: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'closed'): void
}>()

const visible = ref(false)
const saving = ref(false)
const volume_type = ref('volume')
const selectedVolumes = ref<number[]>([1])
const volumeForms = ref<Record<number, DiscFormData>>({
  1: { suruga_id: '', catalog_no: '' },
})

const files = ref<FileItem[]>([])
const fileTreeData = ref<DataNode[]>([])
const nodeData = ref<Record<string, DiscFormData>>({})
const firstLevelKeys = ref<string[]>([])

// 计算 Modal 宽度（自适应内容）
const modalWidth = computed(() => {
  const baseWidth = 900
  // 根据卷数调整，但限制最大宽度
  const extraWidth = Math.min(uniqueVolumes.value.length * 50, 300)
  return `${baseWidth + extraWidth}px`
})

// 计算文件树中已选择的唯一卷号
const uniqueVolumes = computed(() => {
  const volumes = new Set<number>()
  Object.values(nodeData.value).forEach(data => {
    if (data.volume_no) {
      volumes.add(data.volume_no)
    }
  })
  return Array.from(volumes).sort((a, b) => a - b)
})

// 判断是否是 BDMV 或 VIDEO_TS 目录
const isBDMVOrVideoTS = (key: string): boolean => {
  return key.includes('BDMV') || key.includes('VIDEO_TS') || key.endsWith('.m2ts') || key.endsWith('.vob')
}

// 类型变更
const onTypeChange = () => {
  // 根据类型设置默认卷数
  if (volume_type.value === 'volume') {
    selectedVolumes.value = [1]
  } else if (volume_type.value === 'box') {
    selectedVolumes.value = [1]
  }

  // 初始化卷表单
  selectedVolumes.value.forEach(vol => {
    if (!volumeForms.value[vol]) {
      volumeForms.value[vol] = { suruga_id: '', catalog_no: '' }
    }
  })
}

// 重置表单数据
const resetForms = () => {
  volumeForms.value = {}
  nodeData.value = {}
  selectedVolumes.value = []
}

// 打开编辑器
const open = async (torrentHash: string, syncFiles = false) => {
  visible.value = true
  
  // 重置数据
  resetForms()

  // 只有手动同步时才从 qBittorrent 获取最新文件列表
  // 否则使用数据库中的文件数据
  try {
    const apiPath = syncFiles
      ? `/api/qb/torrents/files`
      : `/api/torrents/files`  // 从数据库获取

    const { data } = await useFetch(apiPath, {
      query: { hash: torrentHash },
    })
    if (data.value?.success) {
      files.value = JSON.parse(data.value.data)
      buildFileTree()
    }
  } catch (error) {
    console.error('获取文件列表失败:', error)
  }

  // 优先从数据库加载 BD 信息（通过 torrent_hash 查找）
  try {
    const { data } = await useFetch(`/api/torrents/bd-info`, {
      query: { hash: torrentHash },
    })
    if (data.value?.success) {
      const bdInfo = JSON.parse(data.value.data)
      if (bdInfo) {
        volume_type.value = bdInfo.volume_type || 'volume'
        const volNo = bdInfo.volume_no || 1

        // 加载表单数据
        if (!volumeForms.value[volNo]) {
          volumeForms.value[volNo] = {
            suruga_id: bdInfo.suruga_id || '',
            catalog_no: bdInfo.catalog_no || ''
          }
        }

        // 根据类型设置卷数
        onTypeChange()
      }
    }
  } catch (error) {
    console.error('获取 BD 信息失败:', error)
  }
}

// 构建文件树
const buildFileTree = () => {
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

  const buildTree = (
    node: Record<string, any>,
    parentPath = '',
    parentNode: DiscFormData | null = null,
    level = 0
  ): DataNode[] => {
    const result: DataNode[] = []
    const keys: string[] = []

    Object.entries(node).forEach(([key, value]) => {
      const isFile = !!(value as Record<string, any>)._file
      const file = (value as Record<string, any>)._file
      const fullPath = `${parentPath}${key}`

      // 继承父节点的数据
      const inheritedData: DiscFormData = parentNode ? { ...parentNode } : {}
      nodeData.value[fullPath] = inheritedData

      const children = isFile
        ? []
        : buildTree(value as Record<string, any>, `${fullPath}/`, inheritedData, level + 1)

      // 收集第一级的 key
      if (level === 0) {
        keys.push(fullPath)
      }

      result.push({
        title: `${key}${isFile ? ` (${formatSize(file.size)})` : ''}`,
        key: fullPath,
        children,
        isLeaf: isFile,
      })
    })

    if (level === 0) {
      firstLevelKeys.value = keys
    }

    return result
  }

  fileTreeData.value = buildTree(root)
}

// 节点变更时，同步更新子节点
const onNodeChange = (key: string, field: string, value: any) => {
  // 确保节点数据存在
  if (!nodeData.value[key]) {
    nodeData.value[key] = {}
  }

  // 更新当前节点的字段（允许清空，undefined 或 null 表示清空）
  (nodeData.value[key] as any)[field] = value === undefined ? null : value

  // 查找所有子节点并更新
  const childKeys = Object.keys(nodeData.value).filter(k => k.startsWith(key + '/'))
  childKeys.forEach(childKey => {
    if (!nodeData.value[childKey]) {
      nodeData.value[childKey] = {}
    }
    (nodeData.value[childKey] as any)[field] = value === undefined ? null : value
  })

  // 当卷号变更时，初始化新卷的表单数据
  if (field === 'volume_no' && value) {
    if (!volumeForms.value[value]) {
      volumeForms.value[value] = { suruga_id: '', catalog_no: '' }
    }
  }
}

// 获取节点数据
const getNodeData = (key: string, field: string) => {
  return nodeData.value[key]?.[field as keyof DiscFormData]
}

// 提交表单
const handleSubmit = async () => {
  saving.value = true

  try {
    if (props.torrentHash) {
      // 获取第一个卷的数据
      const firstVolNo = Object.keys(volumeForms.value)[0]
      const firstVolData = volumeForms.value[firstVolNo] || {}

      // 保存到 bd_info 表
      const { data } = await useFetch(`/api/torrents/bd-info`, {
        method: 'POST',
        query: { hash: props.torrentHash },
        body: {
          catalog_no: firstVolData.catalog_no || '',
          catalog_maker: '',
          maker: '',
          release_date: '',
          model_no: '',
          version_type: '',
          bonus_status: '',
          suruga_id: firstVolData.suruga_id || '',
          volume_type: volume_type.value,
          volume_no: firstVolData.volume_no || 0,
          note: '',
        },
      })

      if (data.value?.success) {
        message.success('保存成功')
        emit('saved')
        visible.value = false
      } else {
        message.error(data.value?.error || '保存失败')
      }
    }
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
  emit('closed')
}

// 格式化大小
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
.disc-editor-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-selector {
  padding: 8px 0;
}

.volume-forms {
  margin-bottom: 8px;
}

.volume-card {
  background: #fafafa;
}

.volume-forms-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.volume-form {
  display: flex;
  align-items: center;
}

.volume-label {
  min-width: 60px;
  display: inline-block;
  font-weight: 500;
}

.file-tree-section {
  margin-top: 8px;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}

.tree-title {
  font-weight: 500;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
}

.tree-container {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
}

.tree-container :deep(.ant-tree-treenode) {
  padding: 4px 0;
  border-radius: 4px;
}

.tree-container :deep(.ant-tree-treenode:hover) {
  background: #e6f7ff;
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 2px 4px;
}

.node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.node-fields {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

/* Modal 全局样式 */
:deep(.disc-editor-modal .ant-modal-body) {
  padding: 16px 24px;
}

:deep(.disc-editor-modal .ant-modal-header) {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}
</style>
