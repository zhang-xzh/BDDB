"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Card, Collapse, Empty, Flex, Input, Pagination, Select, Space, Spin, Switch, Tag, theme, Typography} from "antd";
import {CheckCircleOutlined, CloseCircleOutlined} from "@ant-design/icons";
import type {TorrentWithVolume} from "@/lib/db";
import {fetchApi} from "@/lib/api";
import {DiscEditorContent, useDiscEditor} from "@/components/DiscEditor";

// ─── Constants & Utilities ────────────────────────────────────────────────────

const PAGE_SIZE = 100

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

function matchesFilters(torrent: TorrentWithVolume, filters: {
    searchText: string; invertSearch: boolean
    filterCategory?: string; filterHasVolumes?: boolean
}): boolean {
    const {searchText, invertSearch, filterCategory, filterHasVolumes} = filters
    if (searchText) {
        const match = torrent.name?.toLowerCase().includes(searchText.toLowerCase())
        if (invertSearch ? match : !match) return false
    }
    if (filterCategory !== undefined && torrent.category !== filterCategory) return false
    if (filterHasVolumes !== undefined && !!torrent.hasVolumes !== filterHasVolumes) return false
    return true
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTorrentListView(torrents: TorrentWithVolume[]) {
    const [searchText, setSearchText] = useState('')
    const [invertSearch, setInvertSearch] = useState(false)
    const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
    const [filterHasVolumes, setFilterHasVolumes] = useState<boolean | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)

    const categories = useMemo(() =>
            Array.from(new Set(torrents.map(t => t.category).filter((c): c is string => Boolean(c)))),
        [torrents])

    const filteredTorrents = useMemo(() =>
            torrents.filter(t => matchesFilters(t, {
                searchText,
                invertSearch,
                filterCategory,
                filterHasVolumes
            })),
        [torrents, searchText, invertSearch, filterCategory, filterHasVolumes])

    const pagedTorrents = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredTorrents.slice(start, start + PAGE_SIZE)
    }, [filteredTorrents, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchText, invertSearch, filterCategory, filterHasVolumes])

    return {
        searchText, setSearchText, invertSearch, setInvertSearch,
        filterCategory, setFilterCategory, filterHasVolumes, setFilterHasVolumes,
        currentPage, setCurrentPage, categories, filteredTorrents, pagedTorrents,
    }
}

function useTorrentEditorPanel({pagedTorrents, editor}: {
    pagedTorrents: TorrentWithVolume[]
    editor: Pick<UseDiscEditorReturn, 'open' | 'hasChanges' | 'handleSubmit'>
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
            const torrent = pagedTorrents.find(t => t.hash === newKey)
            if (torrent) await editor.open(torrent.hash, torrent.name, false)
        }
    }, [activeKey, editor, pagedTorrents])

    const closeForPageChange = useCallback(async () => {
        if (editor.hasChanges()) await editor.handleSubmit()
        setActiveKey(undefined)
    }, [editor])

    return {activeKey, handleCollapseChange, closeForPageChange}
}

// ─── Components ───────────────────────────────────────────────────────────────

const TorrentFiltersBar: React.FC<{
    searchText: string; invertSearch: boolean; filterCategory?: string; filterHasVolumes?: boolean
    categories: string[]; total: number
    onSearchTextChange: (v: string) => void; onInvertSearchChange: (v: boolean) => void
    onCategoryChange: (v: string | undefined) => void; onHasVolumesChange: (v: boolean | undefined) => void
}> = ({
          searchText, invertSearch, filterCategory, filterHasVolumes, categories, total,
          onSearchTextChange, onInvertSearchChange, onCategoryChange, onHasVolumesChange
      }) => {
    const {token} = theme.useToken()
    return (
        <Card>
            <Space wrap>
                <Input.Search
                    value={searchText} onChange={e => onSearchTextChange(e.target.value)}
                    placeholder="搜索种子" style={{width: 250}} allowClear
                    suffix={
                        <Switch checked={invertSearch} onChange={onInvertSearchChange}
                                size="small" checkedChildren="反向" unCheckedChildren="反向"/>
                    }
                />
                <Select allowClear placeholder="类别" style={{width: 250}} value={filterCategory}
                        onChange={onCategoryChange} options={categories.map(c => ({label: c, value: c}))}/>
                <Select allowClear placeholder="是否处理" style={{width: 150}} value={filterHasVolumes}
                        onChange={onHasVolumesChange}
                        options={[{label: '已处理', value: true}, {label: '未处理', value: false}]}/>
                <Typography.Text
                    type="secondary"
                    style={{color: token.colorTextSecondary}}
                >
                    共 {total} 条
                </Typography.Text>
            </Space>
        </Card>
    )
}

