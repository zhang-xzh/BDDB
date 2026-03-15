import {getBangumiCollection} from './connection'
import type {ObjectId} from 'mongodb'

// Bangumi 条目类型定义 (基于 MONGODB_SCHEMA.md)
export interface BangumiSubjectDoc {
    _id: number
    name: string
    name_cn: string
    type: number
    type_info?: {
        id: number
        name: string
    }
    platform?: number
    platform_info?: {
        id: number
        type: string
        type_cn: string
        alias: string
        wiki_tpl: string
    }
    infobox?: {
        type: string
        type_cn: string
        fields: Record<string, any>
    }
    summary: string
    nsfw: boolean
    meta_tags: string[]
    series: boolean
    date: string
    meta?: {
        score: number
        score_details: Record<string, number>
        rank: number
        tags: string[]
        favorite: {
            wish: number
            done: number
            doing: number
            on_hold: number
            dropped: number
        }
    }
    _raw?: Record<string, any>
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// Bangumi 人物类型定义
export interface BangumiPersonDoc {
    _id: number
    type: number
    name: string
    infobox?: {
        type: string
        type_cn: string
        fields: Record<string, any>
    }
    summary: string
    career: string[]
    collects: number
    comments: number
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// Bangumi 角色类型定义 (MongoDB 文档)
export interface BangumiCharacterDoc {
    _id: number
    name: string
    infobox?: {
        type: string
        type_cn: string
        fields: Record<string, any>
    }
    summary: string
    role: number
    collects: number
    comments: number
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// Bangumi 剧集类型定义
export interface BangumiEpisodeDoc {
    _id: number
    subject_id: number
    type: number
    name: string
    name_cn: string
    sort: number
    airdate: string
    duration: string
    description: string
    disc: number
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// 条目与人物关联
export interface BangumiSubjectPersonDoc {
    _id: string
    subject_id: number
    person_id: number
    position: number
    position_info?: {
        id: number
        cn: string
        en: string
        jp: string
        categories: string[]
    }
    appear_eps: string
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// 条目与角色关联
export interface BangumiSubjectCharacterDoc {
    _id: string
    subject_id: number
    character_id: number
    type: number
    order: number
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// 人物与角色关联 (配音)
export interface BangumiPersonCharacterDoc {
    _id: string
    person_id: number
    character_id: number
    subject_id: number
    summary: string
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// 条目关系
export interface BangumiSubjectRelationDoc {
    _id: string
    subject_id: number
    related_subject_id: number
    relation_type: number
    relation_info?: {
        id: number
        cn: string
        en: string
        desc: string
    }
    order: number
    _sync?: {
        created_at: string
        updated_at: string
        version: number
        source_file: string
    }
}

// 搜索结果类型
export interface BangumiSearchResult {
    subjects: BangumiSubjectDoc[]
    total: number
    page: number
    limit: number
    totalPages: number
}

// 条目详情 (含关联数据)
export interface BangumiSubjectDetail extends BangumiSubjectDoc {
    staff?: BangumiStaffItem[]
    characters?: BangumiCharacterItem[]
    episodes?: BangumiEpisodeDoc[]
    relations?: BangumiSubjectRelationItem[]
}

export interface BangumiStaffItem {
    person_id: number
    name: string
    name_cn?: string
    position: string
    url: string
}

export interface BangumiCharacterItem {
    character_id: number
    name: string
    name_cn?: string
    role_type: number
    order: number
    url: string
}

export interface BangumiSubjectRelationItem {
    subject_id: number
    name: string
    name_cn?: string
    relation_type: string
    url: string
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

// ============ 集合获取函数 ============

export function getSubjectsCollection() {
    return getBangumiCollection<BangumiSubjectDoc>('subjects')
}

export function getPersonsCollection() {
    return getBangumiCollection<BangumiPersonDoc>('persons')
}

export function getCharactersCollection() {
    return getBangumiCollection<BangumiCharacterDoc>('characters')
}

export function getEpisodesCollection() {
    return getBangumiCollection<BangumiEpisodeDoc>('episodes')
}

export function getSubjectPersonsCollection() {
    return getBangumiCollection<BangumiSubjectPersonDoc>('subject_persons')
}

export function getSubjectCharactersCollection() {
    return getBangumiCollection<BangumiSubjectCharacterDoc>('subject_characters')
}

export function getPersonCharactersCollection() {
    return getBangumiCollection<BangumiPersonCharacterDoc>('person_characters')
}

export function getSubjectRelationsCollection() {
    return getBangumiCollection<BangumiSubjectRelationDoc>('subject_relations')
}

// ============ URL 生成工具函数 ============

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

/**
 * 获取条目封面图片 URL
 * @param subjectId 条目 ID
 * @param size 图片尺寸: l=large, c=common, m=medium, s=small, g=grid
 */
export function getSubjectCoverUrl(subjectId: number, size: 'l' | 'c' | 'm' | 's' | 'g' = 'l'): string {
    return `https://lain.bgm.tv/pic/cover/${size}/${Math.floor(subjectId / 100) % 100}/${subjectId % 100}/${subjectId}.jpg`
}

/**
 * 获取人物头像 URL
 * @param personId 人物 ID
 * @param size 图片尺寸: l=large, c=common, m=medium, s=small, g=grid
 */
export function getPersonImageUrl(personId: number, size: 'l' | 'c' | 'm' | 's' | 'g' = 'l'): string {
    return `https://lain.bgm.tv/pic/crt/${size}/${Math.floor(personId / 100) % 100}/${personId % 100}/${personId}.jpg`
}

/**
 * 获取角色图片 URL
 * @param characterId 角色 ID
 * @param size 图片尺寸: l=large, c=common, m=medium, s=small, g=grid
 */
export function getCharacterImageUrl(characterId: number, size: 'l' | 'c' | 'm' | 's' | 'g' = 'l'): string {
    return `https://lain.bgm.tv/pic/crt/${size}/${Math.floor(characterId / 100) % 100}/${characterId % 100}/${characterId}.jpg`
}

/**
 * 计算星期几
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 * @returns 星期几 (0=周日, 1=周一, ..., 6=周六)
 */
export function getWeekday(dateStr: string): number {
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

// ============ 查询函数 ============

/**
 * 根据 ID 获取条目详情
 */
export async function getSubjectById(subjectId: number): Promise<BangumiSubjectDoc | null> {
    try {
        const collection = getSubjectsCollection()
        return await collection.findOne({_id: subjectId})
    } catch (error) {
        console.error('[bangumi] getSubjectById error:', error)
        return null
    }
}

/**
 * 搜索条目 (使用正则匹配，用于简单查询)
 */
export async function searchSubjects(
    keyword: string,
    options: {
        type?: number
        limit?: number
        skip?: number
    } = {}
): Promise<{subjects: BangumiSubjectDoc[]; total: number}> {
    try {
        const collection = getSubjectsCollection()
        const {type, limit = 20, skip = 0} = options

        // 构建查询条件
        const query: Record<string, any> = {
            $or: [
                {name: {$regex: keyword, $options: 'i'}},
                {name_cn: {$regex: keyword, $options: 'i'}},
            ],
        }

        if (type !== undefined) {
            query.type = type
        }

        // 获取总数
        const total = await collection.countDocuments(query)

        // 查询结果
        const subjects = await collection
            .find(query)
            .skip(skip)
            .limit(limit)
            .toArray()

        return {subjects, total}
    } catch (error) {
        console.error('[bangumi] searchSubjects error:', error)
        return {subjects: [], total: 0}
    }
}

/**
 * 获取条目的制作人员
 */
export async function getSubjectStaff(subjectId: number): Promise<BangumiStaffItem[]> {
    try {
        const collection = getSubjectPersonsCollection()
        const personsCollection = getPersonsCollection()

        const pipeline = [
            {$match: {subject_id: subjectId}},
            {
                $lookup: {
                    from: 'persons',
                    localField: 'person_id',
                    foreignField: '_id',
                    as: 'person',
                },
            },
            {$unwind: '$person'},
            {
                $project: {
                    person_id: '$person._id',
                    name: '$person.name',
                    name_cn: '$person.infobox.fields.简体中文名',
                    position: '$position_info.cn',
                    url: {$concat: ['https://bgm.tv/person/', {$toString: '$person._id'}]},
                },
            },
        ]

        const results = await collection.aggregate(pipeline).toArray()
        return results as BangumiStaffItem[]
    } catch (error) {
        console.error('[bangumi] getSubjectStaff error:', error)
        return []
    }
}

/**
 * 获取条目的角色
 */
export async function getSubjectCharacters(subjectId: number): Promise<BangumiCharacterItem[]> {
    try {
        const collection = getSubjectCharactersCollection()

        const pipeline = [
            {$match: {subject_id: subjectId}},
            {
                $lookup: {
                    from: 'characters',
                    localField: 'character_id',
                    foreignField: '_id',
                    as: 'character',
                },
            },
            {$unwind: '$character'},
            {
                $project: {
                    character_id: '$character._id',
                    name: '$character.name',
                    name_cn: '$character.infobox.fields.简体中文名',
                    role_type: '$type',
                    order: '$order',
                    url: {$concat: ['https://bgm.tv/character/', {$toString: '$character._id'}]},
                },
            },
            {$sort: {order: 1}},
        ]

        const results = await collection.aggregate(pipeline).toArray()
        return results as BangumiCharacterItem[]
    } catch (error) {
        console.error('[bangumi] getSubjectCharacters error:', error)
        return []
    }
}

/**
 * 获取条目的剧集
 */
export async function getSubjectEpisodes(subjectId: number): Promise<BangumiEpisodeDoc[]> {
    try {
        const collection = getEpisodesCollection()
        return await collection
            .find({subject_id: subjectId})
            .sort({sort: 1})
            .toArray()
    } catch (error) {
        console.error('[bangumi] getSubjectEpisodes error:', error)
        return []
    }
}

/**
 * 获取条目的关联条目
 */
export async function getSubjectRelations(subjectId: number): Promise<BangumiSubjectRelationItem[]> {
    try {
        const collection = getSubjectRelationsCollection()

        const pipeline = [
            {$match: {subject_id: subjectId}},
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'related_subject_id',
                    foreignField: '_id',
                    as: 'related_subject',
                },
            },
            {$unwind: '$related_subject'},
            {
                $project: {
                    subject_id: '$related_subject._id',
                    name: '$related_subject.name',
                    name_cn: '$related_subject.name_cn',
                    relation_type: '$relation_info.cn',
                    url: {$concat: ['https://bgm.tv/subject/', {$toString: '$related_subject._id'}]},
                },
            },
        ]

        const results = await collection.aggregate(pipeline).toArray()
        return results as BangumiSubjectRelationItem[]
    } catch (error) {
        console.error('[bangumi] getSubjectRelations error:', error)
        return []
    }
}

/**
 * 获取完整条目详情 (含关联数据)
 */
export async function getSubjectDetail(subjectId: number): Promise<BangumiSubjectDetail | null> {
    const subject = await getSubjectById(subjectId)
    if (!subject) return null

    const [staff, characters, episodes, relations] = await Promise.all([
        getSubjectStaff(subjectId),
        getSubjectCharacters(subjectId),
        getSubjectEpisodes(subjectId),
        getSubjectRelations(subjectId),
    ])

    return {
        ...subject,
        staff,
        characters,
        episodes,
        relations,
    }
}

/**
 * 统计条目数量
 */
export async function countSubjects(type?: number): Promise<number> {
    try {
        const collection = getSubjectsCollection()
        const query = type !== undefined ? {type} : {}
        return await collection.countDocuments(query)
    } catch (error) {
        console.error('[bangumi] countSubjects error:', error)
        return 0
    }
}

/**
 * 获取所有条目 (用于同步到 Meilisearch)
 */
export async function getAllSubjects(
    options: {
        batchSize?: number
        skip?: number
    } = {}
): Promise<BangumiSubjectDoc[]> {
    try {
        const collection = getSubjectsCollection()
        const {batchSize = 1000, skip = 0} = options

        return await collection
            .find({})
            .skip(skip)
            .limit(batchSize)
            .toArray()
    } catch (error) {
        console.error('[bangumi] getAllSubjects error:', error)
        return []
    }
}

/**
 * 获取条目总数
 */
export async function getTotalSubjectsCount(): Promise<number> {
    try {
        const collection = getSubjectsCollection()
        return await collection.countDocuments({})
    } catch (error) {
        console.error('[bangumi] getTotalSubjectsCount error:', error)
        return 0
    }
}
