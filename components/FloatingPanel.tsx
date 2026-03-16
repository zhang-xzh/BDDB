'use client'

import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Button, Icon} from '@blueprintjs/core'
import type {IconName} from '@blueprintjs/icons'

interface FloatingPanelProps {
    title: string
    defaultOpen?: boolean
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    onClose?: () => void
    defaultPosition?: {x: number; y: number}
    width?: number
    maxHeight?: number
    icon?: IconName
    zIndex?: number
    showCloseButton?: boolean
    children: React.ReactNode
}

export default function FloatingPanel({
    title,
    defaultOpen = false,
    isOpen,
    onOpenChange,
    onClose,
    defaultPosition,
    width = 320,
    maxHeight = 500,
    icon = 'search',
    zIndex = 18,
    showCloseButton = false,
    children,
}: FloatingPanelProps) {
    const [openState, setOpenState] = useState(defaultOpen)
    const [pos, setPos] = useState(defaultPosition ?? {x: -1, y: -1})
    const [dragging, setDragging] = useState(false)
    const dragOffset = useRef({x: 0, y: 0})
    const panelRef = useRef<HTMLDivElement>(null)
    const isControlled = isOpen !== undefined
    const open = isControlled ? isOpen : openState

    const setOpen = useCallback((nextOpen: boolean) => {
        if (!isControlled) setOpenState(nextOpen)
        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    // 初始化默认位置到右下角
    useEffect(() => {
        if (pos.x === -1 && pos.y === -1) {
            setPos({x: window.innerWidth - width - 24, y: window.innerHeight - 60})
        }
    }, [pos, width])

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setDragging(true)
        dragOffset.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y,
        }
    }, [pos])

    useEffect(() => {
        if (!dragging) return
        const onMove = (e: MouseEvent) => {
            setPos({
                x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y)),
            })
        }
        const onUp = () => setDragging(false)
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [dragging])

    // 展开时如果位置超出视口底部，上移
    useEffect(() => {
        if (open && panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect()
            if (rect.bottom > window.innerHeight) {
                setPos(p => ({...p, y: Math.max(0, window.innerHeight - rect.height - 8)}))
            }
        }
    }, [open])

    return (
        <div
            ref={panelRef}
            className="bp6-card bp6-elevation-3"
            style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                width: open ? width : 'auto',
                zIndex,
                padding: 0,
                overflow: 'hidden',
                userSelect: dragging ? 'none' : undefined,
            }}
        >
            {/* 标题栏 - 可拖拽 */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    cursor: 'grab',
                    borderBottom: open ? '1px solid var(--bp6-divider-black, rgba(17,20,24,0.15))' : 'none',
                }}
                onMouseDown={onMouseDown}
            >
                <Icon icon={icon} size={14}/>
                <span style={{flex: 1, fontSize: 13, fontWeight: 600}}>{title}</span>
                <Button
                    minimal
                    small
                    icon={open ? 'minus' : 'plus'}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setOpen(!open)}
                />
                {showCloseButton && (
                    <Button
                        minimal
                        small
                        icon="cross"
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => onClose?.()}
                    />
                )}
            </div>
            {/* 内容 */}
            {open && (
                <div style={{maxHeight, overflowY: 'auto', padding: 8}}>
                    {children}
                </div>
            )}
        </div>
    )
}
