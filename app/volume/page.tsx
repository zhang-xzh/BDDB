"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Card, Collapse, Empty, Flex, Pagination, Space, Spin, theme, Tree, Typography} from "antd";
import type {Volume} from "@/lib/db";
import {fetchApi} from "@/lib/api";
import type {DataNode} from 'antd/es/tree';

// ─── Constants & Utilities ────────────────────────────────────────────────────

const PAGE_SIZE = 100

function formatCatalogNo(catalogNo: string): string {
    return catalogNo || '无编号'
}

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

function buildTree(files: FileItem[]) {
    const root: Record<string, any> = {}
    files.forEach(file => {
        const parts = file.name.split('/')
        let current = root
        parts.forEach((part: string, index: number) => {
            if (!current[part]) {
                current[part] = index === parts.length - 1 ? {_file: file} : {}
            }
            current = current[part]
        })
    })

    const convertToTreeData = (node: any, path: string[] = []): any[] => {
        const result: any[] = []
        for (const key of Object.keys(node)) {
            if (key === '_file') continue
            const child = node[key]
            const nodeKey = path.join('/') + (path.length > 0 ? '/' : '') + key
            if (child._file) {
                result.push({key: nodeKey, title: `${key} (${formatSize(child._file.size ?? 0)})`, isLeaf: true})
            } else {
                result.push({key: nodeKey, title: key, children: convertToTreeData(child, [...path, key]), isLeaf: false})
            }
        }
        return result
    }

    return convertToTreeData(root)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileItem {
    id: string;
    name: string;
    size: number | null;
    progress: number | null;
}

// ─── Components ───────────────────────────────────────────────────────────────

const VolumeListHeader: React.FC = () => {
    const {token} = theme.useToken()
    return (
        <Flex align="center" gap={8} style={{padding: '12px 16px', background: token.colorFillAlter}}>
            <Typography.Text strong style={{width: 120, flexShrink: 0, color: token.colorTextHeading}}>
                编号
            </Typography.Text>
            <Typography.Text strong style={{flex: 1, color: token.colorTextHeading}}>
                名称
            </Typography.Text>
        </Flex>
    )
}

const VolumeRowLabel: React.FC<{ volume: Volume }> = ({volume}) => {
    const {token} = theme.useToken()
    return (
        <Flex align="center" gap={8} style={{width: '100%'}}>
            <Typography.Text style={{width: 120, flexShrink: 0, color: token.colorText, fontFamily: 'monospace'}}>
                {formatCatalogNo(volume.catalog_no)}
            </Typography.Text>
            <Typography.Text ellipsis style={{flex: 1, color: token.colorText}}>
                {volume.volume_name || '无标题'}
            </Typography.Text>
        </Flex>
    )
}

const VolumeFileTree: React.FC<{ volumeId: string }> = ({volumeId}) => {
    const [files, setFiles] = useState<FileItem[] | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        setFiles(null)
        fetchApi<string>(`/api/volumes/${volumeId}/files`)
            .then(res => {
                if (res.success && res.data) setFiles(JSON.parse(res.data))
                else setFiles([])
            })
            .catch(() => setFiles([]))
            .finally(() => setLoading(false))
    }, [volumeId])

    const treeData = useMemo(() => (files ? buildTree(files) : []), [files])

    if (loading) return <Spin size="small" style={{margin: 16, display: 'block'}}/>
    if (!files || files.length === 0) return <Empty description="无文件" style={{margin: 16}}/>

    return (
        <Card size="small" title={
            <Space>
                <span>文件列表</span>
                <span style={{color: '#999', fontWeight: 'normal'}}>{files.length} 个文件</span>
            </Space>
        } styles={{body: {padding: 12}}}>
            <Tree<DataNode>
                treeData={treeData}
                defaultExpandedKeys={[]}
                titleRender={(node) => (
                    <Typography.Text ellipsis={{tooltip: node.title as string}}>
                        {node.title as string}
                    </Typography.Text>
                )}
            />
        </Card>
    )
}

const VolumeCollapseList: React.FC<{
    pagedVolumes: Volume[]
    activeKey: string | undefined
    onChange: (key: string | string[]) => void
}> = ({pagedVolumes, activeKey, onChange}) => {
    const collapseItems = useMemo(() =>
        pagedVolumes.map(volume => ({
            key: volume.id,
            label: (
                <Flex justify="space-between" align="center" style={{width: '100%'}}>
                    <VolumeRowLabel volume={volume}/>
                </Flex>
            ),
            children: activeKey === volume.id
                ? <VolumeFileTree volumeId={volume.id}/>
                : null,
        })),
        [pagedVolumes, activeKey])

    return (
        <Collapse
            expandIconPlacement="end"
            bordered={false}
            accordion
            activeKey={activeKey}
            onChange={onChange}
            items={collapseItems}
        />
    )
}

const VolumePagination: React.FC<{
    currentPage: number; total: number; onPageChange: (page: number) => void
}> = ({currentPage, total, onPageChange}) => {
    if (total <= PAGE_SIZE) return null
    return (
        <Flex justify="flex-end">
            <Pagination
                current={currentPage} pageSize={PAGE_SIZE} total={total}
                onChange={onPageChange} showQuickJumper showSizeChanger={false}
            />
        </Flex>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const VolumePage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);

    const pagedVolumes = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return volumes.slice(start, start + PAGE_SIZE)
    }, [volumes, currentPage])

    useEffect(() => {
        setLoading(true);
        fetchApi<string>("/api/volumes")
            .then(res => { if (res.success && res.data) setVolumes(JSON.parse(res.data)) })
            .catch(err => console.error("获取卷数据失败:", err))
            .finally(() => setLoading(false));
    }, []);

    const handleCollapseChange = useCallback((key: string | string[]) => {
        const newKey = Array.isArray(key) ? key[0] : key || undefined
        setActiveKey(newKey)
    }, [])

    if (volumes.length === 0 && !loading) {
        return <Card><Empty description="暂无卷数据"/></Card>
    }

    return (
        <Flex vertical gap={16}>
            <Card>
                <Typography.Text type="secondary">共 {volumes.length} 条卷数据</Typography.Text>
            </Card>
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <VolumeListHeader/>
                    <VolumeCollapseList
                        pagedVolumes={pagedVolumes}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                    />
                </Card>
            </Spin>
            <VolumePagination
                currentPage={currentPage}
                total={volumes.length}
                onPageChange={(page) => {
                    setActiveKey(undefined);
                    setCurrentPage(page);
                }}
            />
        </Flex>
    );
};

export default VolumePage;

