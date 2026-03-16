'use client'

import React, {useCallback, useMemo, useRef, useState} from 'react'
import {FileItem, NodeData} from '@/lib/mongodb'
import {fetchApi, postApi} from '@/lib/api'
import {buildTree} from '@/lib/utils'
import {Button, Card, Divider, Icon, Intent, MenuItem, Spinner, Tag, Tree} from '@blueprintjs/core'
import type {TreeNodeInfo} from '@blueprintjs/core'
import {MultiSelect} from '@blueprintjs/select'
import {showToast} from '@/lib/toaster'
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
                showToast('撤销失败', Intent.DANGER)
                return false
            }
            setSelectedWorks(previousWorks)
            initialWorksRef.current = previousWorks
            showToast('已撤销', Intent.SUCCESS)
            onSave?.()
            return true
        } catch (err) {
            console.error('撤销失败:', err)
            showToast('撤销失败', Intent.DANGER)
            return false
        } finally {
            setSaving(false)
        }
    }, [volumeInfo, onSave])

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
                showToast(result?.error || '保存失败', Intent.DANGER)
                return false
            }
            previousWorksRef.current = initialWorksRef.current
            // 保存时 works 可能是 SearchResultItem，但 ref 需要 BangumiSubject
            initialWorksRef.current = works as BangumiSubject[]
            onSave?.()

            showToast('作品关联已更新', Intent.SUCCESS)

            return true
        } catch (err) {
            console.error('保存失败:', err)
            showToast('保存失败', Intent.DANGER)
            return false
        } finally {
            setSaving(false)
        }
    }, [volumeInfo, selectedWorks, onSave])

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
        <div style={{display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0'}}>
            <span style={{minWidth: 80, flexShrink: 0, fontSize: 14, color: '#8a9ba8'}}>{label}</span>
            <span style={{flex: 1, fontSize: 14}}>{value}</span>
        </div>
    )
}

// ─── WorkDetail 组件 ─────────────────────────────────────────────────────────

interface WorkDetailProps {
    work: BangumiSubject
}

