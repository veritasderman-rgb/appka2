import './index.css';
import { useBattleStore } from './store/battleStore';
import { ArmyBuilder } from './components/ArmyBuilder';
import { SimulationResults } from './components/SimulationResults';
import { UnitEditor } from './components/UnitEditor';
import { HexMapView } from './components/HexMapView';

function App() {
  const { screen, setScreen, result, hexResult } = useBattleStore();

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gold tracking-wide">
              ADD Battlesystem
            </h1>
            <p className="text-xs text-parchment-dark">Simulátor velkých bitev</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setScreen('builder')}
              className={`px-3 py-1.5 rounded text-sm border transition-all ${
                screen === 'builder'
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'border-dark-border text-parchment-dark hover:text-parchment'
              }`}
            >
              Sestavení
            </button>
            <button
              onClick={() => setScreen('units')}
              className={`px-3 py-1.5 rounded text-sm border transition-all ${
                screen === 'units'
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'border-dark-border text-parchment-dark hover:text-parchment'
              }`}
            >
              Jednotky
            </button>
            <button
              onClick={() => result && setScreen('results')}
              disabled={!result}
              className={`px-3 py-1.5 rounded text-sm border transition-all ${
                screen === 'results'
                  ? 'bg-gold/10 border-gold text-gold'
                  : result
                    ? 'border-dark-border text-parchment-dark hover:text-parchment'
                    : 'border-dark-border/50 text-parchment-dark/30 cursor-not-allowed'
              }`}
            >
              Výsledky
            </button>
            <button
              onClick={() => hexResult && setScreen('hexmap')}
              disabled={!hexResult}
              className={`px-3 py-1.5 rounded text-sm border transition-all ${
                screen === 'hexmap'
                  ? 'bg-gold/10 border-gold text-gold'
                  : hexResult
                    ? 'border-dark-border text-parchment-dark hover:text-parchment'
                    : 'border-dark-border/50 text-parchment-dark/30 cursor-not-allowed'
              }`}
            >
              Hex Mapa
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">
        {screen === 'builder' && <ArmyBuilder />}
        {screen === 'units' && <UnitEditor />}
        {screen === 'results' && result && (
          <SimulationResults
            result={result}
            onBack={() => setScreen('builder')}
          />
        )}
        {screen === 'hexmap' && hexResult && (
          <HexMapView
            result={hexResult}
            armyALabel="Aliance"
            armyBLabel="Nepřátelé"
            onBack={() => setScreen('builder')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-dark-surface border-t border-dark-border px-4 py-2 text-center text-xs text-parchment-dark">
        ADD Battlesystem Simulator · Monte Carlo simulace bojových střetů
      </footer>
    </div>
  );
}

export default App;
