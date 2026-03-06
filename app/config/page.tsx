'use client'

import React, {useCallback, useState} from 'react'
import {Button, Card, Col, Divider, Flex, message, Modal, Row, Space, Typography} from 'antd'
import {ReloadOutlined, SaveOutlined, SettingOutlined, SyncOutlined} from '@ant-design/icons'
import {postApi} from '@/lib/api'

const ConfigPage: React.FC = () => {
    const [syncing, setSyncing] = useState(false)
    const [rebuilding, setRebuilding] = useState(false)
    const [flushing, setFlushing] = useState(false)

    // 同步 qBittorrent
    const syncTorrents = useCallback(async () => {
        setSyncing(true)
        try {
            const data = await postApi('/api/qb/torrents/sync')
            if (data?.success) {
                message.success('开始同步 qBittorrent')
            } else {
                message.error(data?.error || '同步失败')
            }
        } catch (error) {
            console.error('同步失败:', error)
            message.error('同步失败')
        } finally {
            setSyncing(false)
        }
    }, [])

    // 重建数据
    const rebuildData = useCallback(async () => {
        setRebuilding(true)
        try {
            const data = await postApi('/api/qb/torrents/rebuild')
            if (data?.success) {
                message.success((data.data as any)?.message || '数据已重建')
            } else {
                message.error(data?.error || '重建失败')
            }
        } catch (error) {
            console.error('重建失败:', error)
            message.error('重建失败')
        } finally {
            setRebuilding(false)
        }
    }, [])

    // 手动写入所有数据到磁盘
    const flushStore = useCallback(async () => {
        setFlushing(true)
        try {
            const data = await postApi('/api/store/flush') as any
            if (data?.success) {
                message.success(data?.message || '写入完成')
            } else {
                message.error(data?.error || '写入失败')
            }
        } catch (error) {
            console.error('写入失败:', error)
            message.error('写入失败')
        } finally {
            setFlushing(false)
        }
    }, [])

    // 确认重建
    const confirmRebuild = () => {
        Modal.confirm({
            title: '确认重建',
            content: '确定要重建数据吗？这将清空所有本地数据并重新从 qBittorrent 同步。此操作不可逆！',
            okText: '确定',
            cancelText: '取消',
            okButtonProps: {danger: true},
            onOk: () => rebuildData(),
        })
    }

    return (
        <Flex vertical gap={24} style={{maxWidth: '1200px', margin: '0 auto'}}>
            <Flex align="center" gap={8}>
                <SettingOutlined style={{fontSize: 24}}/>
                <Typography.Title level={2} style={{margin: 0}}>配置</Typography.Title>
            </Flex>

            <Row gutter={[16, 16]}>
                {/* 同步操作 */}
                <Col xs={24} md={12}>
                    <Card title="同步操作">
                        <Space style={{width: '100%'}} size="large" direction="vertical">
                            <Flex vertical gap="small">
                                <Typography.Title level={3} style={{marginTop: 0}}>同步 qBittorrent</Typography.Title>
                                <Typography.Paragraph style={{color: '#666', fontSize: '14px'}}>
                                    从 qBittorrent 获取最新的种子列表并更新到数据库。如果种子已存在则更新状态，否则添加新种子。
                                </Typography.Paragraph>
                                <Button
                                    type="primary"
                                    onClick={syncTorrents}
                                    loading={syncing}
                                    icon={<SyncOutlined spin={syncing}/>}
                                    size="large"
                                    block
                                >
                                    {syncing ? '同步中...' : '开始同步'}
                                </Button>
                            </Flex>

                            <Divider/>

                            <Flex vertical gap="small">
                                <Typography.Title level={3} style={{marginTop: 0}}>手动写入</Typography.Title>
                                <Typography.Paragraph style={{color: '#666', fontSize: '14px'}}>
                                    将内存中的所有数据强制写入磁盘。正常情况下每次操作后自动写入，此按钮用于应急保存。
                                </Typography.Paragraph>
                                <Button
                                    onClick={flushStore}
                                    loading={flushing}
                                    icon={<SaveOutlined/>}
                                    size="large"
                                    block
                                >
                                    {flushing ? '写入中...' : '写入磁盘'}
                                </Button>
                            </Flex>
                        </Space>
                    </Card>
                </Col>

                {/* 数据管理 */}
                <Col xs={24} md={12}>
                    <Card title="数据管理">
                        <Space style={{width: '100%'}} size="large" direction="vertical">
                            <Flex vertical gap="small">
                                <Typography.Title level={3} style={{marginTop: 0}}>重建数据</Typography.Title>
                                <Typography.Paragraph style={{color: '#666', fontSize: '14px'}}>
                                    清空所有本地数据（种子、文件、卷）并重新从 qBittorrent 同步。
                                    <br/>
                                    <Typography.Text type="danger">⚠️ 此操作不可逆，请谨慎使用！</Typography.Text>
                                </Typography.Paragraph>
                                <Button
                                    danger
                                    onClick={confirmRebuild}
                                    loading={rebuilding}
                                    icon={<ReloadOutlined/>}
                                    size="large"
                                    block
                                >
                                    重建数据
                                </Button>
                            </Flex>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </Flex>
    )
}

export default ConfigPage