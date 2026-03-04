<template>
  <a-modal
    v-model:open="visible"
    :title="torrentName || '编辑产品信息'"
    wrap-class-name="disc-editor-modal"
    :width="modalWidth"
    :confirm-loading="saving"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-space direction="vertical" style="width: 100%" :size="16">
      <a-radio-group v-model:value="volume_type" button-style="solid" @change="onTypeChange">
        <a-radio-button value="volume">分卷</a-radio-button>
        <a-radio-button value="box">BOX</a-radio-button>
      </a-radio-group>

      <a-card size="small" v-if="uniqueVolumes.length > 0">
        <a-space :size="12" wrap>
          <a-form
            v-for="vol in uniqueVolumes"
            :key="vol"
            layout="inline"
            :model="volumeForms[vol]"
          >
            <a-form-item label="卷号">
              <span>{{ vol }}</span>
            </a-form-item>
            <a-form-item label="分卷标题">
              <a-input v-model:value="volumeForms[vol].volume_name" placeholder="分卷标题" style="width: 200px" />
            </a-form-item>
            <a-form-item label="型番">
              <a-input v-model:value="volumeForms[vol].catalog_no" placeholder="ANZX-1234" style="width: 150px" />
            </a-form-item>
          </a-form>
        </a-space>
      </a-card>

      <a-card size="small" v-if="files.length > 0" :body-style="{ padding: '12px' }">
        <template #title>
          <a-space>
            <span>文件列表</span>
            <a-tag color="blue">{{ files.length }} 个文件</a-tag>
          </a-space>
        </template>
        <a-tree :tree-data="fileTreeData" :expand-on-click="false" :default-expanded-keys="firstLevelKeys">
          <template #title="{ key, title, isLeaf }">
            <div class="tree-node">
              <a-typography-text class="node-title" :ellipsis="{ tooltip: title }">{{ title }}</a-typography-text>
              <a-select
                v-if="!isLeaf || isBDMVOrVideoTS(key)"
                :value="getNodeData(key, 'volume_no')"
                @change="(val) => onNodeChange(key, 'volume_no', val)"
                style="width: 100px"
                size="small"
                placeholder="卷号"
                allow-clear
              >
                <a-select-option v-for="i in 20" :key="i" :value="i">第 {{ i }} 卷</a-select-option>
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
import type { DataNode } from 'ant-design-vue/es/tree'
import { message } from 'ant-design-vue'

interface DiscFormData {
  volume_name?: string
  catalog_no?: string
  volume_no?: number
}

interface FileItem {
  name: string
  size: number
  progress: number
}

const props = defineProps<{ torrentHash?: string; discId?: number }>()
const emit = defineEmits<{ (e: 'saved'): void; (e: 'closed'): void }>()

const visible = ref(false)
const saving = ref(false)
const torrentName = ref('')
const volume_type = ref('volume')
const selectedVolumes = ref<number[]>([1])
const volumeForms = ref<Record<number, DiscFormData>>({ 1: { volume_name: '', catalog_no: '' } })

const files = ref<FileItem[]>([])
const fileTreeData = ref<DataNode[]>([])
const nodeData = ref<Record<string, DiscFormData>>({})
const firstLevelKeys = ref<string[]>([])

const modalWidth = computed(() => {
  const baseWidth = 900
  const extraWidth = Math.min(uniqueVolumes.value.length * 50, 300)
  return `${baseWidth + extraWidth}px`
})

const uniqueVolumes = computed(() => {
  const volumes = new Set<number>()
  Object.values(nodeData.value).forEach(data => {
    if (data.volume_no) volumes.add(data.volume_no)
  })
  return Array.from(volumes).sort((a, b) => a - b)
})

const isBDMVOrVideoTS = (key: string): boolean => {
  return key.includes('BDMV') || key.includes('VIDEO_TS') || key.endsWith('.m2ts') || key.endsWith('.vob')
}

