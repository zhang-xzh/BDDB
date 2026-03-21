'use client'

import React, {useCallback, useState} from 'react'
import {Button, Card, Col, Flex, message, Modal, Row, Space, Typography} from 'antd'
import {ReloadOutlined, SettingOutlined, SyncOutlined} from '@ant-design/icons'
import {postApi} from '@/lib/api'
import {SPACING} from '@/lib/utils'

const ConfigPage: React.FC = () => {
    const [syncing, setSyncing] = useState(false)
    const [rebuilding, setRebuilding] = useState(false)

    // 同步 qBittorrent
    const syncTorrents = useCallback(async () => {
        setSyncing(true)
        try {
            const data = await postApi('/api/torrents/sync')
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
            const data = await postApi('/api/torrents/rebuild')
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
        <Flex vertical gap={SPACING.lg}>
            <Flex align="center" gap={8}>
                <SettingOutlined style={{fontSize: 24}}/>
                <Typography.Title level={4} style={{margin: 0}}>配置</Typography.Title>
            </Flex>

            <Row gutter={[SPACING.md, SPACING.md]}>
                {/* 同步操作 */}
                <Col xs={24} md={12}>
                    <Card title="同步操作" size="small" styles={{body: {padding: SPACING.md}}}>
                        <Space style={{width: '100%'}} size={SPACING.md} direction="vertical">
                            <Flex vertical gap="small">
                                <Typography.Text strong style={{fontSize: 13}}>同步 qBittorrent</Typography.Text>
                                <Typography.Paragraph type="secondary" style={{fontSize: 12}}>
                                    从 qBittorrent 获取最新的种子列表并更新到数据库。如果种子已存在则更新状态，否则添加新种子。
                                </Typography.Paragraph>
                                <Button
                                    type="primary"
                                    onClick={syncTorrents}
                                    loading={syncing}
                                    icon={<SyncOutlined spin={syncing}/>}
                                    size="middle"
                                    block
                                >
                                    {syncing ? '同步中...' : '开始同步'}
                                </Button>
                            </Flex>

                        </Space>
                    </Card>
                </Col>

                {/* 数据管理 */}
                <Col xs={24} md={12}>
                    <Card title="数据管理" size="small" styles={{body: {padding: SPACING.md}}}>
                        <Space style={{width: '100%'}} size={SPACING.md} direction="vertical">
                            <Flex vertical gap="small">
                                <Typography.Text strong style={{fontSize: 13}}>重建数据</Typography.Text>
                                <Typography.Paragraph type="secondary" style={{fontSize: 12, marginBottom: 0}}>
                                    清空所有本地数据（种子、文件、卷）并重新从 qBittorrent 同步。
                                </Typography.Paragraph>
                                <Typography.Text type="danger">⚠️ 此操作不可逆，请谨慎使用！</Typography.Text>
                                <Button
                                    danger
                                    onClick={confirmRebuild}
                                    loading={rebuilding}
                                    icon={<ReloadOutlined/>}
                                    size="middle"
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