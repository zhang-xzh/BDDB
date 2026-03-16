'use client'

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Icon, Menu, MenuDivider, MenuItem, NonIdealState, Spinner, Tag} from '@blueprintjs/core'
import {Cell, Column, ColumnHeaderCell, Table2, SelectionModes} from '@blueprintjs/table'
import type {TorrentWithVolume} from '@/lib/mongodb'
import {fetchApi} from '@/lib/api'
import {DiscEditorContent, useDiscEditor} from '@/components/DiscEditor'
import FloatingPanel from '@/components/FloatingPanel'

type SortDir = 'asc' | 'desc' | null

const TorrentsPage: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const [torrents, setTorrents] = useState<TorrentWithVolume[]>([])
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

    // Column widths
    const containerRef = useRef<HTMLDivElement>(null)
    const [colWidths, setColWidths] = useState<(number | null)[]>([70, null, 120, 120])

    // Sort
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>(null)

    // Filters
    const [filterCategory, setFilterCategory] = useState<string | null>(null)
    const [filterState, setFilterState] = useState<string | null>(null)
    const [filterHasVolumes, setFilterHasVolumes] = useState<boolean | null>(null)
    const [nameSearch, setNameSearch] = useState('')
    const rowClickRef = useRef<{ row: number | null; ts: number }>({row: null, ts: 0})

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

    useEffect(() => { fetchTorrents() }, [fetchTorrents])

    // Auto-size columns based on content
    useEffect(() => {
        if (torrents.length === 0) return
        const totalWidth = containerRef.current?.clientWidth ?? 1200
        const statusW = 70
        const charW = 8
        const pad = 24
        const catW = Math.min(220, Math.max(80, pad + charW * Math.max(...torrents.map(t => (t.category ?? '').length), 4)))
        const stateW = Math.min(160, Math.max(80, pad + charW * Math.max(...torrents.map(t => (t.state ?? '').length), 6)))
        const nameW = Math.max(200, totalWidth - statusW - catW - stateW - 2)
        setColWidths([statusW, nameW, catW, stateW])
    }, [torrents])

    // Unique values for filter menus
    const categories = useMemo(() =>
        Array.from(new Set(torrents.map(t => t.category).filter(Boolean) as string[])).sort(),
    [torrents])

    const states = useMemo(() =>
        Array.from(new Set(torrents.map(t => t.state).filter(Boolean) as string[])).sort(),
    [torrents])

    // Filter
    const filteredTorrents = useMemo(() => {
        return torrents.filter(t => {
            if (nameSearch && !t.name?.toLowerCase().includes(nameSearch.toLowerCase())) return false
            if (filterCategory !== null && t.category !== filterCategory) return false
            if (filterState !== null && t.state !== filterState) return false
            if (filterHasVolumes !== null && !!t.hasVolumes !== filterHasVolumes) return false
            return true
        })
    }, [torrents, nameSearch, filterCategory, filterState, filterHasVolumes])

    // Sort
    const sortedTorrents = useMemo(() => {
        if (!sortKey || !sortDir) return filteredTorrents
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

    // Reset selection on filter change
    useEffect(() => { setSelectedIdx(null) }, [nameSearch, filterCategory, filterState, filterHasVolumes])

    const handleRowSelect = useCallback(async (idx: number) => {
        const t = sortedTorrents[idx]
        if (!t) return
        if (editor.hasChanges()) await editor.handleSubmit()
        setSelectedIdx(idx)
        await editor.open(t.hash, t.name, false)
    }, [sortedTorrents, editor])

    const handleDialogClose = useCallback(async () => {
        if (selectedIdx === null) return
        if (!editor.hasChanges()) {
            setSelectedIdx(null)
            return
        }
        const ok = await editor.handleSubmit()
        if (ok) setSelectedIdx(null)
    }, [selectedIdx, editor])

    // ─── Sort helpers ─────────────────────────────────────────────
    const applySortAsc = (key: string) => { setSortKey(key); setSortDir('asc') }
    const applySortDesc = (key: string) => { setSortKey(key); setSortDir('desc') }
    const clearSort = () => { setSortKey(null); setSortDir(null) }

    const sortMenuItems = (key: string) => (
        <>
            <MenuItem icon="sort-asc" text="升序" active={sortKey === key && sortDir === 'asc'} onClick={() => applySortAsc(key)}/>
            <MenuItem icon="sort-desc" text="降序" active={sortKey === key && sortDir === 'desc'} onClick={() => applySortDesc(key)}/>
            {sortKey === key && <MenuItem icon="disable" text="取消排序" onClick={clearSort}/>}
        </>
    )

    // ─── Column header renderers ──────────────────────────────────
    const menuProps = {usePortal: true, placement: 'bottom' as const, rootBoundary: 'document' as const}

    const statusHeaderRenderer = () => (
        <ColumnHeaderCell name="状态" menuPopoverProps={menuProps} menuRenderer={() => (
            <Menu>
                {sortMenuItems('status')}
                <MenuDivider title="筛选"/>
                <MenuItem icon={filterHasVolumes === null ? 'tick' : undefined} text="全部" onClick={() => setFilterHasVolumes(null)}/>
                <MenuItem icon={filterHasVolumes === true ? 'tick' : undefined} text="已处理" onClick={() => setFilterHasVolumes(true)}/>
                <MenuItem icon={filterHasVolumes === false ? 'tick' : undefined} text="未处理" onClick={() => setFilterHasVolumes(false)}/>
            </Menu>
        )}/>
    )

    const nameHeaderRenderer = () => (
        <ColumnHeaderCell name={nameSearch ? `名称 (${nameSearch})` : '名称'} menuPopoverProps={menuProps} menuRenderer={() => (
            <Menu>
                {sortMenuItems('name')}
                <MenuDivider title="搜索"/>
                <li className="bp6-menu-header" style={{padding: '4px 8px'}}>
                    <input
                        className="bp6-input bp6-small bp6-fill"
                        placeholder="搜索名称..."
                        value={nameSearch}
                        onChange={e => setNameSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                    />
                </li>
                {nameSearch && <MenuItem icon="cross" text="清除搜索" onClick={() => setNameSearch('')}/>}
            </Menu>
        )}/>
    )

    const categoryHeaderRenderer = () => (
        <ColumnHeaderCell name="类别" menuPopoverProps={menuProps} menuRenderer={() => (
            <Menu>
                {sortMenuItems('category')}
                <MenuDivider title="筛选"/>
                <MenuItem icon={filterCategory === null ? 'tick' : undefined} text="全部" onClick={() => setFilterCategory(null)}/>
                {categories.map(c => (
                    <MenuItem key={c} icon={filterCategory === c ? 'tick' : undefined} text={c} onClick={() => setFilterCategory(c)}/>
                ))}
            </Menu>
        )}/>
    )

    const stateHeaderRenderer = () => (
        <ColumnHeaderCell name="qBit状态" menuPopoverProps={menuProps} menuRenderer={() => (
            <Menu>
                {sortMenuItems('state')}
                <MenuDivider title="筛选"/>
                <MenuItem icon={filterState === null ? 'tick' : undefined} text="全部" onClick={() => setFilterState(null)}/>
                {states.map(s => (
                    <MenuItem key={s} icon={filterState === s ? 'tick' : undefined} text={s} onClick={() => setFilterState(s)}/>
                ))}
            </Menu>
        )}/>
    )

    // ─── Render ───────────────────────────────────────────────────
    if (sortedTorrents.length === 0 && !loading) {
        return <NonIdealState icon="inbox" title="暂无种子数据"/>
    }

    const hasActiveFilter = filterCategory !== null || filterState !== null || filterHasVolumes !== null || nameSearch !== ''
    const selectedTorrent = selectedIdx !== null ? sortedTorrents[selectedIdx] : null

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div ref={containerRef} style={{position: 'relative', flex: 1, minHeight: 0}}>
                {loading && (
                    <div style={{position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--overlay-bg)'}}>
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
                        if (rowIdx === undefined) return
                        setSelectedIdx(rowIdx)
                        const now = Date.now()
                        if (rowClickRef.current.row === rowIdx && now - rowClickRef.current.ts < 300) {
                            void handleRowSelect(rowIdx)
                            rowClickRef.current = {row: null, ts: 0}
                            return
                        }
                        rowClickRef.current = {row: rowIdx, ts: now}
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
                    <Column name="状态" columnHeaderCellRenderer={statusHeaderRenderer} cellRenderer={row => {
                        const t = sortedTorrents[row]
                        return <Cell>
                            {t?.hasVolumes
                                ? <span><Icon icon="tick-circle" intent="success" size={12}/> {t.volumeCount}</span>
                                : <Icon icon="disable" className="bp6-text-muted" size={12}/>}
                        </Cell>
                    }}/>
                    <Column name="名称" columnHeaderCellRenderer={nameHeaderRenderer} cellRenderer={row => <Cell>{sortedTorrents[row]?.name}</Cell>}/>
                    <Column name="类别" columnHeaderCellRenderer={categoryHeaderRenderer} cellRenderer={row => {
                        const cat = sortedTorrents[row]?.category
                        return <Cell>{cat ? <Tag minimal>{cat}</Tag> : '—'}</Cell>
                    }}/>
                    <Column name="qBit状态" columnHeaderCellRenderer={stateHeaderRenderer} cellRenderer={row => <Cell>{sortedTorrents[row]?.state || '—'}</Cell>}/>
                </Table2>
            </div>
            {hasActiveFilter && (
                <div style={{padding: '4px 8px', fontSize: 12, color: 'var(--muted-color)'}}>
                    共 {sortedTorrents.length} / {torrents.length} 条
                    {filterCategory && <Tag minimal style={{marginLeft: 4}} onRemove={() => setFilterCategory(null)}>类别: {filterCategory}</Tag>}
                    {filterState && <Tag minimal style={{marginLeft: 4}} onRemove={() => setFilterState(null)}>状态: {filterState}</Tag>}
                    {filterHasVolumes !== null && <Tag minimal style={{marginLeft: 4}} onRemove={() => setFilterHasVolumes(null)}>{filterHasVolumes ? '已处理' : '未处理'}</Tag>}
                    {nameSearch && <Tag minimal style={{marginLeft: 4}} onRemove={() => setNameSearch('')}>搜索: {nameSearch}</Tag>}
                </div>
            )}
            <FloatingPanel
                title={selectedTorrent ? `种子编辑 - ${selectedTorrent.name}` : '种子编辑'}
                icon="edit"
                isOpen={selectedIdx !== null}
                onClose={() => { void handleDialogClose() }}
                width={1100}
                maxHeight={700}
                zIndex={25}
                showCloseButton
            >
                <DiscEditorContent {...editor} />
            </FloatingPanel>
        </div>
    )
}

export default TorrentsPage
