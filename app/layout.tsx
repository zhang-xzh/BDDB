'use client'

import React, {useEffect, useState} from 'react'
import {App, Button, ConfigProvider, Divider, Layout, Menu, theme, Typography} from 'antd'
import SiderContent from '@/components/SiderContent'
import {MoonOutlined, SunOutlined} from '@ant-design/icons'
import {usePathname, useRouter} from 'next/navigation'
import zhCN from 'antd/locale/zh_CN'
import {SPACING} from '@/lib/utils'
import './globals.css'
import Sider from "antd/es/layout/Sider";

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
                <Header style={{display: 'flex', alignItems: 'center', padding: `0 ${SPACING.xl}px`, position: 'sticky', top: 0, zIndex: 100}}>
                    <Title level={4} style={{margin: 0, color: token.colorWhite}}>BDDB</Title>
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
                        icon={isDark ? <SunOutlined/> : <MoonOutlined/>}
                        onClick={onToggle}
                    />
                </Header>
                <Layout>
                    <Sider width="25%" style={{
                        margin: `${SPACING.xl}px ${SPACING.md}px ${SPACING.xl}px ${SPACING.xl}px`,
                        padding: SPACING.xl,
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                        position: 'sticky',
                        top: 84,
                        alignSelf: 'flex-start',
                        maxHeight: 'calc(100vh - 64px - 40px)',
                        overflow: 'auto',
                    }}>
                        <SiderContent/>
                    </Sider>
                    <Content
                        style={{
                            margin: `${SPACING.xl}px ${SPACING.xl}px ${SPACING.xl}px ${SPACING.md}px`,
                            padding: SPACING.xl,
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
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