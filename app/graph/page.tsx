"use client";

import React, {useCallback, useEffect, useState} from "react";
import {Layout, Spin, Tabs, theme, Flex, Space} from "antd";
import type {BddbWork, TorrentWithVolume, Volume} from "@/lib/mongodb";
import {fetchApi} from "@/lib/api";
import {TorrentList} from "./components/TorrentList";
import {WorkList} from "./components/WorkList";
import {FlowCanvas} from "./components/FlowCanvas";
import {BookOutlined, FileOutlined} from "@ant-design/icons";

const {Sider, Content} = Layout;

// 数据类型
interface VolumeWithMedias extends Volume {
    medias?: MediaNode[];
}

interface MediaNode {
    _id: string;
    volume_id: string;
    media_no: number;
    media_type: "bd" | "dvd" | "cd" | "scan";
    content_title?: string;
    description?: string;
}

export interface GraphData {
    torrent?: TorrentWithVolume;
    volumes: VolumeWithMedias[];
    works: BddbWork[];
}

export default function GraphPage() {
    const {token} = theme.useToken();
    const [loading, setLoading] = useState(false);
    const [torrents, setTorrents] = useState<TorrentWithVolume[]>([]);
    const [works, setWorks] = useState<BddbWork[]>([]);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [direction, setDirection] = useState<"left-to-right" | "right-to-left">("left-to-right");
    const [activeTab, setActiveTab] = useState<"works" | "torrents">("works");

    // 加载种子列表
    const fetchTorrents = useCallback(async () => {
        try {
            const res = await fetchApi<TorrentWithVolume[]>("/api/torrents/info");
            if (res.success && res.data) {
                setTorrents(res.data.filter((t) => !t.is_deleted));
            }
        } catch (error) {
            console.error("获取种子列表失败:", error);
        }
    }, []);

    // 加载作品列表
    const fetchWorks = useCallback(async () => {
        try {
            const res = await fetchApi<BddbWork[]>("/api/bangumi/works");
            if (res.success && res.data) {
                setWorks(res.data);
            }
        } catch (error) {
            console.error("获取作品列表失败:", error);
        }
    }, []);

    useEffect(() => {
        fetchTorrents();
        fetchWorks();
    }, [fetchTorrents, fetchWorks]);

    // 点击种子：从左往右显示
    const handleTorrentClick = useCallback(async (torrent: TorrentWithVolume) => {
        setLoading(true);
        setDirection("left-to-right");
        try {
            // 获取该种子的所有 Volume
            const volumesRes = await fetchApi<Volume[]>(`/api/volumes?torrent_id=${torrent._id}`);
            const volumes = volumesRes.success && volumesRes.data ? volumesRes.data : [];

            // 并行获取每个 Volume 的 Medias
            const mediasResList = await Promise.all(
                volumes.map((volume) => fetchApi<MediaNode[]>(`/api/volumes/${volume._id}/medias`))
            );
            const volumesWithMedias: VolumeWithMedias[] = volumes.map((volume, i) => ({
                ...volume,
                medias: mediasResList[i].success && mediasResList[i].data ? mediasResList[i].data : [],
            }));

            // 并行获取关联的 Works
            const workIds = new Set<string>();
            volumes.forEach((v) => v.work_ids?.forEach((id) => workIds.add(id.toString())));
            const worksResList = await Promise.all(
                Array.from(workIds).map((workId) => fetchApi<BddbWork>(`/api/works/${workId}`))
            );
            const relatedWorks = worksResList
                .filter((res) => res.success && res.data)
                .map((res) => res.data!);

            setGraphData({
                torrent,
                volumes: volumesWithMedias,
                works: relatedWorks,
            });
        } catch (error) {
            console.error("加载种子数据失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 点击作品：从右往左显示
    const handleWorkClick = useCallback(async (work: BddbWork) => {
        setLoading(true);
        setDirection("right-to-left");
        try {
            // 获取关联该作品的所有 Volume（服务端过滤）
            const workMongoId = (work as any)._id;
            const volumesRes = await fetchApi<Volume[]>(`/api/volumes?work_id=${workMongoId}`);
            const workVolumes = volumesRes.success && volumesRes.data ? volumesRes.data : [];

            // 并行获取每个 Volume 的 Medias
            const mediasResList = await Promise.all(
                workVolumes.map((volume) => fetchApi<MediaNode[]>(`/api/volumes/${volume._id}/medias`))
            );
            const volumesWithMedias: VolumeWithMedias[] = workVolumes.map((volume, i) => ({
                ...volume,
                medias: mediasResList[i].success && mediasResList[i].data ? mediasResList[i].data : [],
            }));

            setGraphData({
                volumes: volumesWithMedias,
                works: [work],
            });
        } catch (error) {
            console.error("加载作品数据失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const tabItems = [
        {
            key: "torrents",
            label: (
                <Space>
                    <FileOutlined/>
                    种子
                </Space>
            ),
            children: (
                <Flex style={{height: "calc(100vh - 44px - 16px - 46px)", overflow: "hidden"}}>
                    <TorrentList torrents={torrents} onSelect={handleTorrentClick}/>
                </Flex>
            ),
        },
        {
            key: "works",
            label: (
                <Space>
                    <BookOutlined/>
                    作品
                </Space>
            ),
            children: (
                <Flex style={{height: "calc(100vh - 44px - 16px - 46px)", overflow: "hidden"}}>
                    <WorkList works={works} onSelect={handleWorkClick}/>
                </Flex>
            ),
        },
    ];

    return (
        <Layout style={{height: "100%", background: token.colorBgLayout}}>
            {/* 左侧：Tab 切换的种子/作品列表 */}
            <Sider
                width={320}
                theme="light"
                style={{
                    background: token.colorBgContainer,
                    borderRight: `1px solid ${token.colorBorderSecondary}`,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => setActiveTab(key as "torrents" | "works")}
                    items={tabItems}
                    style={{height: "100%", display: "flex", flexDirection: "column"}}
                    tabBarStyle={{
                        padding: "0 16px",
                        marginBottom: 0,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        flexShrink: 0,
                    }}
                />
            </Sider>

            {/* 右侧：绘图区 */}
            <Content style={{
                background: token.colorBgLayout,
                height: "100%",
                overflow: "hidden",
                position: "relative",
            }}>
                <FlowCanvas data={graphData} direction={direction} loading={loading}/>
            </Content>
        </Layout>
    );
}
