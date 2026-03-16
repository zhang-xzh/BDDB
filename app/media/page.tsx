"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Card, Empty, Flex, Input, Select, Space, Spin, Switch, Tag, theme, Typography} from "antd";
import {CheckCircleOutlined, CloseCircleOutlined} from "@ant-design/icons";
import type {Volume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import MediaEditorContent, {useMediaEditor} from '@/components/MediaEditor';
import {PAGE_SIZE} from "@/lib/utils";
import ListPagination from "@/components/ListPagination";
import {useEditorPanel} from "@/components/useEditorPanel";
import CollapsePageList, {ExpandBlocker, ListHeader} from "@/components/CollapsePageList";

function formatCatalogNo(catalogNo: string): string {
    return catalogNo || '无编号'
}

interface VolumeWithMedia extends Volume {
    mediaCount?: number
}

function matchesFilters(volume: VolumeWithMedia, filters: {
    searchCatalogNo: string
    searchTitle: string; invertTitle: boolean
    filterHasMedia?: boolean
}): boolean {
    const {searchCatalogNo, searchTitle, invertTitle, filterHasMedia} = filters
    if (searchCatalogNo) {
        const match = volume.catalog_no?.toLowerCase().includes(searchCatalogNo.toLowerCase())
        if (!match) return false
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

function useVolumeListView(volumes: VolumeWithMedia[]) {
    const [searchCatalogNo, setSearchCatalogNo] = useState('')
    const [searchTitle, setSearchTitle] = useState('')
    const [invertTitle, setInvertTitle] = useState(false)
    const [filterHasMedia, setFilterHasMedia] = useState<boolean | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)

    const filteredVolumes = useMemo(() =>
            volumes.filter(v => matchesFilters(v, {
                searchCatalogNo,
                searchTitle,
                invertTitle,
                filterHasMedia
            })),
        [volumes, searchCatalogNo, searchTitle, invertTitle, filterHasMedia])

    const pagedVolumes = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredVolumes.slice(start, start + PAGE_SIZE)
    }, [filteredVolumes, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchCatalogNo, searchTitle, invertTitle, filterHasMedia])

    return {
        searchCatalogNo, setSearchCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasMedia, setFilterHasMedia,
        currentPage, setCurrentPage, filteredVolumes, pagedVolumes,
    }
}

const VolumeFiltersBar: React.FC<{
    searchCatalogNo: string
    searchTitle: string; invertTitle: boolean
    filterHasMedia?: boolean
    total: number
    onSearchCatalogNoChange: (v: string) => void
    onSearchTitleChange: (v: string) => void
    onInvertTitleChange: (v: boolean) => void
    onFilterHasMediaChange: (v: boolean | undefined) => void
}> = ({
          searchCatalogNo, searchTitle, invertTitle, filterHasMedia, total,
          onSearchCatalogNoChange, onSearchTitleChange, onInvertTitleChange, onFilterHasMediaChange
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

const VolumeListHeader: React.FC = () => (
    <ListHeader columns={[
        {label: '媒体', style: {width: 56, flexShrink: 0}},
        {label: '编号', style: {width: 120, flexShrink: 0}},
        {label: '名称', style: {flex: 1}},
    ]}/>
)

const VolumeRowLabel: React.FC<{ volume: VolumeWithMedia; isExpanded: boolean }> = ({volume, isExpanded}) => {
    const {token} = theme.useToken()
    return (
        <ExpandBlocker isExpanded={isExpanded}>
            <>
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
            </>
        </ExpandBlocker>
    )
}

const MediaPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [volumes, setVolumes] = useState<VolumeWithMedia[]>([]);

    const refreshVolumes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi<VolumeWithMedia[]>("/api/volumes");
            if (res.success && res.data) {
                setVolumes(res.data);
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
        filterHasMedia, setFilterHasMedia,
        currentPage, setCurrentPage, filteredVolumes, pagedVolumes,
    } = useVolumeListView(volumes);

    const editor = useMediaEditor(refreshVolumes);
    const {activeKey, handleCollapseChange, closeForPageChange} = useEditorPanel({
        pagedItems: pagedVolumes,
        getItemKey: v => v._id,
        openItem: v => editor.open(v._id, v.volume_no, v.catalog_no),
        editor,
    });

    useEffect(() => {
        refreshVolumes();
    }, [refreshVolumes]);

    const hasActiveFilters = searchCatalogNo || searchTitle || filterHasMedia !== undefined

    if (filteredVolumes.length === 0 && !loading) {
        return (
            <Flex vertical gap={16}>
                <VolumeFiltersBar
                    searchCatalogNo={searchCatalogNo}
                    searchTitle={searchTitle}
                    invertTitle={invertTitle}
                    filterHasMedia={filterHasMedia}
                    total={0}
                    onSearchCatalogNoChange={setSearchCatalogNo}
                    onSearchTitleChange={setSearchTitle}
                    onInvertTitleChange={setInvertTitle}
                    onFilterHasMediaChange={setFilterHasMedia}
                />
                <Card>
                    <Empty description={hasActiveFilters ? "无匹配结果" : "暂无卷数据"}/>
                </Card>
            </Flex>
        )
    }

    return (
        <Flex vertical gap={16}>
            <VolumeFiltersBar
                searchCatalogNo={searchCatalogNo}
                searchTitle={searchTitle}
                invertTitle={invertTitle}
                filterHasMedia={filterHasMedia}
                total={filteredVolumes.length}
                onSearchCatalogNoChange={setSearchCatalogNo}
                onSearchTitleChange={setSearchTitle}
                onInvertTitleChange={setInvertTitle}
                onFilterHasMediaChange={setFilterHasMedia}
            />
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <VolumeListHeader/>
                    <CollapsePageList
                        items={pagedVolumes}
                        getKey={v => v._id}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        renderLabel={(v, isExpanded) => <VolumeRowLabel volume={v} isExpanded={isExpanded}/>}
                        renderContent={() => <MediaEditorContent {...editor}/>}
                    />
                </Card>
            </Spin>
            <ListPagination
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

export default MediaPage;