'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {App, Button, Card, Descriptions, Empty, Flex, Select, Space, Spin, Tag, Typography} from 'antd'
import {EditOutlined, LinkOutlined, SaveOutlined} from '@ant-design/icons'
import type {DefaultOptionType} from 'antd/es/select'
import type {DataNode} from 'antd/es/tree'
import {fetchApi, postApi} from '@/lib/api'
import {type BangumiSearchResult, type BangumiSubject, formatDate, getBangumiSubject, getTypeName, searchBangumi} from '@/lib/bangumi'
import type {FileItem} from '@/lib/mongodb'
import {buildTree, SPACING} from '@/lib/utils'
import {FileTreeCard} from '@/components/EditorShared'

type SearchResultItem = BangumiSearchResult['list'][number]
type WorkCandidate = BangumiSubject | SearchResultItem

interface WorkInfo {
    volumeId: string
    volumeNo?: number
    catalogNo?: string
}

export interface WorkEditorContentProps {
    loading: boolean
    saving: boolean
    volumeInfo: WorkInfo | null
    files: FileItem[]
    treeData: DataNode[]
    defaultExpandedKeys: string[]
    selectedWorks: BangumiSubject[]
    onWorksChange: (works: WorkCandidate[]) => void
    onSubmit?: (works?: WorkCandidate[]) => Promise<boolean>
}

interface UseWorkEditorReturn extends WorkEditorContentProps {
    open: (volumeId: string, volumeNo?: number, catalogNo?: string) => Promise<void>
    hasChanges: () => boolean
    handleSubmit: () => Promise<boolean>
}

function sameWorkSelection(left: Array<{ id: number }>, right: Array<{ id: number }>): boolean {
    if (left.length !== right.length) return false
    const rightIds = new Set(right.map(item => item.id))
    return left.every(item => rightIds.has(item.id))
}

export function useWorkEditor(onSave?: () => void): UseWorkEditorReturn {
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [volumeInfo, setVolumeInfo] = useState<WorkInfo | null>(null)
    const [files, setFiles] = useState<FileItem[]>([])
    const [treeData, setTreeData] = useState<DataNode[]>([])
    const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
    const [selectedWorks, setSelectedWorks] = useState<BangumiSubject[]>([])

    const initialWorksRef = useRef<BangumiSubject[]>([])

    const hasChanges = useCallback(() => !sameWorkSelection(initialWorksRef.current, selectedWorks), [selectedWorks])

    const open = useCallback(async (volumeId: string, volumeNo?: number, catalogNo?: string) => {
        setVolumeInfo({volumeId, volumeNo, catalogNo})
        setLoading(true)
        try {
            const [filesResult, worksResult] = await Promise.all([
                fetchApi<FileItem[]>(`/api/volumes/${volumeId}/files`),
                fetchApi<BangumiSubject[]>(`/api/volumes/${volumeId}/works`),
            ])

            const loadedFiles = filesResult.success && filesResult.data ? filesResult.data : []
            setFiles(loadedFiles)

            if (loadedFiles.length > 0) {
                const built = buildTree(loadedFiles)
                setTreeData(built.treeData as DataNode[])
                setDefaultExpandedKeys(built.defaultExpandedKeys)
            } else {
                setTreeData([])
                setDefaultExpandedKeys([])
            }

            const loadedWorks = worksResult.success && worksResult.data ? worksResult.data : []
            setSelectedWorks(loadedWorks)
            initialWorksRef.current = loadedWorks
        } catch (error) {
            console.error('[WorkEditor] 加载数据失败:', error)
            setFiles([])
            setTreeData([])
            setDefaultExpandedKeys([])
            setSelectedWorks([])
            initialWorksRef.current = []
        } finally {
            setLoading(false)
        }
    }, [])

    const handleSubmit = useCallback(async () => {
        if (volumeInfo == null) return false
        setSaving(true)
        try {
            const result = await postApi(`/api/volumes/${volumeInfo.volumeId}/works`, {
                works: selectedWorks.length > 0 ? selectedWorks : null,
            })

            if (!result.success) {
                return false
            }

            initialWorksRef.current = selectedWorks
            onSave?.()
            return true
        } catch (error) {
            console.error('[WorkEditor] 保存失败:', error)
            return false
        } finally {
            setSaving(false)
        }
    }, [onSave, selectedWorks, volumeInfo])

    return {
        loading,
        saving,
        volumeInfo,
        files,
        treeData,
        defaultExpandedKeys,
        selectedWorks,
        onWorksChange: (works) => setSelectedWorks(works as BangumiSubject[]),
        onSubmit: async (works) => {
            const nextWorks = (works ?? selectedWorks) as BangumiSubject[]
            setSelectedWorks(nextWorks)
            if (volumeInfo == null) return false

            setSaving(true)
            try {
                const result = await postApi(`/api/volumes/${volumeInfo.volumeId}/works`, {
                    works: nextWorks.length > 0 ? nextWorks : null,
                })
                if (!result.success) {
                    return false
                }
                initialWorksRef.current = nextWorks
                onSave?.()
                return true
            } catch (error) {
                console.error('[WorkEditor] 保存失败:', error)
                return false
            } finally {
                setSaving(false)
            }
        },
        open,
        hasChanges,
        handleSubmit,
    }
}

