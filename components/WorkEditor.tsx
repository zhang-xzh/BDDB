'use client'

import React, {useCallback, useMemo, useRef, useState} from 'react'
import type {FileItem, NodeData} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree} from '@/lib/utils'
import {Autocomplete, Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Link, Stack, TextField, Typography,} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView'
import InboxIcon from '@mui/icons-material/Inbox'
import {useSnackbar} from 'notistack'
import type {EditorTreeNodeProps} from '@/components/EditorTreeNode'
import {renderEditorTreeNodes} from '@/components/EditorTreeNode'
import {type BangumiSubject, formatDate, getBangumiSubject, getTypeName, searchBangumi} from '@/lib/bangumi'

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
    selectedWork: BangumiSubject | null
    onWorkChange: (work: BangumiSubject | null) => void
    onSubmit?: (work?: BangumiSubject | null) => Promise<boolean>
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
    selectedWork: BangumiSubject | null
    open: (volumeId: string, volumeNo?: number, catalogNo?: string) => Promise<void>
    hasChanges: () => boolean
    handleSubmit: (work?: BangumiSubject | null) => Promise<boolean>
    onWorkChange: (work: BangumiSubject | null) => void
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
    const [selectedWork, setSelectedWork] = useState<BangumiSubject | null>(null)

    const initialWorkRef = useRef<BangumiSubject | null>(null)
    const previousWorkRef = useRef<BangumiSubject | null>(null)

    const hasChanges = useCallback((): boolean => {
        const initial = initialWorkRef.current
        const current = selectedWork

        if (!initial && !current) return false
        if (!initial || !current) return true
        return initial.id !== current.id
    }, [selectedWork])

    const onWorkChange = useCallback((work: BangumiSubject | null) => {
        setSelectedWork(work)
    }, [])

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

            // 加载已关联的作品
            try {
                const worksResult = await fetchApi<{ subjectId?: number }[]>(`/api/volumes/${volumeId}/works`)
                if (worksResult?.success && worksResult.data && worksResult.data.length > 0) {
                    const savedWork = worksResult.data[0]
                    if (savedWork?.subjectId) {
                        // 从 Bangumi API 获取详情
                        const subject = await getBangumiSubject(savedWork.subjectId)
                        if (subject) {
                            setSelectedWork(subject)
                            initialWorkRef.current = subject
                            previousWorkRef.current = subject
                        } else {
                            setSelectedWork(null)
                            initialWorkRef.current = null
                            previousWorkRef.current = null
                        }
                    } else {
                        setSelectedWork(null)
                        initialWorkRef.current = null
                        previousWorkRef.current = null
                    }
                } else {
                    setSelectedWork(null)
                    initialWorkRef.current = null
                    previousWorkRef.current = null
                }
            } catch (err) {
                console.error('加载关联作品失败:', err)
                setSelectedWork(null)
                initialWorkRef.current = null
                previousWorkRef.current = null
            }
        } catch (err) {
            console.error('加载数据失败:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    const undoSave = useCallback(async (previousWork: BangumiSubject | null) => {
        if (volumeInfo == null) return false
        setSaving(true)
        try {
            const result = await postApi(`/api/volumes/${volumeInfo.volumeId}/works`, {
                work: previousWork,
            })
            if (!result?.success) {
                enqueueSnackbar('撤销失败', {variant: 'error'})
                return false
            }
            setSelectedWork(previousWork)
            initialWorkRef.current = previousWork
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

    const handleSubmit = useCallback(async (workToSave?: BangumiSubject | null): Promise<boolean> => {
        if (volumeInfo == null) return false
        setSaving(true)
        const workBeforeSave = previousWorkRef.current
        
        // 使用传入的 work 或当前的 selectedWork
        const work = workToSave !== undefined ? workToSave : selectedWork
        
        console.log('[useWorkEditor] handleSubmit called with work:', work?.id, work?.name_cn || work?.name)
        
        try {
            const result = await postApi(`/api/volumes/${volumeInfo.volumeId}/works`, {
                work: work,
            })
            if (!result?.success) {
                enqueueSnackbar(result?.error || '保存失败', {variant: 'error'})
                return false
            }
            previousWorkRef.current = initialWorkRef.current
            initialWorkRef.current = work
            onSave?.()

            const snackbarKey = enqueueSnackbar('作品关联已更新', {
                variant: 'success',
                action: (key) => (
                    <Button
                        size="small"
                        color="inherit"
                        onClick={() => {
                            closeSnackbar(key)
                            undoSave(workBeforeSave)
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
    }, [volumeInfo, selectedWork, onSave, enqueueSnackbar, closeSnackbar, undoSave])

    const selectedMedias = useMemo(() => [] as number[], [])

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
        selectedWork,
        open,
        hasChanges,
        handleSubmit,
        onWorkChange,
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
    work: BangumiSubject
    onEdit: () => void
}

function WorkReadOnlyView({work, onEdit}: WorkReadOnlyViewProps) {
    return (
        <Box>
            <WorkDetail work={work}/>
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

interface WorkEditViewProps {
    selectedWork: BangumiSubject | null
    tempWork: BangumiSubject | null
    onTempWorkChange: (work: BangumiSubject | null) => void
    onSave: () => void
    onCancel?: () => void
    saving: boolean
}

function WorkEditView({
                          selectedWork,
                          tempWork,
                          onTempWorkChange,
                          onSave,
                          onCancel,
                          saving
                      }: WorkEditViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<BangumiSubject[]>([])
    const [searching, setSearching] = useState(false)

    // 防抖搜索
    const handleSearchChange = useCallback(async (_: React.SyntheticEvent, value: string) => {
        setSearchQuery(value)
        if (value.length < 2) {
            setSearchResults([])
            return
        }
        setSearching(true)
        try {
            const result = await searchBangumi(value, 2, 'small')
            setSearchResults(result.list)
        } catch (err) {
            console.error('搜索失败:', err)
        } finally {
            setSearching(false)
        }
    }, [])

    const handleChange = useCallback((_: React.SyntheticEvent, newValue: BangumiSubject | null) => {
        onTempWorkChange(newValue)
    }, [onTempWorkChange])

    const hasSelection = tempWork !== null
    const isChanged = selectedWork?.id !== tempWork?.id

    return (
        <Box>
            <Autocomplete
                sx={{maxWidth: 400, mb: 2, mt: 1}}
                size="small"
                options={searchResults}
                getOptionLabel={(option) => option.name_cn || option.name}
                filterOptions={(x) => x} // 禁用本地过滤，使用 API 结果
                value={tempWork}
                onChange={handleChange}
                onInputChange={handleSearchChange}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={searching}
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
            {tempWork && (
                <Box sx={{mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1}}>
                    <Typography variant="body2" sx={{fontWeight: 600}}>
                        {tempWork.name_cn || tempWork.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {getTypeName(tempWork.type)}
                    </Typography>
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
    selectedWork: BangumiSubject | null
    onWorkChange: (work: BangumiSubject | null) => void
    saving?: boolean
    onSubmit?: (work?: BangumiSubject | null) => Promise<boolean>
}

function WorkFormList({selectedWork, onWorkChange, saving = false, onSubmit}: WorkFormListProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempWork, setTempWork] = useState<BangumiSubject | null>(null)

    React.useEffect(() => {
        if (selectedWork === null) {
            setIsEditing(true)
            setTempWork(null)
        } else {
            setIsEditing(false)
            setTempWork(selectedWork)
        }
    }, [selectedWork])

    const handleEdit = useCallback(() => {
        setTempWork(selectedWork)
        setIsEditing(true)
    }, [selectedWork])

    const handleCancel = useCallback(() => {
        if (selectedWork) {
            setTempWork(selectedWork)
            setIsEditing(false)
        }
    }, [selectedWork])

    const handleSave = useCallback(async () => {
        if (tempWork !== null) {
            // 获取完整的条目详情（包含 rating、rank、collection 等）
            try {
                console.log('[WorkEditor] Fetching full subject details for id:', tempWork.id)
                const fullSubject = await getBangumiSubject(tempWork.id, 'large')
                console.log('[WorkEditor] Got full subject:', fullSubject.name_cn || fullSubject.name)
                
                // 先更新父组件的 selectedWork
                onWorkChange(fullSubject)
                
                // 如果有 onSubmit，调用它进行保存
                if (onSubmit) {
                    console.log('[WorkEditor] Calling onSubmit with full subject')
                    const result = await onSubmit(fullSubject)
                    console.log('[WorkEditor] onSubmit result:', result)
                    // 如果保存成功，退出编辑模式
                    if (result) {
                        setIsEditing(false)
                    }
                    return
                }
            } catch (err) {
                console.error('[WorkEditor] 获取完整条目详情失败:', err)
                // 如果获取详情失败，仍然使用当前数据
                onWorkChange(tempWork)
                if (onSubmit) {
                    await onSubmit(tempWork)
                }
            }
        }
        setIsEditing(tempWork === null)
    }, [tempWork, onWorkChange, onSubmit])

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
                        selectedWork={selectedWork}
                        tempWork={tempWork}
                        onTempWorkChange={setTempWork}
                        onSave={handleSave}
                        onCancel={selectedWork ? handleCancel : undefined}
                        saving={saving}
                    />
                ) : selectedWork ? (
                    <WorkReadOnlyView
                        work={selectedWork}
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
                                      selectedWork,
                                      onWorkChange,
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
                    selectedWork={selectedWork}
                    onWorkChange={onWorkChange}
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
