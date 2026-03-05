'use client'

import React from 'react'
import { ConfigProvider, Layout, Menu } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import './globals.css'

const { Header, Content, Footer } = Layout

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    { key: '/', label: '首页' },
    { key: '/discs', label: '光盘管理' },
    { key: '/config', label: '配置' },
  ]

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
        <ConfigProvider locale={zhCN}>
          <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', gap: '24px' }}>
              <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                <h1 style={{ margin: 0, fontSize: '24px' }}>BDDB</h1>
              </div>
              <Menu
                selectedKeys={[pathname]}
                onSelect={({ key }) => router.push(key)}
                theme="dark"
                mode="horizontal"
                style={{ flex: 1, minWidth: 0 }}
                items={menuItems}
              />
            </Header>
            <Content style={{ margin: '24px', padding: '24px', background: '#fff', minHeight: 'calc(100vh - 184px)' }}>
              {children}
            </Content>
            <Footer style={{ textAlign: 'center', color: 'rgba(0, 0, 0, 0.45)' }}>
              BDDB - Next.js Version © {new Date().getFullYear()}
            </Footer>
          </Layout>
        </ConfigProvider>
      </body>
    </html>
  )
}
