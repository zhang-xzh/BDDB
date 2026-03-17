'use client'

import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,} from 'react'
import type {FileItem, NodeData, TorrentWithVolume, Volume, VolumeForm} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree, FlatTree, SPACING} from '@/lib/utils'
import {Button, Card, Cascader, Empty, Flex, Input, InputNumber, message, Modal, Select, Space, Spin, Switch, Typography,} from 'antd'
import {FileTreeCard} from '@/components/EditorShared'
import {DeleteOutlined, EditOutlined, SaveOutlined} from '@ant-design/icons'
import type {DataNode} from 'antd/es/tree'

export interface DiscEditorRef {
    open: (torrentHash: string, name?: string, syncFiles?: boolean) => Promise<void>
}

export interface UseDiscEditorReturn {
    visible: boolean
    loading: boolean
    saving: boolean
    torrentName: string
    torrentId: string | null
    volumeForms: Record<number, VolumeForm>
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedVolumes: number[]
    visibleVolumes: number
    loadMoreVolumes: () => void
    worksCount: number
    submitted: boolean
    setWorksCount: (n: number) => void
    resetSubmitted: () => void
    cancelChanges: () => boolean
    setVolumeToKeys: (v: Map<number, Set<string>>) => void
    open: (torrentHash: string, name?: string, syncFiles?: boolean) => Promise<void>
    handleSubmit: () => Promise<boolean>
    handleCancel: () => void
    hasChanges: () => boolean
    isChanged: boolean
    onVolumeChange: (key: string, volumeNo: number | null) => void
    onSharedVolumeChange: (key: string, volumes: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
    getNodeVolume: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedVolumes: (key: string) => number[]
    updateVolumeForm: (vol: number, form: VolumeForm) => void
    resetVolumeAssignments: () => void
    deleteVolume: (vol: number) => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDiscEditor(onSave?: () => void): UseDiscEditorReturn {
    const [visible, setVisible] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [torrentName, setTorrentName] = useState('')
    const [torrentId, setTorrentId] = useState<string | null>(null)
    const [visibleVolumes, setVisibleVolumes] = useState(20)
    const loadMoreVolumes = useCallback(() => setVisibleVolumes(v => v + 10), [])
    const [worksCount, setWorksCount] = useState(1)
    const [submitted, setSubmitted] = useState(false)
    const [volumeForms, setVolumeForms] = useState<Record<number, VolumeForm>>({})
    const [files, setFiles] = useState<FileItem[]>([])
    const [treeData, setTreeData] = useState<any[]>([])
    const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
    const [flatTree, setFlatTree] = useState<FlatTree>({map: new Map(), order: [], leaves: []})
    const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
    const [volumeToKeys, setVolumeToKeys] = useState<Map<number, Set<string>>>(new Map())

    // Change tracking
    const nodeDataRef = useRef(nodeData)
    const volumeFormsRef = useRef(volumeForms)
    const initialNodeDataRef = useRef<Map<string, NodeData>>(new Map())
    const initialVolumeFormsRef = useRef<Record<number, VolumeForm>>({})
    useEffect(() => {
        nodeDataRef.current = nodeData
    }, [nodeData])
    useEffect(() => {
        volumeFormsRef.current = volumeForms
    }, [volumeForms])

    const hasChanges = useCallback((): boolean => {
        for (const [key, data] of nodeDataRef.current.entries()) {
            if ((data.volume_no ?? undefined) !== (initialNodeDataRef.current.get(key)?.volume_no ?? undefined)) return true
        }
        return JSON.stringify(volumeFormsRef.current) !== JSON.stringify(initialVolumeFormsRef.current)
    }, [])

    const isChanged = useMemo((): boolean => {
        for (const [key, data] of nodeData.entries()) {
            if ((data.volume_no ?? undefined) !== (initialNodeDataRef.current.get(key)?.volume_no ?? undefined)) return true
        }
        return JSON.stringify(volumeForms) !== JSON.stringify(initialVolumeFormsRef.current)
    }, [nodeData, volumeForms])

    const setInitialSnapshots = useCallback((nodeSnap: Map<string, NodeData>, volSnap: Record<number, VolumeForm>) => {
        initialNodeDataRef.current = new Map(nodeSnap)
        initialVolumeFormsRef.current = {...volSnap}
    }, [])

    const resetSnapshots = useCallback(() => {
        initialNodeDataRef.current = new Map()
        initialVolumeFormsRef.current = {}
    }, [])

    // Volume selection
    const selectedVolumes = useMemo(() => Array.from(volumeToKeys.keys()).sort((a, b) => a - b), [volumeToKeys])

    const getNodeVolume = useCallback((key: string) => nodeData.get(key)?.volume_no, [nodeData])
    const getNodeShared = useCallback((key: string) => Array.isArray(nodeData.get(key)?.shared_volume_nos), [nodeData])
    const getNodeSharedVolumes = useCallback((key: string) => nodeData.get(key)?.shared_volume_nos ?? [], [nodeData])

    const getAllChildrenKeys = useCallback((key: string) =>
        flatTree.order.filter(k => k.startsWith(key + '/')), [flatTree])

    const onToggleShared = useCallback((key: string, shared: boolean) => {
        const nodes = [key, ...getAllChildrenKeys(key)]
        const newMap = new Map(nodeData)
        const newVtK = new Map(volumeToKeys)
        nodes.forEach(k => {
            const cur = newMap.get(k) || {}
            if (shared) {
                const vols = cur.volume_no !== undefined ? [cur.volume_no] : []
                newMap.set(k, {...cur, shared_volume_nos: vols, volume_no: undefined})
                if (cur.volume_no !== undefined) {
                    newVtK.get(cur.volume_no)?.delete(k)
                    if (newVtK.get(cur.volume_no)?.size === 0) newVtK.delete(cur.volume_no)
                }
                vols.forEach(v => {
                    if (!newVtK.has(v)) newVtK.set(v, new Set());
                    newVtK.get(v)!.add(k)
                })
            } else {
                const vols = cur.shared_volume_nos ?? []
                const first = vols[0]
                newMap.set(k, {...cur, volume_no: first, shared_volume_nos: undefined})
                vols.forEach(v => {
                    newVtK.get(v)?.delete(k);
                    if (newVtK.get(v)?.size === 0) newVtK.delete(v)
                })
                if (first !== undefined) {
                    if (!newVtK.has(first)) newVtK.set(first, new Set());
                    newVtK.get(first)!.add(k)
                }
            }
        })
        setNodeData(newMap);
        setVolumeToKeys(newVtK)
    }, [getAllChildrenKeys, nodeData, volumeToKeys])

    const onSharedVolumeChange = useCallback((key: string, volumes: number[]) => {
        const nodes = [key, ...getAllChildrenKeys(key)]
        const newMap = new Map(nodeData)
        const newVtK = new Map(volumeToKeys)
        nodes.forEach(k => {
            const cur = newMap.get(k) || {}
            const old = cur.shared_volume_nos ?? []
            newMap.set(k, {...cur, shared_volume_nos: volumes, volume_no: undefined})
            old.forEach(v => {
                newVtK.get(v)?.delete(k);
                if (newVtK.get(v)?.size === 0) newVtK.delete(v)
            })
            volumes.forEach(v => {
                if (!newVtK.has(v)) newVtK.set(v, new Set());
                newVtK.get(v)!.add(k)
            })
        })
        setNodeData(newMap);
        setVolumeToKeys(newVtK)
    }, [getAllChildrenKeys, nodeData, volumeToKeys])

    const onVolumeChange = useCallback((key: string, volumeNo: number | null) => {
        const vol = volumeNo ?? undefined
        const oldVol = nodeData.get(key)?.volume_no
        const nodes = [key, ...getAllChildrenKeys(key)]
        const newMap = new Map(nodeData)
        nodes.forEach(k => newMap.set(k, {...(newMap.get(k) || {}), volume_no: vol}))
        setNodeData(newMap)
        const newVtK = new Map(volumeToKeys)
        nodes.forEach(k => {
            if (vol !== undefined) {
                if (!newVtK.has(vol)) newVtK.set(vol, new Set());
                newVtK.get(vol)!.add(k)
            }
            if (oldVol !== undefined && oldVol !== vol) {
                newVtK.get(oldVol)?.delete(k);
                if (newVtK.get(oldVol)?.size === 0) newVtK.delete(oldVol)
            }
        })
        setVolumeToKeys(newVtK)
    }, [getAllChildrenKeys, nodeData, volumeToKeys])

    const resetVolumeAssignments = useCallback(() => {
        setNodeData(prev => {
            const m = new Map(prev);
            m.forEach((d, k) => m.set(k, {files: d.files}));
            return m
        })
        setVolumeToKeys(new Map())
    }, [])

    const deleteVolume = useCallback((vol: number) => {
        setVolumeForms(prev => {
            const n = {...prev};
            delete n[vol];
            return n
        })
        setNodeData(prev => {
            const m = new Map(prev)
            m.forEach((d, k) => {
                if (d.volume_no === vol) m.set(k, {...d, volume_no: undefined})
                else if (d.shared_volume_nos?.includes(vol)) {
                    const f = d.shared_volume_nos.filter(v => v !== vol)
                    m.set(k, {
                        ...d,
                        shared_volume_nos: f.length > 0 ? f : undefined,
                        volume_no: f.length === 1 ? f[0] : d.volume_no
                    })
                }
            })
            return m
        })
        setVolumeToKeys(prev => {
            const n = new Map(prev);
            n.delete(vol);
            return n
        })
    }, [])

    const updateVolumeForm = useCallback((vol: number, form: VolumeForm) =>
        setVolumeForms(prev => ({...prev, [vol]: {...form}})), [])

    const resetAll = useCallback(() => {
        resetSnapshots()
        setSubmitted(false)
        setVolumeForms({});
        setFiles([]);
        setTreeData([]);
        setNodeData(new Map())
        setFlatTree({map: new Map(), order: [], leaves: []})
        setDefaultExpandedKeys([]);
        setVolumeToKeys(new Map())
        setTorrentId(null);
        setWorksCount(1)
    }, [resetSnapshots])

    // Load / open
    const open = useCallback(async (torrentHash: string, name = '', syncFiles = false) => {
        setVisible(true);
        setTorrentName(name);
        setLoading(true);
        resetAll()
        try {
            const [torrentResult, dbFilesResult] = await Promise.all([
                fetchApi<TorrentWithVolume[]>(`/api/qb/torrents/info?hash=${torrentHash}`),
                fetchApi<FileItem[]>(`/api/torrents/files?hash=${torrentHash}`),
            ])
            if (!torrentResult?.success || !torrentResult.data) {
                setLoading(false);
                return
            }
            const torrent = torrentResult.data?.[0]
            if (!torrent) {
                setLoading(false);
                return
            }

            const tid = torrent._id
            setTorrentId(tid)
            const volumesPromise = tid != null ? fetchApi<Volume[]>(`/api/volumes?torrent_id=${tid}`) : Promise.resolve(null)

            let loadedFiles: FileItem[] = dbFilesResult?.success && dbFilesResult.data ? dbFilesResult.data : []
            if (loadedFiles.length === 0 || syncFiles) {
                const r = await fetchApi<FileItem[]>(`/api/qb/torrents/files?hash=${torrentHash}`)
                if (r?.success && r.data) loadedFiles = r.data
            }
            if (loadedFiles.length === 0) {
                setLoading(false);
                return
            }

            setFiles(loadedFiles)
            const {
                treeData: td,
                nodeData: nd,
                fileToKeyMap,
                flatTree: ft,
                defaultExpandedKeys: ek
            } = buildTree(loadedFiles)
            setTreeData(td);
            setNodeData(nd);
            setFlatTree(ft);
            setDefaultExpandedKeys(ek)

            let snapNodeData = nd
            let snapVolumeForms: Record<number, VolumeForm> = {}

            const volResult = await volumesPromise
            if (volResult?.success && volResult.data) {
                const volumes = volResult.data
                if (volumes?.length > 0) {
                    const newVolumeForms: Record<number, VolumeForm> = {}
                    const fileToVolMap = new Map<string, number[]>()
                    volumes.forEach((vol: any) => {
                        const vn = vol.volume_no
                        if (vn === undefined) return
                        newVolumeForms[vn] = {
                            catalog_no: vol.catalog_no || '',
                            volume_name: vol.volume_name || '',
                        }
                        vol.file_ids?.forEach((fid: string) => {
                            if (!fileToVolMap.has(fid)) fileToVolMap.set(fid, [])
                            fileToVolMap.get(fid)!.push(vn)
                        })
                    })
                    setVolumeForms(newVolumeForms)
                    const allVolNos = Object.keys(newVolumeForms).map(Number)
                    const maxEncoded = Math.max(...allVolNos, 0)
                    setWorksCount(maxEncoded >= 1000 ? Math.floor(maxEncoded / 1000) : 1)

                    const newND = new Map(nd)
                    const newVtK = new Map<number, Set<string>>()
                    fileToKeyMap.forEach((key, fid) => {
                        const vols = fileToVolMap.get(fid)
                        if (!vols?.length) return
                        const ex = newND.get(key) || {}
                        if (vols.length === 1) {
                            newND.set(key, {...ex, volume_no: vols[0], shared_volume_nos: undefined})
                            if (!newVtK.has(vols[0])) newVtK.set(vols[0], new Set());
                            newVtK.get(vols[0])!.add(key)
                        } else {
                            newND.set(key, {...ex, volume_no: undefined, shared_volume_nos: vols})
                            vols.forEach(v => {
                                if (!newVtK.has(v)) newVtK.set(v, new Set());
                                newVtK.get(v)!.add(key)
                            })
                        }
                    })

                    // Propagate to parent folders
                    const sorted = Array.from(ft.order).sort((a, b) => (ft.map.get(b)?.depth ?? 0) - (ft.map.get(a)?.depth ?? 0))
                    sorted.forEach(key => {
                        const np = ft.map.get(key)
                        if (!np || np.isLeaf || np.children.length === 0) return
                        const sets: Set<number>[] = []
                        let allHave = true
                        np.children.forEach(ck => {
                            const cd = newND.get(ck)
                            if (cd?.shared_volume_nos?.length) sets.push(new Set(cd.shared_volume_nos))
                            else if (cd?.volume_no !== undefined) sets.push(new Set([cd.volume_no]))
                            else allHave = false
                        })
                        if (!allHave || sets.length === 0) return
                        const inter = sets.reduce((acc, s) => new Set([...acc].filter(v => s.has(v))))
                        if (inter.size === 0) return
                        const ex = newND.get(key) || {}
                        if (inter.size === 1) {
                            const vn = inter.values().next().value as number
                            newND.set(key, {...ex, volume_no: vn, shared_volume_nos: undefined})
                            if (!newVtK.has(vn)) newVtK.set(vn, new Set());
                            newVtK.get(vn)!.add(key)
                        } else {
                            const sv = Array.from(inter)
                            newND.set(key, {...ex, volume_no: undefined, shared_volume_nos: sv})
                            sv.forEach(v => {
                                if (!newVtK.has(v)) newVtK.set(v, new Set());
                                newVtK.get(v)!.add(key)
                            })
                        }
                    })

                    setNodeData(newND);
                    setVolumeToKeys(newVtK)
                    snapNodeData = newND;
                    snapVolumeForms = newVolumeForms
                }
            }
            setInitialSnapshots(snapNodeData, snapVolumeForms)
        } catch (err) {
            console.error('加载数据失败:', err)
        } finally {
            setLoading(false)
        }
    }, [resetAll, setInitialSnapshots])

    const handleSubmit = useCallback(async (): Promise<boolean> => {
        if (torrentId == null) return false
        setSubmitted(true)
        const hasError = selectedVolumes.some(v => !volumeForms[v]?.catalog_no?.trim() || !volumeForms[v]?.volume_name?.trim())
        if (hasError) {
            message.error('请填写所有卷的型番和标题');
            return false
        }
        setSaving(true)
        try {
            const fileMap: Record<number, string[]> = {}
            selectedVolumes.forEach(v => {
                fileMap[v] = []
            })
            nodeData.forEach(data => {
                if (!data.files?.length) return
                const vols: number[] = []
                if (data.volume_no !== undefined) vols.push(data.volume_no)
                if (data.shared_volume_nos?.length) vols.push(...data.shared_volume_nos)
                vols.forEach(v => {
                    if (!fileMap[v]) fileMap[v] = []
                    data.files!.forEach(fid => {
                        if (!fileMap[v].includes(fid)) fileMap[v].push(fid)
                    })
                })
            })
            const result = await postApi('/api/volumes', {
                torrent_id: torrentId,
                volumes: selectedVolumes.map(vn => ({
                    volume_no: vn, sort_order: vn,
                    volume_name: (volumeForms[vn]?.volume_name || '').trim(),
                    catalog_no: (volumeForms[vn]?.catalog_no || '').trim(),
                    files: fileMap[vn] || [],
                })),
            })
            if (!result?.success) {
                message.error(result?.error || '保存失败');
                return false
            }
            message.success('保存成功')
            setSubmitted(false)
            setVisible(false)
            onSave?.()
            return true
        } catch (err) {
            console.error('保存失败:', err);
            message.error('保存失败')
            return false
        } finally {
            setSaving(false)
        }
    }, [torrentId, selectedVolumes, volumeForms, nodeData, onSave])

    const cancelChanges = useCallback((): boolean => {
        const nd = new Map(initialNodeDataRef.current)
        const vf = {...initialVolumeFormsRef.current}
        const vtk = new Map<number, Set<string>>()
        nd.forEach((data, key) => {
            if (data.volume_no !== undefined) {
                if (!vtk.has(data.volume_no)) vtk.set(data.volume_no, new Set())
                vtk.get(data.volume_no)!.add(key)
            }
            data.shared_volume_nos?.forEach(vno => {
                if (!vtk.has(vno)) vtk.set(vno, new Set())
                vtk.get(vno)!.add(key)
            })
        })
        setNodeData(nd)
        setVolumeForms(vf)
        setVolumeToKeys(vtk)
        setSubmitted(false)
        return Object.keys(vf).length > 0
    }, [])

    const handleCancel = useCallback(() => {
        setSubmitted(false)
        setVisible(false)
    }, [])
    const resetSubmitted = useCallback(() => setSubmitted(false), [])

    return {
        visible, loading, saving, torrentName, torrentId, volumeForms, files,
        treeData, nodeData, defaultExpandedKeys, selectedVolumes, visibleVolumes,
        loadMoreVolumes, worksCount, submitted, setWorksCount, resetSubmitted, cancelChanges, setVolumeToKeys,
        open, handleSubmit, handleCancel, hasChanges, isChanged,
        onVolumeChange, onSharedVolumeChange, onToggleShared,
        getNodeVolume, getNodeShared, getNodeSharedVolumes,
        updateVolumeForm, resetVolumeAssignments, deleteVolume,
    }
}

// ─── VolumeFormList ───────────────────────────────────────────────────────────

interface VolumeFormListProps {
    selectedVolumes: number[]
    volumeForms: Record<number, VolumeForm>
    onVolumeFormChange: (vol: number, form: VolumeForm) => void
    onDeleteVolume: (vol: number) => void
    worksCount: number
    submitted?: boolean
    onCancelEdit?: () => void
    onSaveEdit?: () => void
    saving?: boolean
    isChanged?: boolean
}

function VolumeRow({vol, label, volumeForms, onVolumeFormChange, onDeleteVolume, submitted}: {
    vol: number; label: string; volumeForms: Record<number, VolumeForm>
    onVolumeFormChange: (vol: number, form: VolumeForm) => void
    onDeleteVolume: (vol: number) => void; submitted?: boolean
}) {
    const form = volumeForms[vol] || {catalog_no: '', volume_name: ''}
    return (
        <Space>
            <Typography.Text strong style={{minWidth: 60, display: 'inline-block'}}>{label}</Typography.Text>
            <Input
                value={form.catalog_no}
                onChange={e => onVolumeFormChange(vol, {...form, catalog_no: e.target.value})}
                placeholder="型番" style={{width: 120}}
                status={submitted && !form.catalog_no.trim() ? 'error' : undefined}
            />
            <Input
                value={form.volume_name}
                onChange={e => onVolumeFormChange(vol, {...form, volume_name: e.target.value})}
                placeholder="标题" style={{width: 700}}
                status={submitted && !form.volume_name.trim() ? 'error' : undefined}
            />
            <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={() => onDeleteVolume(vol)}/>
        </Space>
    )
}

function VolumeFormList({
                            selectedVolumes,
                            volumeForms,
                            onVolumeFormChange,
                            onDeleteVolume,
                            worksCount,
                            submitted,
                            onCancelEdit,
                            onSaveEdit,
                            saving = false,
                            isChanged = true,
                        }: VolumeFormListProps) {
    if (selectedVolumes.length === 0) return null

    const rowProps = {volumeForms, onVolumeFormChange, onDeleteVolume, submitted}
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

    if (worksCount === 1) {
        return (
            <Card size="small" title="卷信息" styles={{body: {padding: 12}}}>
                <Space direction="vertical" style={{width: '100%'}} size={12}>
                    {selectedVolumes.map(vol => <VolumeRow key={vol} vol={vol} label={`第${vol}卷`} {...rowProps} />)}
                    {actions}
                </Space>
            </Card>
        )
    }

    const groups: Record<number, number[]> = {}
    selectedVolumes.forEach(enc => {
        const wi = Math.floor(enc / 1000)
        if (!groups[wi]) groups[wi] = []
        groups[wi].push(enc % 1000)
    })

    return (
        <Card size="small" title="卷信息" styles={{body: {padding: 12}}}>
            <Space direction="vertical" style={{width: '100%'}} size={SPACING.md}>
                {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([wiStr, vols]) => {
                    const wi = Number(wiStr)
                    return (
                        <Flex key={wi} vertical>
                            <Typography.Text strong
                                             style={{display: 'block', marginBottom: 8}}>作品 {wi}</Typography.Text>
                            <Space direction="vertical" style={{width: '100%', paddingLeft: SPACING.md}} size={SPACING.sm}>
                                {vols.sort((a, b) => a - b).map(vn => {
                                    const enc = wi * 1000 + vn
                                    return <VolumeRow key={enc} vol={enc} label={`第${vn}卷`} {...rowProps} />
                                })}
                            </Space>
                        </Flex>
                    )
                })}
                {actions}
            </Space>
        </Card>
    )
}

function VolumeReadOnlyView({
                                selectedVolumes,
                                volumeForms,
                                worksCount,
                                onEdit,
                            }: {
    selectedVolumes: number[]
    volumeForms: Record<number, VolumeForm>
    worksCount: number
    onEdit: () => void
}) {
    if (selectedVolumes.length === 0) {
        return <Empty description="暂无卷信息" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
    }

    return (
        <Card size="small" title="卷信息" styles={{body: {padding: 12}}}>
            <Space direction="vertical" style={{width: '100%'}} size={12}>
                {selectedVolumes.map(vol => {
                    const form = volumeForms[vol] || {catalog_no: '', volume_name: ''}
                    const label = worksCount === 1
                        ? `第${vol}卷`
                        : `作品 ${Math.floor(vol / 1000)} · 第${vol % 1000}卷`
                    return (
                        <Space key={vol} style={{width: '100%'}} size={8}>
                            <Typography.Text strong>{label}</Typography.Text>
                            <Typography.Text>{form.catalog_no?.trim() ? form.catalog_no : '—'}</Typography.Text>
                            <Typography.Text type="secondary">{form.volume_name?.trim() ? form.volume_name : '—'}</Typography.Text>
                        </Space>
                    )
                })}
                <Button icon={<EditOutlined/>} onClick={onEdit}>
                    编辑卷信息
                </Button>
            </Space>
        </Card>
    )
}

// ─── TreeNodeContent ──────────────────────────────────────────────────────────

const toCascaderVal = (vn: number | undefined): [number, number] | undefined =>
    vn === undefined ? undefined : [Math.floor(vn / 1000), vn % 1000]
const fromCascaderVal = (val: (string | number)[]): number =>
    (val[0] as number) * 1000 + (val[1] as number)

interface TreeNodeContentProps {
    title: string;
    nodeKey: string;
    worksCount: number;
    visibleVolumes: number
    loadMoreVolumes: () => void
    getNodeVolume: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedVolumes: (key: string) => number[]
    onVolumeChange: (key: string, vn: number | null) => void
    onSharedVolumeChange: (key: string, vols: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
}

function TreeNodeContent({
                             title, nodeKey, worksCount, visibleVolumes, loadMoreVolumes,
                             getNodeVolume, getNodeShared, getNodeSharedVolumes,
                             onVolumeChange, onSharedVolumeChange, onToggleShared,
                         }: TreeNodeContentProps) {
    const isShared = getNodeShared(nodeKey)
    const volumeNo = getNodeVolume(nodeKey)
    const sharedVolumes = getNodeSharedVolumes(nodeKey)

    const selectOptions = Array.from({length: visibleVolumes}, (_, i) => ({value: i + 1, label: `第 ${i + 1} 卷`}))
    const cascaderOptions = Array.from({length: worksCount}, (_, wi) => ({
        label: `作品 ${wi + 1}`, value: wi + 1,
        children: Array.from({length: visibleVolumes}, (_, vi) => ({label: `第 ${vi + 1} 卷`, value: vi + 1})),
    }))

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const {scrollTop, scrollHeight, clientHeight} = e.currentTarget
        if (scrollHeight - scrollTop - clientHeight < 20) loadMoreVolumes()
    }

