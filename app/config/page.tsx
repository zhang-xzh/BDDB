'use client'
import React, {useCallback, useState} from 'react'
import {Alert, Button, Card, H5, Icon, Intent} from '@blueprintjs/core'
import {postApi} from '@/lib/api'
import {showToast} from '@/lib/toaster'

const ConfigPage: React.FC = () => {
    const [syncing, setSyncing] = useState(false)
    const [rebuilding, setRebuilding] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const syncTorrents = useCallback(async () => {
        setSyncing(true)
        try {
            const data = await postApi('/api/qb/torrents/sync')
            if (data?.success) showToast('开始同步 qBittorrent', Intent.SUCCESS)
            else showToast(data?.error || '同步失败', Intent.DANGER)
        } catch (error) {
            console.error('同步失败:', error)
            showToast('同步失败', Intent.DANGER)
        } finally { setSyncing(false) }
    }, [])

    const rebuildData = useCallback(async () => {
        setRebuilding(true)
        try {
            const data = await postApi('/api/qb/torrents/rebuild')
            if (data?.success) showToast((data.data as any)?.message || '数据已重建', Intent.SUCCESS)
            else showToast(data?.error || '重建失败', Intent.DANGER)
        } catch (error) {
            console.error('重建失败:', error)
            showToast('重建失败', Intent.DANGER)
        } finally { setRebuilding(false) }
    }, [])

    return (
        <div style={{maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <Icon icon="cog" size={24}/>
                <h2 style={{margin: 0}}>配置</h2>
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 16}}>
                <Card style={{flex: '1 1 300px'}}>
                    <H5>同步操作</H5>
                    <p><strong>同步 qBittorrent</strong></p>
                    <p className="bp6-text-muted">从 qBittorrent 获取最新的种子列表并更新到数据库。</p>
                    <Button intent="primary" icon="refresh" loading={syncing} onClick={syncTorrents} fill large>
                        {syncing ? '同步中...' : '开始同步'}
                    </Button>
                </Card>
                <Card style={{flex: '1 1 300px'}}>
                    <H5>数据管理</H5>
                    <p><strong>重建数据</strong></p>
                    <p className="bp6-text-muted">清空所有本地数据并重新从 qBittorrent 同步。</p>
                    <p style={{color: 'var(--red3)'}}>⚠️ 此操作不可逆，请谨慎使用！</p>
                    <Button intent="danger" outlined icon="reset" loading={rebuilding} onClick={() => setConfirmOpen(true)} fill large>
                        重建数据
                    </Button>
                </Card>
            </div>
            <Alert isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}
                onConfirm={() => { setConfirmOpen(false); rebuildData() }}
                cancelButtonText="取消" confirmButtonText="确定"
                intent="danger" icon="warning-sign">
                <p>确定要重建数据吗？这将清空所有本地数据并重新从 qBittorrent 同步。此操作不可逆！</p>
            </Alert>
        </div>
    )
}
export default ConfigPage
