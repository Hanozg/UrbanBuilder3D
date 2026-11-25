import React, { useEffect, useState } from 'react';
import {
  Coins,
  Sparkles,
  Package,
  ScrollText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  Car,
  Footprints,
  MessageCircle,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActiveQuestRuntime,
  EngineSnapshot,
  NPC_OUTFIT_LABELS,
  NPC_QUEST_TYPE_LABELS,
  NpcData,
  NpcQuestObjectiveType,
} from '../types/sandbox';

interface PlayNpcOverlayProps {
  snapshot: EngineSnapshot;
  activeNpc: NpcData | null;
  onCloseDialogue: () => void;
  onAcceptQuest: (npcId: string) => void;
  onClaimReward: (npcId: string) => void;
}

function getQuestIcon(type: NpcQuestObjectiveType) {
  switch (type) {
    case 'visit':
      return <Compass className="h-3.5 w-3.5 text-[#e59a3c]" />;
    case 'drive':
      return <Car className="h-3.5 w-3.5 text-[#e59a3c]" />;
    case 'explore':
      return <Footprints className="h-3.5 w-3.5 text-[#e59a3c]" />;
    default:
      return <MessageCircle className="h-3.5 w-3.5 text-[#e59a3c]" />;
  }
}

export const PlayNpcOverlay: React.FC<PlayNpcOverlayProps> = ({
  snapshot,
  activeNpc,
  onCloseDialogue,
  onAcceptQuest,
  onClaimReward,
}) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [bagOpen, setBagOpen] = useState(false);

  useEffect(() => {
    setLineIndex(0);
  }, [activeNpc?.id]);

  useEffect(() => {
    if (!activeNpc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseDialogue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeNpc, onCloseDialogue]);

  if (snapshot.mode !== 'play') return null;

  const questEntries = Object.values(snapshot.quests) as ActiveQuestRuntime[];
  const trackedQuests = questEntries.filter(
    (q) => q.status === 'active' || q.status === 'ready'
  );

  const activeQuestRuntime = activeNpc ? snapshot.quests[activeNpc.id] : undefined;
  const dialogueLines =
    activeNpc && activeNpc.dialogues.length > 0
      ? activeNpc.dialogues
      : ['Merhaba gezgin! Şehrimize hoş geldin.'];
  const safeLineIndex = Math.min(lineIndex, dialogueLines.length - 1);
  const currentLine = dialogueLines[safeLineIndex];

  return (
    <>
      {/* Top-Left Play Mode Rewards & Active Quests HUD */}
      <div className="fixed top-[72px] left-5 z-20 flex w-[274px] flex-col gap-2">
        {/* Player Wallet & Rewards Bar */}
        <div className="rounded-xl border border-white/10 bg-[#0f1115]/92 p-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-[#e59a3c]" />
                <span className="font-mono text-xs font-semibold tabular-nums text-[#f7d8a3]">
                  {snapshot.playerRewards.gold}
                </span>
                <span className="text-[10px] text-[#8e887f]">Altın</span>
              </div>

              <div className="h-3 w-px bg-white/10" />

              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#70c4ff]" />
                <span className="font-mono text-xs font-semibold tabular-nums text-[#cde9ff]">
                  {snapshot.playerRewards.xp}
                </span>
                <span className="text-[10px] text-[#8e887f]">XP</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBagOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded-md bg-white/6 px-2 py-1 text-[10px] font-medium text-[#d8d2c7] transition-colors hover:bg-white/12 cursor-pointer"
              title="Kazanılan ödül eşyalarını göster"
            >
              <Package className="h-3 w-3 text-[#9bd67c]" />
              <span className="font-mono tabular-nums">{snapshot.playerRewards.items.length}</span>
              {bagOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {bagOpen && (
            <div className="mt-2.5 border-t border-white/8 pt-2">
              <div className="mb-1 flex items-center justify-between text-[10px] text-[#9b958b]">
                <span>Kazanılan Eşyalar</span>
                <span className="font-mono tabular-nums">
                  {snapshot.playerRewards.completedCount} görev tamamlandı
                </span>
              </div>
              {snapshot.playerRewards.items.length === 0 ? (
                <p className="text-[11px] text-[#7c766d]">
                  Henüz ödül eşyası yok. NPC’lerle (F) konuşup görev alabilirsin.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.playerRewards.items.map((item, i) => (
                    <span
                      key={`${item}-${i}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#9bd67c]/30 bg-[#9bd67c]/12 px-2 py-0.5 text-[10px] font-medium text-[#caeeb6]"
                    >
                      <Award className="h-2.5 w-2.5" />
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active / Ready Quests Tracker */}
        {trackedQuests.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#0f1115]/92 p-3 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#e6dfd3]">
              <span className="flex items-center gap-1.5">
                <ScrollText className="h-3.5 w-3.5 text-[#e59a3c]" />
                Aktif Görevler
              </span>
              <span className="font-mono text-[10px] tabular-nums text-[#9b958b]">
                {trackedQuests.length}
              </span>
            </div>

            <div className="space-y-2">
              {trackedQuests.map((q) => {
                const isReady = q.status === 'ready';
                const pct =
                  q.quest.objectiveType === 'visit'
                    ? isReady
                      ? 100
                      : 15
                    : Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));

                return (
                  <div
                    key={q.npcId}
                    className={`rounded-lg border p-2 space-y-1.5 ${
                      isReady
                        ? 'border-[#8fd97c]/45 bg-[#8fd97c]/10'
                        : 'border-white/8 bg-white/4'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-[#f5efe6]">
                          {q.quest.title}
                        </div>
                        <div className="truncate text-[10px] text-[#9b958b]">
                          {q.npcName}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                          isReady
                            ? 'bg-[#8fd97c]/25 text-[#c7f5b9]'
                            : 'bg-[#e59a3c]/20 text-[#f5bc6f]'
                        }`}
                      >
                        {isReady ? 'HAZIR' : 'DEVAM'}
                      </span>
                    </div>

                    {isReady ? (
                      <p className="text-[10px] leading-snug text-[#c7f5b9]">
                        Ödülünü almak için {q.npcName} ile tekrar konuş (F).
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[10px] text-[#b8b1a6]">
                          <span className="flex items-center gap-1 truncate">
                            {getQuestIcon(q.quest.objectiveType)}
                            {q.quest.objectiveType === 'visit'
                              ? 'Altın ışık sütununa ulaş'
                              : q.quest.objectiveType === 'drive'
                                ? 'Araçla sürüş'
                                : 'Yaya keşif'}
                          </span>
                          {q.quest.objectiveType !== 'visit' && (
                            <span className="shrink-0 font-mono tabular-nums text-[#f5efe6]">
                              {Math.round(q.progress)}/{q.target} m
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#e59a3c] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Centered NPC Dialogue & Quest Modal */}
      {activeNpc && (
        <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
          <div className="w-full max-w-[540px] rounded-2xl border border-[#e59a3c]/40 bg-[#0f1115]/96 p-4 shadow-2xl">
            {/* NPC Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-sm font-bold text-white shadow-inner"
                  style={{ backgroundColor: activeNpc.primaryColor }}
                >
                  {(activeNpc.name.trim()[0] || 'N').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-[#f7f2e9] truncate">
                      {activeNpc.name}
                    </h2>
                    <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-[#c7c1b7]">
                      {NPC_OUTFIT_LABELS[activeNpc.outfit]}
                    </span>
                  </div>
                  <p className="text-xs text-[#e59a3c] truncate">
                    {activeNpc.roleTitle || 'Şehir Sakini'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseDialogue}
                title="Konuşmayı Kapat (Esc)"
                className="rounded-lg p-1.5 text-[#9b958b] transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dialogue Body */}
            <div className="mt-3 rounded-xl bg-white/5 px-4 py-3.5">
              <p className="text-sm leading-relaxed text-[#f5efe6]">
                &ldquo;{currentLine}&rdquo;
              </p>

              {dialogueLines.length > 1 && (
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5">
                  <span className="font-mono text-[11px] tabular-nums text-[#9b958b]">
                    Replik {safeLineIndex + 1} / {dialogueLines.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeLineIndex === 0}
                      onClick={() => setLineIndex((i) => Math.max(0, i - 1))}
                      className="flex items-center gap-1 rounded-md bg-white/8 px-2.5 py-1 text-[11px] font-medium text-[#e7e1d7] transition-colors hover:bg-white/14 disabled:opacity-35 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Önceki
                    </button>
                    <button
                      type="button"
                      disabled={safeLineIndex >= dialogueLines.length - 1}
                      onClick={() =>
                        setLineIndex((i) => Math.min(dialogueLines.length - 1, i + 1))
                      }
                      className="flex items-center gap-1 rounded-md bg-white/8 px-2.5 py-1 text-[11px] font-medium text-[#e7e1d7] transition-colors hover:bg-white/14 disabled:opacity-35 cursor-pointer"
                    >
                      Sonraki
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quest Block */}
            {activeNpc.quest.enabled && (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#151820] p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f5bc6f]">
                      {getQuestIcon(activeNpc.quest.objectiveType)}
                      <span className="truncate">{activeNpc.quest.title}</span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-[#c7c1b7]">
                      {activeNpc.quest.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-white/8 px-2 py-0.5 text-[10px] text-[#b8b1a6]">
                    {NPC_QUEST_TYPE_LABELS[activeNpc.quest.objectiveType]}
                  </span>
                </div>

                {/* Rewards Preview */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-[#8e887f]">Ödül:</span>
                  {activeNpc.quest.rewardGold > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#e59a3c]/16 px-2 py-0.5 font-mono text-[#f7d8a3]">
                      <Coins className="h-3 w-3 text-[#e59a3c]" />
                      +{activeNpc.quest.rewardGold} Altın
                    </span>
                  )}
                  {activeNpc.quest.rewardXp > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#70c4ff]/15 px-2 py-0.5 font-mono text-[#cde9ff]">
                      <Sparkles className="h-3 w-3 text-[#70c4ff]" />
                      +{activeNpc.quest.rewardXp} XP
                    </span>
                  )}
                  {activeNpc.quest.rewardItem.trim() && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#8fd97c]/15 px-2 py-0.5 text-[#caeeb6]">
                      <Package className="h-3 w-3 text-[#8fd97c]" />
                      {activeNpc.quest.rewardItem.trim()}
                    </span>
                  )}
                </div>

                {/* Quest Action Area */}
                <div className="pt-1">
                  {!activeQuestRuntime || activeQuestRuntime.status === 'available' ? (
                    <button
                      type="button"
                      onClick={() => onAcceptQuest(activeNpc.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e59a3c] px-4 py-2 text-xs font-semibold text-[#14110c] transition-colors hover:bg-[#f0aa50] cursor-pointer"
                    >
                      <ScrollText className="h-4 w-4" />
                      Görevi Kabul Et
                    </button>
                  ) : activeQuestRuntime.status === 'active' ? (
                    <div className="space-y-1.5 rounded-lg bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between text-[11px] text-[#d8d2c7]">
                        <span>Görev devam ediyor</span>
                        {activeNpc.quest.objectiveType !== 'visit' ? (
                          <span className="font-mono tabular-nums text-[#f5bc6f]">
                            {Math.round(activeQuestRuntime.progress)} / {activeQuestRuntime.target} m
                          </span>
                        ) : (
                          <span className="text-[#f5bc6f]">Altın işaretçiye git</span>
                        )}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#e59a3c]"
                          style={{
                            width: `${
                              activeNpc.quest.objectiveType === 'visit'
                                ? 18
                                : Math.min(
                                    100,
                                    Math.round(
                                      (activeQuestRuntime.progress /
                                        Math.max(1, activeQuestRuntime.target)) *
                                        100
                                    )
                                  )
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : activeQuestRuntime.status === 'ready' ? (
                    <button
                      type="button"
                      onClick={() => onClaimReward(activeNpc.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#78c864] px-4 py-2 text-xs font-semibold text-[#10190d] transition-colors hover:bg-[#8cd678] cursor-pointer"
                    >
                      <Award className="h-4 w-4" />
                      Ödülü Al & Görevi Tamamla
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-[#8fd97c]/30 bg-[#8fd97c]/12 px-3 py-2 text-xs font-medium text-[#c7f5b9]">
                      <CheckCircle2 className="h-4 w-4" />
                      Bu görev tamamlandı ve ödülü alındı.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
