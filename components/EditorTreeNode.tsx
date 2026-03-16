'use client'

/**
 * EditorTreeNode — 通用文件树节点选择器（BlueprintJS 版）
 *
 * 同时服务于 DiscEditor（卷分配）和 MediaEditor（媒介分配）。
 * 两者在业务层面的差异完全通过 props 表达：
 *   - formatValue:   将数字值格式化为显示字符串
 *   - isMixed:       节点下子节点值不一致（由外部 buildEditorTreeNodes 计算后传入）
 *   - worksCount:    多作品模式（DiscEditor 专属，> 1 时启用两栏 Popover）
 *   - visibleCount:  可见条目数（无限滚动）
 *   - onLoadMore:    滚动触底时的加载回调
 */

import React, {useMemo, useState} from 'react'
import {Checkbox, Icon, Menu, MenuDivider, MenuItem, Popover, Tag, Tooltip} from '@blueprintjs/core'
import type {TreeNodeInfo} from '@blueprintjs/core'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorTreeNodeProps {
    title: string
    nodeKey: string
    isLeaf: boolean
    /** 子节点值不一致（混合），由外部 buildEditorTreeNodes 计算传入 */
    isMixed: boolean
    /** 将数值格式化为显示标签，例如 v => `第${v}卷` 或 v => `媒介 ${v}` */
    formatValue: (v: number) => string
    /** 可见条目数（无限滚动上限） */
    visibleCount: number
    /** 触底时加载更多 */
    onLoadMore: () => void
    /** 多作品模式（> 1 时启用两栏 Popover），仅 DiscEditor 使用 */
    worksCount?: number
    /** 只读模式，不显示选择器按钮 */
    readOnly?: boolean

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
                                   readOnly = false,
                                   getSingleValue, getIsShared, getSharedValues,
                                   onSingleChange, onSharedChange, onToggleShared,
                               }: EditorTreeNodeProps) {
    const isShared = getIsShared(nodeKey)
    const singleValue = getSingleValue(nodeKey)
    const sharedValues = getSharedValues(nodeKey)
    const [open, setOpen] = useState(false)
    const [activeWork, setActiveWork] = useState(1)

    const hasValue = isShared ? sharedValues.length > 0 : singleValue !== undefined

    // ── Tag 标签 ──────────────────────────────────────────────────────────────
    const tagLabel = isMixed
        ? <span style={{display: 'inline-flex', alignItems: 'center', gap: 2}}>
            <Icon icon="git-branch" size={11}/>
            <span>混合</span>
        </span>
        : isShared
            ? sharedValues.length === 0
                ? '未分配'
                : sharedValues.length === 1
                    ? formatValue(sharedValues[0])
                    : `${formatValue(sharedValues[0])} +${sharedValues.length - 1}`
            : singleValue !== undefined ? formatValue(singleValue) : '未分配'

    // ── 打开 Popover/Menu ──────────────────────────────────────────────────────
    const handleTagClick = () => {
        if (worksCount > 1) {
            const firstSelected = !isShared
                ? (singleValue !== undefined ? Math.floor(singleValue / 1000) : 1)
                : (sharedValues.length > 0 ? Math.floor(sharedValues[0] / 1000) : 1)
            setActiveWork(firstSelected || 1)
        } else {
            setActiveWork(1)
        }
        setOpen(true)
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
            setOpen(false)
        }
    }

    // ── 清除 ──────────────────────────────────────────────────────────────────
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isShared) onSharedChange(nodeKey, [])
        else onSingleChange(nodeKey, null)
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

    const regularMenuContent = (
        <Menu style={{maxHeight: 300, overflowY: 'auto'}} onScroll={(e: any) => {
            const {scrollTop, scrollHeight, clientHeight} = e.currentTarget
            if (scrollHeight - scrollTop - clientHeight < 20) onLoadMore()
        }}>
            {!isShared && (
                <MenuItem text={<em>清除</em>} onClick={() => {
                    onSingleChange(nodeKey, null)
                    setOpen(false)
                }}/>
            )}
            {menuEntries.map(entry => {
                if (entry.type === 'header') return <MenuDivider key={entry.label} title={entry.label}/>
                const {value: val, label} = entry
                if (!isShared) return (
                    <MenuItem key={val} text={label} active={singleValue === val}
                              onClick={() => handleMenuItemClick(val)}/>
                )
                return (
                    <MenuItem key={val} active={sharedValues.includes(val)}
                              onClick={() => handleMenuItemClick(val)}
                              text={
                                  <span style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                      <Checkbox checked={sharedValues.includes(val)} style={{margin: 0}}
                                                onChange={() => {/* handled by MenuItem onClick */}}/>
                                      {label}
                                  </span>
                              }/>
                )
            })}
        </Menu>
    )

    // ── 多作品独占模式：两栏 Popover ──────────────────────────────────────────
    const multiWorkExclusiveContent = (
        <div style={{display: 'flex', flexDirection: 'row', maxHeight: 280}}>
            {/* 左栏：作品列表 */}
            <div style={{width: 85, borderRight: '1px solid rgba(16,22,26,0.15)', overflowY: 'auto', padding: '2px 0'}}>
                <Menu>
                    <MenuItem text={<em style={{fontSize: '0.75rem'}}>清除</em>}
                              onClick={() => {
                                  onSingleChange(nodeKey, null)
                                  setOpen(false)
                              }}/>
                    {Array.from({length: worksCount}, (_, i) => i + 1).map(wi => (
                        <MenuItem key={wi} text={`作品 ${wi}`} active={activeWork === wi}
                                  onClick={() => setActiveWork(wi)}/>
                    ))}
                </Menu>
            </div>
            {/* 右栏：当前作品的卷列表 */}
            <div style={{width: 130, overflowY: 'auto', padding: '2px 0'}} onScroll={handleColScroll}>
                <Menu>
                    {Array.from({length: visibleCount}, (_, i) => i + 1).map(vi => {
                        const enc = activeWork * 1000 + vi
                        return (
                            <MenuItem key={enc} text={formatValue(enc)} active={singleValue === enc}
                                      onClick={() => {
                                          onSingleChange(nodeKey, enc)
                                          setOpen(false)
                                      }}/>
                        )
                    })}
                </Menu>
            </div>
        </div>
    )

    // ── 多作品共享模式：两栏 Popover + Checkbox ───────────────────────────────
    const multiWorkSharedContent = (
        <div style={{display: 'flex', flexDirection: 'row', maxHeight: 280}}>
            {/* 左栏：作品列表，显示该作品已勾选卷数 */}
            <div style={{width: 100, borderRight: '1px solid rgba(16,22,26,0.15)', overflowY: 'auto', padding: '2px 0'}}>
                <Menu>
                    <MenuItem text={<em style={{fontSize: '0.75rem'}}>清除全部</em>}
                              onClick={() => onSharedChange(nodeKey, [])}/>
                    {Array.from({length: worksCount}, (_, i) => i + 1).map(wi => {
                        const checkedCount = sharedValues.filter(v => Math.floor(v / 1000) === wi).length
                        return (
                            <MenuItem key={wi} active={activeWork === wi} onClick={() => setActiveWork(wi)}
                                      text={
                                          <span style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4}}>
                                              <span>作品 {wi}</span>
                                              {checkedCount > 0 && (
                                                  <span style={{
                                                      fontSize: '0.65rem', lineHeight: 1, padding: '1px 4px',
                                                      borderRadius: 8, backgroundColor: '#2b6cb0',
                                                      color: '#fff', flexShrink: 0,
                                                  }}>{checkedCount}</span>
                                              )}
                                          </span>
                                      }/>
                        )
                    })}
                </Menu>
            </div>
            {/* 右栏：当前作品的卷列表 + Checkbox */}
            <div style={{width: 150, overflowY: 'auto', padding: '2px 0'}} onScroll={handleColScroll}>
                <Menu>
                    {Array.from({length: visibleCount}, (_, i) => i + 1).map(vi => {
                        const enc = activeWork * 1000 + vi
                        const checked = sharedValues.includes(enc)
                        return (
                            <MenuItem key={enc} active={checked}
                                      onClick={() => {
                                          const next = checked
                                              ? sharedValues.filter(v => v !== enc)
                                              : [...sharedValues, enc]
                                          onSharedChange(nodeKey, next)
                                      }}
                                      text={
                                          <span style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                              <Checkbox checked={checked} style={{margin: 0}}
                                                        onChange={() => {/* handled by MenuItem onClick */}}/>
                                              {formatValue(enc)}
                                          </span>
                                      }/>
                        )
                    })}
                </Menu>
            </div>
        </div>
    )

    // ── 选择弹出内容 ──────────────────────────────────────────────────────────
    const popoverContent = worksCount <= 1
        ? regularMenuContent
        : isShared
            ? multiWorkSharedContent
            : multiWorkExclusiveContent

    return (
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, padding: '1px 0'}}>
            <Icon icon={isLeaf ? 'document' : 'folder-open'} size={14}
                  style={{flexShrink: 0}}
                  color={isLeaf ? undefined : '#d9822b'}/>
            <span style={{fontSize: '0.875rem'}}>{title}</span>
            {!readOnly && (
                <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0}}
                     onClick={e => e.stopPropagation()}
                     onMouseDown={e => e.stopPropagation()}>
                    <Tooltip content={isShared ? '共享模式（点击切换）' : '独占模式（点击切换）'}>
                        <Tag
                            minimal={!isShared}
                            interactive
                            intent={isShared ? 'primary' : 'none'}
                            onClick={() => onToggleShared(nodeKey, !isShared)}
                            style={{fontSize: '0.7rem', minHeight: 20, lineHeight: '18px'}}
                        >
                            {isShared ? '共享' : '独占'}
                        </Tag>
                    </Tooltip>
                    <Popover
                        isOpen={open}
                        onClose={() => setOpen(false)}
                        placement="bottom-start"
                        content={popoverContent}
                    >
                        <Tag
                            minimal={!hasValue}
                            interactive
                            intent={isMixed ? 'warning' : hasValue ? 'primary' : 'none'}
                            onClick={handleTagClick}
                            onRemove={hasValue ? handleClear : undefined}
                            style={{fontSize: '0.7rem', minHeight: 20, lineHeight: '18px'}}
                        >
                            {tagLabel}
                        </Tag>
                    </Popover>
                </div>
            )}
        </div>
    )
}

