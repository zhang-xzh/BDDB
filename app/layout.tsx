'use client'

import React, {useEffect, useState} from 'react'
import {App, Button, ConfigProvider, Divider, Layout, Menu, theme, Typography} from 'antd'
import SiderContent from '@/components/SiderContent'
import {MoonOutlined, SunOutlined} from '@ant-design/icons'
import {usePathname, useRouter} from 'next/navigation'
import zhCN from 'antd/locale/zh_CN'
import './globals.css'
import Sider from "antd/es/layout/Sider";

const {Header, Content, Footer} = Layout
const {Title, Text} = Typography

const menuItems = [
    {key: '/torrents', label: '种子管理'},
    {key: '/volume', label: '媒介管理'},
    {key: '/work', label: '作品管理'},
    {key: '/series', label: '系列管理'},
    {key: '/storage', label: '数据管理'},
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

    return (
        <App>
            <Layout style={{minHeight: '100vh'}}>
                <Header style={{display: 'flex', alignItems: 'center', padding: '0 24px'}}>
                    <Title level={4} style={{margin: 0, color: token.colorWhite}}>BDDB</Title>
                    <Divider orientation="vertical" style={{borderColor: token.colorSplit}}/>
                    <Menu
                        selectedKeys={[pathname]}
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
                        margin: '24px 12px 24px 24px',
                        padding: 24,
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                    }}>
                        <SiderContent/>
                    </Sider>
                    <Content
                        style={{
                            margin: '24px 24px 24px 12px',
                            padding: 24,
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
                        }}
                    >
                        {children}
                    </Content>
                </Layout>
                <Footer style={{textAlign: 'center', background: token.colorBgContainer}}>
                    <Text type="secondary">
                        BDDB - Next.js Version © {new Date().getFullYear()}
                    </Text>
                </Footer>
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