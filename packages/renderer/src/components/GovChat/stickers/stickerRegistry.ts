/* ─────────── Ghanaian Sticker Registry ─────────── */

export interface StickerDef {
  id: string;
  packId: string;
  label: string;
  altText: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: StickerDef[];
}

/* ─── Ghana Expressions (20) ─── */

const ghanaExpressions: StickerDef[] = [
  { id: 'charley', packId: 'ghana-expressions', label: 'Charley!', altText: 'Charley! — excitement or surprise' },
  { id: 'eiii', packId: 'ghana-expressions', label: 'Eiii!', altText: 'Eiii! — disbelief' },
  { id: 'as-for-you', packId: 'ghana-expressions', label: 'As for you!', altText: 'As for you! — exasperation' },
  { id: 'chale-relax', packId: 'ghana-expressions', label: 'Chale, relax', altText: 'Chale, relax — calm down bro' },
  { id: 'herh', packId: 'ghana-expressions', label: 'Herh!', altText: 'Herh! — shock or disbelief' },
  { id: 'wey-dey', packId: 'ghana-expressions', label: 'Wey dey!', altText: 'Wey dey! — all good, moving' },
  { id: 'i-beg', packId: 'ghana-expressions', label: 'I beg', altText: 'I beg — please or come on' },
  { id: 'yoo-i-hear', packId: 'ghana-expressions', label: 'Yoo, I hear', altText: 'Yoo, I hear — okay, got it' },
  { id: 'no-wahala', packId: 'ghana-expressions', label: 'No wahala', altText: 'No wahala — no problem' },
  { id: 'the-thing-is', packId: 'ghana-expressions', label: 'The thing is...', altText: 'The thing is... — about to explain' },
  { id: 'me-im-coming', packId: 'ghana-expressions', label: "Me I'm coming", altText: "Me I'm coming — be right back" },
  { id: 'abi', packId: 'ghana-expressions', label: 'Abi?', altText: 'Abi? — right? isnt it?' },
  { id: 'make-i-tell-you', packId: 'ghana-expressions', label: 'Make I tell you...', altText: 'Make I tell you... — let me explain' },
  { id: 'keke', packId: 'ghana-expressions', label: 'K\u025Bk\u025B!', altText: 'K\u025Bk\u025B! — exactly, only that' },
  { id: 'paper-dey', packId: 'ghana-expressions', label: 'Paper dey!', altText: 'Paper dey! — money is available' },
  { id: 'aye-fine', packId: 'ghana-expressions', label: 'Ay\u025B fine!', altText: 'Ay\u025B fine! — life is good' },
  { id: 'i-shock', packId: 'ghana-expressions', label: 'I shock!', altText: 'I shock! — I am shocked' },
  { id: 'heavy', packId: 'ghana-expressions', label: 'Heavy!', altText: 'Heavy! — intense or impressive' },
  { id: 'die-be-die', packId: 'ghana-expressions', label: 'Die be die', altText: 'Die be die — do or die, full commitment' },
  { id: 'we-move', packId: 'ghana-expressions', label: 'Chale, we move', altText: 'Chale, we move — onward, resilience' },
];

/* ─── Adinkra Vibes (12) ─── */

const adinkraVibes: StickerDef[] = [
  { id: 'gye-nyame', packId: 'adinkra-vibes', label: 'Gye Nyame', altText: 'Gye Nyame — Except God, supremacy of God' },
  { id: 'sankofa', packId: 'adinkra-vibes', label: 'Sankofa', altText: 'Sankofa — Go back and get it, learn from the past' },
  { id: 'dwennimmen', packId: 'adinkra-vibes', label: 'Dwennimmen', altText: 'Dwennimmen — Humility and strength' },
  { id: 'aya', packId: 'adinkra-vibes', label: 'Aya', altText: 'Aya — Endurance and resourcefulness' },
  { id: 'akoma', packId: 'adinkra-vibes', label: 'Akoma', altText: 'Akoma — Patience and tolerance' },
  { id: 'nkyinkyim', packId: 'adinkra-vibes', label: 'Nkyinkyim', altText: 'Nkyinkyim — Versatility and resilience' },
  { id: 'fawohodie', packId: 'adinkra-vibes', label: 'Fawohodie', altText: 'Fawohodie — Independence and freedom' },
  { id: 'ese-ne-tekrema', packId: 'adinkra-vibes', label: 'Ese Ne Tekrema', altText: 'Ese Ne Tekrema — Friendship and interdependence' },
  { id: 'mate-masie', packId: 'adinkra-vibes', label: 'Mate Masie', altText: 'Mate Masie — What I hear, I keep (wisdom)' },
  { id: 'bese-saka', packId: 'adinkra-vibes', label: 'Bese Saka', altText: 'Bese Saka — Abundance and togetherness' },
  { id: 'denkyem', packId: 'adinkra-vibes', label: 'Denkyem', altText: 'Denkyem — Adaptability' },
  { id: 'woforo-dua-pa-a', packId: 'adinkra-vibes', label: 'Woforo Dua Pa A', altText: 'Woforo Dua Pa A — Support and cooperation' },
];

