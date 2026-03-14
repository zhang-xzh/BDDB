// Bangumi API 客户端 - 1:1 复制 Bangumi API 数据结构
// 文档: https://bangumi.github.io/api/

const BANGUMI_API_BASE = 'https://api.bgm.tv'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/**
 * Bangumi API 图片信息
 * 提供不同尺寸的图片 URL
 */
export interface BangumiImages {
  /** 大尺寸图片 (约 800x600) */
  large: string
  /** 普通尺寸图片 (约 400x300) */
  common: string
  /** 中等尺寸图片 (约 200x150) */
  medium: string
  /** 小尺寸图片 (约 100x75) */
  small: string
  /** 网格尺寸图片 (约 50x50) */
  grid: string
}

/**
 * Bangumi API 评分信息
 * 包含总体评分和各分数段人数分布
 */
export interface BangumiRating {
  /** 平均评分 (0-10) */
  score: number
  /** 总评分人数 */
  total: number
  /** 各分数段人数分布 {1: 100, 2: 200, ...} */
  count: Record<string, number>
}

/**
 * Bangumi API 收藏统计
 * 用户收藏状态的分布情况
 */
export interface BangumiCollection {
  /** 想看人数 */
  wish: number
  /** 看过人数 */
  collect: number
  /** 在看人数 */
  doing: number
  /** 搁置人数 */
  on_hold: number
  /** 抛弃人数 */
  dropped: number
}

/**
 * Bangumi API 角色信息
 * 动画/游戏中的角色数据
 */
export interface BangumiCharacter {
  /** 角色 ID */
  id: number
  /** 角色页面 URL */
  url: string
  /** 角色日文名 */
  name: string
  /** 角色中文名 */
  name_cn: string
  /** 角色类型 (主角/配角等) */
  role_name: string
  /** 角色图片 */
  images: BangumiImages
}

/**
 * Bangumi API 制作人员信息
 * STAFF 和制作人员数据
 */
export interface BangumiStaff {
  /** 人员 ID */
  id: number
  /** 人员页面 URL */
  url: string
  /** 人员日文名 */
  name: string
  /** 人员中文名 */
  name_cn: string
  /** 担任职位列表 */
  jobs: string[]
  /** 人员图片 */
  images: BangumiImages
}

/**
 * Bangumi API 条目详情（1:1 复制）
 * 包含动画、书籍、音乐、游戏等条目的完整信息
 */
export interface BangumiSubject {
  /** 条目 ID (唯一标识) */
  id: number
  /** 条目页面 URL */
  url: string
  /**
   * 条目类型
   * 1 = 书籍
   * 2 = 动画
   * 3 = 音乐
   * 4 = 游戏
   * 6 = 三次元 (真人影视)
   */
  type: number
  /** 日文/原名 */
  name: string
  /** 中文译名 (可能为空) */
  name_cn: string
  /** 剧情简介 (纯文本) */
  summary: string
  /** 话数/集数 */
  eps: number
  /** 放送开始日期 (YYYY-MM-DD) */
  air_date: string
  /**
   * 放送星期
   * 1 = 星期一, 2 = 星期二, ..., 7 = 星期日, 0 = 星期日
   */
  air_weekday: number
  /** 封面图片 (各尺寸) */
  images: BangumiImages
  /** 评分信息 */
  rating: BangumiRating
  /** 全站排名 (0 表示未上榜) */
  rank: number
  /** 收藏统计 */
  collection: BangumiCollection
  /** 角色列表 (large 响应才有) */
  crt?: BangumiCharacter[]
  /** 制作人员列表 (large 响应才有) */
  staff?: BangumiStaff[]
}

/**
 * Bangumi API 搜索结果（small response）
 * 搜索接口返回的列表数据
 */
export interface BangumiSearchResult {
  /** 搜索结果总数 */
  results: number
  /** 条目列表 */
  list: Array<{
    /** 条目 ID */
    id: number
    /** 条目页面 URL */
    url: string
    /** 条目类型 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元) */
    type: number
    /** 日文/原名 */
    name: string
    /** 中文译名 */
    name_cn: string
    /** 剧情简介 */
    summary: string
    /** 放送开始日期 */
    air_date: string
    /** 放送星期 */
    air_weekday: number
    /** 封面图片 */
    images: BangumiImages
  }>
}

// ─── API 调用 ─────────────────────────────────────────────────────────────────

/**
 * 搜索 Bangumi 条目
 * @param keywords 搜索关键词
 * @param type 条目类型 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
 * @param responseGroup 响应级别 (small/large)
 * @returns 搜索结果
 * @throws 当 API 请求失败时抛出错误
 */
export async function searchBangumi(
  keywords: string,
  type: number = 2,
  responseGroup: 'small' | 'large' = 'small'
): Promise<BangumiSearchResult> {
  const encodedKeywords = encodeURIComponent(keywords)
  const url = `${BANGUMI_API_BASE}/search/subject/${encodedKeywords}?type=${type}&responseGroup=${responseGroup}`

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BDDB/1.0 (https://github.com/yourname/bddb)',
    },
  })

  if (!response.ok) {
    throw new Error(`Bangumi API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * 获取 Bangumi 条目详情
 * @param subjectId 条目 ID
 * @param responseGroup 响应级别 (small/large)
 * @returns 条目详情
 * @throws 当 API 请求失败时抛出错误
 */
export async function getBangumiSubject(
  subjectId: number,
  responseGroup: 'small' | 'large' = 'large'
): Promise<BangumiSubject> {
  const url = `${BANGUMI_API_BASE}/subject/${subjectId}?responseGroup=${responseGroup}`

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BDDB/1.0 (https://github.com/yourname/bddb)',
    },
  })

  if (!response.ok) {
    throw new Error(`Bangumi API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 获取类型名称
 * @param type 条目类型代码
 * @returns 类型的中文名称
 */
export function getTypeName(type: number): string {
  const typeMap: Record<number, string> = {
    1: '书籍',
    2: '动画',
    3: '音乐',
    4: '游戏',
    6: '三次元',
  }
  return typeMap[type] || '未知'
}

/**
 * 获取星期名称
 * @param weekday 星期代码 (1-7, 0 也表示星期日)
 * @returns 星期的中文名称
 */
export function getWeekdayName(weekday: number): string {
  const weekdayMap: Record<number, string> = {
    1: '星期一',
    2: '星期二',
    3: '星期三',
    4: '星期四',
    5: '星期五',
    6: '星期六',
    7: '星期日',
    0: '星期日',
  }
  return weekdayMap[weekday] || '未知'
}

/**
 * 格式化日期
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 * @returns 格式化后的日期字符串 (zh-CN 格式)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN')
  } catch {
    return dateStr
  }
}

/**
 * 获取 Bangumi 条目 URL
 * @param subjectId 条目 ID
 * @returns 条目页面完整 URL
 */
export function getBangumiUrl(subjectId: number): string {
  return `https://bgm.tv/subject/${subjectId}`
}
