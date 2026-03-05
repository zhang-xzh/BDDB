'use client'

import React, { useState } from 'react'
import { ConfigProvider, Layout, Menu } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './globals.css'

const { Header, Content, Footer } = Layout

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [selectedKeys, setSelectedKeys] = useState(['1'])

  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider locale={zhCN}>
          <div className="layout">
            <Layout>
              <Header className="header">
                <div className="logo">
                  <h1>BDDB</h1>
                </div>
                <Menu
                  selectedKeys={selectedKeys}
                  onSelect={keys => setSelectedKeys(keys.selectedKeys as string[])}
                  theme="dark"
                  mode="horizontal"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Menu.Item key="1">首页</Menu.Item>
                  <Menu.Item key="2">光盘管理</Menu.Item>
                  <Menu.Item key="3">配置</Menu.Item>
                </Menu>
              </Header>
              <Content className="content">
                {children}
              </Content>
              <Footer className="footer">
                BDDB - Next.js Version © {new Date().getFullYear()}
              </Footer>
            </Layout>
          </div>
        </ConfigProvider>
      </body>
    </html>
  )
}
