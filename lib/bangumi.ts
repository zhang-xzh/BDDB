// Bangumi API 客户端 - 通过本地 API 路由访问离线数据
// 接口与 Bangumi 在线 API 保持一致

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/**
 * Bangumi API 图片信息
 */
export interface BangumiImages {
  large: string
  common: string
  medium: string
  small: string
  grid: string
}

/**
 * Bangumi API 评分信息
 */
export interface BangumiRating {
  score: number
  total: number
  count: Record<string, number>
}

/**
 * Bangumi API 收藏统计
 */
export interface BangumiCollection {
  wish: number
  collect: number
  doing: number
  on_hold: number
  dropped: number
}

/**
 * Bangumi API 角色信息
 */
export interface BangumiCharacter {
  id: number
  url: string
  name: string
  name_cn: string
  role_name: string
  images: BangumiImages
}

/**
 * Bangumi API 制作人员信息
 */
export interface BangumiStaff {
  id: number
  url: string
  name: string
  name_cn: string
  jobs: string[]
  images: BangumiImages
}

/**
 * Bangumi API 条目详情
 */
export interface BangumiSubject {
  id: number
  url: string
  type: number
  name: string
  name_cn: string
  summary: string
  eps: number
  air_date: string
  air_weekday: number
  images: BangumiImages
  rating: BangumiRating
  rank: number
  collection: BangumiCollection
  crt?: BangumiCharacter[]
  staff?: BangumiStaff[]
}

/**
 * Bangumi API 搜索结果
 */
export interface BangumiSearchResult {
  results: number
  list: Array<{
    id: number
    url: string
    type: number
    name: string
    name_cn: string
    summary: string
    air_date: string
    air_weekday: number
    images: BangumiImages
  }>
}

// ─── API 调用 ─────────────────────────────────────────────────────────────────

/**
 * 搜索 Bangumi 条目
 * @param keywords 搜索关键词
 * @param type 条目类型 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
 * @param responseGroup 响应级别 (small/large) - 离线版本忽略此参数
 * @returns 搜索结果
 */
export async function searchBangumi(
  keywords: string,
  type: number = 2,
  responseGroup: 'small' | 'large' = 'small'
): Promise<BangumiSearchResult> {
  const searchParams = new URLSearchParams()
  searchParams.set('search', keywords)
  searchParams.set('type', type.toString())
  searchParams.set('limit', '20')

  const response = await fetch(`/api/bangumi/search?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error(`Bangumi search API error: ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Search failed')
  }

  // 转换 API 返回格式为 BangumiSearchResult 格式
  return {
    results: result.total,
    list: result.data.map((item: any) => ({
      id: item.subject_id,
      url: item.url,
      type: item.type,
      name: item.name,
      name_cn: item.name_cn,
      summary: item.summary,
      air_date: item.date || '',
      air_weekday: getWeekday(item.date),
      images: {
        large: item.cover_url.replace('/m/', '/l/'),
        common: item.cover_url.replace('/m/', '/c/'),
        medium: item.cover_url,
        small: item.cover_url.replace('/m/', '/s/'),
        grid: item.cover_url.replace('/m/', '/g/'),
      },
    })),
  }
}

/**
 * 获取 Bangumi 条目详情
 * @param subjectId 条目 ID
 * @param responseGroup 响应级别 (small/large)
 * @returns 条目详情
 */
