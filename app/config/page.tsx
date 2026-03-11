'use client'

import React, {useCallback, useState} from 'react'
import {
    Box, Button, Card, CardContent, CardHeader,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Typography,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import SyncIcon from '@mui/icons-material/Sync'
import RefreshIcon from '@mui/icons-material/Refresh'
import {postApi} from '@/lib/api'
import {useSnackbar} from 'notistack'

const ConfigPage: React.FC = () => {
    const {enqueueSnackbar} = useSnackbar()
    const [syncing, setSyncing] = useState(false)
    const [rebuilding, setRebuilding] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    // 同步 qBittorrent
    const syncTorrents = useCallback(async () => {
        setSyncing(true)
        try {
            const data = await postApi('/api/qb/torrents/sync')
            if (data?.success) {
                enqueueSnackbar('开始同步 qBittorrent', {variant: 'success'})
            } else {
                enqueueSnackbar(data?.error || '同步失败', {variant: 'error'})
            }
        } catch (error) {
            console.error('同步失败:', error)
            enqueueSnackbar('同步失败', {variant: 'error'})
        } finally {
            setSyncing(false)
        }
    }, [enqueueSnackbar])

    // 重建数据
    const rebuildData = useCallback(async () => {
        setRebuilding(true)
        try {
            const data = await postApi('/api/qb/torrents/rebuild')
            if (data?.success) {
                enqueueSnackbar((data.data as any)?.message || '数据已重建', {variant: 'success'})
            } else {
                enqueueSnackbar(data?.error || '重建失败', {variant: 'error'})
            }
        } catch (error) {
            console.error('重建失败:', error)
            enqueueSnackbar('重建失败', {variant: 'error'})
        } finally {
            setRebuilding(false)
        }
    }, [enqueueSnackbar])

    return (
        <Box sx={{maxWidth: 1200, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <SettingsIcon sx={{fontSize: 28}}/>
                <Typography variant="h5" fontWeight={600}>配置</Typography>
            </Box>

            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
                {/* 同步操作 */}
                <Box sx={{flex: '1 1 300px'}}>
                    <Card variant="outlined">
                        <CardHeader title="同步操作"/>
                        <CardContent sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                            <Typography variant="subtitle1" fontWeight={600}>同步 qBittorrent</Typography>
                            <Typography variant="body2" color="text.secondary">
                                从 qBittorrent 获取最新的种子列表并更新到数据库。如果种子已存在则更新状态，否则添加新种子。
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={syncTorrents}
                                disabled={syncing}
                                startIcon={<SyncIcon/>}
                                size="large"
                                fullWidth
                            >
                                {syncing ? '同步中...' : '开始同步'}
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* 数据管理 */}
                <Box sx={{flex: '1 1 300px'}}>
                    <Card variant="outlined">
                        <CardHeader title="数据管理"/>
                        <CardContent sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                            <Typography variant="subtitle1" fontWeight={600}>重建数据</Typography>
                            <Typography variant="body2" color="text.secondary">
                                清空所有本地数据（种子、文件、卷）并重新从 qBittorrent 同步。
                            </Typography>
                            <Typography variant="body2" color="error">⚠️ 此操作不可逆，请谨慎使用！</Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setConfirmOpen(true)}
                                disabled={rebuilding}
                                startIcon={<RefreshIcon/>}
                                size="large"
                                fullWidth
                            >
                                重建数据
                            </Button>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* 确认对话框 */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>确认重建</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        确定要重建数据吗？这将清空所有本地数据并重新从 qBittorrent 同步。此操作不可逆！
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>取消</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => { setConfirmOpen(false); rebuildData() }}
                    >
                        确定
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default ConfigPage
