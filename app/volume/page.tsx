"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Card, Collapse, Empty, Flex, Pagination, Space, Spin, theme, Typography, Tree} from "antd";
import type {Volume} from "@/lib/db";
import {fetchApi} from "@/lib/api";

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

function buildTree(files: any[]) {
    const root: Record<string, any> = {}
    const fileToKeyMap = new Map<string, string>()

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
            if (child._file) {
                result.push({
                    key: path.join('/') + (path.length > 0 ? '/' : '') + key,
                    title: (
                        <Flex justify="space-between" style={{width: '100%'}}>
                            <Typography.Text ellipsis>{key}</Typography.Text>
                            <Typography.Text type="secondary" style={{fontSize: 12}}>
                                {formatSize(child._file.size)}
                            </Typography.Text>
                        </Flex>
                    ),
                    isLeaf: true,
                    data: child._file
                })
            } else {
                result.push({
                    key: path.join('/') + (path.length > 0 ? '/' : '') + key,
                    title: key,
                    children: convertToTreeData(child, [...path, key]),
                    isLeaf: false
                })
            }
        }
        return result
    }

    return convertToTreeData(root)
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useVolumeListView(volumes: Volume[]) {
    const [currentPage, setCurrentPage] = useState(1)

    const pagedVolumes = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return volumes.slice(start, start + PAGE_SIZE)
    }, [volumes, currentPage])

    return {
        currentPage, setCurrentPage, pagedVolumes, total: volumes.length
    }
}

// ─── Components ───────────────────────────────────────────────────────────────

const VolumeListHeader: React.FC = () => {
    const {token} = theme.useToken()
    return (
        <Flex align="center" gap={8} style={{
            padding: '12px 16px',
            background: token.colorFillAlter,
        }}>
            <Typography.Text
              strong
              style={{
                width: 80,
                flexShrink: 0,
                color: token.colorTextHeading
              }}
            >
              类型
            </Typography.Text>
            <Typography.Text
              strong
              style={{
                width: 120,
                flexShrink: 0,
                color: token.colorTextHeading
              }}
            >
              编号
            </Typography.Text>
            <Typography.Text
              strong
              style={{flex: 1, color: token.colorTextHeading}}
            >
              名称
            </Typography.Text>
            <Typography.Text
              strong
              style={{
                width: 60,
                flexShrink: 0,
                textAlign: 'right',
                color: token.colorTextHeading
              }}
            >
              碟片数
            </Typography.Text>
        </Flex>
    )
}

const VolumeRowLabel: React.FC<{ volume: Volume }> = ({volume}) => {
    const {token} = theme.useToken()
    return (
        <Flex align="center" gap={8} style={{width: '100%'}}>
            <Flex style={{width: 80, flexShrink: 0}}>
                {volume.type === 'box'
                    ? <Typography.Text style={{color: token.colorPrimary}}>盒装</Typography.Text>
                    : <Typography.Text style={{color: token.colorSuccess}}>单碟</Typography.Text>}
            </Flex>
            <Typography.Text
              style={{
                width: 120,
                flexShrink: 0,
                color: token.colorText,
                fontFamily: 'monospace'
              }}
            >
              {formatCatalogNo(volume.catalog_no)}
            </Typography.Text>
            <Typography.Text
              ellipsis
              style={{flex: 1, color: token.colorText}}
            >
              {volume.volume_name || '无标题'}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              style={{
                width: 60,
                flexShrink: 0,
                textAlign: 'right',
                fontSize: 12,
                color: token.colorTextSecondary
              }}
            >
                {volume.torrent_file_ids.length}
            </Typography.Text>
        </Flex>
    )
}

const VolumeFileTree: React.FC<{ files: any[] }> = ({files}) => {
    const treeData = useMemo(() => buildTree(files), [files])
    
    if (files.length === 0) {
        return <Empty description="无文件" style={{margin: 16}}/>
    }

    return (
        <Card size="small" style={{margin: '8px 0'}}>
            <Typography.Text strong style={{display: 'block', marginBottom: 8}}>
                文件树 ({files.length} 个文件)
            </Typography.Text>
            <div style={{maxHeight: 400, overflow: 'auto'}}>
                <Tree
                    treeData={treeData}
                    blockNode
                    showIcon={false}
                    defaultExpandAll
                />
            </div>
        </Card>
    )
}

