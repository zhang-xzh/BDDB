<template>
  <a-modal
    v-model:open="visible"
    title="编辑光盘信息"
    width="900px"
    :confirm-loading="saving"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="目录编号">
            <a-input v-model:value="form.catalog_no" placeholder="例：ANZX-1234" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="目录制作者">
            <a-input v-model:value="form.catalog_maker" placeholder="例：Aniplex" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="制造商">
            <a-input v-model:value="form.maker" placeholder="例：Bandai Namco" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="发行日期">
            <a-input v-model:value="form.release_date" placeholder="YYYY-MM-DD" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="版本类型">
            <a-select v-model:value="form.version_type" allow-clear placeholder="选择版本类型">
              <a-select-option value="standard">标准版</a-select-option>
              <a-select-option value="deluxe">豪华版</a-select-option>
              <a-select-option value="limited">限定版</a-select-option>
              <a-select-option value="complete">完全版</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="特典状态">
            <a-select v-model:value="form.bonus_status" allow-clear placeholder="选择特典">
              <a-select-option value="none">无</a-select-option>
              <a-select-option value="included">有</a-select-option>
              <a-select-option value="unknown">未知</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Suruga ID">
            <a-input v-model:value="form.suruga_id" placeholder="骏河屋管理番号" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="光盘类型">
            <a-select v-model:value="form.disc_type" style="width: 100%">
              <a-select-option value="single">单卷</a-select-option>
              <a-select-option value="volume">分卷</a-select-option>
              <a-select-option value="volume_box">分卷合集</a-select-option>
              <a-select-option value="box">BOX</a-select-option>
              <a-select-option value="box_collection">BOX 合集</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="卷号">
            <a-input-number v-model:value="form.volume_no" :min="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="盘号">
            <a-input-number v-model:value="form.disc_no" :min="1" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="备注">
        <a-textarea v-model:value="form.note" :rows="2" placeholder="其他备注信息" />
      </a-form-item>
    </a-form>

    <!-- 文件树 -->
    <div v-if="files.length > 0" class="file-tree-section">
      <a-divider>文件结构</a-divider>
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px; font-size: 12px;"
        message="下级节点自动继承上级节点的卷号和骏河屋信息，可单独修改"
      />
      <div class="tree-container">
        <a-tree
          :tree-data="fileTreeData"
          :expand-on-click="false"
          default-expand-all
          :height="400"
        >
          <template #title="{ key, title, isLeaf, nodeRef }">
            <div class="tree-node">
              <span class="node-title">{{ title }}</span>
              <div class="node-fields" v-if="!isLeaf || isBDMVOrVideoTS(key)">
                <a-space size="small">
                  <a-select
                    v-model:value="nodeData[key]?.volume_no"
                    @change="onNodeChange(key)"
                    style="width: 100px"
                    size="small"
                    placeholder="卷号"
                    allow-clear
                  >
                    <a-select-option :value="1">第 1 卷</a-select-option>
                    <a-select-option :value="2">第 2 卷</a-select-option>
                    <a-select-option :value="3">第 3 卷</a-select-option>
                    <a-select-option :value="4">第 4 卷</a-select-option>
                    <a-select-option :value="5">第 5 卷</a-select-option>
                    <a-select-option :value="6">第 6 卷</a-select-option>
                    <a-select-option :value="7">第 7 卷</a-select-option>
                    <a-select-option :value="8">第 8 卷</a-select-option>
                    <a-select-option :value="9">第 9 卷</a-select-option>
                    <a-select-option :value="10">第 10 卷</a-select-option>
                    <a-select-option :value="99">BOX</a-select-option>
                  </a-select>
                  <a-input
                    v-model:value="nodeData[key]?.suruga_id"
                    @input="onNodeChange(key)"
                    placeholder="骏河屋 ID"
                    size="small"
                    style="width: 120px"
                  />
                  <a-input
                    v-model:value="nodeData[key]?.catalog_no"
                    @input="onNodeChange(key)"
                    placeholder="型番"
                    size="small"
                    style="width: 120px"
                  />
                </a-space>
              </div>
            </div>
          </template>
        </a-tree>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import type { DataNode } from 'ant-design-vue/es/tree'
import { message } from 'ant-design-vue'

interface DiscForm {
  catalog_no: string
  catalog_maker: string
  maker: string
  release_date: string
  version_type: string
  bonus_status: string
  suruga_id: string
  volume_no: number
  disc_no: number
  disc_type: string
  note: string
}

interface FileItem {
  name: string
  size: number
  progress: number
}

