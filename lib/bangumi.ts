// Bangumi API 客户端 - 通过本地 API 路由访问离线数据
// 接口与 Bangumi 在线 API 保持一致

// ==================== 类型定义 ====================

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

// 类型名称映射
export const SUBJECT_TYPE_NAMES: Record<number, string> = {
    1: '书籍',
    2: '动画',
    3: '音乐',
    4: '游戏',
    6: '三次元',
}

// 星期名称映射
export const WEEKDAY_NAMES: Record<number, string> = {
    0: '周日',
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日',
}

// 角色类型映射
export const ROLE_TYPE_NAMES: Record<number, string> = {
    1: '主角',
    2: '配角',
    3: '客串',
}

// ==================== 工具函数 ====================

/**
 * 计算星期几
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 * @returns 星期几 (0=周日, 1=周一, ..., 6=周六)
 */
export function getWeekday(dateStr: string | undefined): number {
    if (!dateStr) return 0
    try {
        const date = new Date(dateStr)
        return date.getDay()
    } catch {
        return 0
    }
}

/**
 * 获取类型名称
 */
export function getTypeName(type: number): string {
    return SUBJECT_TYPE_NAMES[type] || '未知'
}

/**
 * 获取星期名称
 */
export function getWeekdayName(weekday: number): string {
    return WEEKDAY_NAMES[weekday] || '未知'
}

/**
 * 获取角色类型名称
 */
export function getRoleTypeName(roleType: number): string {
    return ROLE_TYPE_NAMES[roleType] || '未知'
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
 * 获取条目详情页 URL
 */
export function getSubjectUrl(subjectId: number): string {
    return `https://bgm.tv/subject/${subjectId}`
}

/**
 * 获取人物详情页 URL
 */
export function getPersonUrl(personId: number): string {
    return `https://bgm.tv/person/${personId}`
}

/**
 * 获取角色详情页 URL
 */
export function getCharacterUrl(characterId: number): string {
    return `https://bgm.tv/character/${characterId}`
}

/**
 * 获取剧集详情页 URL
 */
export function getEpisodeUrl(episodeId: number): string {
    return `https://bgm.tv/ep/${episodeId}`
}

// ==================== API 调用 ====================

/**
 * 搜索 Bangumi 条目
 * @param keywords 搜索关键词
 * @param type 条目类型 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=三次元)
 * @returns 搜索结果
 */
export async function searchBangumi(
    keywords: string,
    type: number = 2
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
            images: {},
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
        images: {},
    }))

    // 转换制作人员列表
    const staff: BangumiStaff[] = (data.staff || []).map((person: any) => ({
        id: person.person_id,
        url: person.url,
        name: person.name,
        name_cn: person.name_cn || '',
        jobs: [person.position],
        images: {},
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
            large: "",
            common: "",
            medium: "",
            small: "",
            grid: ""
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
