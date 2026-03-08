import type {FileItem, NodeData} from '@/lib/db'

export const PAGE_SIZE = 100

export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

export interface NodePath {
    parent: string | null
    children: string[]
    isLeaf: boolean
    depth: number
}

export interface FlatTree {
    map: Map<string, NodePath>
    order: string[]
    leaves: string[]
}

export function buildTree(fileList: FileItem[]) {
    const root: Record<string, any> = {}
    const flatMap = new Map<string, NodePath>()
    const order: string[] = []
    const leaves: string[] = []
    const nodeDataMap = new Map<string, NodeData>()
    const fileToKeyMap = new Map<string, string>()
    const expandedKeys: string[] = []

    fileList.forEach(file => {
        const parts = file.name.split('/')
        let current = root
        parts.forEach((part, index) => {
            if (!current[part]) current[part] = index === parts.length - 1 ? {_file: file} : {}
            current = current[part]
        })
    })

    function recurse(node: Record<string, any>, parentPath = '', parentKey: string | null = null, level = 0): any[] {
        const result: any[] = []
        const topKeys: string[] = []
        Object.entries(node).forEach(([key, value]) => {
            const isFile = !!(value as any)._file
            const file = (value as any)._file
            const fullPath = `${parentPath}${key}`
            const nodeDatum: NodeData = {}
            if (file?.id) {
                nodeDatum.files = [file.id]
                fileToKeyMap.set(file.id, fullPath)
            }
            const childNodes = isFile ? [] : recurse(value as any, `${fullPath}/`, fullPath, level + 1)
            const childKeys = childNodes.map(c => c.key as string)
            flatMap.set(fullPath, {parent: parentKey, children: childKeys, isLeaf: isFile, depth: level})
            nodeDataMap.set(fullPath, nodeDatum)
            if (isFile) leaves.push(fullPath)
            if (level === 0) topKeys.push(fullPath)
            order.push(fullPath)
            result.push({
                title: `${key}${isFile ? ` (${formatSize(file.size)})` : ''}`,
                key: fullPath,
                children: childNodes,
                isLeaf: isFile,
            })
        })
        if (level === 0) expandedKeys.push(...topKeys)
        return result
    }

    return {
        treeData: recurse(root),
        nodeData: nodeDataMap,
        fileToKeyMap,
        flatTree: {map: flatMap, order, leaves} as FlatTree,
        defaultExpandedKeys: expandedKeys,
    }
}
