'use client'

import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Button, Collapse, Dialog, DialogBody, Icon, InputGroup, Spinner, Tag} from '@blueprintjs/core'
import {Intent} from '@blueprintjs/core'
import {showToast} from '@/lib/toaster'
import type {ProductSearchDoc} from '@/lib/meilisearch/productSearch'

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

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制: ' + text, Intent.SUCCESS)
    })
}

const SiderContent: React.FC = () => {
    const [searchText, setSearchText] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [searchResult, setSearchResult] = useState<SearchResponse | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [expandedKey, setExpandedKey] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
            const {scrollTop, scrollHeight, clientHeight} = container
            const scrollPercent = (scrollTop + clientHeight) / scrollHeight
            if (scrollPercent > 0.7) {
                loadMore()
            }
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [loadMore])

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('zh-CN')
        } catch {
            return dateStr
        }
    }

    const products = searchResult?.products || []

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <InputGroup
                leftIcon="search"
                placeholder="搜索产品"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                rightElement={
                    loading
                        ? <Spinner size={16}/>
                        : <Button minimal icon="search" onClick={handleSearch}/>
                }
            />

            <div ref={scrollContainerRef} style={{overflow: 'auto', flex: 1}}>
                {searchResult ? (
                    products.length > 0 ? (
                        <div>
                            <div style={{fontSize: 12, color: '#8a9ba8', padding: '0 4px', marginBottom: 6}}>
                                共找到 {searchResult.total} 个结果{hasMore && '（滚动加载更多）'}
                            </div>
                            {products.map((product, i) => {
                                const thumbnailUrl = product.images?.[0]
                                const releaseDate = formatDate(product.release_date)
                                const itemKey = `${product.model_number ?? product.title}-${i}`
                                const isExpanded = expandedKey === itemKey
                                return (
                                    <div key={itemKey} style={{borderBottom: '1px solid #30404d', padding: '6px 4px'}}>
                                        <div style={{display: 'flex', gap: 8, alignItems: 'flex-start'}}>
                                            {thumbnailUrl ? (
                                                <img
                                                    src={thumbnailUrl} alt={product.title}
                                                    onClick={() => setSelectedImage(thumbnailUrl)}
                                                    style={{width: 50, height: 50, objectFit: 'cover', borderRadius: 3, flexShrink: 0, cursor: 'pointer'}}
                                                />
                                            ) : (
                                                <div style={{width: 50, height: 50, borderRadius: 3, flexShrink: 0, background: '#30404d', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                    <span style={{fontSize: 11, color: '#5c7080'}}>无图</span>
                                                </div>
                                            )}
                                            <div style={{flex: 1, minWidth: 0}}>
                                                <span
                                                    style={{fontSize: 13, fontWeight: 600, wordBreak: 'break-word', cursor: 'pointer'}}
                                                    onClick={() => copyToClipboard(product.title)}
                                                    title="点击复制标题"
                                                >
                                                    {product.title}
                                                </span>
                                                <div style={{display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4, alignItems: 'center', justifyContent: 'space-between'}}>
                                                    <div style={{display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center'}}>
                                                        {product.model_number && (
                                                            <Tag
                                                                minimal interactive intent={Intent.PRIMARY}
                                                                onClick={() => copyToClipboard(product.model_number!)}
                                                                title="点击复制型号"
                                                            >
                                                                {product.model_number}
                                                            </Tag>
                                                        )}
                                                        {releaseDate && (
                                                            <Tag minimal intent={Intent.SUCCESS}>{releaseDate}</Tag>
                                                        )}
                                                    </div>
                                                    <Button
                                                        minimal small
                                                        icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                        onClick={() => setExpandedKey(isExpanded ? null : itemKey)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Collapse isOpen={isExpanded}>
                                            <div style={{padding: '6px 0 2px 0'}}>
                                                {product.note_raw ? (
                                                    <div
                                                        style={{fontSize: 12, lineHeight: 1.6, background: '#252a31', padding: 8, borderRadius: 3}}
                                                        dangerouslySetInnerHTML={{__html: product.note_raw}}
                                                    />
                                                ) : (
                                                    <span style={{fontSize: 12, color: '#5c7080'}}>暂无详细说明</span>
                                                )}
                                            </div>
                                        </Collapse>
                                    </div>
                                )
                            })}
                            {loadingMore && (
                                <div style={{display: 'flex', justifyContent: 'center', padding: '12px 0'}}>
                                    <Spinner size={20}/>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8}}>
                            <Icon icon="inbox" size={36} style={{color: '#5c7080'}}/>
                            <span style={{fontSize: 13, color: '#8a9ba8'}}>未找到相关产品</span>
                        </div>
                    )
                ) : (
                    <span style={{fontSize: 13, color: '#8a9ba8', padding: '0 4px'}}>输入关键词搜索产品</span>
                )}
            </div>

            <Dialog isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} style={{width: 'auto', paddingBottom: 0}}>
                <DialogBody>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="大图预览"
                            style={{width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain'}}
                        />
                    )}
                </DialogBody>
            </Dialog>
        </div>
    )
}

export default SiderContent