export async function getBangumiSubject(
  subjectId: number,
  responseGroup: 'small' | 'large' = 'large'
): Promise<BangumiSubject> {
  const searchParams = new URLSearchParams()
  searchParams.set('withRelations', responseGroup === 'large' ? 'true' : 'false')

  const response = await fetch(`/api/bangumi/subject/${subjectId}?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error(`Bangumi subject API error: ${response.status}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Subject not found')
  }

  const data = result.data

  // 转换收藏统计
  const favorite = data.meta?.favorite || {wish: 0, done: 0, doing: 0, on_hold: 0, dropped: 0}

  // 转换角色列表
  const crt: BangumiCharacter[] = (data.characters || []).map((char: any) => ({
    id: char.character_id,
    url: char.url,
    name: char.name,
    name_cn: char.name_cn || '',
    role_name: getRoleTypeName(char.role_type),
    images: {
      large: getCharacterImageUrl(char.character_id, 'l'),
      common: getCharacterImageUrl(char.character_id, 'c'),
      medium: getCharacterImageUrl(char.character_id, 'm'),
      small: getCharacterImageUrl(char.character_id, 's'),
      grid: getCharacterImageUrl(char.character_id, 'g'),
    },
  }))

  // 转换制作人员列表
  const staff: BangumiStaff[] = (data.staff || []).map((person: any) => ({
    id: person.person_id,
    url: person.url,
    name: person.name,
    name_cn: person.name_cn || '',
    jobs: [person.position],
    images: {
      large: getPersonImageUrl(person.person_id, 'l'),
      common: getPersonImageUrl(person.person_id, 'c'),
      medium: getPersonImageUrl(person.person_id, 'm'),
      small: getPersonImageUrl(person.person_id, 's'),
      grid: getPersonImageUrl(person.person_id, 'g'),
    },
  }))

  // 转换评分详情
  const scoreDetails = data.meta?.score_details || {}
  const total = Object.values(scoreDetails).reduce((sum: number, count: unknown) => sum + (count as number), 0)

  return {
    id: data._id,
    url: getBangumiUrl(data._id),
    type: data.type,
    name: data.name,
    name_cn: data.name_cn,
    summary: data.summary || '',
    eps: (data.episodes || []).length,
    air_date: data.date || '',
    air_weekday: getWeekday(data.date),
    images: {
      large: getSubjectCoverUrl(data._id, 'l'),
      common: getSubjectCoverUrl(data._id, 'c'),
      medium: getSubjectCoverUrl(data._id, 'm'),
      small: getSubjectCoverUrl(data._id, 's'),
      grid: getSubjectCoverUrl(data._id, 'g'),
    },
    rating: {
      score: data.meta?.score || 0,
      total,
      count: scoreDetails,
    },
    rank: data.meta?.rank || 0,
    collection: {
      wish: favorite.wish,
      collect: favorite.done,
      doing: favorite.doing,
      on_hold: favorite.on_hold,
      dropped: favorite.dropped,
    },
    crt: crt.length > 0 ? crt : undefined,
    staff: staff.length > 0 ? staff : undefined,
  }
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 获取类型名称
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
 * 计算星期几
 */
function getWeekday(dateStr: string | undefined): number {
  if (!dateStr) return 0
  try {
    const date = new Date(dateStr)
    return date.getDay()
  } catch {
    return 0
  }
}

/**
 * 获取角色类型名称
 */
function getRoleTypeName(roleType: number): string {
  const roleMap: Record<number, string> = {
    1: '主角',
    2: '配角',
    3: '客串',
  }
  return roleMap[roleType] || '未知'
}

/**
 * 格式化日期
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
 */
export function getBangumiUrl(subjectId: number): string {
  return `https://bgm.tv/subject/${subjectId}`
}

/**
 * 获取条目封面图片 URL
 */
function getSubjectCoverUrl(subjectId: number, size: 'l' | 'c' | 'm' | 's' | 'g' = 'l'): string {
  return `https://lain.bgm.tv/pic/cover/${size}/${Math.floor(subjectId / 100) % 100}/${subjectId % 100}/${subjectId}.jpg`
}

/**
 * 获取人物头像 URL
 */
function getPersonImageUrl(personId: number, size: 'l' | 'c' | 'm' | 's' | 'g' = 'l'): string {
  return `https://lain.bgm.tv/pic/crt/${size}/${Math.floor(personId / 100) % 100}/${personId % 100}/${personId}.jpg`
}

/**
 * 获取角色图片 URL
 */
function getCharacterImageUrl(characterId: number, size: 'l' | 'c' | 'm' | 's' | 'g' = 'l'): string {
  return `https://lain.bgm.tv/pic/crt/${size}/${Math.floor(characterId / 100) % 100}/${characterId % 100}/${characterId}.jpg`
}
