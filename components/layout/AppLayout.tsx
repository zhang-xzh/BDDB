'use client'

import React from 'react'
import {Button, Layout, Menu, theme, Typography} from 'antd'
import {MoonOutlined, SunOutlined} from '@ant-design/icons'
import {usePathname, useRouter} from 'next/navigation'

const {Header, Content, Footer} = Layout
const {Title, Text} = Typography

const menuItems = [
    {key: '/', label: '种子管理'},
    {key: '/1', label: '媒介管理'},
    {key: '/2', label: '作品管理'},
    {key: '/3', label: '系列管理'},
    {key: '/4', label: '数据管理'},
    {key: '/config', label: '配置'},
]

interface AppLayoutProps {
    children: React.ReactNode
    isDark: boolean
    onToggle: () => void
}

export const AppLayout: React.FC<AppLayoutProps> = ({
                                                        children,
                                                        isDark,
                                                        onToggle,
                                                    }) => {
    const {token} = theme.useToken()
    const pathname = usePathname()
    const router = useRouter()

    return (
        <Layout style={{minHeight: '100vh'}}>
            <Header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 24px',
                    gap: '24px',
                }}
            >
                <Title level={4} style={{margin: 0, color: token.colorTextLightSolid}}>
                    BDDB
                </Title>
                <Menu
                    selectedKeys={[pathname]}
                    onSelect={({key}) => router.push(String(key))}
                    theme="dark"
                    mode="horizontal"
                    style={{flex: 1, minWidth: 0}}
                    items={menuItems}
                />
                <Button
                    type="text"
                    icon={isDark ? <SunOutlined/> : <MoonOutlined/>}
                    onClick={onToggle}
                    style={{color: token.colorTextLightSolid}}
                />
            </Header>

            <Content
                style={{
                    margin: 24,
                    padding: 24,
                    background: token.colorBgContainer,
                    borderRadius: token.borderRadiusLG,
                    minHeight: 'calc(100vh - 184px)',
                }}
            >
                {children}
            </Content>

            <Footer style={{textAlign: 'center'}}>
                <Text type="secondary">
                    BDDB - Next.js Version © {new Date().getFullYear()}
                </Text>
            </Footer>
        </Layout>
    )
}