    const renderSelector = () => {
        if (worksCount === 1) {
            return (
                <Select
                    mode={isShared ? 'multiple' : undefined}
                    value={isShared ? sharedVolumes : volumeNo}
                    onChange={val => isShared
                        ? onSharedVolumeChange(nodeKey, val as number[])
                        : onVolumeChange(nodeKey, (val as number | undefined) ?? null)}
                    style={{minWidth: isShared ? 150 : 100, flexShrink: 0}}
                    size="small" placeholder="卷号" allowClear
                    options={selectOptions} onPopupScroll={handleScroll}
                />
            )
        }
        if (!isShared) {
            return (
                <Cascader
                    value={toCascaderVal(volumeNo)}
                    onChange={val => !val || !(val as any[]).length
                        ? onVolumeChange(nodeKey, null)
                        : onVolumeChange(nodeKey, fromCascaderVal(val as (string | number)[]))}
                    options={cascaderOptions} placeholder="作品/卷" size="small"
                    style={{width: 160, flexShrink: 0}} allowClear
                />
            )
        }
        return (
            <Cascader
                multiple
                value={sharedVolumes.map(vn => toCascaderVal(vn)!)}
                onChange={vals => onSharedVolumeChange(nodeKey, (vals as (string | number)[][]).map(fromCascaderVal))}
                options={cascaderOptions} placeholder="作品/卷（多选）" size="small"
                style={{minWidth: 200, flexShrink: 0}}
            />
        )
    }

