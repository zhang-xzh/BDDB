'use client'

import React, {useCallback, useMemo, useState} from 'react'
import type {FileItem, NodeData} from '@/lib/mongodb'
import {fetchApi} from '@/lib/api'
import {buildTree} from '@/lib/utils'
import {Box, Card, CardContent, CardHeader, CircularProgress, Stack, Typography,} from '@mui/material'
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView'
import InboxIcon from '@mui/icons-material/Inbox'
import {EditorTreeNode, renderEditorTreeNodes} from '@/components/EditorTreeNode'
import type {EditorTreeNodeProps} from '@/components/EditorTreeNode'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkEditorContentProps {
    loading: boolean
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
}

interface UseWorkEditorReturn {
    loading: boolean
    files: FileItem[]
    treeData: any[]
    nodeData: Map<string, NodeData>
    defaultExpandedKeys: string[]
    selectedMedias: number[]
    visibleMedias: number
    loadMoreMedias: () => void
    open: (volumeId: string) => Promise<void>
    hasChanges: () => boolean
    handleSubmit: () => Promise<boolean>
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkEditor(): UseWorkEditorReturn {
    const [loading, setLoading] = useState(false)
    const [files, setFiles] = useState<FileItem[]>([])
    const [treeData, setTreeData] = useState<any[]>([])
    const [nodeData, setNodeData] = useState<Map<string, NodeData>>(new Map())
    const [defaultExpandedKeys, setDefaultExpandedKeys] = useState<string[]>([])
    const [visibleMedias, setVisibleMedias] = useState(20)
    const loadMoreMedias = useCallback(() => setVisibleMedias(v => v + 10), [])

    const open = useCallback(async (volumeId: string) => {
        setLoading(true)
        try {
            const filesResult = await fetchApi<FileItem[]>(`/api/volumes/${volumeId}/files`)
            let loadedFiles: FileItem[] = []
            if (filesResult?.success && filesResult.data) {
                loadedFiles = filesResult.data
            }
            setFiles(loadedFiles)
            if (loadedFiles.length > 0) {
                const {treeData: td, nodeData: nd, defaultExpandedKeys: ek} = buildTree(loadedFiles)
                setTreeData(td)
                setNodeData(nd)
                setDefaultExpandedKeys(ek)
            } else {
                setTreeData([])
                setNodeData(new Map())
                setDefaultExpandedKeys([])
            }
        } catch (err) {
            console.error('加载文件失败:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    // 只读模式，永远没有变更需要保存
    const hasChanges = useCallback(() => false, [])
    const handleSubmit = useCallback(async () => true, [])

    const selectedMedias = useMemo(() => [] as number[], [])

    return {
        loading,
        files,
        treeData,
        nodeData,
        defaultExpandedKeys,
        selectedMedias,
        visibleMedias,
        loadMoreMedias,
        open,
        hasChanges,
        handleSubmit,
    }
}

// ─── WorkEditor isMixed 计算 ─────────────────────────────────────────────────

function makeWorkComputeIsMixed() {
    return (leafKeys: string[], isLeaf: boolean): boolean => {
        return false
    }
}

// ─── WorkEditorContent ───────────────────────────────────────────────────────

export function WorkEditorContent({
                                      loading,
                                      files,
                                      treeData,
                                      nodeData,
                                      defaultExpandedKeys,
                                      selectedMedias,
                                      visibleMedias,
                                      loadMoreMedias,
                                  }: WorkEditorContentProps) {
    // 使用受控的 expandedItems 来确保 defaultExpandedKeys 变化时能正确展开
    const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpandedKeys);

    // 当 defaultExpandedKeys 变化时同步更新 expandedItems
    React.useEffect(() => {
        setExpandedItems(defaultExpandedKeys);
    }, [defaultExpandedKeys]);

    const nodeContentProps = useMemo<Omit<EditorTreeNodeProps, 'title' | 'nodeKey' | 'isLeaf' | 'isMixed'>>(() => ({
        formatValue: (v: number) => `媒介 ${v}`,
        visibleCount: visibleMedias,
        onLoadMore: loadMoreMedias,
        readOnly: true,
        getSingleValue: () => undefined,
        getIsShared: () => false,
        getSharedValues: () => [],
        onSingleChange: () => {},
        onSharedChange: () => {},
        onToggleShared: () => {},
    }), [visibleMedias, loadMoreMedias])

    const computeIsMixed = useMemo(
        () => makeWorkComputeIsMixed(),
        [],
    )

    return (
        <Card variant="outlined" sx={{position: 'relative', mx: 2, mt: 1, mb: 2}}>
            {loading && (
                <Box sx={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, bgcolor: 'rgba(255,255,255,0.6)'}}>
                    <CircularProgress/>
                </Box>
            )}
            <CardHeader
                title={
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="subtitle2">文件列表</Typography>
                        <Typography variant="body2" color="text.secondary">{files.length} 个文件</Typography>
                    </Stack>
                }
                sx={{pt: 2, pb: 1, px: 2}}
            />
            <CardContent sx={{pt: 0, px: 2, pb: '8px !important'}}>
                {files.length > 0 ? (
                    <SimpleTreeView
                        expandedItems={expandedItems}
                        onExpandedItemsChange={(_, items) => setExpandedItems(items)}
                    >
                        {renderEditorTreeNodes(treeData, nodeContentProps, computeIsMixed)}
                    </SimpleTreeView>
                ) : (
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, color: 'text.disabled'}}>
                        <InboxIcon sx={{fontSize: 48, mb: 1}}/>
                        <Typography>暂无文件数据</Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type {UseWorkEditorReturn}
export default WorkEditorContent
