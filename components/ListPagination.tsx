import React from 'react'
import {Flex, Pagination} from 'antd'
import {PAGE_SIZE} from '@/lib/utils'

const ListPagination: React.FC<{
    currentPage: number
    total: number
    onPageChange: (page: number) => void
}> = ({currentPage, total, onPageChange}) => {
    if (total <= PAGE_SIZE) return null
    return (
        <Flex justify="flex-end">
            <Pagination
                current={currentPage} pageSize={PAGE_SIZE} total={total}
                onChange={onPageChange} showQuickJumper showSizeChanger={false}
            />
        </Flex>
    )
}

export default ListPagination
