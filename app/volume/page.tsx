"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Card, Collapse, Empty, Flex, Input, Pagination, Select, Space, Spin, Switch, Tag, theme, Tree, Typography} from "antd";
import {CheckCircleOutlined, CloseCircleOutlined} from "@ant-design/icons";
import type {Volume} from "@/lib/db";
import {fetchApi} from "@/lib/api";
import type {DataNode} from 'antd/es/tree';
import {useMediaEditor, type UseMediaEditorReturn} from '@/components/MediaEditor';
import MediaEditorContent, {type MediaEditorContentProps} from '@/components/MediaEditor';

// ─── Constants & Utilities ────────────────────────────────────────────────────

const PAGE_SIZE = 100

function formatCatalogNo(catalogNo: string): string {
    return catalogNo || '无编号'
}

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

interface VolumeWithMedia extends Volume {
    mediaCount?: number
}

function matchesFilters(volume: VolumeWithMedia, filters: {
    searchCatalogNo: string; invertCatalogNo: boolean
    searchTitle: string; invertTitle: boolean
    filterHasMedia?: boolean
}): boolean {
    const {searchCatalogNo, invertCatalogNo, searchTitle, invertTitle, filterHasMedia} = filters
    if (searchCatalogNo) {
        const match = volume.catalog_no?.toLowerCase().includes(searchCatalogNo.toLowerCase())
        if (invertCatalogNo ? match : !match) return false
    }
    if (searchTitle) {
        const match = volume.volume_name?.toLowerCase().includes(searchTitle.toLowerCase())
        if (invertTitle ? match : !match) return false
    }
    if (filterHasMedia !== undefined) {
        const hasMedia = (volume.mediaCount ?? 0) > 0
        if (hasMedia !== filterHasMedia) return false
    }
    return true
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useVolumeListView(volumes: VolumeWithMedia[]) {
    const [searchCatalogNo, setSearchCatalogNo] = useState('')
    const [invertCatalogNo, setInvertCatalogNo] = useState(false)
    const [searchTitle, setSearchTitle] = useState('')
    const [invertTitle, setInvertTitle] = useState(false)
    const [filterHasMedia, setFilterHasMedia] = useState<boolean | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)

    const filteredVolumes = useMemo(() =>
            volumes.filter(v => matchesFilters(v, {
                searchCatalogNo,
                invertCatalogNo,
                searchTitle,
                invertTitle,
                filterHasMedia
            })),
        [volumes, searchCatalogNo, invertCatalogNo, searchTitle, invertTitle, filterHasMedia])

    const pagedVolumes = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredVolumes.slice(start, start + PAGE_SIZE)
    }, [filteredVolumes, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchCatalogNo, invertCatalogNo, searchTitle, invertTitle, filterHasMedia])

    return {
        searchCatalogNo, setSearchCatalogNo, invertCatalogNo, setInvertCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasMedia, setFilterHasMedia,
        currentPage, setCurrentPage, filteredVolumes, pagedVolumes,
    }
}

