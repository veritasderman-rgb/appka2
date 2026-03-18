# Pravidla simulace — referenční dokument

Tento dokument popisuje přesná pravidla, podle nichž probíhá simulace bitvy v Tapir Battle Simulatoru. Slouží jako **jediný zdroj pravdy** při porovnávání Monte Carlo a hexového režimu.

> **Pravidlo č. 1:** Žádná změna pravidel boje nesmí být implementována bez existujícího testu, který dané pravidlo pokrývá.

---

## 1. Struktura bojového kola (BK)

Jeden BK (bojové kolo) odpovídá přibližně 10 minutám boje. Fáze v **Monte Carlo** režimu:

| Pořadí | Fáze | Podmínky |
|--------|------|----------|
| 1 | **Kouzelná fáze** | Pouze magické jednotky (MG, BM, KN, DR) s dostupnými sloty |
| 2 | **Letecká dálková střelba** (LL) | Každý BK; LL jednotky střílí na pozemní cíle z výšky |
| 3 | **Průletové útoky** (TL, draci s `flyby=true`) | Každý BK; bez protiútoku; +50 % poškození v BK 1 |
| 4 | **Pozemní dálková střelba** | Pouze BK 1 a BK 2; platí pro LS, TS, HR, OS, SJ |
| 5 | **Melee** | Párování podle `movement_priority`; obě strany útočí (s iniciativou) |
| 6 | **Tick buffů/CC** | Odpočet zbývající délky aktivních efektů |

**Hexový režim** aktuálně implementuje pouze fáze: přiřazení vektorů → pohyb → melee (fáze 5).
Kouzla, dálková střelba a letecké útoky v hexovém režimu **nejsou** implementovány (viz Task 17–19).

---

## 2. Iniciativa

```
iniciativa_strany = hod(k20) + unit.initiative + noční_postih
```

- Noční postih: `−2` k iniciativě v noci
- Strana s vyšší iniciativou útočí **první**
- Při remíze útočí `attacker` (army_a nebo army_b dle `config.attackerSide`)
- **Nejprve se aplikují ztráty na bránící se stranu**, pak bránící strana útočí se sníženým počtem

---

## 3. Útočný hod (melee i dálkový)

```
potřebný_hod = THAC0_útočníka − AC_bránícího
hit = hod(k20) >= potřebný_hod
```

**Kritický zásah (k20 = 20):**
```
násobitel = hod(k4)   // pokud = 1, násobitel = 8
poškození = rollDamage(dmg) × násobitel × effectiveCount
```

**Kritický minutí (k20 = 1):** automatický minutí, bez poškození.

### Modifikátory THAC0 útočníka

| Zdroj | Efekt |
|-------|-------|
| Únava: `tired` | +2 THAC0 (horší) |
| Únava: `exhausted` | +5 THAC0 |
| Únava: `collapsed` | +10 THAC0 |
| Terén (útočník) | viz sekce 6 |
| Noc (dálkové jednotky) | +2 THAC0 |
| Spell debuff | ±hodnota |
| Commander bonus | `−floor(starTotal / 3)` |

### Modifikátory AC bránícího

| Zdroj | Efekt |
|-------|-------|
| Terén (obránce) | viz sekce 6 |
| Letecký AC bonus | `flyingACBonus` pokud letí a útočník nelétá |
| Spell buff | ±hodnota |

---

## 4. Efektivní počet vojáků (gradual engagement)

| BK | Standardní | `largeBattle=true` (max_count > 10 000) |
|----|-----------|----------------------------------------|
| 1 | max 100 | max 100 |
| 2 | max 50 % `max_count` | max 25 % `max_count` |
| 3 | plný počet | max 50 % `max_count` |
| 4 | plný počet | max 75 % `max_count` |
| 5+ | plný počet | plný počet |

---

## 5. Morálka

Morálka se kontroluje po melee fázi každého BK, pokud platí **alespoň jedna** podmínka:

| Podmínka | Prah |
|----------|------|
| Kumulativní ztráty | > 25 % `max_count` |
| Ztráty v tomto BK | > 10 % `max_count` |

**Hod morálky:**
```
hod(k20) <= unit.morale − fatigue_penalty  → OBSTÁNO
hod(k20) > unit.morale − fatigue_penalty   → SELHÁNÍ
```

Jednotka je **poražena** po **2 selháních morálky** (nebo 0 vojáků, nebo únava `collapsed`).

---

## 6. Únava

Každý BK: `fatigue_remaining` klesá o 1 (letecké jednotky s 50% pravděpodobností — létají a odpočívají).

| Stav | Podmínka | THAC0 postih | Dmg postih |
|------|----------|-------------|-----------|
| `fresh` | `fatigue_remaining > 0` | 0 | 0 |
| `tired` | přes limit, do ½ původní fatigue | +2 | −2 × effectiveCount |
| `exhausted` | ½ až ⅔ původní fatigue | +5 | −5 × effectiveCount |
| `collapsed` | nad ⅔ původní fatigue | +10 | jednotka je poražena |

---

## 7. Terén