// ─── buildEditorTreeNodes ─────────────────────────────────────────────────────

/**
 * 通用树节点构建函数，返回 TreeNodeInfo[] 供 BP Tree 使用。
 * 外部负责计算 isMixed（每个节点下子节点值是否一致）并传入 EditorTreeNode。
 * computeIsMixed 接收叶节点 key 列表，返回该节点是否为混合状态。
 */
export function buildEditorTreeNodes(
    nodes: any[],
    nodeProps: Omit<EditorTreeNodeProps, 'title' | 'nodeKey' | 'isLeaf' | 'isMixed'>,
    computeIsMixed: (leafKeys: string[], isLeaf: boolean) => boolean,
): TreeNodeInfo[] {
    return nodes.map(node => {
        const leafKeys = getLeafKeys(node)
        const isMixed = computeIsMixed(leafKeys, !!node.isLeaf)
        return {
            id: node.key,
            label: (
                <EditorTreeNode
                    title={node.title}
                    nodeKey={node.key}
                    isLeaf={!!node.isLeaf}
                    isMixed={isMixed}
                    {...nodeProps}
                />
            ),
            childNodes: node.children?.length
                ? buildEditorTreeNodes(node.children, nodeProps, computeIsMixed)
                : undefined,
        }
    })
}

function getLeafKeys(node: any): string[] {
    if (!node.children?.length) return [node.key]
    return node.children.flatMap(getLeafKeys)
}
