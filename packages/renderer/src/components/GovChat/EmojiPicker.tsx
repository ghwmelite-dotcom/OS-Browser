import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

/* ──────────────── Emoji Data ──────────────── */

type CategoryKey =
  | 'recent'
  | 'smileys'
  | 'people'
  | 'nature'
  | 'food'
  | 'travel'
  | 'activities'
  | 'objects'
  | 'symbols'
  | 'flags';

interface EmojiEntry {
  emoji: string;
  name: string;
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  recent: 'Recent',
  smileys: 'Smileys & Emotion',
  people: 'People & Body',
  nature: 'Animals & Nature',
  food: 'Food & Drink',
  travel: 'Travel & Places',
  activities: 'Activities',
  objects: 'Objects',
  symbols: 'Symbols',
  flags: 'Flags',
};

const CATEGORY_ICONS: Record<CategoryKey, string> = {
  recent: '\u{1F552}',
  smileys: '\u{1F600}',
  people: '\u{1F44B}',
  nature: '\u{1F43E}',
  food: '\u{1F354}',
  travel: '\u2708\uFE0F',
  activities: '\u26BD',
  objects: '\u{1F4A1}',
  symbols: '\u2764\uFE0F',
  flags: '\u{1F3C1}',
};

const EMOJI_DATA: Record<Exclude<CategoryKey, 'recent'>, EmojiEntry[]> = {
  smileys: [
    { emoji: '\u{1F600}', name: 'grinning face' },
    { emoji: '\u{1F603}', name: 'smiley' },
    { emoji: '\u{1F604}', name: 'smile' },
    { emoji: '\u{1F601}', name: 'grin' },
    { emoji: '\u{1F606}', name: 'laughing' },
    { emoji: '\u{1F605}', name: 'sweat smile' },
    { emoji: '\u{1F602}', name: 'joy' },
    { emoji: '\u{1F923}', name: 'rofl' },
    { emoji: '\u{1F62D}', name: 'sob' },
    { emoji: '\u{1F60A}', name: 'blush' },
    { emoji: '\u{1F607}', name: 'innocent' },
    { emoji: '\u{1F970}', name: 'smiling face with hearts' },
    { emoji: '\u{1F60D}', name: 'heart eyes' },
    { emoji: '\u{1F929}', name: 'star struck' },
    { emoji: '\u{1F618}', name: 'kissing heart' },
    { emoji: '\u{1F617}', name: 'kissing' },
    { emoji: '\u{1F619}', name: 'kissing smiling eyes' },
    { emoji: '\u{1F61A}', name: 'kissing closed eyes' },
    { emoji: '\u{1F60B}', name: 'yum' },
    { emoji: '\u{1F61B}', name: 'stuck out tongue' },
    { emoji: '\u{1F61C}', name: 'stuck out tongue winking eye' },
    { emoji: '\u{1F92A}', name: 'zany face' },
    { emoji: '\u{1F61D}', name: 'stuck out tongue closed eyes' },
    { emoji: '\u{1F911}', name: 'money mouth' },
    { emoji: '\u{1F917}', name: 'hugging face' },
    { emoji: '\u{1F92D}', name: 'hand over mouth' },
    { emoji: '\u{1F92B}', name: 'shushing face' },
    { emoji: '\u{1F914}', name: 'thinking' },
    { emoji: '\u{1F910}', name: 'zipper mouth' },
    { emoji: '\u{1F928}', name: 'raised eyebrow' },
    { emoji: '\u{1F610}', name: 'neutral face' },
    { emoji: '\u{1F611}', name: 'expressionless' },
    { emoji: '\u{1F636}', name: 'no mouth' },
    { emoji: '\u{1F60F}', name: 'smirk' },
    { emoji: '\u{1F612}', name: 'unamused' },
    { emoji: '\u{1F644}', name: 'eye roll' },
    { emoji: '\u{1F62C}', name: 'grimacing' },
    { emoji: '\u{1F925}', name: 'lying face' },
    { emoji: '\u{1F60C}', name: 'relieved' },
    { emoji: '\u{1F614}', name: 'pensive' },
    { emoji: '\u{1F62A}', name: 'sleepy' },
    { emoji: '\u{1F924}', name: 'drooling' },
    { emoji: '\u{1F634}', name: 'sleeping' },
    { emoji: '\u{1F637}', name: 'mask' },
    { emoji: '\u{1F912}', name: 'thermometer face' },
    { emoji: '\u{1F915}', name: 'bandage face' },
    { emoji: '\u{1F922}', name: 'nauseated' },
    { emoji: '\u{1F92E}', name: 'vomiting' },
    { emoji: '\u{1F927}', name: 'sneezing' },
    { emoji: '\u{1F975}', name: 'hot face' },
    { emoji: '\u{1F976}', name: 'cold face' },
    { emoji: '\u{1F974}', name: 'woozy face' },
    { emoji: '\u{1F635}', name: 'dizzy face' },
    { emoji: '\u{1F621}', name: 'rage' },
    { emoji: '\u{1F620}', name: 'angry' },
    { emoji: '\u{1F92C}', name: 'cursing' },
    { emoji: '\u{1F608}', name: 'smiling imp' },
    { emoji: '\u{1F47F}', name: 'imp' },
    { emoji: '\u{1F480}', name: 'skull' },
    { emoji: '\u{1F4A9}', name: 'poop' },
    { emoji: '\u{1F921}', name: 'clown' },
    { emoji: '\u{1F47B}', name: 'ghost' },
    { emoji: '\u{1F47D}', name: 'alien' },
    { emoji: '\u{1F916}', name: 'robot' },
    { emoji: '\u{1F63A}', name: 'smiley cat' },
    { emoji: '\u{1F638}', name: 'joy cat' },
    { emoji: '\u{1F639}', name: 'tears of joy cat' },
    { emoji: '\u{1F63B}', name: 'heart eyes cat' },
    { emoji: '\u{1F63D}', name: 'kissing cat' },
    { emoji: '\u{1F640}', name: 'weary cat' },
    { emoji: '\u{1F63F}', name: 'crying cat' },
    { emoji: '\u{1F63E}', name: 'pouting cat' },
  ],
  people: [
    { emoji: '\u{1F44B}', name: 'wave' },
    { emoji: '\u{1F91A}', name: 'raised back of hand' },
    { emoji: '\u{1F590}\uFE0F', name: 'hand with fingers splayed' },
    { emoji: '\u270B', name: 'raised hand' },
    { emoji: '\u{1F596}', name: 'vulcan salute' },
    { emoji: '\u{1F44C}', name: 'ok hand' },
    { emoji: '\u{1F90F}', name: 'pinching hand' },
    { emoji: '\u270C\uFE0F', name: 'victory hand' },
    { emoji: '\u{1F91E}', name: 'crossed fingers' },
    { emoji: '\u{1F91F}', name: 'love you gesture' },
    { emoji: '\u{1F918}', name: 'metal' },
    { emoji: '\u{1F919}', name: 'call me hand' },
    { emoji: '\u{1F448}', name: 'point left' },
    { emoji: '\u{1F449}', name: 'point right' },
    { emoji: '\u{1F446}', name: 'point up' },
    { emoji: '\u{1F447}', name: 'point down' },
    { emoji: '\u261D\uFE0F', name: 'point up 2' },
    { emoji: '\u{1F44D}', name: 'thumbs up' },
    { emoji: '\u{1F44E}', name: 'thumbs down' },
    { emoji: '\u270A', name: 'fist' },
    { emoji: '\u{1F44A}', name: 'punch' },
    { emoji: '\u{1F91B}', name: 'left fist' },
    { emoji: '\u{1F91C}', name: 'right fist' },
    { emoji: '\u{1F44F}', name: 'clap' },
    { emoji: '\u{1F64C}', name: 'raised hands' },
    { emoji: '\u{1F450}', name: 'open hands' },
    { emoji: '\u{1F932}', name: 'palms up' },
    { emoji: '\u{1F91D}', name: 'handshake' },
    { emoji: '\u{1F64F}', name: 'pray' },
    { emoji: '\u270D\uFE0F', name: 'writing hand' },
    { emoji: '\u{1F485}', name: 'nail polish' },
    { emoji: '\u{1F933}', name: 'selfie' },
    { emoji: '\u{1F4AA}', name: 'muscle' },
    { emoji: '\u{1F9B5}', name: 'leg' },
    { emoji: '\u{1F9B6}', name: 'foot' },
    { emoji: '\u{1F442}', name: 'ear' },
    { emoji: '\u{1F443}', name: 'nose' },
    { emoji: '\u{1F9E0}', name: 'brain' },
    { emoji: '\u{1F441}\uFE0F', name: 'eye' },
    { emoji: '\u{1F440}', name: 'eyes' },
    { emoji: '\u{1F445}', name: 'tongue' },
    { emoji: '\u{1F444}', name: 'lips' },
    { emoji: '\u{1F476}', name: 'baby' },
    { emoji: '\u{1F466}', name: 'boy' },
    { emoji: '\u{1F467}', name: 'girl' },
    { emoji: '\u{1F468}', name: 'man' },
    { emoji: '\u{1F469}', name: 'woman' },
    { emoji: '\u{1F474}', name: 'older man' },
    { emoji: '\u{1F475}', name: 'older woman' },
  ],
  nature: [
    { emoji: '\u{1F436}', name: 'dog' },
    { emoji: '\u{1F431}', name: 'cat' },
    { emoji: '\u{1F42D}', name: 'mouse' },
    { emoji: '\u{1F439}', name: 'hamster' },
    { emoji: '\u{1F430}', name: 'rabbit' },
    { emoji: '\u{1F98A}', name: 'fox' },
    { emoji: '\u{1F43B}', name: 'bear' },
    { emoji: '\u{1F43C}', name: 'panda' },
    { emoji: '\u{1F428}', name: 'koala' },
    { emoji: '\u{1F42F}', name: 'tiger' },
    { emoji: '\u{1F981}', name: 'lion' },
    { emoji: '\u{1F42E}', name: 'cow' },
    { emoji: '\u{1F437}', name: 'pig' },
    { emoji: '\u{1F438}', name: 'frog' },
    { emoji: '\u{1F435}', name: 'monkey face' },
    { emoji: '\u{1F648}', name: 'see no evil' },
    { emoji: '\u{1F649}', name: 'hear no evil' },
    { emoji: '\u{1F64A}', name: 'speak no evil' },
    { emoji: '\u{1F412}', name: 'monkey' },
    { emoji: '\u{1F414}', name: 'chicken' },
    { emoji: '\u{1F427}', name: 'penguin' },
    { emoji: '\u{1F426}', name: 'bird' },
    { emoji: '\u{1F985}', name: 'eagle' },
    { emoji: '\u{1F986}', name: 'duck' },
    { emoji: '\u{1F989}', name: 'owl' },
    { emoji: '\u{1F40A}', name: 'crocodile' },
    { emoji: '\u{1F422}', name: 'turtle' },
    { emoji: '\u{1F40D}', name: 'snake' },
    { emoji: '\u{1F432}', name: 'dragon face' },
    { emoji: '\u{1F995}', name: 'dinosaur' },
    { emoji: '\u{1F433}', name: 'whale' },
    { emoji: '\u{1F42C}', name: 'dolphin' },
    { emoji: '\u{1F41F}', name: 'fish' },
    { emoji: '\u{1F419}', name: 'octopus' },
    { emoji: '\u{1F41A}', name: 'shell' },
    { emoji: '\u{1F40C}', name: 'snail' },
    { emoji: '\u{1F98B}', name: 'butterfly' },
    { emoji: '\u{1F41B}', name: 'bug' },
    { emoji: '\u{1F41C}', name: 'ant' },
    { emoji: '\u{1F41D}', name: 'bee' },
    { emoji: '\u{1F490}', name: 'bouquet' },
    { emoji: '\u{1F338}', name: 'cherry blossom' },
    { emoji: '\u{1F339}', name: 'rose' },
    { emoji: '\u{1F33B}', name: 'sunflower' },
    { emoji: '\u{1F33A}', name: 'hibiscus' },
    { emoji: '\u{1F337}', name: 'tulip' },
    { emoji: '\u{1F331}', name: 'seedling' },
    { emoji: '\u{1F332}', name: 'evergreen tree' },
    { emoji: '\u{1F333}', name: 'deciduous tree' },
    { emoji: '\u{1F334}', name: 'palm tree' },
    { emoji: '\u{1F335}', name: 'cactus' },
    { emoji: '\u{1F340}', name: 'four leaf clover' },
  ],
  food: [
    { emoji: '\u{1F34E}', name: 'apple' },
    { emoji: '\u{1F34F}', name: 'green apple' },
    { emoji: '\u{1F34A}', name: 'tangerine' },
    { emoji: '\u{1F34B}', name: 'lemon' },
    { emoji: '\u{1F34C}', name: 'banana' },
    { emoji: '\u{1F349}', name: 'watermelon' },
    { emoji: '\u{1F347}', name: 'grapes' },
    { emoji: '\u{1F353}', name: 'strawberry' },
    { emoji: '\u{1F348}', name: 'melon' },
    { emoji: '\u{1F352}', name: 'cherries' },
    { emoji: '\u{1F351}', name: 'peach' },
    { emoji: '\u{1F96D}', name: 'mango' },
    { emoji: '\u{1F34D}', name: 'pineapple' },
    { emoji: '\u{1F965}', name: 'coconut' },
    { emoji: '\u{1F951}', name: 'avocado' },
    { emoji: '\u{1F346}', name: 'eggplant' },
    { emoji: '\u{1F955}', name: 'carrot' },
    { emoji: '\u{1F33D}', name: 'corn' },
    { emoji: '\u{1F336}\uFE0F', name: 'hot pepper' },
    { emoji: '\u{1F952}', name: 'cucumber' },
    { emoji: '\u{1F35E}', name: 'bread' },
    { emoji: '\u{1F950}', name: 'croissant' },
    { emoji: '\u{1F956}', name: 'baguette' },
    { emoji: '\u{1F9C0}', name: 'cheese' },
    { emoji: '\u{1F356}', name: 'meat on bone' },
    { emoji: '\u{1F357}', name: 'poultry leg' },
    { emoji: '\u{1F354}', name: 'hamburger' },
    { emoji: '\u{1F35F}', name: 'french fries' },
    { emoji: '\u{1F355}', name: 'pizza' },
    { emoji: '\u{1F32D}', name: 'hot dog' },
    { emoji: '\u{1F96A}', name: 'sandwich' },
    { emoji: '\u{1F32E}', name: 'taco' },
    { emoji: '\u{1F32F}', name: 'burrito' },
    { emoji: '\u{1F959}', name: 'stuffed flatbread' },
    { emoji: '\u{1F95A}', name: 'egg' },
    { emoji: '\u{1F373}', name: 'cooking' },
    { emoji: '\u{1F372}', name: 'stew' },
    { emoji: '\u{1F35C}', name: 'ramen' },
    { emoji: '\u{1F35D}', name: 'spaghetti' },
    { emoji: '\u{1F363}', name: 'sushi' },
    { emoji: '\u{1F370}', name: 'cake' },
    { emoji: '\u{1F382}', name: 'birthday cake' },
    { emoji: '\u{1F36E}', name: 'custard' },
    { emoji: '\u{1F36D}', name: 'lollipop' },
    { emoji: '\u{1F36C}', name: 'candy' },
    { emoji: '\u{1F36B}', name: 'chocolate bar' },
    { emoji: '\u{1F369}', name: 'doughnut' },
    { emoji: '\u{1F36A}', name: 'cookie' },
    { emoji: '\u2615', name: 'coffee' },
    { emoji: '\u{1F375}', name: 'tea' },
    { emoji: '\u{1F37A}', name: 'beer' },
    { emoji: '\u{1F377}', name: 'wine glass' },
  ],
  travel: [
    { emoji: '\u{1F697}', name: 'car' },
    { emoji: '\u{1F695}', name: 'taxi' },
    { emoji: '\u{1F68C}', name: 'bus' },
    { emoji: '\u{1F691}', name: 'ambulance' },
    { emoji: '\u{1F692}', name: 'fire engine' },
    { emoji: '\u{1F693}', name: 'police car' },
    { emoji: '\u{1F3CD}\uFE0F', name: 'motorcycle' },
    { emoji: '\u{1F6B2}', name: 'bicycle' },
    { emoji: '\u2708\uFE0F', name: 'airplane' },
    { emoji: '\u{1F680}', name: 'rocket' },
    { emoji: '\u{1F6F8}', name: 'flying saucer' },
    { emoji: '\u{1F6A2}', name: 'ship' },
    { emoji: '\u26F5', name: 'sailboat' },
    { emoji: '\u{1F3E0}', name: 'house' },
    { emoji: '\u{1F3E2}', name: 'office' },
    { emoji: '\u{1F3E5}', name: 'hospital' },
    { emoji: '\u{1F3EB}', name: 'school' },
    { emoji: '\u{1F3E8}', name: 'hotel' },
    { emoji: '\u{1F3EA}', name: 'store' },
    { emoji: '\u26EA', name: 'church' },
    { emoji: '\u{1F54C}', name: 'mosque' },
    { emoji: '\u{1F3D4}\uFE0F', name: 'mountain' },
    { emoji: '\u{1F3D6}\uFE0F', name: 'beach' },
    { emoji: '\u{1F3DD}\uFE0F', name: 'island' },
    { emoji: '\u{1F30D}', name: 'globe africa' },
    { emoji: '\u{1F30E}', name: 'globe americas' },
    { emoji: '\u{1F30F}', name: 'globe asia' },
    { emoji: '\u{1F5FA}\uFE0F', name: 'world map' },
    { emoji: '\u{1F301}', name: 'foggy' },
    { emoji: '\u{1F307}', name: 'sunset' },
    { emoji: '\u{1F303}', name: 'night with stars' },
    { emoji: '\u{1F306}', name: 'cityscape dusk' },
  ],
  activities: [
    { emoji: '\u26BD', name: 'soccer' },
    { emoji: '\u{1F3C0}', name: 'basketball' },
    { emoji: '\u{1F3C8}', name: 'football' },
    { emoji: '\u26BE', name: 'baseball' },
    { emoji: '\u{1F3BE}', name: 'tennis' },
    { emoji: '\u{1F3D0}', name: 'volleyball' },
    { emoji: '\u{1F3C9}', name: 'rugby' },
    { emoji: '\u{1F3B1}', name: 'pool 8 ball' },
    { emoji: '\u{1F3D3}', name: 'ping pong' },
    { emoji: '\u{1F3F8}', name: 'badminton' },
    { emoji: '\u{1F94A}', name: 'boxing glove' },
    { emoji: '\u{1F3CB}\uFE0F', name: 'weight lifting' },
    { emoji: '\u{1F6B4}', name: 'cycling' },
    { emoji: '\u{1F3C4}', name: 'surfing' },
    { emoji: '\u{1F3CA}', name: 'swimming' },
    { emoji: '\u{1F3C6}', name: 'trophy' },
    { emoji: '\u{1F3C5}', name: 'sports medal' },
    { emoji: '\u{1F947}', name: 'gold medal' },
    { emoji: '\u{1F948}', name: 'silver medal' },
    { emoji: '\u{1F949}', name: 'bronze medal' },
    { emoji: '\u{1F3AE}', name: 'video game' },
    { emoji: '\u{1F3B2}', name: 'game die' },
    { emoji: '\u{1F3AF}', name: 'dart' },
    { emoji: '\u{1F3B3}', name: 'bowling' },
    { emoji: '\u{1F3A4}', name: 'microphone' },
    { emoji: '\u{1F3B5}', name: 'musical note' },
    { emoji: '\u{1F3B6}', name: 'notes' },
    { emoji: '\u{1F3B8}', name: 'guitar' },
    { emoji: '\u{1F3B9}', name: 'musical keyboard' },
    { emoji: '\u{1F3A8}', name: 'art' },
    { emoji: '\u{1F3AC}', name: 'clapper board' },
    { emoji: '\u{1F3AD}', name: 'performing arts' },
  ],
  objects: [
    { emoji: '\u{1F4F1}', name: 'phone' },
    { emoji: '\u{1F4BB}', name: 'laptop' },
    { emoji: '\u{1F5A5}\uFE0F', name: 'desktop computer' },
    { emoji: '\u{1F4F7}', name: 'camera' },
    { emoji: '\u{1F4FA}', name: 'tv' },
    { emoji: '\u{1F4FB}', name: 'radio' },
    { emoji: '\u{1F50B}', name: 'battery' },
    { emoji: '\u{1F50C}', name: 'plug' },
    { emoji: '\u{1F4A1}', name: 'light bulb' },
    { emoji: '\u{1F526}', name: 'flashlight' },
    { emoji: '\u{1F4D6}', name: 'book' },
    { emoji: '\u{1F4DA}', name: 'books' },
    { emoji: '\u{1F4DD}', name: 'memo' },
    { emoji: '\u{1F4C4}', name: 'page facing up' },
    { emoji: '\u{1F4C1}', name: 'file folder' },
    { emoji: '\u{1F4C2}', name: 'open file folder' },
    { emoji: '\u{1F4CA}', name: 'bar chart' },
    { emoji: '\u{1F4C8}', name: 'chart increasing' },
    { emoji: '\u{1F4C9}', name: 'chart decreasing' },
    { emoji: '\u{1F4CE}', name: 'paperclip' },
    { emoji: '\u{1F4CC}', name: 'pushpin' },
    { emoji: '\u{1F4CF}', name: 'ruler' },
    { emoji: '\u270F\uFE0F', name: 'pencil' },
    { emoji: '\u{1F58A}\uFE0F', name: 'pen' },
    { emoji: '\u{1F512}', name: 'lock' },
    { emoji: '\u{1F513}', name: 'unlock' },
    { emoji: '\u{1F511}', name: 'key' },
    { emoji: '\u{1F528}', name: 'hammer' },
    { emoji: '\u{1F52E}', name: 'crystal ball' },
    { emoji: '\u{1F4E7}', name: 'email' },
    { emoji: '\u{1F4E6}', name: 'package' },
    { emoji: '\u{1F4EC}', name: 'mailbox' },
  ],
  symbols: [
    { emoji: '\u2764\uFE0F', name: 'red heart' },
    { emoji: '\u{1F9E1}', name: 'orange heart' },
    { emoji: '\u{1F49B}', name: 'yellow heart' },
    { emoji: '\u{1F49A}', name: 'green heart' },
    { emoji: '\u{1F499}', name: 'blue heart' },
    { emoji: '\u{1F49C}', name: 'purple heart' },
    { emoji: '\u{1F5A4}', name: 'black heart' },
    { emoji: '\u{1F90D}', name: 'white heart' },
    { emoji: '\u{1F90E}', name: 'brown heart' },
    { emoji: '\u{1F494}', name: 'broken heart' },
    { emoji: '\u{1F495}', name: 'two hearts' },
    { emoji: '\u{1F496}', name: 'sparkling heart' },
    { emoji: '\u{1F497}', name: 'growing heart' },
    { emoji: '\u{1F498}', name: 'cupid' },
    { emoji: '\u{1F49D}', name: 'gift heart' },
    { emoji: '\u{1F49E}', name: 'revolving hearts' },
    { emoji: '\u2705', name: 'check mark' },
    { emoji: '\u274C', name: 'cross mark' },
    { emoji: '\u2757', name: 'exclamation' },
    { emoji: '\u2753', name: 'question' },
    { emoji: '\u{1F4AF}', name: '100' },
    { emoji: '\u{1F525}', name: 'fire' },
    { emoji: '\u{1F4A5}', name: 'boom' },
    { emoji: '\u2B50', name: 'star' },
    { emoji: '\u{1F31F}', name: 'glowing star' },
    { emoji: '\u{1F4AB}', name: 'dizzy' },
    { emoji: '\u{1F4AC}', name: 'speech bubble' },
    { emoji: '\u{1F4AD}', name: 'thought balloon' },
    { emoji: '\u{1F6AB}', name: 'no entry' },
    { emoji: '\u26A0\uFE0F', name: 'warning' },
    { emoji: '\u267B\uFE0F', name: 'recycling' },
    { emoji: '\u{1F195}', name: 'new' },
  ],
  flags: [
    { emoji: '\u{1F3F4}', name: 'black flag' },
    { emoji: '\u{1F3F3}\uFE0F', name: 'white flag' },
    { emoji: '\u{1F1EC}\u{1F1ED}', name: 'ghana' },
    { emoji: '\u{1F1F3}\u{1F1EC}', name: 'nigeria' },
    { emoji: '\u{1F1F0}\u{1F1EA}', name: 'kenya' },
    { emoji: '\u{1F1FF}\u{1F1E6}', name: 'south africa' },
    { emoji: '\u{1F1EA}\u{1F1EC}', name: 'egypt' },
    { emoji: '\u{1F1F2}\u{1F1E6}', name: 'morocco' },
    { emoji: '\u{1F1EA}\u{1F1F9}', name: 'ethiopia' },
    { emoji: '\u{1F1F9}\u{1F1FF}', name: 'tanzania' },
    { emoji: '\u{1F1FA}\u{1F1EC}', name: 'uganda' },
    { emoji: '\u{1F1E8}\u{1F1EE}', name: 'cote divoire' },
    { emoji: '\u{1F1F8}\u{1F1F3}', name: 'senegal' },
    { emoji: '\u{1F1E8}\u{1F1F2}', name: 'cameroon' },
    { emoji: '\u{1F1FA}\u{1F1F8}', name: 'united states' },
    { emoji: '\u{1F1EC}\u{1F1E7}', name: 'united kingdom' },
    { emoji: '\u{1F1E8}\u{1F1E6}', name: 'canada' },
    { emoji: '\u{1F1E6}\u{1F1FA}', name: 'australia' },
    { emoji: '\u{1F1EB}\u{1F1F7}', name: 'france' },
    { emoji: '\u{1F1E9}\u{1F1EA}', name: 'germany' },
    { emoji: '\u{1F1EF}\u{1F1F5}', name: 'japan' },
    { emoji: '\u{1F1E8}\u{1F1F3}', name: 'china' },
    { emoji: '\u{1F1EE}\u{1F1F3}', name: 'india' },
    { emoji: '\u{1F1E7}\u{1F1F7}', name: 'brazil' },
  ],
};

