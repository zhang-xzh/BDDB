'use client'

import type { FileItem } from '@/lib/mongodb'
import { SPACING } from '@/lib/utils'
import { BranchesOutlined } from '@ant-design/icons'
import { Card, Cascader, Empty, Select, Space, Switch, Tree, Typography } from 'antd'
import type { DataNode } from 'antd/es/tree'
import React, { useEffect, useState } from 'react'

// ─── FileTreeCard ─────────────────────────────────────────────────────────────

export interface FileTreeCardProps {
    files: FileItem[]
    treeData: any[]
    defaultExpandedKeys?: string[]
    titleRender?: (node: DataNode) => React.ReactNode
    titleExtra?: React.ReactNode
    titleSuffix?: string
    blockNode?: boolean
    selectable?: boolean
}

export function FileTreeCard({
    files,
    treeData,
    defaultExpandedKeys,
    titleRender,
    titleExtra,
    titleSuffix,
    blockNode,
    selectable,
}: FileTreeCardProps) {
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(defaultExpandedKeys ?? [])

    useEffect(() => {
        setExpandedKeys(defaultExpandedKeys ?? [])
    }, [defaultExpandedKeys])

    if (files.length === 0) {
        return <Empty description="暂无文件数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    }

    return (
        <Card size="small" title={
            <Space>
                <Typography.Text>文件列表</Typography.Text>
                <Typography.Text type="secondary" style={{ fontWeight: 'normal' }}>
                    {files.length} 个文件{titleSuffix ? ` · ${titleSuffix}` : ''}
                </Typography.Text>
                {titleExtra}
            </Space>
        } styles={{ body: { padding: SPACING.md } }}>
            <Tree
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={keys => setExpandedKeys(keys)}
                titleRender={titleRender}
                blockNode={blockNode}
                selectable={selectable}
            />
        </Card>
    )
}

// ─── DiscTreeNodeContent ──────────────────────────────────────────────────────

const toCascaderVal = (vn: number | undefined): [number, number] | undefined =>
    vn === undefined ? undefined : [Math.floor(vn / 1000), vn % 1000]
const fromCascaderVal = (val: (string | number)[]): number =>
    (val[0] as number) * 1000 + (val[1] as number)

export interface DiscTreeNodeContentProps {
    title: string
    nodeKey: string
    worksCount: number
    visibleVolumes: number
    loadMoreVolumes: () => void
    getNodeVolume: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedVolumes: (key: string) => number[]
    getComputedNodeValue: (key: string) => { volume_no: number | undefined; isConsistent: boolean }
    onVolumeChange: (key: string, vn: number | null) => void
    onSharedVolumeChange: (key: string, vols: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
}

export function DiscTreeNodeContent({
    title, nodeKey, worksCount, visibleVolumes, loadMoreVolumes,
    getNodeVolume, getNodeShared, getNodeSharedVolumes, getComputedNodeValue,
    onVolumeChange, onSharedVolumeChange, onToggleShared,
}: DiscTreeNodeContentProps) {
    const isShared = getNodeShared(nodeKey)
    const sharedVolumes = getNodeSharedVolumes(nodeKey)
    const computed = getComputedNodeValue(nodeKey)
    const isIndeterminate = !computed.isConsistent && !isShared
    const volumeNo = computed.volume_no

    const selectOptions = Array.from({ length: visibleVolumes }, (_, i) => ({ value: i + 1, label: `第 ${i + 1} 卷` }))
    const cascaderOptions = Array.from({ length: worksCount }, (_, wi) => ({
        label: `作品 ${wi + 1}`, value: wi + 1,
        children: Array.from({ length: visibleVolumes }, (_, vi) => ({ label: `第 ${vi + 1} 卷`, value: vi + 1 })),
    }))

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        if (scrollHeight - scrollTop - clientHeight < 20) loadMoreVolumes()
    }

    const inconsistentIcon = isIndeterminate
        ? <BranchesOutlined style={{ color: '#faad14', pointerEvents: 'none' }} />
        : undefined

    const renderSelector = () => {
        if (worksCount === 1) {
            return (
                <Select
                    mode={isShared ? 'multiple' : undefined}
                    value={isShared ? sharedVolumes : (isIndeterminate ? undefined : volumeNo)}
                    onChange={val => isShared
                        ? onSharedVolumeChange(nodeKey, val as number[])
                        : onVolumeChange(nodeKey, (val as number | undefined) ?? null)}
                    style={{ minWidth: isShared ? 150 : 100, flexShrink: 0 }}
                    size="small"
                    placeholder={isIndeterminate && !isShared ? '不一致' : '卷号'}
                    suffixIcon={!isShared ? inconsistentIcon : undefined}
                    allowClear
                    options={selectOptions} onPopupScroll={handleScroll}
                />
            )
        }
        if (!isShared) {
            return (
                <Cascader
                    value={isIndeterminate ? undefined : toCascaderVal(volumeNo)}
                    onChange={val => !val || !(val as any[]).length
                        ? onVolumeChange(nodeKey, null)
                        : onVolumeChange(nodeKey, fromCascaderVal(val as (string | number)[]))}
                    options={cascaderOptions}
                    placeholder={isIndeterminate ? '不一致' : '作品/卷'}
                    suffixIcon={inconsistentIcon}
                    size="small"
                    style={{ width: 160, flexShrink: 0 }} allowClear
                />
            )
        }
        return (
            <Cascader
                multiple
                value={sharedVolumes.map(vn => toCascaderVal(vn)!)}
                onChange={vals => onSharedVolumeChange(nodeKey, (vals as (string | number)[][]).map(fromCascaderVal))}
                options={cascaderOptions} placeholder="作品/卷（多选）" size="small"
                style={{ minWidth: 200, flexShrink: 0 }}
            />
        )
    }

    return (
        <Space style={{ width: '100%', justifyContent: 'space-between' }} size={4}>
            <Typography.Text ellipsis={{ tooltip: title }} style={{ flex: 1 }}>{title}</Typography.Text>
            <Space size={4}>
                <Switch size="small" checked={isShared}
                    onChange={checked => onToggleShared(nodeKey, checked)}
                    checkedChildren="共享" unCheckedChildren="共享" />
                {renderSelector()}
            </Space>
        </Space>
    )
}

// ─── MediaTreeNodeContent ─────────────────────────────────────────────────────

export interface MediaTreeNodeContentProps {
    title: string
    nodeKey: string
    visibleMedias: number
    loadMoreMedias: () => void
    getNodeMediaNo: (key: string) => number | undefined
    getNodeShared: (key: string) => boolean
    getNodeSharedMedias: (key: string) => number[]
    getComputedNodeValue: (key: string) => { media_no: number | undefined; isConsistent: boolean }
    onMediaNoChange: (key: string, mediaNo: number | null) => void
    onSharedMediaChange: (key: string, medias: number[]) => void
    onToggleShared: (key: string, shared: boolean) => void
}

export function MediaTreeNodeContent({
    title,
    nodeKey,
    visibleMedias,
    loadMoreMedias,
    getNodeMediaNo,
    getNodeShared,
    getNodeSharedMedias,
    getComputedNodeValue,
    onMediaNoChange,
    onSharedMediaChange,
    onToggleShared,
}: MediaTreeNodeContentProps) {
    const isShared = getNodeShared(nodeKey)
    const sharedMedias = getNodeSharedMedias(nodeKey)
    const computed = getComputedNodeValue(nodeKey)

    const mediaNoOptions = Array.from({ length: visibleMedias }, (_, i) => ({
        value: i + 1,
        label: `${i + 1}`,
    }))

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        if (scrollHeight - scrollTop - clientHeight < 20) loadMoreMedias()
    }

    const displayMediaNo = computed.media_no
    const isIndeterminate = !computed.isConsistent

    return (
        <Space style={{ width: '100%', justifyContent: 'space-between' }} size={4}>
            <Typography.Text ellipsis={{ tooltip: title }} style={{ flex: 1 }}>
                {title}
            </Typography.Text>
            <Space size={4}>
                <Switch
                    size="small"
                    checked={isShared}
                    onChange={checked => onToggleShared(nodeKey, checked)}
                    checkedChildren="共享"
                    unCheckedChildren="共享"
                />
                {isShared ? (
                    <Select
                        mode="multiple"
                        value={sharedMedias}
                        onChange={vals => onSharedMediaChange(nodeKey, vals as number[])}
                        style={{ minWidth: 150, flexShrink: 0 }}
                        size="small"
                        placeholder="选择序号（多选）"
                        options={mediaNoOptions}
                        onPopupScroll={handleScroll}
                    />
                ) : (
                    <Select
                        value={isIndeterminate ? undefined : displayMediaNo}
                        onChange={val => onMediaNoChange(nodeKey, (val as number | undefined) ?? null)}
                        style={{ width: 85, flexShrink: 0 }}
                        size="small"
                        placeholder={isIndeterminate ? '不一致' : '序号'}
                        suffixIcon={isIndeterminate
                            ? <BranchesOutlined style={{ color: '#faad14', pointerEvents: 'none' }} />
                            : undefined
                        }
                        options={mediaNoOptions}
                        onPopupScroll={handleScroll}
                        allowClear
                    />
                )}
            </Space>
        </Space>
    )
}
