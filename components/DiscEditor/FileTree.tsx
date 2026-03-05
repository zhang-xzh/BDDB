import React, { useMemo } from 'react'
import { Typography, Tree } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { TreeNodeContent } from './TreeNodeContent'

interface FileTreeProps {
  treeData: DataNode[]
  defaultExpandedKeys: string[]
  nodeData: Map<string, any>
  getNodeVolume: (key: string) => number | undefined
  onVolumeChange: (key: string, volumeNo: number | null) => void
  maxVolumes: number
}

export function FileTree({
  treeData,
  defaultExpandedKeys,
  nodeData,
  getNodeVolume,
  onVolumeChange,
  maxVolumes,
}: FileTreeProps) {
  const titleRender = useMemo(() => {
    return (node: DataNode) => {
      const { key, isLeaf } = node
      const title = node.title as string

      if (isLeaf) {
        return <Typography.Text ellipsis={{ tooltip: title }}>{title}</Typography.Text>
      }
      return (
        <TreeNodeContent
          title={title}
          nodeKey={key as string}
          getNodeVolume={getNodeVolume}
          onVolumeChange={onVolumeChange}
          maxVolumes={maxVolumes}
        />
      )
    }
  }, [treeData, getNodeVolume, onVolumeChange, maxVolumes])

  return (
    <Tree<DataNode>
      treeData={treeData}
      defaultExpandedKeys={defaultExpandedKeys}
      titleRender={titleRender}
    />
  )
}
