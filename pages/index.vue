<template>
  <NuxtLayout>
    <div class="home">
      <!-- 操作栏 -->
      <div class="toolbar">
        <a-space>
          <a-button type="primary" @click="syncTorrents" :loading="syncing">
            <template #icon><SyncOutlined /></template>
            同步 qBittorrent
          </a-button>
          <a-input-search
            v-model:value="searchText"
            placeholder="搜索种子"
            style="width: 200px"
            @search="handleSearch"
          />
        </a-space>
      </div>

      <!-- 种子列表 -->
      <a-table
        :columns="columns"
        :data-source="torrents"
        :loading="loading"
        :pagination="pagination"
        row-key="hash"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a @click.prevent="showTorrentDetail(record)">
              {{ record.name }}
            </a>
          </template>
          <template v-if="column.key === 'progress'">
            <a-progress
              :percent="parseFloat(record.progress).toFixed(1)"
              :status="record.progress === 100 ? 'success' : 'active'"
              size="small"
            />
          </template>
          <template v-if="column.key === 'state'">
            <a-badge :status="getStateStatus(record.state)" :text="getStateText(record.state)" />
          </template>
          <template v-if="column.key === 'size'">
            {{ formatSize(record.size) }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editDisc(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" @click="syncDiscFiles(record)">
                <SyncOutlined />
                同步文件
              </a-button>
              <a-button type="link" size="small" danger @click="deleteTorrent(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>

      <!-- 光盘编辑器 -->
      <DiscEditor
        ref="discEditorRef"
        @saved="handleDiscSaved"
      />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue'
import {
  DatabaseOutlined,
  DownloadOutlined,
  RiseOutlined,
  PauseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import DiscEditor from '~/components/DiscEditor.vue'

const confirm = Modal.confirm

interface Torrent {
  hash: string
  name: string
  size: number
  progress: number
  state: string
  num_seeds: number
  num_leechs: number
  added_on: number
  torrent_type?: string
  file_count?: number
}

interface Stats {
  total: number
  downloading: number
  seeding: number
  paused: number
  total_size: number
}

const loading = ref(false)
const syncing = ref(false)
const torrents = ref<Torrent[]>([])
const stats = ref<Stats>({
  total: 0,
  downloading: 0,
  seeding: 0,
  paused: 0,
  total_size: 0,
})

const filterState = ref<string>()
const searchText = ref('')
const discEditorRef = ref<InstanceType<typeof DiscEditor>>()

const pagination = {
  pageSize: 50,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
}

const columns: TableColumnsType<Torrent> = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
  },
  {
    title: '进度',
    dataIndex: 'progress',
    key: 'progress',
    width: 120,
  },
  {
    title: '状态',
    dataIndex: 'state',
    key: 'state',
    width: 100,
    filters: [
      { text: '下载中', value: 'downloading' },
      { text: '做种中', value: 'uploading' },
      { text: '已暂停', value: 'paused' },
      { text: '已完成', value: 'completed' },
    ],
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
    width: 100,
    sorter: (a, b) => a.size - b.size,
  }
]

// 获取种子列表
const fetchTorrents = async () => {
  loading.value = true
  try {
    const res = await $fetch('/api/qb/torrents/info', {
      query: {
        state: filterState.value,
        search: searchText.value,
      },
    })
    console.log('fetchTorrents response:', res)
    if (res.success) {
      torrents.value = JSON.parse(res.data)
      console.log('torrents loaded:', torrents.value.length)
    } else {
      console.error('fetchTorrents failed:', res.error)
    }
  } catch (error) {
    console.error('获取种子列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取统计信息
const fetchStats = async () => {
  try {
    const res = await $fetch('/api/qb/torrents/stats')
    console.log('fetchStats response:', res)
    if (res.success) {
      stats.value = JSON.parse(res.data)
    } else {
      console.error('fetchStats failed:', res.error)
    }
  } catch (error) {
    console.error('获取统计信息失败:', error)
  }
}

// 同步 qBittorrent
const syncTorrents = async () => {
  syncing.value = true
  try {
    const { data } = await useFetch('/api/qb/torrents/sync', { method: 'POST' })
    if (data.value?.success) {
      message.success('开始同步 qBittorrent')
      setTimeout(() => {
        fetchTorrents()
        fetchStats()
      }, 2000)
    } else {
      message.error(data.value?.error || '同步失败')
    }
  } catch (error) {
    console.error('同步失败:', error)
    message.error('同步失败')
  } finally {
    syncing.value = false
  }
}

// 搜索
const handleSearch = () => {
  fetchTorrents()
}

// 显示种子详情
const showTorrentDetail = (record: Torrent) => {
  // 点击名称时打开光盘编辑器
  editDisc(record)
}

// 编辑光盘
const editDisc = (record: Torrent) => {
  discEditorRef.value?.open(record.hash, record.name, false)
}

// 同步光盘文件（从 qBittorrent 获取最新文件列表）
const syncDiscFiles = (record: Torrent) => {
  discEditorRef.value?.open(record.hash, record.name, true)
}

// 光盘保存成功回调
const handleDiscSaved = () => {
  fetchTorrents()
}

// 删除种子
const deleteTorrent = async (record: Torrent) => {
  await confirm({
    title: '确认删除',
    content: `确定要删除种子 "${record.name}" 吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        const { data } = await useFetch(`/api/qb/torrents/delete?hash=${record.hash}`, {
          method: 'POST',
        })
        if (data.value?.success) {
          message.success('删除成功')
          fetchTorrents()
          fetchStats()
        } else {
          message.error(data.value?.error || '删除失败')
        }
      } catch (error) {
        console.error('删除失败:', error)
        message.error('删除失败')
      }
    },
  })
}

// 格式化大小
const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 获取状态样式
const getStateStatus = (state: string) => {
  if (state === 'downloading') return 'processing'
  if (state === 'uploading') return 'success'
  if (state.includes('paused')) return 'warning'
  if (state === 'completed') return 'success'
  return 'default'
}

// 获取状态文本
const getStateText = (state: string) => {
  const stateMap: Record<string, string> = {
    downloading: '下载中',
    uploading: '做种中',
    pausedDL: '已暂停',
    pausedUP: '已暂停',
    completed: '已完成',
  }
  return stateMap[state] || state
}

onMounted(() => {
  fetchTorrents()
  fetchStats()
})
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-row {
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
