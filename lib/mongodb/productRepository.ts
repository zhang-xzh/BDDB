import {getSurugaYaCollection} from './connection'
import type {ObjectId} from 'mongodb'

// Suruga Ya 产品实际数据结构
export interface MongoProduct {
    _id: ObjectId  // MongoDB ObjectId
    product_id: string              // 商品ID (如: "109001543001")
    title: string                   // 标题
    url: string                     // 产品URL
    images: string[]                // 图片URL数组
    note_raw?: string               // 描述 (HTML格式)
    tracklist?: TrackList[]         // 曲目列表
    attributes: ProductAttributes   // 产品属性
}

export interface TrackList {
    disc: string        // 光盘名称 (如: "Disc.1")
    tracks: string[]    // 曲目数组
}

export interface ProductAttributes {
    管理番号?: string
    メーカー?: string              // 制作商
    発売日?: string                // 发售日 (格式: "2021/08/26")
    定価?: string                  // 定价 (格式: "8,800円")
    型番?: string                  // 型号
    シナリオ?: string              // 剧本
    キャラクターデザイン?: string  // 角色设计
    原画?: string[]                // 原画师
    音楽?: string                  // 音乐
    声優?: string[]                // 声优
    [key: string]: any             // 其他未知属性
}

// 获取产品集合（suruga_ya 数据库）
export function getProductsCollection() {
    return getSurugaYaCollection<MongoProduct>('products')
}
