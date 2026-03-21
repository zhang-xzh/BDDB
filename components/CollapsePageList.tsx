import {Collapse, Flex} from 'antd';
import React, {type ReactNode, useMemo} from 'react';

/**
 * 行标签包装器：展开时阻止点击冒泡（防止误触收起），收起时允许点击展开。
 * 自动预留左侧 24px 空间与列表表头对齐（Collapse 展开图标位置）。
 *
 * 使用方式：children 应该是一个 Flex 组件或类似的内容，会被放在占位符之后。
 */
export const ExpandBlocker: React.FC<{ isExpanded: boolean; children: ReactNode }> = ({isExpanded, children}) => {
    return (
        <Flex
            onClick={(e) => isExpanded && e.stopPropagation()}
            align="center"
            gap={8}
            style={{width: '100%', cursor: 'pointer'}}
        >
            <Flex style={{width: 24, flexShrink: 0}}/>
            {children}
        </Flex>
    )
}

// ─── CollapsePageList ─────────────────────────────────────────────────────────

interface CollapsePageListProps<T> {
    items: T[]
    getKey: (item: T) => string
    activeKey: string | undefined
    onChange: (key: string | string[]) => Promise<void>
    renderLabel: (item: T, isExpanded: boolean) => ReactNode
    renderContent: (item: T) => ReactNode | null
}

function CollapsePageList<T>({items, getKey, activeKey, onChange, renderLabel, renderContent}: CollapsePageListProps<T>) {
    const collapseItems = useMemo(() =>
            items.map(item => {
                const key = getKey(item)
                const isExpanded = activeKey === key
                return {
                    key,
                    label: renderLabel(item, isExpanded),
                    children: isExpanded ? renderContent(item) : null,
                    collapsible: isExpanded ? 'icon' as const : 'header' as const,
                }
            }),
        [items, getKey, activeKey, renderLabel, renderContent])

    return (
        <Collapse
            expandIconPlacement="start"
            bordered={false}
            accordion
            size="small"
            activeKey={activeKey}
            onChange={onChange}
            items={collapseItems}
        />
    )
}

export default CollapsePageList
