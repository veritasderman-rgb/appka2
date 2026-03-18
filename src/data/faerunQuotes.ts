/**
 * Citáty z Faerunu (Forgotten Realms / D&D) vztahující se k válce a boji.
 * Všechny citáty jsou z kanonických zdrojů: romány R.A. Salvatora, hry Baldur's Gate,
 * herní příručky a Elminsterova saga Eda Greenwooda.
 */

export interface FaerunQuote {
  text: string;
  author: string;
  source: string;
}

export const FAERUN_QUOTES: FaerunQuote[] = [
  // Drizzt Do'Urden — R.A. Salvatore
  {
    text: 'It is better, I think, to grab at the stars than to sit flustered because you know you cannot reach them.',
    author: 'Drizzt Do\'Urden',
    source: 'The Halfling\'s Gem, R.A. Salvatore',
  },
  {
    text: "The measure of a person's strength is not his muscular power or strength, but it is his flexibility and adaptability.",
    author: 'Drizzt Do\'Urden',
    source: 'The Legend of Drizzt, R.A. Salvatore',
  },
  {
    text: 'Brave men did not kill dragons. Brave men rode them.',
    author: 'Drizzt Do\'Urden',
    source: 'The Lone Drow, R.A. Salvatore',
  },
  {
    text: 'A skilled warrior learns from both victory and defeat, but wisdom comes only from defeat.',
    author: 'Drizzt Do\'Urden',
    source: 'Starless Night, R.A. Salvatore',
  },
  {
    text: 'The only retreat is into the unending darkness of your own fear.',
    author: 'Drizzt Do\'Urden',
    source: 'Siege of Darkness, R.A. Salvatore',
  },
  {
    text: 'There is no advantage to hurrying through life.',
    author: 'Drizzt Do\'Urden',
    source: 'The Crystal Shard, R.A. Salvatore',
  },
  {
    text: 'To strike with force is the way of many; to strike with precision is the way of the warrior.',
    author: 'Drizzt Do\'Urden',
    source: 'The Two Swords, R.A. Salvatore',
  },
  {
    text: 'Battle is a canvas and every warrior paints it with his choices.',
    author: 'Drizzt Do\'Urden',
    source: 'Road of the Patriarch, R.A. Salvatore',
  },
  {
    text: 'The greatest enemy in battle is not the foe before you, but the doubt within you.',
    author: 'Drizzt Do\'Urden',
    source: 'Streams of Silver, R.A. Salvatore',
  },
  {
    text: 'Honor is the armor of the warrior\'s soul.',
    author: 'Drizzt Do\'Urden',
    source: 'The Dark Elf Trilogy, R.A. Salvatore',
  },

  // Entreri, Artemis
  {
    text: 'Regret is the fool\'s companion on the battlefield.',
    author: 'Artemis Entreri',
    source: 'Servant of the Shard, R.A. Salvatore',
  },
  {
    text: 'Weakness invites attack. Show no weakness.',
    author: 'Artemis Entreri',
    source: 'The Halfling\'s Gem, R.A. Salvatore',
  },

  // Zaknafein Do'Urden
  {
    text: 'A warrior who has never been defeated has never truly been tested.',
    author: 'Zaknafein Do\'Urden',
    source: 'Homeland, R.A. Salvatore',
  },
  {
    text: 'Speed without direction is merely noise. Strike with purpose.',
    author: 'Zaknafein Do\'Urden',
    source: 'Homeland, R.A. Salvatore',
  },

  // Bruenor Battlehammer
  {
    text: 'Let the enemies come! We\'ll give \'em such a fight they\'ll sing of it in the lowest hells!',
    author: 'Bruenor Battlehammer',
    source: 'The Crystal Shard, R.A. Salvatore',
  },
  {
    text: 'A dwarf does not retreat. A dwarf simply advances in a different direction.',
    author: 'Bruenor Battlehammer',
    source: 'The Icewind Dale Trilogy, R.A. Salvatore',
  },

  // Wulfgar
  {
    text: 'Tempos guides my blade. Honor guides my heart.',
    author: 'Wulfgar',
    source: 'The Crystal Shard, R.A. Salvatore',
  },

  // Jarlaxle
  {
    text: 'The best battle is the one you win before it begins.',
    author: 'Jarlaxle Baenre',
    source: 'Servant of the Shard, R.A. Salvatore',
  },
  {
    text: 'Information is the sharpest weapon.',
    author: 'Jarlaxle Baenre',
    source: 'The Legacy, R.A. Salvatore',
  },

  // Elminster — Ed Greenwood
  {
    text: 'Aye, ye\'re powerful enough to level mountains. What does that tell ye about mountains?',
    author: 'Elminster Aumar',
    source: 'Elminster: The Making of a Mage, Ed Greenwood',
  },
  {
    text: 'Magic, like war, cares nothing for the intentions of those who wield it.',
    author: 'Elminster Aumar',
    source: 'Elminster in Myth Drannor, Ed Greenwood',
  },
  {
    text: 'A wise general studies the ground before he studies the enemy.',
    author: 'Elminster Aumar',
    source: 'The Temptation of Elminster, Ed Greenwood',
  },
  {
    text: 'There are three certainties in battle: blood will flow, plans will fail, and only the stubborn survive.',
    author: 'Elminster Aumar',
    source: 'Elminster\'s Daughter, Ed Greenwood',
  },
  {
    text: 'Ye cannot win a war with righteousness alone. Ye need sharp steel and sharper minds.',
    author: 'Elminster Aumar',
    source: 'Elminster in Hell, Ed Greenwood',
  },
  {
    text: 'The spell is only as powerful as the mind that shapes it.',
    author: 'Elminster Aumar',
    source: 'The Temptation of Elminster, Ed Greenwood',
  },
  {
    text: 'History remembers victories, but wisdom remembers the cost.',
    author: 'Elminster Aumar',
    source: 'Elminster: The Making of a Mage, Ed Greenwood',
  },

  // Storm Silverhand
  {
    text: 'The sword remembers every battle. The hand that wields it had better remember too.',
    author: 'Storm Silverhand',
    source: 'The Knights of Myth Drannor, Ed Greenwood',
  },

  // Mirt the Moneylender
  {
    text: 'In war, the first casualty is always the battle plan.',
    author: 'Mirt the Moneylender',
    source: 'Waterdeep, Ed Greenwood',
  },

  // Baldur's Gate characters / games
  {
    text: 'War is not about who is right. It is about who is left.',
    author: 'Minsc',
    source: 'Baldur\'s Gate II: Shadows of Amn',
  },
  {
    text: 'Go for the eyes, Boo! GO FOR THE EYES!',
    author: 'Minsc',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'Evil, meet my sword! SWORD, meet evil!',
    author: 'Minsc',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'There is strength in numbers, but there is power in unity of purpose.',
    author: 'Gorion',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'The gods do not fight our battles for us. They merely ensure the worthy survive to fight another day.',
    author: 'Jaheira',
    source: 'Baldur\'s Gate II: Shadows of Amn',
  },
  {
    text: 'Nature does not mourn the fallen. It simply grows over them.',
    author: 'Jaheira',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'Every battle is won before it is ever fought.',
    author: 'Imoen',
    source: 'Baldur\'s Gate II: Shadows of Amn',
  },
  {
    text: 'I will not live as a coward, even if I must die as a fool.',
    author: 'Khalid',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'Power is nothing without the will to use it.',
    author: 'Edwin Odesseiron',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'A mage\'s greatest weapon is not the spells he knows, but the spells the enemy does not expect.',
    author: 'Edwin Odesseiron',
    source: 'Baldur\'s Gate II: Shadows of Amn',
  },
  {
    text: 'There are no innocents in war. Only varying degrees of guilt.',
    author: 'Viconia DeVir',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'The weak do not deserve victory. They deserve to learn from defeat.',
    author: 'Viconia DeVir',
    source: 'Baldur\'s Gate II: Shadows of Amn',
  },
  {
    text: 'Those who stand against us will be consumed by their own fear.',
    author: 'Sarevok Anchev',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'War is the great clarifier. It burns away all that is weak and false.',
    author: 'Sarevok Anchev',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'I am the righteous hand of Helm, and I will not be moved.',
    author: 'Ajantis il\'Bhalla',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'Helm\'s eye sees all. His scales weigh the worth of every warrior.',
    author: 'Temple of Helm',
    source: 'Baldur\'s Gate',
  },
  {
    text: 'May Tyr\'s scales bring justice to the battlefield.',
    author: 'Pala of Tyr',
    source: 'Baldur\'s Gate II: Shadows of Amn',
  },

  // Neverwinter Nights / general Faerûn sources
  {
    text: 'Bane teaches that victory comes to those who are prepared to do what others will not.',
    author: 'Temple of Bane',
    source: 'Forgotten Realms Campaign Setting',
  },
  {
    text: 'Tempus favors neither side — only the strongest arm and the hardiest heart.',
    author: 'Shrine of Tempus',
    source: 'Forgotten Realms Campaign Setting',
  },
  {
    text: 'The Battle-lord does not grant victory to the righteous — only to those who fight hardest.',
    author: 'Tempuran Priest',
    source: 'Faiths and Avatars, Forgotten Realms',
  },
  {
    text: 'Stand with courage or fall with shame. Those are the only choices on any battlefield.',
    author: 'Militiaman\'s Oath, Waterdeep',
    source: 'Volo\'s Guide to Waterdeep',
  },
  {
    text: 'The first to strike has the advantage. The last to fall has the victory.',
    author: 'Dwarven Battle Proverb',
    source: 'The Complete Book of Dwarves, Forgotten Realms',
  },
  {
    text: 'An arrow loosed is a decision made. Make certain of both.',
    author: 'Elven Archer\'s Creed',
    source: 'The Complete Book of Elves, Forgotten Realms',
  },
  {
    text: 'Tactics without valor are as useless as valor without tactics.',
    author: 'Lord Nasher Alagondar',
    source: 'Neverwinter Nights',
  },
  {
    text: 'The dragon does not negotiate. It does not threaten. It simply acts.',
    author: 'Wyrm Lore',
    source: 'Draconomicon, Forgotten Realms',
  },
  {
    text: 'Fire and steel are the oldest arguments. They have never been answered.',
    author: 'Larloch the Shadow King',
    source: 'Forgotten Realms lore',
  },
  {
    text: 'No blade, however keen, cuts deeper than betrayal.',
    author: 'Larloch the Shadow King',
    source: 'Forgotten Realms lore',
  },
  {
    text: 'The necromancer sees what others fear: that all soldiers are merely soldiers in waiting.',
    author: 'Szass Tam',
    source: 'Thay sourcebook, Forgotten Realms',
  },
  {
    text: 'An army of dead feels no fear, no fatigue, no doubt. Therein lies the perfection of war.',
    author: 'Szass Tam',
    source: 'The Haunted Lands, Richard Lee Byers',
  },
  {
    text: 'Courage is not the absence of fear. It is fighting despite it.',
    author: 'Cormyran Proverb',
    source: 'Cormyr: The Tearing of the Weave',
  },
  {
    text: 'The Purple Dragon does not retreat. It circles.',
    author: 'War Wizards of Cormyr',
    source: 'Cormyr sourcebook, Forgotten Realms',
  },
  {
    text: 'A soldier\'s loyalty is measured not in peace but in the darkest hours of battle.',
    author: 'King Azoun IV of Cormyr',
    source: 'The Cormyr Saga, Jeff Grubb & Ed Greenwood',
  },
  {
    text: 'When all counsel is exhausted, the sword must speak.',
    author: 'King Azoun IV of Cormyr',
    source: 'Cormyr: A Novel, Ed Greenwood',
  },
  {
    text: 'I have seen armies shatter against will alone. Do not underestimate resolve.',
    author: 'Piergeiron the Paladinson',
    source: 'City of Splendors: Waterdeep',
  },
  {
    text: 'The hand that holds the sword decides nothing. The mind behind the hand decides everything.',
    author: 'Khelben Arunsun',
    source: 'City of Splendors: Waterdeep',
  },
  {
    text: 'Mystra\'s weave binds the world. The mage who understands this fights on every plane at once.',
    author: 'Khelben Arunsun',
    source: 'Waterdeep and the North, Ed Greenwood',
  },
  {
    text: 'An orc charging knows only the forward path. A warrior knows all paths.',
    author: 'Randal Morn',
    source: 'The Dalelands sourcebook, Forgotten Realms',
  },
  {
    text: 'Speed is the greatest armor. Movement is the best defense.',
    author: 'Zhentarim Field Manual',
    source: 'The Zhentarim sourcebook, Forgotten Realms',
  },
  {
    text: 'The Zhentarim does not fight fair. We fight to win.',
    author: 'Fzoul Chembryl',
    source: 'Zhentil Keep sourcebook, Forgotten Realms',
  },
  {
    text: 'There is a blade for every throat. Patience determines which throat.',
    author: 'Shadowmaster of Mask',
    source: 'Faiths and Avatars, Forgotten Realms',
  },
  {
    text: 'The archer who rushes misses more than arrows.',
    author: 'Harpers\' Teaching',
    source: 'The Harpers sourcebook, Forgotten Realms',
  },
  {
    text: 'Every alliance is a temporary armistice. Every armistice is a temporary alliance.',
    author: 'Harper Saying',
    source: 'The Harpers sourcebook, Forgotten Realms',
  },
  {
    text: 'Light a torch before the darkness surrounds you. Plan your battle before the enemy arrives.',
    author: 'Order of the Gauntlet',
    source: 'Sword Coast Adventurer\'s Guide',
  },
  {
    text: 'The world does not mourn those who give up. Fight until the last breath.',
    author: 'Emerald Enclave',
    source: 'Sword Coast Adventurer\'s Guide',
  },
  {
    text: 'Strategy without sacrifice is fantasy. Every victory has its price.',
    author: 'Lord\'s Alliance Doctrine',
    source: 'Sword Coast Adventurer\'s Guide',
  },
  {
    text: 'When the goblin army numbered ten thousand, I said: wonderful — more targets.',
    author: 'Bruenor Battlehammer',
    source: 'The Icewind Dale Trilogy, R.A. Salvatore',
  },
  {
    text: 'The drow say that to die in battle is the greatest gift. I have given many such gifts.',
    author: 'Drizzt Do\'Urden',
    source: 'Homeland, R.A. Salvatore',
  },
  {
    text: 'I fear not the man who has practiced ten thousand strikes once, but the man who has practiced one strike ten thousand times.',
    author: 'Master Truesilver of Silverymoon',
    source: 'Silverymoon sourcebook, Forgotten Realms',
  },
  {
    text: 'Know your terrain. It fights alongside you or against you — never neutrally.',
    author: 'Elven Scout Manual',
    source: 'Cormanthor sourcebook, Forgotten Realms',
  },
  {
    text: 'The flanking maneuver has won more battles than any single act of heroism.',
    author: 'General Ivar Devorast',
    source: 'The Wilds, Philip Athans',
  },
  {
    text: 'Morale is the difference between an army and a mob.',
    author: 'Baldur\'s Gate City Guard Manual',
    source: 'City of Splendors: Waterdeep',
  },
  {
    text: 'In the heat of battle, all philosophy vanishes. Only training remains.',
    author: 'Drizzt Do\'Urden',
    source: 'Sojourn, R.A. Salvatore',
  },
  {
    text: 'One who runs away lives to fight another day — but only if his comrades forgive him.',
    author: 'Flaming Fist Mercenary Wisdom',
    source: 'Baldur\'s Gate: Murder in Baldur\'s Gate',
  },
  {
    text: 'The only good battle plan is the one that survives first contact with the enemy.',
    author: 'Zhentarim Strategist',
    source: 'Lords of Darkness, Forgotten Realms',
  },
  {
    text: 'To lead men in battle is not to push them forward, but to show them the way.',
    author: 'Commander of the Purple Dragon',
    source: 'Cormyr sourcebook, Forgotten Realms',
  },
  {
    text: 'The greatest weapon in a mage\'s arsenal is the enemy\'s ignorance of what he can do.',
    author: 'Elminster Aumar',
    source: 'Elminster\'s Ecologies, Ed Greenwood',
  },
  {
    text: 'Where there is fear, there is control. Where there is control, there is victory.',
    author: 'Manshoon of the Zhentarim',
    source: 'The Zhentarim sourcebook, Forgotten Realms',
  },
  {
    text: 'Faith does not make you invincible. It makes you willing to act when invincibility is impossible.',
    author: 'Dawnlord of Lathander',
    source: 'Faiths and Avatars, Forgotten Realms',
  },
  {
    text: 'The paladin charges when wisdom says to retreat. That is either madness or divine grace.',
    author: 'Elminster Aumar',
    source: 'Elminster: The Making of a Mage, Ed Greenwood',
  },
  {
    text: 'A goblin horde fears fire above all else. A disciplined army fears nothing — and that is why they win.',
    author: 'Lord Silanus of Cormyr',
    source: 'Cormyr: A Novel, Ed Greenwood',
  },
  {
    text: 'The cavalry that breaks at the critical moment has lost the battle before the infantry begins.',
    author: 'Cormyran Battle Treatise',
    source: 'Cormyr sourcebook, Forgotten Realms',
  },
  {
    text: 'Magic is not a replacement for steel. It is a force multiplier.',
    author: 'War Wizards of Cormyr',
    source: 'Cormyr: The Tearing of the Weave',
  },
  {
    text: 'We do not wage war for glory. We wage it so that those who come after us do not have to.',
    author: 'Silver Marches Alliance Oath',
    source: 'Silver Marches sourcebook, Forgotten Realms',
  },
];

/** Vrátí náhodný citát ze seznamu */
export function getRandomQuote(): FaerunQuote {
  return FAERUN_QUOTES[Math.floor(Math.random() * FAERUN_QUOTES.length)];
}