    return (
        <Space style={{width: '100%', justifyContent: 'space-between'}} size={4}>
            <Typography.Text ellipsis={{tooltip: title}} style={{flex: 1}}>{title}</Typography.Text>
            <Space size={4}>
                <Switch size="small" checked={isShared}
                        onChange={checked => onToggleShared(nodeKey, checked)}
                        checkedChildren="共享" unCheckedChildren="共享"/>
                {renderSelector()}
            </Space>
        </Space>
    )
}

// ─── DiscEditorContent ────────────────────────────────────────────────────────

interface DiscEditorContentProps {
    loading: boolean;
    saving: boolean;
    files: FileItem[];
    treeData: any[]
    nodeData: Map<string, NodeData>;
    defaultExpandedKeys: string[]
    selectedVolumes: number[];
    visibleVolumes: number;
    loadMoreVolumes: () => void
    worksCount: number;
    submitted: boolean
    setWorksCount: (n: number) => void
    resetSubmitted: () => void
    cancelChanges?: () => boolean
    volumeForms: Record<number, VolumeForm>
    updateVolumeForm: (vol: number, form: VolumeForm) => void
    onVolumeChange: (key: string, vn: number | null) => void
    onSharedVolumeChange: (key: string, vols: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
    getNodeVolume: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedVolumes: (key: string) => number[]
    resetVolumeAssignments: () => void
    deleteVolume: (vol: number) => void
    handleSubmit: () => boolean | Promise<boolean>
    hasChanges: () => boolean
    isChanged?: boolean
}

export function DiscEditorContent({
                                      loading,
                                      saving,
                                      files,
                                      treeData,
                                      nodeData,
                                      defaultExpandedKeys,
                                      selectedVolumes,
                                      visibleVolumes,
                                      loadMoreVolumes,
                                      worksCount,
                                      submitted,
                                      setWorksCount,
                                      resetSubmitted,
                                      cancelChanges,
                                      volumeForms,
                                      updateVolumeForm,
                                      onVolumeChange,
                                      onSharedVolumeChange,
                                      onToggleShared,
                                      getNodeVolume,
                                      getNodeShared,
                                      getNodeSharedVolumes,
                                      resetVolumeAssignments,
                                      deleteVolume,
                                      handleSubmit: externalSubmit,
                                      hasChanges,
                                      isChanged: isChangedProp,
                                  }: DiscEditorContentProps) {
    const [isEditing, setIsEditing] = useState(false)
    const autoModeAppliedRef = useRef(false)

    useEffect(() => {
        if (loading) {
            autoModeAppliedRef.current = false
            return
        }

        if (autoModeAppliedRef.current) return
        setIsEditing(selectedVolumes.length === 0)
        autoModeAppliedRef.current = true
    }, [loading, selectedVolumes.length])

    const handleSubmit = () => externalSubmit()

    const titleRender = useMemo(() => (node: DataNode) => (
        <TreeNodeContent
            title={node.title as string} nodeKey={node.key as string}
            worksCount={worksCount} visibleVolumes={visibleVolumes} loadMoreVolumes={loadMoreVolumes}
            getNodeVolume={getNodeVolume} getNodeShared={getNodeShared} getNodeSharedVolumes={getNodeSharedVolumes}
            onVolumeChange={onVolumeChange} onSharedVolumeChange={onSharedVolumeChange} onToggleShared={onToggleShared}
        />
    ), [worksCount, visibleVolumes, loadMoreVolumes, getNodeVolume, getNodeShared, getNodeSharedVolumes, onVolumeChange, onSharedVolumeChange, onToggleShared])
    const isChanged = isChangedProp ?? hasChanges()

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
                            titleExtra={
                                <InputNumber
                                    min={1} value={worksCount}
                                    onChange={val => {
                                        setWorksCount(val ?? 1);
                                        resetVolumeAssignments()
                                    }}
                                    addonBefore="作品数" size="small" mode="spinner" style={{width: 100}}
                                />
                            }
                        />
                        <VolumeFormList
                            selectedVolumes={selectedVolumes} volumeForms={volumeForms}
                            onVolumeFormChange={updateVolumeForm} onDeleteVolume={deleteVolume}
                            worksCount={worksCount} submitted={submitted}
                            onCancelEdit={selectedVolumes.length > 0 ? () => {
                                const hasSaved = cancelChanges?.()
                                if (hasSaved) setIsEditing(false)
                            } : undefined}
                            onSaveEdit={selectedVolumes.length > 0 ? handleSubmit : undefined}
                            saving={saving}
                            isChanged={isChanged}
                        />
                    </>
                ) : (
                    <VolumeReadOnlyView
                        selectedVolumes={selectedVolumes}
                        volumeForms={volumeForms}
                        worksCount={worksCount}
                        onEdit={() => setIsEditing(true)}
                    />
                )}
            </Space>
        </Spin>
    )
}

