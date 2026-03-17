'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState,} from 'react'
import type {FileItem, Media, MediaForm, MediaType, NodeData} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree, FlatTree, SPACING} from '@/lib/utils'
import {Button, Card, Empty, Flex, Input, message, Select, Space, Spin, Switch, Typography,} from 'antd'
import {FileTreeCard} from '@/components/EditorShared'
import {DeleteOutlined, EditOutlined, SaveOutlined} from '@ant-design/icons'
import type {DataNode} from 'antd/es/tree'

// ─── Types ────────────────────────────────────────────────────────────────────

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
    handleSubmit?: () => boolean | Promise<boolean>
    hasChanges?: () => boolean
    isChanged?: boolean
    submitted?: boolean
    resetSubmitted?: () => void
    cancelChanges?: () => boolean
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
    isChanged: boolean
    submitted: boolean
    resetSubmitted: () => void
    cancelChanges: () => boolean
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

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
    {value: 'bd', label: 'BD'},
    {value: 'dvd', label: 'DVD'},
    {value: 'cd', label: 'CD'},
    {value: 'scan', label: '扫图'},
]

const getMediaTypeLabel = (type: MediaType | undefined) =>
    MEDIA_TYPES.find(item => item.value === type)?.label || '未设置'

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

    useEffect(() => {
        nodeDataRef.current = nodeData
    }, [nodeData])

    useEffect(() => {
        mediaFormsRef.current = mediaForms
    }, [mediaForms])

    const hasChanges = useCallback((): boolean => {
        for (const [key, data] of nodeDataRef.current.entries()) {
            if (
                (data.media_no ?? undefined) !== (initialNodeDataRef.current.get(key)?.media_no ?? undefined) ||
                JSON.stringify(data.shared_medias) !== JSON.stringify(initialNodeDataRef.current.get(key)?.shared_medias)
            )
                return true
        }
        return JSON.stringify(mediaFormsRef.current) !== JSON.stringify(initialMediaFormsRef.current)
    }, [])

    const isChanged = useMemo((): boolean => {
        for (const [key, data] of nodeData.entries()) {
            if (
                (data.media_no ?? undefined) !== (initialNodeDataRef.current.get(key)?.media_no ?? undefined) ||
                JSON.stringify(data.shared_medias) !== JSON.stringify(initialNodeDataRef.current.get(key)?.shared_medias)
            )
                return true
        }
        return JSON.stringify(mediaForms) !== JSON.stringify(initialMediaFormsRef.current)
    }, [nodeData, mediaForms])

    const setInitialSnapshots = useCallback((nodeSnap: Map<string, NodeData>, mediaSnap: Record<number, MediaForm>) => {
        initialNodeDataRef.current = new Map(nodeSnap)
        initialMediaFormsRef.current = {...mediaSnap}
    }, [])

    const resetSnapshots = useCallback(() => {
        initialNodeDataRef.current = new Map()
        initialMediaFormsRef.current = {}
    }, [])

    const getComputedNodeValue = useCallback((key: string): {
        media_no: number | undefined
        isConsistent: boolean
    } => {
        const node = flatTree.map.get(key)
        if (!node || node.isLeaf) {
            const data = nodeData.get(key)
            return {
                media_no: data?.media_no,
                isConsistent: true,
            }
        }

        const childValues = node.children.map(childKey => getComputedNodeValue(childKey))
        if (childValues.length === 0) {
            return {media_no: undefined, isConsistent: true}
        }

        const firstNo = childValues[0]?.media_no
        const allSame = childValues.every(v => v.media_no === firstNo)

        if (allSame) {
            return {media_no: firstNo, isConsistent: true}
        } else {
            return {media_no: undefined, isConsistent: false}
        }
    }, [flatTree, nodeData])

    const selectedMedias = useMemo(() => Array.from(mediaToKeys.keys()).sort((a, b) => a - b), [mediaToKeys])

    const getNodeMediaNo = useCallback((key: string) => nodeData.get(key)?.media_no, [nodeData])
    const getNodeShared = useCallback((key: string) => Array.isArray(nodeData.get(key)?.shared_medias), [nodeData])
    const getNodeSharedMedias = useCallback(
        (key: string) => nodeData.get(key)?.shared_medias ?? [],
        [nodeData]
    )

    const getAllChildrenKeys = useCallback((key: string) =>
        flatTree.order.filter(k => k.startsWith(key + '/')), [flatTree])

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
                medias.forEach(m => {
                    if (!newMtK.has(m)) newMtK.set(m, new Set())
                    newMtK.get(m)!.add(k)
                })
            } else {
                const olds = cur.shared_medias ?? []
                const first = olds[0]
                newMap.set(k, {...cur, media_no: first, shared_medias: undefined})
                olds.forEach(m => {
                    newMtK.get(m)?.delete(k)
                    if (newMtK.get(m)?.size === 0) newMtK.delete(m)
                })
                if (first !== undefined) {
                    if (!newMtK.has(first)) newMtK.set(first, new Set())
                    newMtK.get(first)!.add(k)
                }
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
            olds.forEach(m => {
                newMtK.get(m)?.delete(k)
                if (newMtK.get(m)?.size === 0) newMtK.delete(m)
            })
            medias.forEach(m => {
                if (!newMtK.has(m)) newMtK.set(m, new Set())
                newMtK.get(m)!.add(k)
            })
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
            if (no !== undefined) {
                if (!newMtK.has(no)) newMtK.set(no, new Set())
                newMtK.get(no)!.add(k)
            }
            if (oldNo !== undefined && oldNo !== no) {
                newMtK.get(oldNo)?.delete(k)
                if (newMtK.get(oldNo)?.size === 0) newMtK.delete(oldNo)
            }
        })
        setMediaToKeys(newMtK)
    }, [getAllChildrenKeys, nodeData, mediaToKeys])

    const resetMediaAssignments = useCallback(() => {
        setNodeData(prev => {
            const m = new Map(prev)
            m.forEach((d, k) => m.set(k, {files: d.files}))
            return m
        })
        setMediaToKeys(new Map())
    }, [])

    const deleteMedia = useCallback((mediaNo: number) => {
        setMediaForms(prev => {
            const n = {...prev}
            delete n[mediaNo]
            return n
        })
        setNodeData(prev => {
            const m = new Map(prev)
            m.forEach((d, k) => {
                if (d.media_no === mediaNo) {
                    m.set(k, {...d, media_no: undefined})
                } else if (d.shared_medias?.includes(mediaNo)) {
                    const filtered = d.shared_medias.filter(m => m !== mediaNo)
                    m.set(k, {
                        ...d,
                        shared_medias: filtered.length > 0 ? filtered : undefined,
                        media_no: filtered.length === 1 ? filtered[0] : d.media_no,
                    })
                }
            })
            return m
        })
        setMediaToKeys(prev => {
            const n = new Map(prev)
            n.delete(mediaNo)
            return n
        })
    }, [])

    const updateMediaForm = useCallback((no: number, form: MediaForm) =>
        setMediaForms(prev => ({...prev, [no]: {...form}})), [])

    const resetAll = useCallback(() => {
        resetSnapshots()
        setMediaForms({})
        setFiles([])
        setTreeData([])
        setNodeData(new Map())
        setFlatTree({map: new Map(), order: [], leaves: []})
        setDefaultExpandedKeys([])
        setMediaToKeys(new Map())
    }, [resetSnapshots])

    const open = useCallback(async (volumeId: string, volumeNo?: number, catalogNo?: string) => {
        setVolumeInfo({volumeId, volumeNo, catalogNo})
        setLoading(true)
        resetAll()

        try {
            const filesResult = await fetchApi<FileItem[]>(`/api/volumes/${volumeId}/files`)
            let loadedFiles: FileItem[] = []
            if (filesResult?.success && filesResult.data) {
                loadedFiles = filesResult.data
            }

            if (loadedFiles.length === 0) {
                setLoading(false)
                return
            }

            setFiles(loadedFiles)
            const {treeData: td, nodeData: nd, fileToKeyMap, flatTree: ft, defaultExpandedKeys: ek} = buildTree(loadedFiles)
            setTreeData(td)
            setNodeData(nd)
            setFlatTree(ft)
            setDefaultExpandedKeys(ek)

            let snapNodeData = nd
            let snapMediaForms: Record<number, MediaForm> = {}

            const mediaResult = await fetchApi<Media[]>(`/api/volumes/${volumeId}/medias`)
            if (mediaResult?.success && mediaResult.data) {
                const medias = mediaResult.data
                if (medias.length > 0) {
                    const newMediaForms: Record<number, MediaForm> = {}
                    const fileToMediaMap = new Map<string, number[]>()

                    medias.forEach(m => {
                        newMediaForms[m.media_no] = {
                            media_type: m.media_type,
                            content_title: m.content_title || '',
                            description: m.description || '',
                        }
                        m.file_ids?.forEach(fid => {
                            if (!fileToMediaMap.has(fid)) fileToMediaMap.set(fid, [])
                            fileToMediaMap.get(fid)!.push(m.media_no)
                        })
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
                            mediaNos.forEach(m => {
                                if (!newMtK.has(m)) newMtK.set(m, new Set())
                                newMtK.get(m)!.add(key)
                            })
                        }
                    })

                    // Propagate to parent folders
                    const sorted = Array.from(ft.order).sort(
                        (a, b) => (ft.map.get(b)?.depth ?? 0) - (ft.map.get(a)?.depth ?? 0)
                    )
                    sorted.forEach(key => {
                        const np = ft.map.get(key)
                        if (!np || np.isLeaf || np.children.length === 0) return
                        const sets: Set<number>[] = []
                        let allHave = true
                        np.children.forEach(ck => {
                            const cd = newND.get(ck)
                            if (cd?.shared_medias?.length) {
                                cd.shared_medias.forEach(m => sets.push(new Set([m])))
                            } else if (cd?.media_no !== undefined) {
                                sets.push(new Set([cd.media_no]))
                            } else {
                                allHave = false
                            }
                        })
                        if (!allHave || sets.length === 0) return
                        const inter = sets.reduce((acc, s) => new Set([...acc].filter(v => s.has(v))))
                        if (inter.size === 0) return
                        const ex = newND.get(key) || {}
                        if (inter.size === 1) {
                            const vn = inter.values().next().value as number
                            newND.set(key, {...ex, media_no: vn, shared_medias: undefined})
                            if (!newMtK.has(vn)) newMtK.set(vn, new Set())
                            newMtK.get(vn)!.add(key)
                        } else {
                            const sv = Array.from(inter)
                            newND.set(key, {...ex, media_no: undefined, shared_medias: sv})
                            sv.forEach(v => {
                                if (!newMtK.has(v)) newMtK.set(v, new Set())
                                newMtK.get(v)!.add(key)
                            })
                        }
                    })

                    setNodeData(newND)
                    setMediaToKeys(newMtK)
                    snapNodeData = newND
                    snapMediaForms = newMediaForms
                }
            }
            setInitialSnapshots(snapNodeData, snapMediaForms)
        } catch (err) {
            console.error('加载数据失败:', err)
        } finally {
            setLoading(false)
        }
    }, [resetAll, setInitialSnapshots])

    const resetSubmitted = useCallback(() => setSubmitted(false), [])

    const cancelChanges = useCallback((): boolean => {
        const nd = new Map(initialNodeDataRef.current)
        const mf = {...initialMediaFormsRef.current}
        const mtk = new Map<number, Set<string>>()
        nd.forEach((data, key) => {
            if (data.media_no !== undefined) {
                if (!mtk.has(data.media_no)) mtk.set(data.media_no, new Set())
                mtk.get(data.media_no)!.add(key)
            }
            data.shared_medias?.forEach(mno => {
                if (!mtk.has(mno)) mtk.set(mno, new Set())
                mtk.get(mno)!.add(key)
            })
        })
        setNodeData(nd)
        setMediaForms(mf)
        setMediaToKeys(mtk)
        setSubmitted(false)
        return Object.keys(mf).length > 0
    }, [])

    const handleSubmit = useCallback(async (): Promise<boolean> => {
        if (volumeInfo == null) return false
        setSubmitted(true)
        const hasError = selectedMedias.some(m => !mediaForms[m]?.content_title?.trim())
        if (hasError) {
            message.error('请填写每个媒介的内容标题')
            return false
        }
        setSaving(true)
        try {
            const mediaMap: Record<number, string[]> = {}
            selectedMedias.forEach(m => {
                mediaMap[m] = []
            })

            nodeData.forEach(data => {
                if (!data.files?.length) return
                const medias: number[] = []
                if (data.media_no !== undefined) medias.push(data.media_no)
                if (data.shared_medias?.length) medias.push(...data.shared_medias)
                medias.forEach(m => {
                    if (!mediaMap[m]) mediaMap[m] = []
                    data.files!.forEach(fid => {
                        if (!mediaMap[m].includes(fid)) mediaMap[m].push(fid)
                    })
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

            if (!result?.success) {
                message.error(result?.error || '保存失败')
                return false
            }
            message.success('保存成功')
            setSubmitted(false)
            onSave?.()
            return true
        } catch (err) {
            console.error('保存失败:', err)
            message.error('保存失败')
            return false
        } finally {
            setSaving(false)
        }
    }, [volumeInfo, selectedMedias, mediaForms, nodeData, onSave])

    return {
        loading, saving, volumeInfo, files, treeData, nodeData, defaultExpandedKeys,
        selectedMedias, visibleMedias, loadMoreMedias, mediaForms,
        open, handleSubmit, hasChanges, isChanged, submitted, resetSubmitted, cancelChanges,
        onMediaNoChange, onSharedMediaChange, onToggleShared,
        getNodeMediaNo, getNodeShared, getNodeSharedMedias, getComputedNodeValue,
        updateMediaForm, resetMediaAssignments, deleteMedia,
    }
}

// ─── MediaFormList ────────────────────────────────────────────────────────────

interface MediaFormListProps {
    selectedMedias: number[]
    mediaForms: Record<number, MediaForm>
    onMediaFormChange: (no: number, form: MediaForm) => void
    onDeleteMedia: (no: number) => void
    onCancelEdit?: () => void
    onSaveEdit?: () => void
    saving?: boolean
    isChanged?: boolean
    submitted?: boolean
}

function MediaRow({
                      no,
                      mediaForms,
                      onMediaFormChange,
                      onDeleteMedia,
                      submitted,
                  }: {
    no: number
    mediaForms: Record<number, MediaForm>
    onMediaFormChange: (no: number, form: MediaForm) => void
    onDeleteMedia: (no: number) => void
    submitted?: boolean
}) {
    const form = mediaForms[no] || {media_type: 'bd', content_title: '', description: ''}
    const titleError = submitted && !form.content_title?.trim()
    return (
        <Space>
            <Typography.Text strong style={{minWidth: 60, display: 'inline-block'}}>
                序号 {no}
            </Typography.Text>
            <Select
                value={form.media_type}
                onChange={val => onMediaFormChange(no, {...form, media_type: val})}
                options={MEDIA_TYPES}
                style={{width: 100}}
            />
            <Input
                value={form.content_title}
                onChange={e => onMediaFormChange(no, {...form, content_title: e.target.value})}
                placeholder="内容"
                style={{width: 300}}
                status={titleError ? 'error' : undefined}
            />
            <Input
                value={form.description}
                onChange={e => onMediaFormChange(no, {...form, description: e.target.value})}
                placeholder="说明"
                style={{width: 400}}
            />
            <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined/>}
                onClick={() => onDeleteMedia(no)}
            />
        </Space>
    )
}

function MediaFormList({
                           selectedMedias,
                           mediaForms,
                           onMediaFormChange,
                           onDeleteMedia,
                           onCancelEdit,
                           onSaveEdit,
                           saving = false,
                           isChanged = true,
                           submitted,
                       }: MediaFormListProps) {
    if (selectedMedias.length === 0) return null

    const actions = (onCancelEdit || onSaveEdit) ? (
        <Flex gap={8}>
            {onCancelEdit && (
                <Button onClick={onCancelEdit} disabled={saving}>取消</Button>
            )}
            {onSaveEdit && (
                <Button type="primary" icon={<SaveOutlined/>} onClick={onSaveEdit} disabled={!isChanged || saving} loading={saving}>
                    保存
                </Button>
            )}
        </Flex>
    ) : null

    return (
        <Card size="small" title="媒介信息" styles={{body: {padding: 12}}}>
            <Space direction="vertical" style={{width: '100%'}} size={12}>
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
                {actions}
            </Space>
        </Card>
    )
}

function MediaReadOnlyView({
                               selectedMedias,
                               mediaForms,
                               onEdit,
                           }: {
    selectedMedias: number[]
    mediaForms: Record<number, MediaForm>
    onEdit: () => void
}) {
    if (selectedMedias.length === 0) {
        return <Empty description="暂无媒介信息" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
    }

    return (
        <Card size="small" title="媒介信息" styles={{body: {padding: 12}}}>
            <Space direction="vertical" style={{width: '100%'}} size={12}>
                {selectedMedias.map(no => {
                    const form = mediaForms[no] || {media_type: 'bd', content_title: '', description: ''}
                    return (
                        <Space key={no} style={{width: '100%'}} size={8}>
                            <Typography.Text strong>
                                序号 {no} · {getMediaTypeLabel(form.media_type)}
                            </Typography.Text>
                            <Typography.Text>{form.content_title?.trim() ? form.content_title : '—'}</Typography.Text>
                            <Typography.Text type="secondary">{form.description?.trim() ? form.description : '—'}</Typography.Text>
                        </Space>
                    )
                })}
                <Button icon={<EditOutlined/>} onClick={onEdit}>
                    编辑媒介
                </Button>
            </Space>
        </Card>
    )
}

// ─── TreeNodeContent ──────────────────────────────────────────────────────────

interface TreeNodeContentProps {
    title: string
    nodeKey: string
    visibleMedias: number
    loadMoreMedias: () => void
    getNodeMediaNo: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedMedias: (key: string) => number[]
    getComputedNodeValue: (key: string) => {
        media_no: number | undefined
        isConsistent: boolean
    }
    onMediaNoChange: (key: string, mediaNo: number | null) => void
    onSharedMediaChange: (key: string, medias: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
}

function TreeNodeContent({
                             title,
                             nodeKey,
                             visibleMedias,
                             loadMoreMedias,
                             getNodeMediaNo,
                             getNodeShared,
                             getNodeSharedMedias,
                             getComputedNodeValue,
                             onMediaNoChange,
                             onSharedMediaChange,
                             onToggleShared,
                         }: TreeNodeContentProps) {
    const isShared = getNodeShared(nodeKey)
    const mediaNo = getNodeMediaNo(nodeKey)
    const sharedMedias = getNodeSharedMedias(nodeKey)
    const computed = getComputedNodeValue(nodeKey)

    const mediaNoOptions = Array.from({length: visibleMedias}, (_, i) => ({
        value: i + 1,
        label: `${i + 1}`,
    }))

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const {scrollTop, scrollHeight, clientHeight} = e.currentTarget
        if (scrollHeight - scrollTop - clientHeight < 20) loadMoreMedias()
    }

    const displayMediaNo = mediaNo ?? computed.media_no
    const isIndeterminate = !computed.isConsistent

    return (
        <Space style={{width: '100%', justifyContent: 'space-between'}} size={4}>
            <Typography.Text ellipsis={{tooltip: title}} style={{flex: 1}}>
                {title}
            </Typography.Text>
            <Space size={4}>
                <Switch
                    size="small"
                    checked={isShared}
                    onChange={checked => onToggleShared(nodeKey, checked)}
                    checkedChildren="共享"
                    unCheckedChildren="共享"
                />
                {isShared ? (
                    <Select
                        mode="multiple"
                        value={sharedMedias}
                        onChange={vals => onSharedMediaChange(nodeKey, vals as number[])}
                        style={{minWidth: 150, flexShrink: 0}}
                        size="small"
                        placeholder="选择序号（多选）"
                        options={mediaNoOptions}
                        onPopupScroll={handleScroll}
                    />
                ) : (
                    <Select
                        value={isIndeterminate ? undefined : displayMediaNo}
                        onChange={val => onMediaNoChange(nodeKey, (val as number | undefined) ?? null)}
                        style={{width: 80, flexShrink: 0}}
                        size="small"
                        placeholder={isIndeterminate ? '不一致' : '序号'}
                        options={mediaNoOptions}
                        onPopupScroll={handleScroll}
                        allowClear
                    />
                )}
            </Space>
        </Space>
    )
}

// ─── MediaEditorContent ───────────────────────────────────────────────────────

export function MediaEditorContent({
                                       loading,
                                       saving,
                                       files,
                                       treeData,
                                       nodeData,
                                       defaultExpandedKeys,
                                       selectedMedias,
                                       visibleMedias,
                                       loadMoreMedias,
                                       mediaForms,
                                       onMediaNoChange,
                                       onSharedMediaChange,
                                       onToggleShared,
                                       getNodeMediaNo,
                                       getNodeShared,
                                       getNodeSharedMedias,
                                       getComputedNodeValue,
                                       updateMediaForm,
                                       resetMediaAssignments,
                                       deleteMedia,
                                       handleSubmit,
                                       hasChanges,
                                       isChanged: isChangedProp,
                                       submitted,
                                       resetSubmitted,
                                       cancelChanges,
                                   }: MediaEditorContentProps) {
    const [isEditing, setIsEditing] = useState(false)
    const autoModeAppliedRef = useRef(false)

    useEffect(() => {
        if (loading) {
            autoModeAppliedRef.current = false
            return
        }

        if (autoModeAppliedRef.current) return
        setIsEditing(selectedMedias.length === 0)
        autoModeAppliedRef.current = true
    }, [loading, selectedMedias.length])

    const titleRender = useMemo(
        () =>
            (node: DataNode) => (
                <TreeNodeContent
                    title={node.title as string}
                    nodeKey={node.key as string}
                    visibleMedias={visibleMedias}
                    loadMoreMedias={loadMoreMedias}
                    getNodeMediaNo={getNodeMediaNo}
                    getNodeShared={getNodeShared}
                    getNodeSharedMedias={getNodeSharedMedias}
                    getComputedNodeValue={getComputedNodeValue}
                    onMediaNoChange={onMediaNoChange}
                    onSharedMediaChange={onSharedMediaChange}
                    onToggleShared={onToggleShared}
                />
            ),
        [
            visibleMedias,
            loadMoreMedias,
            getNodeMediaNo,
            getNodeShared,
            getNodeSharedMedias,
            getComputedNodeValue,
            onMediaNoChange,
            onSharedMediaChange,
            onToggleShared,
        ]
    )
    const isChanged = isChangedProp ?? (hasChanges ? hasChanges() : true)

    return (
        <Spin spinning={loading}>
            <Space orientation="vertical" style={{width: '100%', paddingTop: SPACING.sm}} size={SPACING.md}>
                {isEditing ? (
                    <>
                        <FileTreeCard
                            files={files}
                            treeData={treeData}
                            defaultExpandedKeys={defaultExpandedKeys}
                            titleRender={titleRender}
                        />

                        <MediaFormList
                            selectedMedias={selectedMedias}
                            mediaForms={mediaForms}
                            onMediaFormChange={updateMediaForm}
                            onDeleteMedia={deleteMedia}
                            onCancelEdit={selectedMedias.length > 0 ? () => {
                                const hasSaved = cancelChanges?.()
                                if (hasSaved) setIsEditing(false)
                            } : undefined}
                            onSaveEdit={selectedMedias.length > 0 && handleSubmit ? () => {
                                void handleSubmit()
                            } : undefined}
                            saving={saving}
                            isChanged={isChanged}
                            submitted={submitted}
                        />
                    </>
                ) : (
                    <MediaReadOnlyView
                        selectedMedias={selectedMedias}
                        mediaForms={mediaForms}
                        onEdit={() => setIsEditing(true)}
                    />
                )}
            </Space>
        </Spin>
    )
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export type {UseMediaEditorReturn}
export default MediaEditorContent
