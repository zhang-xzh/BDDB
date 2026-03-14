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
import {type BangumiItem, getAllBangumiItems, getBangumiItemBySubjectId, getLangLabel, getTypeLabel} from '@/lib/bangumi'

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
    selectedWork: BangumiItem | null
    onWorkChange: (work: BangumiItem | null) => void
    onSubmit?: () => Promise<boolean>
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
    selectedWork: BangumiItem | null
    open: (volumeId: string, volumeNo?: number, catalogNo?: string) => Promise<void>
    hasChanges: () => boolean
    handleSubmit: () => Promise<boolean>
    onWorkChange: (work: BangumiItem | null) => void
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
    const [selectedWork, setSelectedWork] = useState<BangumiItem | null>(null)

    // 用于检测变更的初始值快照
    const initialWorkRef = useRef<BangumiItem | null>(null)
    // 用于撤销的前一个值
    const previousWorkRef = useRef<BangumiItem | null>(null)

    const hasChanges = useCallback((): boolean => {
        // 比较当前选中的作品和初始值
        const initial = initialWorkRef.current
        const current = selectedWork

        if (!initial && !current) return false
        if (!initial || !current) return true
        return initial.id !== current.id
    }, [selectedWork])

    const onWorkChange = useCallback((work: BangumiItem | null) => {
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
                const worksResult = await fetchApi<{bangumiSubjectId?: string}[]>(`/api/volumes/${volumeId}/works`)
                if (worksResult?.success && worksResult.data && worksResult.data.length > 0) {
                    // 取第一个关联的作品（单选）
                    const savedWork = worksResult.data[0]
                    if (savedWork?.bangumiSubjectId) {
                        // 从 bangumi-data 中找到对应条目
                        const bangumiItem = getBangumiItemBySubjectId(savedWork.bangumiSubjectId)
                        if (bangumiItem) {
                            setSelectedWork(bangumiItem)
                            initialWorkRef.current = bangumiItem
                            previousWorkRef.current = bangumiItem
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

    // 撤销操作
    const undoSave = useCallback(async (previousWork: BangumiItem | null) => {
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

    const handleSubmit = useCallback(async (): Promise<boolean> => {
        if (volumeInfo == null) return false
        setSaving(true)
        // 保存当前值用于撤销
        const workBeforeSave = previousWorkRef.current
        try {
            const result = await postApi(`/api/volumes/${volumeInfo.volumeId}/works`, {
                work: selectedWork,
            })
            if (!result?.success) {
                enqueueSnackbar(result?.error || '保存失败', {variant: 'error'})
                return false
            }
            // 更新快照
            previousWorkRef.current = initialWorkRef.current
            initialWorkRef.current = selectedWork
            onSave?.()

            // Material Design: Snackbar with Undo
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

// ─── WorkReadOnlyView (只读模式视图) ─────────────────────────────────────────

interface WorkReadOnlyViewProps {
    work: BangumiItem
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
    selectedWork: BangumiItem | null
    tempWork: BangumiItem | null
    onTempWorkChange: (work: BangumiItem | null) => void
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
    const bangumiItems = useMemo(() => getAllBangumiItems(), [])

    const handleChange = useCallback((_: React.SyntheticEvent, newValue: BangumiItem | null) => {
        onTempWorkChange(newValue)
    }, [onTempWorkChange])

    const hasSelection = tempWork !== null
    const isChanged = selectedWork?.id !== tempWork?.id

    return (
        <Box>
            <Autocomplete
                sx={{maxWidth: 400, mb: 2}}
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
                value={tempWork}
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

            {/* 选中作品详情预览 */}
            {tempWork && (
                <Box sx={{mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1}}>
                    <Typography variant="body2" sx={{fontWeight: 600}}>
                        {tempWork.titleCn || tempWork.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {getTypeLabel(tempWork.type)} · {getLangLabel(tempWork.lang)}
                    </Typography>
                </Box>
            )}

            {/* 操作按钮 */}
            <Stack direction="row" spacing={1} justifyContent="flex-start">
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
                    loading={saving}
                >
                    保存
                </Button>
            </Stack>
        </Box>
    )
}

// ─── WorkFormList (作品信息表单) ─────────────────────────────────────────────

interface WorkFormListProps {
    selectedWork: BangumiItem | null
    onWorkChange: (work: BangumiItem | null) => void
    saving?: boolean
    onSubmit?: () => Promise<boolean>
}

function WorkFormList({selectedWork, onWorkChange, saving = false, onSubmit}: WorkFormListProps) {
    // 编辑模式状态：未关联作品时默认进入编辑模式
    const [isEditing, setIsEditing] = useState(false)
    const [tempWork, setTempWork] = useState<BangumiItem | null>(null)

    // 当 selectedWork 变化时，同步更新状态
    React.useEffect(() => {
        if (selectedWork === null) {
            // 未关联作品：进入编辑模式
            setIsEditing(true)
            setTempWork(null)
        } else {
            // 已关联作品：进入只读模式
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
            onWorkChange(tempWork)
            // 如果有提交回调，调用它进行服务器保存
            if (onSubmit) {
                await onSubmit()
            }
        }
        // 保存后根据是否有作品决定模式
        setIsEditing(tempWork === null)
    }, [tempWork, onWorkChange, onSubmit])

    return (
        <Card variant="outlined">
            <CardHeader
                title="作品信息"
                titleTypographyProps={{variant: 'body2', fontWeight: 600}}
                sx={{py: 1, px: 1.5}}
            />
            <CardContent sx={{pt: 1.5, pb: '8px !important', px: 1.5}}>
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
    // 使用受控的 expandedItems 来确保 defaultExpandedKeys 变化时能正确展开
    const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpandedKeys);

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