function WorkDetail({work}: { work: BangumiSubject }) {
    return (
        <Card size="small">
            <Flex vertical gap={12}>
                <Flex vertical gap={4}>
                    <Typography.Title level={5} style={{margin: 0}}>
                        {work.name_cn || work.name}
                    </Typography.Title>
                    {work.name_cn && work.name !== work.name_cn && (
                        <Typography.Text type="secondary">{work.name}</Typography.Text>
                    )}
                </Flex>

                <Descriptions size="small" column={1} items={[
                    {key: 'type', label: '类型', children: getTypeName(work.type)},
                    {key: 'eps', label: '话数', children: work.eps > 0 ? `${work.eps} 话` : '-'},
                    {key: 'air_date', label: '放送日期', children: formatDate(work.air_date)},
                    {key: 'rating', label: '评分', children: work.rating?.score > 0 ? `${work.rating.score} / 10 (${work.rating.total} 人评分)` : '-'},
                    {key: 'rank', label: '排名', children: work.rank > 0 ? `#${work.rank}` : '-'},
                    {key: 'summary', label: '简介', children: work.summary || '-'},
                    {
                        key: 'url',
                        label: 'Bangumi',
                        children: work.url ? (
                            <Typography.Link href={work.url} target="_blank" rel="noreferrer">
                                {work.url}
                            </Typography.Link>
                        ) : '-'
                    },
                ]}/>

                <Flex wrap gap={8}>
                    <Tag>想看: {work.collection?.wish ?? 0}</Tag>
                    <Tag>看过: {work.collection?.collect ?? 0}</Tag>
                    <Tag>在看: {work.collection?.doing ?? 0}</Tag>
                    <Tag>搁置: {work.collection?.on_hold ?? 0}</Tag>
                    <Tag>抛弃: {work.collection?.dropped ?? 0}</Tag>
                </Flex>
            </Flex>
        </Card>
    )
}

function WorkReadOnlyView({works, onEdit}: { works: BangumiSubject[]; onEdit: () => void }) {
    return (
        <Flex vertical gap={12}>
            {works.map((work, index) => (
                <React.Fragment key={work.id}>
                    <WorkDetail work={work}/>
                </React.Fragment>
            ))}
            <Button icon={<EditOutlined/>} onClick={onEdit} style={{width: 120}}>
                更换作品
            </Button>
        </Flex>
    )
}

function WorkEditView({
                          selectedWorks,
                          tempWorks,
                          onTempWorksChange,
                          onSave,
                          onCancel,
                          saving,
                      }: {
    selectedWorks: BangumiSubject[]
    tempWorks: WorkCandidate[]
    onTempWorksChange: (works: WorkCandidate[]) => void
    onSave: () => void
    onCancel?: () => void
    saving: boolean
}) {
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
    const [searching, setSearching] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current)
    }, [])

    const options = useMemo<DefaultOptionType[]>(() => {
        const seen = new Set<number>()
        return [...tempWorks, ...searchResults].filter(item => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
        }).map(item => ({
            label: (
                <Flex vertical gap={2}>
                    <Typography.Text>{item.name_cn || item.name}</Typography.Text>
                    {item.name_cn && item.name !== item.name_cn && (
                        <Typography.Text type="secondary" style={{fontSize: 12}}>{item.name}</Typography.Text>
                    )}
                </Flex>
            ),
            value: item.id,
            item,
        }))
    }, [searchResults, tempWorks])

    const isChanged = useMemo(() => !sameWorkSelection(selectedWorks, tempWorks), [selectedWorks, tempWorks])

    const handleSearch = useCallback((value: string) => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (value.trim().length < 2) {
            setSearchResults([])
            return
        }

        timerRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const result = await searchBangumi(value, 2)
                setSearchResults(result.list)
            } catch (error) {
                console.error('[WorkEditor] 搜索失败:', error)
            } finally {
                setSearching(false)
            }
        }, 250)
    }, [])

    return (
        <Flex vertical gap={12}>
            <Select
                mode="multiple"
                showSearch
                allowClear
                filterOption={false}
                style={{width: '100%'}}
                placeholder="输入日文或中文标题搜索作品"
                value={tempWorks.map(work => work.id)}
                options={options}
                notFoundContent={searching ? <Spin size="small"/> : null}
                onSearch={handleSearch}
                onChange={(values, selectedOptions) => {
                    const optionList = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions]
                    const nextWorks = values.map(value => {
                        const existing = tempWorks.find(work => work.id === value)
                        if (existing) return existing
                        const option = optionList.find(item => Number(item?.value) === value) as (DefaultOptionType & { item?: WorkCandidate }) | undefined
                        return option?.item
                    }).filter((item): item is WorkCandidate => item != null)
                    onTempWorksChange(nextWorks)
                }}
                optionRender={(option) => option.data.label as React.ReactNode}
            />

            {tempWorks.length > 0 && (
                <Card size="small">
                    <Flex vertical gap={8}>
                        {tempWorks.map(work => (
                            <Flex key={work.id} justify="space-between" align="center" gap={12}>
                                <Flex vertical gap={2} style={{minWidth: 0, flex: 1}}>
                                    <Typography.Text strong ellipsis>{work.name_cn || work.name}</Typography.Text>
                                    <Typography.Text type="secondary" style={{fontSize: 12}}>
                                        {getTypeName(work.type)} {work.air_date ? `· ${formatDate(work.air_date)}` : ''}
                                    </Typography.Text>
                                </Flex>
                                {'url' in work && work.url && (
                                    <Typography.Link href={work.url} target="_blank" rel="noreferrer">
                                        <LinkOutlined/>
                                    </Typography.Link>
                                )}
                            </Flex>
                        ))}
                    </Flex>
                </Card>
            )}

            <Flex gap={8}>
                {onCancel && (
                    <Button onClick={onCancel} disabled={saving}>
                        取消
                    </Button>
                )}
                <Button type="primary" icon={<SaveOutlined/>} onClick={onSave} disabled={!isChanged || saving} loading={saving}>
                    保存
                </Button>
            </Flex>
        </Flex>
    )
}

