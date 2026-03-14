'use client'

import React, {useCallback, useMemo, useState} from 'react'
import type {FileItem, NodeData} from '@/lib/mongodb'
import {fetchApi} from '@/lib/api'
import {buildTree} from '@/lib/utils'
import {Autocomplete, Box, Card, CardContent, CardHeader, Chip, CircularProgress, Link, Stack, TextField, Typography,} from '@mui/material'
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView'
import InboxIcon from '@mui/icons-material/Inbox'
import type {EditorTreeNodeProps} from '@/components/EditorTreeNode'
import {renderEditorTreeNodes} from '@/components/EditorTreeNode'
import {type BangumiItem, getAllBangumiItems, getLangLabel, getTypeLabel} from '@/lib/bangumi'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkEditorContentProps {
    loading: boolean
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
}

interface UseWorkEditorReturn {
    loading: boolean
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
    open: (volumeId: string) => Promise<void>
    hasChanges: () => boolean
    handleSubmit: () => Promise<boolean>
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkEditor(): UseWorkEditorReturn {
    const [loading, setLoading] = useState(false)
    const [files, setFiles] = useState<FileItem[]>([])
    const [treeData, setTreeData] = useState<any[]>([])
    const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
    const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
    const [visibleMedias, setVisibleMedias] = useState(20)
    const loadMoreMedias = useCallback(() => setVisibleMedias(v => v + 10), [])

    const open = useCallback(async (volumeId: string) => {
        setLoading(true)
        try {
            const filesResult = await fetchApi<FileItem[]>(`/api/volumes/${volumeId}/files`)
            let loadedFiles: FileItem[] = []
            if (filesResult?.success && filesResult.data) {
                loadedFiles = filesResult.data
            }
            setFiles(loadedFiles)
            if (loadedFiles.length > 0) {
                const {treeData: td, nodeData: nd, defaultExpandedKeys: ek} = buildTree(loadedFiles)
                setTreeData(td)
                setNodeData(nd)
                setDefaultExpandedKeys(ek)
            } else {
                setTreeData([])
                setNodeData(new Map())
                setDefaultExpandedKeys([])
            }
        } catch (err) {
            console.error('加载文件失败:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    // 只读模式，永远没有变更需要保存
    const hasChanges = useCallback(() => false, [])
    const handleSubmit = useCallback(async () => true, [])

    const selectedMedias = useMemo(() => [] as number[], [])

    return {
        loading,
        files,
        treeData,
        nodeData,
        defaultExpandedKeys,
        selectedMedias,
        visibleMedias,
        loadMoreMedias,
        open,
        hasChanges,
        handleSubmit,
    }
}

// ─── InfoRow 组件 ────────────────────────────────────────────────────────────

interface InfoRowProps {
    label: string
    value: React.ReactNode
}

function InfoRow({label, value}: InfoRowProps) {
    if (!value || value === '-') return null
    return (
        <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, py: 0.5}}>
            <Typography variant="body2" color="text.secondary" sx={{minWidth: 80, flexShrink: 0}}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{flex: 1}}>
                {value}
            </Typography>
        </Box>
    )
}

// ─── WorkDetail 组件 ─────────────────────────────────────────────────────────

interface WorkDetailProps {
    work: BangumiItem
}

function WorkDetail({work}: WorkDetailProps) {
    // 格式化日期
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        try {
            return new Date(dateStr).toLocaleDateString('zh-CN')
        } catch {
            return dateStr
        }
    }

    // 获取 bangumi 链接
    const bangumiSite = work.sites?.find(s => s.site === 'bangumi')
    const bangumiUrl = bangumiSite?.id ? `https://bangumi.tv/subject/${bangumiSite.id}` : null

    return (
        <Box sx={{mt: 2}}>
            {/* 标题区域 */}
            <Box sx={{mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider'}}>
                <Typography variant="h6" sx={{fontSize: '1.1rem', fontWeight: 600}}>
                    {work.titleCn || work.title}
                </Typography>
                {work.titleCn && work.title !== work.titleCn && (
                    <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                        {work.title}
                    </Typography>
                )}
            </Box>

            {/* 基本信息 */}
            <InfoRow label="日文标题" value={work.title}/>
            <InfoRow label="中文标题" value={work.titleCn || '-'}/>
            <InfoRow label="英文标题" value={work.titleEn || '-'}/>
            <InfoRow label="类型" value={getTypeLabel(work.type)}/>
            <InfoRow label="语言" value={getLangLabel(work.lang)}/>
            <InfoRow label="开始日期" value={formatDate(work.begin)}/>
            <InfoRow label="结束日期" value={formatDate(work.end)}/>
            {work.broadcast && (
                <InfoRow label="放送周期" value={work.broadcast}/>
            )}
            {work.comment && (
                <InfoRow label="备注" value={work.comment}/>
            )}

            {/* 官网 */}
            {work.officialSite && (
                <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, py: 0.5}}>
                    <Typography variant="body2" color="text.secondary" sx={{minWidth: 80}}>
                        官网
                    </Typography>
                    <Link
                        href={work.officialSite}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{flex: 1}}
                    >
                        {work.officialSite}
                    </Link>
                </Box>
            )}

            {/* Bangumi 链接 */}
            {bangumiUrl && (
                <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, py: 0.5}}>
                    <Typography variant="body2" color="text.secondary" sx={{minWidth: 80}}>
                        Bangumi
                    </Typography>
                    <Link
                        href={bangumiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{flex: 1}}
                    >
                        {bangumiUrl}
                    </Link>
                </Box>
            )}

            {/* 关联站点 */}
            {work.sites && work.sites.length > 0 && (
                <Box sx={{mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider'}}>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                        关联站点
                    </Typography>
                    <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1}}>
                        {work.sites
                            .filter(s => s.site !== 'bangumi') // 已单独显示
                            .map(site => (
                                <Chip
                                    key={site.site}
                                    label={`${site.siteName}: ${site.id}`}
                                    size="small"
                                    variant="outlined"
                                />
                            ))}
                    </Box>
                </Box>
            )}
        </Box>
    )
}

