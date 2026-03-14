"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Box, Card, CardContent, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select, Switch, TextField, Tooltip, Typography,} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import InboxIcon from "@mui/icons-material/Inbox";
import type {Volume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import MediaEditorContent, {useMediaEditor} from '@/components/MediaEditor';
import {PAGE_SIZE} from "@/lib/utils";
import ListPagination from "@/components/ListPagination";
import {useEditorPanel} from "@/components/useEditorPanel";
import CollapsePageList, {ExpandBlocker} from "@/components/CollapsePageList";

// ─── Constants & Utilities ────────────────────────────────────────────────────

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

// ─── Hooks ────────────────────────────────────────────────────────────────────

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


// ─── Components ───────────────────────────────────────────────────────────────

const NONE = '__none__'

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
                    value={filterHasMedia === undefined ? NONE : String(filterHasMedia)}
                    onChange={e => {
                        const v = e.target.value
                        onFilterHasMediaChange(v === NONE ? undefined : v === 'true')
                    }}
                    label="是否处理"
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

const VolumeRowLabel: React.FC<{ volume: VolumeWithMedia; isExpanded: boolean }> = ({volume, isExpanded}) => {
    return (
        <ExpandBlocker isExpanded={isExpanded}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, width: '100%'}}>
                <Box sx={{width: 56, flexShrink: 0}}>
                    {volume.mediaCount && volume.mediaCount > 0
                        ? <Chip
                            icon={<CheckCircleOutlineIcon/>}
                            label={volume.mediaCount}
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


const VolumePage: React.FC = () => {
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

    const filterBar = (
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
                        renderLabel={(v, isExpanded) => <VolumeRowLabel volume={v} isExpanded={isExpanded}/>}
                        renderContent={() => <MediaEditorContent {...editor} />}
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

export default VolumePage;
