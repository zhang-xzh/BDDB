"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card, Typography, Tag, theme, Flex } from "antd";
import { FileOutlined } from "@ant-design/icons";
import type { TorrentWithVolume } from "@/lib/mongodb";

interface TorrentNodeData {
  torrent: TorrentWithVolume;
}

export const TorrentNode: React.FC<NodeProps> = ({ data }) => {
  const { torrent } = data as unknown as TorrentNodeData;
  const { token } = theme.useToken();

  const cardStyle: React.CSSProperties = {
    width: 220,
    borderLeft: `4px solid ${token.colorPrimary}`,
    background: token.colorPrimaryBg,
  };

  return (
    <Card size="small" style={cardStyle} styles={{ body: { padding: 12 } }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      
      <Flex align="flex-start" gap={8} style={{ marginBottom: 8 }}>
        <FileOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
        <Typography.Text strong ellipsis style={{ fontSize: 13, lineHeight: 1.4, flex: 1 }}>
          {torrent.name || "未命名种子"}
        </Typography.Text>
      </Flex>
      
      <Flex align="center" gap={8} wrap>
        <Tag color="blue" style={{ fontSize: 12 }}>
          {torrent.category || "未分类"}
        </Tag>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {(torrent.size ? (torrent.size / 1024 / 1024 / 1024).toFixed(2) : "0")} GB
        </Typography.Text>
      </Flex>
      
      {torrent.hasVolumes && (
        <Flex style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Tag color="success" style={{ fontSize: 12 }}>
            {torrent.volumeCount} 卷
          </Tag>
        </Flex>
      )}
      
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </Card>
  );
};