function WorkFormList({
                          selectedWorks,
                          onWorksChange,
                          saving = false,
                          onSubmit,
                      }: {
    selectedWorks: BangumiSubject[]
    onWorksChange: (works: WorkCandidate[]) => void
    saving?: boolean
    onSubmit?: (works?: WorkCandidate[]) => Promise<boolean>
}) {
    const {message} = App.useApp()
    const [isEditing, setIsEditing] = useState(false)
    const [tempWorks, setTempWorks] = useState<WorkCandidate[]>([])

    useEffect(() => {
        if (selectedWorks.length === 0) {
            setIsEditing(true)
            setTempWorks([])
            return
        }

        setIsEditing(false)
        setTempWorks(selectedWorks)
    }, [selectedWorks])

    const handleSave = useCallback(async () => {
        try {
            const fullSubjects: BangumiSubject[] = []
            for (const tempWork of tempWorks) {
                try {
                    fullSubjects.push(await getBangumiSubject(tempWork.id, 'large'))
                } catch (error) {
                    console.error(`[WorkEditor] 获取条目 ${tempWork.id} 详情失败:`, error)
                    fullSubjects.push(tempWork as BangumiSubject)
                }
            }

            onWorksChange(fullSubjects)
            if (onSubmit) {
                const result = await onSubmit(fullSubjects)
                if (result) {
                    message.success('作品关联已更新')
                    setIsEditing(false)
                } else {
                    message.error('作品保存失败')
                }
                return
            }

            setIsEditing(false)
        } catch (error) {
            console.error('[WorkEditor] 保存失败:', error)
            message.error('作品保存失败')
        }
    }, [message, onSubmit, onWorksChange, tempWorks])

    return (
        <Card size="small" title="作品信息">
            {isEditing ? (
                <WorkEditView
                    selectedWorks={selectedWorks}
                    tempWorks={tempWorks}
                    onTempWorksChange={setTempWorks}
                    onSave={handleSave}
                    onCancel={selectedWorks.length > 0 ? () => {
                        setTempWorks(selectedWorks)
                        setIsEditing(false)
                    } : undefined}
                    saving={saving}
                />
            ) : selectedWorks.length > 0 ? (
                <WorkReadOnlyView works={selectedWorks} onEdit={() => {
                    setTempWorks(selectedWorks)
                    setIsEditing(true)
                }}/>
            ) : (
                <Empty description="暂无关联作品" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
            )}
        </Card>
    )
}

export function WorkEditorContent({
                                      loading,
                                      saving,
                                      volumeInfo,
                                      files,
                                      treeData,
                                      defaultExpandedKeys,
                                      selectedWorks,
                                      onWorksChange,
                                      onSubmit,
                                  }: WorkEditorContentProps) {
    return (
        <Spin spinning={loading || saving}>
            <Space direction="vertical" style={{width: '100%', paddingTop: SPACING.sm}} size={SPACING.md}>
                <FileTreeCard
                    files={files}
                    treeData={treeData}
                    defaultExpandedKeys={defaultExpandedKeys}
                    blockNode
                    selectable={false}
                    titleSuffix={volumeInfo?.catalogNo || undefined}
                />
                <WorkFormList
                    selectedWorks={selectedWorks}
                    onWorksChange={onWorksChange}
                    saving={saving}
                    onSubmit={onSubmit}
                />
            </Space>
        </Spin>
    )
}

export default WorkEditorContent