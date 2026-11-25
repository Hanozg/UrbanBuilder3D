import React from 'react';
import {
  X,
  Plus,
  Trash2,
  MapPin,
  Sparkles,
  ScrollText,
  User,
  Shirt,
  Palette,
  MessageSquareText,
  Coins,
  Award,
  Package,
  Check,
} from 'lucide-react';
import {
  NPC_OUTFIT_LABELS,
  NPC_QUEST_TYPE_LABELS,
  NpcGender,
  NpcOutfit,
  NpcQuestObjectiveType,
  NpcTemplate,
} from '../types/sandbox';

interface NpcEditorPanelProps {
  mode: 'create' | 'edit';
  template: NpcTemplate;
  isPlacingNpc: boolean;
  npcPosition?: [number, number, number];
  onChange: (next: NpcTemplate) => void;
  onStartPlace?: () => void;
  onClose: () => void;
}

const PRIMARY_SWATCHES = [
  '#b84a32',
  '#efe6d5',
  '#3d4c5c',
  '#2f6d82',
  '#7b5539',
  '#6d2e5c',
  '#366844',
  '#c48a34',
];

const SECONDARY_SWATCHES = [
  '#e8c47a',
  '#9f2f2b',
  '#c48f38',
  '#f0e4cf',
  '#d9ccb6',
  '#2c3645',
  '#4f7d6e',
  '#d87a4a',
];

const SKIN_SWATCHES = ['#f2cfb1', '#e6b895', '#d9a47c', '#c78c62', '#9b6743', '#6b442b'];
const HAIR_SWATCHES = ['#231c18', '#3a2216', '#6b4324', '#b88b4a', '#8c3b28', '#c9c4bc'];

const OUTFIT_KEYS: NpcOutfit[] = [
  'citizen',
  'merchant',
  'romanToga',
  'guard',
  'artisan',
  'noble',
];

const QUEST_TYPE_KEYS: NpcQuestObjectiveType[] = ['talk', 'visit', 'explore', 'drive'];

