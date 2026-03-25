import { useBattleStore } from '../store/battleStore';
import { allianceUnits, sampleEnemyUnits } from '../data/alliance_units';
import { enemyUnits } from '../data/enemy_units';
import { UnitPicker } from './UnitPicker';
import { ArmyPanel } from './ArmyPanel';
import { BattleConfigPanel } from './BattleConfig';
import { QuoteDisplay } from './QuoteDisplay';
import { useState } from 'react';

export function ArmyBuilder() {
  const {
    armyA, armyB,
    addToArmyA, addToArmyB,
    removeFromArmyA, removeFromArmyB,
    updateUnitCount, toggleSpell,
    clearArmyA, clearArmyB,
    customAllianceUnits, customEnemyUnits,
    config, setConfig,
    runBattle, isSimulating, simulationProgress,
    runHexBattleAction, isHexSimulating,
  } = useBattleStore();

  const [activeSide, setActiveSide] = useState<'alliance' | 'enemy'>('alliance');

  const canSimulate = armyA.length > 0 && armyB.length > 0 && !isSimulating && !isHexSimulating;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Citát z Faerunu */}
      <QuoteDisplay />

      {/* Config */}
      <BattleConfigPanel config={config} onChange={setConfig} />

      {/* Side selector (mobile) */}
      <div className="flex md:hidden gap-2">
        <button
          onClick={() => setActiveSide('alliance')}
          className={`flex-1 py-2 rounded text-sm font-bold border ${
            activeSide === 'alliance'
              ? 'bg-alliance/20 border-alliance text-alliance-light'
              : 'bg-dark-card border-dark-border text-parchment-dark'
          }`}
        >
          Spojenci ({armyA.length})
        </button>
        <button
          onClick={() => setActiveSide('enemy')}
          className={`flex-1 py-2 rounded text-sm font-bold border ${
            activeSide === 'enemy'
              ? 'bg-enemy/20 border-enemy text-enemy-light'
              : 'bg-dark-card border-dark-border text-parchment-dark'
          }`}
        >
          Nepřátelé ({armyB.length})
        </button>
      </div>

      {/* Main 4-column layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0">
        {/* Alliance picker */}
        <div className={`bg-dark-card border border-dark-border rounded-lg p-3 overflow-hidden flex flex-col ${
          activeSide !== 'alliance' ? 'hidden md:flex' : 'flex'
        }`}>
          <UnitPicker
            units={[...allianceUnits, ...customAllianceUnits]}
            onAdd={addToArmyA}
            title="Dostupní Spojenci"
            side="alliance"
          />
        </div>

        {/* Alliance army */}
        <div className={`overflow-hidden flex flex-col ${
          activeSide !== 'alliance' ? 'hidden md:flex' : 'flex'
        }`}>
          <ArmyPanel
            units={armyA}
            onRemove={removeFromArmyA}
            onCountChange={(instanceId, c) => updateUnitCount('alliance', instanceId, c)}
            onSpellToggle={(instanceId, spellId) => toggleSpell('alliance', instanceId, spellId)}
            onClear={clearArmyA}
            title="Armáda Spojenců"
            side="alliance"
            isAttacker={config.attackerSide === 'army_a'}
          />
        </div>

        {/* Enemy army */}
        <div className={`overflow-hidden flex flex-col ${
          activeSide !== 'enemy' ? 'hidden md:flex' : 'flex'
        }`}>
          <ArmyPanel
            units={armyB}
            onRemove={removeFromArmyB}
            onCountChange={(instanceId, c) => updateUnitCount('enemy', instanceId, c)}
            onSpellToggle={(instanceId, spellId) => toggleSpell('enemy', instanceId, spellId)}
            onClear={clearArmyB}
            title="Armáda Nepřátel"
            side="enemy"
            isAttacker={config.attackerSide === 'army_b'}
          />
        </div>

        {/* Enemy picker */}
        <div className={`bg-dark-card border border-dark-border rounded-lg p-3 overflow-hidden flex flex-col ${
          activeSide !== 'enemy' ? 'hidden md:flex' : 'flex'
        }`}>
          <UnitPicker
            units={[...enemyUnits, ...sampleEnemyUnits, ...customEnemyUnits]}
            onAdd={addToArmyB}
            title="Dostupní Nepřátelé"
            side="enemy"
          />
        </div>
      </div>

      {/* Run buttons */}
      <div className="flex justify-center gap-3 py-2 flex-wrap items-stretch">

        {/* Monte Carlo */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={runBattle}
            disabled={!canSimulate}
            className={`px-7 py-3 rounded-xl font-semibold text-base transition-all min-w-[180px] ${
              canSimulate
                ? 'bg-gold text-dark-bg hover:bg-gold-light shadow-lg shadow-gold/20 active:scale-95'
                : 'bg-dark-surface text-parchment-dark border border-dark-border cursor-not-allowed opacity-50'
            }`}
          >
            {isSimulating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                Simuluji… {simulationProgress}%
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg">📊</span> Monte Carlo
              </span>
            )}
          </button>
          <p className="text-xs text-parchment-dark/60">Statistická analýza</p>
        </div>

        {/* Separator */}
        <div className="flex items-center">
          <span className="text-parchment-dark/20 text-lg font-light select-none">|</span>
        </div>

        {/* Hex Battle */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={runHexBattleAction}
            disabled={!canSimulate}
            title="Spustí jednu bitvu na hexové mapě s generálem přidělujícím útočné vektory"
            className={`px-7 py-3 rounded-xl font-semibold text-base border transition-all min-w-[180px] ${
              canSimulate
                ? 'border-blue-500/60 text-blue-300 bg-blue-950/30 hover:bg-blue-900/40 hover:border-blue-400 active:scale-95'
                : 'bg-dark-surface text-parchment-dark border-dark-border cursor-not-allowed opacity-50'
            }`}
          >
            {isHexSimulating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Generuji mapu…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg">⬡</span> Hex Bitva
              </span>
            )}
          </button>
          <p className="text-xs text-parchment-dark/60">Krok po kroku na mapě</p>
        </div>

      </div>

      {!canSimulate && !isSimulating && (armyA.length === 0 || armyB.length === 0) && (
        <p className="text-center text-parchment-dark/60 text-sm -mt-2">
          Vyber alespoň jednu jednotku na každé straně
        </p>
      )}

    </div>
  );
}