// ─── DiscEditor Modal (default export) ───────────────────────────────────────

const DiscEditor = forwardRef<DiscEditorRef, { onSave?: () => void }>(
    function DiscEditor({onSave}, ref) {
        const editor = useDiscEditor(onSave)
        useImperativeHandle(ref, () => ({open: editor.open}), [editor.open])
        return (
            <Modal
                open={editor.visible} title={editor.torrentName || '编辑产品信息'}
                width={900} onCancel={editor.handleCancel} destroyOnHidden footer={null}
            >
                <DiscEditorContent
                    loading={editor.loading} saving={editor.saving} files={editor.files}
                    treeData={editor.treeData} nodeData={editor.nodeData}
                    defaultExpandedKeys={editor.defaultExpandedKeys}
                    selectedVolumes={editor.selectedVolumes} visibleVolumes={editor.visibleVolumes}
                    loadMoreVolumes={editor.loadMoreVolumes} worksCount={editor.worksCount}
                    submitted={editor.submitted}
                    setWorksCount={editor.setWorksCount} volumeForms={editor.volumeForms}
                    resetSubmitted={editor.resetSubmitted}
                    updateVolumeForm={editor.updateVolumeForm} onVolumeChange={editor.onVolumeChange}
                    onSharedVolumeChange={editor.onSharedVolumeChange} onToggleShared={editor.onToggleShared}
                    getNodeVolume={editor.getNodeVolume} getNodeShared={editor.getNodeShared}
                    getNodeSharedVolumes={editor.getNodeSharedVolumes}
                    resetVolumeAssignments={editor.resetVolumeAssignments} deleteVolume={editor.deleteVolume}
                    handleSubmit={editor.handleSubmit}
                    hasChanges={editor.hasChanges}
                    isChanged={editor.isChanged}
                />
            </Modal>
        )
    }
)

export default DiscEditor
