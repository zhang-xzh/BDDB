# MongoDB 数据结构文档

本文档描述 Bangumi 数据导入 MongoDB 后的文档结构（转换后）。

---

## 1. subjects 集合

条目主数据，包含动画、书籍、音乐、游戏、影视等。

### 文档结构

```json
{
  "_id": 1,
  "name": "第一次的親密接觸",
  "name_cn": "第一次的亲密接触",
  
  "type": 1,
  "type_info": {
    "id": 1,
    "name": "书籍"
  },
  
  "platform": 1002,
  "platform_info": {
    "id": 1002,
    "type": "Novel",
    "type_cn": "小说",
    "alias": "novel",
    "wiki_tpl": "Novel"
  },
  
  "infobox": {
    "type": "animanga/Novel",
    "type_cn": "小说",
    "fields": {
      "中文名": "第一次的亲密接触",
      "别名": [],
      "出版社": "紅色文化、知识出版社",
      "价格": "NT$160",
      "发售日": "1998-09-25",
      "页数": "188",
      "ISBN": "9789577086709",
      "作者": "蔡智恒"
    }
  },
  
  "summary": "风靡华人世界的网恋小说经典...",
  "nsfw": false,
  "meta_tags": [],
  "series": false,
  "date": "1998-09-25",
  
  "meta": {
    "score": 7.7,
    "score_details": {
      "1": 1,
      "2": 0,
      "3": 1,
      "4": 0,
      "5": 0,
      "6": 9,
      "7": 18,
      "8": 39,
      "9": 11,
      "10": 6
    },
    "rank": 1835,
    "tags": ["小说", "爱情", "经典"],
    "favorite": {
      "wish": 53,
      "done": 126,
      "doing": 6,
      "on_hold": 7,
      "dropped": 2
    }
  },
  
  "_raw": {
    "score": 7.7,
    "score_details": {...},
    "rank": 1835,
    "date": "1998-09-25"
  },
  
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "subject.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | int | 条目唯一ID |
| `name` | str | 原名（通常是日文名） |
| `name_cn` | str | 中文名 |
| `type` | int | 条目类型ID (1=书籍, 2=动画, 3=音乐, 4=游戏, 6=影视) |
| `type_info` | dict | 类型信息（来自 common/subject_platforms.yml） |
| `platform` | int | 平台类型ID |
| `platform_info` | dict | 平台信息（来自 common/subject_platforms.yml） |
| `infobox` | dict | 解析后的 Wiki 元数据 |
| `infobox.type` | str | Infobox 类型 |
| `infobox.type_cn` | str | 类型中文名 |
| `infobox.fields` | dict | 字段键值对 |
| `summary` | str | 简介/剧情介绍 |
| `nsfw` | bool | 是否NSFW内容 |
| `meta_tags` | list | 系统标签 |
| `series` | bool | 是否为系列条目 |
| `date` | str | 发售/放送日期 (YYYY-MM-DD) |
| `meta` | dict | 统计信息（评分、排名、标签、收藏） |
| `_raw` | dict | 原始数据中未解析的字段 |
| `_sync` | dict | 同步信息（创建时间、更新时间、版本） |

---

## 2. persons 集合

创作者、声优、演员等真实人物数据。

### 文档结构

```json
{
  "_id": 1,
  "type": 1,
  "name": "水樹奈々",
  
  "infobox": {
    "type": "Crt",
    "type_cn": "角色",
    "fields": {
      "简体中文名": "水树奈奈",
      "别名": [
        {"k": "第二中文名", "v": ""},
        {"k": "英文名", "v": ""},
        {"k": "日文名", "v": "近藤奈々 (こんどう なな)"},
        {"k": "纯假名", "v": "みずき なな"},
        {"k": "罗马字", "v": "Mizuki Nana"},
        {"k": "昵称", "v": "奈々ちゃん、奈々さん..."}
      ],
      "性别": "女",
      "生日": "1980年1月21日",
      "血型": "O型",
      "身高": "153cm"
    }
  },
  
  "summary": "原名 近藤 奈々...",
  "career": ["artist", "seiyu"],
  "collects": 1196,
  "comments": 141,
  
  "_raw": {},
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "person.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | int | 人物唯一ID |
| `type` | int | 人物类型 (1=个人, 2=公司/组织) |
| `name` | str | 原名 |
| `infobox` | dict | 解析后的 Wiki 元数据 |
| `summary` | str | 人物简介 |
| `career` | list[str] | 职业标签 |
| `collects` | int | 收藏数 |
| `comments` | int | 评论数 |
| `_raw` | dict | 原始数据中未解析的字段 |
| `_sync` | dict | 同步信息 |

---

## 3. characters 集合

虚构角色数据（动漫、游戏角色）。

### 文档结构

```json
{
  "_id": 1,
  "name": "ルルーシュ・ランペルージ",
  
  "infobox": {
    "type": "Crt",
    "type_cn": "角色",
    "fields": {
      "简体中文名": "鲁路修·兰佩路基",
      "别名": [
        {"v": "L.L."},
        {"v": "鲁鲁修"},
        {"k": "英文名", "v": "Lelouch Lamperouge"},
        {"k": "日文名", "v": "ルルーシュ・ヴィ・ブリタニア"}
      ],
      "性别": "男",
      "生日": "12月5日",
      "血型": "A型",
      "身高": "178cm→181cm"
    }
  },
  
  "summary": "鲁路修·兰佩洛基是日本动画...",
  "role": 1,
  "collects": 1204,
  "comments": 181,
  
  "_raw": {},
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "character.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | int | 角色唯一ID |
| `name` | str | 角色名 |
| `infobox` | dict | 解析后的 Wiki 元数据 |
| `summary` | str | 角色简介 |
| `role` | int | 角色类型 (1=主角, 2=配角, 3=客串) |
| `collects` | int | 收藏数 |
| `comments` | int | 评论数 |
| `_raw` | dict | 原始数据中未解析的字段 |
| `_sync` | dict | 同步信息 |

---

## 4. episodes 集合

动画/电视剧的集数信息。

### 文档结构

```json
{
  "_id": 2,
  "subject_id": 8,
  "type": 0,
  "name": "ギアス 狩り",
  "name_cn": "Geass 狩猎",
  "sort": 14,
  "airdate": "2008-07-12",
  "duration": "24m",
  "description": "シナリオ/大河内 一楼...",
  "disc": 0,
  
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "episode.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | int | 剧集唯一ID |
| `subject_id` | int | 所属条目ID |
| `type` | int | 剧集类型 (0=本篇, 1=特别篇, 2=OP, 3=ED) |
| `name` | str | 原名 |
| `name_cn` | str | 中文名 |
| `sort` | int | 排序号/集数 |
| `airdate` | str | 放送日期 (YYYY-MM-DD) |
| `duration` | str | 时长 (如 "24m") |
| `description` | str | 剧情简介 |
| `disc` | int | 碟片编号 |
| `_sync` | dict | 同步信息 |

---

## 5. subject_relations 集合

条目之间的关系（改编、续集、前传等）。

### 文档结构

```json
{
  "_id": "1_296317",
  "subject_id": 1,
  "related_subject_id": 296317,
  "relation_type": 1,
  "relation_info": {
    "id": 1,
    "cn": "改编",
    "en": "Adaptation",
    "desc": "同系列不同平台作品（如柯南漫画与动画版）"
  },
  "order": 0,
  
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "subject-relations.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | str | 复合ID: "{subject_id}_{related_subject_id}" |
| `subject_id` | int | 源条目ID |
| `related_subject_id` | int | 关联条目ID |
| `relation_type` | int | 关系类型ID |
| `relation_info` | dict | 关系信息（来自 common/subject_relations.yml） |
| `order` | int | 显示顺序 |
| `_sync` | dict | 同步信息 |

### 关系类型示例

| ID | 中文 | 英文 | 说明 |
|----|------|------|------|
| 1 | 改编 | Adaptation | 同系列不同平台作品 |
| 2 | 前传 | Prequel | 发生在故事之前 |
| 3 | 续集 | Sequel | 发生在故事之后 |
| 6 | 番外篇 | Side Story | 主线之外的支线故事 |

---

## 6. person_relations 集合

人物之间的关系（家人、配偶、CV等）。

### 文档结构

```json
{
  "_id": "1_2",
  "person_id": 1,
  "related_person_id": 2,
  "relation_type": 1001,
  "relation_info": {
    "id": 1001,
    "cn": "家人",
    "desc": ""
  },
  
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "person-relations.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | str | 复合ID: "{person_id}_{related_person_id}" |
| `person_id` | int | 源人物ID |
| `related_person_id` | int | 关联人物ID |
| `relation_type` | int | 关系类型ID |
| `relation_info` | dict | 关系信息（来自 common/person_relations.yml） |
| `_sync` | dict | 同步信息 |

### 关系类型示例

| ID | 中文 | 说明 |
|----|------|------|
| 1001 | 家人 | 家庭成员 |
| 1002 | 配偶 | 丈夫/妻子 |
| 0 | CV | 角色的配音声优 |
| 2 | 演员 | 真人出演的演员 |

---

## 7. subject_persons 集合

条目与制作人员/声优的关联。

### 文档结构

```json
{
  "_id": "1_45228_2004",
  "subject_id": 1,
  "person_id": 45228,
  "position": 2004,
  "position_info": {
    "id": 2004,
    "cn": "出版社",
    "en": "",
    "jp": "",
    "categories": []
  },
  "appear_eps": "",
  
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "subject-persons.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | str | 复合ID: "{subject_id}_{person_id}_{position}" |
| `subject_id` | int | 条目ID |
| `person_id` | int | 人物ID |
| `position` | int | 职位ID |
| `position_info` | dict | 职位信息（来自 common/subject_staffs.yml） |
| `appear_eps` | str | 出现集数 |
| `_sync` | dict | 同步信息 |

### 职位类型示例

| ID | 中文 | 英文 | 说明 |
|----|------|------|------|
| 1 | 原作 | Original Creator | 原作作者 |
| 2 | 导演 | Director | 动画导演 |
| 3 | 脚本 | Script | 编剧 |
| 2001 | 作者 | - | 书籍作者 |
| 2004 | 出版社 | - | 出版机构 |
| 3001 | 艺术家 | Artist | 音乐艺术家 |

---

## 8. subject_characters 集合

条目与角色的关联。

### 文档结构

```json
{
  "_id": "2_68911",
  "subject_id": 2,
  "character_id": 68911,
  "type": 1,
  "order": 0,
  
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "subject-characters.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | str | 复合ID: "{subject_id}_{character_id}" |
| `subject_id` | int | 条目ID |
| `character_id` | int | 角色ID |
| `type` | int | 角色类型 (1=主角, 2=配角, 3=客串) |
| `order` | int | 显示顺序 |
| `_sync` | dict | 同步信息 |

---

## 9. person_characters 集合

人物（声优）与角色的配音关系。

### 文档结构

```json
{
  "_id": "1_296_292",
  "person_id": 1,
  "character_id": 296,
  "subject_id": 292,
  "summary": "",
  
  "_sync": {
    "created_at": "2026-03-15T10:00:00",
    "updated_at": "2026-03-15T10:00:00",
    "version": 1,
    "source_file": "person-characters.jsonlines"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | str | 复合ID: "{person_id}_{character_id}_{subject_id}" |
| `person_id` | int | 声优ID |
| `character_id` | int | 角色ID |
| `subject_id` | int | 作品条目ID（该角色出现的作品） |
| `summary` | str | 备注说明 |
| `_sync` | dict | 同步信息 |

---

## 数据关系图

```
subjects (条目)
    ├── episodes (剧集) [1:N]
    ├── subject_relations (条目关联) [N:M]
    │       └── subjects (关联条目)
    ├── subject_persons (制作人员) [N:M]
    │       └── persons (人物)
    └── subject_characters (角色) [N:M]
            └── characters (角色)

persons (人物)
    ├── person_relations (人物关系) [N:M]
    │       └── persons (关联人物)
    ├── subject_persons (参与作品) [N:M]
    │       └── subjects (条目)
    └── person_characters (配音角色) [N:M]
            └── characters (角色)

characters (角色)
    ├── subject_characters (所属作品) [N:M]
    │       └── subjects (条目)
    └── person_characters (配音声优) [N:M]
            └── persons (人物)
```

---

## 常用查询示例

### 查询某作品的所有制作人员

```javascript
db.subject_persons.find({ subject_id: 1 }).forEach(function(sp) {
  var person = db.persons.findOne({ _id: sp.person_id });
  print(sp.position_info.cn + ": " + person.name);
});
```

### 查询某作品的所有角色

```javascript
db.subject_characters.find({ subject_id: 8 }).forEach(function(sc) {
  var character = db.characters.findOne({ _id: sc.character_id });
  print(character.name);
});
```

### 查询某声优配音的所有角色

```javascript
db.person_characters.find({ person_id: 1 }).forEach(function(pc) {
  var character = db.characters.findOne({ _id: pc.character_id });
  var subject = db.subjects.findOne({ _id: pc.subject_id });
  print(character.name + " @ " + subject.name_cn);
});
```

### 查询某作品的"前传"和"续集"

```javascript
db.subject_relations.find({
  subject_id: 123,
  "relation_info.cn": { $in: ["前传", "续集"] }
}).forEach(function(rel) {
  var subject = db.subjects.findOne({ _id: rel.related_subject_id });
  print(rel.relation_info.cn + ": " + subject.name_cn);
});
```

---

## 索引列表

已创建的索引：

| 集合 | 索引名 | 字段 |
|------|--------|------|
| subjects | idx_type_platform | type + platform |
| subjects | idx_infobox_type | infobox.type_cn |
| subjects | idx_author | infobox.fields.作者 |
| subjects | idx_score | meta.score |
| subjects | idx_date | date |
| persons | idx_name_cn | infobox.fields.简体中文名 |
| persons | idx_career | career |
| episodes | idx_subject_sort | subject_id + sort |
| subject_relations | idx_subject | subject_id |
| subject_persons | idx_subject | subject_id |
| subject_persons | idx_person | person_id |
| subject_characters | idx_subject | subject_id |
| person_characters | idx_person | person_id |

---

## 更新日期

- 数据导出日期: 2026-03-10
- 文档生成日期: 2026-03-15
