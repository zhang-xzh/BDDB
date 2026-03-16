'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState,} from 'react'
import type {FileItem, Media, MediaForm, MediaType, NodeData} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree, FlatTree} from '@/lib/utils'
import {Button, Card, HTMLSelect, InputGroup, Intent, Spinner, Tree} from '@blueprintjs/core'
import type {TreeNodeInfo} from '@blueprintjs/core'
import {showToast} from '@/lib/toaster'
import {buildEditorTreeNodes} from '@/components/EditorTreeNode'
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
    submitted: boolean
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
    handleSubmit: () => Promise<boolean>
}

interface UseMediaEditorReturn {
    loading: boolean
    saving: boolean
    submitted: boolean
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
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
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
        setSubmitted(true)
        // 验证所有媒介都有内容标题
        const hasError = selectedMedias.some(m => !mediaForms[m]?.content_title?.trim())
        if (hasError) {
            showToast('请填写所有媒介的内容标题', Intent.DANGER)
            return false
        }
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
            if (!result?.success) { showToast(result?.error || '保存失败', Intent.DANGER); return false }
            showToast('保存成功', Intent.SUCCESS)
            onSave?.()
            return true
        } catch (err) {
            console.error('保存失败:', err)
            showToast('保存失败', Intent.DANGER)
            return false
        } finally {
            setSaving(false)
        }
    }, [volumeInfo, selectedMedias, mediaForms, nodeData, onSave])

    return {
        loading, saving, submitted, volumeInfo, files, treeData, nodeData, defaultExpandedKeys,
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
    submitted?: boolean
    onSubmit?: () => Promise<boolean>
}

const getMediaForm = (
    mediaForms: Record<number, MediaForm>,
    no: number,
): MediaForm => mediaForms[no] || {media_type: 'bd', content_title: '', description: ''}

function MediaRow({no, mediaForms, onMediaFormChange, onDeleteMedia, submitted}: {
    no: number
    mediaForms: Record<number, MediaForm>
    onMediaFormChange: (no: number, form: MediaForm) => void
    onDeleteMedia: (no: number) => void
    submitted?: boolean
}) {
    const form = getMediaForm(mediaForms, no)
    const contentTitleError = submitted && !form.content_title.trim()
    return (
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{minWidth: 60, fontWeight: 600, fontSize: 13}}>媒介 {no}</span>
            <HTMLSelect
                value={form.media_type}
                onChange={e => onMediaFormChange(no, {...form, media_type: e.target.value as MediaType})}
                style={{width: 100}}
            >
                {MEDIA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </HTMLSelect>
            <InputGroup
                value={form.content_title}
                onChange={e => onMediaFormChange(no, {...form, content_title: e.target.value})}
                placeholder="内容"
                style={{width: 300}}
                intent={contentTitleError ? Intent.DANGER : Intent.NONE}
            />
            <InputGroup
                value={form.description}
                onChange={e => onMediaFormChange(no, {...form, description: e.target.value})}
                placeholder="说明"
                style={{width: 400}}
            />
            <Button icon="trash" minimal intent={Intent.DANGER} onClick={() => onDeleteMedia(no)}/>
        </div>
    )
}

// 只读模式：显示媒介信息摘要
function MediaReadOnlyView({
    selectedMedias,
    mediaForms,
    onEdit,
}: {
    selectedMedias: number[]
    mediaForms: Record<number, MediaForm>
    onEdit: () => void
}) {
    return (
        <div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                {selectedMedias.map(no => {
                    const form = getMediaForm(mediaForms, no)
                    const mediaTypeLabel = MEDIA_TYPES.find(t => t.value === form.media_type)?.label || form.media_type
                    return (
                        <div key={no} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                            <span style={{minWidth: 60, fontWeight: 500, fontSize: 13}}>
                                媒介 {no}
                            </span>
                            <span style={{fontSize: 13, color: 'var(--text-secondary, #8a9ba8)'}}>
                                [{mediaTypeLabel}] {form.content_title || '无内容标题'} {form.description ? `- ${form.description}` : ''}
                            </span>
                        </div>
                    )
                })}
            </div>
            <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--divider, #30404d)'}}>
                <Button icon="edit" outlined small onClick={onEdit}>编辑媒介信息</Button>
            </div>
        </div>
    )
}

