import React, {type CSSProperties, type ReactNode} from 'react'
import {Accordion, AccordionDetails, AccordionSummary, Box, Typography, useTheme} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

/**
 * 行标签包装器：展开时阻止点击冒泡（防止误触收起），收起时允许点击展开。
 */
export const ExpandBlocker: React.FC<{ isExpanded: boolean; children: ReactNode }> = ({isExpanded, children}) => (
    <div onClick={(e) => isExpanded && e.stopPropagation()}>
        {children}
    </div>
)

// ─── ListHeader ───────────────────────────────────────────────────────────────

export interface ListHeaderColumn {
    label: string
    style: CSSProperties
}

export const ListHeader: React.FC<{ columns: ListHeaderColumn[] }> = ({columns}) => {
    const theme = useTheme()
    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: theme.palette.action.hover}}>
            <Box sx={{width: 24, flexShrink: 0}}/>
            {columns.map(col => (
                <Typography key={col.label} variant="body2" fontWeight={700} color="text.primary" style={col.style}>
                    {col.label}
                </Typography>
            ))}
        </Box>
    )
}

// ─── CollapsePageList ─────────────────────────────────────────────────────────

interface CollapsePageListProps<T> {
    items: T[]
    getKey: (item: T) => string
    activeKey: string | undefined
    onChange: (key: string | string[]) => Promise<void>
    renderLabel: (item: T, isExpanded: boolean) => ReactNode
    renderContent: (item: T) => ReactNode | null
}

function CollapsePageList<T>({items, getKey, activeKey, onChange, renderLabel, renderContent}: CollapsePageListProps<T>) {
    return (
        <Box>
            {items.map(item => {
                const key = getKey(item)
                const isExpanded = activeKey === key
                return (
                    <Accordion
                        key={key}
                        expanded={isExpanded}
                        onChange={(_, expanded) => onChange(expanded ? key : '')}
                        disableGutters
                        elevation={0}
                        sx={{'&:before': {display: 'none'}, borderBottom: '1px solid', borderColor: 'divider'}}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon/>} sx={{px: 2, minHeight: 48}}>
                            {renderLabel(item, isExpanded)}
                        </AccordionSummary>
                        <AccordionDetails sx={{p: 0}}>
                            {isExpanded ? renderContent(item) : null}
                        </AccordionDetails>
                    </Accordion>
                )
            })}
        </Box>
    )
}

export default CollapsePageList
