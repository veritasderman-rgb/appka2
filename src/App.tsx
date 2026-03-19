import { lazy, Suspense } from 'react';
import './index.css';
import { useBattleStore } from './store/battleStore';
import { ArmyBuilder } from './components/ArmyBuilder';

// Lazy load heavy components to reduce initial bundle
const SimulationResults = lazy(() =>
  import('./components/SimulationResults').then(m => ({ default: m.SimulationResults }))
);
const UnitEditor = lazy(() =>
  import('./components/UnitEditor').then(m => ({ default: m.UnitEditor }))
);
const HexMapView = lazy(() =>
  import('./components/HexMapView').then(m => ({ default: m.HexMapView }))
);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-parchment-dark text-sm">Načítám...</p>
      </div>
    </div>
  );
}

type NavItem = {
  key: 'builder' | 'units' | 'results' | 'hexmap';
  label: string;
  icon: string;
  available: boolean;
};

function App() {
  const { screen, setScreen, result, simulationHistory, setResult, hexResult } = useBattleStore();

  const navItems: NavItem[] = [
    { key: 'builder', label: 'Sestavení', icon: '⚔', available: true },
    { key: 'units',   label: 'Jednotky',  icon: '📋', available: true },
    { key: 'results', label: 'Výsledky',  icon: '📊', available: !!result },
    { key: 'hexmap',  label: 'Hex mapa',  icon: '⬡',  available: !!hexResult },
  ];

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 py-0 flex items-stretch justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 py-3">
            <div className="text-2xl leading-none select-none">⚔</div>
            <div>
              <h1 className="text-base font-bold text-gold leading-tight tracking-wide"
                  style={{ fontFamily: "'Georgia', serif" }}>
                ADD Battlesystem
              </h1>
              <p className="text-xs text-parchment-dark leading-tight">Simulátor velkých bitev</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-stretch gap-0.5">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => item.available && setScreen(item.key)}
                disabled={!item.available}
                className={`
                  relative flex items-center gap-1.5 px-3 md:px-4 py-3 text-sm font-medium
                  border-b-2 transition-colors duration-150
                  ${screen === item.key
                    ? 'border-gold text-gold'
                    : item.available
                      ? 'border-transparent text-parchment-dark hover:text-parchment hover:border-dark-border'
                      : 'border-transparent text-parchment-dark/30 cursor-not-allowed'}
                `}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {item.key === 'results' && result && screen !== 'results' && (
                  <span className="absolute top-2 right-1.5 w-1.5 h-1.5 bg-gold rounded-full" />
                )}
                {item.key === 'hexmap' && hexResult && screen !== 'hexmap' && (
                  <span className="absolute top-2 right-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-3 md:p-4 max-w-screen-2xl mx-auto w-full">
        <Suspense fallback={<LoadingFallback />}>
          {screen === 'builder' && <ArmyBuilder />}
          {screen === 'units' && <UnitEditor />}
          {screen === 'results' && result && (
            <SimulationResults
              result={result}
              history={simulationHistory}
              onSelectHistory={setResult}
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
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border px-4 py-2 text-center text-xs text-parchment-dark/50">
        ADD Battlesystem Simulator · Monte Carlo simulace bojových střetů
      </footer>
    </div>
  );
}

export default App;
