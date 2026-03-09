'use client'

import React, {useState} from 'react'
import {Card, Flex, Input, Typography} from 'antd'

const {Text} = Typography

const SiderContent: React.FC = () => {
    const [searchText, setSearchText] = useState('')
    const [loading, setLoading] = useState(false)
    const [rawResponse, setRawResponse] = useState<any>(null)

    const handleSearch = async () => {
        if (!searchText.trim()) return

        setLoading(true)
        try {
            const res = await fetch(`/api/products/search?search=${encodeURIComponent(searchText)}&page=1&limit=20`)
            const data = await res.json()
            setRawResponse(data)
        } catch (error) {
            console.error('搜索失败:', error)
            setRawResponse({error: String(error)})
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    return (
        <Flex vertical gap={16} style={{height: '100%'}}>
            <Card>
                <Input.Search
                    placeholder="搜索产品..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onSearch={handleSearch}
                    loading={loading}
                    enterButton
                />
            </Card>
            <Card style={{flex: 1, overflow: 'auto'}}>
                {rawResponse ? (
                    <pre style={{margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12}}>
                        {JSON.stringify(rawResponse, null, 2)}
                    </pre>
                ) : (
                    <Text type="secondary">输入关键词搜索产品</Text>
                )}
            </Card>
        </Flex>
    )
}

export default SiderContent
