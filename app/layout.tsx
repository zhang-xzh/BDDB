'use client'

import SiderContent from '@/components/SiderContent'
import {SPACING} from '@/lib/utils'
import {MoonOutlined, SunOutlined} from '@ant-design/icons'
import {App, Button, ConfigProvider, Divider, Layout, Menu, theme, ThemeConfig, Typography} from 'antd'
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
                <Header style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `0 ${SPACING.lg}px`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    height: 44,
                    lineHeight: '44px',
                    background: isDark ? '#242424' : '#5a7a8f',  // 灰蓝色标题栏
                    borderBottom: `1px solid ${isDark ? '#333333' : '#4a6a7f'}`,
                }}>
                    <Title level={5} style={{margin: 0, color: '#ffffff', whiteSpace: 'nowrap'}}>BDDB</Title>
                    <Divider orientation="vertical" style={{borderColor: isDark ? '#444444' : '#7a9ab0'}}/>
                    <Menu
                        selectedKeys={selectedKey ? [selectedKey] : []}
                        onSelect={({key}) => router.push(String(key))}
                        mode="horizontal"
                        style={{
                            flex: 1,
                            minWidth: 0,
                            borderInlineEnd: 'none',
                            background: 'transparent',
                        }}
                        theme="dark"
                        items={menuItems}
                    />
                    <Button
                        type="text"
                        size="small"
                        icon={isDark ? <SunOutlined style={{color: '#ffffff'}}/> : <MoonOutlined style={{color: '#ffffff'}}/>}
                        onClick={onToggle}
                    />
                </Header>
                <Layout>
                    <Sider width="25%" style={{
                        margin: `${SPACING.lg}px ${SPACING.sm}px ${SPACING.md}px ${SPACING.lg}px`,
                        padding: SPACING.lg,
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                        position: 'sticky',
                        maxHeight: 'var(--content-max-height)',
                        overflow: 'auto',
                    }}>
                        <SiderContent/>
                    </Sider>
                    <Content
                        style={{
                            margin: `${SPACING.lg}px ${SPACING.lg}px ${SPACING.md}px ${SPACING.sm}px`,
                            padding: SPACING.lg,
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
                            position: 'sticky',
                            maxHeight: 'var(--content-max-height)',
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

const desktopTheme = (isDark: boolean): ThemeConfig => ({
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
        fontSize: 12,
        fontSizeSM: 11,
        fontSizeLG: 13,
        colorBgLayout: isDark ? '#1a1a1a' : '#d9d9d9',           // 页面背景：浅灰
        colorBgContainer: isDark ? '#242424' : '#e8e8e8',         // 卡片背景：淡灰
        colorBorder: isDark ? '#333333' : '#b8b8b8',              // 边框：中灰
        colorBorderSecondary: isDark ? '#2a2a2a' : '#c8c8c8',     // 次边框
        // 主色调
        colorPrimary: isDark ? '#6a8291' : '#5a7a8f',
        colorPrimaryHover: isDark ? '#7a92a1' : '#6a8a9f',
        colorPrimaryActive: isDark ? '#5a7281' : '#4a6a7f',
        // 文字颜色
        colorText: isDark ? '#e0e0e0' : '#333333',
        colorTextSecondary: isDark ? '#a6a6a6' : '#555555',
        colorTextTertiary: isDark ? '#737373' : '#777777',
        paddingXS: 6,
        paddingSM: 8,
        padding: 12,
        paddingMD: 12,
        paddingLG: 16,
        marginXS: 6,
        marginSM: 8,
        margin: 12,
        marginMD: 12,
        marginLG: 16,
        controlHeight: 28,
        controlHeightSM: 24,
        controlHeightLG: 32,
        borderRadius: 4,
        borderRadiusSM: 2,
        borderRadiusLG: 6,
    },
    components: {
        Layout: {
            bodyBg: isDark ? '#1a1a1a' : '#d9d9d9',
            headerBg: isDark ? '#141414' : '#5a7a8f',  // 灰蓝色标题栏
            siderBg: isDark ? '#242424' : '#e8e8e8',
        },
        Menu: {
            itemHeight: 32,
            itemPaddingInline: 12,
        },
        Table: {
            cellPaddingBlock: 8,
            cellPaddingInline: 12,
            headerBg: isDark ? '#1f1f1f' : '#7a9ab0',  // 灰蓝色表头
        },
        Card: {
            paddingLG: 16,
        },
        Input: {
            paddingBlock: 4,
            paddingInline: 10,
        },
        Button: {
            paddingInline: 12,
            paddingBlock: 4,
        },
        Switch: {
            // 开关内部文字大小和内边距
            fontSize: 11,
            fontSizeSM: 10,
            innerMinMargin: 2,
            innerMaxMargin: 4,
        },
        Select: {
            // 选择器选项背景
            optionSelectedBg: isDark ? '#333333' : '#d9d9d9',
            optionActiveBg: isDark ? '#3a3a3a' : '#e8e8e8',
        },
        Tree: {
            // 树图标居中
            titleHeight: 28,
            nodeSelectedBg: isDark ? '#333333' : '#e8e8e8',
        },
    },
})

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
        <ConfigProvider locale={zhCN} theme={desktopTheme(isDark)}>
            <AppLayout isDark={isDark} onToggle={onToggle}>
                {children}
            </AppLayout>
        </ConfigProvider>
        </body>
        </html>
    )
}