"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card, Typography, Tag, theme, Flex } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";

interface MediaData {
  media: {
    _id: string;
    media_no: number;
    media_type: "bd" | "dvd" | "cd" | "scan";
    content_title?: string;
    description?: string;
  };
}

const typeColors: Record<string, string> = {
  bd: "blue",
  dvd: "cyan",
  cd: "purple",
  scan: "orange",
};

const typeLabels: Record<string, string> = {
  bd: "BD",
  dvd: "DVD",
  cd: "CD",
  scan: "扫图",
};

export const MediaNode: React.FC<NodeProps> = memo(function MediaNode({ data }) {
  const { media } = data as unknown as MediaData;
  const { token } = theme.useToken();

  return (
    <Card size="small" style={{ width: 200, borderLeft: `4px solid ${token.colorWarning}`, background: token.colorWarningBg }} styles={{ body: { padding: 10 } }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <Flex align="flex-start" gap={8} style={{ marginBottom: 8 }}>
        <PlayCircleOutlined style={{ fontSize: 16, color: token.colorWarning }} />
        <Flex vertical style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong ellipsis style={{ fontSize: 13, lineHeight: 1.4 }}>
            {media.content_title || `内容 ${media.media_no}`}
          </Typography.Text>
          {media.description && (
            <Typography.Text type="secondary" ellipsis style={{ fontSize: 10, marginTop: 2 }}>
              {media.description}
            </Typography.Text>
          )}
        </Flex>
      </Flex>

      <Flex align="center" gap={8} wrap>
        <Tag color={typeColors[media.media_type]} style={{ fontSize: 12 }}>
          {typeLabels[media.media_type]}
        </Tag>
        <Typography.Text type="secondary" style={{ fontSize: 10 }}>
          #{media.media_no}
        </Typography.Text>
      </Flex>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </Card>
  );
});
