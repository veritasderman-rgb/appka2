# Plán: Vylepšení UI kouzelného systému

## Analýza současného stavu

### Co chybí:
1. **BattleLog ignoruje `spellEffect`** — pole existuje, ale nikde se nezobrazuje. Kouzla jsou zamíchaná mezi melee/ranged útoky bez odlišení.
2. **Žádné statistiky kouzel ve výsledcích** — SimulationResults ukazuje krity, morálku, ale nic o kouzlech (celkový spell damage, počet healů, aplikované buffy/CC).
3. **SpellSelector neukazuje škálování** — uživatel nevidí kolik osob kouzlo ovlivní při daném počtu mágů.
4. **Žádná vizualizace aktivních buffů/CC** v přehledu stavu jednotek po BK.
5. **Chybí porovnání melee vs spell damage** — klíčová informace pro hodnocení užitečnosti mágů.

---

## Plán práce (6 kroků)

### Krok 1: Oddělená sekce kouzel v BattleLog
**Soubor:** `src/components/BattleLog.tsx`

- Přidat novou sekci "Kouzla" (🔮) mezi hlavičku BK a melee/ranged
- Spell eventy rozpoznat podle `spellEffect` pole nebo `[spell name]` v attacker
- Zobrazit:
  - Ikonu podle typu (🔥/💚/✨/🌀/💀)
  - Sesílatel → Cíl
  - Efekt: "28 damage, 4 zabiti" / "heal: +5 vojáků" / "buff: OČ -3 (75% pokrytí)" / "cc: 15% zneschopněno na 2 BK" / "debuff: ÚT +2 (50% pokrytí)"
- Barevně odlišit (fialový/zlatý border místo standardního)

### Krok 2: Aktivní efekty v přehledu stavu jednotek
**Soubor:** `src/components/BattleLog.tsx` + `src/engine/types.ts`

- Do `BKUnitState` přidat `activeBuffs` a `activeCCs` pole
- V simulation.ts naplnit data o aktivních efektech
- V UI zobrazit malé badge pod stavem jednotky:
  - ✨ Zbroj (OČ -3, 75%) — zlatý badge
  - 🌀 Hypnóza (20% disabled) — fialový badge
  - 💀 Výsměch (ÚT +2) — oranžový badge

### Krok 3: Spell statistiky ve výsledcích simulace
**Soubory:** `src/engine/types.ts` + `src/engine/simulation.ts` + `src/components/SimulationResults.tsx`

- Přidat do `UnitResult` nová pole:
  - `avg_spell_damage` — průměrný spell damage za bitvu
  - `avg_spell_kills` — průměrné zabití kouzly
  - `avg_spell_heals` — průměrný počet vyléčených vojáků
  - `avg_spells_cast` — průměrný počet seslaných kouzel
- Přidat novou tabulku "Magické statistiky" do SimulationResults:
  - Pouze pro magické jednotky (MG, BM, KN, DR)
  - Sloupce: Jednotka | Sesláno | Spell Dmg | Zabito | Vyléčeno
- Přidat souhrnný řádek "Porovnání: Melee vs Magie"

### Krok 4: Spell škálování preview ve SpellSelector
**Soubor:** `src/components/SpellSelector.tsx`

- Přidat tooltip/info o efektivitě na základě aktuálního počtu mágů:
  - "50 mágů → ovlivní 50 osob (MG ×1)"
  - "50 BM → ovlivní 100 osob (BM ×2)"
- U CC kouzel: "Hypnóza na 200 nepřátel → 5% disabled"
- U buff kouzel: "Zbroj na 200 spojenců → 25% pokrytí, OČ -0.75"
- Malý šedý text pod každým kouzlem

### Krok 5: Spell timeline vizualizace
**Soubor:** nová komponenta `src/components/SpellTimeline.tsx` + integrace do `BattleLog.tsx`

- Horizontální timeline ukazující:
  - Které buffy/CC jsou aktivní v kterém BK
  - Barevné pruhy (zlaté = buff, fialové = CC, oranžové = debuff)
  - Fade-out efekt když kouzlo expiruje
- Zobrazit pouze při iteracích = 1 (detailní log)

### Krok 6: Spell souhrn za celou bitvu
**Soubor:** `src/components/BattleLog.tsx` nebo nová komponenta

- Na konci battle logu přidat sekci "Souhrn magie":
  - Celkový spell damage vs melee damage (horizontální stacked bar)
  - Celkový počet vyléčených vojáků
  - Nejefektivnější kouzlo (nejvíce zabití/healing)
  - Celková doba aktivních buffů/CC (kolik BK měla která strana výhodu)