const RECENT_KEY = 'govchat_recent_emoji';
const MAX_RECENT = 24;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(emojis: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(emojis.slice(0, MAX_RECENT)));
  } catch {}
}

const CATEGORIES: CategoryKey[] = [
  'recent',
  'smileys',
  'people',
  'nature',
  'food',
  'travel',
  'activities',
  'objects',
  'symbols',
  'flags',
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(loadRecent);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSelect = useCallback(
    (emoji: string) => {
      // Update recents
      const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT);
      setRecentEmojis(updated);
      saveRecent(updated);
      onSelect(emoji);
      onClose();
    },
    [recentEmojis, onSelect, onClose],
  );

  const allEmojis = useMemo(() => {
    const all: EmojiEntry[] = [];
    for (const entries of Object.values(EMOJI_DATA)) {
      all.push(...entries);
    }
    return all;
  }, []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allEmojis.filter(e => e.name.toLowerCase().includes(q));
  }, [search, allEmojis]);

  const scrollToCategory = (key: CategoryKey) => {
    setActiveCategory(key);
    const el = categoryRefs.current[key];
    if (el && gridRef.current) {
      gridRef.current.scrollTo({
        top: el.offsetTop - gridRef.current.offsetTop,
        behavior: 'smooth',
      });
    }
  };

  const renderGrid = (entries: EmojiEntry[] | string[]) => (
    <div className="grid grid-cols-6 gap-0.5">
      {entries.map((item, i) => {
        const emoji = typeof item === 'string' ? item : item.emoji;
        const name = typeof item === 'string' ? emoji : item.name;
        return (
          <button
            key={`${emoji}-${i}`}
            onClick={() => handleSelect(emoji)}
            onMouseEnter={() => setHoveredEmoji(name)}
            onMouseLeave={() => setHoveredEmoji(null)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-white/10"
            title={name}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 z-50 mb-2 flex flex-col overflow-hidden rounded-xl shadow-xl"
      style={{
        width: 320,
        height: 400,
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-1)',
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--color-border-1)' }}>
        <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
          style={{ color: 'var(--color-text-primary)' }}
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="flex-shrink-0">
            <X className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      {!searchResults && (
        <div
          className="flex items-center gap-0.5 border-b px-1 py-1"
          style={{ borderColor: 'var(--color-border-1)' }}
        >
          {CATEGORIES.map(key => (
            <button
              key={key}
              onClick={() => scrollToCategory(key)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors"
              style={{
                backgroundColor: activeCategory === key ? 'var(--color-surface-1)' : 'transparent',
              }}
              title={CATEGORY_LABELS[key]}
            >
              {CATEGORY_ICONS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div ref={gridRef} className="flex-1 overflow-y-auto px-2 py-1" style={{ scrollBehavior: 'smooth' }}>
        {searchResults ? (
          <div className="py-1">
            {searchResults.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No emoji found
              </p>
            ) : (
              renderGrid(searchResults)
            )}
          </div>
        ) : (
          <>
            {/* Recent */}
            {recentEmojis.length > 0 && (
              <div ref={el => (categoryRefs.current['recent'] = el)}>
                <p
                  className="sticky top-0 z-10 py-1 text-xs font-semibold"
                  style={{
                    color: 'var(--color-text-muted)',
                    backgroundColor: 'var(--color-surface-2)',
                  }}
                >
                  {CATEGORY_LABELS.recent}
                </p>
                {renderGrid(recentEmojis)}
              </div>
            )}

            {/* All categories */}
            {(Object.keys(EMOJI_DATA) as Array<Exclude<CategoryKey, 'recent'>>).map(key => (
              <div key={key} ref={el => (categoryRefs.current[key] = el)}>
                <p
                  className="sticky top-0 z-10 py-1 text-xs font-semibold"
                  style={{
                    color: 'var(--color-text-muted)',
                    backgroundColor: 'var(--color-surface-2)',
                  }}
                >
                  {CATEGORY_LABELS[key]}
                </p>
                {renderGrid(EMOJI_DATA[key])}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex h-7 items-center border-t px-3"
        style={{ borderColor: 'var(--color-border-1)' }}
      >
        <span className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {hoveredEmoji || 'Pick an emoji'}
        </span>
      </div>
    </div>
  );
};

export default EmojiPicker;
