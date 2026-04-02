#ifndef BANGUMIREPOSITORY_H
#define BANGUMIREPOSITORY_H

#include "models/models.h"
#include <QString>
#include <QList>
#include <expected>

template<typename T>
using DbResult = std::expected<T, QString>;

class BangumiRepository {
public:
    static DbResult<BangumiSubjectDoc> getSubjectById(qint32 subjectId);

    static DbResult<QList<BangumiStaffItem> > getSubjectStaff(qint32 subjectId);

    static DbResult<QList<BangumiCharacterItem> > getSubjectCharacters(qint32 subjectId);

    static DbResult<QList<BangumiEpisodeDoc> > getSubjectEpisodes(qint32 subjectId);

    static DbResult<QList<BangumiSubjectRelationItem> > getSubjectRelations(qint32 subjectId);

    static DbResult<BangumiSubjectDetail> getSubjectDetail(qint32 subjectId);

    static DbResult<QList<BangumiSubjectDoc> > getAllSubjects(qint32 batchSize = 1000, qint32 skip = 0);

    static DbResult<qint32> getTotalSubjectsCount();
};

#endif // BANGUMIREPOSITORY_H
