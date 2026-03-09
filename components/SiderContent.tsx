'use client'

import React from 'react'
import {Card, Flex, Input} from 'antd'

const SiderContent: React.FC = () => {
    return (
        <Flex vertical gap={16} style={{height: '100%'}}>
            <Card>
                <Input.Search placeholder="搜索..."/>
            </Card>
            <Card style={{flex: 1}}>
                {/* 内容区域 */}
            </Card>
        </Flex>
    )
}

export default SiderContent
