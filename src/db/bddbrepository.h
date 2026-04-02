#ifndef BDDBREPOSITORY_H
#define BDDBREPOSITORY_H

#include "models/models.h"
#include <string>
#include <vector>
#include <map>
#include <expected>

template<typename T> using DbResult = std::expected<T, std::string>;

class BddbRepository {
public:
    // ==================== Torrents ====================
    static DbResult<std::vector<Torrent>> loadTorrents(bool includeDeleted = false);
    static DbResult<Torrent> getTorrentByHash(const std::string &hash);
    static DbResult<Torrent> getTorrentById(const std::string &id);
    static DbResult<void> upsertTorrent(const Torrent &torrent);
    static DbResult<void> saveTorrent(const Torrent &torrent) { return upsertTorrent(torrent); }
    static DbResult<void> softDeleteTorrent(const std::string &hash);

    static DbResult<std::vector<FileItem>> getTorrentFilesAsFileItems(const std::string &torrentId);
    static DbResult<void> saveTorrentFiles(const std::string &torrentId, const std::vector<TorrentFile> &files);
    static DbResult<void> softDeleteTorrentFiles(const std::string &torrentId);

    // ==================== Volumes ====================
    static DbResult<std::vector<Volume>> loadVolumes(const std::string &torrentId = std::string());
    static DbResult<std::vector<Volume>> getAllVolumes(const std::string &torrentId = std::string());
    static DbResult<Volume> getVolumeById(const std::string &volumeId);
    static DbResult<void> saveVolume(const Volume &volume);
    static DbResult<std::map<std::string, int>> getVolumeCounts();
    static DbResult<void> deleteStaleVolumes(const std::string &torrentId, const std::vector<int> &keepVolumeNos);
    static DbResult<std::vector<FileItem>> getVolumeFilesAsFileItems(const std::string &volumeId);

    // ==================== Medias ====================
    static DbResult<std::vector<Media>> loadMedias(const std::string &volumeId);
    static DbResult<std::map<std::string, int>> getMediaCountsByVolume();
    static DbResult<void> saveMedia(const Media &media);
    static DbResult<void> deleteStaleMedias(const std::string &volumeId, const std::vector<std::pair<int, MediaType>> &keepMedias);

    // ==================== Works ====================
    static DbResult<std::map<std::string, int>> getWorkCountsByVolume();
    static DbResult<std::vector<Work>> loadWorks();
    static DbResult<Work> getWorkById(const std::string &id);
    static DbResult<Work> getWorkByBangumiSubjectId(int subjectId);
    static DbResult<void> saveWork(const Work &work);
    static DbResult<void> removeWorkFromVolume(const std::string &volumeId, const std::string &workId);

    // ==================== Pagination & Search ====================
    static DbResult<VolumeListResult> getVolumesWithPagination(const VolumeListParams &params);

    // ==================== Product Linking ====================
    struct LinkResult { int updated=0, matched=0, skipped=0; std::vector<std::string> details; };
    using LinkProgressCallback = std::function<void(int current, int total, const std::string& message)>;
    static DbResult<LinkResult> linkVolumesToProducts(
        std::optional<LinkProgressCallback> onProgress = std::nullopt
    );
};

#endif // BDDBREPOSITORY_H
