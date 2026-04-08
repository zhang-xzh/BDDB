"use client";

import React, {useCallback, useEffect, useState} from "react";
import {Card, Empty, Flex, Input, Select, Space, Spin, Switch, Tag, theme, Typography} from "antd";
import {CheckCircleOutlined, CloseCircleOutlined} from "@ant-design/icons";
import type {TorrentWithVolume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import {DiscEditorContent, useDiscEditor} from "@/components/DiscEditor";
import {PAGE_SIZE, SPACING} from "@/lib/utils";
import ListPagination from "@/components/ListPagination";
import {useEditorPanel} from "@/components/useEditorPanel";
import CollapsePageList, {ExpandBlocker} from "@/components/CollapsePageList";

interface TorrentListResponse {
    data: TorrentWithVolume[]
    total: number
    page: number
    pageSize: number
}

function useTorrentListView() {
    const [searchText, setSearchText] = useState('')
    const [invertSearch, setInvertSearch] = useState(false)
    const [filterHasVolumes, setFilterHasVolumes] = useState<boolean | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal] = useState(0)

    return {
        searchText, setSearchText, invertSearch, setInvertSearch,
        filterHasVolumes, setFilterHasVolumes,
        currentPage, setCurrentPage, total, setTotal,
    }
}


// ─── Components ───────────────────────────────────────────────────────────────

const TorrentFiltersBar: React.FC<{
    searchText: string; invertSearch: boolean; filterHasVolumes?: boolean; total: number
    onSearchTextChange: (v: string) => void; onInvertSearchChange: (v: boolean) => void
    onHasVolumesChange: (v: boolean | undefined) => void
}> = ({
          searchText, invertSearch, filterHasVolumes, total,
          onSearchTextChange, onInvertSearchChange, onHasVolumesChange
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
            <Select allowClear placeholder="是否处理" style={{width: 150}} value={filterHasVolumes}
                    onChange={onHasVolumesChange}
                    options={[{label: '已处理', value: true}, {label: '未处理', value: false}]}/>
            <Typography.Text type="secondary">
                共 {total} 条
            </Typography.Text>
        </Space>
    )
}

const TorrentRowLabel: React.FC<{ torrent: TorrentWithVolume; isExpanded: boolean }> = ({torrent, isExpanded}) => {
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
                    <Typography.Text style={{display: 'inline-block'}}>
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

    const {
        searchText, setSearchText,
        invertSearch, setInvertSearch,
        filterHasVolumes, setFilterHasVolumes,
        currentPage, setCurrentPage, total, setTotal,
    } = useTorrentListView();

    const fetchTorrents = useCallback(async (page: number, search: string, inv: boolean, hasVolumes?: boolean) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('pageSize', PAGE_SIZE.toString());
            if (search) {
                params.set('search', search);
                if (inv) params.set('invertSearch', 'true');
            }
            if (hasVolumes !== undefined) params.set('hasVolumes', hasVolumes.toString());

            const res = await fetchApi<TorrentListResponse>(`/api/torrents/info?${params.toString()}`);
            if (res.success && res.data?.data) {
                setTorrents(res.data.data);
                setTotal(res.data.total ?? 0);
            } else {
                setTorrents([]);
                setTotal(0);
            }
        } catch (error) {
            console.error("获取种子列表失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 页码或筛选条件变化时获取数据
    useEffect(() => {
        fetchTorrents(currentPage, searchText, invertSearch, filterHasVolumes);
    }, [currentPage, searchText, invertSearch, filterHasVolumes]); // eslint-disable-line react-hooks/exhaustive-deps

    // 筛选条件变化时重置页码（但只在非初始加载时）
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchText, invertSearch, filterHasVolumes]); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshTorrents = useCallback(async () => {
        await fetchTorrents(currentPage, searchText, invertSearch, filterHasVolumes);
    }, [currentPage, searchText, invertSearch, filterHasVolumes, fetchTorrents]);

    const editor = useDiscEditor(refreshTorrents);
    const {activeKey, handleCollapseChange, closeForPageChange} = useEditorPanel({
        pagedItems: torrents,
        getItemKey: t => t.hash,
        openItem: t => editor.open(t.hash, t.name, false),
        editor,
    });

    const hasActiveFilters = !!searchText || filterHasVolumes !== undefined

    if (torrents.length === 0 && !loading) {
        return (
            <Flex vertical gap={SPACING.md}>
                <TorrentFiltersBar
                    searchText={searchText}
                    invertSearch={invertSearch}
                    filterHasVolumes={filterHasVolumes}
                    total={0}
                    onSearchTextChange={setSearchText}
                    onInvertSearchChange={setInvertSearch}
                    onHasVolumesChange={setFilterHasVolumes}
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
                filterHasVolumes={filterHasVolumes}
                total={total}
                onSearchTextChange={setSearchText}
                onInvertSearchChange={setInvertSearch}
                onHasVolumesChange={setFilterHasVolumes}
            />
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <CollapsePageList
                        items={torrents}
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
                total={total}
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
