"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card, Typography, Tag, Avatar, theme, Flex } from "antd";
import { BookOutlined, StarFilled } from "@ant-design/icons";
import type { BddbWork } from "@/lib/mongodb";

interface WorkNodeData {
  work: BddbWork;
}

const typeColors: Record<number, string> = {
  1: "magenta",
  2: "blue",
  3: "purple",
  4: "cyan",
  6: "orange",
};

const typeNames: Record<number, string> = {
  1: "书籍",
  2: "动画",
  3: "音乐",
  4: "游戏",
  6: "三次元",
};

export const WorkNode: React.FC<NodeProps> = ({ data }) => {
  const { work } = data as unknown as WorkNodeData;
  const { token } = theme.useToken();

  const cardStyle: React.CSSProperties = {
    width: 240,
    borderLeft: `4px solid ${token.colorSuccess}`,
    background: token.colorSuccessBg,
  };

  return (
    <Card size="small" style={cardStyle} styles={{ body: { padding: 12 } }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      
      <Flex align="flex-start" gap={12} style={{ marginBottom: 8 }}>
        <Avatar
          size={40}
          src={work.images?.small}
          shape="square"
          icon={<BookOutlined />}
        />
        <Flex vertical style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong ellipsis style={{ fontSize: 13, lineHeight: 1.4 }}>
            {work.name_cn || work.name}
          </Typography.Text>
          {work.name_cn && work.name !== work.name_cn && (
            <Typography.Text type="secondary" ellipsis style={{ fontSize: 11, marginTop: 2 }}>
              {work.name}
            </Typography.Text>
          )}
        </Flex>
      </Flex>
      
      <Flex align="center" gap={8} wrap>
        <Tag color={typeColors[work.type] || "default"} style={{ fontSize: 12 }}>
          {typeNames[work.type] || "其他"}
        </Tag>
        {work.rating?.score > 0 && (
          <Tag icon={<StarFilled />} color="gold" style={{ fontSize: 12 }}>
            {work.rating.score}
          </Tag>
        )}
      </Flex>
      
      {work.rank > 0 && (
        <Flex style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Bangumi Rank #{work.rank}
          </Typography.Text>
        </Flex>
      )}
      
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </Card>
  );
};