const VolumeCollapseList: React.FC<{
    pagedVolumes: VolumeWithFiles[]
    activeKey: string | undefined
    onChange: (key: string | string[]) => void
    onCancel: () => void
}> = ({pagedVolumes, activeKey, onChange, onCancel}) => {
    const {token} = theme.useToken()

    const collapseItems = useMemo(() =>
            pagedVolumes.map(volume => ({
                key: volume.id,
                label: <VolumeRowLabel volume={volume}/>,
                children: (
                    <Card
                        size="small"
                        style={{margin: '8px 0', backgroundColor: token.colorBgContainer}}
                        extra={
                            <Typography.Text type="secondary" style={{fontSize: 12}}>
                                ID: {volume.id}
                            </Typography.Text>
                        }
                    >
                        <Space direction="vertical" style={{width: '100%'}} size="small">
                            <Flex justify="space-between">
                                <Typography.Text type="secondary">类型: {volume.type === 'box' ? '盒装' : '单碟'}</Typography.Text>
                                <Typography.Text type="secondary">编号: {volume.catalog_no || '无'}</Typography.Text>
                            </Flex>
                            <Flex justify="space-between">
                                <Typography.Text type="secondary">名称: {volume.volume_name || '无'}</Typography.Text>
                                <Typography.Text type="secondary">更新时间: {new Date(volume.updated_at * 1000).toLocaleString('zh-CN')}</Typography.Text>
                            </Flex>
                            <Flex justify="space-between">
                                <Typography.Text type="secondary">文件数: {volume.torrent_file_ids.length}</Typography.Text>
                                <Typography.Text type="secondary">种子ID: {volume.torrent_id}</Typography.Text>
                            </Flex>
                            {volume.torrent_name && (
                                <Typography.Text type="secondary" style={{wordBreak: 'break-all'}}>
                                    种子名称: {volume.torrent_name}
                                </Typography.Text>
                            )}
                            {volume.files && volume.files.length > 0 && (
                                <VolumeFileTree files={volume.files} />
                            )}
                        </Space>
                    </Card>
                ),
            })),
        [pagedVolumes, token])

    return (
        <Collapse
            bordered={false} accordion activeKey={activeKey} onChange={onChange}
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

interface VolumeWithFiles extends Volume {
    torrent_name?: string;
    files?: any[];
}

const VolumePage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [volumes, setVolumes] = useState<VolumeWithFiles[]>([]);
    const [activeKey, setActiveKey] = useState<string | undefined>(undefined);

    const fetchVolumes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi<string>("/api/volumes");
            if (res.success && res.data) setVolumes(JSON.parse(res.data));
        } catch (error) {
            console.error("获取卷数据失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const {currentPage, setCurrentPage, pagedVolumes, total} = useVolumeListView(volumes);

    useEffect(() => {
        fetchVolumes();
    }, [fetchVolumes]);

    const handleCollapseChange = useCallback((key: string | string[]) => {
        const newKey = Array.isArray(key) ? key[0] : key || undefined
        setActiveKey(newKey)
    }, [])

    if (volumes.length === 0 && !loading) {
        return (
            <Card>
                <Empty description="暂无卷数据"/>
            </Card>
        )
    }

    return (
        <Flex vertical gap={16}>
            <Card>
                <Space>
                    <Typography.Text type="secondary">
                        共 {total} 条卷数据
                    </Typography.Text>
                </Space>
            </Card>
            <Spin spinning={loading}>
                <Card styles={{body: {padding: 0}}}>
                    <VolumeListHeader/>
                    <VolumeCollapseList
                        pagedVolumes={pagedVolumes}
                        activeKey={activeKey}
                        onChange={handleCollapseChange}
                        onCancel={() => setActiveKey(undefined)}
                    />
                </Card>
            </Spin>
            <VolumePagination
                currentPage={currentPage}
                total={total}
                onPageChange={(page) => setCurrentPage(page)}
            />
        </Flex>
    );
};

export default VolumePage;
