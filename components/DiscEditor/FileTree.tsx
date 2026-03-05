import React, { useMemo } from 'react'
import { Tree } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { TreeNodeContent } from './TreeNodeContent'

interface FileTreeProps {
  treeData: DataNode[]
  defaultExpandedKeys: string[]
  nodeData: Map<string, any>
  worksCount: number
  visibleVolumes: number
  loadMoreVolumes: () => void
  getNodeVolume: (key: string) => number | undefined
  getNodeShared: (key: string) => boolean
  getNodeSharedVolumes: (key: string) => number[]
  onVolumeChange: (key: string, volumeNo: number | null) => void
  onSharedVolumeChange: (key: string, volumes: number[]) => void
  onToggleShared: (key: string, shared: boolean) => void
}

export function FileTree({
  treeData,
  defaultExpandedKeys,
  nodeData,
  worksCount,
  visibleVolumes,
  loadMoreVolumes,
  getNodeVolume,
  getNodeShared,
  getNodeSharedVolumes,
  onVolumeChange,
  onSharedVolumeChange,
  onToggleShared,
}: FileTreeProps) {
  const titleRender = useMemo(() => {
    return (node: DataNode) => {
      const { key } = node
      const title = node.title as string
      return (
        <TreeNodeContent
          title={title}
          nodeKey={key as string}
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
      )
    }
  }, [treeData, worksCount, visibleVolumes, loadMoreVolumes, getNodeVolume, getNodeShared, getNodeSharedVolumes, onVolumeChange, onSharedVolumeChange, onToggleShared])

  return (
    <Tree<DataNode>
      treeData={treeData}
      defaultExpandedKeys={defaultExpandedKeys}
      titleRender={titleRender}
    />
  )
}
