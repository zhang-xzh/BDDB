# Data Schema

## Database Files
```
data/
├── torrents.nedb
└── volumes.nedb
```

## Torrent Schema
```typescript
{
  _id: string,
  hash: string,
  name: string,
  size: number,
  progress: number,
  state: string,
  num_seeds: number,
  num_leechs: number,
  added_on: number,
  completion_on: number,
  save_path: string,
  uploaded: number,
  downloaded: number,
  files: [{ name, size, progress, file_index }],
  is_deleted: boolean,
  synced_at: number
}
```

## Volume Schema
```typescript
{
  _id: string,
  torrent_hash: string,
  box_id: string,
  type: 'volume' | 'box',
  volume_no: number,
  sort_order: number,
  catalog_no: string,
  suruga_id: string,
  note: string,
  created_at: number,
  updated_at: number
}
```
