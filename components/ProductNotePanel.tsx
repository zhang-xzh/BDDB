import React, {useEffect, useMemo, useState} from "react";
import {fetchApi} from "@/lib/api";
import {Card, Empty, Flex, Skeleton, Space, Tree, Typography} from "antd";
import {SPACING} from "@/lib/utils";
import {ProductNoteData} from "@/components/MediaEditor";
import {DataNode} from "antd/es/tree";

interface JsonTreeProps {
    data: unknown;
    title?: string;
    maxHeight?: number;
}

/**
 * 将任意 JSON 数据转换为 Tree 组件所需的 DataNode 结构
 */
function buildJsonTreeNodes(data: unknown, key: string = "root", title: string = "root"): DataNode {
    const type = data === null ? "null" : Array.isArray(data) ? "array" : typeof data;

    if (data === null) {
        return {
            key,
            title: (
                <Space>
                    <Typography.Text strong>{title}</Typography.Text>
                    <Typography.Text type="secondary">: null</Typography.Text>
                </Space>
            )
        };
    }

    if (type === "undefined") {
        return {
            key,
            title: (
                <Space>
                    <Typography.Text strong>{title}</Typography.Text>
                    <Typography.Text type="secondary">: undefined</Typography.Text>
                </Space>
            )
        };
    }

    if (type !== "object") {
        // 基本类型
        const valueStr = String(data);

        return {
            key,
            title: (
                <Flex gap="small" style={{width: "100%"}} align="flex-start">
                    <Typography.Text strong>{title}</Typography.Text>
                    <Typography.Text type="secondary">: </Typography.Text>
                    <Typography.Text style={{flex: 1}}>
                        <span dangerouslySetInnerHTML={{__html: valueStr}}/>
                    </Typography.Text>
                </Flex>
            )
        };
    }

    // 对象或数组
    const isArray = Array.isArray(data);
    const entries = Object.entries(data as Record<string, unknown>);
    const count = entries.length;

    const nodeTitle = (
        <Flex gap="small" style={{width: "100%"}}>
            <Typography.Text strong>{title}</Typography.Text>
            <Typography.Text type="secondary">
                {isArray ? ` [${count}]` : ` {${count}}`}
            </Typography.Text>
        </Flex>
    );

    if (count === 0) {
        return {
            key,
            title: nodeTitle,
        };
    }

    return {
        key,
        title: nodeTitle,
        children: entries.map(([childKey, childValue], index) => {
            const childTitle = isArray ? `[${childKey}]` : childKey;
            return buildJsonTreeNodes(childValue, `${key}-${childKey}-${index}`, childTitle);
        }),
    };
}

/**
 * JSON 树形展示组件
 * 将任意 JSON 数据以树状结构展示
 */
export function JsonTree({data, title = "JSON 数据"}: JsonTreeProps) {
    const treeData = useMemo(() => {
        if (data === null || data === undefined) {
            return [];
        }
        return [buildJsonTreeNodes(data, "root", title)];
    }, [data, title]);

    if (data === null || data === undefined) {
        return <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE}/>;
    }

    return (
        <Tree
            treeData={treeData}
            defaultExpandedKeys={["root"]}
        />
    );
}

/**
 * 产品 Note 信息展示组件
 * 从 bddb_volumes 的 product_ids 获取第一个 product_id
 * 查询 suruga_ya.products 的 note 字段并以树形展示
 */
export function ProductNotePanel({volumeId}: { volumeId?: string }) {
    const [noteData, setNoteData] = useState<ProductNoteData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!volumeId) {
            setNoteData(null);
            setError(null);
            return;
        }

        let cancelled = false;

        async function loadProductNote() {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchApi<{
                    product_id: string;
                    title: string;
                    note: unknown;
                }>(`/api/volumes/${volumeId}/product-note`);

                if (cancelled) return;

                if (result?.success && result.data) {
                    setNoteData(result.data);
                } else {
                    setError(result?.error || "获取产品信息失败");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "获取产品信息失败");
                }
            } finally {
                // 确保 loading 状态被重置，即使组件已卸载
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadProductNote();

        return () => {
            cancelled = true;
        };
    }, [volumeId]);

    if (loading) {
        return (
            <Card size="small" title="产品信息" loading>
                <Skeleton active paragraph={{rows: 4}}/>
            </Card>
        );
    }

    if (error || !noteData) {
        return (
            <Card size="small" title="产品信息">
                <Empty
                    description={error || "暂无产品信息"}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Card>
        );
    }

    return (
        <Card
            size="small"
            title={
                <Typography.Text strong>产品信息</Typography.Text>
            }
            styles={{body: {padding: SPACING.md}}}>
            <JsonTree data={noteData.note} title="note" maxHeight={500}/>
        </Card>
    );
}