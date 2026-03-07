import {useCallback, useState} from 'react'

interface EditorActions {
    hasChanges: () => boolean
    handleSubmit: () => Promise<void>
}

export function useEditorPanel<TItem>({
    pagedItems,
    getItemKey,
    openItem,
    editor,
}: {
    pagedItems: TItem[]
    getItemKey: (item: TItem) => string
    openItem: (item: TItem) => Promise<void>
    editor: EditorActions
}) {
    const [activeKey, setActiveKey] = useState<string | undefined>(undefined)

    const handleCollapseChange = useCallback(async (key: string | string[]) => {
        const newKey = Array.isArray(key) ? key[0] : key || undefined

        // 点击已展开的项 → 保存并收起
        if (activeKey && newKey === activeKey) {
            if (editor.hasChanges()) await editor.handleSubmit()
            setActiveKey(undefined)
            return
        }

        // 切换到新项 → 保存当前项，打开新项
        if (activeKey && activeKey !== newKey) {
            if (editor.hasChanges()) await editor.handleSubmit()
        }

        setActiveKey(newKey)
        if (newKey) {
            const item = pagedItems.find(i => getItemKey(i) === newKey)
            if (item) await openItem(item)
        }
    }, [activeKey, editor, pagedItems, getItemKey, openItem])

    const closeForPageChange = useCallback(async () => {
        if (editor.hasChanges()) await editor.handleSubmit()
        setActiveKey(undefined)
    }, [editor])

    return {activeKey, handleCollapseChange, closeForPageChange}
}
