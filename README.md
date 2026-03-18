# Tapir Battle Simulator

Webová aplikace pro simulaci fantasy bitev postavená na **Vite + React 19 + TypeScript + Tailwind 4 + Zustand**.

Obsahuje dva hlavní bojové režimy sdílející centrální herní engine:
- **Monte Carlo simulace** — spustí N iterací bitvy a agreguje pravděpodobnosti vítězství, průměrné ztráty a statistiky
- **Hexová taktická mapa** — deterministická bitva s pohybem jednotek na mřížce 15 × 9 hexů a vizualizací po bojových kolech (BK)

---

## Spuštění lokálně

```bash
npm install
npm run dev        # vývojový server na http://localhost:5173/appka/
npm run build      # produkční build (výstup do dist/)
npm run lint       # kontrola ESLint
npm test           # unit testy (Vitest)
```

### Proměnné prostředí

| Proměnná | Výchozí | Popis |
|----------|---------|-------|
| `BASE_PATH` | `/appka/` | Base path aplikace při buildu |

---

## Architektura

```
src/
├── engine/           # Herní engine (čistý TypeScript, bez závislosti na UI)
│   ├── types.ts      # Rozhraní a konstanty (Unit, BattleConfig, SimulationResult…)
│   ├── dice.ts       # Hod kostkami: parseDice(), rollDamage(), avgDamage(), d20()
│   ├── combat.ts     # Jádro boje: simulateBK(), simulateRangedAttack(), simulateFlybyAttack()
│   ├── simulation.ts # Monte Carlo orchestrátor (N iterací, agregace statistik)
│   ├── hexBattle.ts  # Deterministická bitva na hexové mřížce (pohyb + střety)
│   ├── hexGrid.ts    # Hexové utility: hexCenter(), hexDistance(), moveToward()
│   ├── spellCombat.ts# Systém kouzel: castSpellInBK(), buffs, CC, debuffy
│   └── general.ts    # Generálské AI: assignAttackVectors() (silní na slabé)
├── store/
│   └── battleStore.ts# Zustand store (navigace, armády, konfigurace, výsledky)
├── components/       # React komponenty
│   ├── App.tsx       # Kořen aplikace (routing mezi obrazovkami)
│   ├── ArmyBuilder.tsx     # Sestavení armád, výběr jednotek
│   ├── BattleConfig.tsx    # Nastavení simulace (terén, čas, iterace…)
│   ├── SimulationResults.tsx# Výsledky Monte Carlo s grafy (Recharts)
│   ├── HexMapView.tsx      # Vizualizace hexové mapy, přehrávač BK
│   ├── BattleLog.tsx       # Detailní bojový log
│   ├── UnitEditor.tsx      # Editor vlastních jednotek
│   ├── SpellSelector.tsx   # Výběr kouzel pro magické jednotky
│   └── UnitCard.tsx / UnitPicker.tsx / ArmyPanel.tsx / SpellTimeline.tsx
└── data/
    ├── alliance_units.ts   # Databáze jednotek Aliance
    └── spells.ts           # Databáze kouzel (damage, buff, CC, debuff, heal)
```

---

## Datový model

### Jednotky (`Unit`)

| Pole | Typ | Popis |
|------|-----|-------|
| `type` | `UnitType` | Zkratka typu (LP, TP, LS, MG, LL, TL…) |
| `zu` / `ru` | `number` | Záchrana útoku / záchrana ruky (šance na přežití zranění) |
| `thac0` | `number` | To Hit Armor Class 0 (nižší = lepší útočník) |
| `ac` | `number` | Armor Class (nižší = lepší obrana) |
| `dmg` | `string` | Kostka poškození, formát `„2k8+8"` |
| `initiative` | `number` | Iniciativa (vyšší = útočí jako první) |
| `movement_priority` | `number` | Priorita pohybu (ovlivňuje matchup) |
| `movement_hexes` | `number` | Pohyb v hexech za BK |
| `fatigue` | `number` | Počáteční únava (klesá každý BK) |
| `morale` | `number` | Morálka (záchranný hod vs paniku) |
| `flying` | `boolean` | Letecká jednotka (imunní vůči pozemnímu melee) |
| `flyby` | `boolean` | Průletový útok (bez protiútoku) |

### Typy jednotek

| Zkratka | Název | Zkratka | Název |
|---------|-------|---------|-------|
| LP | Lehká pěchota | TP | Těžká pěchota |
| LS | Lehcí střelci | TS | Těžcí střelci |
| HR | Hraničáři | OS | Ostrostřelci |
| LJ | Lehká jízda | TJ | Těžká jízda |
| SJ | Střelecká jízda | LL | Lehká letka (letecká dálková) |
| TL | Těžká letka (průlet) | DR | Druidi |
| KN | Kněží | MG | Mágové |
| BM | Bitevní mágové | SP | Speciální |
| ZEN | Ženisté | FEL | Felčaři |
| VS | Válečné stroje | | |

### BattleConfig

| Pole | Výchozí | Popis |
|------|---------|-------|
| `iterations` | 100 | Počet Monte Carlo iterací |
| `maxBK` | 30 | Maximální délka bitvy v BK |
| `terrain` | `open` | Terén (`open`, `forest`, `hills`, `walls`, `ford`) |
| `timeOfDay` | `day` | Denní doba (`day`, `night`) |
| `largeBattle` | `false` | Postupné zapojování jednotek u velkých bitev |
| `commanderBonuses` | `true` | Zahrnout velitelské bonusy |
| `attackerSide` | `army_a` | Útočící strana (dostává THAC0 postih terénů) |

---

## Pravidla boje

Podrobný referenční dokument pravidel viz **[RULES.md](./RULES.md)**.

Stručně: boj probíhá v kolech (BK). Každé BK projde fázemi:
1. **Kouzla** — magické jednotky sesílají kouzla
2. **Letecká dálková střelba** (LL) — každý BK z výšky
3. **Průletové útoky** (TL, draci) — bez protiútoku, +50 % v BK 1
4. **Dálková střelba** (pozemní, pouze BK 1–2)
5. **Melee** — párování podle pohybové priority, simultánní útok a protiútok

---

## Rozšíření a vlastní jednotky

Vlastní jednotky lze vytvářet v editoru (záložka **Vlastní jednotky**) a jsou ukládány do `localStorage`. Formát musí odpovídat rozhraní `Unit` z `src/engine/types.ts`.

---

## Technický zásobník

| Oblast | Knihovna/Nástroj | Verze |
|--------|-----------------|-------|
| Frontend | React | 19 |
| State | Zustand | 5 |
| Styling | Tailwind CSS | 4 |
| Grafy | Recharts | 3 |
| Build | Vite | 7 |
| Typy | TypeScript | 5.9 |
| Testy | Vitest | — |
| Lint | ESLint + typescript-eslint | 9 / 8 |