function MediaFormList({selectedMedias, mediaForms, onMediaFormChange, onDeleteMedia, submitted, onSubmit}: MediaFormListProps) {
    // 检查是否有媒介缺少内容标题
    const hasEmptyMedia = useMemo(() => {
        return selectedMedias.some(no => {
            const form = getMediaForm(mediaForms, no)
            return !form.content_title.trim()
        })
    }, [selectedMedias, mediaForms])

    const [isEditing, setIsEditing] = useState(false)
    const initializedRef = useRef(false)

    // 初始化时，如果有空数据则默认进入编辑模式（只在挂载时执行一次）
    useEffect(() => {
        if (!initializedRef.current && hasEmptyMedia) {
            initializedRef.current = true
            setIsEditing(true)
        }
    }, [hasEmptyMedia])

    const handleEdit = useCallback(() => {
        setIsEditing(true)
    }, [])

    const handleCancel = useCallback(() => {
        setIsEditing(false)
    }, [])

    const handleSave = useCallback(async () => {
        if (onSubmit) {
            const success = await onSubmit()
            if (success) {
                setIsEditing(false)
            }
        } else {
            setIsEditing(false)
        }
    }, [onSubmit])

    if (selectedMedias.length === 0) return null

    return (
        <Card style={{padding: 12}}>
            <div style={{fontWeight: 600, fontSize: 13, marginBottom: 8}}>媒介信息</div>
            {isEditing ? (
                <div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                        {selectedMedias.map(no => (
                            <MediaRow
                                key={no}
                                no={no}
                                mediaForms={mediaForms}
                                onMediaFormChange={onMediaFormChange}
                                onDeleteMedia={onDeleteMedia}
                                submitted={submitted}
                            />
                        ))}
                    </div>
                    <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--divider, #30404d)', display: 'flex', gap: 8}}>
                        <Button icon="cross" minimal onClick={handleCancel}>取消</Button>
                        <Button icon="floppy-disk" intent={Intent.PRIMARY} onClick={handleSave}>保存</Button>
                    </div>
                </div>
            ) : (
                <MediaReadOnlyView
                    selectedMedias={selectedMedias}
                    mediaForms={mediaForms}
                    onEdit={handleEdit}
                />
            )}
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

// ─── Tree expansion helper ───────────────────────────────────────────────────

function applyExpansion(nodes: TreeNodeInfo[], expanded: Set<string>): TreeNodeInfo[] {
    return nodes.map(n => ({
        ...n,
        isExpanded: expanded.has(String(n.id)),
        childNodes: n.childNodes ? applyExpansion(n.childNodes, expanded) : undefined,
    }))
}

// ─── MediaEditorContent ──────────────────────────────────────────────────────

export function MediaEditorContent({
                                       loading, saving, submitted, files, treeData, nodeData, defaultExpandedKeys,
                                       selectedMedias, visibleMedias, loadMoreMedias, mediaForms,
                                       onMediaNoChange, onSharedMediaChange, onToggleShared,
                                       getNodeMediaNo, getNodeShared, getNodeSharedMedias, getComputedNodeValue,
                                       updateMediaForm, resetMediaAssignments, deleteMedia, handleSubmit,
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

    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(defaultExpandedKeys))

    useEffect(() => {
        setExpandedNodes(new Set(defaultExpandedKeys))
    }, [defaultExpandedKeys])

    const treeNodes = useMemo(
        () => buildEditorTreeNodes(treeData, nodeContentProps, computeIsMixed),
        [treeData, nodeContentProps, computeIsMixed],
    )

    const displayNodes = useMemo(
        () => applyExpansion(treeNodes, expandedNodes),
        [treeNodes, expandedNodes],
    )

    return (
        <Card style={{position: 'relative', margin: '4px 16px 16px 16px', padding: 16}}>
            {loading && (
                <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'var(--overlay-bg)'}}>
                    <Spinner/>
                </div>
            )}
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8}}>
                <span style={{fontWeight: 600, fontSize: 14}}>文件列表</span>
                <span style={{fontSize: 13, color: 'var(--text-secondary, #8a9ba8)'}}>{files.length} 个文件</span>
            </div>
            <div>
                {files.length > 0 ? (
                    <Tree
                        contents={displayNodes}
                        onNodeExpand={n => setExpandedNodes(p => new Set(p).add(String(n.id)))}
                        onNodeCollapse={n => { const s = new Set(expandedNodes); s.delete(String(n.id)); setExpandedNodes(s) }}
                    />
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: 'var(--text-disabled, #5c7080)'}}>
                        <span className="bp6-icon bp6-icon-inbox" style={{fontSize: 48, marginBottom: 8}}/>
                        <span>暂无文件数据</span>
                    </div>
                )}
            </div>
            {selectedMedias.length > 0 && (
                <div style={{marginTop: 8}}>
                    <MediaFormList
                        selectedMedias={selectedMedias}
                        mediaForms={mediaForms}
                        onMediaFormChange={updateMediaForm}
                        onDeleteMedia={deleteMedia}
                        submitted={submitted}
                        onSubmit={handleSubmit}
                    />
                </div>
            )}
        </Card>
    )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type {UseMediaEditorReturn}
export default MediaEditorContent
