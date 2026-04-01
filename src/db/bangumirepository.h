#ifndef BANGUMIREPOSITORY_H
#define BANGUMIREPOSITORY_H

#ifdef HAVE_MONGODB

#include "models/models.h"
#include <QVector>

class BangumiRepository {
public:
    static BangumiSubjectDoc getSubjectById(int subjectId);
    static QVector<BangumiStaffItem> getSubjectStaff(int subjectId);
    static QVector<BangumiCharacterItem> getSubjectCharacters(int subjectId);
    static QVector<BangumiEpisodeDoc> getSubjectEpisodes(int subjectId);
    static QVector<BangumiSubjectRelationItem> getSubjectRelations(int subjectId);
    static BangumiSubjectDetail getSubjectDetail(int subjectId);

    static QVector<BangumiSubjectDoc> getAllSubjects(int batchSize = 1000, int skip = 0);
    static int getTotalSubjectsCount();
};

#endif // HAVE_MONGODB
#endif // BANGUMIREPOSITORY_H
