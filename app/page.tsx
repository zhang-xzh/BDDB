"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Collapse,
  Flex,
  Space,
  Input,
  Progress,
  Badge,
  Select,
  Tag,
  Pagination,
  Spin,
  Typography,
  theme,
} from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { Torrent } from "@/lib/db/schema";
import { fetchApi } from "@/lib/api";
import { useDiscEditor } from "@/components/DiscEditor/useDiscEditor";
import { DiscEditorContent } from "@/components/DiscEditor/DiscEditorContent";

const { Search } = Input;
const { Text } = Typography;

interface TorrentWithVolume extends Torrent {
  hasVolumes?: boolean;
  volumeCount?: number;
}

// Fixed column widths — shared by header and every label row
const COL = {
  category: 120,
  volumes: 56,
  progress: 130,
  state: 90,
  size: 72,
} as const;
const PAGE_SIZE = 100;

// Collapse left-indent: arrow icon (~12px) + antd internal padding (16px) + gap (8px) ≈ 36px
// We add 8px for the gap between arrow and content = 44px total left padding
const HEADER_INDENT = 44;

const ColHeader: React.FC = () => {
  const { token } = theme.useToken();
  return (
    <Flex
      align="center"
      gap={8}
      style={{
        padding: `6px 16px 6px ${HEADER_INDENT}px`,
        background: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: `${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0`,
        fontWeight: token.fontWeightStrong,
        fontSize: token.fontSize,
      }}
    >
      <Text strong style={{ width: COL.volumes, flexShrink: 0 }}>
        卷
      </Text>
      <Text strong style={{ flex: 1 }}>
        名称
      </Text>
        <Text strong style={{ width: COL.category, flexShrink: 0 }}>
            类别
        </Text>
      <Text strong style={{ width: COL.progress, flexShrink: 0 }}>
        进度
      </Text>
      <Text strong style={{ width: COL.state, flexShrink: 0 }}>
        状态
      </Text>
      <Text
        strong
        style={{ width: COL.size, flexShrink: 0, textAlign: "right" }}
      >
        大小
      </Text>
    </Flex>
  );
};

const HomePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [torrents, setTorrents] = useState<TorrentWithVolume[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | undefined>(
    undefined,
  );
  const [filterHasVolumes, setFilterHasVolumes] = useState<boolean | undefined>(
    undefined,
  );
  const [filterState, setFilterState] = useState<string | undefined>(undefined);
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const skipSubmitRef = useRef(false);

  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  }, []);

  const getStateStatus = (
    state: string,
  ): "success" | "processing" | "warning" | "default" => {
    if (state === "downloading") return "processing";
    if (state === "uploading") return "success";
    if (state.includes("paused")) return "warning";
    if (state === "completed") return "success";
    return "default";
  };

  const getStateText = (state: string): string => {
    const stateMap: Record<string, string> = {
      downloading: "下载中",
      uploading: "做种中",
      pausedDL: "已暂停",
      pausedUP: "已暂停",
      completed: "已完成",
    };
    return stateMap[state] || state;
  };

  const fetchTorrents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<string>("/api/qb/torrents/info");
      if (res.success && res.data) {
        setTorrents(JSON.parse(res.data));
      }
    } catch (error) {
      console.error("获取种子列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const editor = useDiscEditor(fetchTorrents);

  const filteredTorrents = useMemo(() => {
    let list = torrents;
    if (searchText) {
      const lower = searchText.toLowerCase();
      list = list.filter((t) =>
        t.qb_torrent.name.toLowerCase().includes(lower),
      );
    }
    if (filterCategory !== undefined) {
      list = list.filter((t) => t.qb_torrent.category === filterCategory);
    }
    if (filterHasVolumes !== undefined) {
      list = list.filter((t) => !!t.hasVolumes === filterHasVolumes);
    }
    if (filterState !== undefined) {
      list = list.filter((t) =>
        filterState === "paused"
          ? t.qb_torrent.state.includes("paused")
          : t.qb_torrent.state === filterState,
      );
    }
    return list;
  }, [torrents, searchText, filterCategory, filterHasVolumes, filterState]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(torrents.map((t) => t.qb_torrent.category).filter(Boolean)),
      ),
    [torrents],
  );

  const pagedTorrents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTorrents.slice(start, start + PAGE_SIZE);
  }, [filteredTorrents, currentPage]);

  const handleCollapseChange = useCallback(
    async (key: string | string[]) => {
      const newKey = Array.isArray(key) ? key[0] : key || undefined;

      // Clicking the active item would collapse it — ignore, let buttons handle close
      if (!newKey && activeKey) return;

      if (activeKey && activeKey !== newKey) {
        if (!skipSubmitRef.current && editor.hasChanges()) {
          await editor.handleSubmit();
        }
        skipSubmitRef.current = false;
      }

      setActiveKey(newKey);

      if (newKey) {
        const torrent = pagedTorrents.find((t) => t.qb_torrent.hash === newKey);
        if (torrent) {
          await editor.open(
            torrent.qb_torrent.hash,
            torrent.qb_torrent.name,
            false,
          );
        }
      }
    },
    [activeKey, editor, pagedTorrents],
  );

  const handleCancel = useCallback(() => {
    skipSubmitRef.current = true;
    setActiveKey(undefined);
  }, []);

  useEffect(() => {
    fetchTorrents();
  }, [fetchTorrents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterCategory, filterHasVolumes, filterState]);

  const collapseItems = useMemo(
    () =>
      pagedTorrents.map((t) => ({
        key: t.qb_torrent.hash,
        label: (
          <Flex align="center" gap={8} style={{ width: "100%" }}>
            <Flex style={{ width: COL.volumes, flexShrink: 0 }}>
              {t.hasVolumes ? (
                <Tag
                  icon={<CheckCircleOutlined />}
                  color="success"
                  style={{ margin: 0 }}
                >
                  {t.volumeCount}
                </Tag>
              ) : (
                <Tag
                  icon={<CloseCircleOutlined />}
                  color="default"
                  style={{ margin: 0 }}
                />
              )}
            </Flex>
            <Text ellipsis style={{ flex: 1 }}>
              {t.qb_torrent.name}
            </Text>
              <Flex
                  style={{ width: COL.category, flexShrink: 0, overflow: "hidden" }}
              >
                  {t.qb_torrent.category ? (
                      <Tag color="blue" style={{ margin: 0, maxWidth: "100%" }}>
                          {t.qb_torrent.category}
                      </Tag>
                  ) : (
                      <Text type="secondary">—</Text>
                  )}
              </Flex>
            <Flex style={{ width: COL.progress, flexShrink: 0 }}>
              <Progress
                percent={parseFloat((t.qb_torrent.progress * 100).toFixed(1))}
                status={t.qb_torrent.progress === 1 ? "success" : "active"}
                size="small"
                style={{ margin: 0 }}
              />
            </Flex>
            <Flex style={{ width: COL.state, flexShrink: 0 }}>
              <Badge
                status={getStateStatus(t.qb_torrent.state)}
                text={getStateText(t.qb_torrent.state)}
              />
            </Flex>
            <Text
              type="secondary"
              style={{
                width: COL.size,
                flexShrink: 0,
                textAlign: "right",
                fontSize: 12,
              }}
            >
              {formatSize(t.qb_torrent.size)}
            </Text>
          </Flex>
        ),
        children:
          activeKey === t.qb_torrent.hash ? (
            <DiscEditorContent
              loading={editor.loading}
              saving={editor.saving}
              files={editor.files}
              treeData={editor.treeData}
              nodeData={editor.nodeData}
              defaultExpandedKeys={editor.defaultExpandedKeys}
              selectedVolumes={editor.selectedVolumes}
              visibleVolumes={editor.visibleVolumes}
              loadMoreVolumes={editor.loadMoreVolumes}
              worksCount={editor.worksCount}
              setWorksCount={editor.setWorksCount}
              volumeForms={editor.volumeForms}
              onVolumeFormChange={editor.updateVolumeForm}
              onVolumeChange={editor.onVolumeChange}
              onSharedVolumeChange={editor.onSharedVolumeChange}
              onToggleShared={editor.onToggleShared}
              getNodeVolume={editor.getNodeVolume}
              getNodeShared={editor.getNodeShared}
              getNodeSharedVolumes={editor.getNodeSharedVolumes}
              resetVolumeAssignments={editor.resetVolumeAssignments}
              deleteVolume={editor.deleteVolume}
              onCancel={handleCancel}
              onSubmit={editor.handleSubmit}
            />
          ) : null,
      })),
    [pagedTorrents, activeKey, editor, handleCancel, formatSize],
  );

  return (
    <Flex vertical gap={16}>
      <Space wrap>
        <Search
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索种子"
          style={{ width: 200 }}
          allowClear
        />
        <Select
          allowClear
          placeholder="类别"
          style={{ width: 150 }}
          value={filterCategory}
          onChange={setFilterCategory}
          options={categories.map((c) => ({ label: c, value: c }))}
        />
        <Select
          allowClear
          placeholder="有无卷"
          style={{ width: 110 }}
          value={filterHasVolumes}
          onChange={setFilterHasVolumes}
          options={[
            { label: "有卷", value: true },
            { label: "无卷", value: false },
          ]}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 110 }}
          value={filterState}
          onChange={setFilterState}
          options={[
            { label: "下载中", value: "downloading" },
            { label: "做种中", value: "uploading" },
            { label: "已暂停", value: "paused" },
            { label: "已完成", value: "completed" },
          ]}
        />
        <Text type="secondary">共 {filteredTorrents.length} 条</Text>
      </Space>

      <Spin spinning={loading}>
        <ColHeader />
        <Collapse
          bordered={false}
          accordion
          activeKey={activeKey}
          onChange={handleCollapseChange}
          items={collapseItems}
          style={{ borderTop: "none", borderRadius: "0 0 8px 8px" }}
        />
      </Spin>

      {filteredTorrents.length > PAGE_SIZE && (
        <Flex justify="flex-end">
          <Pagination
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={filteredTorrents.length}
            onChange={(page) => {
              if (activeKey) {
                skipSubmitRef.current = true;
                setActiveKey(undefined);
              }
              setCurrentPage(page);
            }}
            showQuickJumper
            showSizeChanger={false}
          />
        </Flex>
      )}
    </Flex>
  );
};

export default HomePage;
