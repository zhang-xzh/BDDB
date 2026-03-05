"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { Modal } from "antd";
import type { DiscEditorRef } from "./types";
import { useDiscEditor } from "./useDiscEditor";
import { DiscEditorContent } from "./DiscEditorContent";

interface DiscEditorProps {
  torrentHash?: string;
  discId?: number;
  onSave?: () => void;
  onClose?: () => void;
}

const DiscEditor = forwardRef<DiscEditorRef, DiscEditorProps>(
  function DiscEditor({ onSave }, ref) {
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
      worksCount,
      setWorksCount,
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
      deleteVolume,
    } = useDiscEditor(onSave);

    useImperativeHandle(ref, () => ({ open }), [open]);

    return (
      <Modal
        open={visible}
        title={torrentName || "编辑产品信息"}
        width={900}
        onCancel={handleCancel}
        destroyOnHidden
        footer={null}
      >
        <DiscEditorContent
          loading={loading}
          saving={saving}
          files={files}
          treeData={treeData}
          nodeData={nodeData}
          defaultExpandedKeys={defaultExpandedKeys}
          selectedVolumes={selectedVolumes}
          visibleVolumes={visibleVolumes}
          loadMoreVolumes={loadMoreVolumes}
          worksCount={worksCount}
          setWorksCount={setWorksCount}
          volumeForms={volumeForms}
          onVolumeFormChange={updateVolumeForm}
          onVolumeChange={onVolumeChange}
          onSharedVolumeChange={onSharedVolumeChange}
          onToggleShared={onToggleShared}
          getNodeVolume={getNodeVolume}
          getNodeShared={getNodeShared}
          getNodeSharedVolumes={getNodeSharedVolumes}
          resetVolumeAssignments={resetVolumeAssignments}
          deleteVolume={deleteVolume}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </Modal>
    );
  },
);

export default DiscEditor;
