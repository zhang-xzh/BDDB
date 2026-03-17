"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
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

function matchesFilters(volume: VolumeWithWork, filters: {
    searchCatalogNo: string
    searchTitle: string; invertTitle: boolean
    filterHasWork?: boolean
}): boolean {
    const {searchCatalogNo, searchTitle, invertTitle, filterHasWork} = filters
    if (searchCatalogNo) {
        const match = volume.catalog_no?.toLowerCase().includes(searchCatalogNo.toLowerCase())
        if (!match) return false
    }
    if (searchTitle) {
        const match = volume.volume_name?.toLowerCase().includes(searchTitle.toLowerCase())
        if (invertTitle ? match : !match) return false
    }
    if (filterHasWork !== undefined) {
        const count = volume.workCount ?? volume.work_ids?.length ?? 0
        if ((count > 0) !== filterHasWork) return false
    }
    return true
}

function useVolumeListView(volumes: VolumeWithWork[]) {
    const [searchCatalogNo, setSearchCatalogNo] = useState('')
    const [searchTitle, setSearchTitle] = useState('')
    const [invertTitle, setInvertTitle] = useState(false)
    const [filterHasWork, setFilterHasWork] = useState<boolean | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)

    const filteredVolumes = useMemo(() =>
            volumes.filter(v => matchesFilters(v, {
                searchCatalogNo,
                searchTitle,
                invertTitle,
                filterHasWork
            })),
        [volumes, searchCatalogNo, searchTitle, invertTitle, filterHasWork])

    const pagedVolumes = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredVolumes.slice(start, start + PAGE_SIZE)
    }, [filteredVolumes, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchCatalogNo, searchTitle, invertTitle, filterHasWork])

    return {
        searchCatalogNo, setSearchCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasWork, setFilterHasWork,
        currentPage, setCurrentPage, filteredVolumes, pagedVolumes,
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
        <Space wrap size={SPACING.sm}>
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
                placeholder="是否已关联作品"
                style={{width: 160}}
                value={filterHasWork}
                onChange={onFilterHasWorkChange}
                options={[
                    {label: '已关联', value: true},
                    {label: '未关联', value: false}
                ]}
            />
            <Typography.Text type="secondary" style={{color: token.colorTextSecondary}}>
                共 {total} 条
            </Typography.Text>
        </Space>
    )
}

const VolumeRowLabel: React.FC<{ volume: VolumeWithWork; isExpanded: boolean }> = ({volume, isExpanded}) => {
    const {token} = theme.useToken()
    const workCount = volume.workCount ?? volume.work_ids?.length ?? 0
    return (
        <ExpandBlocker isExpanded={isExpanded}>
            <>
                <Flex style={{width: 56, flexShrink: 0}}>
                    {workCount > 0
                        ? <Tag icon={<CheckCircleOutlined/>} color="success" style={{margin: 0}}>{workCount}</Tag>
                        : <Tag icon={<CloseCircleOutlined/>} color="default" style={{margin: 0}}/>}
                </Flex>
                <Typography.Text style={{width: 120, flexShrink: 0, color: token.colorText, fontFamily: 'monospace'}}>
                    {formatCatalogNo(volume.catalog_no)}
                </Typography.Text>
                <Flex style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'auto',
                    whiteSpace: 'nowrap',
                    cursor: 'text',
                }}>
                    <Typography.Text style={{color: token.colorText, display: 'inline-block'}}>
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

    const refreshVolumes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi<VolumeWithWork[]>("/api/volumes");
            if (res.success && res.data) {
                setVolumes(res.data.map(volume => ({
                    ...volume,
                    workCount: volume.workCount ?? volume.work_ids?.length ?? 0,
                })));
            }
        } catch (err) {
            console.error("获取卷数据失败:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const {
        searchCatalogNo, setSearchCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasWork, setFilterHasWork,
        currentPage, setCurrentPage, filteredVolumes, pagedVolumes,
    } = useVolumeListView(volumes);

    const editor = useWorkEditor(refreshVolumes);
    const {activeKey, handleCollapseChange, closeForPageChange} = useEditorPanel({
        pagedItems: pagedVolumes,
        getItemKey: v => v._id,
        openItem: v => editor.open(v._id, v.volume_no, v.catalog_no),
        editor: {
            hasChanges: editor.hasChanges,
            handleSubmit: () => editor.handleSubmit(),
        },
    });

    useEffect(() => {
        refreshVolumes();
    }, [refreshVolumes]);

    const hasActiveFilters = searchCatalogNo || searchTitle || filterHasWork !== undefined

    if (filteredVolumes.length === 0 && !loading) {
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
                total={filteredVolumes.length}
                onSearchCatalogNoChange={setSearchCatalogNo}
                onSearchTitleChange={setSearchTitle}
                onInvertTitleChange={setInvertTitle}
                onFilterHasWorkChange={setFilterHasWork}
            />
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <CollapsePageList
                        items={pagedVolumes}
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
                total={filteredVolumes.length}
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
