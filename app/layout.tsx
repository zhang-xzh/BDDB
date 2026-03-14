'use client'

import React, {useEffect, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import {AppBar, Box, createTheme, CssBaseline, Divider, IconButton, Tab, Tabs, ThemeProvider, Typography} from '@mui/material'
import {zhCN} from '@mui/material/locale'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import {SnackbarProvider} from 'notistack'
import SiderContent from '@/components/SiderContent'
import './globals.css'

const NAV_ITEMS = [
    {path: '/torrents', label: '种子管理'},
    {path: '/media', label: '媒介管理'},
    {path: '/work', label: '作品管理'},
    {path: '/config', label: '配置'},
]

const HEADER_H = 56

function AppLayout({children, isDark, onToggle}: {
    children: React.ReactNode
    isDark: boolean
    onToggle: () => void
}) {
    const pathname = usePathname()
    const router = useRouter()
    const currentTab = NAV_ITEMS.find(n => pathname?.startsWith(n.path))?.path ?? false

    return (
        <>
            {/* ── Header ── */}
            <AppBar position="sticky" sx={{height: HEADER_H, flexDirection: 'row', alignItems: 'center', px: 3, gap: 1}}>
                <Typography variant="h6" sx={{fontWeight: 700, whiteSpace: 'nowrap'}}>BDDB</Typography>
                <Divider orientation="vertical" flexItem sx={{mx: 1, borderColor: 'rgba(255,255,255,0.3)'}}/>
                <Tabs
                    value={currentTab}
                    onChange={(_, v) => router.push(v)}
                    textColor="inherit"
                    TabIndicatorProps={{style: {backgroundColor: '#fff'}}}
                    sx={{flex: 1, minWidth: 0, '& .MuiTab-root': {minHeight: HEADER_H, py: 0, color: 'rgba(255,255,255,0.7)', '&.Mui-selected': {color: '#fff'}}}}
                >
                    {NAV_ITEMS.map(n => <Tab key={n.path} value={n.path} label={n.label}/>)}
                </Tabs>
                <IconButton onClick={onToggle} sx={{color: '#fff'}}>
                    {isDark ? <LightModeIcon/> : <DarkModeIcon/>}
                </IconButton>
            </AppBar>

            {/* ── Body ── */}
            <Box sx={{display: 'flex', minHeight: `calc(100vh - ${HEADER_H}px)`}}>
                {/* Sider */}
                <Box sx={{
                    width: '25%', flexShrink: 0,
                    m: '24px 12px 24px 24px', p: 3,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    position: 'sticky',
                    top: HEADER_H + 24,
                    alignSelf: 'flex-start',
                    maxHeight: `calc(100vh - ${HEADER_H}px - 48px)`,
                    overflow: 'auto',
                }}>
                    <SiderContent/>
                </Box>
                {/* Content */}
                <Box sx={{flex: 1, m: '24px 24px 24px 12px', p: 3, bgcolor: 'background.paper', borderRadius: 2, minWidth: 0}}>
                    {children}
                </Box>
            </Box>
        </>
    )
}

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
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

    const muiTheme = createTheme({palette: {mode: isDark ? 'dark' : 'light'}}, zhCN)

    return (
        <html lang="zh-CN">
        <head>
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <meta name="description" content="BDDB - 原盘数据管理"/>
            <title>BDDB</title>
        </head>
        <body>
        <ThemeProvider theme={muiTheme}>
            <CssBaseline/>
            <SnackbarProvider maxSnack={3} anchorOrigin={{vertical: 'top', horizontal: 'center'}}>
                <AppLayout isDark={isDark} onToggle={onToggle}>
                    {children}
                </AppLayout>
            </SnackbarProvider>
        </ThemeProvider>
        </body>
        </html>
    )
}