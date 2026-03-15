# Bangumi API 与离线数据字段映射方案

本文档描述 Bangumi API 返回的字段与离线数据（JSONL）的映射关系，以及缺失字段的替代方案。

---

## 字段对比表

### 1. 搜索 API 字段映射

搜索 API (`/search/subject`) 返回的简化字段：

| API 字段 | 离线数据字段 | 状态 | 说明 |
|---------|-------------|------|------|
| `results` | 无 | ❌ 缺失 | 搜索结果总数，需自行统计 |
| `list` | 查询结果数组 | ✅ 对应 | 条目列表 |
| `list[].id` | `_id` | ✅ 完全对应 | 条目唯一ID |
| `list[].url` | 无 | ❌ 缺失 | 需自行拼接 |
| `list[].type` | `type` | ✅ 完全对应 | 条目类型ID |
| `list[].name` | `name` | ✅ 完全对应 | 原名 |
| `list[].name_cn` | `name_cn` | ✅ 完全对应 | 中文名 |
| `list[].summary` | `summary` | ✅ 完全对应 | 简介（可能被截断） |
| `list[].air_date` | `date` | ✅ 完全对应 | 放送/发售日期 |
| `list[].air_weekday` | 无 | ❌ 缺失 | 星期几（需从日期计算） |
| `list[].images` | 无 | ❌ 缺失 | 图片URL需按规则拼接 |

### 2. 详情 API 字段映射

详情 API (`/subject/{id}`) 返回的完整字段：

| API 字段 | 离线数据字段 | 状态 | 说明 |
|---------|-------------|------|------|
| `id` | `id` | ✅ 完全对应 | 条目唯一ID |
| `url` | 无 | ❌ 缺失 | 需自行拼接 |
| `type` | `type` | ✅ 完全对应 | 条目类型ID (1=书籍, 2=动画等) |
| `name` | `name` | ✅ 完全对应 | 原名 |
| `name_cn` | `name_cn` | ✅ 完全对应 | 中文名 |
| `summary` | `summary` | ✅ 完全对应 | 简介 |
| `eps` | `episode.jsonlines` | ⚠️ 需关联 | 剧集列表需通过 `subject_id` 关联查询 |
| `eps_count` | 无 | ❌ 缺失 | 需自行统计 episodes 数量 |
| `air_date` | `date` | ✅ 完全对应 | 放送/发售日期 |
| `air_weekday` | 无 | ❌ 缺失 | 星期几（需从日期计算） |
| `rating.total` | `score_details` | ✅ 完全对应 | 评分人数总计 |
| `rating.count` | `score_details` | ✅ 完全对应 | 各分数段人数分布 |
| `rating.score` | `score` | ✅ 完全对应 | 平均评分 |
| `images` | 无 | ❌ 缺失 | 图片URL需按规则拼接 |
| `collection` | `favorite` | ✅ 完全对应 | 收藏统计 (wish/done/doing/on_hold/dropped) |
| `crt` | `subject-characters.jsonlines` | ⚠️ 需关联 | 角色信息需关联查询 |
| `staff` | `subject-persons.jsonlines` | ⚠️ 需关联 | 制作人员需关联查询 |
| `topic` | 无 | ❌ 缺失 | 讨论区话题（动态数据） |
| `blog` | 无 | ❌ 缺失 | 相关博客（动态数据） |

---

## 缺失字段替代方案

### 1. URL 拼接规则

```python
# 条目详情页
subject_url = f"https://bgm.tv/subject/{subject_id}"

# 人物详情页
person_url = f"https://bgm.tv/person/{person_id}"

# 角色详情页
character_url = f"https://bgm.tv/character/{character_id}"

# 剧集详情页
epsode_url = f"https://bgm.tv/ep/{episode_id}"
```

### 2. 图片 URL 拼接规则

Bangumi 使用 CDN 存储图片，URL 规则如下：

```python
# 条目封面图片
subject_id = 62900
subject_cover = f"https://lain.bgm.tv/pic/cover/l/{(subject_id // 100) % 100}/{subject_id % 100}/{subject_id}.jpg"
# 结果: https://lain.bgm.tv/pic/cover/l/62/00/62900.jpg

# 图片尺寸替换
# l = large, c = common, m = medium, s = small, g = grid
sizes = {
    "large": "l",
    "common": "c", 
    "medium": "m",
    "small": "s",
    "grid": "g"
}

def get_subject_cover(subject_id, size="l"):
    """获取条目封面URL"""
    return f"https://lain.bgm.tv/pic/cover/{size}/{(subject_id // 100) % 100}/{subject_id % 100}/{subject_id}.jpg"

# 人物头像
person_id = 1217
def get_person_image(person_id, size="l"):
    """获取人物头像URL"""
    return f"https://lain.bgm.tv/pic/crt/{size}/{(person_id // 100) % 100}/{person_id % 100}/{person_id}.jpg"
```

