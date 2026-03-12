'use client'

/**
 * EditorTreeNode — 通用文件树节点选择器
 *
 * 同时服务于 DiscEditor（卷分配）和 MediaEditor（媒介分配）。
 * 两者在业务层面的差异完全通过 props 表达：
 *   - formatValue:   将数字值格式化为显示字符串
 *   - isMixed:       节点下子节点值不一致（由外部 renderTreeNodes 计算后传入）
 *   - worksCount:    多作品模式（DiscEditor 专属，> 1 时启用两栏 Popover）
 *   - visibleCount:  可见条目数（无限滚动）
 *   - onLoadMore:    滚动触底时的加载回调
 */

import React, {useMemo, useState} from 'react'
import {
    Box, Checkbox, Chip, Menu, MenuItem, ListSubheader,
    Popover, Stack, Tooltip, Typography,
} from '@mui/material'
import {TreeItem} from '@mui/x-tree-view/TreeItem'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import CallSplitIcon from '@mui/icons-material/CallSplit'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorTreeNodeProps {
    title: string
    nodeKey: string
    isLeaf: boolean
    /** 子节点值不一致（混合），由外部 renderEditorTreeNodes 计算传入 */
    isMixed: boolean
    /** 将数值格式化为显示标签，例如 v => `第${v}卷` 或 v => `媒介 ${v}` */
    formatValue: (v: number) => string
    /** 可见条目数（无限滚动上限） */
    visibleCount: number
    /** 触底时加载更多 */
    onLoadMore: () => void
    /** 多作品模式（> 1 时启用两栏 Popover），仅 DiscEditor 使用 */
    worksCount?: number

    // ── 值读取 ──
    getSingleValue: (key: string) => number | undefined
    getIsShared: (key: string) => boolean
    getSharedValues: (key: string) => number[]

    // ── 值变更 ──
    onSingleChange: (key: string, value: number | null) => void
    onSharedChange: (key: string, values: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
}

// ─── 内部工具 ──────────────────────────────────────────────────────────────────

type MenuEntry = { type: 'header'; label: string } | { type: 'item'; value: number; label: string }

function buildMenuEntries(worksCount: number, visibleCount: number, formatValue: (v: number) => string): MenuEntry[] {
    const entries: MenuEntry[] = []
    if (worksCount <= 1) {
        for (let vi = 1; vi <= visibleCount; vi++) {
            entries.push({type: 'item', value: vi, label: formatValue(vi)})
        }
    } else {
        for (let wi = 1; wi <= worksCount; wi++) {
            entries.push({type: 'header', label: `作品 ${wi}`})
            for (let vi = 1; vi <= visibleCount; vi++) {
                entries.push({type: 'item', value: wi * 1000 + vi, label: formatValue(wi * 1000 + vi)})
            }
        }
    }
    return entries
}

// ─── EditorTreeNode ───────────────────────────────────────────────────────────

export function EditorTreeNode({
    title, nodeKey, isLeaf, isMixed, formatValue, visibleCount, onLoadMore,
    worksCount = 1,
    getSingleValue, getIsShared, getSharedValues,
    onSingleChange, onSharedChange, onToggleShared,
}: EditorTreeNodeProps) {
    const isShared = getIsShared(nodeKey)
    const singleValue = getSingleValue(nodeKey)
    const sharedValues = getSharedValues(nodeKey)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const [activeWork, setActiveWork] = useState(1)

    const hasValue = isShared ? sharedValues.length > 0 : singleValue !== undefined

    // ── Chip 标签 ──────────────────────────────────────────────────────────────
    const chipLabel = isMixed
        ? <Stack direction="row" spacing={0.5} alignItems="center">
            <CallSplitIcon sx={{fontSize: 11}}/>
            <span>混合</span>
          </Stack>
        : isShared
            ? sharedValues.length === 0
                ? '未分配'
                : sharedValues.length === 1
                    ? formatValue(sharedValues[0])
                    : `${formatValue(sharedValues[0])} +${sharedValues.length - 1}`
            : singleValue !== undefined ? formatValue(singleValue) : '未分配'

    // ── 打开 Popover/Menu ──────────────────────────────────────────────────────
    const handleChipClick = (e: React.MouseEvent<HTMLElement>) => {
        if (worksCount > 1) {
            const firstSelected = !isShared
                ? (singleValue !== undefined ? Math.floor(singleValue / 1000) : 1)
                : (sharedValues.length > 0 ? Math.floor(sharedValues[0] / 1000) : 1)
            setActiveWork(firstSelected || 1)
        } else {
            setActiveWork(1)
        }
        setAnchorEl(e.currentTarget)
    }

    // ── 选值 ──────────────────────────────────────────────────────────────────
    const handleMenuItemClick = (val: number) => {
        if (isShared) {
            const next = sharedValues.includes(val)
                ? sharedValues.filter(v => v !== val)
                : [...sharedValues, val]
            onSharedChange(nodeKey, next)
        } else {
            onSingleChange(nodeKey, val)
            setAnchorEl(null)
        }
    }

    // ── 清除 ──────────────────────────────────────────────────────────────────
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isShared) onSharedChange(nodeKey, [])
        else onSingleChange(nodeKey, null)
    }

    // ── 滚动加载（单作品 Menu）────────────────────────────────────────────────
    const handleMenuScroll = (e: React.UIEvent<HTMLUListElement>) => {
        const {scrollTop, scrollHeight, clientHeight} = e.currentTarget
        if (scrollHeight - scrollTop - clientHeight < 20) onLoadMore()
    }

    // ── 滚动加载（多作品 Popover 右栏）────────────────────────────────────────
    const handleColScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) onLoadMore()
    }

    // ── 单作品 Menu ───────────────────────────────────────────────────────────
    const menuEntries = useMemo(
        () => buildMenuEntries(worksCount, visibleCount, formatValue),
        [worksCount, visibleCount, formatValue],
    )

    const regularMenu = (
        <Menu
            anchorEl={anchorEl}
            open={open && worksCount <= 1}
            onClose={() => setAnchorEl(null)}
            MenuListProps={{onScroll: handleMenuScroll as any}}
            PaperProps={{style: {maxHeight: 300}}}
        >
            {!isShared && (
                <MenuItem dense onClick={() => { onSingleChange(nodeKey, null); setAnchorEl(null) }}>
                    <em>清除</em>
                </MenuItem>
            )}
            {menuEntries.map(entry => {
                if (entry.type === 'header') return <ListSubheader key={entry.label}>{entry.label}</ListSubheader>
                const {value: val, label} = entry
                if (!isShared) return (
                    <MenuItem key={val} dense selected={singleValue === val} onClick={() => handleMenuItemClick(val)}>
                        {label}
                    </MenuItem>
                )
                return (
                    <MenuItem key={val} dense selected={sharedValues.includes(val)} onClick={() => handleMenuItemClick(val)}>
                        <Checkbox size="small" checked={sharedValues.includes(val)} sx={{p: 0, mr: 1}}/>
                        {label}
                    </MenuItem>
                )
            })}
        </Menu>
    )

    // ── 多作品独占模式：两栏 Popover ──────────────────────────────────────────
    const multiWorkExclusivePopover = worksCount > 1 && !isShared && (
        <Popover
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
            transformOrigin={{vertical: 'top', horizontal: 'left'}}
        >
            <Stack direction="row" sx={{maxHeight: 280}}>
                {/* 左栏：作品列表 */}
                <Box sx={{width: 80, borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto', py: 0.5}}>
                    <MenuItem dense onClick={() => { onSingleChange(nodeKey, null); setAnchorEl(null) }}
                        sx={{color: 'text.secondary', fontStyle: 'italic', fontSize: '0.75rem'}}>
                        清除
                    </MenuItem>
                    {Array.from({length: worksCount}, (_, i) => i + 1).map(wi => (
                        <MenuItem key={wi} dense selected={activeWork === wi} onClick={() => setActiveWork(wi)}
                            sx={{fontSize: '0.8rem', fontWeight: activeWork === wi ? 600 : 400}}>
                            作品 {wi}
                        </MenuItem>
                    ))}
                </Box>
                {/* 右栏：当前作品的卷列表 */}
                <Box sx={{width: 90, overflowY: 'auto', py: 0.5}} onScroll={handleColScroll}>
                    {Array.from({length: visibleCount}, (_, i) => i + 1).map(vi => {
                        const enc = activeWork * 1000 + vi
                        return (
                            <MenuItem key={enc} dense selected={singleValue === enc}
                                onClick={() => { onSingleChange(nodeKey, enc); setAnchorEl(null) }}
                                sx={{fontSize: '0.8rem'}}>
                                {formatValue(enc)}
                            </MenuItem>
                        )
                    })}
                </Box>
            </Stack>
        </Popover>
    )

    // ── 多作品共享模式：两栏 Popover + Checkbox ───────────────────────────────
    const multiWorkSharedPopover = worksCount > 1 && isShared && (
        <Popover
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
            transformOrigin={{vertical: 'top', horizontal: 'left'}}
        >
            <Stack direction="row" sx={{maxHeight: 280}}>
                {/* 左栏：作品列表，显示该作品已勾选卷数 */}
                <Box sx={{width: 90, borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto', py: 0.5}}>
                    <MenuItem dense onClick={() => onSharedChange(nodeKey, [])}
                        sx={{color: 'text.secondary', fontStyle: 'italic', fontSize: '0.75rem'}}>
                        清除全部
                    </MenuItem>
                    {Array.from({length: worksCount}, (_, i) => i + 1).map(wi => {
                        const checkedCount = sharedValues.filter(v => Math.floor(v / 1000) === wi).length
                        return (
                            <MenuItem key={wi} dense selected={activeWork === wi} onClick={() => setActiveWork(wi)}
                                sx={{fontSize: '0.8rem', fontWeight: activeWork === wi ? 600 : 400,
                                    justifyContent: 'space-between', gap: 0.5}}>
                                <span>作品 {wi}</span>
                                {checkedCount > 0 && (
                                    <Box component="span" sx={{
                                        fontSize: '0.65rem', lineHeight: 1, px: '4px', py: '1px',
                                        borderRadius: '8px', bgcolor: 'primary.main', color: 'primary.contrastText',
                                        flexShrink: 0,
                                    }}>{checkedCount}</Box>
                                )}
                            </MenuItem>
                        )
                    })}
                </Box>
                {/* 右栏：当前作品的卷列表 + Checkbox */}
                <Box sx={{width: 110, overflowY: 'auto', py: 0.5}} onScroll={handleColScroll}>
                    {Array.from({length: visibleCount}, (_, i) => i + 1).map(vi => {
                        const enc = activeWork * 1000 + vi
                        const checked = sharedValues.includes(enc)
                        return (
                            <MenuItem key={enc} dense selected={checked}
                                onClick={() => {
                                    const next = checked
                                        ? sharedValues.filter(v => v !== enc)
                                        : [...sharedValues, enc]
                                    onSharedChange(nodeKey, next)
                                }}
                                sx={{fontSize: '0.8rem', gap: 0.5}}>
                                <Checkbox size="small" checked={checked} sx={{p: 0}}/>
                                {formatValue(enc)}
                            </MenuItem>
                        )
                    })}
                </Box>
            </Stack>
        </Popover>
    )

    return (
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{py: 0.25, width: '100%'}}>
            {isLeaf
                ? <InsertDriveFileIcon sx={{fontSize: 14, color: 'text.disabled', flexShrink: 0}}/>
                : <FolderOpenIcon sx={{fontSize: 14, color: 'warning.main', flexShrink: 0}}/>
            }
            <Typography variant="body2" noWrap sx={{maxWidth: 300, flexShrink: 0}}>{title}</Typography>
            <Stack
                direction="row" alignItems="center" spacing={0.5} sx={{flexShrink: 0}}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
            >
                <Tooltip title={isShared ? '共享模式（点击切换）' : '独占模式（点击切换）'}>
                    <Chip
                        size="small"
                        label={isShared ? '共享' : '独占'}
                        variant={isShared ? 'filled' : 'outlined'}
                        color={isShared ? 'secondary' : 'default'}
                        onClick={() => onToggleShared(nodeKey, !isShared)}
                        sx={{fontSize: '0.7rem', height: 20, cursor: 'pointer', flexShrink: 0,
                            '& .MuiChip-label': {px: '6px'}}}
                    />
                </Tooltip>
                <Chip
                    size="small"
                    label={chipLabel}
                    variant={hasValue ? 'filled' : 'outlined'}
                    color={isMixed ? 'warning' : hasValue ? 'primary' : 'default'}
                    onClick={handleChipClick}
                    onDelete={hasValue ? handleClear : undefined}
                    sx={{fontSize: '0.7rem', height: 20, flexShrink: 0, cursor: 'pointer',
                        '& .MuiChip-label': {px: '6px'},
                        '& .MuiChip-deleteIcon': {fontSize: '14px', mr: '2px'},
                    }}
                />
                {/* 根据 worksCount 和 isShared 渲染对应的菜单/弹出层 */}
                {worksCount <= 1 && regularMenu}
                {worksCount > 1 && !isShared && multiWorkExclusivePopover}
                {worksCount > 1 && isShared && multiWorkSharedPopover}
            </Stack>
        </Stack>
    )
}

// ─── renderEditorTreeNodes ────────────────────────────────────────────────────

/**
 * 通用树节点渲染函数。
 * 外部负责计算 isMixed（每个节点下子节点值是否一致）并传入 EditorTreeNode。
 * computeIsMixed 接收叶节点 key 列表，返回该节点是否为混合状态。
 */
export function renderEditorTreeNodes(
    nodes: any[],
    nodeProps: Omit<EditorTreeNodeProps, 'title' | 'nodeKey' | 'isLeaf' | 'isMixed'>,
    computeIsMixed: (leafKeys: string[], isLeaf: boolean) => boolean,
): React.ReactNode {
    return nodes.map((node: any) => {
        const leafKeys = getLeafKeys(node)
        const isMixed = computeIsMixed(leafKeys, !!node.isLeaf)
        return (
            <TreeItem
                key={node.key}
                itemId={node.key}
                label={
                    <EditorTreeNode
                        title={node.title}
                        nodeKey={node.key}
                        isLeaf={!!node.isLeaf}
                        isMixed={isMixed}
                        {...nodeProps}
                    />
                }
            >
                {node.children?.length
                    ? renderEditorTreeNodes(node.children, nodeProps, computeIsMixed)
                    : null
                }
            </TreeItem>
        )
    })
}

function getLeafKeys(node: any): string[] {
    if (!node.children?.length) return [node.key]
    return node.children.flatMap(getLeafKeys)
}