export const NpcEditorPanel: React.FC<NpcEditorPanelProps> = ({
  mode,
  template,
  isPlacingNpc,
  npcPosition,
  onChange,
  onStartPlace,
  onClose,
}) => {
  const updateField = <K extends keyof NpcTemplate>(key: K, value: NpcTemplate[K]) => {
    onChange({ ...template, [key]: value });
  };

  const updateQuest = <K extends keyof NpcTemplate['quest']>(
    key: K,
    value: NpcTemplate['quest'][K]
  ) => {
    onChange({
      ...template,
      quest: {
        ...template.quest,
        [key]: value,
      },
    });
  };

  const handleDialogueChange = (idx: number, val: string) => {
    const nextLines = [...template.dialogues];
    nextLines[idx] = val;
    updateField('dialogues', nextLines);
  };

  const handleAddDialogue = () => {
    updateField('dialogues', [...template.dialogues, 'Yeni replik satırını buraya yazın...']);
  };

  const handleRemoveDialogue = (idx: number) => {
    if (template.dialogues.length <= 1) return;
    updateField(
      'dialogues',
      template.dialogues.filter((_, i) => i !== idx)
    );
  };

  const handleGenderChange = (gender: NpcGender) => {
    updateField('gender', gender);
  };

  const handleQuestTypeChange = (objectiveType: NpcQuestObjectiveType) => {
    const defaultTarget =
      objectiveType === 'talk'
        ? 1
        : objectiveType === 'visit'
          ? 20
          : objectiveType === 'drive'
            ? 60
            : 35;

    onChange({
      ...template,
      quest: {
        ...template.quest,
        objectiveType,
        targetAmount: defaultTarget,
      },
    });
  };

  const visitX =
    template.quest.targetPosition?.[0] ??
    Math.round((npcPosition ? npcPosition[0] : 0) + 12);
  const visitZ =
    template.quest.targetPosition?.[1] ??
    Math.round((npcPosition ? npcPosition[2] : 0) - 10);

  return (
    <aside className="fixed top-[72px] bottom-16 right-5 z-30 flex w-[348px] flex-col rounded-xl border border-white/12 bg-[#0f1115]/95 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-[#f5efe6] truncate">
              {mode === 'create' ? 'Yeni NPC Özelleştir' : 'NPC Düzenle'}
            </span>
            {mode === 'edit' && (
              <span className="rounded bg-[#e59a3c]/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#f5bc6f]">
                CANLI
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[#9b958b]">
            {mode === 'create'
              ? 'Kıyafet, cinsiyet, replik ve görev ödülünü tasarla'
              : `${template.name || 'İsimsiz NPC'} · ${NPC_OUTFIT_LABELS[template.outfit]}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Paneli Kapat"
          className="rounded-lg p-1.5 text-[#9b958b] transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Editor Body */}
      <div className="palette-scroll flex-1 space-y-4 overflow-y-auto px-4 py-3.5">
        {/* Section 1: Kimlik */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d6d0c6]">
            <User className="h-3.5 w-3.5 text-[#e59a3c]" />
            Kimlik & Rol
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] text-[#9b958b]">NPC Adı</span>
              <input
                type="text"
                value={template.name}
                maxLength={32}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Örn: Usta Kerem"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-[#f5efe6] placeholder-[#767169] outline-none focus:border-[#e59a3c]/70"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] text-[#9b958b]">Unvan / Görevi</span>
              <input
                type="text"
                value={template.roleTitle}
                maxLength={36}
                onChange={(e) => updateField('roleTitle', e.target.value)}
                placeholder="Örn: Baharat Tüccarı"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-[#f5efe6] placeholder-[#767169] outline-none focus:border-[#e59a3c]/70"
              />
            </label>
          </div>

          {/* Cinsiyet */}
          <div className="space-y-1">
            <span className="text-[10px] text-[#9b958b]">Cinsiyet & Model Tipi</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'male', label: 'Erkek' },
                  { id: 'female', label: 'Kadın' },
                ] as { id: NpcGender; label: string }[]
              ).map((g) => {
                const active = template.gender === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGenderChange(g.id)}
                    className={`rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e59a3c] text-[#14110c]'
                        : 'bg-white/6 text-[#d8d2c7] hover:bg-white/12'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2: Kıyafet & Renkler */}
        <section className="space-y-2.5 border-t border-white/8 pt-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d6d0c6]">
            <Shirt className="h-3.5 w-3.5 text-[#e59a3c]" />
            Kıyafet Tarzı
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {OUTFIT_KEYS.map((key) => {
              const active = template.outfit === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateField('outfit', key)}
                  className={`truncate rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#e59a3c]/22 text-[#f7c57e] ring-1 ring-[#e59a3c]/55'
                      : 'bg-white/5 text-[#ccc5ba] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {NPC_OUTFIT_LABELS[key]}
                </button>
              );
            })}
          </div>

          {/* Renk Paleti */}
          <div className="space-y-2 rounded-lg bg-white/4 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#b8b1a6]">
              <Palette className="h-3 w-3 text-[#e59a3c]" />
              Renk Özelleştirme
            </div>

            <ColorSwatchRow
              label="Ana Kıyafet"
              value={template.primaryColor}
              swatches={PRIMARY_SWATCHES}
              onChange={(c) => updateField('primaryColor', c)}
            />
            <ColorSwatchRow
              label="İkincil / Aksesuar"
              value={template.secondaryColor}
              swatches={SECONDARY_SWATCHES}
              onChange={(c) => updateField('secondaryColor', c)}
            />
            <ColorSwatchRow
              label="Ten Rengi"
              value={template.skinTone}
              swatches={SKIN_SWATCHES}
              onChange={(c) => updateField('skinTone', c)}
            />
            <ColorSwatchRow
              label="Saç Rengi"
              value={template.hairColor}
              swatches={HAIR_SWATCHES}
              onChange={(c) => updateField('hairColor', c)}
            />
          </div>
        </section>

        {/* Section 3: Replikler */}
        <section className="space-y-2 border-t border-white/8 pt-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d6d0c6]">
              <MessageSquareText className="h-3.5 w-3.5 text-[#e59a3c]" />
              Replikler ({template.dialogues.length})
            </div>
            <button
              type="button"
              onClick={handleAddDialogue}
              className="flex items-center gap-1 rounded-md bg-white/8 px-2 py-1 text-[10px] font-medium text-[#f5efe6] transition-colors hover:bg-white/15 cursor-pointer"
            >
              <Plus className="h-3 w-3 text-[#e59a3c]" />
              Replik Ekle
            </button>
          </div>

          <div className="space-y-2">
            {template.dialogues.map((line, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#8e887f]">
                  <span>Replik #{index + 1}</span>
                  {template.dialogues.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDialogue(index)}
                      title="Repliği sil"
                      className="text-[#9b958b] hover:text-[#f48b7e] cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={line}
                  onChange={(e) => handleDialogueChange(index, e.target.value)}
                  placeholder="NPC konuşma cümlesini yaz..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs leading-relaxed text-[#f5efe6] placeholder-[#767169] outline-none focus:border-[#e59a3c]/70"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Görev & Ödüller */}
        <section className="space-y-2.5 border-t border-white/8 pt-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d6d0c6]">
              <ScrollText className="h-3.5 w-3.5 text-[#e59a3c]" />
              Görev & Ödül Sistemi
            </div>
            <button
              type="button"
              onClick={() => updateQuest('enabled', !template.quest.enabled)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                template.quest.enabled
                  ? 'bg-[#e59a3c] text-[#14110c]'
                  : 'bg-white/8 text-[#9b958b] hover:text-white'
              }`}
            >
              {template.quest.enabled ? 'Görev Aktif' : 'Görev Kapalı'}
            </button>
          </div>

          {template.quest.enabled && (
            <div className="space-y-2.5 rounded-lg border border-white/8 bg-white/3 p-2.5">
              <label className="block space-y-1">
                <span className="text-[10px] text-[#9b958b]">Görev Başlığı</span>
                <input
                  type="text"
                  value={template.quest.title}
                  onChange={(e) => updateQuest('title', e.target.value)}
                  placeholder="Örn: Antik Yazıt Keşfi"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-[#f5efe6] placeholder-[#767169] outline-none focus:border-[#e59a3c]/70"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] text-[#9b958b]">Görev Açıklaması</span>
                <textarea
                  rows={2}
                  value={template.quest.description}
                  onChange={(e) => updateQuest('description', e.target.value)}
                  placeholder="Oyuncunun bu görevde ne yapacağını yaz..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs leading-relaxed text-[#f5efe6] placeholder-[#767169] outline-none focus:border-[#e59a3c]/70"
                />
              </label>

              {/* Görev Türü */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#9b958b]">Görev Türü</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUEST_TYPE_KEYS.map((qt) => {
                    const active = template.quest.objectiveType === qt;
                    return (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => handleQuestTypeChange(qt)}
                        className={`rounded-lg px-2 py-1.5 text-left text-[10px] font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#e59a3c]/22 text-[#f7c57e] ring-1 ring-[#e59a3c]/55'
                            : 'bg-white/5 text-[#ccc5ba] hover:bg-white/10'
                        }`}
                      >
                        {NPC_QUEST_TYPE_LABELS[qt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Objective Specific Parameters */}
              {(template.quest.objectiveType === 'explore' ||
                template.quest.objectiveType === 'drive') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#b8b1a6]">
                    <span>
                      {template.quest.objectiveType === 'drive'
                        ? 'Hedef Sürüş Mesafesi'
                        : 'Hedef Yürüyüş Mesafesi'}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#f5bc6f]">
                      {template.quest.targetAmount} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={250}
                    step={5}
                    value={template.quest.targetAmount}
                    onChange={(e) => updateQuest('targetAmount', parseInt(e.target.value, 10))}
                    className="h-1.5 w-full accent-[#e59a3c] cursor-pointer"
                  />
                </div>
              )}

              {template.quest.objectiveType === 'visit' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[#b8b1a6]">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#e59a3c]" />
                      Altın İşaretçi Hedef Konumu (X / Z)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                      <span className="font-mono text-[10px] text-[#9b958b]">X</span>
                      <input
                        type="number"
                        min={-80}
                        max={80}
                        value={visitX}
                        onChange={(e) => {
                          const x = Number(e.target.value) || 0;
                          updateQuest('targetPosition', [x, visitZ]);
                        }}
                        className="w-full bg-transparent font-mono text-xs tabular-nums text-[#f5efe6] outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                      <span className="font-mono text-[10px] text-[#9b958b]">Z</span>
                      <input
                        type="number"
                        min={-80}
                        max={80}
                        value={visitZ}
                        onChange={(e) => {
                          const z = Number(e.target.value) || 0;
                          updateQuest('targetPosition', [visitX, z]);
                        }}
                        className="w-full bg-transparent font-mono text-xs tabular-nums text-[#f5efe6] outline-none"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Rewards */}
              <div className="space-y-2 border-t border-white/8 pt-2.5">
                <span className="text-[10px] font-medium text-[#d6d0c6]">Görev Ödülleri</span>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="flex items-center gap-1 text-[10px] text-[#9b958b]">
                      <Coins className="h-3 w-3 text-[#e59a3c]" />
                      Altın
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      step={10}
                      value={template.quest.rewardGold}
                      onChange={(e) =>
                        updateQuest('rewardGold', Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#f5efe6] outline-none focus:border-[#e59a3c]/70"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="flex items-center gap-1 text-[10px] text-[#9b958b]">
                      <Sparkles className="h-3 w-3 text-[#70c4ff]" />
                      Deneyim (XP)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      step={10}
                      value={template.quest.rewardXp}
                      onChange={(e) =>
                        updateQuest('rewardXp', Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#f5efe6] outline-none focus:border-[#e59a3c]/70"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="flex items-center gap-1 text-[10px] text-[#9b958b]">
                    <Package className="h-3 w-3 text-[#a7d87c]" />
                    Özel Ödül Eşyası
                  </span>
                  <input
                    type="text"
                    value={template.quest.rewardItem}
                    maxLength={40}
                    onChange={(e) => updateQuest('rewardItem', e.target.value)}
                    placeholder="Örn: Altın Roma Mührü (opsiyonel)"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-[#f5efe6] placeholder-[#767169] outline-none focus:border-[#e59a3c]/70"
                  />
                </label>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-white/8 bg-[#13161c] px-4 py-3">
        {mode === 'create' ? (
          <button
            type="button"
            onClick={onStartPlace}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e59a3c] px-3.5 py-2 text-xs font-semibold text-[#14110c] transition-colors hover:bg-[#f0aa50] cursor-pointer"
          >
            <Award className="h-4 w-4" />
            {isPlacingNpc ? 'Yerleştirme Aktif — Haritaya Tıkla' : 'Haritaya Yerleştir'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-[#f5efe6] transition-colors hover:bg-white/16 cursor-pointer"
          >
            <Check className="h-4 w-4 text-[#8fd97c]" />
            Değişiklikler Canlı Uygulandı · Kapat
          </button>
        )}
      </div>
    </aside>
  );
};

interface ColorSwatchRowProps {
  label: string;
  value: string;
  swatches: string[];
  onChange: (color: string) => void;
}

const ColorSwatchRow: React.FC<ColorSwatchRowProps> = ({
  label,
  value,
  swatches,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-[#9b958b] shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        {swatches.map((hex) => {
          const selected = value.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              title={hex}
              style={{ backgroundColor: hex }}
              className={`h-4 w-4 rounded-full border transition-transform cursor-pointer ${
                selected ? 'scale-110 border-white ring-1 ring-[#e59a3c]' : 'border-white/25 hover:scale-105'
              }`}
            />
          );
        })}
        <label
          title="Özel renk seç"
          className="relative ml-0.5 flex h-4 w-5 items-center justify-center overflow-hidden rounded border border-white/25 cursor-pointer"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