### 3. 关联数据查询方案

#### 3.1 获取作品的制作人员（替代 API 的 `staff`）

```javascript
// MongoDB 查询
function getSubjectStaff(subject_id) {
  return db.subject_persons.aggregate([
    { $match: { subject_id: subject_id } },
    {
      $lookup: {
        from: "persons",
        localField: "person_id",
        foreignField: "_id",
        as: "person"
      }
    },
    { $unwind: "$person" },
    {
      $project: {
        position: "$position_info.cn",
        name: "$person.name",
        name_cn: "$person.name_cn",
        person_id: "$person._id"
      }
    }
  ]).toArray();
}

// 使用示例
var staff = getSubjectStaff(62900);
staff.forEach(function(s) {
  print(s.position + ": " + (s.name_cn || s.name));
});
```

#### 3.2 获取作品的角色（替代 API 的 `crt`）

```javascript
// MongoDB 查询
function getSubjectCharacters(subject_id) {
  return db.subject_characters.aggregate([
    { $match: { subject_id: subject_id } },
    {
      $lookup: {
        from: "characters",
        localField: "character_id",
        foreignField: "_id",
        as: "character"
      }
    },
    { $unwind: "$character" },
    {
      $project: {
        character_id: "$character._id",
        name: "$character.name",
        name_cn: "$character.infobox.fields.简体中文名",
        role_type: "$type",
        order: "$order"
      }
    },
    { $sort: { order: 1 } }
  ]).toArray();
}
```

#### 3.3 获取作品的剧集（替代 API 的 `eps`）

```javascript
// MongoDB 查询
function getSubjectEpisodes(subject_id) {
  return db.episodes.find(
    { subject_id: subject_id },
    {
      _id: 1,
      sort: 1,
      name: 1,
      name_cn: 1,
      airdate: 1,
      duration: 1,
      description: 1
    }
  ).sort({ sort: 1 }).toArray();
}
```

#### 3.4 统计剧集数量（替代 API 的 `eps_count`）

```javascript
// MongoDB 查询
db.episodes.countDocuments({ subject_id: 62900 })
```

#### 3.5 计算星期几（替代 API 的 `air_weekday`）

```javascript
// JavaScript 示例
function getWeekday(date_str) {
  var date = new Date(date_str);
  var weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return weekdays[date.getDay()];
}

// 使用
var weekday = getWeekday("2003-02-21"); // "周五"
```

---

## Python 完整示例

