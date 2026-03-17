'use client'

import React, {useEffect, useState} from 'react'
import {Card, Empty, Space, Tree, Typography} from 'antd'
import type {DataNode} from 'antd/es/tree'
import type {FileItem} from '@/lib/mongodb'
import {SPACING} from '@/lib/utils'

export interface FileTreeCardProps {
    files: FileItem[]
    treeData: any[]
    /** uncontrolled initial expand keys (DiscEditor / MediaEditor) */
    defaultExpandedKeys?: string[]
    /** controlled expand keys (WorkEditor) */
    expandedKeys?: React.Key[]
    onExpand?: (keys: React.Key[]) => void
    /** per-node title decorator — for DiscEditor / MediaEditor tree node selectors */
    titleRender?: (node: DataNode) => React.ReactNode
    /** extra element in card title, e.g. DiscEditor's 作品数 InputNumber */
    titleExtra?: React.ReactNode
    /** short suffix after file count, e.g. catalog no (WorkEditor) */
    titleSuffix?: string
    blockNode?: boolean
    selectable?: boolean
}

export function FileTreeCard({
    files,
    treeData,
    defaultExpandedKeys,
    expandedKeys: controlledKeys,
    onExpand: controlledOnExpand,
    titleRender,
    titleExtra,
    titleSuffix,
    blockNode,
    selectable,
}: FileTreeCardProps) {
    const [localKeys, setLocalKeys] = useState<React.Key[]>(defaultExpandedKeys ?? [])

    useEffect(() => {
        if (controlledKeys === undefined) {
            setLocalKeys(defaultExpandedKeys ?? [])
        }
    }, [defaultExpandedKeys, controlledKeys])

    const finalKeys = controlledKeys ?? localKeys
    const finalOnExpand = controlledOnExpand ?? ((keys: React.Key[]) => setLocalKeys(keys))

    if (files.length === 0) {
        return <Empty description="暂无文件数据" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
    }

    return (
        <Card size="small" title={
            <Space>
                <Typography.Text>文件列表</Typography.Text>
                <Typography.Text type="secondary" style={{fontWeight: 'normal'}}>
                    {files.length} 个文件{titleSuffix ? ` · ${titleSuffix}` : ''}
                </Typography.Text>
                {titleExtra}
            </Space>
        } styles={{body: {padding: SPACING.md}}}>
            <Tree
                treeData={treeData}
                expandedKeys={finalKeys}
                onExpand={finalOnExpand}
                titleRender={titleRender}
                blockNode={blockNode}
                selectable={selectable}
            />
        </Card>
    )
}
