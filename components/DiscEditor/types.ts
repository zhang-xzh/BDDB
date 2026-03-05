export interface DiscEditorRef {
  open: (torrentHash: string, name?: string, syncFiles?: boolean) => Promise<void>
}