```python
from pymongo import MongoClient
from datetime import datetime
import re

client = MongoClient("mongodb://localhost:27017")
db = client.bangumi

class BangumiOfflineAPI:
    """离线数据 API 封装，模拟 Bangumi API 接口"""
    
    # ========== 搜索 API 模拟 ==========
    
    @staticmethod
    def search_subjects(keyword: str, type: int = None, limit: int = 10) -> dict:
        """
        模拟搜索 API /search/subject
        
        Args:
            keyword: 搜索关键词
            type: 条目类型筛选 (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=影视)
            limit: 返回数量限制
            
        Returns:
            {
                "results": 总数,
                "list": [条目列表]
            }
        """
        # 构建查询条件
        query = {
            "$or": [
                {"name": {"$regex": keyword, "$options": "i"}},
                {"name_cn": {"$regex": keyword, "$options": "i"}},
                {"summary": {"$regex": keyword, "$options": "i"}}
            ]
        }
        
        if type:
            query["type"] = type
        
        # 统计总数
        total = db.subjects.count_documents(query)
        
        # 查询结果
        cursor = db.subjects.find(query).limit(limit)
        
        # 转换为 API 格式（增强版，包含 type_info）
        results = []
        for subject in cursor:
            # 获取类型信息
            type_info = subject.get("type_info", {})
            platform_info = subject.get("platform_info", {})
            
            results.append({
                "id": subject["_id"],
                "url": BangumiOfflineAPI.get_subject_url(subject["_id"]),
                "type": subject["type"],  # 保留原始 type ID
                "type_info": {  # 新增：前端无需转义
                    "id": subject["type"],
                    "name": type_info.get("name", ""),
                    "name_cn": type_info.get("name", "")  # 兼容字段
                },
                "platform": subject.get("platform"),
                "platform_info": {  # 新增：平台信息
                    "id": subject.get("platform"),
                    "type": platform_info.get("type", ""),
                    "type_cn": platform_info.get("type_cn", ""),
                    "alias": platform_info.get("alias", "")
                },
                "name": subject["name"],
                "name_cn": subject.get("name_cn", ""),
                "summary": subject.get("summary", "")[:200],  # 截断简介
                "air_date": subject.get("date", ""),
                "air_weekday": BangumiOfflineAPI._get_weekday(subject.get("date")),
                "images": {
                    "large": BangumiOfflineAPI.get_cover_url(subject["_id"], "l"),
                    "common": BangumiOfflineAPI.get_cover_url(subject["_id"], "c"),
                    "medium": BangumiOfflineAPI.get_cover_url(subject["_id"], "m"),
                    "small": BangumiOfflineAPI.get_cover_url(subject["_id"], "s"),
                    "grid": BangumiOfflineAPI.get_cover_url(subject["_id"], "g"),
                },
                "score": subject.get("meta", {}).get("score"),  # 新增：评分
                "rank": subject.get("meta", {}).get("rank")  # 新增：排名
            })
        
        return {
            "results": total,
            "list": results
        }
    
    @staticmethod
    def _get_weekday(date_str: str) -> int:
        """计算星期几 (0=周日, 1=周一, ..., 6=周六)"""
        if not date_str:
            return 0
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d")
            return date.weekday()  # 0=周一, 6=周日
        except:
            return 0
    
    # ========== 详情 API 模拟 ==========
    
    @staticmethod
    def get_subject_url(subject_id: int) -> str:
        """获取条目URL"""
        return f"https://bgm.tv/subject/{subject_id}"
    
    @staticmethod
    def get_cover_url(subject_id: int, size: str = "l") -> str:
        """获取封面图片URL"""
        return f"https://lain.bgm.tv/pic/cover/{size}/{(subject_id // 100) % 100}/{subject_id % 100}/{subject_id}.jpg"
    
    @staticmethod
    def get_subject_detail(subject_id: int) -> dict:
        """获取条目详情（含关联数据）"""
        # 基础信息
        subject = db.subjects.find_one({"_id": subject_id})
        if not subject:
            return None
        
        # 添加URL
        subject["url"] = BangumiOfflineAPI.get_subject_url(subject_id)
        subject["cover_url"] = BangumiOfflineAPI.get_cover_url(subject_id)
        
        # 统计剧集数
        subject["eps_count"] = db.episodes.count_documents({"subject_id": subject_id})
        
        # 计算星期几
        if subject.get("date"):
            date = datetime.strptime(subject["date"], "%Y-%m-%d")
            subject["air_weekday"] = date.weekday() + 1  # 1=周一, 7=周日
        
        return subject
    
    @staticmethod
    def get_subject_staff(subject_id: int) -> list:
        """获取制作人员列表"""
        pipeline = [
            {"$match": {"subject_id": subject_id}},
            {"$lookup": {
                "from": "persons",
                "localField": "person_id",
                "foreignField": "_id",
                "as": "person"
            }},
            {"$unwind": "$person"},
            {"$project": {
                "position": "$position_info.cn",
                "name": "$person.name",
                "name_cn": "$person.name_cn",
                "person_id": "$person._id",
                "url": {"$concat": ["https://bgm.tv/person/", {"$toString": "$person._id"}]}
            }}
        ]
        return list(db.subject_persons.aggregate(pipeline))
    
    @staticmethod
    def get_subject_characters(subject_id: int) -> list:
        """获取角色列表"""
        pipeline = [
            {"$match": {"subject_id": subject_id}},
            {"$lookup": {
                "from": "characters",
                "localField": "character_id",
                "foreignField": "_id",
                "as": "character"
            }},
            {"$unwind": "$character"},
            {"$project": {
                "character_id": "$character._id",
                "name": "$character.name",
                "name_cn": "$character.infobox.fields.简体中文名",
                "role_type": "$type",
                "order": "$order",
                "url": {"$concat": ["https://bgm.tv/character/", {"$toString": "$character._id"}]}
            }},
            {"$sort": {"order": 1}}
        ]
        return list(db.subject_characters.aggregate(pipeline))
    
    @staticmethod
    def get_subject_episodes(subject_id: int) -> list:
        """获取剧集列表"""
        episodes = db.episodes.find(
            {"subject_id": subject_id},
            {"_id": 1, "sort": 1, "name": 1, "name_cn": 1, "airdate": 1, "duration": 1, "description": 1}
        ).sort("sort", 1)
        
        result = []
        for ep in episodes:
            ep["url"] = f"https://bgm.tv/ep/{ep['_id']}"
            result.append(ep)
        return result

# 使用示例
api = BangumiOfflineAPI()

# ========== 搜索 API 示例 ==========

# 搜索关键词
result = api.search_subjects("西部旷野", type=2, limit=10)
print(f"找到 {result['results']} 个结果")
for item in result['list']:
    print(f"{item['name_cn']} ({item['name']})")
    print(f"  URL: {item['url']}")
    print(f"  封面: {item['images']['medium']}")
    print(f"  放送日期: {item['air_date']}")

# ========== 详情 API 示例 ==========

# 获取条目详情
subject = api.get_subject_detail(62900)
print(f"名称: {subject['name_cn']}")
print(f"URL: {subject['url']}")
print(f"封面: {subject['cover_url']}")
print(f"剧集数: {subject['eps_count']}")

# 获取制作人员
staff = api.get_subject_staff(62900)
for person in staff:
    print(f"{person['position']}: {person['name_cn'] or person['name']}")

# 获取角色
characters = api.get_subject_characters(62900)
for char in characters:
    print(f"{char['name_cn'] or char['name']}")

# 获取剧集
episodes = api.get_subject_episodes(62900)
for ep in episodes:
    print(f"第{ep['sort']}话: {ep['name_cn'] or ep['name']}")
```

