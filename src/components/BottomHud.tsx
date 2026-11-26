import React from 'react';
import { Car, Footprints, MessageCircle, Plane } from 'lucide-react';
import { EngineSnapshot } from '../types/sandbox';

interface BottomHudProps {
  snapshot: EngineSnapshot;
  onTalkToNearNpc?: () => void;
}

export const BottomHud: React.FC<BottomHudProps> = ({ snapshot, onTalkToNearNpc }) => {
  if (snapshot.mode === 'play') {
    return (
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
        {/* Contextual NPC Talk Prompt */}
        {snapshot.nearNpc && !snapshot.inVehicle && (
          <button
            type="button"
            onClick={onTalkToNearNpc}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[#8fd97c]/55 bg-[#0f1115]/94 px-4 py-2 text-xs font-medium text-[#d6f7cb] shadow-xl transition-colors hover:bg-[#172118] cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 text-[#8fd97c]" />
            <span>
              <strong className="font-mono text-[#8fd97c]">F</strong> — {snapshot.nearNpc.name} ile Konuş
            </span>
          </button>
        )}

        {/* Contextual Vehicle Enter Prompt */}
        {snapshot.nearVehicle && !snapshot.inVehicle && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-[#0f1115]/94 px-4 py-2 text-xs font-medium shadow-xl ${
              snapshot.nearVehicleIsFlying
                ? 'border-sky-400/55 text-sky-200'
                : 'border-[#e59a3c]/50 text-[#f8d7a8]'
            }`}
          >
            {snapshot.nearVehicleIsFlying ? (
              <Plane className="h-4 w-4 text-sky-400" />
            ) : (
              <Car className="h-4 w-4 text-[#e59a3c]" />
            )}
            <span>
              <strong
                className={`font-mono ${
                  snapshot.nearVehicleIsFlying ? 'text-sky-400' : 'text-[#e59a3c]'
                }`}
              >
                E
              </strong>{' '}
              — {snapshot.nearVehicleName || 'Araca'}{' '}
              {snapshot.nearVehicleIsFlying ? 'Bin & Havalan' : 'Bin'}
            </span>
          </div>
        )}

        {/* Speedometer, Altitude & Play Controls Strip */}
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#0f1115]/92 px-4 py-2.5 text-xs text-[#d6d0c6] shadow-xl">
          {snapshot.inVehicle ? (
            <>
              <div className="flex items-center gap-2 pr-3 border-r border-white/12 whitespace-nowrap">
                {snapshot.activeVehicleIsFlying ? (
                  <Plane className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                ) : (
                  <Car className="h-3.5 w-3.5 text-[#e59a3c] shrink-0" />
                )}
                <span className="font-medium text-[#f3efe8]">
                  {snapshot.activeVehicleName || 'Araç'}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 pr-3 border-r border-white/12">
                <span
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    snapshot.activeVehicleIsFlying ? 'text-sky-300' : 'text-[#e59a3c]'
                  }`}
                >
                  {String(snapshot.speedKmh).padStart(2, '0')}
                </span>
                <span className="font-mono text-[10px] text-[#9b958b]">km/s</span>
              </div>

              {snapshot.activeVehicleIsFlying && (
                <div className="flex items-baseline gap-1.5 pr-3 border-r border-white/12">
                  <span className="font-mono text-lg font-semibold tabular-nums text-[#f3efe8]">
                    {snapshot.altitudeM}
                  </span>
                  <span className="font-mono text-[10px] text-sky-300/90">m irtifa</span>
                </div>
              )}

              {snapshot.activeVehicleIsFlying ? (
                <div className="flex items-center gap-3 text-[11px] text-[#b8b1a6] whitespace-nowrap">
                  <span>
                    <strong className="font-mono text-[#f3efe8]">WASD</strong> Uçuş
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-sky-300">Space</strong> Yüksel
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-sky-300">Shift / C</strong> Alçal
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-[#f3efe8]">H</strong> Korna
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-[#f3efe8]">E</strong> İn
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-[#f3efe8]">TAB</strong> İnşa Modu
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-[11px] text-[#b8b1a6] whitespace-nowrap">
                  <span>
                    <strong className="font-mono text-[#f3efe8]">WASD</strong> Sürüş
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-[#f3efe8]">Space</strong> El Freni
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-[#f3efe8]">H</strong> Korna
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-[#f3efe8]">E</strong> Araçtan İn
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="font-mono text-[#f3efe8]">TAB</strong> İnşa Modu
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 pr-2 border-r border-white/12 text-[#f3efe8] font-medium whitespace-nowrap">
                <Footprints className="h-3.5 w-3.5 text-[#e59a3c]" />
                Yaya Keşfi
              </span>
              <div className="flex items-center gap-3 text-[11px] text-[#b8b1a6] whitespace-nowrap">
                <span>
                  <strong className="font-mono text-[#f3efe8]">WASD</strong> Hareket
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="font-mono text-[#f3efe8]">Shift</strong> Koş
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="font-mono text-[#f3efe8]">Space</strong> Zıpla
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="font-mono text-[#8fd97c]">F</strong> NPC Konuş
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="font-mono text-[#f3efe8]">TAB</strong> İnşa Modu
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Editor Mode compact single-line shortcut bar
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f1115]/88 px-4 py-2 text-[11px] text-[#b8b1a6] shadow-lg whitespace-nowrap">
        <span>
          <strong className="font-mono text-[#f3efe8]">WASD / Q-E</strong> Uçuş
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="font-mono text-[#f3efe8]">Sağ Tık</strong> Kamera Döndür
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="font-mono text-[#f3efe8]">R</strong> 15° Döndür
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="font-mono text-[#f3efe8]">Tekerlek</strong> Ölçek
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="font-mono text-[#e59a3c]">TAB</strong> Oynanış Modu
        </span>
      </div>
    </div>
  );
};
