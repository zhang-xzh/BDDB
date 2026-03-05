import React from "react";
import { Card, Space, Input, Radio } from "antd";
import type { VolumeForm } from "@/lib/db/schema";

interface VolumeFormListProps {
  selectedVolumes: number[];
  volumeForms: Record<number, VolumeForm>;
  onVolumeFormChange: (vol: number, form: VolumeForm) => void;
}

export function VolumeFormList({
  selectedVolumes,
  volumeForms,
  onVolumeFormChange,
}: VolumeFormListProps) {
  if (selectedVolumes.length === 0) return null;

  const getVolumeForm = (vol: number): VolumeForm => {
    return volumeForms[vol] || { catalog_no: "", volume_name: "" };
  };

  return (
    <Card size="small" title="卷信息" styles={{ body: { padding: "12px" } }}>
      <Space style={{ width: "100%" }} size={12} orientation="vertical">
        {selectedVolumes.map((vol) => {
          const form = getVolumeForm(vol);
          return (
            <div
              key={vol}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <Radio.Group
                defaultValue="volume"
                size="small"
                value={form.type}
                onChange={(e) =>
                  onVolumeFormChange(vol, { ...form, type: e.target.value })
                }
                buttonStyle="solid"
              >
                <Radio.Button value="volume">分卷</Radio.Button>
                <Radio.Button value="box">BOX</Radio.Button>
              </Radio.Group>
              <Radio.Group
                defaultValue="BD"
                size="small"
                value={form.media_type}
                onChange={(e) =>
                  onVolumeFormChange(vol, {
                    ...form,
                    media_type: e.target.value,
                  })
                }
                buttonStyle="solid"
              >
                <Radio.Button value="BD">BD</Radio.Button>
                <Radio.Button value="DVD">DVD</Radio.Button>
              </Radio.Group>
              <span style={{ fontWeight: 500, minWidth: "60px" }}>
                第{vol}卷
              </span>
              <Input
                value={form.catalog_no}
                onChange={(e) =>
                  onVolumeFormChange(vol, {
                    ...form,
                    catalog_no: e.target.value,
                  })
                }
                placeholder="型番"
                style={{ width: "120px" }}
              />
              <Input
                value={form.volume_name}
                onChange={(e) =>
                  onVolumeFormChange(vol, {
                    ...form,
                    volume_name: e.target.value,
                  })
                }
                placeholder="标题"
                style={{ width: "700px" }}
              />
            </div>
          );
        })}
      </Space>
    </Card>
  );
}
