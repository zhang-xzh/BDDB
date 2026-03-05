import { customAlphabet } from "nanoid";
import {
  ensureInit,
  byHash,
  byId,
  fileIndex,
  volumesMap,
  writeTorrent,
  writeVolumes,
  removeTorrentFile,
} from "./store";
import type { Torrent, TorrentFile, Volume, TorrentRecord, StoredFile } from "./schema";

const generateId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);
const now = () => Math.floor(Date.now() / 1000);

function recordToTorrent(r: TorrentRecord): Torrent {
  return {
    id: r.id,
    qb_torrent: r.qb_torrent,
    is_deleted: r.is_deleted,
    synced_at: r.synced_at,
  };
}

function storedFileToTorrentFile(f: StoredFile, torrentId: string): TorrentFile {
  return {
    id: f.id,
    torrent_id: torrentId,
    qb_torrent_file: f.qb_torrent_file,
    is_deleted: f.is_deleted,
    synced_at: f.synced_at,
  };
}

// ============================================================================
// Torrent CRUD
// ============================================================================

export async function torrentExists(hash: string): Promise<boolean> {
  await ensureInit();
  const r = byHash.get(hash);
  return !!r && !r.is_deleted;
}

export async function addTorrent(data: Partial<Torrent>): Promise<void> {
  await ensureInit();
  const hash = (data.qb_torrent as any)?.hash;
  if (!hash) throw new Error("Torrent hash is required");

  const existing = byHash.get(hash);
  if (existing) {
    existing.qb_torrent = data.qb_torrent!;
    existing.is_deleted = data.is_deleted ?? existing.is_deleted;
    existing.synced_at = data.synced_at ?? now();
    await writeTorrent(existing);
  } else {
    const record: TorrentRecord = {
      id: generateId(),
      hash,
      added_on: (data.qb_torrent as any)?.added_on ?? now(),
      qb_torrent: data.qb_torrent!,
      is_deleted: data.is_deleted ?? false,
      synced_at: data.synced_at ?? now(),
      files: [],
    };
    byHash.set(hash, record);
    byId.set(record.id, record);
    await writeTorrent(record);
  }
}

export async function updateTorrentStatus(
  hash: string,
  data: Partial<Torrent>
): Promise<void> {
  await ensureInit();
  const r = byHash.get(hash);
  if (!r) return;
  if (data.is_deleted !== undefined) r.is_deleted = data.is_deleted;
  if (data.qb_torrent) r.qb_torrent = data.qb_torrent;
  r.synced_at = now();
  await writeTorrent(r);
}

export async function softDeleteTorrent(hash: string): Promise<void> {
  await ensureInit();
  const r = byHash.get(hash);
  if (!r) return;
  r.is_deleted = true;
  r.synced_at = now();
  await writeTorrent(r);
}

export async function getTorrent(hash: string): Promise<Torrent | null> {
  await ensureInit();
  const r = byHash.get(hash);
  return r ? recordToTorrent(r) : null;
}

export async function getTorrentById(id: string): Promise<Torrent | null> {
  await ensureInit();
  const r = byId.get(id);
  return r ? recordToTorrent(r) : null;
}

export async function getAllTorrents(includeDeleted = false): Promise<Torrent[]> {
  await ensureInit();
  const records = Array.from(byHash.values());
  const filtered = includeDeleted ? records : records.filter((r) => !r.is_deleted);
  filtered.sort((a, b) => b.added_on - a.added_on);
  return filtered.map(recordToTorrent);
}

export async function searchTorrents(keyword: string): Promise<Torrent[]> {
  await ensureInit();
  const kw = keyword.toLowerCase();
  return Array.from(byHash.values())
    .filter((r) => !r.is_deleted && r.qb_torrent.name?.toLowerCase().includes(kw))
    .sort((a, b) => b.added_on - a.added_on)
    .map(recordToTorrent);
}

export async function getTorrentsByState(state: string): Promise<Torrent[]> {
  await ensureInit();
  return Array.from(byHash.values())
    .filter((r) => !r.is_deleted && (r.qb_torrent as any).state === state)
    .sort((a, b) => b.added_on - a.added_on)
    .map(recordToTorrent);
}

export async function getTorrentsByCategory(category: string): Promise<Torrent[]> {
  await ensureInit();
  return Array.from(byHash.values())
    .filter((r) => !r.is_deleted && (r.qb_torrent as any).category === category)
    .sort((a, b) => b.added_on - a.added_on)
    .map(recordToTorrent);
}

// ============================================================================
// TorrentFile CRUD
// ============================================================================

export async function saveTorrentFiles(torrentId: string, files: any[]): Promise<void> {
  await ensureInit();
  const r = byId.get(torrentId);
  if (!r) return;

  // 清除旧文件索引
  for (const f of r.files) fileIndex.delete(f.id);

  const ts = now();
  r.files = files.map((f) => {
    const id = generateId();
    const stored: StoredFile = {
      id,
      qb_torrent_file: f.qb_torrent_file ?? f,
      is_deleted: false,
      synced_at: ts,
    };
    fileIndex.set(id, r.hash);
    return stored;
  });

  await writeTorrent(r);
}

export async function getTorrentFiles(torrentId: string): Promise<TorrentFile[]> {
  await ensureInit();
  const r = byId.get(torrentId);
  if (!r) return [];
  return r.files
    .filter((f) => !f.is_deleted)
    .map((f) => storedFileToTorrentFile(f, torrentId));
}