// ─── WorkFormList (作品信息表单) ─────────────────────────────────────────────

interface WorkFormListProps {
    selectedWork: BangumiItem | null
    onWorkChange: (work: BangumiItem | null) => void
}

function WorkFormList({selectedWork, onWorkChange}: WorkFormListProps) {
    const bangumiItems = useMemo(() => getAllBangumiItems(), [])

    const handleChange = useCallback((_: React.SyntheticEvent, newValue: BangumiItem | null) => {
        onWorkChange(newValue)
    }, [onWorkChange])

    return (
        <Card variant="outlined">
            <CardHeader
                title="作品信息"
                titleTypographyProps={{variant: 'body2', fontWeight: 600}}
                sx={{py: 1, px: 1.5}}
            />
            <CardContent sx={{pt: 2, pb: '8px !important', px: 1.5}}>
                {/* 作品选择器 - 单选 */}
                <Autocomplete
                    sx={{maxWidth: 400}}
                    size="small"
                    options={bangumiItems}
                    getOptionLabel={(option) => option.titleCn || option.title}
                    filterOptions={(options, state) => {
                        const query = state.inputValue.toLowerCase()
                        return options.filter(opt =>
                            opt.title.toLowerCase().includes(query) ||
                            opt.titleCn.toLowerCase().includes(query)
                        ).slice(0, 10)
                    }}
                    value={selectedWork}
                    onChange={handleChange}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="搜索作品"
                            placeholder="输入日文或中文标题..."
                            size="small"
                        />
                    )}
                />

                {/* 选中作品详情 - 平铺展示 */}
                {selectedWork && <WorkDetail work={selectedWork}/>}
            </CardContent>
        </Card>
    )
}

// ─── WorkEditor isMixed 计算 ─────────────────────────────────────────────────

function makeWorkComputeIsMixed() {
    return (leafKeys: string[], isLeaf: boolean): boolean => {
        return false
    }
}

// ─── WorkEditorContent ───────────────────────────────────────────────────────

export function WorkEditorContent({
                                      loading,
                                      files,
                                      treeData,
                                      nodeData,
                                      defaultExpandedKeys,
                                      selectedMedias,
                                      visibleMedias,
                                      loadMoreMedias,
                                  }: WorkEditorContentProps) {
    // 使用受控的 expandedItems 来确保 defaultExpandedKeys 变化时能正确展开
    const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpandedKeys);
    // 已选作品（单选）
    const [selectedWork, setSelectedWork] = useState<BangumiItem | null>(null);

    // 当 defaultExpandedKeys 变化时同步更新 expandedItems
    React.useEffect(() => {
        setExpandedItems(defaultExpandedKeys);
    }, [defaultExpandedKeys]);

    const nodeContentProps = useMemo<Omit<EditorTreeNodeProps, 'title' | 'nodeKey' | 'isLeaf' | 'isMixed'>>(() => ({
        formatValue: (v: number) => `媒介 ${v}`,
        visibleCount: visibleMedias,
        onLoadMore: loadMoreMedias,
        readOnly: true,
        getSingleValue: () => undefined,
        getIsShared: () => false,
        getSharedValues: () => [],
        onSingleChange: () => {
        },
        onSharedChange: () => {
        },
        onToggleShared: () => {
        },
    }), [visibleMedias, loadMoreMedias])

    const computeIsMixed = useMemo(
        () => makeWorkComputeIsMixed(),
        [],
    )

    return (
        <Card variant="outlined" sx={{position: 'relative', mx: 2, mt: 1, mb: 2}}>
            {loading && (
                <Box sx={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, bgcolor: 'rgba(255,255,255,0.6)'}}>
                    <CircularProgress/>
                </Box>
            )}
            <CardHeader
                title={
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="subtitle2">文件列表</Typography>
                        <Typography variant="body2" color="text.secondary">{files.length} 个文件</Typography>
                    </Stack>
                }
                sx={{pt: 2, pb: 1, px: 2}}
            />
            <CardContent sx={{pt: 0, px: 2, pb: '8px !important'}}>
                {files.length > 0 ? (
                    <SimpleTreeView
                        expandedItems={expandedItems}
                        onExpandedItemsChange={(_, items) => setExpandedItems(items)}
                    >
                        {renderEditorTreeNodes(treeData, nodeContentProps, computeIsMixed)}
                    </SimpleTreeView>
                ) : (
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, color: 'text.disabled'}}>
                        <InboxIcon sx={{fontSize: 48, mb: 1}}/>
                        <Typography>暂无文件数据</Typography>
                    </Box>
                )}
            </CardContent>
            {/* 作品信息表单 */}
            <CardContent sx={{pt: 1, px: 2, pb: '8px !important'}}>
                <WorkFormList
                    selectedWork={selectedWork}
                    onWorkChange={setSelectedWork}
                />
            </CardContent>
        </Card>
    )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type {UseWorkEditorReturn}
export default WorkEditorContent