| Terén | AC bonus pro obránce | THAC0 postih pro útočníka | Popis |
|-------|---------------------|--------------------------|-------|
| `open` | 0 | 0 | Otevřené pole |
| `forest` | +2 | +1 | Les |
| `hills` | +1 | 0 | Kopce |
| `walls` | +4 | +2 | Hradby |
| `ford` | 0 | +2 | Brod |

> Terénní postihy se aplikují **pouze na útočníka** dle `config.attackerSide`.

---

## 8. Denní doba

| Čas | Efekt |
|-----|-------|
| `day` | žádný postih |
| `night` | −2 iniciativa pro obě strany; +2 THAC0 pro dálkové jednotky (LS, TS, HR, OS, SJ) |

---

## 9. Párovnání (matchup) — melee fáze

1. Obě armády seřazeny vzestupně podle `movement_priority`
2. Každá jednotka A se spáruje s **nejbližší** (dle priority) dostupnou jednotkou B
3. Zbývající jednotky B (bez páru) se spárují s nejsilnější dostupnou jednotkou A
4. **Letecká omezení:**
   - Pozemní jednotka bez `canTargetFlying` nemůže vstoupit do melee s leteckou jednotkou
   - Letecká jednotka bez `canTargetFlying` nemůže vstoupit do melee s jinou leteckou

---

## 10. Letecké jednotky

### LL (Lehká letka) — aerial ranged
- Útočí dálkovou střelbou **každý BK** (bez omezení BK 1–2)
- Útočí z výšky → letecký AC bonus (`flyingACBonus`) se aplikuje
- Mohou být napadeny: střelci, kouzly, jinými letci

### TL a draci (flyby) — průletový útok
- Každý BK provedou melee útok **bez protiútoku** bránícího
- **BK 1 (nájezdní bonus):** +50 % poškození
- Postih únavy na poškození: `−fatiguePenalty × effectiveCount`
- Kritické hody fungují stejně jako v melee

### Kdo může napadat letecké jednotky
- Ranged typy: LS, TS, HR, OS, SJ
- Magické typy: MG, BM, KN, DR
- Letecké jednotky: LL, TL
- Jednotky s `canTargetFlying = true`

---

## 11. Velitelské bonusy (commanderBonuses = true)

| Bonus | Vzorec |
|-------|--------|
| Iniciativa | `+floor(level / 5)` |
| THAC0 | `−floor(součet_hvězd / 3)` (záporné = lepší útok) |

Aplikují se při vytvoření `CombatUnit` ze `Unit`.

---

## 12. Kouzelný systém

### Typy kouzlů
| Typ | Efekt |
|-----|-------|
| `damage` | Přímé poškození → zabití vojáků |
| `heal` | Obnovení vojáků (max do původního počtu) |
| `buff` | AC nebo THAC0 bonus pro vlastní jednotku |
| `debuff` | AC nebo THAC0 postih pro nepřátelskou jednotku |
| `cc` | Zneschopnění frakce jednotky (0–80 % max) |
| `utility` | Nekombatní efekty |

### Kouzelnické třídy
| Třída | Typ jednotky | Multiplikátor slotů |
|-------|-------------|---------------------|
| `mage` | MG | 1× |
| `battleMage` | BM | 2× |
| `cleric` | KN, DR | 1× |

### Sloty kouzel dle úrovně (příklad: mage)
| Úroveň | L1 | L2 | L3 | L4 | L5 | L6 |
|--------|----|----|----|----|----|----|
| 1 | 1 | — | — | — | — | — |
| 3 | 2 | 1 | — | — | — | — |
| 6 | 3 | 2 | 1 | — | — | — |
| 9 | 3 | 3 | 2 | 1 | — | — |
| 12 | 4 | 4 | 4 | 4 | 4 | 1 |

### Omezení CC efektů
- Maximum: **80 % zneschopnění** (cap v kódu)
- CC efekty se sčítají, ale nepřekročí cap

---

## 13. Podmínky vítězství

Armáda je **poražena** pokud jsou **všechny** její jednotky v jednom z těchto stavů:
- `count <= 0` (zničena)
- `morale_failures >= 2` (zlomená morálka)
- `fatigue_state === 'collapsed'` (zhroucena únavou)

Bitva skončí **remízou** pokud je dosažen `maxBK` bez vítěze.

---

## 14. Rozdíly mezi Monte Carlo a hexovým režimem

| Pravidlo | Monte Carlo | Hexová mapa |
|----------|-------------|-------------|
| Melee (simulateBK) | ✅ | ✅ |
| Iniciativa | ✅ | ✅ (přes simulateBK) |
| Morálka | ✅ | ✅ (přes simulateBK) |
| Únava | ✅ | ✅ (přes simulateBK) |
| Gradual engagement | ✅ | ✅ (přes simulateBK) |
| Dálková střelba (BK 1–2) | ✅ | ❌ |
| Letecká dálková střelba (LL) | ✅ | ❌ |
| Průletové útoky (TL) | ✅ | ❌ |
| Kouzelná fáze | ✅ | ❌ |
| Terénní modifikátory | ✅ | ❌ |
| Denní doba | ✅ | ❌ |
| Velitelské bonusy | ✅ (opt-in) | ❌ |
| Pohyb po mapě | ❌ | ✅ |
| Taktické přeskupení | ❌ | ✅ |

> Sjednocení pravidel je cílem Task 17–19 (etapa 3).
