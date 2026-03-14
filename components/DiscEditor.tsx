'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState,} from 'react'
import type {FileItem, NodeData, VolumeForm, TorrentWithVolume, Volume} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree, FlatTree} from '@/lib/utils'
import {
    Box, Button, Card, CardContent, CardHeader, CircularProgress,
    IconButton, Rating, Stack, TextField, Typography,
} from '@mui/material'
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import InboxIcon from '@mui/icons-material/Inbox'
import {useSnackbar} from 'notistack'
import {EditorTreeNode, renderEditorTreeNodes} from '@/components/EditorTreeNode'
import type {EditorTreeNodeProps} from '@/components/EditorTreeNode'

// ─── VolumeFormList ──────────────────────────────────────────────────────────

interface VolumeFormListProps {
    selectedVolumes: number[]
    volumeForms: Record<number, VolumeForm>
    onVolumeFormChange: (vol: number, form: VolumeForm) => void
    onDeleteVolume: (vol: number) => void
    worksCount: number
    submitted?: boolean
}

const getVolumeForm = (
    volumeForms: Record<number, VolumeForm>,
    vol: number,
): VolumeForm => volumeForms[vol] || {catalog_no: '', volume_name: ''}

function VolumeRow({vol, label, volumeForms, onVolumeFormChange, onDeleteVolume, submitted}: {
    vol: number; label: string
    volumeForms: Record<number, VolumeForm>
    onVolumeFormChange: (vol: number, form: VolumeForm) => void
    onDeleteVolume: (vol: number) => void
    submitted?: boolean
}) {
    const form = getVolumeForm(volumeForms, vol)
    const catalogNoError = submitted && !form.catalog_no.trim()
    const volumeNameError = submitted && !form.volume_name.trim()
    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap'}}>
            <Typography variant="body2" fontWeight={500} sx={{minWidth: 60}}>{label}</Typography>
            <TextField
                size="small" value={form.catalog_no} label="型番"
                onChange={e => onVolumeFormChange(vol, {...form, catalog_no: e.target.value})}
                error={catalogNoError} sx={{width: 150}}
            />
            <TextField
                size="small" value={form.volume_name} label="标题"
                onChange={e => onVolumeFormChange(vol, {...form, volume_name: e.target.value})}
                error={volumeNameError} sx={{width: 700}}
            />
            <IconButton size="small" color="error" onClick={() => onDeleteVolume(vol)}>
                <DeleteOutlineIcon fontSize="small"/>
            </IconButton>
        </Box>
    )
}

