"use client";

import React, {useCallback, useEffect, useState} from "react";
import {Flex, Spin} from "antd";
import type {TorrentWithVolume} from "@/lib/db";
import {fetchApi} from "@/lib/api";
import {useDiscEditor} from "@/components/DiscEditor";
import {
  TorrentCollapseList,
  TorrentFiltersBar,
  TorrentListHeader,
  TorrentPagination,
  useTorrentEditorPanel,
  useTorrentListView,
} from "@/components/home/TorrentList";

const HomePage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [torrents, setTorrents] = useState<TorrentWithVolume[]>([]);

    const fetchTorrents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchApi<string>("/api/qb/torrents/info");
            if (res.success && res.data) setTorrents(JSON.parse(res.data));
        } catch (error) {
            console.error("获取种子列表失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const editor = useDiscEditor(fetchTorrents);
    const {
        searchText,
        setSearchText,
        invertSearch,
        setInvertSearch,
        filterCategory,
        setFilterCategory,
        filterHasVolumes,
        setFilterHasVolumes,
        currentPage,
        setCurrentPage,
        categories,
        filteredTorrents,
        pagedTorrents,
    } = useTorrentListView(torrents);
    const {activeKey, handleCollapseChange, handleCancel, closeForPageChange} =
        useTorrentEditorPanel({pagedTorrents, editor});

    useEffect(() => {
        fetchTorrents();
    }, [fetchTorrents]);

    return (
        <Flex vertical gap={16}>
            <TorrentFiltersBar
                searchText={searchText}
                invertSearch={invertSearch}
                filterCategory={filterCategory}
                filterHasVolumes={filterHasVolumes}
                categories={categories}
                total={filteredTorrents.length}
                onSearchTextChange={setSearchText}
                onInvertSearchChange={setInvertSearch}
                onCategoryChange={setFilterCategory}
                onHasVolumesChange={setFilterHasVolumes}
            />
            <Spin spinning={loading}>
                <TorrentListHeader/>
                <TorrentCollapseList
                    pagedTorrents={pagedTorrents}
                    activeKey={activeKey}
                    onChange={handleCollapseChange}
                    onCancel={handleCancel}
                    editor={editor}
                />
            </Spin>
            <TorrentPagination
                currentPage={currentPage}
                total={filteredTorrents.length}
                onPageChange={(page) => {
                    if (activeKey) closeForPageChange();
                    setCurrentPage(page);
                }}
            />
        </Flex>
    );
};

export default HomePage;