'use client'

import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Button, Collapse, Empty, Flex, Image, Input, Spin, Tag, theme, Typography} from 'antd'
import {DownOutlined, UpOutlined} from '@ant-design/icons'
import type {ProductSearchDoc} from '@/lib/meilisearch/productSearch'
import {SPACING} from '@/lib/utils'

const {Text} = Typography

interface SearchResponse {
    products: ProductSearchDoc[]
    total: number
    page: number
    totalPages: number
}

interface ApiResponse {
    success: boolean
    data: ProductSearchDoc[]
    total: number
    page: number
    totalPages: number
    error?: string
}

const PAGE_SIZE = 20

const SiderContent: React.FC = () => {
    const {token} = theme.useToken()
    const [searchText, setSearchText] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [searchResult, setSearchResult] = useState<SearchResponse | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [activeKey, setActiveKey] = useState<string | string[]>([])
    const scrollContainerRef = useRef<HTMLElement>(null)

    // 切换展开/收起
    const toggleExpand = (key: string) => {
        setActiveKey(prev => {
            const prevKeys = Array.isArray(prev) ? prev : [prev]
            if (prevKeys.includes(key)) {
                return prevKeys.filter(k => k !== key)
            } else {
                return [...prevKeys, key]
            }
        })
    }

    // 检查是否已展开
    const isExpanded = (key: string) => {
        const keys = Array.isArray(activeKey) ? activeKey : [activeKey]
        return keys.includes(key)
    }

    const handleSearch = async () => {
        if (!searchText.trim()) return

        setLoading(true)
        try {
            const res = await fetch(`/api/products/search?search=${encodeURIComponent(searchText)}&page=1&limit=${PAGE_SIZE}`)
            const apiData: ApiResponse = await res.json()

            if (!apiData.success) {
                console.error('搜索失败:', apiData.error)
                setSearchResult({products: [], total: 0, page: 1, totalPages: 0})
                setHasMore(false)
                return
            }

            // 转换 API 返回的数据结构
            setSearchResult({
                products: apiData.data || [],
                total: apiData.total || 0,
                page: apiData.page || 1,
                totalPages: apiData.totalPages || 0,
            })
            setHasMore((apiData.page || 1) < (apiData.totalPages || 0))
        } catch (error) {
            console.error('搜索失败:', error)
            setSearchResult({products: [], total: 0, page: 1, totalPages: 0})
            setHasMore(false)
        } finally {
            setLoading(false)
        }
    }

    // 加载更多数据
    const loadMore = useCallback(async () => {
        if (!searchResult || loadingMore || !hasMore) return

        const nextPage = searchResult.page + 1
        setLoadingMore(true)

        try {
            const res = await fetch(`/api/products/search?search=${encodeURIComponent(searchText)}&page=${nextPage}&limit=${PAGE_SIZE}`)
            const apiData: ApiResponse = await res.json()

            if (!apiData.success) {
                console.error('加载更多失败:', apiData.error)
                return
            }

            setSearchResult(prev => {
                if (!prev) return null
                return {
                    products: [...prev.products, ...(apiData.data || [])],
                    total: apiData.total || 0,
                    page: apiData.page || nextPage,
                    totalPages: apiData.totalPages || 0,
                }
            })
            setHasMore((apiData.page || nextPage) < (apiData.totalPages || 0))
        } catch (error) {
            console.error('加载更多失败:', error)
        } finally {
            setLoadingMore(false)
        }
    }, [searchResult, loadingMore, hasMore, searchText])

    // 监听滚动事件
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
            const {scrollTop, scrollHeight, clientHeight} = container
            // 滚动超过 70% 时提前触发加载，确保流畅体验
            const scrollPercent = (scrollTop + clientHeight) / scrollHeight
            if (scrollPercent > 0.7) {
                loadMore()
            }
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [loadMore])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    // 格式化日期显示
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('zh-CN')
        } catch {
            return dateStr
        }
    }

    // 生成 Collapse 项
    const collapseItems = (searchResult?.products || []).map((product, index) => {
        const thumbnailUrl = product.images?.[0]
        const releaseDate = formatDate(product.release_date)

        return {
            key: product.product_id || String(index),
            label: (
                <Flex gap={12} align="center">
                    {/* 缩略图 - 点击放大 */}
                    {thumbnailUrl ? (
                        <Image
                            src={thumbnailUrl}
                            alt={product.title}
                            width={60}
                            height={60}
                            style={{objectFit: 'cover', borderRadius: 4, flexShrink: 0}}
                        />
                    ) : (
                        <Flex
                            align="center"
                            justify="center"
                            style={{
                                width: 60,
                                height: 60,
                                borderRadius: 4,
                                flexShrink: 0,
                                background: token.colorBgTextHover,
                            }}
                        >
                            <Text type="secondary" style={{fontSize: 10}}>无图</Text>
                        </Flex>
                    )}
                    <Flex vertical gap={4} style={{flex: 1, minWidth: 0}}>
                        <Text strong style={{fontSize: 14, wordBreak: 'break-word'}}>
                            {product.title}
                        </Text>
                        <Flex gap={8} wrap align="center" justify="space-between">
                            <Flex gap={8} wrap>
                                {product.model_number && (
                                    <Tag color="blue">{product.model_number}</Tag>
                                )}
                                {releaseDate && (
                                    <Tag color="green">{releaseDate}</Tag>
                                )}
                            </Flex>
                            {/* 展开/收起按钮 */}
                            <Button
                                type="text"
                                size="small"
                                icon={isExpanded(product.product_id || String(index)) ? <UpOutlined/> : <DownOutlined/>}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpand(product.product_id || String(index))
                                }}
                            />
                        </Flex>
                    </Flex>
                </Flex>
            ),
            children: (
                <Flex vertical gap={12}>
                    {product.note_raw ? (
                        <div
                            style={{
                                margin: 0,
                                fontSize: 13,
                                lineHeight: 1.6,
                                color: token.colorText,
                                background: token.colorBgTextHover,
                                padding: 12,
                                borderRadius: 6,
                            }}
                            dangerouslySetInnerHTML={{__html: product.note_raw}}
                        />
                    ) : (
                        <Text type="secondary">暂无详细说明</Text>
                    )}
                </Flex>
            ),
        }
    })

    return (
        <Flex vertical gap={SPACING.md}>
            <Input.Search
                style={{position: 'sticky', top: 0, zIndex: 1, background: token.colorBgContainer}}
                placeholder="搜索产品..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                onSearch={handleSearch}
                loading={loading}
                enterButton
            />
            <Flex
                vertical
                ref={scrollContainerRef}
                style={{
                    maxHeight: 'calc(100vh - 200px)',
                    overflow: 'auto',
                }}
            >
                {searchResult ? (
                    (searchResult.products || []).length > 0 ? (
                        <Flex vertical gap={8}>
                            <Text type="secondary" style={{fontSize: 12}}>
                                共找到 {searchResult.total} 个结果
                                {hasMore && '（滚动加载更多）'}
                            </Text>
                            <Collapse
                                items={collapseItems}
                                activeKey={activeKey}
                                onChange={() => {
                                }}
                                collapsible="icon"
                                expandIcon={() => null}
                                style={{
                                    background: token.colorBgContainer,
                                }}
                            />
                            {loadingMore && (
                                <Flex justify="center" style={{padding: `${SPACING.md}px 0`}}>
                                    <Spin size="small"/>
                                </Flex>
                            )}
                        </Flex>
                    ) : (
                        <Empty description="未找到相关产品" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                    )
                ) : (
                    <Text type="secondary">输入关键词搜索产品</Text>
                )}
            </Flex>
        </Flex>
    )
}

export default SiderContent
