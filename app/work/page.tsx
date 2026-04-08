"use client";

import React, {useCallback, useEffect, useState} from "react";
import {Card, Empty, Flex, Input, Select, Space, Spin, Switch, Tag, theme, Typography} from "antd";
import {CheckCircleOutlined, CloseCircleOutlined} from "@ant-design/icons";
import type {BddbWork, Volume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import WorkEditorContent, {useWorkEditor} from '@/components/WorkEditor';
import {PAGE_SIZE, SPACING} from "@/lib/utils";
import ListPagination from "@/components/ListPagination";
import {useEditorPanel} from "@/components/useEditorPanel";
import CollapsePageList, {ExpandBlocker} from "@/components/CollapsePageList";

function formatCatalogNo(catalogNo: string): string {
    return catalogNo || '无编号'
}

interface VolumeWithWork extends Volume {
    workCount?: number
    works?: BddbWork[]
}

interface VolumeListResponse {
    data: VolumeWithWork[]
    total: number
    page: number
    pageSize: number
}

function useVolumeListView() {
    const [searchCatalogNo, setSearchCatalogNo] = useState('')
    const [searchTitle, setSearchTitle] = useState('')
    const [invertTitle, setInvertTitle] = useState(false)
    const [filterHasWork, setFilterHasWork] = useState<boolean | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal] = useState(0)

    // 重置页码的辅助函数
    const resetPage = useCallback(() => setCurrentPage(1), [])

    return {
        searchCatalogNo, setSearchCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasWork, setFilterHasWork,
        currentPage, setCurrentPage, resetPage, total, setTotal,
    }
}

const VolumeFiltersBar: React.FC<{
    searchCatalogNo: string
    searchTitle: string; invertTitle: boolean
    filterHasWork?: boolean
    total: number
    onSearchCatalogNoChange: (v: string) => void
    onSearchTitleChange: (v: string) => void
    onInvertTitleChange: (v: boolean) => void
    onFilterHasWorkChange: (v: boolean | undefined) => void
}> = ({
          searchCatalogNo, searchTitle, invertTitle, filterHasWork, total,
          onSearchCatalogNoChange, onSearchTitleChange, onInvertTitleChange, onFilterHasWorkChange
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
                value={searchCatalogNo}
                onChange={e => onSearchCatalogNoChange(e.target.value)}
                placeholder="搜索编号"
                style={{width: 150}}
                allowClear
            />
            <Input.Search
                size="small"
                value={searchTitle}
                onChange={e => onSearchTitleChange(e.target.value)}
                placeholder="搜索标题"
                style={{width: 200}}
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
                placeholder="是否处理"
                style={{width: 150}}
                value={filterHasWork}
                onChange={onFilterHasWorkChange}
                options={[
                    {label: '已处理', value: true},
                    {label: '未处理', value: false}
                ]}
            />
            <Typography.Text type="secondary">
                共 {total} 条
            </Typography.Text>
        </Space>
    )
}

const VolumeRowLabel: React.FC<{ volume: VolumeWithWork; isExpanded: boolean }> = ({volume, isExpanded}) => {
    const workCount = volume.workCount ?? volume.work_ids?.length ?? 0
    return (
        <ExpandBlocker isExpanded={isExpanded}>
            <>
                <Flex style={{width: 56, flexShrink: 0}}>
                    {workCount > 0
                        ? <Tag icon={<CheckCircleOutlined/>} style={{margin: 0}}>{workCount}</Tag>
                        : <Tag icon={<CloseCircleOutlined/>} style={{margin: 0, opacity: 0.35}}/>}
                </Flex>
                <Typography.Text style={{width: 120, flexShrink: 0, fontFamily: 'monospace'}}>
                    {formatCatalogNo(volume.catalog_no)}
                </Typography.Text>
                <Flex style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'auto',
                    whiteSpace: 'nowrap',
                    cursor: 'text',
                }}>
                    <Typography.Text style={{display: 'inline-block'}}>
                        {volume.volume_name || '无标题'}
                    </Typography.Text>
                </Flex>
            </>
        </ExpandBlocker>
    )
}

const WorkPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [volumes, setVolumes] = useState<VolumeWithWork[]>([]);

    const {
        searchCatalogNo, setSearchCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasWork, setFilterHasWork,
        currentPage, setCurrentPage, resetPage, total, setTotal,
    } = useVolumeListView();

    const fetchVolumes = useCallback(async (page: number, catalogNo: string, title: string, inv: boolean, hasWork: boolean | undefined) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('pageSize', PAGE_SIZE.toString());
            if (catalogNo) params.set('searchCatalogNo', catalogNo);
            if (inv) {
                // 反向标题筛选在前端处理
            } else if (title) {
                params.set('searchTitle', title);
            }
            if (hasWork !== undefined) params.set('filterHasWork', hasWork.toString());

            const res = await fetchApi<VolumeListResponse>(`/api/volumes?${params.toString()}`);
            if (res.success && res.data?.data) {
                // 处理反向标题筛选
                let data = res.data.data;
                if (inv && title) {
                    data = data.filter(v => !v.volume_name?.toLowerCase().includes(title.toLowerCase()));
                }
                setVolumes(data.map(volume => ({
                    ...volume,
                    workCount: volume.workCount ?? volume.work_ids?.length ?? 0,
                })));
                setTotal(res.data.total ?? 0);
            } else {
                setVolumes([]);
                setTotal(0);
            }
        } catch (err) {
            console.error("获取卷数据失败:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // 页码或筛选条件变化时获取数据
    useEffect(() => {
        fetchVolumes(currentPage, searchCatalogNo, searchTitle, invertTitle, filterHasWork);
    }, [currentPage, searchCatalogNo, searchTitle, invertTitle, filterHasWork]); // eslint-disable-line react-hooks/exhaustive-deps

    // 筛选条件变化时重置页码（但只在非初始加载时）
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchCatalogNo, searchTitle, invertTitle, filterHasWork]); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshVolumes = useCallback(async () => {
        await fetchVolumes(currentPage, searchCatalogNo, searchTitle, invertTitle, filterHasWork);
    }, [currentPage, searchCatalogNo, searchTitle, invertTitle, filterHasWork, fetchVolumes]);

    const editor = useWorkEditor(refreshVolumes);
    const {activeKey, handleCollapseChange, closeForPageChange} = useEditorPanel({
        pagedItems: volumes,
        getItemKey: v => v._id,
        openItem: v => editor.open(v._id, v.volume_no, v.catalog_no),
        editor: {
            hasChanges: editor.hasChanges,
            handleSubmit: () => editor.handleSubmit(),
        },
    });

    const hasActiveFilters = searchCatalogNo || searchTitle || filterHasWork !== undefined

    if (volumes.length === 0 && !loading) {
        return (
            <Flex vertical gap={SPACING.md}>
                <VolumeFiltersBar
                    searchCatalogNo={searchCatalogNo}
                    searchTitle={searchTitle}
                    invertTitle={invertTitle}
                    filterHasWork={filterHasWork}
                    total={0}
                    onSearchCatalogNoChange={setSearchCatalogNo}
                    onSearchTitleChange={setSearchTitle}
                    onInvertTitleChange={setInvertTitle}
                    onFilterHasWorkChange={setFilterHasWork}
                />
                <Card size="small" styles={{body: {padding: SPACING.lg}}}>
                    <Empty description={hasActiveFilters ? "无匹配结果" : "暂无卷数据"}/>
                </Card>
            </Flex>
        )
    }

    return (
        <Flex vertical gap={SPACING.md}>
            <VolumeFiltersBar
                searchCatalogNo={searchCatalogNo}
                searchTitle={searchTitle}
                invertTitle={invertTitle}
                filterHasWork={filterHasWork}
                total={total}
                onSearchCatalogNoChange={setSearchCatalogNo}
                onSearchTitleChange={setSearchTitle}
                onInvertTitleChange={setInvertTitle}
                onFilterHasWorkChange={setFilterHasWork}
            />
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <CollapsePageList
                        items={volumes}
                        getKey={v => v._id}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        renderLabel={(v, isExpanded) => <VolumeRowLabel volume={v} isExpanded={isExpanded}/>}
                        renderContent={() => <WorkEditorContent {...editor}/>}
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

export default WorkPage;
