'use client'

import React, {useEffect, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import {Button, Navbar, OverlaysProvider, Tab, Tabs} from '@blueprintjs/core'
import FloatingPanel from '@/components/FloatingPanel'
import SiderContent from '@/components/SiderContent'
import './globals.css'

const NAV_ITEMS = [
    {path: '/torrents', label: '种子管理'},
    {path: '/media', label: '媒介管理'},
    {path: '/work', label: '作品管理'},
    {path: '/config', label: '配置'},
]

function AppLayout({children, isDark, onToggle}: {
    children: React.ReactNode
    isDark: boolean
    onToggle: () => void
}) {
    const pathname = usePathname()
    const router = useRouter()
    const currentTab = NAV_ITEMS.find(n => pathname?.startsWith(n.path))?.path ?? '/torrents'

    return (
        <>
            <Navbar fixedToTop>
                <Navbar.Group align="left">
                    <Navbar.Heading style={{fontWeight: 700}}>BDDB</Navbar.Heading>
                    <Navbar.Divider/>
                    <Tabs
                        selectedTabId={currentTab}
                        onChange={(tabId) => router.push(tabId as string)}
                        large
                        animate
                    >
                        {NAV_ITEMS.map(n => <Tab key={n.path} id={n.path} title={n.label}/>)}
                    </Tabs>
                </Navbar.Group>
                <Navbar.Group align="right">
                    <Button minimal icon={isDark ? 'flash' : 'moon'} onClick={onToggle}/>
                </Navbar.Group>
            </Navbar>

            <div style={{paddingTop: 50}}>
                <div style={{padding: 24}}>
                    {children}
                </div>
            </div>

            <FloatingPanel title="产品搜索">
                <SiderContent/>
            </FloatingPanel>
        </>
    )
}

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        setIsDark(localStorage.getItem('theme') === 'dark')
    }, [])

    const onToggle = () => {
        setIsDark(prev => {
            const next = !prev
            localStorage.setItem('theme', next ? 'dark' : 'light')
            return next
        })
    }

    return (
        <html lang="zh-CN">
        <head>
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <meta name="description" content="BDDB - 原盘数据管理"/>
            <title>BDDB</title>
        </head>
        <body className={isDark ? 'bp6-dark' : ''}>
            <OverlaysProvider>
                <AppLayout isDark={isDark} onToggle={onToggle}>
                    {children}
                </AppLayout>
            </OverlaysProvider>
        </body>
        </html>
    )
}