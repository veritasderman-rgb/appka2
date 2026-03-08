# Plán: Letecké jednotky — bojová mechanika

## Současný stav

- LL (Lehká letka) a TL (Těžká letka) existují v datech, ale **chovají se identicky jako pěchota**
- Žádná logika pro: létání, nezasažitelnost pěchotou, průlet, déšť střel
- `special_abilities` pole existuje ale **nikde se nevyhodnocuje**
- `createMatchups()` páruje čistě podle `movement_priority` — pěchota může bojovat s letkami

## Pravidla k implementaci

### Kategorie leteckých jednotek:
1. **Střelecká letka (LL)** — "Déšť střel" — útočí z výšky střelbou, nikdy se nezapojí do melee
2. **Těžká letka (TL)** — "Nájezd/Průlet" — útočí průletem (1 útok), pak se stáhne zpět do vzduchu
3. **Magická letka** — sesílá kouzla z výšky (již funguje přes spell systém)

### Kdo může zasáhnout letku:
- **Střelci (LS, TS, HR, OS, SJ)** — ANO, ale s postihem (flying AC bonus)
- **Jiné letky** — ANO (vzdušný souboj)
- **Mágové/kněží** — ANO (kouzla dosáhnou)
- **Pěchota/jízda bez střelby** — NE (nemůže dosáhnout)

### Průlet (Flyby):
- TL zaútočí v melee (nájezd z výšky), ale **cíl nemůže kontrovat** (hit & run)
- Průlet se počítá jako 1 útok za BK, pak letka "odlétá"
- Při průletu je letka zranitelná — cíl může mít speciální protiútok pokud má "Zeď kopí" apod.

---

## Kroky implementace

### Krok 1: Rozšířit Unit interface o letecké vlastnosti
**Soubor:** `src/engine/types.ts`

```typescript
// Přidat do Unit interface:
flying?: boolean;             // jednotka létá
flyby?: boolean;              // útočí průletem (hit & run, žádný protiútok)
canTargetFlying?: boolean;    // může zasáhnout leteckou jednotku (střelci, letky, mágové)
flyingACBonus?: number;       // bonus k AC proti pozemním střelcům (default 2-3)
```

### Krok 2: Nastavit flying vlastnosti na jednotkách
**Soubor:** `src/data/alliance_units.ts` (+ enemy units pokud existují)

- LL: `flying: true, canTargetFlying: true, flyingACBonus: 3`
- TL: `flying: true, flyby: true, canTargetFlying: true, flyingACBonus: 2`
- LS/TS/HR/OS/SJ: `canTargetFlying: true`
- MG/BM/KN/DR: `canTargetFlying: true`
- Pěchota/jízda: `canTargetFlying: false` (výchozí)

### Krok 3: Implementovat "Déšť střel" pro LL
**Soubor:** `src/engine/combat.ts` + `src/engine/simulation.ts`

- LL se chová jako **permanentní střelec** — útočí střelbou KAŽDÉ BK (ne jen BK 1-2)
- LL nikdy nevstupuje do melee
- Přidat LL do ranged fáze pro všechna BK
- LL střílí na náhodného živého nepřítele (preferuje pozemní cíle)
- Cíl nemůže kontrovat (je ve vzduchu)

### Krok 4: Implementovat "Průlet/Nájezd" pro TL
**Soubor:** `src/engine/combat.ts` + `src/engine/simulation.ts`

- TL útočí melee (průletem) — seskok, úder, odlet
- **Cíl NEMÁ protiútok** (flyby = true → skip counterattack)
- TL útočí jednou za BK na vybraný cíl
- Bonus damage při prvním nájezdu (+50% damage BK 1, "Nájezd")
- TL si vybírá cíl s nejnižší morálkou nebo střelce (priority targeting)

### Krok 5: Upravit createMatchups() — letecký filtr
**Soubor:** `src/engine/simulation.ts`

- Flying jednotky se **nepárují** standardním matchup systémem
- Místo toho mají vlastní fázi:
  1. **Vzdušná fáze** (před ranged): letky vs letky pokud obě strany mají letky
  2. **Déšť střel fáze** (s ranged): LL útočí na pozemní cíle
  3. **Průlet fáze** (před melee): TL provádí nájezd na vybraný pozemní cíl
- Pozemní melee jednotky NEMOHOU být párovány s flying jednotkami

### Krok 6: Upravit resolveAttack() — flying AC bonus
**Soubor:** `src/engine/combat.ts`

- Pokud cíl je `flying: true` a útočník je pozemní střelec → cíl dostane AC bonus (`flyingACBonus`)
- Pokud útočník je také `flying: true` → žádný bonus (vzdušný souboj)
- Pokud útočník nemá `canTargetFlying` → útok automaticky selže

### Krok 7: Upravit morálku a únavu leteckých jednotek
**Soubor:** `src/engine/combat.ts`

- Letecké jednotky mají **pomalejší únavu** (jsou mimo dosah většiny nepřátel)
- Morálka letky klesá pomaleji (jen při vlastních ztrátách, ne při ztrátách spojenců)
- Výjimka: při vzdušném souboji normální únava

### Krok 8: UI — zobrazení leteckých fází v BattleLog
**Soubor:** `src/components/BattleLog.tsx`

- Přidat ikonu 🦅 pro letecké útoky
- Oddělená sekce "Letecké útoky" v BK (mezi kouzly a ranged)
- Zobrazit typ útoku: "Déšť střel", "Průlet/Nájezd"
- Indikátor "bez protiútoku" pro flyby

### Krok 9: UI — označení leteckých jednotek
**Soubor:** `src/components/UnitCard.tsx` + `src/components/SpellTimeline.tsx`

- Badge "🦅 Letecká" na UnitCard
- V battle logu označit letecké jednotky ikonou
- V timeline zobrazit "vzdušná nadvláda" pokud jedna strana ztratí letky

### Krok 10: Klíčové faktory — letecká analýza
**Soubor:** `src/engine/simulation.ts` (key_factors)

- "Spojenci mají vzdušnou převahu (2 letky vs 0)"
- "Nepřátelští střelci neutralizují leteckou výhodu"
- "TL průlety způsobily průměrně X zabitých za bitvu"

---

## Prioritní pořadí

| Priorita | Kroky | Dopad |
|----------|-------|-------|
| Vysoká | 1, 2, 5 | Základní flying mechanika — letky nelze zasáhnout pěchotou |
| Vysoká | 3, 4, 6 | Bojové schopnosti — Déšť střel, Průlet, AC bonus |
| Střední | 8, 9 | UI zobrazení leteckých fází |
| Nízší | 7, 10 | Únava, morálka, key factors |
