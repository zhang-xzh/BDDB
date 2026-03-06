import React from "react";
import { Card, Space, Input, Typography, Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { VolumeForm } from "@/lib/db/schema";

interface VolumeFormListProps {
  selectedVolumes: number[];
  volumeForms: Record<number, VolumeForm>;
  onVolumeFormChange: (vol: number, form: VolumeForm) => void;
  onDeleteVolume: (vol: number) => void;
  worksCount: number;
  /** 触发过提交后设为 true，显示验证错误 */
  submitted?: boolean;
}

const getVolumeForm = (
  volumeForms: Record<number, VolumeForm>,
  vol: number,
): VolumeForm => volumeForms[vol] || { catalog_no: "", volume_name: "" };

function VolumeRow({
  vol,
  label,
  volumeForms,
  onVolumeFormChange,
  onDeleteVolume,
  submitted,
}: {
  vol: number;
  label: string;
  volumeForms: Record<number, VolumeForm>;
  onVolumeFormChange: (vol: number, form: VolumeForm) => void;
  onDeleteVolume: (vol: number) => void;
  submitted?: boolean;
}) {
  const form = getVolumeForm(volumeForms, vol);
  const catalogNoError = submitted && !form.catalog_no.trim();
  const volumeNameError = submitted && !form.volume_name.trim();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontWeight: 500, minWidth: "60px" }}>{label}</span>
      <Input
        value={form.catalog_no}
        onChange={(e) =>
          onVolumeFormChange(vol, { ...form, catalog_no: e.target.value, type: "volume" })
        }
        placeholder="型番"
        style={{ width: "120px" }}
        status={catalogNoError ? "error" : undefined}
      />
      <Input
        value={form.volume_name}
        onChange={(e) =>
          onVolumeFormChange(vol, { ...form, volume_name: e.target.value, type: "volume" })
        }
        placeholder="标题"
        style={{ width: "700px" }}
        status={volumeNameError ? "error" : undefined}
      />
      <Button
        type="text"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={() => onDeleteVolume(vol)}
      />
    </div>
  );
}

export function VolumeFormList({
  selectedVolumes,
  volumeForms,
  onVolumeFormChange,
  onDeleteVolume,
  worksCount,
  submitted,
}: VolumeFormListProps) {
  if (selectedVolumes.length === 0) return null;

  // 渲染内容
  const renderContent = () => {
    if (worksCount === 1) {
      // 单作品场景：直接列出所有卷
      return (
        <Space style={{ width: "100%" }} size={12} orientation="vertical">
          {selectedVolumes.map((vol) => (
            <VolumeRow
              key={vol}
              vol={vol}
              label={`第${vol}卷`}
              volumeForms={volumeForms}
              onVolumeFormChange={onVolumeFormChange}
              onDeleteVolume={onDeleteVolume}
              submitted={submitted}
            />
          ))}
        </Space>
      );
    }

    // 多作品场景：按作品分组
    const groups: Record<number, number[]> = {};
    selectedVolumes.forEach((encoded) => {
      const workIdx = Math.floor(encoded / 1000);
      const volNo = encoded % 1000;
      if (!groups[workIdx]) groups[workIdx] = [];
      groups[workIdx].push(volNo);
    });

    return (
      <Space style={{ width: "100%" }} size={16} orientation="vertical">
        {Object.entries(groups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([workIdxStr, vols]) => {
            const workIdx = Number(workIdxStr);
            return (
              <div key={workIdx}>
                <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                  作品 {workIdx}
                </Typography.Text>
                <Space style={{ width: "100%", paddingLeft: 16 }} size={8} orientation="vertical">
                  {vols.sort((a, b) => a - b).map((volNo) => {
                    const encoded = workIdx * 1000 + volNo;
                    return (
                      <VolumeRow
                        key={encoded}
                        vol={encoded}
                        label={`第${volNo}卷`}
                        volumeForms={volumeForms}
                        onVolumeFormChange={onVolumeFormChange}
                        onDeleteVolume={onDeleteVolume}
                        submitted={submitted}
                      />
                    );
                  })}
                </Space>
              </div>
            );
          })}
      </Space>
    );
  };

  return (
    <Card size="small" title="卷信息" styles={{ body: { padding: "12px" } }}>
      {renderContent()}
    </Card>
  );
}
