import React from "react";
import {Box, Card, CardContent, CardHeader, IconButton, RadioGroup, FormControlLabel, Radio, TextField, Typography} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {VolumeForm} from "@/lib/mongodb";

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
): VolumeForm => volumeForms[vol] || {catalog_no: "", volume_name: ""};

function VolumeRow({vol, label, volumeForms, onVolumeFormChange, onDeleteVolume, submitted}: {
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
    <Box sx={{display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap"}}>
      <RadioGroup row value={form.media_type ?? "BD"} onChange={e => onVolumeFormChange(vol, {...form, media_type: e.target.value as any})}>
        <FormControlLabel value="BD" control={<Radio size="small"/>} label="BD" sx={{'& .MuiFormControlLabel-label': {fontSize: 13}}}/>
        <FormControlLabel value="DVD" control={<Radio size="small"/>} label="DVD" sx={{'& .MuiFormControlLabel-label': {fontSize: 13}}}/>
      </RadioGroup>
      <RadioGroup row value={form.type ?? "volume"} onChange={e => onVolumeFormChange(vol, {...form, type: e.target.value as any})}>
        <FormControlLabel value="volume" control={<Radio size="small"/>} label="VOL" sx={{'& .MuiFormControlLabel-label': {fontSize: 13}}}/>
        <FormControlLabel value="box" control={<Radio size="small"/>} label="BOX" sx={{'& .MuiFormControlLabel-label': {fontSize: 13}}}/>
      </RadioGroup>
      <Typography variant="body2" fontWeight={500} sx={{minWidth: 60}}>{label}</Typography>
      <TextField
        size="small" value={form.catalog_no} placeholder="型番"
        onChange={e => onVolumeFormChange(vol, {...form, catalog_no: e.target.value})}
        error={catalogNoError} sx={{width: 120}}
      />
      <TextField
        size="small" value={form.volume_name} placeholder="标题"
        onChange={e => onVolumeFormChange(vol, {...form, volume_name: e.target.value})}
        error={volumeNameError} sx={{width: 700}}
      />
      <IconButton size="small" color="error" onClick={() => onDeleteVolume(vol)}>
        <DeleteOutlineIcon fontSize="small"/>
      </IconButton>
    </Box>
  );
}

export function VolumeFormList({selectedVolumes, volumeForms, onVolumeFormChange, onDeleteVolume, worksCount, submitted}: VolumeFormListProps) {
  if (selectedVolumes.length === 0) return null;

  if (worksCount === 1) {
    return (
      <Card variant="outlined">
        <CardHeader title="卷信息" titleTypographyProps={{variant: "body2", fontWeight: 600}} sx={{py: 1, px: 1.5}}/>
        <CardContent sx={{pt: 0, pb: '8px !important', px: 1.5, display: 'flex', flexDirection: 'column', gap: 1}}>
          {selectedVolumes.map(vol => (
            <VolumeRow key={vol} vol={vol} label={`第${vol}卷`} volumeForms={volumeForms} onVolumeFormChange={onVolumeFormChange} onDeleteVolume={onDeleteVolume} submitted={submitted}/>
          ))}
        </CardContent>
      </Card>
    );
  }

  const groups: Record<number, number[]> = {};
  selectedVolumes.forEach(encoded => {
    const workIdx = Math.floor(encoded / 1000);
    const volNo = encoded % 1000;
    if (!groups[workIdx]) groups[workIdx] = [];
    groups[workIdx].push(volNo);
  });

  return (
    <Card variant="outlined">
      <CardHeader title="卷信息" titleTypographyProps={{variant: "body2", fontWeight: 600}} sx={{py: 1, px: 1.5}}/>
      <CardContent sx={{pt: 0, pb: '8px !important', px: 1.5, display: 'flex', flexDirection: 'column', gap: 2}}>
        {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([workIdxStr, vols]) => {
          const workIdx = Number(workIdxStr);
          return (
            <Box key={workIdx}>
              <Typography variant="body2" fontWeight={700} sx={{mb: 1}}>作品 {workIdx}</Typography>
              <Box sx={{pl: 2, display: 'flex', flexDirection: 'column', gap: 1}}>
                {vols.sort((a, b) => a - b).map(volNo => {
                  const encoded = workIdx * 1000 + volNo;
                  return (
                    <VolumeRow key={encoded} vol={encoded} label={`第${volNo}卷`} volumeForms={volumeForms} onVolumeFormChange={onVolumeFormChange} onDeleteVolume={onDeleteVolume} submitted={submitted}/>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );
}


