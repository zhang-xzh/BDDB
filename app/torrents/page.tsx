'use client'

import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {Card, HTMLSelect, Icon, InputGroup, NonIdealState, PopoverNext, Spinner, Switch, Tag, Tooltip} from '@blueprintjs/core'
import {Cell, Column, Table2, SelectionModes} from '@blueprintjs/table'
import type {TorrentWithVolume} from '@/lib/mongodb'
import {fetchApi} from '@/lib/api'
import {DiscEditorContent, useDiscEditor} from '@/components/DiscEditor'

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

    return {
        searchText, setSearchText, invertSearch, setInvertSearch,
        filterCategory, setFilterCategory, filterHasVolumes, setFilterHasVolumes,
        filterState, setFilterState, categories, states, filteredTorrents,
    }
}

// ─── Components ───────────────────────────────────────────────────────────────

const TorrentsPage: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const [torrents, setTorrents] = useState<TorrentWithVolume[]>([])
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

    const fetchTorrents = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchApi<TorrentWithVolume[]>('/api/qb/torrents/info')
            if (res.success && res.data) setTorrents(res.data)
        } catch (error) {
            console.error('获取种子列表失败:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const editor = useDiscEditor(fetchTorrents)
    const {
        searchText, setSearchText,
        invertSearch, setInvertSearch,
        filterCategory, setFilterCategory,
        filterHasVolumes, setFilterHasVolumes,
        filterState, setFilterState,
        categories, states,
        filteredTorrents,
    } = useTorrentListView(torrents)

    // Sort
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [colWidths, setColWidths] = useState<(number | null)[]>([70, null, 120, 100])

    const sortedTorrents = useMemo(() => {
        if (!sortKey) return filteredTorrents
        return [...filteredTorrents].sort((a, b) => {
            let va: string | number, vb: string | number
            switch (sortKey) {
                case 'status': va = a.volumeCount ?? 0; vb = b.volumeCount ?? 0; break
                case 'name': va = a.name ?? ''; vb = b.name ?? ''; break
                case 'category': va = a.category ?? ''; vb = b.category ?? ''; break
                case 'state': va = a.state ?? ''; vb = b.state ?? ''; break
                default: return 0
            }
            if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
            return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
        })
    }, [filteredTorrents, sortKey, sortDir])

    const toggleSort = useCallback((key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }, [sortKey])

    const sortIcon = useCallback((key: string) => {
        if (sortKey !== key) return null
        return <Icon icon={sortDir === 'asc' ? 'caret-up' : 'caret-down'} size={12}/>
    }, [sortKey, sortDir])

    useEffect(() => {
        fetchTorrents()
    }, [fetchTorrents])

    // Reset selection when filters change
    useEffect(() => {
        setSelectedIdx(null)
    }, [searchText, invertSearch, filterCategory, filterHasVolumes, filterState])

    const selectedTorrent = selectedIdx !== null ? sortedTorrents[selectedIdx] : null

    const handleRowSelect = useCallback(async (idx: number) => {
        const t = sortedTorrents[idx]
        if (!t) return
        if (selectedIdx === idx) {
            if (editor.hasChanges()) await editor.handleSubmit()
            setSelectedIdx(null)
            return
        }
        if (editor.hasChanges()) await editor.handleSubmit()
        setSelectedIdx(idx)
        await editor.open(t.hash, t.name, false)
    }, [sortedTorrents, selectedIdx, editor])

    const hasActiveFilters = !!searchText || filterCategory !== undefined || filterHasVolumes !== undefined || filterState !== undefined

    const filterBar = (
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12}}>
            <InputGroup
                value={searchText}
                onChange={e => setSearchText(e.currentTarget.value)}
                placeholder="搜索种子"
                leftIcon="search"
                style={{width: 250}}
                small
                rightElement={
                    <Tooltip content="反向搜索">
                        <Switch checked={invertSearch} onChange={e => setInvertSearch((e.target as HTMLInputElement).checked)} innerLabel="反" style={{marginBottom: 0, marginRight: 4}}/>
                    </Tooltip>
                }
            />
            <HTMLSelect value={filterCategory ?? ''} onChange={e => setFilterCategory(e.target.value || undefined)} options={[{label: '全部类别', value: ''}, ...categories.map(c => ({label: c, value: c}))]}/>
            <HTMLSelect value={filterState ?? ''} onChange={e => setFilterState(e.target.value || undefined)} options={[{label: '全部状态', value: ''}, ...states.map(s => ({label: s, value: s}))]}/>
            <HTMLSelect value={filterHasVolumes === undefined ? '' : String(filterHasVolumes)} onChange={e => { const v = e.target.value; setFilterHasVolumes(v === '' ? undefined : v === 'true') }} options={[{label: '全部', value: ''}, {label: '已处理', value: 'true'}, {label: '未处理', value: 'false'}]}/>
            <span className="bp6-text-muted" style={{fontSize: 13}}>共 {filteredTorrents.length} 条</span>
        </div>
    )

    if (filteredTorrents.length === 0 && !loading) {
        return (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                {filterBar}
                <NonIdealState
                    icon="inbox"
                    title={hasActiveFilters ? '无匹配结果' : '暂无种子数据'}
                />
            </div>
        )
    }

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            {filterBar}
            <div style={{position: 'relative'}}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--overlay-bg)',
                    }}>
                        <Spinner/>
                    </div>
                )}
                <Table2
                    numRows={sortedTorrents.length}
                    enableRowResizing={false}
                    columnWidths={colWidths}
                    onColumnWidthChanged={(idx, size) => setColWidths(prev => { const n = [...prev]; n[idx] = size; return n })}
                    selectionModes={SelectionModes.ROWS_AND_CELLS}
                    enableMultipleSelection={false}
                    onSelection={regions => {
                        const rowIdx = regions?.[0]?.rows?.[0]
                        if (rowIdx !== undefined) handleRowSelect(rowIdx)
                    }}
                    getCellClipboardData={(row, col) => {
                        const t = sortedTorrents[row]
                        if (!t) return ''
                        switch (col) {
                            case 0: return t.hasVolumes ? `✓${t.volumeCount}` : '✗'
                            case 1: return t.name ?? ''
                            case 2: return t.category ?? ''
                            case 3: return t.state ?? ''
                            default: return ''
                        }
                    }}
                >
                    <Column name="状态" nameRenderer={(name) => <span style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2}} onClick={() => toggleSort('status')}>{name}{sortIcon('status')}</span>} cellRenderer={row => {
                        const t = sortedTorrents[row]
                        return <Cell>
                            {t?.hasVolumes
                                ? <span><Icon icon="tick-circle" intent="success" size={12}/> {t.volumeCount}</span>
                                : <Icon icon="disable" className="bp6-text-muted" size={12}/>}
                        </Cell>
                    }}/>
                    <Column name="名称" nameRenderer={(name) => <span style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2}} onClick={() => toggleSort('name')}>{name}{sortIcon('name')}</span>} cellRenderer={row => <Cell>{sortedTorrents[row]?.name}</Cell>}/>
                    <Column name="类别" nameRenderer={(name) => <span style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2}} onClick={() => toggleSort('category')}>{name}{sortIcon('category')}</span>} cellRenderer={row => {
                        const cat = sortedTorrents[row]?.category
                        return <Cell>{cat ? <Tag minimal>{cat}</Tag> : '—'}</Cell>
                    }}/>
                    <Column name="状态" nameRenderer={(name) => <span style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2}} onClick={() => toggleSort('state')}>{name}{sortIcon('state')}</span>} cellRenderer={row => <Cell>{sortedTorrents[row]?.state || '—'}</Cell>}/>
                </Table2>
            </div>
            <PopoverNext
                isOpen={selectedTorrent !== null}
                content={<Card style={{padding: 12, maxWidth: 900}}><DiscEditorContent {...editor} /></Card>}
                placement="bottom-start"
                arrow={false}
                canEscapeKeyClose
                onClose={() => setSelectedIdx(null)}
                usePortal={false}
                renderTarget={({ref, ...targetProps}) => <div ref={ref} {...targetProps} style={{width: '100%', height: 0}} />}
            />
        </div>
    )
}

export default TorrentsPage
