"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Box, Card, CardContent, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select, Switch, TextField, Tooltip, Typography,} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import InboxIcon from "@mui/icons-material/Inbox";
import type {Volume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import WorkEditorContent, {useWorkEditor} from '@/components/WorkEditor';
import {PAGE_SIZE} from "@/lib/utils";
import ListPagination from "@/components/ListPagination";
import {useEditorPanel} from "@/components/useEditorPanel";
import CollapsePageList, {ExpandBlocker} from "@/components/CollapsePageList";

// ─── Constants & Utilities ────────────────────────────────────────────────────

function formatCatalogNo(catalogNo: string): string {
    return catalogNo || '无编号'
}

interface VolumeWithWork extends Volume {
    workCount?: number
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
        const hasWork = (volume.workCount ?? 0) > 0
        if (hasWork !== filterHasWork) return false
    }
    return true
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

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


// ─── Components ───────────────────────────────────────────────────────────────

const NONE = '__none__'

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
    return (
        <Box sx={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1}}>
            <TextField
                value={searchCatalogNo}
                onChange={e => onSearchCatalogNoChange(e.target.value)}
                label="搜索编号"
                size="small"
                sx={{width: 200}}
            />
            <TextField
                value={searchTitle}
                onChange={e => onSearchTitleChange(e.target.value)}
                label="搜索标题"
                size="small"
                sx={{width: 300}}
                slotProps={{
                    input: {
                        endAdornment: (
                            <Tooltip title="反向">
                                <Switch
                                    checked={invertTitle}
                                    onChange={e => onInvertTitleChange(e.target.checked)}
                                    size="small"
                                />
                            </Tooltip>
                        ),
                    },
                }}
            />
            <FormControl size="small" sx={{width: 150}}>
                <InputLabel>是否处理</InputLabel>
                <Select
                    value={filterHasWork === undefined ? NONE : String(filterHasWork)}
                    onChange={e => {
                        const v = e.target.value
                        onFilterHasWorkChange(v === NONE ? undefined : v === 'true')
                    }}
                    label="关联 Work"
                >
                    <MenuItem value={NONE}><em>全部</em></MenuItem>
                    <MenuItem value="true">已处理</MenuItem>
                    <MenuItem value="false">未处理</MenuItem>
                </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">共 {total} 条</Typography>
        </Box>
    )
}

const VolumeRowLabel: React.FC<{
    volume: VolumeWithWork
    isExpanded: boolean
}> = ({volume, isExpanded}) => {
    return (
        <ExpandBlocker isExpanded={isExpanded}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, width: '100%'}}>
                <Box sx={{width: 56, flexShrink: 0}}>
                    {volume.workCount && volume.workCount > 0
                        ? <Chip
                            icon={<CheckCircleOutlineIcon/>}
                            label={volume.workCount}
                            color="success"
                            size="small"
                            sx={{m: 0}}
                        />
                        : <HighlightOffIcon color="disabled" fontSize="small"/>
                    }
                </Box>
                <Typography
                    variant="body2"
                    sx={{width: 120, flexShrink: 0, fontFamily: 'monospace'}}
                >
                    {formatCatalogNo(volume.catalog_no)}
                </Typography>
                <Typography variant="body2" noWrap sx={{flex: 1}}>
                    {volume.volume_name || '无标题'}
                </Typography>
            </Box>
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
        filterHasWork, setFilterHasWork,
        currentPage, setCurrentPage, filteredVolumes, pagedVolumes,
    } = useVolumeListView(volumes);

    const editor = useWorkEditor(() => {
        // 保存成功后刷新卷列表（更新 workCount）
        refreshVolumes();
    });
    const {activeKey, handleCollapseChange, closeForPageChange} = useEditorPanel({
        pagedItems: pagedVolumes,
        getItemKey: v => v._id,
        openItem: v => editor.open(v._id),
        editor,
        autoSave: false, // work 页面不需要自动保存折叠状态
    });

    // 使用 useMemo 缓存 renderLabel 函数
    const renderVolumeLabel = useCallback((v: VolumeWithWork, isExpanded: boolean) => (
        <VolumeRowLabel
            volume={v}
            isExpanded={isExpanded}
        />
    ), []);

    useEffect(() => {
        refreshVolumes();
    }, [refreshVolumes]);

    const hasActiveFilters = searchCatalogNo || searchTitle || filterHasWork !== undefined

    const filterBar = (
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
    )

    if (filteredVolumes.length === 0 && !loading) {
        return (
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {filterBar}
                <Card variant="outlined">
                    <CardContent sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4}}>
                        <InboxIcon sx={{fontSize: 48, color: 'text.disabled'}}/>
                        <Typography color="text.secondary">
                            {hasActiveFilters ? '无匹配结果' : '暂无卷数据'}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        )
    }

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
            {filterBar}
            <Box sx={{position: 'relative'}}>
                {loading && (
                    <Box sx={{
                        position: 'absolute', inset: 0, zIndex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.6)',
                    }}>
                        <CircularProgress/>
                    </Box>
                )}
                <Card>
                    <CollapsePageList
                        items={pagedVolumes}
                        getKey={v => v._id}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        renderLabel={renderVolumeLabel}
                        renderContent={() => <WorkEditorContent {...editor} onSubmit={editor.handleSubmit}/>}
                    />
                </Card>
            </Box>
            <ListPagination
                currentPage={currentPage}
                total={filteredVolumes.length}
                onPageChange={(page) => {
                    closeForPageChange();
                    setCurrentPage(page);
                }}
            />
        </Box>
    );
};

export default WorkPage;
