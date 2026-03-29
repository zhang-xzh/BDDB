"use client";

import React, { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Empty, Typography, theme, Flex } from "antd";
import type { GraphData } from "../page";
import { TorrentNode } from "./nodes/TorrentNode";
import { VolumeNode } from "./nodes/VolumeNode";
import { MediaNode } from "./nodes/MediaNode";
import { WorkNode } from "./nodes/WorkNode";

const nodeTypes: NodeTypes = {
  torrent: TorrentNode,
  volume: VolumeNode,
  media: MediaNode,
  work: WorkNode,
};

interface FlowCanvasProps {
  data: GraphData | null;
  direction: "left-to-right" | "right-to-left";
}

// 节点样式
const NODE_GAP = 100;

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ data, direction }) => {
  const { token } = theme.useToken();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const isRTL = direction === "right-to-left";

  // 生成节点和边
  const { generatedNodes, generatedEdges } = useMemo(() => {
    if (!data) return { generatedNodes: [], generatedEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yOffset = 0;

    if (isRTL) {
      // ========== 从右往左：Work 起始 ==========
      const workX = 800;
      const volumeX = 520;
      const mediaX = 240;

      // Level 1: Works (右侧)
      data.works.forEach((work, index) => {
        nodes.push({
          id: `work-${work.id}`,
          type: "work",
          position: { x: workX, y: yOffset + index * NODE_GAP },
          data: { work },
        });
      });

      // Level 2: Volumes (中间)
      const volumeYMap = new Map<string, number>();
      data.volumes.forEach((volume, vIndex) => {
        const y = yOffset + vIndex * NODE_GAP;
        volumeYMap.set(volume._id as string, y);

        nodes.push({
          id: `volume-${volume._id}`,
          type: "volume",
          position: { x: volumeX, y },
          data: { volume },
        });

        // Volume -> Work 边
        volume.work_ids?.forEach((workId) => {
          const workIdStr = workId.toString();
          const work = data.works.find((w) => {
            const workMongoId = (w as any)._id;
            return workMongoId === workIdStr || workMongoId?.toString() === workIdStr;
          });
          if (work) {
            edges.push({
              id: `edge-work-${work.id}-volume-${volume._id}`,
              source: `work-${work.id}`,
              target: `volume-${volume._id}`,
              animated: true,
              style: { stroke: token.colorSuccess, strokeWidth: 2 },
            });
          }
        });
      });

      // Level 3: Medias (左侧)
      data.volumes.forEach((volume) => {
        const volumeY = volumeYMap.get(volume._id as string) || 0;
        volume.medias?.forEach((media, mIndex) => {
          const y = volumeY + mIndex * (NODE_GAP * 0.8);
          nodes.push({
            id: `media-${media._id}`,
            type: "media",
            position: { x: mediaX, y },
            data: { media },
          });

          edges.push({
            id: `edge-volume-${volume._id}-media-${media._id}`,
            source: `volume-${volume._id}`,
            target: `media-${media._id}`,
            animated: false,
            style: { stroke: token.colorWarning, strokeWidth: 1.5 },
          });
        });
      });
    } else {
      // ========== 从左往右：Torrent 起始 ==========
      const torrentX = 0;
      const volumeX = 280;
      const mediaX = 560;
      const workX = 840;

      // Level 1: Torrent
      if (data.torrent) {
        nodes.push({
          id: `torrent-${data.torrent.hash}`,
          type: "torrent",
          position: { x: torrentX, y: yOffset },
          data: { torrent: data.torrent },
        });
      }

      // Level 2: Volumes
      const volumeYMap = new Map<string, number>();
      data.volumes.forEach((volume, index) => {
        const y = yOffset + index * NODE_GAP;
        volumeYMap.set(volume._id as string, y);

        nodes.push({
          id: `volume-${volume._id}`,
          type: "volume",
          position: { x: volumeX, y },
          data: { volume },
        });

        // Torrent -> Volume 边
        if (data.torrent) {
          edges.push({
            id: `edge-torrent-${data.torrent.hash}-volume-${volume._id}`,
            source: `torrent-${data.torrent.hash}`,
            target: `volume-${volume._id}`,
            animated: false,
            style: { stroke: token.colorPrimary, strokeWidth: 2 },
          });
        }
      });

      // Level 3: Medias
      let mediaIndex = 0;
      data.volumes.forEach((volume) => {
        volume.medias?.forEach((media) => {
          const volumeY = volumeYMap.get(volume._id as string) || 0;
          const y = volumeY + mediaIndex * 60;
          mediaIndex++;

          nodes.push({
            id: `media-${media._id}`,
            type: "media",
            position: { x: mediaX, y },
            data: { media },
          });

          edges.push({
            id: `edge-volume-${volume._id}-media-${media._id}`,
            source: `volume-${volume._id}`,
            target: `media-${media._id}`,
            animated: false,
            style: { stroke: token.colorWarning, strokeWidth: 1.5 },
          });
        });
      });

      // Level 4: Works
      data.works.forEach((work, index) => {
        nodes.push({
          id: `work-${work.id}`,
          type: "work",
          position: { x: workX, y: yOffset + index * NODE_GAP },
          data: { work },
        });

        // 找到关联的 volumes
        const workMongoId = (work as any)._id?.toString();
        data.volumes.forEach((volume) => {
          if (volume.work_ids?.some((id) => id.toString() === workMongoId)) {
            edges.push({
              id: `edge-volume-${volume._id}-work-${work.id}`,
              source: `volume-${volume._id}`,
              target: `work-${work.id}`,
              animated: true,
              style: { stroke: token.colorSuccess, strokeWidth: 2 },
            });
          }
        });
      });
    }

    return { generatedNodes: nodes, generatedEdges: edges };
  }, [data, isRTL, token]);

  useEffect(() => {
    setNodes(generatedNodes as any);
    setEdges(generatedEdges as any);
  }, [generatedNodes, generatedEdges, setNodes, setEdges]);

  if (!data) {
    return (
      <Flex 
        align="center" 
        justify="center"
        style={{ 
          width: "100%", 
          height: "100%",
          background: token.colorBgLayout,
        }}
      >
        <Empty description={
          <>
            点击左侧种子或右侧作品
            <br />
            查看数据关系图
          </>
        } />
      </Flex>
    );
  }

  return (
    <Flex vertical style={{ width: "100%", height: "100%", position: "relative", background: token.colorBgLayout }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
      >
        <Background color="#ccc" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
      
      {/* Legend */}
      <Flex 
        align="center"
        gap={16}
        style={{ 
          position: "absolute", 
          bottom: 16, 
          left: 16, 
          background: "rgba(255, 255, 255, 0.95)", 
          padding: "8px 16px", 
          borderRadius: 6, 
          boxShadow: token.boxShadow,
          zIndex: 10,
        }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <Flex align="center" gap={6} style={{ display: "inline-flex", marginRight: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: token.colorPrimary }} />
            种子
          </Flex>
          <Flex align="center" gap={6} style={{ display: "inline-flex", marginRight: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#722ed1" }} />
            卷/碟
          </Flex>
          <Flex align="center" gap={6} style={{ display: "inline-flex", marginRight: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: token.colorWarning }} />
            媒介
          </Flex>
          <Flex align="center" gap={6} style={{ display: "inline-flex" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: token.colorSuccess }} />
            作品
          </Flex>
        </Typography.Text>
      </Flex>
    </Flex>
  );
};
