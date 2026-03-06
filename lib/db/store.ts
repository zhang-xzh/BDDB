// 内存存储 + 文件持久化层
import fs from "fs/promises";
import path from "path";
import type { TorrentRecord, Volume } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
export const TORRENTS_DIR = path.join(DATA_DIR, "torrents");
export const VOLUMES_FILE = path.join(DATA_DIR, "volumes.json");

// 内存 Map
export const byHash = new Map<string, TorrentRecord>(); // hash → record
export const byId = new Map<string, TorrentRecord>(); // id → record
export const fileIndex = new Map<string, string>(); // fileId → torrentHash
export const volumesMap = new Map<string, Volume>(); // id → volume

// 懒初始化
let initPromise: Promise<void> | null = null;

export function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = _init();
  return initPromise;
}

async function _init(): Promise<void> {
  await fs.mkdir(TORRENTS_DIR, { recursive: true });

  // 并行加载所有 torrent 文件
  const files = await fs.readdir(TORRENTS_DIR).catch(() => [] as string[]);
  await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const content = await fs.readFile(
            path.join(TORRENTS_DIR, f),
            "utf-8",
          );
          const record: TorrentRecord = JSON.parse(content);
          byHash.set(record.hash, record);
          byId.set(record.id, record);
          for (const file of record.files ?? []) {
            fileIndex.set(file.id, record.hash);
          }
        } catch {
          // 跳过损坏文件
        }
      }),
  );

  // 加载 volumes
  try {
    const content = await fs.readFile(VOLUMES_FILE, "utf-8");
    const volumes: Volume[] = JSON.parse(content);
    for (const v of volumes) volumesMap.set(v.id, v);
  } catch {
    // 文件不存在时忽略
  }

  console.log(
    `Store loaded: ${byHash.size} torrents, ${volumesMap.size} volumes`,
  );
}

// 原子写：先写 .tmp 再 rename
export async function writeTorrent(record: TorrentRecord): Promise<void> {
  const filePath = path.join(TORRENTS_DIR, `${record.hash}.json`);
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(record));
  await fs.rename(tmpPath, filePath);
}

export async function writeVolumes(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const volumes = Array.from(volumesMap.values());
  const tmpPath = `${VOLUMES_FILE}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(volumes));
  await fs.rename(tmpPath, VOLUMES_FILE);
}

export async function removeTorrentFile(hash: string): Promise<void> {
  await fs.unlink(path.join(TORRENTS_DIR, `${hash}.json`)).catch(() => {});
}
