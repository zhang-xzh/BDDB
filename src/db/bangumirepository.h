#ifndef BANGUMIREPOSITORY_H
#define BANGUMIREPOSITORY_H

#include "models/models.h"
#include <string>
#include <vector>
#include <expected>

template<typename T> using DbResult = std::expected<T, std::string>;

class BangumiRepository {
public:
    static DbResult<BangumiSubjectDoc> getSubjectById(int subjectId);
    static DbResult<std::vector<BangumiStaffItem>> getSubjectStaff(int subjectId);
    static DbResult<std::vector<BangumiCharacterItem>> getSubjectCharacters(int subjectId);
    static DbResult<std::vector<BangumiEpisodeDoc>> getSubjectEpisodes(int subjectId);
    static DbResult<std::vector<BangumiSubjectRelationItem>> getSubjectRelations(int subjectId);
    static DbResult<BangumiSubjectDetail> getSubjectDetail(int subjectId);

    static DbResult<std::vector<BangumiSubjectDoc>> getAllSubjects(int batchSize = 1000, int skip = 0);
    static DbResult<int> getTotalSubjectsCount();
};

#endif // BANGUMIREPOSITORY_H