function useVolumeEditorPanel({pagedVolumes, editor}: {
    pagedVolumes: VolumeWithMedia[]
    editor: Pick<UseMediaEditorReturn, 'open' | 'hasChanges' | 'handleSubmit'>
}) {
    const [activeKey, setActiveKey] = useState<string | undefined>(undefined)

    const handleCollapseChange = useCallback(async (key: string | string[]) => {
        const newKey = Array.isArray(key) ? key[0] : key || undefined

        // 点击已展开的项 → 保存并收起
        if (activeKey && newKey === activeKey) {
            if (editor.hasChanges()) await editor.handleSubmit()
            setActiveKey(undefined)
            return
        }

        // 切换到新项 → 保存当前项，打开新项
        if (activeKey && activeKey !== newKey) {
            if (editor.hasChanges()) await editor.handleSubmit()
        }

        setActiveKey(newKey)
        if (newKey) {
            const volume = pagedVolumes.find(v => v.id === newKey)
            if (volume) await editor.open(volume.id, volume.volume_no, volume.catalog_no)
        }
    }, [activeKey, editor, pagedVolumes])

    const closeForPageChange = useCallback(async () => {
        if (editor.hasChanges()) await editor.handleSubmit()
        setActiveKey(undefined)
    }, [editor])

    return {activeKey, handleCollapseChange, closeForPageChange}
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileItem {
    id: string;
    name: string;
    size: number | null;
    progress: number | null;
}

function buildTree(files: FileItem[]) {
    const root: Record<string, any> = {}
    files.forEach(file => {
        const parts = file.name.split('/')
        let current = root
        parts.forEach((part: string, index: number) => {
            if (!current[part]) {
                current[part] = index === parts.length - 1 ? {_file: file} : {}
            }
            current = current[part]
        })
    })

    const convertToTreeData = (node: any, path: string[] = []): any[] => {
        const result: any[] = []
        for (const key of Object.keys(node)) {
            if (key === '_file') continue
            const child = node[key]
            const nodeKey = path.join('/') + (path.length > 0 ? '/' : '') + key
            if (child._file) {
                result.push({key: nodeKey, title: `${key} (${formatSize(child._file.size ?? 0)})`, isLeaf: true})
            } else {
                result.push({key: nodeKey, title: key, children: convertToTreeData(child, [...path, key]), isLeaf: false})
            }
        }
        return result
    }

    return convertToTreeData(root)
}

// ─── Components ───────────────────────────────────────────────────────────────

const VolumeFiltersBar: React.FC<{
    searchCatalogNo: string; invertCatalogNo: boolean
    searchTitle: string; invertTitle: boolean
    filterHasMedia?: boolean
    total: number
    onSearchCatalogNoChange: (v: string) => void
    onInvertCatalogNoChange: (v: boolean) => void
    onSearchTitleChange: (v: string) => void
    onInvertTitleChange: (v: boolean) => void
    onFilterHasMediaChange: (v: boolean | undefined) => void
}> = ({
    searchCatalogNo, invertCatalogNo, searchTitle, invertTitle, filterHasMedia, total,
    onSearchCatalogNoChange, onInvertCatalogNoChange, onSearchTitleChange, onInvertTitleChange, onFilterHasMediaChange
}) => {
    const {token} = theme.useToken()
    return (
        <Card>
            <Space wrap>
                <Input.Search
                    value={searchCatalogNo}
                    onChange={e => onSearchCatalogNoChange(e.target.value)}
                    placeholder="搜索编号"
                    style={{width: 200}}
                    allowClear
                />
                <Input.Search
                    value={searchTitle}
                    onChange={e => onSearchTitleChange(e.target.value)}
                    placeholder="搜索标题"
                    style={{width: 300}}
                    allowClear
                    suffix={
                        <Switch
                            checked={invertTitle}
                            onChange={onInvertTitleChange}
                            size="small"
                            checkedChildren="反向"
                            unCheckedChildren="反向"
                        />
                    }
                />
                <Select
                    allowClear
                    placeholder="是否已添加媒体"
                    style={{width: 150}}
                    value={filterHasMedia}
                    onChange={onFilterHasMediaChange}
                    options={[
                        {label: '已添加', value: true},
                        {label: '未添加', value: false}
                    ]}
                />
                <Typography.Text type="secondary" style={{color: token.colorTextSecondary}}>
                    共 {total} 条
                </Typography.Text>
            </Space>
        </Card>
    )
}

const VolumeListHeader: React.FC = () => {
    const {token} = theme.useToken()
    return (
        <Flex align="center" gap={8} style={{padding: '12px 16px', background: token.colorFillAlter}}>
            <div style={{width: 24, flexShrink: 0}} />
            <Typography.Text strong style={{width: 56, flexShrink: 0, color: token.colorTextHeading}}>
                媒体
            </Typography.Text>
            <Typography.Text strong style={{width: 120, flexShrink: 0, color: token.colorTextHeading}}>
                编号
            </Typography.Text>
            <Typography.Text strong style={{flex: 1, color: token.colorTextHeading}}>
                名称
            </Typography.Text>
        </Flex>
    )
}

const VolumeRowLabel: React.FC<{ volume: VolumeWithMedia; isExpanded: boolean }> = ({volume, isExpanded}) => {
    const {token} = theme.useToken()
    // 只在展开时阻止行点击冒泡（防止误触收起），收起时允许点击展开
    return (
        <div onClick={(e) => isExpanded && e.stopPropagation()}>
            <Flex align="center" gap={8} style={{width: '100%'}}>
                <Flex style={{width: 56, flexShrink: 0}}>
                    {volume.mediaCount && volume.mediaCount > 0
                        ? <Tag icon={<CheckCircleOutlined/>} color="success" style={{margin: 0}}>{volume.mediaCount}</Tag>
                        : <Tag icon={<CloseCircleOutlined/>} color="default" style={{margin: 0}}/>}
                </Flex>
                <Typography.Text style={{width: 120, flexShrink: 0, color: token.colorText, fontFamily: 'monospace'}}>
                    {formatCatalogNo(volume.catalog_no)}
                </Typography.Text>
                <Typography.Text ellipsis style={{flex: 1, color: token.colorText}}>
                    {volume.volume_name || '无标题'}
                </Typography.Text>
            </Flex>
        </div>
    )
}

const VolumeFileTree: React.FC<{ volumeId: string }> = ({volumeId}) => {
    const [files, setFiles] = useState<FileItem[] | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        setFiles(null)
        fetchApi<string>(`/api/volumes/${volumeId}/files`)
            .then(res => {
                if (res.success && res.data) setFiles(JSON.parse(res.data))
                else setFiles([])
            })
            .catch(() => setFiles([]))
            .finally(() => setLoading(false))
    }, [volumeId])

    const treeData = useMemo(() => (files ? buildTree(files) : []), [files])

    if (loading) return <Spin size="small" style={{margin: 16, display: 'block'}}/>
    if (!files || files.length === 0) return <Empty description="无文件" style={{margin: 16}}/>

    return (
        <Card size="small" title={
            <Space>
                <span>文件列表</span>
                <span style={{color: '#999', fontWeight: 'normal'}}>{files.length} 个文件</span>
            </Space>
        } styles={{body: {padding: 12}}}>
            <Tree<DataNode>
                treeData={treeData}
                defaultExpandedKeys={[]}
                titleRender={(node) => (
                    <Typography.Text ellipsis={{tooltip: node.title as string}}>
                        {node.title as string}
                    </Typography.Text>
                )}
            />
        </Card>
    )
}

