'use client'

import React, {useEffect, useState} from 'react'
import {App, ConfigProvider, theme} from 'antd'
import zhCN from 'antd/locale/zh_CN'
import {AppLayout} from '@/components/layout/AppLayout'
import './globals.css'

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
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
        <body style={{margin: 0, padding: 0, minHeight: '100vh'}}>
        <ConfigProvider
            locale={zhCN}
            theme={{algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm}}
        >
            <App>
                <AppLayout isDark={isDark} onToggle={onToggle}>
                    {children}
                </AppLayout>
            </App>
        </ConfigProvider>
        </body>
        </html>
    )
}
