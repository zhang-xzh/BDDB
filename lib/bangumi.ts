import { items, siteMeta } from 'bangumi-data'
import type { Item, Site } from 'bangumi-data'

export type { Item, Site }

// 站点信息
export interface SiteInfo {
  site: string
  siteName: string
  id: string
  url?: string
}

export interface BangumiItem {
  id: string
  title: string
  titleCn: string
  titleEn: string
  type: string
  lang: string
  officialSite: string
  begin: string
  end: string
  broadcast?: string
  comment?: string
  sites: SiteInfo[]
}

// 站点名称映射
const SITE_NAME_MAP: Record<string, string> = {
  bangumi: 'Bangumi',
  bilibili: 'Bilibili',
  bilibili_hk_mo_tw: 'Bilibili(港澳台)',
  dmhy: '动漫花园',
  mikan: '蜜柑计划',
  acfun: 'AcFun',
  youku: '优酷',
  qq: '腾讯视频',
  iqiyi: '爱奇艺',
  netflix: 'Netflix',
  disneyplus: 'Disney+',
  prime: 'Amazon Prime',
}

// 语言映射
const LANG_MAP: Record<string, string> = {
  ja: '日语',
  en: '英语',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁体中文',
}

// 类型映射
const TYPE_MAP: Record<string, string> = {
  tv: 'TV',
  web: 'Web',
  movie: '剧场版',
  ova: 'OVA',
}

// 为每个 item 生成唯一 id
const itemMap = new Map<string, Item>()
const bangumiItems: BangumiItem[] = items.map((item, index) => {
  const id = `${index}`
  itemMap.set(id, item)

  // 提取站点信息
  const sites: SiteInfo[] = (item.sites || []).map((site: Site) => ({
    site: site.site,
    siteName: SITE_NAME_MAP[site.site] || site.site,
    id: (site as any).id || '',
    url: (site as any).url,
  }))

  return {
    id,
    title: item.title,
    titleCn: item.titleTranslate?.['zh-Hans']?.[0] || item.titleTranslate?.['zh-Hant']?.[0] || '',
    titleEn: item.titleTranslate?.['en']?.[0] || '',
    type: item.type,
    lang: item.lang,
    officialSite: item.officialSite,
    begin: item.begin,
    end: item.end,
    broadcast: item.broadcast,
    comment: item.comment,
    sites,
  }
})

/**
 * 获取语言中文名
 */
export function getLangLabel(lang: string): string {
  return LANG_MAP[lang] || lang
}

/**
 * 获取类型中文名
 */
export function getTypeLabel(type: string): string {
  return TYPE_MAP[type] || type
}

/**
 * 获取所有 bangumi 数据（用于客户端搜索）
 */
export function getAllBangumiItems(): BangumiItem[] {
  return bangumiItems
}

/**
 * 根据 ID 获取原始 item 数据
 */
export function getBangumiItemById(id: string): Item | undefined {
  return itemMap.get(id)
}

/**
 * 搜索 bangumi 数据
 * @param query 搜索关键词
 * @param limit 返回数量限制
 */
export function searchBangumi(query: string, limit = 20): BangumiItem[] {
  if (!query.trim()) return bangumiItems.slice(0, limit)

  const lowerQuery = query.toLowerCase()
  const results: BangumiItem[] = []

  for (const item of bangumiItems) {
    if (
      item.title.toLowerCase().includes(lowerQuery) ||
      item.titleCn.toLowerCase().includes(lowerQuery)
    ) {
      results.push(item)
      if (results.length >= limit) break
    }
  }

  return results
}

/**
 * 获取站点元数据
 */
export function getSiteMeta() {
  return siteMeta
}

/**
 * 从 item 中提取 bangumi 站点 ID
 */
export function getBangumiSiteId(item: Item): string | undefined {
  const bangumiSite = item.sites?.find(s => s.site === 'bangumi')
  return bangumiSite?.id
}

/**
 * 从 item 中提取 dmhy 下载关键词
 */
export function getDmhyKeyword(item: Item): string | undefined {
  const dmhySite = item.sites?.find(s => s.site === 'dmhy')
  return dmhySite?.id
}

/**
 * 获取 Bangumi 条目 URL
 */
export function getBangumiUrl(item: Item): string | undefined {
  const id = getBangumiSiteId(item)
  if (!id) return undefined
  return `https://bangumi.tv/subject/${id}`
}
