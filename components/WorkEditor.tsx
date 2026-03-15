'use client'

import React, {useCallback, useMemo, useRef, useState} from 'react'
import {FileItem, NodeData} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree} from '@/lib/utils'
import {Autocomplete, Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Divider, Link, Stack, TextField, Typography,} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView'
import InboxIcon from '@mui/icons-material/Inbox'
import {useSnackbar} from 'notistack'
import type {EditorTreeNodeProps} from '@/components/EditorTreeNode'
import {renderEditorTreeNodes} from '@/components/EditorTreeNode'
import {type BangumiSearchResult, type BangumiSubject, formatDate, getBangumiSubject, getTypeName, searchBangumi} from '@/lib/bangumi'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkEditorContentProps {
    loading: boolean
    saving: boolean
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
    selectedWorks: BangumiSubject[]
    onWorksChange: (works: (BangumiSubject | SearchResultItem)[]) => void
    onSubmit?: (works?: (BangumiSubject | SearchResultItem)[]) => Promise<boolean>
}

interface WorkInfo {
    volumeId: string
    volumeNo?: number
    catalogNo?: string
}

interface UseWorkEditorReturn {
    loading: boolean
    saving: boolean
    volumeInfo: WorkInfo | null
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
    selectedWorks: BangumiSubject[]
    open: (volumeId: string, volumeNo?: number, catalogNo?: string) => Promise<void>
    hasChanges: () => boolean
    handleSubmit: () => Promise<boolean>
    onSubmit: (works?: (BangumiSubject | SearchResultItem)[]) => Promise<boolean>
    onWorksChange: (works: (BangumiSubject | SearchResultItem)[]) => void
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkEditor(onSave?: () => void): UseWorkEditorReturn {
    const {enqueueSnackbar, closeSnackbar} = useSnackbar()
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [volumeInfo, setVolumeInfo] = useState<WorkInfo | null>(null)
    const [visibleMedias, setVisibleMedias] = useState(20)
    const loadMoreMedias = useCallback(() => setVisibleMedias(v => v + 10), [])
    const [files, setFiles] = useState<FileItem[]>([])
    const [treeData, setTreeData] = useState<any[]>([])
    const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
    const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
    const [selectedWorks, setSelectedWorks] = useState<BangumiSubject[]>([])

    const initialWorksRef = useRef<BangumiSubject[]>([])
    const previousWorksRef = useRef<BangumiSubject[]>([])

    const hasChanges = useCallback((): boolean => {
        const initial = initialWorksRef.current
        const current = selectedWorks

        if (initial.length === 0 && current.length === 0) return false
        if (initial.length !== current.length) return true

        const initialIds = new Set(initial.map(w => w.id))
        const currentIds = new Set(current.map(w => w.id))
        return initial.some(w => !currentIds.has(w.id)) || current.some(w => !initialIds.has(w.id))
    }, [selectedWorks])

    const open = useCallback(async (volumeId: string, volumeNo?: number, catalogNo?: string) => {
        setVolumeInfo({volumeId, volumeNo, catalogNo})
        setLoading(true)
        try {
            // 加载文件列表
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

            // 加载已关联的作品（直接从数据库读取完整数据）
            try {
                const worksResult = await fetchApi<BangumiSubject[]>(`/api/volumes/${volumeId}/works`)
                if (worksResult?.success && worksResult.data && worksResult.data.length > 0) {
                    const savedWorks = worksResult.data
                    setSelectedWorks(savedWorks)
                    initialWorksRef.current = savedWorks
                    previousWorksRef.current = savedWorks
                } else {
                    setSelectedWorks([])
                    initialWorksRef.current = []
                    previousWorksRef.current = []
                }
            } catch (err) {
                console.error('加载关联作品失败:', err)
                setSelectedWorks([])
                initialWorksRef.current = []
                previousWorksRef.current = []
            }
        } catch (err) {
            console.error('加载数据失败:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    const undoSave = useCallback(async (previousWorks: BangumiSubject[]) => {
        if (volumeInfo == null) return false
        setSaving(true)
        try {
            const result = await postApi(`/api/volumes/${volumeInfo.volumeId}/works`, {
                works: previousWorks.length > 0 ? previousWorks : null,
            })
            if (!result?.success) {
                enqueueSnackbar('撤销失败', {variant: 'error'})
                return false
            }
            setSelectedWorks(previousWorks)
            initialWorksRef.current = previousWorks
            enqueueSnackbar('已撤销', {variant: 'success'})
            onSave?.()
            return true
        } catch (err) {
            console.error('撤销失败:', err)
            enqueueSnackbar('撤销失败', {variant: 'error'})
            return false
        } finally {
            setSaving(false)
        }
    }, [volumeInfo, enqueueSnackbar, onSave])

    const handleSubmit = useCallback(async (worksToSave?: (BangumiSubject | SearchResultItem)[] | null): Promise<boolean> => {
        if (volumeInfo == null) return false
        setSaving(true)
        const worksBeforeSave = previousWorksRef.current

        // 使用传入的 works 或当前的 selectedWorks
        const works = worksToSave !== undefined ? worksToSave : selectedWorks

        try {
            const result = await postApi(`/api/volumes/${volumeInfo.volumeId}/works`, {
                works: works && works.length > 0 ? works : null,
            })
            if (!result?.success) {
                enqueueSnackbar(result?.error || '保存失败', {variant: 'error'})
                return false
            }
            previousWorksRef.current = initialWorksRef.current
            // 保存时 works 可能是 SearchResultItem，但 ref 需要 BangumiSubject
            initialWorksRef.current = works as BangumiSubject[]
            onSave?.()

            const snackbarKey = enqueueSnackbar('作品关联已更新', {
                variant: 'success',
                action: (key) => (
                    <Button
                        size="small"
                        color="inherit"
                        onClick={() => {
                            closeSnackbar(key)
                            undoSave(worksBeforeSave)
                        }}
                    >
                        撤销
                    </Button>
                ),
            })

            return true
        } catch (err) {
            console.error('保存失败:', err)
            enqueueSnackbar('保存失败', {variant: 'error'})
            return false
        } finally {
            setSaving(false)
        }
    }, [volumeInfo, selectedWorks, onSave, enqueueSnackbar, closeSnackbar, undoSave])

    const selectedMedias = useMemo(() => [] as number[], [])

    const onWorksChange = useCallback((works: (BangumiSubject | SearchResultItem)[]) => {
        setSelectedWorks(works as BangumiSubject[])
    }, [])

    const onSubmit = useCallback(async (works?: (BangumiSubject | SearchResultItem)[]): Promise<boolean> => {
        return handleSubmit(works)
    }, [handleSubmit])

    return {
        loading,
        saving,
        volumeInfo,
        files,
        treeData,
        nodeData,
        defaultExpandedKeys,
        selectedMedias,
        visibleMedias,
        loadMoreMedias,
        selectedWorks,
        open,
        hasChanges,
        handleSubmit: async () => await handleSubmit(),
        onSubmit,
        onWorksChange,
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
    work: BangumiSubject
}

function WorkDetail({work}: WorkDetailProps) {
    return (
        <Box>
            {/* 标题区域 */}
            <Box sx={{mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider'}}>
                <Typography variant="h6" sx={{fontSize: '1.1rem', fontWeight: 600}}>
                    {work.name_cn || work.name}
                </Typography>
                {work.name_cn && work.name !== work.name_cn && (
                    <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                        {work.name}
                    </Typography>
                )}
            </Box>

            {/* 基本信息 */}
            <InfoRow label="日文标题" value={work.name}/>
            <InfoRow label="中文标题" value={work.name_cn || '-'}/>
            <InfoRow label="类型" value={getTypeName(work.type)}/>
            <InfoRow label="话数" value={work.eps > 0 ? `${work.eps} 话` : '-'}/>
            <InfoRow label="放送日期" value={formatDate(work.air_date)}/>
            {work.rating?.score > 0 && (
                <InfoRow label="评分" value={`${work.rating.score} / 10 (${work.rating.total} 人评分)`}/>
            )}
            {work.rank > 0 && (
                <InfoRow label="排名" value={`#${work.rank}`}/>
            )}
            {work.summary && (
                <InfoRow label="简介" value={work.summary}/>
            )}

            {/* Bangumi 链接 */}
            <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, py: 0.5}}>
                <Typography variant="body2" color="text.secondary" sx={{minWidth: 80}}>
                    Bangumi
                </Typography>
                <Link
                    href={work.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{flex: 1}}
                >
                    {work.url}
                </Link>
            </Box>

            {/* 收藏统计 */}
            {work.collection && (
                <Box sx={{mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider'}}>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                        收藏统计
                    </Typography>
                    <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1}}>
                        <Chip label={`想看: ${work.collection.wish}`} size="small" variant="outlined"/>
                        <Chip label={`看过: ${work.collection.collect}`} size="small" variant="outlined"/>
                        <Chip label={`在看: ${work.collection.doing}`} size="small" variant="outlined"/>
                        <Chip label={`搁置: ${work.collection.on_hold}`} size="small" variant="outlined"/>
                        <Chip label={`抛弃: ${work.collection.dropped}`} size="small" variant="outlined"/>
                    </Box>
                </Box>
            )}
        </Box>
    )
}

// ─── WorkReadOnlyView (只读模式视图) ─────────────────────────────────────────

interface WorkReadOnlyViewProps {
    works: BangumiSubject[]
    onEdit: () => void
}

function WorkReadOnlyView({works, onEdit}: WorkReadOnlyViewProps) {
    return (
        <Box>
            <Stack spacing={2}>
                {works.map((work, index) => (
                    <Box key={work.id}>
                        <WorkDetail work={work}/>
                        {index < works.length - 1 && (
                            <Box sx={{my: 2, borderBottom: '1px solid', borderColor: 'divider'}}/>
                        )}
                    </Box>
                ))}
            </Stack>
            <Box sx={{mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider'}}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon/>}
                    onClick={onEdit}
                >
                    更换作品
                </Button>
            </Box>
        </Box>
    )
}

// ─── WorkEditView (编辑模式视图) ─────────────────────────────────────────────

// 搜索结果的条目类型（比 BangumiSubject 字段少）
type SearchResultItem = BangumiSearchResult['list'][number]

interface WorkEditViewProps {
    selectedWorks: BangumiSubject[]
    tempWorks: (BangumiSubject | SearchResultItem)[]
    onTempWorksChange: (works: (BangumiSubject | SearchResultItem)[]) => void
    onSave: () => void
    onCancel?: () => void
    saving: boolean
}

function WorkEditView({
                          selectedWorks,
                          tempWorks,
                          onTempWorksChange,
                          onSave,
                          onCancel,
                          saving
                      }: WorkEditViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<BangumiSearchResult['list']>([])
    const [searching, setSearching] = useState(false)

    // 防抖搜索
    const handleSearchChange = useCallback(async (_: React.SyntheticEvent, value: string, reason: string) => {
        // 选择选项时不触发搜索，保持当前搜索结果
        if (reason === 'selectOption') {
            return
        }
        setSearchQuery(value)
        if (value.length < 2) {
            setSearchResults([])
            return
        }
        setSearching(true)
        try {
            const result = await searchBangumi(value, 2)
            setSearchResults(result.list)
        } catch (err) {
            console.error('搜索失败:', err)
        } finally {
            setSearching(false)
        }
    }, [])

    const handleChange = useCallback((_: React.SyntheticEvent, newValue: (BangumiSubject | SearchResultItem)[]) => {
        onTempWorksChange(newValue)
    }, [onTempWorksChange])

    const hasSelection = tempWorks.length > 0
    const isChanged = useMemo(() => {
        if (selectedWorks.length !== tempWorks.length) return true
        const selectedIds = new Set(selectedWorks.map(w => w.id))
        const tempIds = new Set(tempWorks.map(w => w.id))
        return selectedWorks.some(w => !tempIds.has(w.id)) || tempWorks.some(w => !selectedIds.has(w.id))
    }, [selectedWorks, tempWorks])

    return (
        <Box>
            <Autocomplete<SearchResultItem, true, false, false>
                sx={{maxWidth: 500, mb: 2, mt: 1}}
                size="small"
                multiple
                disableCloseOnSelect
                options={searchResults}
                getOptionLabel={(option) => option.name_cn || option.name}
                filterOptions={(x) => x} // 禁用本地过滤，使用 API 结果
                value={tempWorks as SearchResultItem[]}
                onChange={handleChange}
                onInputChange={handleSearchChange}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={searching}
                renderOption={(props, option) => (
                    <Box component="li" {...props}>
                        <Box sx={{display: 'flex', flexDirection: 'column', py: 0.5}}>
                            <Typography variant="body2" sx={{fontWeight: 500}}>
                                {option.name_cn || option.name}
                            </Typography>
                            {(option.name_cn && option.name !== option.name_cn) && (
                                <Typography variant="caption" color="text.secondary">
                                    {option.name}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            variant="outlined"
                            label={option.name_cn || option.name}
                            size="small"
                            {...getTagProps({index})}
                            key={option.id}
                        />
                    ))
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="搜索作品"
                        placeholder="输入日文或中文标题..."
                        size="small"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <React.Fragment>
                                    {searching ? <CircularProgress color="inherit" size={20}/> : null}
                                    {params.InputProps.endAdornment}
                                </React.Fragment>
                            ),
                        }}
                    />
                )}
            />

            {/* 选中作品详情预览 */}
            {tempWorks.length > 0 && (
                <Box sx={{mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1}}>
                    <Stack spacing={1} divider={<Divider/>}>
                        {tempWorks.map((work) => (
                            <Box key={work.id}>
                                <Typography variant="body2" sx={{fontWeight: 600}}>
                                    {work.name_cn || work.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {getTypeName(work.type)} {work.air_date}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* 操作按钮 */}
            <Stack direction="row" spacing={1} justifyContent="flex-start" sx={{mt: 1}}>
                {onCancel && (
                    <Button
                        variant="text"
                        size="small"
                        startIcon={<CloseIcon/>}
                        onClick={onCancel}
                        disabled={saving}
                    >
                        取消
                    </Button>
                )}
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon/>}
                    onClick={onSave}
                    disabled={!hasSelection || !isChanged || saving}
                >
                    保存
                </Button>
            </Stack>
        </Box>
    )
}

// ─── WorkFormList (作品信息表单) ─────────────────────────────────────────────

interface WorkFormListProps {
    selectedWorks: BangumiSubject[]
    onWorksChange: (works: (BangumiSubject | SearchResultItem)[]) => void
    saving?: boolean
    onSubmit?: (works?: (BangumiSubject | SearchResultItem)[]) => Promise<boolean>
}

function WorkFormList({selectedWorks, onWorksChange, saving = false, onSubmit}: WorkFormListProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempWorks, setTempWorks] = useState<(BangumiSubject | SearchResultItem)[]>([])

    React.useEffect(() => {
        if (selectedWorks.length === 0) {
            setIsEditing(true)
            setTempWorks([])
        } else {
            setIsEditing(false)
            setTempWorks(selectedWorks)
        }
    }, [selectedWorks])

    const handleEdit = useCallback(() => {
        setTempWorks(selectedWorks)
        setIsEditing(true)
    }, [selectedWorks])

    const handleCancel = useCallback(() => {
        if (selectedWorks.length > 0) {
            setTempWorks(selectedWorks)
            setIsEditing(false)
        }
    }, [selectedWorks])

    const handleSave = useCallback(async () => {
        if (tempWorks.length > 0) {
            // 获取所有选中作品的完整条目详情
            try {
                const fullSubjects: BangumiSubject[] = []
                for (const tempWork of tempWorks) {
                    try {
                        const fullSubject = await getBangumiSubject(tempWork.id, 'large')
                        fullSubjects.push(fullSubject)
                    } catch (err) {
                        console.error(`[WorkEditor] 获取条目 ${tempWork.id} 详情失败:`, err)
                        // 如果获取详情失败，使用当前数据
                        fullSubjects.push(tempWork as BangumiSubject)
                    }
                }

                // 先更新父组件的 selectedWorks
                onWorksChange(fullSubjects)

                // 如果有 onSubmit，调用它进行保存
                if (onSubmit) {
                    const result = await onSubmit(fullSubjects)
                    // 如果保存成功，退出编辑模式
                    if (result) {
                        setIsEditing(false)
                    }
                    return
                }
            } catch (err) {
                console.error('[WorkEditor] 保存失败:', err)
                onWorksChange(tempWorks)
                if (onSubmit) {
                    await onSubmit(tempWorks)
                }
            }
        } else {
            // 没有选中任何作品，清空
            onWorksChange([])
            if (onSubmit) {
                const result = await onSubmit([])
                if (result) {
                    setIsEditing(false)
                }
            }
        }
        setIsEditing(tempWorks.length === 0)
    }, [tempWorks, onWorksChange, onSubmit])

    return (
        <Card variant="outlined">
            <CardHeader
                title="作品信息"
                titleTypographyProps={{variant: 'body2', fontWeight: 600}}
                sx={{py: 1, px: 1.5, pb: 0.5}}
            />
            <CardContent sx={{pt: 1, pb: '8px !important', px: 1.5}}>
                {isEditing ? (
                    <WorkEditView
                        selectedWorks={selectedWorks}
                        tempWorks={tempWorks}
                        onTempWorksChange={setTempWorks}
                        onSave={handleSave}
                        onCancel={selectedWorks.length > 0 ? handleCancel : undefined}
                        saving={saving}
                    />
                ) : selectedWorks.length > 0 ? (
                    <WorkReadOnlyView
                        works={selectedWorks}
                        onEdit={handleEdit}
                    />
                ) : null}
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
                                      saving,
                                      files,
                                      treeData,
                                      nodeData,
                                      defaultExpandedKeys,
                                      selectedMedias,
                                      visibleMedias,
                                      loadMoreMedias,
                                      selectedWorks,
                                      onWorksChange,
                                      onSubmit,
                                  }: WorkEditorContentProps) {
    const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpandedKeys);

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

    const computeIsMixed = useMemo(() => makeWorkComputeIsMixed(), [])

    return (
        <Card variant="outlined" sx={{position: 'relative', mx: 2, mt: 1, mb: 2}}>
            {(loading || saving) && (
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
                    selectedWorks={selectedWorks}
                    onWorksChange={onWorksChange}
                    saving={saving}
                    onSubmit={onSubmit}
                />
            </CardContent>
        </Card>
    )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type {UseWorkEditorReturn}
export default WorkEditorContent
