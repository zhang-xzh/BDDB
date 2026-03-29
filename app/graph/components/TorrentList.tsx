"use client";

import React, { useState, useMemo, memo } from "react";
import { Input, List, Tag, Typography, Empty, theme, Flex } from "antd";
import { FileOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { TorrentWithVolume } from "@/lib/mongodb";

interface TorrentListProps {
  torrents: TorrentWithVolume[];
  onSelect: (torrent: TorrentWithVolume) => void;
}

interface TorrentItemProps {
  torrent: TorrentWithVolume;
  isSelected: boolean;
  onSelect: (torrent: TorrentWithVolume) => void;
}

const TorrentItem = memo(function TorrentItem({ torrent, isSelected, onSelect }: TorrentItemProps) {
  const { token } = theme.useToken();

  const handleClick = () => onSelect(torrent);

  return (
    <List.Item
      onClick={handleClick}
      style={{
        cursor: "pointer",
        padding: "8px 12px",
        borderRadius: 6,
        marginBottom: 4,
        transition: "all 0.2s",
        background: isSelected ? token.colorPrimary : token.colorBgContainer,
      }}
    >
      <Flex vertical gap={6} style={{ width: "100%" }}>
        <Flex align="center" style={{ fontSize: 13, lineHeight: 1.4 }}>
          <FileOutlined style={{ marginRight: 8, color: isSelected ? "#fff" : token.colorPrimary }} />
          <Typography.Text
            ellipsis
            style={{
              flex: 1,
              color: isSelected ? "#fff" : token.colorText,
            }}
            title={torrent.name}
          >
            {torrent.name || "未命名种子"}
          </Typography.Text>
        </Flex>
        <Flex align="center" gap={8}>
          {torrent.hasVolumes && (
            <Tag
              icon={<CheckCircleOutlined />}
              color={isSelected ? "default" : "success"}
              style={isSelected ? { background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 12 } : { fontSize: 12 }}
            >
              {torrent.volumeCount} 卷
            </Tag>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 11, color: isSelected ? "rgba(255,255,255,0.7)" : undefined }}>
            {(torrent.size ? (torrent.size / 1024 / 1024 / 1024).toFixed(2) : "0")} GB
          </Typography.Text>
        </Flex>
      </Flex>
    </List.Item>
  );
});

export const TorrentList: React.FC<TorrentListProps> = memo(function TorrentList({ torrents, onSelect }) {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState("");
  const [selectedHash, setSelectedHash] = useState<string | null>(null);

  const filteredTorrents = useMemo(() => {
    if (!searchText.trim()) return torrents;
    const lower = searchText.toLowerCase();
    return torrents.filter((t) => t.name?.toLowerCase().includes(lower));
  }, [torrents, searchText]);

  const handleSelect = (torrent: TorrentWithVolume) => {
    setSelectedHash(torrent.hash);
    onSelect(torrent);
  };

  return (
    <Flex vertical style={{ height: "100%", background: token.colorBgContainer }}>
      {/* Search */}
      <Flex style={{ padding: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Input.Search
          placeholder="搜索种子"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
          style={{ width: "100%" }}
        />
      </Flex>

      {/* List */}
      <Flex vertical style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {filteredTorrents.length === 0 ? (
          <Empty description="无匹配结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={filteredTorrents}
            renderItem={(torrent) => (
              <TorrentItem
                key={torrent.hash}
                torrent={torrent}
                isSelected={selectedHash === torrent.hash}
                onSelect={handleSelect}
              />
            )}
          />
        )}
      </Flex>
    </Flex>
  );
});
