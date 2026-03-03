import { useBattleStore } from '../store/battleStore';
import { allianceUnits, sampleEnemyUnits } from '../data/alliance_units';
import { UnitPicker } from './UnitPicker';
import { ArmyPanel } from './ArmyPanel';
import { BattleConfigPanel } from './BattleConfig';
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
            units={[...sampleEnemyUnits, ...customEnemyUnits]}
            onAdd={addToArmyB}
            title="Dostupní Nepřátelé"
            side="enemy"
          />
        </div>
      </div>

      {/* Run buttons */}
      <div className="flex justify-center gap-3 py-2 flex-wrap">
        <button
          onClick={runBattle}
          disabled={!canSimulate}
          className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
            canSimulate
              ? 'bg-gold text-dark-bg hover:bg-gold-light shadow-lg shadow-gold/20'
              : 'bg-dark-surface text-parchment-dark border border-dark-border cursor-not-allowed'
          }`}
        >
          {isSimulating ? (
            <span className="flex items-center gap-2">
              Simuluji... {simulationProgress}%
              <span className="inline-block w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
            </span>
          ) : (
            'Spustit simulaci'
          )}
        </button>
        <button
          onClick={runHexBattleAction}
          disabled={!canSimulate}
          title="Spustí jednu bitvu na hexové mapě s generálem přidělujícím útočné vektory"
          className={`px-6 py-3 rounded-lg font-bold text-base border transition-all ${
            canSimulate
              ? 'border-blue-600 text-blue-300 hover:bg-blue-900/30 shadow-lg shadow-blue-900/20'
              : 'bg-dark-surface text-parchment-dark border-dark-border cursor-not-allowed'
          }`}
        >
          {isHexSimulating ? (
            <span className="flex items-center gap-2">
              Generuji mapu...
              <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </span>
          ) : (
            '⬡ Hex Bitva'
          )}
        </button>
      </div>

      {!canSimulate && !isSimulating && (armyA.length === 0 || armyB.length === 0) && (
        <p className="text-center text-parchment-dark text-sm -mt-2">
          Vyber alespoň jednu jednotku na každé straně
        </p>
      )}
    </div>
  );
}
