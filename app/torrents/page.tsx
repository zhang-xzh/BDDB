"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Box, Card, CardContent, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select, Switch, TextField, Tooltip, Typography,} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import InboxIcon from "@mui/icons-material/Inbox";
import type {TorrentWithVolume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import {DiscEditorContent, useDiscEditor} from "@/components/DiscEditor";
import {PAGE_SIZE} from "@/lib/utils";
import ListPagination from "@/components/ListPagination";
import {useEditorPanel} from "@/components/useEditorPanel";
import CollapsePageList, {ExpandBlocker, ListHeader} from "@/components/CollapsePageList";

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

const NONE = '__none__'

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
    return (
        <Box sx={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1}}>
            <TextField
                value={searchText}
                onChange={e => onSearchTextChange(e.target.value)}
                label="搜索种子"
                size="small"
                sx={{width: 250}}
                slotProps={{
                    input: {
                        endAdornment: (
                            <Tooltip title="反向">
                                <Switch
                                    checked={invertSearch}
                                    onChange={e => onInvertSearchChange(e.target.checked)}
                                    size="small"
                                />
                            </Tooltip>
                        ),
                    },
                }}
            />
            <FormControl size="small" sx={{width: 200}}>
                <InputLabel>类别</InputLabel>
                <Select
                    value={filterCategory ?? NONE}
                    onChange={e => onCategoryChange(e.target.value === NONE ? undefined : e.target.value as string)}
                    label="类别"
                >
                    <MenuItem value={NONE}><em>全部</em></MenuItem>
                    {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
            </FormControl>
            <FormControl size="small" sx={{width: 150}}>
                <InputLabel>状态</InputLabel>
                <Select
                    value={filterState ?? NONE}
                    onChange={e => onStateChange(e.target.value === NONE ? undefined : e.target.value as string)}
                    label="状态"
                >
                    <MenuItem value={NONE}><em>全部</em></MenuItem>
                    {states.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
            </FormControl>
            <FormControl size="small" sx={{width: 150}}>
                <InputLabel>是否处理</InputLabel>
                <Select
                    value={filterHasVolumes === undefined ? NONE : String(filterHasVolumes)}
                    onChange={e => {
                        const v = e.target.value
                        onHasVolumesChange(v === NONE ? undefined : v === 'true')
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

const TorrentListHeader: React.FC = () => (
    <ListHeader columns={[
        {label: '卷', style: {width: 56, flexShrink: 0}},
        {label: '名称', style: {flex: 1}},
        {label: '类别', style: {width: 200, flexShrink: 0}},
        {label: '状态', style: {width: 100, flexShrink: 0, textAlign: 'right'}},
    ]}/>
)

const TorrentRowLabel: React.FC<{ torrent: TorrentWithVolume; isExpanded: boolean }> = ({torrent, isExpanded}) => {
    return (
        <ExpandBlocker isExpanded={isExpanded}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, width: '100%'}}>
                <Box sx={{width: 56, flexShrink: 0}}>
                    {torrent.hasVolumes
                        ? <Chip
                            icon={<CheckCircleOutlineIcon/>}
                            label={torrent.volumeCount}
                            color="success"
                            size="small"
                            sx={{m: 0}}
                        />
                        : <HighlightOffIcon color="disabled" fontSize="small"/>
                    }
                </Box>
                <Typography
                    variant="body2"
                    noWrap
                    sx={{flex: 1}}
                >
                    {torrent.name}
                </Typography>
                <Box sx={{width: 200, flexShrink: 0, overflow: 'hidden'}}>
                    {torrent.category
                        ? <Chip label={torrent.category} color="primary" size="small" sx={{m: 0, maxWidth: '100%'}}/>
                        : <Typography variant="body2" color="text.secondary">—</Typography>
                    }
                </Box>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{width: 100, flexShrink: 0, textAlign: 'right'}}
                >
                    {torrent.state || '—'}
                </Typography>
            </Box>
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
        searchText, setSearchText,
        invertSearch, setInvertSearch,
        filterCategory, setFilterCategory,
        filterHasVolumes, setFilterHasVolumes,
        filterState, setFilterState,
        currentPage, setCurrentPage,
        categories, states,
        filteredTorrents, pagedTorrents,
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

    const filterBar = (
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
    )

    if (filteredTorrents.length === 0 && !loading) {
        return (
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {filterBar}
                <Card>
                    <CardContent sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4}}>
                        <InboxIcon sx={{fontSize: 48, color: 'text.disabled'}}/>
                        <Typography color="text.secondary">
                            {hasActiveFilters ? '无匹配结果' : '暂无种子数据'}
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
                        items={pagedTorrents}
                        getKey={t => t.hash}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        renderLabel={(t, isExpanded) => <TorrentRowLabel torrent={t} isExpanded={isExpanded}/>}
                        renderContent={() => <DiscEditorContent {...editor} />}
                    />
                </Card>
            </Box>
            <ListPagination
                currentPage={currentPage}
                total={filteredTorrents.length}
                onPageChange={(page) => {
                    closeForPageChange();
                    setCurrentPage(page);
                }}
            />
        </Box>
    );
};

export default TorrentsPage;