const onTypeChange = () => {
  selectedVolumes.value = volume_type.value === 'volume' ? [1] : [1]
  selectedVolumes.value.forEach(vol => {
    if (!volumeForms.value[vol]) volumeForms.value[vol] = { volume_name: '', catalog_no: '' }
  })
}

const resetForms = () => {
  volumeForms.value = {}
  nodeData.value = {}
  selectedVolumes.value = []
}

const open = async (torrentHash: string, name: string = '', syncFiles = false) => {
  visible.value = true
  torrentName.value = name
  resetForms()

  try {
    const apiPath = syncFiles ? `/api/qb/torrents/files` : `/api/torrents/files`
    const { data } = await useFetch(apiPath, { query: { hash: torrentHash } })
    if (data.value?.success) {
      files.value = JSON.parse(data.value.data)
      buildFileTree()
    }
  } catch (error) {
    console.error('获取文件列表失败:', error)
  }

  try {
    const { data } = await useFetch(`/api/torrents/bd-info`, { query: { hash: torrentHash } })
    if (data.value?.success) {
      const bdInfo = JSON.parse(data.value.data)
      if (bdInfo) {
        volume_type.value = bdInfo.volume_type || 'volume'
        const volNo = bdInfo.volume_no || 1
        if (!volumeForms.value[volNo]) {
          volumeForms.value[volNo] = {
            volume_name: bdInfo.volume_name || '',
            catalog_no: bdInfo.catalog_no || ''
          }
        }
        onTypeChange()
      }
    }
  } catch (error) {
    console.error('获取 BD 信息失败:', error)
  }
}

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

  const buildTree = (node: Record<string, any>, parentPath = '', parentNode: DiscFormData | null = null, level = 0): DataNode[] => {
    const result: DataNode[] = []
    const keys: string[] = []

    Object.entries(node).forEach(([key, value]) => {
      const isFile = !!(value as Record<string, any>)._file
      const file = (value as Record<string, any>)._file
      const fullPath = `${parentPath}${key}`
      const inheritedData: DiscFormData = parentNode ? { ...parentNode } : {}
      nodeData.value[fullPath] = inheritedData
      const children = isFile ? [] : buildTree(value as Record<string, any>, `${fullPath}/`, inheritedData, level + 1)
      if (level === 0) keys.push(fullPath)
      result.push({ title: `${key}${isFile ? ` (${formatSize(file.size)})` : ''}`, key: fullPath, children, isLeaf: isFile })
    })

    if (level === 0) firstLevelKeys.value = keys
    return result
  }

  fileTreeData.value = buildTree(root)
}

const onNodeChange = (key: string, field: string, value: any) => {
  if (!nodeData.value[key]) nodeData.value[key] = {}
  (nodeData.value[key] as any)[field] = value === undefined ? null : value
  const childKeys = Object.keys(nodeData.value).filter(k => k.startsWith(key + '/'))
  childKeys.forEach(childKey => {
    if (!nodeData.value[childKey]) nodeData.value[childKey] = {}
    (nodeData.value[childKey] as any)[field] = value === undefined ? null : value
  })
  if (field === 'volume_no' && value && !volumeForms.value[value]) {
    volumeForms.value[value] = { volume_name: '', catalog_no: '' }
  }
}

const getNodeData = (key: string, field: string) => nodeData.value[key]?.[field as keyof DiscFormData]

const handleSubmit = async () => {
  saving.value = true
  try {
    if (props.torrentHash) {
      const firstVolNo = Object.keys(volumeForms.value)[0]
      const firstVolData = volumeForms.value[firstVolNo] || {}
      const { data } = await useFetch(`/api/torrents/bd-info`, {
        method: 'POST',
        query: { hash: props.torrentHash },
        body: {
          volume_name: firstVolData.volume_name || '',
          catalog_no: firstVolData.catalog_no || '',
          volume_type: volume_type.value,
          volume_no: firstVolData.volume_no || 0,
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