export async function getTorrentFilesAsFileItems(torrentId: string): Promise<any[]> {
  const files = await getTorrentFiles(torrentId);
  return files.map((f) => ({
    id: f.id,
    name: f.qb_torrent_file.name,
    size: f.qb_torrent_file.size,
    progress: (f.qb_torrent_file as any).progress || 0,
  }));
}

export async function getTorrentFile(fileId: string): Promise<TorrentFile | null> {
  await ensureInit();
  const hash = fileIndex.get(fileId);
  if (!hash) return null;
  const r = byHash.get(hash);
  if (!r) return null;
  const f = r.files.find((f) => f.id === fileId);
  if (!f) return null;
  return storedFileToTorrentFile(f, r.id);
}

export async function softDeleteTorrentFiles(torrentId: string): Promise<void> {
  await ensureInit();
  const r = byId.get(torrentId);
  if (!r) return;
  const ts = now();
  r.files = r.files.map((f) => ({ ...f, is_deleted: true, synced_at: ts }));
  await writeTorrent(r);
}

// ============================================================================
// Volume CRUD
// ============================================================================

export async function addVolume(data: Partial<Volume>): Promise<void> {
  await ensureInit();
  const v: Volume = {
    id: generateId(),
    torrent_id: data.torrent_id!,
    torrent_file_ids: data.torrent_file_ids ?? [],
    type: data.type,
    volume_no: data.volume_no ?? 0,
    catalog_no: data.catalog_no ?? "",
    volume_name: data.volume_name,
    media_type: data.media_type,
    is_deleted: false,
    updated_at: now(),
  };
  volumesMap.set(v.id, v);
  await writeVolumes();
}

export async function updateVolume(id: string, data: Partial<Volume>): Promise<void> {
  await ensureInit();
  const v = volumesMap.get(id);
  if (!v) return;
  Object.assign(v, data, { updated_at: now() });
  await writeVolumes();
}

export async function deleteVolume(id: string): Promise<void> {
  await ensureInit();
  volumesMap.delete(id);
  await writeVolumes();
}

export async function deleteVolumesByTorrent(torrentId: string): Promise<void> {
  await ensureInit();
  for (const [id, v] of volumesMap) {
    if (v.torrent_id === torrentId) volumesMap.delete(id);
  }
  await writeVolumes();
}

export async function getVolumesByTorrent(torrentId: string): Promise<Volume[]> {
  await ensureInit();
  return Array.from(volumesMap.values())
    .filter((v) => v.torrent_id === torrentId && !v.is_deleted)
    .sort((a, b) => a.volume_no - b.volume_no);
}

export async function getVolumesByFile(fileId: string): Promise<Volume[]> {
  await ensureInit();
  return Array.from(volumesMap.values())
    .filter((v) => !v.is_deleted && v.torrent_file_ids.includes(fileId))
    .sort((a, b) => a.volume_no - b.volume_no);
}

export async function getVolumeById(id: string): Promise<Volume | null> {
  await ensureInit();
  return volumesMap.get(id) ?? null;
}

export function getVolumeCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of volumesMap.values()) {
    if (!v.is_deleted) {
      counts.set(v.torrent_id, (counts.get(v.torrent_id) ?? 0) + 1);
    }
  }
  return counts;
}

export async function getAllVolumes(): Promise<Volume[]> {
  await ensureInit();
  return Array.from(volumesMap.values()).filter((v) => !v.is_deleted);
}

export async function getVolumesByType(type: "volume" | "box"): Promise<Volume[]> {
  await ensureInit();
  return Array.from(volumesMap.values())
    .filter((v) => v.type === type && !v.is_deleted)
    .sort((a, b) => a.volume_no - b.volume_no);
}

export async function saveVolume(
  torrentId: string,
  files: string[],
  data: Partial<Volume>
): Promise<void> {
  await ensureInit();
  const existing = Array.from(volumesMap.values()).find(
    (v) => v.torrent_id === torrentId && v.volume_no === data.volume_no && !v.is_deleted
  );
  if (existing) {
    existing.torrent_file_ids = files;
    existing.type = data.type;
    existing.catalog_no = data.catalog_no ?? "";
    existing.volume_name = data.volume_name;
    existing.media_type = data.media_type;
    existing.is_deleted = false;
    existing.updated_at = now();
  } else {
    const v: Volume = {
      id: generateId(),
      torrent_id: torrentId,
      torrent_file_ids: files,
      type: data.type,
      volume_no: data.volume_no ?? 0,
      catalog_no: data.catalog_no ?? "",
      volume_name: data.volume_name,
      media_type: data.media_type,
      is_deleted: false,
      updated_at: now(),
    };
    volumesMap.set(v.id, v);
  }
  await writeVolumes();
}

export function deleteStaleVolumes(torrentId: string, keepVolumeNos: number[]): void {
  const ts = now();
  for (const v of volumesMap.values()) {
    if (
      v.torrent_id === torrentId &&
      !v.is_deleted &&
      !keepVolumeNos.includes(v.volume_no)
    ) {
      v.is_deleted = true;
      v.updated_at = ts;
    }
  }
  writeVolumes(); // fire-and-forget
}

export async function clearAllData(): Promise<void> {
  await ensureInit();
  for (const hash of byHash.keys()) {
    await removeTorrentFile(hash);
  }
  byHash.clear();
  byId.clear();
  fileIndex.clear();
  volumesMap.clear();
  await writeVolumes();
}
