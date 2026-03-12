'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState,} from 'react'
import type {FileItem, Media, MediaForm, MediaType, NodeData} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree, FlatTree} from '@/lib/utils'
import {
    Box, Card, CardContent, CardHeader, CircularProgress,
    FormControl, IconButton, InputLabel, MenuItem, Select, Stack,
    TextField, Typography,
} from '@mui/material'
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InboxIcon from '@mui/icons-material/Inbox'
import {useSnackbar} from 'notistack'
import {EditorTreeNode, renderEditorTreeNodes} from '@/components/EditorTreeNode'
import type {EditorTreeNodeProps} from '@/components/EditorTreeNode'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MediaInfo {
    volumeId: string
    volumeNo?: number
    catalogNo?: string
}

export interface MediaEditorContentProps {
    loading: boolean
    saving: boolean
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
    mediaForms: Record<number, MediaForm>
    onMediaNoChange: (key: string, mediaNo: number | null) => void
    onSharedMediaChange: (key: string, medias: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
    getNodeMediaNo: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedMedias: (key: string) => number[]
    getComputedNodeValue: (key: string) => {
        media_no: number | undefined
        isConsistent: boolean
    }
    updateMediaForm: (no: number, form: MediaForm) => void
    resetMediaAssignments: () => void
    deleteMedia: (no: number) => void
}

interface UseMediaEditorReturn {
    loading: boolean
    saving: boolean
    volumeInfo: MediaInfo | null
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
    mediaForms: Record<number, MediaForm>
    open: (volumeId: string, volumeNo?: number, catalogNo?: string) => Promise<void>
    handleSubmit: () => Promise<boolean>
    hasChanges: () => boolean
    onMediaNoChange: (key: string, mediaNo: number | null) => void
    onSharedMediaChange: (key: string, medias: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
    getNodeMediaNo: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedMedias: (key: string) => number[]
    getComputedNodeValue: (key: string) => {
        media_no: number | undefined
        isConsistent: boolean
    }
    updateMediaForm: (no: number, form: MediaForm) => void
    resetMediaAssignments: () => void
    deleteMedia: (no: number) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
    {value: 'bd', label: 'BD'},
    {value: 'dvd', label: 'DVD'},
    {value: 'cd', label: 'CD'},
    {value: 'scan', label: '扫图'},
]

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMediaEditor(onSave?: () => void): UseMediaEditorReturn {
    const {enqueueSnackbar} = useSnackbar()
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [volumeInfo, setVolumeInfo] = useState<MediaInfo | null>(null)
    const [visibleMedias, setVisibleMedias] = useState(20)
    const loadMoreMedias = useCallback(() => setVisibleMedias(v => v + 10), [])
    const [mediaForms, setMediaForms] = useState<Record<number, MediaForm>>({})
    const [files, setFiles] = useState<FileItem[]>([])
    const [treeData, setTreeData] = useState<any[]>([])
    const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
    const [flatTree, setFlatTree] = useState<FlatTree>({map: new Map(), order: [], leaves: []})
    const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
    const [mediaToKeys, setMediaToKeys] = useState<Map<number, Set<string>>>(new Map())

    const nodeDataRef = useRef(nodeData)
    const mediaFormsRef = useRef(mediaForms)
    const initialNodeDataRef = useRef<Map<string, NodeData>>(new Map())
    const initialMediaFormsRef = useRef<Record<number, MediaForm>>({})

    useEffect(() => { nodeDataRef.current = nodeData }, [nodeData])
    useEffect(() => { mediaFormsRef.current = mediaForms }, [mediaForms])

    const hasChanges = useCallback((): boolean => {
        for (const [key, data] of nodeDataRef.current.entries()) {
            if (
                (data.media_no ?? undefined) !== (initialNodeDataRef.current.get(key)?.media_no ?? undefined) ||
                JSON.stringify(data.shared_medias) !== JSON.stringify(initialNodeDataRef.current.get(key)?.shared_medias)
            ) return true
        }
        return JSON.stringify(mediaFormsRef.current) !== JSON.stringify(initialMediaFormsRef.current)
    }, [])

    const setInitialSnapshots = useCallback((nodeSnap: Map<string, NodeData>, mediaSnap: Record<number, MediaForm>) => {
        initialNodeDataRef.current = new Map(nodeSnap)
        initialMediaFormsRef.current = {...mediaSnap}
    }, [])

    const resetSnapshots = useCallback(() => {
        initialNodeDataRef.current = new Map()
        initialMediaFormsRef.current = {}
    }, [])

    const getComputedNodeValue = useCallback((key: string): { media_no: number | undefined; isConsistent: boolean } => {
        const node = flatTree.map.get(key)
        if (!node || node.isLeaf) {
            const data = nodeData.get(key)
            return {media_no: data?.media_no, isConsistent: true}
        }
        const childValues = node.children.map(childKey => getComputedNodeValue(childKey))
        if (childValues.length === 0) return {media_no: undefined, isConsistent: true}
        const firstNo = childValues[0]?.media_no
        const allSame = childValues.every(v => v.media_no === firstNo)
        return allSame ? {media_no: firstNo, isConsistent: true} : {media_no: undefined, isConsistent: false}
    }, [flatTree, nodeData])

    const selectedMedias = useMemo(() => Array.from(mediaToKeys.keys()).sort((a, b) => a - b), [mediaToKeys])
    const getNodeMediaNo = useCallback((key: string) => nodeData.get(key)?.media_no, [nodeData])
    const getNodeShared = useCallback((key: string) => Array.isArray(nodeData.get(key)?.shared_medias), [nodeData])
    const getNodeSharedMedias = useCallback((key: string) => nodeData.get(key)?.shared_medias ?? [], [nodeData])
    const getAllChildrenKeys = useCallback((key: string) => flatTree.order.filter(k => k.startsWith(key + '/')), [flatTree])

    const onToggleShared = useCallback((key: string, shared: boolean) => {
        const nodes = [key, ...getAllChildrenKeys(key)]
        const newMap = new Map(nodeData)
        const newMtK = new Map(mediaToKeys)
        nodes.forEach(k => {
            const cur = newMap.get(k) || {}
            if (shared) {
                const medias = cur.media_no !== undefined ? [cur.media_no] : []
                newMap.set(k, {...cur, shared_medias: medias, media_no: undefined})
                if (cur.media_no !== undefined) {
                    newMtK.get(cur.media_no)?.delete(k)
                    if (newMtK.get(cur.media_no)?.size === 0) newMtK.delete(cur.media_no)
                }
                medias.forEach(m => { if (!newMtK.has(m)) newMtK.set(m, new Set()); newMtK.get(m)!.add(k) })
            } else {
                const olds = cur.shared_medias ?? []
                const first = olds[0]
                newMap.set(k, {...cur, media_no: first, shared_medias: undefined})
                olds.forEach(m => { newMtK.get(m)?.delete(k); if (newMtK.get(m)?.size === 0) newMtK.delete(m) })
                if (first !== undefined) { if (!newMtK.has(first)) newMtK.set(first, new Set()); newMtK.get(first)!.add(k) }
            }
        })
        setNodeData(newMap)
        setMediaToKeys(newMtK)
    }, [getAllChildrenKeys, nodeData, mediaToKeys])

    const onSharedMediaChange = useCallback((key: string, medias: number[]) => {
        const nodes = [key, ...getAllChildrenKeys(key)]
        const newMap = new Map(nodeData)
        const newMtK = new Map(mediaToKeys)
        nodes.forEach(k => {
            const cur = newMap.get(k) || {}
            const olds = cur.shared_medias ?? []
            newMap.set(k, {...cur, shared_medias: medias, media_no: undefined})
            olds.forEach(m => { newMtK.get(m)?.delete(k); if (newMtK.get(m)?.size === 0) newMtK.delete(m) })
            medias.forEach(m => { if (!newMtK.has(m)) newMtK.set(m, new Set()); newMtK.get(m)!.add(k) })
        })
        setNodeData(newMap)
        setMediaToKeys(newMtK)
    }, [getAllChildrenKeys, nodeData, mediaToKeys])

    const onMediaNoChange = useCallback((key: string, mediaNo: number | null) => {
        const no = mediaNo ?? undefined
        const oldNo = nodeData.get(key)?.media_no
        const nodes = [key, ...getAllChildrenKeys(key)]
        const newMap = new Map(nodeData)
        nodes.forEach(k => newMap.set(k, {...(newMap.get(k) || {}), media_no: no}))
        setNodeData(newMap)
        const newMtK = new Map(mediaToKeys)
        nodes.forEach(k => {
            if (no !== undefined) { if (!newMtK.has(no)) newMtK.set(no, new Set()); newMtK.get(no)!.add(k) }
            if (oldNo !== undefined && oldNo !== no) { newMtK.get(oldNo)?.delete(k); if (newMtK.get(oldNo)?.size === 0) newMtK.delete(oldNo) }
        })
        setMediaToKeys(newMtK)
    }, [getAllChildrenKeys, nodeData, mediaToKeys])

    const resetMediaAssignments = useCallback(() => {
        setNodeData(prev => { const m = new Map(prev); m.forEach((d, k) => m.set(k, {files: d.files})); return m })
        setMediaToKeys(new Map())
    }, [])

    const deleteMedia = useCallback((mediaNo: number) => {
        setMediaForms(prev => { const n = {...prev}; delete n[mediaNo]; return n })
        setNodeData(prev => {
            const m = new Map(prev)
            m.forEach((d, k) => {
                if (d.media_no === mediaNo) {
                    m.set(k, {...d, media_no: undefined})
                } else if (d.shared_medias?.includes(mediaNo)) {
                    const filtered = d.shared_medias.filter(x => x !== mediaNo)
                    m.set(k, {...d, shared_medias: filtered.length > 0 ? filtered : undefined, media_no: filtered.length === 1 ? filtered[0] : d.media_no})
                }
            })
            return m
        })
        setMediaToKeys(prev => { const n = new Map(prev); n.delete(mediaNo); return n })
    }, [])

    const updateMediaForm = useCallback((no: number, form: MediaForm) =>
        setMediaForms(prev => ({...prev, [no]: {...form}})), [])

    const resetAll = useCallback(() => {
        resetSnapshots()
        setMediaForms({}); setFiles([]); setTreeData([]); setNodeData(new Map())
        setFlatTree({map: new Map(), order: [], leaves: []}); setDefaultExpandedKeys([]); setMediaToKeys(new Map())
    }, [resetSnapshots])

    const open = useCallback(async (volumeId: string, volumeNo?: number, catalogNo?: string) => {
        setVolumeInfo({volumeId, volumeNo, catalogNo})
        setLoading(true)
        resetAll()
        try {
            const filesResult = await fetchApi<FileItem[]>(`/api/volumes/${volumeId}/files`)
            let loadedFiles: FileItem[] = []
            if (filesResult?.success && filesResult.data) loadedFiles = filesResult.data
            if (loadedFiles.length === 0) { setLoading(false); return }
            setFiles(loadedFiles)
            const {treeData: td, nodeData: nd, fileToKeyMap, flatTree: ft, defaultExpandedKeys: ek} = buildTree(loadedFiles)
            setTreeData(td); setNodeData(nd); setFlatTree(ft); setDefaultExpandedKeys(ek)

            let snapNodeData = nd
            let snapMediaForms: Record<number, MediaForm> = {}
            const mediaResult = await fetchApi<Media[]>(`/api/volumes/${volumeId}/medias`)
            if (mediaResult?.success && mediaResult.data) {
                const medias = mediaResult.data
                if (medias.length > 0) {
                    const newMediaForms: Record<number, MediaForm> = {}
                    const fileToMediaMap = new Map<string, number[]>()
                    medias.forEach(m => {
                        newMediaForms[m.media_no] = {media_type: m.media_type, content_title: m.content_title || '', description: m.description || ''}
                        m.file_ids?.forEach(fid => { if (!fileToMediaMap.has(fid)) fileToMediaMap.set(fid, []); fileToMediaMap.get(fid)!.push(m.media_no) })
                    })
                    setMediaForms(newMediaForms)
                    const newND = new Map(nd)
                    const newMtK = new Map<number, Set<string>>()
                    fileToKeyMap.forEach((key, fid) => {
                        const mediaNos = fileToMediaMap.get(fid)
                        if (!mediaNos?.length) return
                        const ex = newND.get(key) || {}
                        if (mediaNos.length === 1) {
                            newND.set(key, {...ex, media_no: mediaNos[0], shared_medias: undefined})
                            if (!newMtK.has(mediaNos[0])) newMtK.set(mediaNos[0], new Set())
                            newMtK.get(mediaNos[0])!.add(key)
                        } else {
                            newND.set(key, {...ex, media_no: undefined, shared_medias: mediaNos})
                            mediaNos.forEach(m => { if (!newMtK.has(m)) newMtK.set(m, new Set()); newMtK.get(m)!.add(key) })
                        }
                    })
                    const sorted = Array.from(ft.order).sort((a, b) => (ft.map.get(b)?.depth ?? 0) - (ft.map.get(a)?.depth ?? 0))
                    sorted.forEach(key => {
                        const np = ft.map.get(key)
                        if (!np || np.isLeaf || np.children.length === 0) return
                        const sets: Set<number>[] = []
                        let allHave = true
                        np.children.forEach(ck => {
                            const cd = newND.get(ck)
                            if (cd?.shared_medias?.length) cd.shared_medias.forEach(m => sets.push(new Set([m])))
                            else if (cd?.media_no !== undefined) sets.push(new Set([cd.media_no]))
                            else allHave = false
                        })
                        if (!allHave || sets.length === 0) return
                        const inter = sets.reduce((acc, s) => new Set([...acc].filter(v => s.has(v))))
                        if (inter.size === 0) return
                        const ex = newND.get(key) || {}
                        if (inter.size === 1) {
                            const vn = inter.values().next().value as number
                            newND.set(key, {...ex, media_no: vn, shared_medias: undefined})
                            if (!newMtK.has(vn)) newMtK.set(vn, new Set()); newMtK.get(vn)!.add(key)
                        } else {
                            const sv = Array.from(inter)
                            newND.set(key, {...ex, media_no: undefined, shared_medias: sv})
                            sv.forEach(v => { if (!newMtK.has(v)) newMtK.set(v, new Set()); newMtK.get(v)!.add(key) })
                        }
                    })
                    setNodeData(newND); setMediaToKeys(newMtK)
                    snapNodeData = newND; snapMediaForms = newMediaForms
                }
            }
            setInitialSnapshots(snapNodeData, snapMediaForms)
        } catch (err) {
            console.error('加载数据失败:', err)
        } finally {
            setLoading(false)
        }
    }, [resetAll, setInitialSnapshots])

    const handleSubmit = useCallback(async (): Promise<boolean> => {
        if (volumeInfo == null) return false
        setSaving(true)
        try {
            const mediaMap: Record<number, string[]> = {}
            selectedMedias.forEach(m => { mediaMap[m] = [] })
            nodeData.forEach(data => {
                if (!data.files?.length) return
                const medias: number[] = []
                if (data.media_no !== undefined) medias.push(data.media_no)
                if (data.shared_medias?.length) medias.push(...data.shared_medias)
                medias.forEach(m => {
                    if (!mediaMap[m]) mediaMap[m] = []
                    data.files!.forEach(fid => { if (!mediaMap[m].includes(fid)) mediaMap[m].push(fid) })
                })
            })
            const result = await postApi('/api/volumes/' + volumeInfo.volumeId + '/medias', {
                medias: selectedMedias.map(m => ({
                    media_no: m,
                    media_type: mediaForms[m]?.media_type || 'bd',
                    content_title: mediaForms[m]?.content_title || '',
                    description: mediaForms[m]?.description || '',
                    files: mediaMap[m] || [],
                })),
            })
            if (!result?.success) { enqueueSnackbar(result?.error || '保存失败', {variant: 'error'}); return false }
            enqueueSnackbar('保存成功', {variant: 'success'})
            onSave?.()
            return true
        } catch (err) {
            console.error('保存失败:', err)
            enqueueSnackbar('保存失败', {variant: 'error'})
            return false
        } finally {
            setSaving(false)
        }
    }, [volumeInfo, selectedMedias, mediaForms, nodeData, onSave, enqueueSnackbar])

    return {
        loading, saving, volumeInfo, files, treeData, nodeData, defaultExpandedKeys,
        selectedMedias, visibleMedias, loadMoreMedias, mediaForms,
        open, handleSubmit, hasChanges,
        onMediaNoChange, onSharedMediaChange, onToggleShared,
        getNodeMediaNo, getNodeShared, getNodeSharedMedias, getComputedNodeValue,
        updateMediaForm, resetMediaAssignments, deleteMedia,
    }
}

// ─── MediaFormList ───────────────────────────────────────────────────────────

interface MediaFormListProps {
    selectedMedias: number[]
    mediaForms: Record<number, MediaForm>
    onMediaFormChange: (no: number, form: MediaForm) => void
    onDeleteMedia: (no: number) => void
}

function MediaRow({no, mediaForms, onMediaFormChange, onDeleteMedia}: {
    no: number
    mediaForms: Record<number, MediaForm>
    onMediaFormChange: (no: number, form: MediaForm) => void
    onDeleteMedia: (no: number) => void
}) {
    const form = mediaForms[no] || {media_type: 'bd', content_title: '', description: ''}
    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <Typography variant="body2" fontWeight={600} sx={{minWidth: 60}}>媒介 {no}</Typography>
            <FormControl size="small" sx={{width: 100}}>
                <InputLabel>类型</InputLabel>
                <Select<MediaType>
                    value={form.media_type}
                    onChange={e => onMediaFormChange(no, {...form, media_type: e.target.value as MediaType})}
                    label="类型"
                >
                    {MEDIA_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
            </FormControl>
            <TextField
                value={form.content_title}
                onChange={e => onMediaFormChange(no, {...form, content_title: e.target.value})}
                label="内容"
                size="small"
                sx={{width: 300}}
            />
            <TextField
                value={form.description}
                onChange={e => onMediaFormChange(no, {...form, description: e.target.value})}
                label="说明"
                size="small"
                sx={{width: 400}}
            />
            <IconButton size="small" color="error" onClick={() => onDeleteMedia(no)}>
                <DeleteOutlineIcon fontSize="small"/>
            </IconButton>
        </Box>
    )
}

function MediaFormList({selectedMedias, mediaForms, onMediaFormChange, onDeleteMedia}: MediaFormListProps) {
    if (selectedMedias.length === 0) return null
    return (
        <Card variant="outlined">
            <CardHeader title="媒介信息" titleTypographyProps={{variant: 'body2', fontWeight: 600}} sx={{py: 1, px: 1.5}}/>
            <CardContent sx={{pt: 0, pb: '8px !important', px: 1.5, display: 'flex', flexDirection: 'column', gap: 1}}>
                {selectedMedias.map(no => (
                    <MediaRow key={no} no={no} mediaForms={mediaForms} onMediaFormChange={onMediaFormChange} onDeleteMedia={onDeleteMedia}/>
                ))}
            </CardContent>
        </Card>
    )
}

// ─── MediaEditor isMixed 计算 ──────────────────────────────────────────────────

function makeMediaComputeIsMixed(
    getComputedNodeValue: (key: string) => { media_no: number | undefined; isConsistent: boolean },
) {
    return (leafKeys: string[], isLeaf: boolean): boolean => {
        if (isLeaf) return false
        const values = leafKeys.map(k => getComputedNodeValue(k).media_no)
        const anySet = values.some(v => v !== undefined)
        return anySet && !values.every(v => v === values[0])
    }
}

// ─── MediaEditorContent ──────────────────────────────────────────────────────

export function MediaEditorContent({
                                       loading, saving, files, treeData, nodeData, defaultExpandedKeys,
                                       selectedMedias, visibleMedias, loadMoreMedias, mediaForms,
                                       onMediaNoChange, onSharedMediaChange, onToggleShared,
                                       getNodeMediaNo, getNodeShared, getNodeSharedMedias, getComputedNodeValue,
                                       updateMediaForm, resetMediaAssignments, deleteMedia,
                                   }: MediaEditorContentProps) {
    const nodeContentProps = useMemo<Omit<EditorTreeNodeProps, 'title' | 'nodeKey' | 'isLeaf' | 'isMixed'>>(() => ({
        formatValue: (v: number) => `媒介 ${v}`,
        visibleCount: visibleMedias,
        onLoadMore: loadMoreMedias,
        getSingleValue: getNodeMediaNo,
        getIsShared: getNodeShared,
        getSharedValues: getNodeSharedMedias,
        onSingleChange: onMediaNoChange,
        onSharedChange: onSharedMediaChange,
        onToggleShared,
    }), [visibleMedias, loadMoreMedias, getNodeMediaNo, getNodeShared, getNodeSharedMedias, onMediaNoChange, onSharedMediaChange, onToggleShared])

    const computeIsMixed = useMemo(
        () => makeMediaComputeIsMixed(getComputedNodeValue),
        [getComputedNodeValue],
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
                    <SimpleTreeView defaultExpandedItems={defaultExpandedKeys}>
                        {renderEditorTreeNodes(treeData, nodeContentProps, computeIsMixed)}
                    </SimpleTreeView>
                ) : (
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, color: 'text.disabled'}}>
                        <InboxIcon sx={{fontSize: 48, mb: 1}}/>
                        <Typography>暂无文件数据</Typography>
                    </Box>
                )}
            </CardContent>
            {selectedMedias.length > 0 && (
                <CardContent sx={{pt: 1, px: 2, pb: '8px !important'}}>
                    <MediaFormList
                        selectedMedias={selectedMedias}
                        mediaForms={mediaForms}
                        onMediaFormChange={updateMediaForm}
                        onDeleteMedia={deleteMedia}
                    />
                </CardContent>
            )}
        </Card>
    )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type {UseMediaEditorReturn}
export default MediaEditorContent
