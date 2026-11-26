import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SandboxEngine } from './engine/SandboxEngine';
import {
  ActiveTool,
  AppMode,
  EngineSnapshot,
  NPC_PRESET_TEMPLATES,
  NpcData,
  NpcRelationData,
  NpcRelationType,
  NpcTemplate,
  RoadStyle,
  TimeOfDay,
} from './types/sandbox';
import { TopBar } from './components/TopBar';
import { LeftPalette } from './components/LeftPalette';
import { BottomHud } from './components/BottomHud';
import { NpcEditorPanel } from './components/NpcEditorPanel';
import { PlayNpcOverlay } from './components/PlayNpcOverlay';
import { NpcRelationGraphModal } from './components/NpcRelationGraphModal';
import { MiniMap } from './components/MiniMap';

function cloneNpcTemplate(template: NpcTemplate): NpcTemplate {
  return {
    ...template,
    dialogues: [...template.dialogues],
    quest: {
      ...template.quest,
      targetPosition: template.quest.targetPosition
        ? [template.quest.targetPosition[0], template.quest.targetPosition[1]]
        : undefined,
    },
  };
}

function extractNpcTemplate(npc: NpcData): NpcTemplate {
  return cloneNpcTemplate({
    name: npc.name,
    roleTitle: npc.roleTitle,
    gender: npc.gender,
    outfit: npc.outfit,
    primaryColor: npc.primaryColor,
    secondaryColor: npc.secondaryColor,
    skinTone: npc.skinTone,
    hairColor: npc.hairColor,
    dialogues: npc.dialogues,
    quest: npc.quest,
  });
}

const INITIAL_SNAPSHOT: EngineSnapshot = {
  mode: 'editor',
  timeOfDay: 'golden',
  activeTool: { kind: 'place', objectType: 'apartment5' },
  placementRotationDeg: 0,
  placementScale: 1,
  placementRoadWidth: 8.2,
  isMovingSelected: false,
  selected: null,
  activeRoadPoints: 0,
  showGrid: true,
  objectCount: 0,
  roadCount: 0,
  vehicleCount: 0,
  npcCount: 0,
  npcsList: [],
  npcRelations: [],
  inVehicle: false,
  activeVehicleName: null,
  activeVehicleIsFlying: false,
  nearVehicle: false,
  nearVehicleName: null,
  nearVehicleIsFlying: false,
  nearNpc: null,
  quests: {},
  playerRewards: {
    gold: 0,
    xp: 0,
    items: [],
    completedCount: 0,
  },
  speedKmh: 0,
  altitudeM: 0,
  pointerLocked: false,
  audioMuted: false,
};

interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error';
}

