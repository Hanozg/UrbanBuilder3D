import React, { useRef } from 'react';
import { Download, Upload, Sun, Sunset, Moon, RotateCcw, Hammer, Play, Network } from 'lucide-react';
import { AppMode, TimeOfDay } from '../types/sandbox';

interface TopBarProps {
  mode: AppMode;
  timeOfDay: TimeOfDay;
  npcCount: number;
  relationCount: number;
  onModeChange: (mode: AppMode) => void;
  onTimeOfDayChange: (tod: TimeOfDay) => void;
  onOpenRelationGraph: () => void;
  onExportJson: () => void;
  onImportJsonFile: (file: File) => void;
  onLoadDemo: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  timeOfDay,
  npcCount,
  relationCount,
  onModeChange,
  onTimeOfDayChange,
  onOpenRelationGraph,
  onExportJson,
  onImportJsonFile,
  onLoadDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJsonFile(file);
    }
    e.target.value = '';
  };

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-20 flex items-center justify-between gap-4 px-5 py-3.5">
      {/* Top-Left: Wordmark + Mode Switcher */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f1115]/90 px-4 py-2 shadow-lg">
          <span className="font-display text-base font-semibold tracking-tight text-[#f5efe6] whitespace-nowrap">
            Agora Studio
          </span>
          <span className="h-4 w-px bg-white/12" aria-hidden="true" />
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => onModeChange('editor')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'editor'
                  ? 'bg-[#e59a3c] text-[#14110c]'
                  : 'text-[#c9c3b8] hover:text-white'
              }`}
            >
              <Hammer className="h-3.5 w-3.5" />
              İnşa Modu
            </button>
            <button
              type="button"
              onClick={() => onModeChange('play')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'play'
                  ? 'bg-[#e59a3c] text-[#14110c]'
                  : 'text-[#c9c3b8] hover:text-white'
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              Oynanış Modu
            </button>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-[#9b958b] whitespace-nowrap">
            TAB
          </span>
        </div>

        {/* NPC Relationship Graph Trigger */}
        <button
          type="button"
          onClick={onOpenRelationGraph}
          title="Haritadaki tüm NPC’lerin D3 ilişki ağını görüntüle ve düzenle"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f1115]/90 px-3.5 py-2.5 text-xs font-medium text-[#f0eae0] shadow-lg transition-colors hover:border-[#e59a3c]/45 hover:bg-[#171b22] whitespace-nowrap cursor-pointer"
        >
          <Network className="h-3.5 w-3.5 text-[#e59a3c]" />
          <span>İlişki Ağı</span>
          <span className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[#c7c1b7]">
            {npcCount} · {relationCount}
          </span>
        </button>
      </div>

      {/* Top-Right: Time of Day + JSON Download / Upload */}
      <div className="pointer-events-auto flex items-center gap-2.5">
        {/* Time-of-Day Switch */}
        <div
          className="hidden md:flex items-center gap-1 rounded-xl border border-white/10 bg-[#0f1115]/90 p-1 shadow-lg"
          role="group"
          aria-label="Günün Saati"
        >
          <button
            type="button"
            onClick={() => onTimeOfDayChange('golden')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              timeOfDay === 'golden'
                ? 'bg-[#e59a3c]/20 text-[#f7be72]'
                : 'text-[#b6b0a6] hover:text-white'
            }`}
          >
            <Sunset className="h-3.5 w-3.5" />
            Altın Saat
          </button>
          <button
            type="button"
            onClick={() => onTimeOfDayChange('noon')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              timeOfDay === 'noon'
                ? 'bg-sky-400/20 text-sky-200'
                : 'text-[#b6b0a6] hover:text-white'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            Öğlen
          </button>
          <button
            type="button"
            onClick={() => onTimeOfDayChange('night')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              timeOfDay === 'night'
                ? 'bg-indigo-400/25 text-indigo-200'
                : 'text-[#b6b0a6] hover:text-white'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            Gece
          </button>
        </div>

        {/* Map Persistence Controls */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0f1115]/90 p-1.5 shadow-lg">
          <button
            type="button"
            onClick={onExportJson}
            className="flex items-center gap-1.5 rounded-lg bg-[#e59a3c] px-3 py-1.5 text-xs font-semibold text-[#14110c] transition-colors hover:bg-[#f0aa50] whitespace-nowrap cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Haritayı İndir (JSON)
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-medium text-[#ede7dd] transition-colors hover:bg-white/14 whitespace-nowrap cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Harita Yükle (JSON)
          </button>

          <button
            type="button"
            onClick={onLoadDemo}
            title="Hazır Akdeniz & Antik Meydan sahnesini geri yükle"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#b6b0a6] transition-colors hover:bg-white/8 hover:text-white whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Örnek Sahne</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </header>
  );
};
