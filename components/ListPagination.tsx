import React from 'react'
import {Box, Pagination} from '@mui/material'
import {PAGE_SIZE} from '@/lib/utils'

const ListPagination: React.FC<{
    currentPage: number
    total: number
    onPageChange: (page: number) => void
}> = ({currentPage, total, onPageChange}) => {
    if (total <= PAGE_SIZE) return null
    return (
        <Box sx={{display: 'flex', justifyContent: 'flex-end', pt: 1}}>
            <Pagination
                page={currentPage}
                count={Math.ceil(total / PAGE_SIZE)}
                onChange={(_, page) => onPageChange(page)}
                showFirstButton showLastButton
                size="small"
            />
        </Box>
    )
}

export default ListPagination