/* ─── Ghana Life (15) ─── */

const ghanaLife: StickerDef[] = [
  { id: 'jollof-rice', packId: 'ghana-life', label: 'Jollof Rice', altText: 'Jollof Rice — the best jollof' },
  { id: 'trotro', packId: 'ghana-life', label: 'Trotro', altText: 'Trotro — minibus transport' },
  { id: 'star-beer', packId: 'ghana-life', label: 'Star Beer', altText: 'Star Beer — refreshing' },
  { id: 'fufu', packId: 'ghana-life', label: 'Fufu', altText: 'Fufu — pounded cassava and plantain' },
  { id: 'waakye', packId: 'ghana-life', label: 'Waakye', altText: 'Waakye — rice and beans' },
  { id: 'black-stars-jersey', packId: 'ghana-life', label: 'Black Stars Jersey', altText: 'Black Stars Jersey — Ghana football' },
  { id: 'cedi-notes', packId: 'ghana-life', label: 'GH\u20B5 Notes', altText: 'GH Cedi notes — money' },
  { id: 'kente-pattern', packId: 'ghana-life', label: 'Kente Pattern', altText: 'Kente Pattern — traditional cloth' },
  { id: 'akwaaba', packId: 'ghana-life', label: 'Akwaaba', altText: 'Akwaaba — Welcome sign' },
  { id: 'highlife-guitar', packId: 'ghana-life', label: 'Highlife Guitar', altText: 'Highlife Guitar — music vibes' },
  { id: 'cedi-loading', packId: 'ghana-life', label: 'GH\u20B5 Loading...', altText: 'GH Cedi Loading — waiting for money' },
  { id: 'chop-bar-open', packId: 'ghana-life', label: 'Chop bar open', altText: 'Chop bar open — local restaurant' },
  { id: 'black-stars', packId: 'ghana-life', label: 'Black Stars \u2B50', altText: 'Black Stars — Ghana national team' },
  { id: 'dumsor-candle', packId: 'ghana-life', label: 'Dumsor candle', altText: 'Dumsor candle — power outage life' },
  { id: 'friday-wear', packId: 'ghana-life', label: 'Friday wear', altText: 'Friday wear — African print Friday' },
];

/* ─── Pack registry ─── */

export const STICKER_PACKS: StickerPack[] = [
  { id: 'ghana-expressions', name: 'Ghana Expressions', icon: '\uD83D\uDDE3\uFE0F', stickers: ghanaExpressions },
  { id: 'adinkra-vibes', name: 'Adinkra Vibes', icon: '\u2726', stickers: adinkraVibes },
  { id: 'ghana-life', name: 'Ghana Life', icon: '\uD83C\uDDEC\uD83C\uDDED', stickers: ghanaLife },
];

/* ─── Lookup helpers ─── */

const stickerMap = new Map<string, StickerDef>();
for (const pack of STICKER_PACKS) {
  for (const sticker of pack.stickers) {
    stickerMap.set(`${sticker.packId}:${sticker.id}`, sticker);
  }
}

export function lookupSticker(packId: string, stickerId: string): StickerDef | undefined {
  return stickerMap.get(`${packId}:${stickerId}`);
}

export function getAllStickers(): StickerDef[] {
  return STICKER_PACKS.flatMap(p => p.stickers);
}
