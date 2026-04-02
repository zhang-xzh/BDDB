#ifndef BDDBREPOSITORY_H
#define BDDBREPOSITORY_H

#include "models/models.h"
#include <QString>
#include <QList>
#include <QMap>
#include <QFuture>
#include <expected>

template<typename T> using DbResult = std::expected<T, QString>;

class BddbRepository {
public:
    // ==================== Torrents ====================
    static DbResult<QList<Torrent>> loadTorrents(bool includeDeleted = false);
    static DbResult<Torrent> getTorrentByHash(const QString &hash);
    static DbResult<Torrent> getTorrentById(const QString &id);
    static DbResult<void> upsertTorrent(const Torrent &torrent);
    static DbResult<void> saveTorrent(const Torrent &torrent) { return upsertTorrent(torrent); }
    static DbResult<void> softDeleteTorrent(const QString &hash);

    static DbResult<QList<FileItem>> getTorrentFilesAsFileItems(const QString &torrentId);
    static DbResult<void> saveTorrentFiles(const QString &torrentId, const QList<TorrentFile> &files);
    static DbResult<void> softDeleteTorrentFiles(const QString &torrentId);

    // ==================== Volumes ====================
    static DbResult<QList<Volume>> loadVolumes(const QString &torrentId = QString());
    static DbResult<QList<Volume>> getAllVolumes(const QString &torrentId = QString());
    static DbResult<Volume> getVolumeById(const QString &volumeId);
    static DbResult<void> saveVolume(const Volume &volume);
    static DbResult<QMap<QString, qint32>> getVolumeCounts();
    static DbResult<void> deleteStaleVolumes(const QString &torrentId, const QList<qint32> &keepVolumeNos);
    static DbResult<QList<FileItem>> getVolumeFilesAsFileItems(const QString &volumeId);

    // ==================== Medias ====================
    static DbResult<QList<Media>> loadMedias(const QString &volumeId);
    static DbResult<QMap<QString, qint32>> getMediaCountsByVolume();
    static DbResult<void> saveMedia(const Media &media);
    static DbResult<void> deleteStaleMedias(const QString &volumeId, const QList<QPair<qint32, MediaType>> &keepMedias);

    // ==================== Works ====================
    static DbResult<QMap<QString, qint32>> getWorkCountsByVolume();
    static DbResult<QList<Work>> loadWorks();
    static DbResult<Work> getWorkById(const QString &id);
    static DbResult<Work> getWorkByBangumiSubjectId(qint32 subjectId);
    static DbResult<void> saveWork(const Work &work);
    static DbResult<void> removeWorkFromVolume(const QString &volumeId, const QString &workId);

    // ==================== Pagination & Search ====================
    static DbResult<VolumeListResult> getVolumesWithPagination(const VolumeListParams &params);

    // ==================== Product Linking ====================
    struct LinkResult { qint32 updated=0, matched=0, skipped=0; QList<QString> details;
        bool operator==(const LinkResult&) const = default;
    };
    static QFuture<LinkResult> linkVolumesToProducts();
    static LinkResult linkVolumesToProductsSync();
};

#endif // BDDBREPOSITORY_H