function WorkDetail({work}: WorkDetailProps) {
    return (
        <div>
            {/* 标题区域 */}
            <div style={{marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #d3d8de'}}>
                <div style={{fontSize: '1.1rem', fontWeight: 600}}>{work.name_cn || work.name}</div>
                {work.name_cn && work.name !== work.name_cn && (
                    <div style={{marginTop: 4, fontSize: 14, color: '#8a9ba8'}}>{work.name}</div>
                )}
            </div>

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
            <div style={{display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0'}}>
                <span style={{minWidth: 80, fontSize: 14, color: '#8a9ba8'}}>Bangumi</span>
                <a href={work.url} target="_blank" rel="noopener noreferrer" style={{flex: 1, fontSize: 14}}>
                    {work.url}
                </a>
            </div>

            {/* 收藏统计 */}
            {work.collection && (
                <div style={{marginTop: 16, paddingTop: 8, borderTop: '1px solid #d3d8de'}}>
                    <div style={{marginBottom: 8, fontSize: 14, color: '#8a9ba8'}}>收藏统计</div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                        <Tag minimal>想看: {work.collection.wish}</Tag>
                        <Tag minimal>看过: {work.collection.collect}</Tag>
                        <Tag minimal>在看: {work.collection.doing}</Tag>
                        <Tag minimal>搁置: {work.collection.on_hold}</Tag>
                        <Tag minimal>抛弃: {work.collection.dropped}</Tag>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── WorkReadOnlyView (只读模式视图) ─────────────────────────────────────────

interface WorkReadOnlyViewProps {
    works: BangumiSubject[]
    onEdit: () => void
}

function WorkReadOnlyView({works, onEdit}: WorkReadOnlyViewProps) {
    return (
        <div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                {works.map((work, index) => (
                    <div key={work.id}>
                        <WorkDetail work={work}/>
                        {index < works.length - 1 && (
                            <div style={{margin: '16px 0', borderBottom: '1px solid #d3d8de'}}/>
                        )}
                    </div>
                ))}
            </div>
            <div style={{marginTop: 16, paddingTop: 16, borderTop: '1px solid #d3d8de'}}>
                <Button small outlined icon="edit" onClick={onEdit}>更换作品</Button>
            </div>
        </div>
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
    const [searchResults, setSearchResults] = useState<BangumiSearchResult['list']>([])
    const [searching, setSearching] = useState(false)

    const hasSelection = tempWorks.length > 0
    const isChanged = useMemo(() => {
        if (selectedWorks.length !== tempWorks.length) return true
        const selectedIds = new Set(selectedWorks.map(w => w.id))
        const tempIds = new Set(tempWorks.map(w => w.id))
        return selectedWorks.some(w => !tempIds.has(w.id)) || tempWorks.some(w => !selectedIds.has(w.id))
    }, [selectedWorks, tempWorks])

    return (
        <div>
            <div style={{maxWidth: 500, marginBottom: 16, marginTop: 8}}>
                <MultiSelect<SearchResultItem>
                    items={searchResults}
                    selectedItems={tempWorks as SearchResultItem[]}
                    itemRenderer={(item, {handleClick, modifiers}) => (
                        <MenuItem
                            key={item.id}
                            text={item.name_cn || item.name}
                            label={item.name_cn && item.name !== item.name_cn ? item.name : undefined}
                            onClick={handleClick}
                            active={modifiers.active}
                            roleStructure="listoption"
                        />
                    )}
                    tagRenderer={item => item.name_cn || item.name}
                    onItemSelect={item => {
                        const exists = tempWorks.find(w => w.id === item.id)
                        if (exists) onTempWorksChange(tempWorks.filter(w => w.id !== item.id))
                        else onTempWorksChange([...tempWorks, item])
                    }}
                    onRemove={(item) => onTempWorksChange(tempWorks.filter(w => w.id !== (item as any).id))}
                    tagInputProps={{
                        onRemove: (_, index) => onTempWorksChange(tempWorks.filter((_, i) => i !== index)),
                        placeholder: '输入日文或中文标题...',
                    }}
                    onQueryChange={async (query) => {
                        if (query.length < 2) { setSearchResults([]); return }
                        setSearching(true)
                        try { const result = await searchBangumi(query, 2); setSearchResults(result.list) }
                        catch (err) { console.error('搜索失败:', err) }
                        finally { setSearching(false) }
                    }}
                    itemPredicate={() => true}
                    noResults={<MenuItem disabled text={searching ? '搜索中...' : '无结果'}/>}
                    popoverProps={{minimal: true}}
                />
            </div>

            {/* 选中作品详情预览 */}
            {tempWorks.length > 0 && (
                <div style={{marginBottom: 16, padding: 12, background: 'var(--subtle-bg)', borderRadius: 4}}>
                    {tempWorks.map((work, index) => (
                        <React.Fragment key={work.id}>
                            <div>
                                <div style={{fontSize: 14, fontWeight: 600}}>{work.name_cn || work.name}</div>
                                <div style={{fontSize: 12, color: '#8a9ba8'}}>
                                    {getTypeName(work.type)} {work.air_date}
                                </div>
                            </div>
                            {index < tempWorks.length - 1 && <Divider style={{margin: '8px 0'}}/>}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* 操作按钮 */}
            <div style={{display: 'flex', gap: 8, marginTop: 8}}>
                {onCancel && (
                    <Button small icon="cross" onClick={onCancel} disabled={saving}>取消</Button>
                )}
                <Button
                    small
                    intent={Intent.PRIMARY}
                    icon="floppy-disk"
                    onClick={onSave}
                    disabled={!hasSelection || !isChanged || saving}
                >
                    保存
                </Button>
            </div>
        </div>
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
        <Card style={{padding: 0}}>
            <div style={{padding: '8px 12px 4px', fontWeight: 600, fontSize: 14}}>作品信息</div>
            <div style={{padding: '8px 12px 8px'}}>
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
            </div>
        </Card>
    )
}

// ─── Tree helpers ────────────────────────────────────────────────────────────

function buildBPTreeNodes(nodes: any[], expandedSet: Set<string>): TreeNodeInfo[] {
    return nodes.map(node => ({
        id: node.key,
        label: node.title,
        icon: node.isLeaf ? 'document' as const : 'folder-open' as const,
        isExpanded: expandedSet.has(node.key as string),
        childNodes: node.children?.length > 0 ? buildBPTreeNodes(node.children, expandedSet) : undefined,
    }))
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
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(defaultExpandedKeys))

    React.useEffect(() => {
        setExpandedNodes(new Set(defaultExpandedKeys))
    }, [defaultExpandedKeys])

    const treeContents = useMemo(
        () => buildBPTreeNodes(treeData, expandedNodes),
        [treeData, expandedNodes],
    )

    const handleNodeExpand = useCallback((node: TreeNodeInfo) => {
        setExpandedNodes(prev => {
            const next = new Set(prev)
            next.add(node.id as string)
            return next
        })
    }, [])

    const handleNodeCollapse = useCallback((node: TreeNodeInfo) => {
        setExpandedNodes(prev => {
            const next = new Set(prev)
            next.delete(node.id as string)
            return next
        })
    }, [])

    return (
        <Card style={{position: 'relative', margin: '8px 16px 16px'}}>
            {(loading || saving) && (
                <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'var(--overlay-bg)'}}>
                    <Spinner/>
                </div>
            )}
            <div style={{padding: '16px 16px 8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                    <span style={{fontWeight: 600, fontSize: 14}}>文件列表</span>
                    <span style={{fontSize: 14, color: '#8a9ba8'}}>{files.length} 个文件</span>
                </div>
            </div>
            <div style={{padding: '0 16px 8px'}}>
                {files.length > 0 ? (
                    <Tree
                        contents={treeContents}
                        onNodeExpand={handleNodeExpand}
                        onNodeCollapse={handleNodeCollapse}
                    />
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: '#a7b6c2'}}>
                        <Icon icon="inbox" size={48} style={{marginBottom: 8}}/>
                        <span>暂无文件数据</span>
                    </div>
                )}
            </div>
            {/* 作品信息表单 */}
            <div style={{padding: '8px 16px 8px'}}>
                <WorkFormList
                    selectedWorks={selectedWorks}
                    onWorksChange={onWorksChange}
                    saving={saving}
                    onSubmit={onSubmit}
                />
            </div>
        </Card>
    )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type {UseWorkEditorReturn}
export default WorkEditorContent
