#ifndef BDDBREPOSITORY_H
#define BDDBREPOSITORY_H

#ifdef HAVE_MONGODB

#include "models/models.h"
#include <QVector>
#include <QMap>
#include <QString>

class BddbRepository {
public:
    // ==================== Torrents ====================
    static QVector<Torrent> loadTorrents(bool includeDeleted = false);
    static Torrent getTorrentByHash(const QString &hash);
    static Torrent getTorrentById(const QString &id);
    static void upsertTorrent(const Torrent &torrent);
    static void softDeleteTorrent(const QString &hash);

    static QVector<FileItem> getTorrentFilesAsFileItems(const QString &torrentId);
    static void saveTorrentFiles(const QString &torrentId, const QVector<TorrentFile> &files);
    static void softDeleteTorrentFiles(const QString &torrentId);

    // ==================== Volumes ====================
    static QVector<Volume> loadVolumes(const QString &torrentId = QString());
    static QVector<Volume> getAllVolumes(const QString &torrentId = QString());
    static Volume getVolumeById(const QString &volumeId);
    static void saveVolume(const Volume &volume);
    static QMap<QString, int> getVolumeCounts();
    static void deleteStaleVolumes(const QString &torrentId, const QVector<int> &keepVolumeNos);
    static QVector<FileItem> getVolumeFilesAsFileItems(const QString &volumeId);

    // ==================== Medias ====================
    static QVector<Media> loadMedias(const QString &volumeId);
    static QMap<QString, int> getMediaCountsByVolume();
    static void saveMedia(const Media &media);
    static void deleteStaleMedias(const QString &volumeId, const QVector<QPair<int, MediaType>> &keepMedias);

    // ==================== Works ====================
    static QMap<QString, int> getWorkCountsByVolume();
    static QVector<Work> loadWorks();
    static Work getWorkById(const QString &id);
    static Work getWorkByBangumiSubjectId(int subjectId);
    static void saveWork(const Work &work);
    static void removeWorkFromVolume(const QString &volumeId, const QString &workId);

    // ==================== Pagination & Search ====================
    static VolumeListResult getVolumesWithPagination(const VolumeListParams &params);

    // ==================== Product Linking ====================
    struct LinkResult {
        int updated = 0;
        int matched = 0;
        int skipped = 0;
        QVector<QString> details;
    };
    static LinkResult linkVolumesToProducts();
};

#endif // HAVE_MONGODB

#endif // BDDBREPOSITORY_H