// 只读模式：显示卷信息摘要
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
    if (worksCount === 1) {
        return (
            <Box>
                <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                    {selectedVolumes.map(vol => {
                        const form = getVolumeForm(volumeForms, vol)
                        return (
                            <Box key={vol} sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                <Typography variant="body2" fontWeight={500} sx={{minWidth: 60}}>
                                    第{vol}卷
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {form.catalog_no || '无型番'} - {form.volume_name || '无标题'}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>
                <Box sx={{mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider'}}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon/>}
                        onClick={onEdit}
                    >
                        编辑卷信息
                    </Button>
                </Box>
            </Box>
        )
    }

    const groups: Record<number, number[]> = {}
    selectedVolumes.forEach(encoded => {
        const workIdx = Math.floor(encoded / 1000)
        const volNo = encoded % 1000
        if (!groups[workIdx]) groups[workIdx] = []
        groups[workIdx].push(volNo)
    })

    return (
        <Box>
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([workIdxStr, vols]) => {
                    const workIdx = Number(workIdxStr)
                    return (
                        <Box key={workIdx}>
                            <Typography variant="body2" fontWeight={700} sx={{mb: 1}}>
                                作品 {workIdx}
                            </Typography>
                            <Box sx={{pl: 2, display: 'flex', flexDirection: 'column', gap: 1}}>
                                {vols.sort((a, b) => a - b).map(volNo => {
                                    const encoded = workIdx * 1000 + volNo
                                    const form = getVolumeForm(volumeForms, encoded)
                                    return (
                                        <Box key={encoded} sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                            <Typography variant="body2" fontWeight={500} sx={{minWidth: 60}}>
                                                第{volNo}卷
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {form.catalog_no || '无型番'} - {form.volume_name || '无标题'}
                                            </Typography>
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    )
                })}
            </Box>
            <Box sx={{mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider'}}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon/>}
                    onClick={onEdit}
                >
                    编辑卷信息
                </Button>
            </Box>
        </Box>
    )
}

function VolumeFormList({selectedVolumes, volumeForms, onVolumeFormChange, onDeleteVolume, worksCount, submitted, onSubmit}: VolumeFormListProps & { onSubmit?: () => Promise<boolean> }) {
    // 检查是否有卷缺少数据（catalog_no 或 volume_name 为空）
    const hasEmptyVolume = useMemo(() => {
        return selectedVolumes.some(vol => {
            const form = getVolumeForm(volumeForms, vol)
            return !form.catalog_no.trim() || !form.volume_name.trim()
        })
    }, [selectedVolumes, volumeForms])

    const [isEditing, setIsEditing] = useState(false)
    const initializedRef = useRef(false)

    // 初始化时，如果有空数据则默认进入编辑模式（只在挂载时执行一次）
    useEffect(() => {
        if (!initializedRef.current && hasEmptyVolume) {
            initializedRef.current = true
            setIsEditing(true)
        }
    }, [hasEmptyVolume])

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

    if (selectedVolumes.length === 0) return null

    return (
        <Card variant="outlined">
            <CardHeader
                title="卷信息"
                titleTypographyProps={{variant: 'body2', fontWeight: 600}}
                sx={{py: 1, px: 1.5, pb: 0.5}}
            />
            <CardContent sx={{pt: 1, pb: '8px !important', px: 1.5}}>
                {isEditing ? (
                    <Box>
                        <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                            {selectedVolumes.map(vol => (
                                <VolumeRow
                                    key={vol}
                                    vol={vol}
                                    label={worksCount === 1 ? `第${vol}卷` : `作品${Math.floor(vol / 1000)}-第${vol % 1000}卷`}
                                    volumeForms={volumeForms}
                                    onVolumeFormChange={onVolumeFormChange}
                                    onDeleteVolume={onDeleteVolume}
                                    submitted={submitted}
                                />
                            ))}
                        </Box>
                        <Box sx={{mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider'}}>
                            <Stack direction="row" spacing={1} justifyContent="flex-start">
                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<CloseIcon/>}
                                    onClick={handleCancel}
                                >
                                    取消
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon/>}
                                    onClick={handleSave}
                                >
                                    保存
                                </Button>
                            </Stack>
                        </Box>
                    </Box>
                ) : (
                    <VolumeReadOnlyView
                        selectedVolumes={selectedVolumes}
                        volumeForms={volumeForms}
                        worksCount={worksCount}
                        onEdit={handleEdit}
                    />
                )}
            </CardContent>
        </Card>
    )
}

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
    worksCount: number
    setWorksCount: (n: number) => void
    setVolumeToKeys: (v: Map<number, Set<string>>) => void
    visibleVolumes: number
    loadMoreVolumes: () => void
    open: (torrentHash: string, name?: string, syncFiles?: boolean) => Promise<void>
    submitted: boolean
    handleSubmit: () => Promise<boolean>
    handleCancel: () => void
    hasChanges: () => boolean
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
    const {enqueueSnackbar} = useSnackbar()
    const [visible, setVisible] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [torrentName, setTorrentName] = useState('')
    const [torrentId, setTorrentId] = useState<string | null>(null)
    const [worksCount, setWorksCount] = useState(1)
    const [visibleVolumes, setVisibleVolumes] = useState(20)
    const loadMoreVolumes = useCallback(() => setVisibleVolumes(v => v + 10), [])
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
            enqueueSnackbar('请填写所有卷的型番和标题', {variant: 'error'});
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
                enqueueSnackbar(result?.error || '保存失败', {variant: 'error'});
                return false
            }
            enqueueSnackbar('保存成功', {variant: 'success'})
            setVisible(false)
            onSave?.()
            return true
        } catch (err) {
            console.error('保存失败:', err);
            enqueueSnackbar('保存失败', {variant: 'error'})
            return false
        } finally {
            setSaving(false)
        }
    }, [torrentId, selectedVolumes, volumeForms, nodeData, onSave, enqueueSnackbar])

    const handleCancel = useCallback(() => setVisible(false), [])

    return {
        visible, loading, saving, torrentName, torrentId, volumeForms, files,
        treeData, nodeData, defaultExpandedKeys, selectedVolumes,
        worksCount, setWorksCount, setVolumeToKeys, visibleVolumes, loadMoreVolumes,
        open, submitted, handleSubmit, handleCancel, hasChanges,
        onVolumeChange, onSharedVolumeChange, onToggleShared,
        getNodeVolume, getNodeShared, getNodeSharedVolumes,
        updateVolumeForm, resetVolumeAssignments, deleteVolume,
    }
}

// ─── DiscEditor isMixed 计算 ───────────────────────────────────────────────────

function makeDiscComputeIsMixed(
    getSingleValue: (key: string) => number | undefined,
    getSharedValues: (key: string) => number[],
) {
    return (leafKeys: string[], isLeaf: boolean): boolean => {
        if (isLeaf) return false
        const vols = leafKeys.map(k => getSingleValue(k) ?? getSharedValues(k)[0])
        const anySet = vols.some(v => v !== undefined)
        return anySet && !vols.every(v => v === vols[0])
    }
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
    worksCount: number;
    setWorksCount: (n: number) => void
    visibleVolumes: number
    loadMoreVolumes: () => void
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
    submitted: boolean
    handleSubmit: () => Promise<boolean>
}

export function DiscEditorContent({
                                      loading,
                                      saving,
                                      files,
                                      treeData,
                                      nodeData,
                                      defaultExpandedKeys,
                                      selectedVolumes,
                                      worksCount,
                                      setWorksCount,
                                      visibleVolumes,
                                      loadMoreVolumes,
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
                                      submitted,
                                      handleSubmit,
                                  }: DiscEditorContentProps) {
    const [worksHover, setWorksHover] = useState(-1)
    const fmtVol = useCallback((v: number) => worksCount === 1
        ? `第${v}卷`
        : `作品${Math.floor(v / 1000)}-第${v % 1000}卷`, [worksCount])

    const nodeContentProps = useMemo<Omit<EditorTreeNodeProps, 'title' | 'nodeKey' | 'isLeaf' | 'isMixed'>>(() => ({
        formatValue: fmtVol,
        worksCount,
        visibleCount: visibleVolumes,
        onLoadMore: loadMoreVolumes,
        getSingleValue: getNodeVolume,
        getIsShared: getNodeShared,
        getSharedValues: getNodeSharedVolumes,
        onSingleChange: onVolumeChange,
        onSharedChange: onSharedVolumeChange,
        onToggleShared,
    }), [fmtVol, worksCount, visibleVolumes, loadMoreVolumes, getNodeVolume, getNodeShared, getNodeSharedVolumes, onVolumeChange, onSharedVolumeChange, onToggleShared])

    const computeIsMixed = useMemo(
        () => makeDiscComputeIsMixed(getNodeVolume, getNodeSharedVolumes),
        [getNodeVolume, getNodeSharedVolumes],
    )

    const leafResults = useMemo(() => {
        const keys: string[] = []
        nodeData.forEach((data, key) => {
            if (!data.files?.length) return
            if (data.volume_no !== undefined || data.shared_volume_nos?.length) keys.push(key)
        })
        return keys.sort()
    }, [nodeData])

    return (
        <Card variant="outlined" sx={{position: 'relative', mx: 2, mt: 1, mb: 2}}>
            {loading && (
                <Box sx={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, bgcolor: 'rgba(255,255,255,0.6)'}}>
                    <CircularProgress/>
                </Box>
            )}
            <CardHeader
                title={
                    <Stack direction="row" alignItems="center"
                     spacing={2}
                    >
                        <Typography variant="subtitle2">文件列表</Typography>
                        <Typography variant="body2" color="text.secondary">{files.length} 个文件</Typography>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                            <Typography variant="body2" color="text.secondary" sx={{whiteSpace: 'nowrap'}}>作品数</Typography>
                            <Rating
                                value={worksCount}
                                max={10}
                                onChange={(_, v) => {
                                    if (v == null) return
                                    setWorksCount(v)
                                    resetVolumeAssignments()
                                }}
                                onChangeActive={(_, v) => setWorksHover(v)}
                                size="small"
                                sx={{'& .MuiRating-icon': {mx: '1px'}}}
                                IconContainerComponent={({value: v, ...props}) => {
                                    const active = worksHover > 0 ? worksHover : worksCount
                                    const filled = v <= active
                                    return (
                                        <span {...props}>
                                            <Box sx={{
                                                width: 20, height: 20, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, fontWeight: 600, lineHeight: 1,
                                                border: '1px solid',
                                                borderColor: filled ? 'primary.main' : 'divider',
                                                bgcolor: filled ? 'primary.main' : 'transparent',
                                                color: filled ? 'primary.contrastText' : 'text.disabled',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}>{v}</Box>
                                        </span>
                                    )
                                }}
                            />
                        </Box>
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
            {selectedVolumes.length > 0 && (
                <CardContent sx={{pt: 1, px: 2, pb: '8px !important'}}>
                    <VolumeFormList
                        selectedVolumes={selectedVolumes}
                        volumeForms={volumeForms}
                        onVolumeFormChange={updateVolumeForm}
                        onDeleteVolume={deleteVolume}
                        worksCount={worksCount}
                        submitted={submitted}
                        onSubmit={handleSubmit}
                    />
                </CardContent>
            )}
        </Card>
    )
}