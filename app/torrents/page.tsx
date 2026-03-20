"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Card, Empty, Flex, Input, Select, Space, Spin, Switch, Tag, theme, Typography} from "antd";
import {CheckCircleOutlined, CloseCircleOutlined} from "@ant-design/icons";
import type {TorrentWithVolume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import {DiscEditorContent, useDiscEditor} from "@/components/DiscEditor";
import {PAGE_SIZE, SPACING} from "@/lib/utils";
import ListPagination from "@/components/ListPagination";
import {useEditorPanel} from "@/components/useEditorPanel";
import CollapsePageList, {ExpandBlocker} from "@/components/CollapsePageList";

function matchesFilters(torrent: TorrentWithVolume, filters: {
    searchText: string; invertSearch: boolean
    filterCategory?: string; filterHasVolumes?: boolean; filterState?: string
}): boolean {
    const {searchText, invertSearch, filterCategory, filterHasVolumes, filterState} = filters
    if (searchText) {
        const match = torrent.name?.toLowerCase().includes(searchText.toLowerCase())
        if (invertSearch ? match : !match) return false
    }
    if (filterCategory !== undefined && torrent.category !== filterCategory) return false
    if (filterHasVolumes !== undefined && !!torrent.hasVolumes !== filterHasVolumes) return false
    return !(filterState !== undefined && torrent.state !== filterState);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTorrentListView(torrents: TorrentWithVolume[]) {
    const [searchText, setSearchText] = useState('')
    const [invertSearch, setInvertSearch] = useState(false)
    const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
    const [filterHasVolumes, setFilterHasVolumes] = useState<boolean | undefined>(undefined)
    const [filterState, setFilterState] = useState<string | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)

    const categories = useMemo(() =>
            Array.from(new Set(torrents.map(t => t.category).filter((c): c is string => Boolean(c)))),
        [torrents])

    const states = useMemo(() =>
            Array.from(new Set(torrents.map(t => t.state).filter((s): s is string => Boolean(s)))),
        [torrents])

    const filteredTorrents = useMemo(() =>
            torrents.filter(t => matchesFilters(t, {
                searchText,
                invertSearch,
                filterCategory,
                filterHasVolumes,
                filterState
            })),
        [torrents, searchText, invertSearch, filterCategory, filterHasVolumes, filterState])

    const pagedTorrents = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredTorrents.slice(start, start + PAGE_SIZE)
    }, [filteredTorrents, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchText, invertSearch, filterCategory, filterHasVolumes, filterState])

    return {
        searchText, setSearchText, invertSearch, setInvertSearch,
        filterCategory, setFilterCategory, filterHasVolumes, setFilterHasVolumes,
        filterState, setFilterState, currentPage, setCurrentPage, categories, states, filteredTorrents, pagedTorrents,
    }
}


// ─── Components ───────────────────────────────────────────────────────────────

const TorrentFiltersBar: React.FC<{
    searchText: string; invertSearch: boolean; filterCategory?: string; filterHasVolumes?: boolean; filterState?: string
    categories: string[]; states: string[]; total: number
    onSearchTextChange: (v: string) => void; onInvertSearchChange: (v: boolean) => void
    onCategoryChange: (v: string | undefined) => void; onHasVolumesChange: (v: boolean | undefined) => void
    onStateChange: (v: string | undefined) => void
}> = ({
          searchText, invertSearch, filterCategory, filterHasVolumes, filterState, categories, states, total,
          onSearchTextChange, onInvertSearchChange, onCategoryChange, onHasVolumesChange, onStateChange
      }) => {
    const {token} = theme.useToken()
    return (
        <Space wrap size={SPACING.sm} style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            background: token.colorBgContainer,
        }}>
            <Input.Search
                size="small"
                value={searchText} onChange={e => onSearchTextChange(e.target.value)}
                placeholder="搜索种子" style={{width: 200}} allowClear
                suffix={
                    <Switch
                        checked={invertSearch}
                        onChange={onInvertSearchChange}
                        size="small"
                        checkedChildren="反向"
                        unCheckedChildren="反向"
                    />
                }
            />
            <Select allowClear placeholder="类别" style={{width: 150}} value={filterCategory}
                    onChange={onCategoryChange} options={categories.map(c => ({label: c, value: c}))}/>
            <Select allowClear placeholder="状态" style={{width: 150}} value={filterState}
                    onChange={onStateChange} options={states.map(s => ({label: s, value: s}))}/>
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
    )
}

