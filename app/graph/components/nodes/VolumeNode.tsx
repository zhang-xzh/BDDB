"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card, Typography, Tag, theme, Flex } from "antd";
import { DatabaseOutlined } from "@ant-design/icons";
import type { Volume } from "@/lib/mongodb";

interface VolumeNodeData {
  volume: Volume;
}

export const VolumeNode: React.FC<NodeProps> = ({ data }) => {
  const { volume } = data as unknown as VolumeNodeData;
  const { token } = theme.useToken();

  const cardStyle: React.CSSProperties = {
    width: 220,
    borderLeft: `4px solid ${token.colorInfo}`,
    background: token.colorInfoBg,
  };

  return (
    <Card size="small" style={cardStyle} styles={{ body: { padding: 12 } }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      
      <Flex align="flex-start" gap={8} style={{ marginBottom: 8 }}>
        <DatabaseOutlined style={{ fontSize: 18, color: token.colorInfo }} />
        <Flex vertical style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong ellipsis style={{ fontSize: 13, lineHeight: 1.4 }}>
            {volume.volume_name || `第${volume.volume_no}卷`}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 2 }}>
            型番: {volume.catalog_no || "无"}
          </Typography.Text>
        </Flex>
      </Flex>
      
      <Flex align="center" gap={8} wrap>
        <Tag color="purple" style={{ fontSize: 12 }}>
          第{volume.volume_no}卷
        </Tag>
        {volume.work_ids && volume.work_ids.length > 0 && (
          <Tag color="success" style={{ fontSize: 12 }}>
            {volume.work_ids.length} 作品
          </Tag>
        )}
      </Flex>
      
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </Card>
  );
};
