import React, {type ReactNode} from 'react'
import {Accordion, AccordionDetails, AccordionSummary, Box} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

/**
 * 行标签包装器：展开时阻止点击冒泡（防止误触收起），收起时允许点击展开。
 */
export const ExpandBlocker: React.FC<{ isExpanded: boolean; children: ReactNode }> = ({isExpanded, children}) => (
    <div onClick={(e) => isExpanded && e.stopPropagation()}>
        {children}
    </div>
)

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
                        onChange={() => {
                            if (!isExpanded) onChange(key)
                        }}
                        variant="outlined"
                        disableGutters
                    >
                        <AccordionSummary
                            expandIcon={
                                <ExpandMoreIcon onClick={(e) => {
                                    e.stopPropagation()
                                    onChange(key)
                                }}/>
                            }
                            sx={{px: 1, flexDirection: 'row-reverse'}}
                        >
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