interface NodeData {
  volume_no?: number
  suruga_id?: string
  catalog_no?: string
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
const form = ref<DiscForm>({
  catalog_no: '',
  catalog_maker: '',
  maker: '',
  release_date: '',
  version_type: '',
  bonus_status: '',
  suruga_id: '',
  volume_no: 0,
  disc_no: 1,
  disc_type: 'single',
  note: '',
})

const files = ref<FileItem[]>([])
const fileTreeData = ref<DataNode[]>([])
const nodeData = ref<Record<string, NodeData>>({})

// 打开编辑器
const open = async () => {
  visible.value = true

  // 加载文件列表
  if (props.torrentHash) {
    try {
      const { data } = await useFetch(`/api/qb/torrents/files`, {
        query: { hash: props.torrentHash },
      })
      if (data.value?.success) {
        files.value = JSON.parse(data.value.data)
        buildFileTree()
      }
    } catch (error) {
      console.error('获取文件列表失败:', error)
    }
  }

  // 如果是编辑已有光盘，加载数据
  if (props.discId) {
    try {
      const { data } = await useFetch(`/api/discs/${props.discId}`)
      if (data.value?.success) {
        const disc = JSON.parse(data.value.data)
        form.value = {
          catalog_no: disc.catalog_no || '',
          catalog_maker: disc.catalog_maker || '',
          maker: disc.maker || '',
          release_date: disc.release_date || '',
          version_type: disc.version_type || '',
          bonus_status: disc.bonus_status || '',
          suruga_id: disc.suruga_id || '',
          volume_no: disc.volume_no || 0,
          disc_no: disc.disc_no || 1,
          disc_type: disc.disc_type || 'single',
          note: disc.note || '',
        }
      }
    } catch (error) {
      console.error('获取光盘信息失败:', error)
    }
  }
}

// 判断是否是 BDMV 或 VIDEO_TS 目录
const isBDMVOrVideoTS = (key: string): boolean => {
  return key.includes('BDMV') || key.includes('VIDEO_TS') || key.endsWith('.m2ts') || key.endsWith('.vob')
}

// 打开编辑器
const open = async () => {
  visible.value = true

  // 加载文件列表
  if (props.torrentHash) {
    try {
      const { data } = await useFetch(`/api/qb/torrents/files`, {
        query: { hash: props.torrentHash },
      })
      if (data.value?.success) {
        files.value = JSON.parse(data.value.data)
        buildFileTree()
      }
    } catch (error) {
      console.error('获取文件列表失败:', error)
    }
  }

  // 如果是编辑已有光盘，加载数据
  if (props.discId) {
    try {
      const { data } = await useFetch(`/api/discs/${props.discId}`)
      if (data.value?.success) {
        const disc = JSON.parse(data.value.data)
        form.value = {
          catalog_no: disc.catalog_no || '',
          catalog_maker: disc.catalog_maker || '',
          maker: disc.maker || '',
          release_date: disc.release_date || '',
          version_type: disc.version_type || '',
          bonus_status: disc.bonus_status || '',
          suruga_id: disc.suruga_id || '',
          volume_no: disc.volume_no || 0,
          disc_no: disc.disc_no || 1,
          disc_type: disc.disc_type || 'single',
          note: disc.note || '',
        }
      }
    } catch (error) {
      console.error('获取光盘信息失败:', error)
    }
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

  const buildTree = (node: Record<string, any>, parentPath = '', parentNode: NodeData | null = null): DataNode[] => {
    const result: DataNode[] = []
    Object.entries(node).forEach(([key, value]) => {
      const isFile = !!(value as Record<string, any>)._file
      const file = (value as Record<string, any>)._file
      const fullPath = `${parentPath}${key}`
      
      // 继承父节点的数据
      const inheritedData: NodeData = parentNode ? { ...parentNode } : {}
      nodeData.value[fullPath] = inheritedData

      const children = isFile ? [] : buildTree(value as Record<string, any>, `${fullPath}/`, inheritedData)

      result.push({
        title: `${key}${isFile ? ` (${formatSize(file.size)})` : ''}`,
        key: fullPath,
        children,
        isLeaf: isFile,
      })
    })
    return result
  }

  fileTreeData.value = buildTree(root)
}

// 节点变更时，同步更新子节点
const onNodeChange = (key: string) => {
  const currentNode = nodeData.value[key]
  if (!currentNode) return

  // 查找所有子节点并更新
  const updateChildren = (nodeKey: string) => {
    const childKeys = Object.keys(nodeData.value).filter(k => k.startsWith(nodeKey + '/'))
    childKeys.forEach(childKey => {
      nodeData.value[childKey] = { ...currentNode }
    })
  }

  updateChildren(key)
}

// 提交表单
const handleSubmit = async () => {
  saving.value = true

  try {
    if (props.discId) {
      // 更新现有光盘
      const { data } = await useFetch(`/api/discs/${props.discId}`, {
        method: 'PUT',
        body: {
          ...form.value,
          node_data: nodeData.value,
        },
      })

      if (data.value?.success) {
        message.success('保存成功')
        emit('saved')
        visible.value = false
      } else {
        message.error(data.value?.error || '保存失败')
      }
    } else if (props.torrentHash) {
      // 创建新光盘
      const { data } = await useFetch(`/api/discs`, {
        method: 'POST',
        body: {
          torrent_hash: props.torrentHash,
          ...form.value,
          node_data: nodeData.value,
        },
      })

      if (data.value?.success) {
        message.success('创建成功')
        emit('saved')
        visible.value = false
      } else {
        message.error(data.value?.error || '创建失败')
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
.file-tree-section {
  margin-top: 16px;
}

.tree-container {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.node-title {
  flex: 1;
}

.node-fields {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-node:hover .node-fields {
  opacity: 1;
}
</style>
