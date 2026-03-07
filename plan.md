# Plán: Dopracování ne-damage kouzel kouzelníků

## Analýza současného stavu

### Co funguje dobře:
- Damage kouzla škálují správně: `baseDmg × upcastMult × casterCount × classMult`
- Buff/CC infrastruktura existuje (ActiveBuff, ActiveCC, tickování)
- Multiplikátor MG=1×, BM=2×, SP=3× je implementovaný

### Co nefunguje / chybí:

1. **CC kouzla neškálují s počtem mágů** — `disableFraction` je fixní per spell (např. Hypnóza = 0.2 = 20%), nezáleží jestli ji sešle 1 mág nebo 100 mágů. Správně: více mágů → více ovlivněných osob → větší disable fraction.

2. **Buff kouzla neškálují** — buff se aplikuje plošně bez ohledu na počet mágů. Správně: 50 mágů posilní 50 osob (BM 100, SP 150), pokud má cílová jednotka 200 vojáků, buff platí jen na 50-75% z nich.

3. **Cílení na spojence chybí** — buffs a healy se aplikují vždy na sebe (sesílatele). Kněží by měli sesílat podpůrná kouzla na nejbližší spojeneckou jednotku (podle movement_priority), healy na nejvíce poničenou.

4. **Kněží nemají inteligentní výběr kouzel** — vybírají podle priority damage > cc > buff > heal, ale měli by preferovat buff/heal.

5. **Výsměch (Taunting)** — má `type: 'damage'` s `thac0Bonus`, ale ten bonus se nikdy neaplikuje jako debuff na cíl.

---

## Plán práce

### Krok 1: Škálování CC kouzel s počtem mágů
**Soubor:** `src/engine/spellCombat.ts`

Změna v `castSpellInBK`, case `'cc'`:
```
affectedPersons = casterCount × classMult
actualDisableFraction = (spell.disableFraction × affectedPersons) / targetCount
```
- Cap na 0.8 (max 80% disable, jako teď)
- Pokud mágů je víc než cíl, fraction = spell.disableFraction (plný efekt)
- Toto znamená: 100 MG s Hypnózou (0.2) → ovlivní 100 osob × 0.2 = efektivně 20 osob → pokud cíl má 200 vojáků → 10% disabled

### Krok 2: Škálování buff kouzel s počtem mágů
**Soubor:** `src/engine/spellCombat.ts` + `src/engine/combat.ts`

Přidat `buffFraction` do `ActiveBuff`:
```
affectedPersons = casterCount × classMult
buffFraction = min(1.0, affectedPersons / targetUnitCount)
```
- AC a THAC0 bonusy se aplikují proporcionálně: `acBonus × buffFraction`
- Pokud mágů je dost na celou jednotku → plný efekt (fraction = 1.0)

### Krok 3: Inteligentní cílení kouzel na spojence
**Soubor:** `src/engine/spellCombat.ts` + `src/engine/simulation.ts`

- Buff kouzla → cílí na nejbližší spojeneckou jednotku (podle movement_priority)
- Heal kouzla → cílí na spojeneckou jednotku s nejvyššími ztrátami (% ztracených)
- Předat `castSpellInBK` seznam spojeneckých jednotek pro výběr cíle

### Krok 4: Priorita kouzel podle třídy sesilatele
**Soubor:** `src/data/spells.ts`

Kněží (cleric/battleCleric) → priorita: buff > heal > cc > damage
Mágové (mage/battleMage) → priorita: damage > cc > buff > heal (jako teď)

### Krok 5: Oprava Výsměchu a hybridních kouzel
**Soubor:** `src/data/spells.ts` + `src/engine/spellCombat.ts`

- Přidat nový typ efektu `'debuff'` — damage + negativní efekt na cíl
- Výsměch: způsobí damage A zároveň aplikuje thac0 penaltu na cíl
- Implementovat debuff jako kombinaci damage + CC/penaltu

### Krok 6: Vylepšení logování kouzel
**Soubor:** `src/engine/spellCombat.ts` + `src/engine/types.ts`

- Rozšířit `BattleLogEntry` o pole pro spell efekty (buff/cc/heal info)
- Logovat komu byl buff/heal aplikován

---

## Pravidla (rekapitulace):
- MG ovlivní **1× svůj počet** osob
- BM ovlivní **2× svůj počet** osob
- SP ovlivní **3× svůj počet** osob
- 1 BK = 10 herních kol; kouzlo s kratší dobou trvání = min. 1 BK (už implementováno)
- Max disable = 80% jednotky
