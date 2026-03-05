"use client";

import React, { useState } from "react";
import { Card, Space, Empty, Spin, Button, InputNumber, message } from "antd";
import { VolumeFormList } from "./VolumeFormList";
import { FileTree } from "./FileTree";
import type { VolumeForm, FileItem, NodeData } from "@/lib/db/schema";

interface DiscEditorContentProps {
  loading: boolean;
  saving: boolean;
  files: FileItem[];
  treeData: any[];
  nodeData: Map<string, NodeData>;
  defaultExpandedKeys: string[];
  selectedVolumes: number[];
  visibleVolumes: number;
  loadMoreVolumes: () => void;
  volumeForms: Record<number, VolumeForm>;
  onVolumeFormChange: (vol: number, form: VolumeForm) => void;
  onVolumeChange: (key: string, volumeNo: number | null) => void;
  onSharedVolumeChange: (key: string, volumes: number[]) => void;
  onToggleShared: (key: string, shared: boolean) => void;
  getNodeVolume: (key: string) => number | undefined;
  getNodeShared: (key: string) => boolean;
  getNodeSharedVolumes: (key: string) => number[];
  resetVolumeAssignments: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function DiscEditorContent({
  loading,
  saving,
  files,
  treeData,
  nodeData,
  defaultExpandedKeys,
  selectedVolumes,
  visibleVolumes,
  loadMoreVolumes,
  volumeForms,
  onVolumeFormChange,
  onVolumeChange,
  onSharedVolumeChange,
  onToggleShared,
  getNodeVolume,
  getNodeShared,
  getNodeSharedVolumes,
  resetVolumeAssignments,
  onCancel,
  onSubmit,
}: DiscEditorContentProps) {
  const [worksCount, setWorksCount] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const handleWorksCountChange = (val: number | null) => {
    setWorksCount(val ?? 1);
    resetVolumeAssignments();
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const hasError = selectedVolumes.some(
      (vol) =>
        !volumeForms[vol]?.catalog_no?.trim() ||
        !volumeForms[vol]?.volume_name?.trim(),
    );
    if (hasError) {
      message.error("请填写所有卷的型番和标题");
      return;
    }
    onSubmit();
  };

  return (
    <Spin spinning={loading}>
      <Space>
        <Button onClick={onCancel}>取消</Button>
        <Button type="primary" loading={saving} onClick={handleSubmit}>
          保存
        </Button>
      </Space>
      <div
        style={{
          padding: "8px 0",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <VolumeFormList
          selectedVolumes={selectedVolumes}
          volumeForms={volumeForms}
          onVolumeFormChange={onVolumeFormChange}
          worksCount={worksCount}
          submitted={submitted}
        />

        {files.length > 0 ? (
          <Card
            size="small"
            title={
              <Space>
                <span>文件列表</span>
                <span style={{ color: "#999", fontWeight: "normal" }}>
                  {files.length} 个文件
                </span>
                <InputNumber
                  min={1}
                  value={worksCount}
                  onChange={handleWorksCountChange}
                  addonBefore="作品数"
                  size="small"
                  mode="spinner"
                  style={{ width: 100 }}
                />
              </Space>
            }
            styles={{ body: { padding: "12px" } }}
          >
            <FileTree
              treeData={treeData}
              defaultExpandedKeys={defaultExpandedKeys}
              nodeData={nodeData}
              worksCount={worksCount}
              visibleVolumes={visibleVolumes}
              loadMoreVolumes={loadMoreVolumes}
              getNodeVolume={getNodeVolume}
              getNodeShared={getNodeShared}
              getNodeSharedVolumes={getNodeSharedVolumes}
              onVolumeChange={onVolumeChange}
              onSharedVolumeChange={onSharedVolumeChange}
              onToggleShared={onToggleShared}
            />
          </Card>
        ) : (
          <Empty description="暂无文件数据" />
        )}
      </div>
    </Spin>
  );
}
