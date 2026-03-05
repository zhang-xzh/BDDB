"use client";

import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Space, Card, Empty, Button, Spin, InputNumber } from "antd";
import type { DiscEditorRef } from "./types";
import { useDiscEditor } from "./useDiscEditor";
import { VolumeFormList } from "./VolumeFormList";
import { FileTree } from "./FileTree";

interface DiscEditorProps {
  torrentHash?: string;
  discId?: number;
  onSave?: () => void;
  onClose?: () => void;
}

const DiscEditor = forwardRef<DiscEditorRef, DiscEditorProps>(
  function DiscEditor({ onSave }, ref) {
    const [worksCount, setWorksCount] = useState(1);
    const {
      visible,
      loading,
      saving,
      torrentName,
      volumeForms,
      files,
      treeData,
      nodeData,
      defaultExpandedKeys,
      selectedVolumes,
      visibleVolumes,
      loadMoreVolumes,
      open,
      handleSubmit,
      handleCancel,
      onVolumeChange,
      onSharedVolumeChange,
      onToggleShared,
      getNodeVolume,
      getNodeShared,
      getNodeSharedVolumes,
      updateVolumeForm,
      resetVolumeAssignments,
    } = useDiscEditor(onSave);

    useImperativeHandle(ref, () => ({ open }), [open]);

    const handleWorksCountChange = (val: number | null) => {
      const next = val ?? 1;
      setWorksCount(next);
      resetVolumeAssignments();
    };

    return (
      <Modal
        open={visible}
        title={torrentName || "编辑产品信息"}
        width={900}
        confirmLoading={saving}
        onOk={handleSubmit}
        onCancel={handleCancel}
        destroyOnHidden
        footer={null}
      >
        <Spin spinning={loading}>
          <Space style={{ width: "100%" }} size={16} orientation="vertical">
            {/* 卷信息表单 */}
            <VolumeFormList
              selectedVolumes={selectedVolumes}
              volumeForms={volumeForms}
              onVolumeFormChange={updateVolumeForm}
              worksCount={worksCount}
            />

            {/* 文件树 */}
            {files.length > 0 ? (
              <Card
                size="small"
                title={
                  <Space>
                    <span>文件列表</span>
                    <span>{files.length} 个文件</span>
                    <InputNumber
                      mode="spinner"
                      min={1}
                      value={worksCount}
                      onChange={handleWorksCountChange}
                      addonBefore="作品数"
                      size="small"
                      style={{ width: 120 }}
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

            {/* 底部按钮 */}
            <Space
              style={{
                justifyContent: "flex-end",
                width: "100%",
                marginTop: "16px",
              }}
            >
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                保存
              </Button>
            </Space>
          </Space>
        </Spin>
      </Modal>
    );
  },
);

export default DiscEditor;