const TorrentRowLabel: React.FC<{ torrent: TorrentWithVolume; isExpanded: boolean }> = ({torrent, isExpanded}) => {
    const {token} = theme.useToken()
    return (
        <ExpandBlocker isExpanded={isExpanded}>
            <>
                <Flex style={{width: 56, flexShrink: 0}}>
                    {torrent.hasVolumes
                        ? <Tag icon={<CheckCircleOutlined/>} style={{margin: 0}}>{torrent.volumeCount}</Tag>
                        : <Tag icon={<CloseCircleOutlined/>} style={{margin: 0, opacity: 0.35}}/>}
                </Flex>
                <Flex style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'auto',
                    whiteSpace: 'nowrap',
                    cursor: 'text',
                }}>
                    <Typography.Text style={{color: token.colorText, display: 'inline-block'}}>
                        {torrent.name}
                    </Typography.Text>
                </Flex>
            </>
        </ExpandBlocker>
    )
}

const TorrentsPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [torrents, setTorrents] = useState<TorrentWithVolume[]>([]);

    const fetchTorrents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi<TorrentWithVolume[]>("/api/qb/torrents/info");
            if (res.success && res.data) setTorrents(res.data);
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
        filterState,
        setFilterState,
        currentPage,
        setCurrentPage,
        categories,
        states,
        filteredTorrents,
        pagedTorrents,
    } = useTorrentListView(torrents);
    const {activeKey, handleCollapseChange, closeForPageChange} = useEditorPanel({
        pagedItems: pagedTorrents,
        getItemKey: t => t.hash,
        openItem: t => editor.open(t.hash, t.name, false),
        editor,
    });

    useEffect(() => {
        fetchTorrents();
    }, [fetchTorrents]);

    const hasActiveFilters = !!searchText || filterCategory !== undefined || filterHasVolumes !== undefined || filterState !== undefined

    if (filteredTorrents.length === 0 && !loading) {
        return (
            <Flex vertical gap={SPACING.md}>
                <TorrentFiltersBar
                    searchText={searchText}
                    invertSearch={invertSearch}
                    filterCategory={filterCategory}
                    filterHasVolumes={filterHasVolumes}
                    filterState={filterState}
                    categories={categories}
                    states={states}
                    total={0}
                    onSearchTextChange={setSearchText}
                    onInvertSearchChange={setInvertSearch}
                    onCategoryChange={setFilterCategory}
                    onHasVolumesChange={setFilterHasVolumes}
                    onStateChange={setFilterState}
                />
                <Card size="small" styles={{body: {padding: SPACING.lg}}}>
                    <Empty description={hasActiveFilters ? "无匹配结果" : "暂无种子数据"}/>
                </Card>
            </Flex>
        )
    }

    return (
        <Flex vertical gap={SPACING.md}>
            <TorrentFiltersBar
                searchText={searchText}
                invertSearch={invertSearch}
                filterCategory={filterCategory}
                filterHasVolumes={filterHasVolumes}
                filterState={filterState}
                categories={categories}
                states={states}
                total={filteredTorrents.length}
                onSearchTextChange={setSearchText}
                onInvertSearchChange={setInvertSearch}
                onCategoryChange={setFilterCategory}
                onHasVolumesChange={setFilterHasVolumes}
                onStateChange={setFilterState}
            />
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <CollapsePageList
                        items={pagedTorrents}
                        getKey={t => t.hash}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        renderLabel={(t, isExpanded) => <TorrentRowLabel torrent={t} isExpanded={isExpanded}/>}
                        renderContent={() => <DiscEditorContent {...editor}/>}
                    />
                </Card>
            </Spin>
            <ListPagination
                currentPage={currentPage}
                total={filteredTorrents.length}
                onPageChange={async (page) => {
                    const ok = await closeForPageChange();
                    if (!ok) return;
                    setCurrentPage(page);
                }}
            />
        </Flex>
    );
};

export default TorrentsPage;
