'use client'
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Card, Icon, Menu, MenuDivider, MenuItem, Spinner, Tag} from '@blueprintjs/core'
import {Cell, Column, ColumnHeaderCell, Table2, SelectionModes} from '@blueprintjs/table'
import type {BddbWork, Volume} from '@/lib/mongodb'
import {fetchApi} from '@/lib/api'
import WorkEditorContent, {useWorkEditor} from '@/components/WorkEditor'
import FloatingPanel from '@/components/FloatingPanel'

interface VolumeWithWork extends Volume {
    workCount?: number
    works?: BddbWork[]
}

type SortDir = 'asc' | 'desc' | null

const WorkPage: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const [volumes, setVolumes] = useState<VolumeWithWork[]>([])
    const [selectedRow, setSelectedRow] = useState<number | null>(null)

    // Column widths
    const containerRef = useRef<HTMLDivElement>(null)
    const [colWidths, setColWidths] = useState<(number | null)[]>([70, 150, null])

    // Sort
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>(null)

    // Filters
    const [filterHasWork, setFilterHasWork] = useState<boolean | null>(null)
    const [catalogSearch, setCatalogSearch] = useState('')
    const [titleSearch, setTitleSearch] = useState('')
    const rowClickRef = useRef<{ row: number | null; ts: number }>({row: null, ts: 0})

    const refreshVolumes = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchApi<VolumeWithWork[]>("/api/volumes")
            if (res.success && res.data) setVolumes(res.data)
        } catch (err) {
            console.error("获取卷数据失败:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    const editor = useWorkEditor(refreshVolumes)

    useEffect(() => { refreshVolumes() }, [refreshVolumes])

    // Auto-size columns based on content
    useEffect(() => {
        if (volumes.length === 0) return
        const totalWidth = containerRef.current?.clientWidth ?? 1200
        const statusW = 70
        const charW = 8
        const pad = 24
        const catW = Math.min(250, Math.max(100, pad + charW * Math.max(...volumes.map(v => (v.catalog_no ?? '').length), 4)))
        const titleW = Math.max(200, totalWidth - statusW - catW - 2)
        setColWidths([statusW, catW, titleW])
    }, [volumes])

    // Filter
    const filteredVolumes = useMemo(() => {
        return volumes.filter(v => {
            if (catalogSearch && !v.catalog_no?.toLowerCase().includes(catalogSearch.toLowerCase())) return false
            if (titleSearch && !v.volume_name?.toLowerCase().includes(titleSearch.toLowerCase())) return false
            if (filterHasWork !== null && ((v.workCount ?? 0) > 0) !== filterHasWork) return false
            return true
        })
    }, [volumes, catalogSearch, titleSearch, filterHasWork])

    // Sort
    const sortedVolumes = useMemo(() => {
        if (!sortKey || !sortDir) return filteredVolumes
        return [...filteredVolumes].sort((a, b) => {
            let va: string | number, vb: string | number
            switch (sortKey) {
                case 'status': va = a.workCount ?? 0; vb = b.workCount ?? 0; break
                case 'catalog': va = a.catalog_no ?? ''; vb = b.catalog_no ?? ''; break
                case 'title': va = a.volume_name ?? ''; vb = b.volume_name ?? ''; break
                default: return 0
            }
            if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
            return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
        })
    }, [filteredVolumes, sortKey, sortDir])

    useEffect(() => { setSelectedRow(null) }, [catalogSearch, titleSearch, filterHasWork])

    const handleRowClick = useCallback(async (rowIndex: number) => {
        const v = sortedVolumes[rowIndex]
        if (!v) return
        setSelectedRow(rowIndex)
        await editor.open(v._id)
    }, [sortedVolumes, editor])

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
                <MenuItem icon={filterHasWork === null ? 'tick' : undefined} text="全部" onClick={() => setFilterHasWork(null)}/>
                <MenuItem icon={filterHasWork === true ? 'tick' : undefined} text="有作品" onClick={() => setFilterHasWork(true)}/>
                <MenuItem icon={filterHasWork === false ? 'tick' : undefined} text="无作品" onClick={() => setFilterHasWork(false)}/>
            </Menu>
        )}/>
    )

    const catalogHeaderRenderer = () => (
        <ColumnHeaderCell name={catalogSearch ? `编号 (${catalogSearch})` : '编号'} menuPopoverProps={menuProps} menuRenderer={() => (
            <Menu>
                {sortMenuItems('catalog')}
                <MenuDivider title="搜索"/>
                <li className="bp6-menu-header" style={{padding: '4px 8px'}}>
                    <input
                        className="bp6-input bp6-small bp6-fill"
                        placeholder="搜索编号..."
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                    />
                </li>
                {catalogSearch && <MenuItem icon="cross" text="清除搜索" onClick={() => setCatalogSearch('')}/>}
            </Menu>
        )}/>
    )

    const titleHeaderRenderer = () => (
        <ColumnHeaderCell name={titleSearch ? `标题 (${titleSearch})` : '标题'} menuPopoverProps={menuProps} menuRenderer={() => (
            <Menu>
                {sortMenuItems('title')}
                <MenuDivider title="搜索"/>
                <li className="bp6-menu-header" style={{padding: '4px 8px'}}>
                    <input
                        className="bp6-input bp6-small bp6-fill"
                        placeholder="搜索标题..."
                        value={titleSearch}
                        onChange={e => setTitleSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                    />
                </li>
                {titleSearch && <MenuItem icon="cross" text="清除搜索" onClick={() => setTitleSearch('')}/>}
            </Menu>
        )}/>
    )

    // ─── Render ───────────────────────────────────────────────────
    if (sortedVolumes.length === 0 && !loading) {
        return (
            <Card style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 40}}>
                <Icon icon="inbox" size={40} style={{color: 'var(--muted-color)'}}/>
                <span className="bp6-text-muted">暂无卷数据</span>
            </Card>
        )
    }

    const hasActiveFilter = filterHasWork !== null || catalogSearch !== '' || titleSearch !== ''
    const selectedVolume = selectedRow !== null ? sortedVolumes[selectedRow] : null

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div ref={containerRef} style={{position: 'relative', flex: 1, minHeight: 0}}>
                {loading && (
                    <div style={{position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--overlay-bg)'}}>
                        <Spinner/>
                    </div>
                )}
                <Table2
                    numRows={sortedVolumes.length}
                    enableRowResizing={false}
                    columnWidths={colWidths}
                    onColumnWidthChanged={(idx, size) => setColWidths(prev => { const n = [...prev]; n[idx] = size; return n })}
                    selectionModes={SelectionModes.ROWS_AND_CELLS}
                    enableMultipleSelection={false}
                    onSelection={regions => {
                        const rowIdx = regions?.[0]?.rows?.[0]
                        if (rowIdx === undefined) return
                        setSelectedRow(rowIdx)
                        const now = Date.now()
                        if (rowClickRef.current.row === rowIdx && now - rowClickRef.current.ts < 300) {
                            void handleRowClick(rowIdx)
                            rowClickRef.current = {row: null, ts: 0}
                            return
                        }
                        rowClickRef.current = {row: rowIdx, ts: now}
                    }}
                    getCellClipboardData={(row, col) => {
                        const v = sortedVolumes[row]
                        if (!v) return ''
                        switch (col) {
                            case 0: return String(v.workCount ?? 0)
                            case 1: return v.catalog_no ?? ''
                            case 2: return v.volume_name ?? ''
                            default: return ''
                        }
                    }}
                >
                    <Column name="状态" columnHeaderCellRenderer={statusHeaderRenderer} cellRenderer={row => {
                        const v = sortedVolumes[row]
                        const count = v?.workCount ?? 0
                        return <Cell>
                            {count > 0
                                ? <Tag minimal intent="success" icon="tick-circle">{count}</Tag>
                                : <Icon icon="circle" style={{color: 'var(--muted-color)'}}/>}
                        </Cell>
                    }}/>
                    <Column name="编号" columnHeaderCellRenderer={catalogHeaderRenderer} cellRenderer={row => {
                        const v = sortedVolumes[row]
                        return <Cell style={{fontFamily: 'monospace'}}>{v?.catalog_no || '无编号'}</Cell>
                    }}/>
                    <Column name="标题" columnHeaderCellRenderer={titleHeaderRenderer} cellRenderer={row => <Cell>{sortedVolumes[row]?.volume_name || '无标题'}</Cell>}/>
                </Table2>
            </div>
            {hasActiveFilter && (
                <div style={{padding: '4px 8px', fontSize: 12, color: 'var(--muted-color)'}}>
                    共 {sortedVolumes.length} / {volumes.length} 条
                    {filterHasWork !== null && <Tag minimal style={{marginLeft: 4}} onRemove={() => setFilterHasWork(null)}>{filterHasWork ? '有作品' : '无作品'}</Tag>}
                    {catalogSearch && <Tag minimal style={{marginLeft: 4}} onRemove={() => setCatalogSearch('')}>编号: {catalogSearch}</Tag>}
                    {titleSearch && <Tag minimal style={{marginLeft: 4}} onRemove={() => setTitleSearch('')}>标题: {titleSearch}</Tag>}
                </div>
            )}
            <FloatingPanel
                title={selectedVolume ? `作品编辑 - ${selectedVolume.catalog_no || '无编号'}` : '作品编辑'}
                icon="projects"
                isOpen={selectedRow !== null}
                onClose={() => setSelectedRow(null)}
                width={1000}
                maxHeight={700}
                zIndex={25}
                showCloseButton
            >
                <WorkEditorContent {...editor} />
            </FloatingPanel>
        </div>
    )
}

export default WorkPage