const VolumeCollapseList: React.FC<{
    pagedVolumes: VolumeWithMedia[]
    activeKey: string | undefined
    onChange: (key: string | string[]) => Promise<void>
    editor: MediaEditorContentProps
}> = ({pagedVolumes, activeKey, onChange, editor}) => {
    const collapseItems = useMemo(() =>
        pagedVolumes.map(volume => ({
            key: volume.id,
            label: <VolumeRowLabel volume={volume} isExpanded={activeKey === volume.id}/>,
            children: activeKey === volume.id ? (
                <MediaEditorContent {...editor} />
            ) : null,
        })),
        [pagedVolumes, activeKey, editor])

    return (
        <Collapse
            expandIconPlacement="start"
            bordered={false}
            accordion
            activeKey={activeKey}
            onChange={onChange}
            items={collapseItems}
        />
    )
}

const VolumePagination: React.FC<{
    currentPage: number; total: number; onPageChange: (page: number) => void
}> = ({currentPage, total, onPageChange}) => {
    if (total <= PAGE_SIZE) return null
    return (
        <Flex justify="flex-end">
            <Pagination
                current={currentPage} pageSize={PAGE_SIZE} total={total}
                onChange={onPageChange} showQuickJumper showSizeChanger={false}
            />
        </Flex>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const VolumePage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [volumes, setVolumes] = useState<VolumeWithMedia[]>([]);

    const refreshVolumes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi<string>("/api/volumes");
            if (res.success && res.data) {
                const loadedVolumes = JSON.parse(res.data) as Volume[];
                const volumesWithMedia = await Promise.all(
                    loadedVolumes.map(async (v) => {
                        const mediaRes = await fetchApi<string>(`/api/volumes/${v.id}/medias`);
                        let mediaCount = 0;
                        if (mediaRes?.success && mediaRes.data) {
                            const medias = JSON.parse(mediaRes.data) as any[];
                            mediaCount = medias.length;
                        }
                        return {...v, mediaCount} as VolumeWithMedia;
                    })
                );
                setVolumes(volumesWithMedia);
            }
        } catch (err) {
            console.error("获取卷数据失败:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const {
        searchCatalogNo, setSearchCatalogNo, invertCatalogNo, setInvertCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasMedia, setFilterHasMedia,
        currentPage, setCurrentPage, filteredVolumes, pagedVolumes,
    } = useVolumeListView(volumes);

    const editor = useMediaEditor(refreshVolumes);
    const {activeKey, handleCollapseChange, closeForPageChange} = useVolumeEditorPanel({pagedVolumes, editor});

    useEffect(() => {
        refreshVolumes();
    }, [refreshVolumes]);

    const hasActiveFilters = searchCatalogNo || searchTitle || filterHasMedia !== undefined

    if (filteredVolumes.length === 0 && !loading) {
        return (
            <Flex vertical gap={16}>
                <VolumeFiltersBar
                    searchCatalogNo={searchCatalogNo}
                    invertCatalogNo={invertCatalogNo}
                    searchTitle={searchTitle}
                    invertTitle={invertTitle}
                    filterHasMedia={filterHasMedia}
                    total={0}
                    onSearchCatalogNoChange={setSearchCatalogNo}
                    onInvertCatalogNoChange={setInvertCatalogNo}
                    onSearchTitleChange={setSearchTitle}
                    onInvertTitleChange={setInvertTitle}
                    onFilterHasMediaChange={setFilterHasMedia}
                />
                <Card>
                    <Empty description={hasActiveFilters ? "无匹配结果" : "暂无卷数据"} />
                </Card>
            </Flex>
        )
    }

    return (
        <Flex vertical gap={16}>
            <VolumeFiltersBar
                searchCatalogNo={searchCatalogNo}
                invertCatalogNo={invertCatalogNo}
                searchTitle={searchTitle}
                invertTitle={invertTitle}
                filterHasMedia={filterHasMedia}
                total={filteredVolumes.length}
                onSearchCatalogNoChange={setSearchCatalogNo}
                onInvertCatalogNoChange={setInvertCatalogNo}
                onSearchTitleChange={setSearchTitle}
                onInvertTitleChange={setInvertTitle}
                onFilterHasMediaChange={setFilterHasMedia}
            />
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <VolumeListHeader/>
                    <VolumeCollapseList
                        pagedVolumes={pagedVolumes}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        editor={{
                            loading: editor.loading,
                            saving: editor.saving,
                            files: editor.files,
                            treeData: editor.treeData,
                            nodeData: editor.nodeData,
                            defaultExpandedKeys: editor.defaultExpandedKeys,
                            selectedMedias: editor.selectedMedias,
                            visibleMedias: editor.visibleMedias,
                            loadMoreMedias: editor.loadMoreMedias,
                            mediaForms: editor.mediaForms,
                            onMediaNoChange: editor.onMediaNoChange,
                            onSharedMediaChange: editor.onSharedMediaChange,
                            onToggleShared: editor.onToggleShared,
                            getNodeMediaNo: editor.getNodeMediaNo,
                            getNodeShared: editor.getNodeShared,
                            getNodeSharedMedias: editor.getNodeSharedMedias,
                            getComputedNodeValue: editor.getComputedNodeValue,
                            updateMediaForm: editor.updateMediaForm,
                            resetMediaAssignments: editor.resetMediaAssignments,
                            deleteMedia: editor.deleteMedia,
                            onSubmit: editor.handleSubmit,
                        }}
                    />
                </Card>
            </Spin>
            <VolumePagination
                currentPage={currentPage}
                total={filteredVolumes.length}
                onPageChange={(page) => {
                    closeForPageChange();
                    setCurrentPage(page);
                }}
            />
        </Flex>
    );
};

export default VolumePage;
