'use client'

import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Accordion, AccordionDetails, AccordionSummary, Box, Chip, CircularProgress, IconButton, InputAdornment, TextField, Typography,} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InboxIcon from '@mui/icons-material/Inbox'
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

const SiderContent: React.FC = () => {
    const [searchText, setSearchText] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [searchResult, setSearchResult] = useState<SearchResponse | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [expandedKey, setExpandedKey] = useState<string | null>(null)
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

    // 生成产品列表项
    const products = searchResult?.products || []

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
            <TextField
                fullWidth size="small"
                label="搜索产品"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                {loading
                                    ? <CircularProgress size={16}/>
                                    : <IconButton size="small" onClick={handleSearch}><SearchIcon fontSize="small"/></IconButton>
                                }
                            </InputAdornment>
                        )
                    }
                }}
            />

            <Box ref={scrollContainerRef} sx={{overflow: 'auto', maxHeight: 'calc(100vh - 220px)'}}>
                {searchResult ? (
                    products.length > 0 ? (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{px: 1, display: 'block', mb: 1}}>
                                共找到 {searchResult.total} 个结果{hasMore && '（滚动加载更多）'}
                            </Typography>
                            {products.map((product, i) => {
                                const thumbnailUrl = product.images?.[0]
                                const releaseDate = formatDate(product.release_date)
                                return (
                                    <Accordion
                                        key={`${product.model_number ?? product.title}-${i}`}
                                        variant="outlined"
                                        disableGutters
                                        expanded={expandedKey === (product.model_number ?? product.title)}
                                        onChange={() => {}}
                                    >
                                        <AccordionSummary
                                            sx={{
                                                px: 1,
                                                alignItems: 'flex-start',
                                                userSelect: 'text',
                                                '& .MuiAccordionSummary-content': {
                                                    width: '100%',
                                                },
                                            }}
                                        >
                                            <Box sx={{display: 'flex', gap: 1.5, alignItems: 'flex-start', width: '100%'}}>
                                                {/* 缩略图 */}
                                                {thumbnailUrl ? (
                                                    <Box
                                                        component="img" src={thumbnailUrl} alt={product.title}
                                                        sx={{width: 60, height: 60, objectFit: 'cover', borderRadius: 1, flexShrink: 0}}
                                                    />
                                                ) : (
                                                    <Box sx={{width: 60, height: 60, borderRadius: 1, flexShrink: 0, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                        <Typography variant="caption" color="text.disabled">无图</Typography>
                                                    </Box>
                                                )}
                                                <Box sx={{flex: 1, minWidth: 0}}>
                                                    <Typography variant="body2" fontWeight={600} sx={{wordBreak: 'break-word'}}>
                                                        {product.title}
                                                    </Typography>
                                                    <Box sx={{display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5, alignItems: 'center', justifyContent: 'space-between'}}>
                                                        <Box sx={{display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center'}}>
                                                            {product.model_number && <Chip label={product.model_number} size="small" color="primary" variant="outlined"/>}
                                                            {releaseDate && <Chip label={releaseDate} size="small" color="success" variant="outlined"/>}
                                                        </Box>
                                                        <ExpandMoreIcon
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const key = product.model_number ?? product.title
                                                                setExpandedKey(expandedKey === key ? null : key)
                                                            }}
                                                            sx={{
                                                                cursor: 'pointer',
                                                                transform: expandedKey === (product.model_number ?? product.title) ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                transition: 'transform 0.3s',
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{px: 1.5, py: 1}}>
                                            {product.note_raw ? (
                                                <Box
                                                    sx={{fontSize: 13, lineHeight: 1.6, bgcolor: 'action.hover', p: 1.5, borderRadius: 1}}
                                                    dangerouslySetInnerHTML={{__html: product.note_raw}}
                                                />
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">暂无详细说明</Typography>
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                )
                            })}
                            {loadingMore && (
                                <Box sx={{display: 'flex', justifyContent: 'center', py: 2}}>
                                    <CircularProgress size={20}/>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1}}>
                            <InboxIcon sx={{fontSize: 40, color: 'text.disabled'}}/>
                            <Typography variant="body2" color="text.secondary">未找到相关产品</Typography>
                        </Box>
                    )
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{px: 1}}>输入关键词搜索产品</Typography>
                )}
            </Box>
        </Box>
    )
}

export default SiderContent