const TorrentListHeader: React.FC = () => {
    const {token} = theme.useToken()
    return (
        <Flex align="center" gap={8} style={{
            padding: '12px 16px',
            background: token.colorFillAlter,
        }}>
            <div style={{width: 24, flexShrink: 0}} />
            <Typography.Text
                strong
                style={{
                    width: 56,
                    flexShrink: 0,
                    color: token.colorTextHeading
                }}
            >
                卷
            </Typography.Text>
            <Typography.Text
                strong
                style={{flex: 1, color: token.colorTextHeading}}
            >
                名称
            </Typography.Text>
            <Typography.Text
                strong
                style={{
                    width: 200,
                    flexShrink: 0,
                    color: token.colorTextHeading
                }}
            >
                类别
            </Typography.Text>
            <Typography.Text
                strong
                style={{
                    width: 72,
                    flexShrink: 0,
                    textAlign: 'right',
                    color: token.colorTextHeading
                }}
            >
                大小
            </Typography.Text>
        </Flex>
    )
}

const TorrentRowLabel: React.FC<{ torrent: TorrentWithVolume; isExpanded: boolean }> = ({torrent, isExpanded}) => {
    const {token} = theme.useToken()
    // 只在展开时阻止行点击冒泡（防止误触收起），收起时允许点击展开
    return (
        <div onClick={(e) => isExpanded && e.stopPropagation()}>
            <Flex align="center" gap={8} style={{width: '100%'}}>
                <Flex style={{width: 56, flexShrink: 0}}>
                    {torrent.hasVolumes
                        ? <Tag icon={<CheckCircleOutlined/>} color="success" style={{margin: 0}}>{torrent.volumeCount}</Tag>
                        : <Tag icon={<CloseCircleOutlined/>} color="default" style={{margin: 0}}/>}
                </Flex>
                <Typography.Text
                    ellipsis
                    style={{flex: 1, color: token.colorText}}
                >
                    {torrent.name}
                </Typography.Text>
                <Flex style={{width: 200, flexShrink: 0, overflow: 'hidden'}}>
                    {torrent.category
                        ? <Tag color="blue" style={{margin: 0, maxWidth: '100%'}}>{torrent.category}</Tag>
                        : <Typography.Text
                            type="secondary"
                            style={{color: token.colorTextSecondary}}
                        >
                            —
                        </Typography.Text>}
                </Flex>
                <Typography.Text
                    type="secondary"
                    style={{
                        width: 72,
                        flexShrink: 0,
                        textAlign: 'right',
                        fontSize: 12,
                        color: token.colorTextSecondary
                    }}
                >
                    {formatSize(torrent.size ?? 0)}
                </Typography.Text>
            </Flex>
        </div>
    )
}

type EditorProps = Pick<UseDiscEditorReturn,
    | 'loading' | 'saving' | 'files' | 'treeData' | 'nodeData' | 'defaultExpandedKeys'
    | 'selectedVolumes' | 'visibleVolumes' | 'loadMoreVolumes' | 'worksCount' | 'setWorksCount'
    | 'volumeForms' | 'updateVolumeForm' | 'onVolumeChange' | 'onSharedVolumeChange' | 'onToggleShared'
    | 'getNodeVolume' | 'getNodeShared' | 'getNodeSharedVolumes'
    | 'resetVolumeAssignments' | 'deleteVolume' | 'handleSubmit'
