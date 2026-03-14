import {useCallback, useState} from 'react'

interface EditorActions {
    hasChanges: () => boolean
    handleSubmit: () => Promise<boolean>
}

export function useEditorPanel<TItem>({
    pagedItems,
    getItemKey,
    openItem,
    editor,
    autoSave = true,
}: {
    pagedItems: TItem[]
    getItemKey: (item: TItem) => string
    openItem: (item: TItem) => Promise<void>
    editor: EditorActions
    autoSave?: boolean
}) {
    const [activeKey, setActiveKey] = useState<string | undefined>(undefined)

    const handleCollapseChange = useCallback(async (key: string | string[]) => {
        const newKey = Array.isArray(key) ? key[0] : key || undefined

        // 点击已展开的项 → 保存并收起（如果启用自动保存）
        if (activeKey && newKey === activeKey) {
            if (autoSave && editor.hasChanges()) {
                const ok = await editor.handleSubmit()
                if (!ok) return
            }
            setActiveKey(undefined)
            return
        }

        // 切换到新项 → 保存当前项，打开新项（如果启用自动保存）
        if (activeKey && activeKey !== newKey) {
            if (autoSave && editor.hasChanges()) {
                const ok = await editor.handleSubmit()
                if (!ok) return
            }
        }

        setActiveKey(newKey)
        if (newKey) {
            const item = pagedItems.find(i => getItemKey(i) === newKey)
            if (item) await openItem(item)
        }
    }, [activeKey, editor, pagedItems, getItemKey, openItem, autoSave])

    const closeForPageChange = useCallback(async () => {
        if (autoSave && editor.hasChanges()) {
            const ok = await editor.handleSubmit()
            if (!ok) return
        }
        setActiveKey(undefined)
    }, [editor, autoSave])

    return {activeKey, handleCollapseChange, closeForPageChange}
}
