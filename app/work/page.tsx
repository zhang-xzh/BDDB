'use client'
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {Card, HTMLSelect, Icon, InputGroup, PopoverNext, Spinner, Switch, Tag, Tooltip} from '@blueprintjs/core'
import {Cell, Column, Table2, SelectionModes} from '@blueprintjs/table'
import type {BddbWork, Volume} from '@/lib/mongodb'
import {fetchApi} from '@/lib/api'
import WorkEditorContent, {useWorkEditor} from '@/components/WorkEditor'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VolumeWithWork extends Volume {
    workCount?: number
    works?: BddbWork[]
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCatalogNo(catalogNo: string): string {
    return catalogNo || '无编号'
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

    const filteredVolumes = useMemo(() =>
            volumes.filter(v => matchesFilters(v, {searchCatalogNo, searchTitle, invertTitle, filterHasWork})),
        [volumes, searchCatalogNo, searchTitle, invertTitle, filterHasWork])

    return {
        searchCatalogNo, setSearchCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasWork, setFilterHasWork,
        filteredVolumes,
    }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NONE = '__none__'

// ─── Components ───────────────────────────────────────────────────────────────

const WorkPage: React.FC = () => {
    const [loading, setLoading] = useState(false)
    const [volumes, setVolumes] = useState<VolumeWithWork[]>([])
    const [selectedRow, setSelectedRow] = useState<number | null>(null)

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

    const {
        searchCatalogNo, setSearchCatalogNo,
        searchTitle, setSearchTitle, invertTitle, setInvertTitle,
        filterHasWork, setFilterHasWork,
        filteredVolumes,
    } = useVolumeListView(volumes)

    const editor = useWorkEditor(refreshVolumes)

    // Sort
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [colWidths, setColWidths] = useState<(number | null)[]>([70, 150, null])

    const sortedVolumes = useMemo(() => {
        if (!sortKey) return filteredVolumes
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

    useEffect(() => { refreshVolumes() }, [refreshVolumes])

    const handleRowClick = useCallback(async (rowIndex: number) => {
        const v = sortedVolumes[rowIndex]
        if (!v) return
        // 点击已选中行 → 收起（不自动保存，autoSave=false）
        if (selectedRow === rowIndex) {
            setSelectedRow(null)
            return
        }
        setSelectedRow(rowIndex)
        await editor.open(v._id)
    }, [sortedVolumes, selectedRow, editor])

    const statusRenderer = useCallback((rowIndex: number) => {
        const v = sortedVolumes[rowIndex]
        if (!v) return <Cell/>
        const count = v.workCount ?? 0
        return (
            <Cell>
                {count > 0
                    ? <Tag minimal intent="success" icon="tick-circle">{count}</Tag>
                    : <Icon icon="circle" style={{color: 'var(--gray4)'}}/>}
            </Cell>
        )
    }, [sortedVolumes])

    const catalogRenderer = useCallback((rowIndex: number) => {
        const v = sortedVolumes[rowIndex]
        if (!v) return <Cell/>
        return <Cell style={{fontFamily: 'monospace'}}>{formatCatalogNo(v.catalog_no)}</Cell>
    }, [sortedVolumes])

    const titleRenderer = useCallback((rowIndex: number) => {
        const v = sortedVolumes[rowIndex]
        if (!v) return <Cell/>
        return <Cell>{v.volume_name || '无标题'}</Cell>
    }, [sortedVolumes])

    const hasActiveFilters = searchCatalogNo || searchTitle || filterHasWork !== undefined

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 10, height: '100%'}}>
            {/* Filter bar */}
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8}}>
                <InputGroup
                    value={searchCatalogNo}
                    onValueChange={setSearchCatalogNo}
                    placeholder="搜索编号"
                    style={{width: 200}}
                    small
                />
                <InputGroup
                    value={searchTitle}
                    onValueChange={setSearchTitle}
                    placeholder="搜索标题"
                    style={{width: 300}}
                    small
                    rightElement={
                        <Tooltip content="反向">
                            <Switch
                                checked={invertTitle}
                                onChange={e => setInvertTitle((e.target as HTMLInputElement).checked)}
                                style={{margin: '4px 6px 0 0'}}
                                innerLabel="反"
                            />
                        </Tooltip>
                    }
                />
                <HTMLSelect
                    value={filterHasWork === undefined ? NONE : String(filterHasWork)}
                    onChange={e => {
                        const v = e.target.value
                        setFilterHasWork(v === NONE ? undefined : v === 'true')
                    }}
                    minimal
                    style={{width: 120}}
                >
                    <option value={NONE}>全部</option>
                    <option value="true">已处理</option>
                    <option value="false">未处理</option>
                </HTMLSelect>
                <span className="bp6-text-muted" style={{fontSize: 13}}>共 {filteredVolumes.length} 条</span>
            </div>

            {/* Table or empty state */}
            {loading ? (
                <div style={{display: 'flex', justifyContent: 'center', padding: 40}}>
                    <Spinner/>
                </div>
            ) : filteredVolumes.length === 0 ? (
                <Card style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 40}}>
                    <Icon icon="inbox" size={40} style={{color: 'var(--muted-color)'}}/>
                    <span className="bp6-text-muted">{hasActiveFilters ? '无匹配结果' : '暂无卷数据'}</span>
                </Card>
            ) : (
                <div style={{flex: 1, minHeight: 0}}>
                    <Table2
                        numRows={sortedVolumes.length}
                        selectionModes={SelectionModes.ROWS_AND_CELLS}
                        enableMultipleSelection={false}
                        enableRowResizing={false}
                        columnWidths={colWidths}
                        onColumnWidthChanged={(idx, size) => setColWidths(prev => { const n = [...prev]; n[idx] = size; return n })}
                        onSelection={regions => {
                            const rowIdx = regions?.[0]?.rows?.[0]
                            if (rowIdx !== undefined) handleRowClick(rowIdx)
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
                        <Column name="状态" nameRenderer={(name) => <span style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2}} onClick={() => toggleSort('status')}>{name}{sortIcon('status')}</span>} cellRenderer={statusRenderer}/>
                        <Column name="编号" nameRenderer={(name) => <span style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2}} onClick={() => toggleSort('catalog')}>{name}{sortIcon('catalog')}</span>} cellRenderer={catalogRenderer}/>
                        <Column name="标题" nameRenderer={(name) => <span style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2}} onClick={() => toggleSort('title')}>{name}{sortIcon('title')}</span>} cellRenderer={titleRenderer}/>
                    </Table2>
                    <PopoverNext
                        isOpen={selectedRow !== null}
                        content={<Card style={{padding: 12, maxWidth: 600}}><WorkEditorContent {...editor} /></Card>}
                        placement="bottom-start"
                        arrow={false}
                        canEscapeKeyClose
                        onClose={() => setSelectedRow(null)}
                        usePortal={false}
                        renderTarget={({ref, ...targetProps}) => <div ref={ref} {...targetProps} style={{width: '100%', height: 0}} />}
                    />
                </div>
            )}
        </div>
    )
}

export default WorkPage
