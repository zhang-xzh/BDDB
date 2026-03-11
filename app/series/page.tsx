import {Box, Typography} from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'

export default function SeriesPage() {
    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 8}}>
            <InboxIcon sx={{fontSize: 48, color: 'text.disabled'}}/>
            <Typography color="text.secondary">系列管理页面开发中</Typography>
        </Box>
    )
}
