'use client'

import React, { useState, useEffect } from 'react'
import { App, ConfigProvider, Layout, Menu, Button, Typography, theme } from 'antd'
import { SunOutlined, MoonOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import './globals.css'

const { Header, Content, Footer } = Layout
const { Title } = Typography

const menuItems = [
  { key: '/', label: '首页' },
  { key: '/discs', label: '光盘管理' },
  { key: '/config', label: '配置' },
]

function AppLayout({
  children,
  isDark,
  onToggle,
}: {
  children: React.ReactNode
  isDark: boolean
  onToggle: () => void
}) {
  const { token } = theme.useToken()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', gap: '24px' }}>
        <Title level={4} style={{ margin: 0, color: token.colorTextLightSolid }}>BDDB</Title>
        <Menu
          selectedKeys={[pathname]}
          onSelect={({ key }) => router.push(key)}
          theme="dark"
          mode="horizontal"
          style={{ flex: 1, minWidth: 0 }}
          items={menuItems}
        />
        <Button
          type="text"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={onToggle}
          style={{ color: token.colorTextLightSolid }}
        />
      </Header>
      <Content style={{ margin: 24, padding: 24, background: token.colorBgContainer, borderRadius: token.borderRadiusLG, minHeight: 'calc(100vh - 184px)' }}>
        {children}
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        <Typography.Text type="secondary">BDDB - Next.js Version © {new Date().getFullYear()}</Typography.Text>
      </Footer>
    </Layout>
  )
}

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
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
        <ConfigProvider
          locale={zhCN}
          theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}
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
