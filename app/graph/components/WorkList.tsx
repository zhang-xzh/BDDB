"use client";

import React, { useState, useMemo } from "react";
import { Input, List, Tag, Typography, Empty, Avatar, theme, Flex } from "antd";
import { BookOutlined, StarFilled } from "@ant-design/icons";
import type { BddbWork } from "@/lib/mongodb";

interface WorkListProps {
  works: BddbWork[];
  onSelect: (work: BddbWork) => void;
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

export const WorkList: React.FC<WorkListProps> = ({ works, onSelect }) => {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filteredWorks = useMemo(() => {
    if (!searchText.trim()) return works;
    const lower = searchText.toLowerCase();
    return works.filter(
      (w) =>
        w.name?.toLowerCase().includes(lower) ||
        w.name_cn?.toLowerCase().includes(lower)
    );
  }, [works, searchText]);

  const handleSelect = (work: BddbWork) => {
    setSelectedId(work.id);
    onSelect(work);
  };

  return (
    <Flex vertical style={{ height: "100%", background: token.colorBgContainer }}>
      {/* Search */}
      <Flex style={{ padding: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Input.Search
          placeholder="搜索作品"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
          style={{ width: "100%" }}
        />
      </Flex>

      {/* List */}
      <Flex vertical style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {filteredWorks.length === 0 ? (
          <Empty description="无匹配结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={filteredWorks}
            renderItem={(work) => {
              const isSelected = selectedId === work.id;
              return (
                <List.Item
                  key={work.id}
                  onClick={() => handleSelect(work)}
                  style={{
                    cursor: "pointer",
                    padding: "10px 12px",
                    borderRadius: 6,
                    marginBottom: 4,
                    transition: "all 0.2s",
                    background: isSelected ? token.colorSuccess : token.colorBgContainer,
                  }}
                >
                  <Flex vertical gap={8} style={{ width: "100%" }}>
                    <Flex align="flex-start" gap={10}>
                      <Avatar
                        size={40}
                        src={work.images?.small}
                        shape="square"
                        icon={<BookOutlined />}
                      />
                      <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                        <Typography.Text
                          strong
                          ellipsis
                          style={{ width: "100%", color: isSelected ? "#fff" : token.colorText }}
                          title={work.name_cn || work.name}
                        >
                          {work.name_cn || work.name}
                        </Typography.Text>
                        {work.name_cn && work.name !== work.name_cn && (
                          <Typography.Text
                            type="secondary"
                            ellipsis
                            style={{ 
                              width: "100%", 
                              fontSize: 11,
                              color: isSelected ? "rgba(255,255,255,0.7)" : undefined,
                            }}
                            title={work.name}
                          >
                            {work.name}
                          </Typography.Text>
                        )}
                      </Flex>
                    </Flex>
                    <Flex align="center" gap={8} wrap>
                      <Tag 
                        color={typeColors[work.type] || "default"}
                        style={isSelected ? { background: "rgba(255,255,255,0.9)", fontSize: 12 } : { fontSize: 12 }}
                      >
                        {typeNames[work.type] || "其他"}
                      </Tag>
                      {work.rating?.score > 0 && (
                        <Tag 
                          icon={<StarFilled />} 
                          color={isSelected ? "default" : "gold"}
                          style={isSelected ? { background: "rgba(255,255,255,0.9)", fontSize: 12 } : { fontSize: 12 }}
                        >
                          {work.rating.score}
                        </Tag>
                      )}
                      {work.rank > 0 && (
                        <Typography.Text 
                          type="secondary" 
                          style={{ 
                            fontSize: 11,
                            color: isSelected ? "rgba(255,255,255,0.7)" : undefined,
                          }}
                        >
                          #{work.rank}
                        </Typography.Text>
                      )}
                    </Flex>
                  </Flex>
                </List.Item>
              );
            }}
          />
        )}
      </Flex>
    </Flex>
  );
};
