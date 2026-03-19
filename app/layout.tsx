'use client'

import SiderContent from '@/components/SiderContent'
import {SPACING} from '@/lib/utils'
import {MoonOutlined, SunOutlined} from '@ant-design/icons'
import {App, Button, ConfigProvider, Divider, Layout, Menu, theme, Typography} from 'antd'
import Sider from "antd/es/layout/Sider"
import zhCN from 'antd/locale/zh_CN'
import {usePathname, useRouter} from 'next/navigation'
import React, {useEffect, useState} from 'react'
import './globals.css'

const {Header, Content, Footer} = Layout
const {Title, Text} = Typography

const menuItems = [
    {key: '/torrents', label: '种子管理'},
    {key: '/media', label: '媒介管理'},
    {key: '/work', label: '作品管理'},
    {key: '/config', label: '配置'},
]

function AppLayout({children, isDark, onToggle}: {
    children: React.ReactNode
    isDark: boolean
    onToggle: () => void
}) {
    const {token} = theme.useToken()
    const pathname = usePathname()
    const router = useRouter()
    const selectedKey = menuItems.find(item => pathname?.startsWith(item.key))?.key ?? ''

    return (
        <App>
            <Layout style={{minHeight: '100vh'}}>
                <Header style={{display: 'flex', alignItems: 'center', padding: `0 ${SPACING.lg}px`, position: 'sticky', top: 0, zIndex: 100, height: 44, lineHeight: '44px'}}>
                    <Title level={5} style={{margin: 0, color: token.colorWhite, whiteSpace: 'nowrap'}}>BDDB</Title>
                    <Divider orientation="vertical" style={{borderColor: token.colorSplit}}/>
                    <Menu
                        selectedKeys={selectedKey ? [selectedKey] : []}
                        onSelect={({key}) => router.push(String(key))}
                        theme="dark"
                        mode="horizontal"
                        style={{flex: 1, minWidth: 0, borderInlineEnd: 'none'}}
                        items={menuItems}
                    />
                    <Button
                        type="text"
                        size="small"
                        icon={isDark ? <SunOutlined/> : <MoonOutlined/>}
                        onClick={onToggle}
                    />
                </Header>
                <Layout>
                    <Sider width="25%" style={{
                        margin: `${SPACING.xl}px ${SPACING.md}px ${SPACING.xl}px ${SPACING.xl}px`,
                        padding: SPACING.md,
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                        position: 'sticky',
                        maxHeight: 'calc(100vh - 44px - 40px)',
                        overflow: 'auto',
                    }}>
                        <SiderContent/>
                    </Sider>
                    <Content
                        style={{
                            margin: `${SPACING.xl}px ${SPACING.xl}px ${SPACING.xl}px ${SPACING.md}px`,
                            padding: SPACING.md,
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
                            position: 'sticky',
                            maxHeight: 'calc(100vh - 44px - 40px)',
                            overflow: 'auto',
                        }}
                    >
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </App>
    )
}

export default function RootLayout({children,}: Readonly<{ children: React.ReactNode }>) {
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
            <title>BDDB</title>
        </head>
        <body style={{margin: 0, padding: 0}}>
        <ConfigProvider locale={zhCN} theme={{algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm}}>
            <AppLayout isDark={isDark} onToggle={onToggle}>
                {children}
            </AppLayout>
        </ConfigProvider>
        </body>
        </html>
    )
}