---

## 与原 API 的区别

### 1. 搜索 API 差异

| 特性 | 原 API | 离线数据 API |
|------|--------|-------------|
| `type` | 仅返回数字 ID (1, 2, 3...) | 额外提供 `type_info` 对象，含中文名称 |
| `platform` | 原 API 不返回 | 额外提供 `platform_info`，含平台中文名 |
| `score` / `rank` | 原 API 不返回 | 额外提供评分和排名信息 |
| 搜索范围 | 支持全文搜索 | 仅支持正则匹配 name/name_cn/summary |
| 结果排序 | 按相关性排序 | 默认按 _id 排序 |
| 分页 | 支持 offset/limit | 仅支持 limit |

### 2. 详情 API 差异

| 特性 | 原 API | 离线数据 API |
|------|--------|-------------|
| `infobox` | 返回原始 wiki 文本 | 返回解析后的结构化对象 |
| `staff` | 直接嵌入数组 | 需通过 `subject_persons` 关联查询 |
| `crt` | 直接嵌入数组 | 需通过 `subject_characters` 关联查询 |
| `eps` | 直接嵌入数组 | 需通过 `episodes` 集合查询 |
| `images` | 返回完整 CDN URL | 需按规则拼接，文件名可能不一致 |
| `url` | 返回完整 URL | 需自行拼接 |
| `topic` / `blog` | 返回动态数据 | 无此数据 |
| 实时性 | 实时数据 | 离线快照，可能延迟 |

### 3. 增强功能（离线数据特有）

离线数据 API 提供了原 API 没有的功能：

```json
{
  "type": 2,
  "type_info": {
    "id": 2,
    "name": "动画",
    "name_cn": "动画"
  },
  "platform": 1,
  "platform_info": {
    "id": 1,
    "type": "tv",
    "type_cn": "TV",
    "alias": "tv"
  }
}
```

**优势：**
- ✅ 前端无需维护类型映射表
- ✅ 直接显示中文类型名称
- ✅ 平台信息一目了然

### 4. 使用建议

| 场景 | 推荐方案 |
|------|---------|
| 需要最新数据 | 使用原 API |
| 需要图片 URL | 使用原 API（文件名更准确） |
| 需要动态数据（评论、讨论） | 使用原 API |
| 离线环境 / 本地查询 | 使用离线数据 |
| 需要类型中文名 | 使用离线数据（已内置） |
| 批量数据分析 | 使用离线数据（性能更好） |

---

## 注意事项

1. **图片 URL 可能失效**：CDN 图片 URL 可能随时间变化，建议定期更新或做容错处理
2. **动态数据缺失**：topic、blog、comment 等动态数据不在离线数据中，需调用 API
3. **数据时效性**：离线数据是定期导出的快照，可能不是最新数据
4. **关联查询性能**：大量关联查询可能影响性能，建议适当使用索引

---

## 更新日期

- 文档生成日期: 2026-03-15
- 基于数据版本: dump-2026-03-10.210325Z