type NpcEditorState =
  | null
  | { mode: 'create'; template: NpcTemplate }
  | { mode: 'edit'; npcId: string; template: NpcTemplate };

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SandboxEngine | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [npcEditor, setNpcEditor] = useState<NpcEditorState>(null);
  const [dialogueNpcId, setDialogueNpcId] = useState<string | null>(null);
  const [relationGraphOpen, setRelationGraphOpen] = useState(false);

  const showToast = useCallback((text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ id: Date.now(), text, tone });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const engine = new SandboxEngine(container, {
        onSnapshot: (next) => setSnapshot(next),
        onToast: (msg, tone) => showToast(msg, tone),
        onInteractNpc: (npc) => {
          setDialogueNpcId(npc.id);
        },
        onContextLost: () => {
          setWebglError('WebGL bağlamı kesildi. Sayfayı yenileyerek 3D motoru tekrar başlatabilirsiniz.');
        },
      });
      engineRef.current = engine;
    } catch {
      setWebglError('Tarayıcınızda WebGL başlatılamadı. Lütfen donanım ivmelendirmesini kontrol edin.');
    }

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [showToast]);

  // Keep UI modals cleanly synchronized with Editor/Play mode switches and deletions
  useEffect(() => {
    if (snapshot.mode === 'play') {
      setNpcEditor(null);
    } else {
      setDialogueNpcId(null);
    }
  }, [snapshot.mode]);

  useEffect(() => {
    if (npcEditor?.mode === 'edit') {
      const stillExists = snapshot.npcsList.some((n) => n.id === npcEditor.npcId);
      if (!stillExists) {
        setNpcEditor(null);
      }
    }
  }, [npcEditor, snapshot.npcsList]);

  const activeDialogueNpc = useMemo(() => {
    if (!dialogueNpcId) return null;
    return snapshot.npcsList.find((n) => n.id === dialogueNpcId) ?? null;
  }, [dialogueNpcId, snapshot.npcsList]);

  const editedNpcPosition = useMemo(() => {
    if (npcEditor?.mode !== 'edit') return undefined;
    return snapshot.npcsList.find((n) => n.id === npcEditor.npcId)?.position;
  }, [npcEditor, snapshot.npcsList]);

  const handleModeChange = useCallback((mode: AppMode) => {
    engineRef.current?.setMode(mode);
  }, []);

  const handleTimeOfDayChange = useCallback((tod: TimeOfDay) => {
    engineRef.current?.setTimeOfDay(tod);
  }, []);

  const handleToggleAudioMute = useCallback(() => {
    engineRef.current?.toggleAudioMute();
  }, []);

  const handleSelectTool = useCallback((tool: ActiveTool) => {
    engineRef.current?.setTool(tool);
  }, []);

  const handleRotate = useCallback((deltaDeg: number) => {
    engineRef.current?.rotatePlacement(deltaDeg);
  }, []);

  const handleScaleChange = useCallback((scale: number) => {
    engineRef.current?.setPlacementScale(scale);
  }, []);

  const handleToggleMoveSelected = useCallback(() => {
    engineRef.current?.startMovingSelected();
  }, []);

  const handleDeleteSelected = useCallback(() => {
    engineRef.current?.deleteSelected();
  }, []);

  const handleCommitRoad = useCallback(() => {
    engineRef.current?.commitActiveRoad();
  }, []);

  const handleUndoRoadPoint = useCallback(() => {
    engineRef.current?.undoLastRoadPoint();
  }, []);

  const handleCancelRoad = useCallback(() => {
    engineRef.current?.cancelRoadDraft();
  }, []);

  const handleRoadWidthChange = useCallback((width: number) => {
    engineRef.current?.setRoadWidth(width);
  }, []);

  const handleSelectedRoadStyleChange = useCallback((style: RoadStyle) => {
    engineRef.current?.setSelectedRoadStyle(style);
  }, []);

  const handleToggleGrid = useCallback(() => {
    engineRef.current?.toggleGrid();
  }, []);

  const handleClearMap = useCallback(() => {
    setNpcEditor(null);
    engineRef.current?.clearMap();
  }, []);

  const handleLoadDemo = useCallback(() => {
    setNpcEditor(null);
    engineRef.current?.loadDemoMap();
  }, []);

  // NPC Customization & Placement Callbacks
  const handleOpenCreateNpc = useCallback((preset?: NpcTemplate) => {
    const template = cloneNpcTemplate(preset ?? NPC_PRESET_TEMPLATES[0].template);
    setNpcEditor({ mode: 'create', template });
    engineRef.current?.startNpcPlacement(template);
  }, []);

  const handleQuickPlaceNpc = useCallback((preset: NpcTemplate) => {
    const template = cloneNpcTemplate(preset);
    setNpcEditor({ mode: 'create', template });
    engineRef.current?.startNpcPlacement(template);
  }, []);

  const handleSelectExistingNpc = useCallback(
    (npcId: string, openEditor = false) => {
      engineRef.current?.selectNpcById(npcId);
      if (openEditor) {
        const found = snapshot.npcsList.find((n) => n.id === npcId);
        if (found) {
          setNpcEditor({
            mode: 'edit',
            npcId: found.id,
            template: extractNpcTemplate(found),
          });
        }
      }
    },
    [snapshot.npcsList]
  );

  const handleOpenEditSelectedNpc = useCallback(() => {
    if (snapshot.selected?.kind !== 'npc' || !snapshot.selected.npcData) return;
    const npc = snapshot.selected.npcData;
    setNpcEditor({
      mode: 'edit',
      npcId: npc.id,
      template: extractNpcTemplate(npc),
    });
  }, [snapshot.selected]);

  const handleNpcEditorChange = useCallback(
    (nextTemplate: NpcTemplate) => {
      setNpcEditor((prev) => {
        if (!prev) return prev;
        if (prev.mode === 'create') {
          engineRef.current?.updateNpcDraftTemplate(nextTemplate);
          return { mode: 'create', template: nextTemplate };
        }
        engineRef.current?.updateNpcData(prev.npcId, nextTemplate);
        return { mode: 'edit', npcId: prev.npcId, template: nextTemplate };
      });
    },
    []
  );

  const handleStartNpcPlaceFromEditor = useCallback(() => {
    if (npcEditor?.mode !== 'create') return;
    engineRef.current?.startNpcPlacement(npcEditor.template);
    showToast('Haritada bir noktaya tıklayarak özel NPC’yi yerleştirin.', 'info');
  }, [npcEditor, showToast]);

  const handleTalkToNearNpc = useCallback(() => {
    engineRef.current?.interactWithNearNpc();
  }, []);

  const handleAcceptQuest = useCallback((npcId: string) => {
    engineRef.current?.acceptNpcQuest(npcId);
  }, []);

  const handleClaimReward = useCallback((npcId: string) => {
    engineRef.current?.claimNpcQuestReward(npcId);
  }, []);

  // NPC Relationship Graph Callbacks
  const handleAddNpcRelation = useCallback(
    (
      sourceId: string,
      targetId: string,
      type: NpcRelationType,
      label: string,
      strength: number
    ) => {
      if (!engineRef.current) return { ok: false, error: 'Motor hazır değil.' };
      return engineRef.current.addNpcRelation(sourceId, targetId, type, label, strength);
    },
    []
  );

  const handleUpdateNpcRelation = useCallback(
    (
      relationId: string,
      patch: Partial<Pick<NpcRelationData, 'type' | 'label' | 'strength'>>
    ) => {
      engineRef.current?.updateNpcRelation(relationId, patch);
    },
    []
  );

  const handleDeleteNpcRelation = useCallback((relationId: string) => {
    engineRef.current?.deleteNpcRelation(relationId);
  }, []);

  const handleAutoGenerateRelations = useCallback(() => {
    engineRef.current?.autoGenerateProximityRelations();
  }, []);

  const handleFocusNpcFromGraph = useCallback((npcId: string) => {
    engineRef.current?.focusCameraOnNpc(npcId);
  }, []);

  const handleGetMinimapState = useCallback(() => {
    return engineRef.current?.getMinimapState() ?? null;
  }, []);

  const handleMinimapNavigate = useCallback((x: number, z: number) => {
    engineRef.current?.navigateToWorldPoint(x, z);
  }, []);

  const handleMinimapFocusEntity = useCallback(
    (kind: 'npc' | 'vehicle' | 'object', id: string) => {
      engineRef.current?.focusEntityFromMinimap(kind, id);
    },
    []
  );

  const handleEditNpcFromGraph = useCallback(
    (npcId: string) => {
      engineRef.current?.focusCameraOnNpc(npcId);
      const found = snapshot.npcsList.find((n) => n.id === npcId);
      if (found) {
        setNpcEditor({
          mode: 'edit',
          npcId: found.id,
          template: extractNpcTemplate(found),
        });
      }
    },
    [snapshot.npcsList]
  );

  const handleExportJson = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const doc = engine.exportMap();
    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `agora-sehir-haritasi-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Harita JSON dosyası olarak indirildi.', 'success');
  }, [showToast]);

  const handleImportJsonFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const result = engineRef.current?.importMap(parsed);
          if (result?.ok) {
            setNpcEditor(null);
            showToast(`"${file.name}" haritası başarıyla yüklendi.`, 'success');
          } else {
            showToast(result?.error || 'Harita dosyası geçersiz.', 'error');
          }
        } catch {
          showToast('JSON dosyası okunamadı. Lütfen geçerli bir harita dosyası seçin.', 'error');
        }
      };
      reader.onerror = () => {
        showToast('Dosya okuma sırasında hata oluştu.', 'error');
      };
      reader.readAsText(file);
    },
    [showToast]
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0f1115]">
      {/* Dedicated Isolated WebGL Canvas Mount */}
      <div
        ref={mountRef}
        className={`h-full w-full ${
          snapshot.mode === 'play'
            ? 'cursor-grab active:cursor-grabbing'
            : snapshot.activeTool.kind === 'select'
              ? 'cursor-default'
              : 'cursor-crosshair'
        }`}
      />

      {/* Graceful WebGL Fallback */}
      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115] p-6">
          <div className="max-w-md rounded-xl border border-white/10 bg-[#171a21] p-6 text-center shadow-2xl">
            <h1 className="font-display text-lg font-semibold text-[#f5efe6]">
              3D Görünüm Başlatılamadı
            </h1>
            <p className="mt-2 text-sm text-[#b8b1a6]">{webglError}</p>
          </div>
        </div>
      )}

      {/* Semantic HUD Overlays */}
      <TopBar
        mode={snapshot.mode}
        timeOfDay={snapshot.timeOfDay}
        npcCount={snapshot.npcCount}
        relationCount={snapshot.npcRelations.length}
        audioMuted={snapshot.audioMuted}
        onModeChange={handleModeChange}
        onTimeOfDayChange={handleTimeOfDayChange}
        onToggleAudioMute={handleToggleAudioMute}
        onOpenRelationGraph={() => setRelationGraphOpen(true)}
        onExportJson={handleExportJson}
        onImportJsonFile={handleImportJsonFile}
        onLoadDemo={handleLoadDemo}
      />

      <LeftPalette
        snapshot={snapshot}
        onSelectTool={handleSelectTool}
        onRotate={handleRotate}
        onScaleChange={handleScaleChange}
        onRoadWidthChange={handleRoadWidthChange}
        onSelectedRoadStyleChange={handleSelectedRoadStyleChange}
        onToggleMoveSelected={handleToggleMoveSelected}
        onDeleteSelected={handleDeleteSelected}
        onCommitRoad={handleCommitRoad}
        onUndoRoadPoint={handleUndoRoadPoint}
        onCancelRoad={handleCancelRoad}
        onToggleGrid={handleToggleGrid}
        onClearMap={handleClearMap}
        onOpenCreateNpc={handleOpenCreateNpc}
        onQuickPlaceNpc={handleQuickPlaceNpc}
        onSelectExistingNpc={handleSelectExistingNpc}
        onOpenEditSelectedNpc={handleOpenEditSelectedNpc}
        onOpenRelationGraph={() => setRelationGraphOpen(true)}
      />

      {snapshot.mode === 'editor' && npcEditor && (
        <NpcEditorPanel
          mode={npcEditor.mode}
          template={npcEditor.template}
          isPlacingNpc={snapshot.activeTool.kind === 'npc'}
          npcPosition={editedNpcPosition}
          onChange={handleNpcEditorChange}
          onStartPlace={handleStartNpcPlaceFromEditor}
          onClose={() => setNpcEditor(null)}
        />
      )}

      {relationGraphOpen && (
        <NpcRelationGraphModal
          npcs={snapshot.npcsList}
          relations={snapshot.npcRelations}
          onClose={() => setRelationGraphOpen(false)}
          onAddRelation={handleAddNpcRelation}
          onUpdateRelation={handleUpdateNpcRelation}
          onDeleteRelation={handleDeleteNpcRelation}
          onAutoGenerateRelations={handleAutoGenerateRelations}
          onFocusNpc={handleFocusNpcFromGraph}
          onEditNpc={handleEditNpcFromGraph}
        />
      )}

      <PlayNpcOverlay
        snapshot={snapshot}
        activeNpc={activeDialogueNpc}
        onCloseDialogue={() => setDialogueNpcId(null)}
        onAcceptQuest={handleAcceptQuest}
        onClaimReward={handleClaimReward}
      />

      {!relationGraphOpen && (
        <MiniMap
          getMinimapState={handleGetMinimapState}
          onNavigatePoint={handleMinimapNavigate}
          onFocusEntity={handleMinimapFocusEntity}
          shiftLeftForRightPanel={snapshot.mode === 'editor' && npcEditor !== null}
        />
      )}

      <BottomHud snapshot={snapshot} onTalkToNearNpc={handleTalkToNearNpc} />

      {/* Subtle Transient Feedback Toast */}
      {toast && (
        <div className="pointer-events-none fixed top-20 left-1/2 z-40 -translate-x-1/2">
          <div
            className={`rounded-lg border px-4 py-2 text-xs font-medium shadow-xl ${
              toast.tone === 'error'
                ? 'border-[#dc5b4b]/50 bg-[#231414]/95 text-[#f7b1a8]'
                : toast.tone === 'success'
                  ? 'border-[#e59a3c]/50 bg-[#181510]/95 text-[#f8d7a8]'
                  : 'border-white/12 bg-[#0f1115]/94 text-[#ece6dc]'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </main>
  );
}