>

const TorrentCollapseList: React.FC<{
    pagedTorrents: TorrentWithVolume[]
    activeKey: string | undefined
    onChange: (key: string | string[]) => Promise<void>
    editor: EditorProps
}> = ({pagedTorrents, activeKey, onChange, editor}) => {
    const collapseItems = useMemo(() =>
            pagedTorrents.map(torrent => ({
                key: torrent.hash,
                label: <TorrentRowLabel torrent={torrent} isExpanded={activeKey === torrent.hash}/>,
                children: activeKey === torrent.hash ? (
                    <DiscEditorContent
                        loading={editor.loading} saving={editor.saving} files={editor.files}
                        treeData={editor.treeData} nodeData={editor.nodeData}
                        defaultExpandedKeys={editor.defaultExpandedKeys}
                        selectedVolumes={editor.selectedVolumes} visibleVolumes={editor.visibleVolumes}
                        loadMoreVolumes={editor.loadMoreVolumes} worksCount={editor.worksCount}
                        setWorksCount={editor.setWorksCount} volumeForms={editor.volumeForms}
                        onVolumeFormChange={editor.updateVolumeForm} onVolumeChange={editor.onVolumeChange}
                        onSharedVolumeChange={editor.onSharedVolumeChange} onToggleShared={editor.onToggleShared}
                        getNodeVolume={editor.getNodeVolume} getNodeShared={editor.getNodeShared}
                        getNodeSharedVolumes={editor.getNodeSharedVolumes}
                        resetVolumeAssignments={editor.resetVolumeAssignments} deleteVolume={editor.deleteVolume}
                        onSubmit={editor.handleSubmit}
                    />
                ) : null,
            })),
        [pagedTorrents, activeKey, editor])

    return (
        <Collapse
            expandIconPlacement={"start"}
            bordered={false} accordion activeKey={activeKey} onChange={onChange}
            items={collapseItems}
        />
    )
}

const TorrentPagination: React.FC<{
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

type UseDiscEditorReturn = ReturnType<typeof useDiscEditor>

const TorrentsPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [torrents, setTorrents] = useState<TorrentWithVolume[]>([]);

    const fetchTorrents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi<string>("/api/qb/torrents/info");
            if (res.success && res.data) setTorrents(JSON.parse(res.data));
        } catch (error) {
            console.error("获取种子列表失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const editor = useDiscEditor(fetchTorrents);
    const {
        searchText,
        setSearchText,
        invertSearch,
        setInvertSearch,
        filterCategory,
        setFilterCategory,
        filterHasVolumes,
        setFilterHasVolumes,
        currentPage,
        setCurrentPage,
        categories,
        filteredTorrents,
        pagedTorrents,
    } = useTorrentListView(torrents);
    const {activeKey, handleCollapseChange, closeForPageChange} = useTorrentEditorPanel({pagedTorrents, editor});

    useEffect(() => {
        fetchTorrents();
    }, [fetchTorrents]);

    if (filteredTorrents.length === 0 && !loading) {
        return (
            <Card>
                <Empty description="暂无种子数据"/>
            </Card>
        )
    }

    return (
        <Flex vertical gap={16}>
            <TorrentFiltersBar
                searchText={searchText}
                invertSearch={invertSearch}
                filterCategory={filterCategory}
                filterHasVolumes={filterHasVolumes}
                categories={categories}
                total={filteredTorrents.length}
                onSearchTextChange={setSearchText}
                onInvertSearchChange={setInvertSearch}
                onCategoryChange={setFilterCategory}
                onHasVolumesChange={setFilterHasVolumes}
            />
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <TorrentListHeader/>
                    <TorrentCollapseList
                        pagedTorrents={pagedTorrents}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        editor={editor}
                    />
                </Card>
            </Spin>
            <TorrentPagination
                currentPage={currentPage}
                total={filteredTorrents.length}
                onPageChange={(page) => {
                    if (activeKey) closeForPageChange();
                    setCurrentPage(page);
                }}
            />
        </Flex>
    );
};

export default TorrentsPage;
