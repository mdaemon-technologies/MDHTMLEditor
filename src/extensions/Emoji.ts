/**
 * EmojiPicker
 * Emoji selection dialog
 */

export interface EmojiPickerOptions {
  onSelect: (emoji: string) => void;
  trans: (key: string) => string;
}

// Emoji categories with commonly used emojis
export const EMOJI_CATEGORIES: Array<{ category: string; icon: string; emojis: string[] }> = [
  {
    category: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
      '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
      '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
      '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
      '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯',
      '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
      '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
      '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
    ],
  },
  {
    category: 'Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂',
      '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
      '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩',
    ],
  },
  {
    category: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
      '💋', '💌', '💐', '🌹', '🥀', '🌷', '🌸', '💮', '🏵️', '🌻',
    ],
  },
  {
    category: 'Objects',
    icon: '📧',
    emojis: [
      '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭',
      '📮', '📝', '💼', '📁', '📂', '📅', '📆', '📇', '📈', '📉',
      '📊', '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '📒', '📓',
      '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📰', '🔖', '🏷️',
      '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💹', '✉️',
    ],
  },
  {
    category: 'Symbols',
    icon: '✅',
    emojis: [
      '✅', '❌', '❓', '❗', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡',
      '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹',
      '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '▪️', '▫️', '◾', '◽',
      '◼️', '◻️', '⬛', '⬜', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪',
      '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💥', '🎉', '🎊', '🏆',
      '🥇', '🥈', '🥉', '🏅', '🎖️', '📣', '📢', '🔔', '🔕', '🎵',
    ],
  },
  {
    category: 'Arrows',
    icon: '➡️',
    emojis: [
      '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️',
      '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜',
      '🔝', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔀', '🔁',
      '🔂', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '📳',
    ],
  },
];

// English name and search keywords for every emoji in EMOJI_CATEGORIES
export const EMOJI_DATA: Record<string, { name: string; keywords: string[] }> = {
  // Smileys
  '😀': { name: 'grinning face', keywords: ['smile', 'happy', 'grin'] },
  '😃': { name: 'grinning face with big eyes', keywords: ['smile', 'happy', 'joy'] },
  '😄': { name: 'grinning face with smiling eyes', keywords: ['smile', 'happy', 'laugh'] },
  '😁': { name: 'beaming face with smiling eyes', keywords: ['grin', 'smile', 'happy'] },
  '😆': { name: 'grinning squinting face', keywords: ['laugh', 'happy', 'smile'] },
  '😅': { name: 'grinning face with sweat', keywords: ['smile', 'nervous', 'relief'] },
  '🤣': { name: 'rolling on the floor laughing', keywords: ['laugh', 'lol', 'rofl'] },
  '😂': { name: 'face with tears of joy', keywords: ['laugh', 'lol', 'cry'] },
  '🙂': { name: 'slightly smiling face', keywords: ['smile'] },
  '🙃': { name: 'upside-down face', keywords: ['silly', 'sarcasm'] },
  '😉': { name: 'winking face', keywords: ['wink', 'flirt'] },
  '😊': { name: 'smiling face with smiling eyes', keywords: ['blush', 'smile', 'happy'] },
  '😇': { name: 'smiling face with halo', keywords: ['angel', 'innocent'] },
  '🥰': { name: 'smiling face with hearts', keywords: ['love', 'adore', 'crush'] },
  '😍': { name: 'smiling face with heart-eyes', keywords: ['love', 'crush'] },
  '🤩': { name: 'star-struck', keywords: ['star', 'excited', 'wow'] },
  '😘': { name: 'face blowing a kiss', keywords: ['kiss', 'love'] },
  '😗': { name: 'kissing face', keywords: ['kiss'] },
  '☺️': { name: 'smiling face', keywords: ['smile', 'happy'] },
  '😚': { name: 'kissing face with closed eyes', keywords: ['kiss'] },
  '😙': { name: 'kissing face with smiling eyes', keywords: ['kiss'] },
  '🥲': { name: 'smiling face with tear', keywords: ['grateful', 'proud', 'relieved'] },
  '😋': { name: 'face savoring food', keywords: ['yum', 'delicious', 'tongue'] },
  '😛': { name: 'face with tongue', keywords: ['tongue', 'silly'] },
  '😜': { name: 'winking face with tongue', keywords: ['tongue', 'silly', 'joke'] },
  '🤪': { name: 'zany face', keywords: ['crazy', 'silly', 'goofy'] },
  '😝': { name: 'squinting face with tongue', keywords: ['tongue', 'silly'] },
  '🤑': { name: 'money-mouth face', keywords: ['money', 'rich'] },
  '🤗': { name: 'hugging face', keywords: ['hug'] },
  '🤭': { name: 'face with hand over mouth', keywords: ['oops', 'giggle'] },
  '🤫': { name: 'shushing face', keywords: ['quiet', 'shh', 'secret'] },
  '🤔': { name: 'thinking face', keywords: ['think', 'hmm'] },
  '🤐': { name: 'zipper-mouth face', keywords: ['secret', 'quiet'] },
  '🤨': { name: 'face with raised eyebrow', keywords: ['skeptical', 'doubt'] },
  '😐': { name: 'neutral face', keywords: ['meh'] },
  '😑': { name: 'expressionless face', keywords: ['blank', 'meh'] },
  '😶': { name: 'face without mouth', keywords: ['silent', 'speechless'] },
  '😏': { name: 'smirking face', keywords: ['smirk'] },
  '😒': { name: 'unamused face', keywords: ['unhappy', 'annoyed'] },
  '🙄': { name: 'face with rolling eyes', keywords: ['eye roll', 'annoyed'] },
  '😬': { name: 'grimacing face', keywords: ['grimace', 'awkward'] },
  '🤥': { name: 'lying face', keywords: ['lie', 'pinocchio'] },
  '😌': { name: 'relieved face', keywords: ['relief', 'calm'] },
  '😔': { name: 'pensive face', keywords: ['sad', 'dejected'] },
  '😪': { name: 'sleepy face', keywords: ['tired', 'sleep'] },
  '🤤': { name: 'drooling face', keywords: ['drool'] },
  '😴': { name: 'sleeping face', keywords: ['sleep', 'tired', 'zzz'] },
  '😷': { name: 'face with medical mask', keywords: ['sick', 'mask', 'ill'] },
  '🤒': { name: 'face with thermometer', keywords: ['sick', 'ill', 'fever'] },
  '🤕': { name: 'face with head-bandage', keywords: ['hurt', 'injury'] },
  '🤢': { name: 'nauseated face', keywords: ['sick', 'nausea'] },
  '🤮': { name: 'face vomiting', keywords: ['sick', 'vomit'] },
  '🤧': { name: 'sneezing face', keywords: ['sneeze', 'sick', 'cold'] },
  '🥵': { name: 'hot face', keywords: ['hot', 'heat', 'sweat'] },
  '🥶': { name: 'cold face', keywords: ['cold', 'freezing'] },
  '🥴': { name: 'woozy face', keywords: ['dizzy', 'drunk'] },
  '😵': { name: 'face with crossed-out eyes', keywords: ['dizzy', 'dead'] },
  '🤯': { name: 'exploding head', keywords: ['mind blown', 'shocked'] },
  '🤠': { name: 'cowboy hat face', keywords: ['cowboy'] },
  '🥳': { name: 'partying face', keywords: ['party', 'celebration', 'birthday'] },
  '🥸': { name: 'disguised face', keywords: ['disguise', 'incognito'] },
  '😎': { name: 'smiling face with sunglasses', keywords: ['cool', 'sunglasses'] },
  '🤓': { name: 'nerd face', keywords: ['nerd', 'geek'] },
  '🧐': { name: 'face with monocle', keywords: ['monocle'] },
  '😕': { name: 'confused face', keywords: ['confused'] },
  '😟': { name: 'worried face', keywords: ['worried'] },
  '🙁': { name: 'slightly frowning face', keywords: ['frown', 'sad'] },
  '☹️': { name: 'frowning face', keywords: ['frown', 'sad'] },
  '😮': { name: 'face with open mouth', keywords: ['surprised', 'wow'] },
  '😯': { name: 'hushed face', keywords: ['surprised'] },
  '😲': { name: 'astonished face', keywords: ['shocked', 'surprised'] },
  '😳': { name: 'flushed face', keywords: ['embarrassed', 'blush'] },
  '🥺': { name: 'pleading face', keywords: ['please', 'puppy eyes'] },
  '😦': { name: 'frowning face with open mouth', keywords: ['frown'] },
  '😧': { name: 'anguished face', keywords: ['anguish'] },
  '😨': { name: 'fearful face', keywords: ['fear', 'scared'] },
  '😰': { name: 'anxious face with sweat', keywords: ['anxious', 'nervous'] },
  '😥': { name: 'sad but relieved face', keywords: ['sad', 'relieved'] },
  '😢': { name: 'crying face', keywords: ['cry', 'sad', 'tear'] },
  '😭': { name: 'loudly crying face', keywords: ['cry', 'sob', 'sad'] },
  '😱': { name: 'face screaming in fear', keywords: ['scream', 'scared'] },
  '😖': { name: 'confounded face', keywords: ['confounded'] },
  '😣': { name: 'persevering face', keywords: ['persevere'] },
  '😞': { name: 'disappointed face', keywords: ['sad', 'disappointed'] },
  '😓': { name: 'downcast face with sweat', keywords: ['sweat'] },
  '😩': { name: 'weary face', keywords: ['tired', 'weary'] },
  '😫': { name: 'tired face', keywords: ['tired'] },
  '🥱': { name: 'yawning face', keywords: ['yawn', 'bored', 'tired'] },
  '😤': { name: 'face with steam from nose', keywords: ['triumph', 'frustrated'] },
  '😡': { name: 'enraged face', keywords: ['angry', 'mad', 'rage', 'pouting'] },
  '😠': { name: 'angry face', keywords: ['angry', 'mad'] },
  '🤬': { name: 'face with symbols on mouth', keywords: ['swearing', 'cursing', 'angry'] },
  '😈': { name: 'smiling face with horns', keywords: ['devil', 'evil'] },
  '👿': { name: 'angry face with horns', keywords: ['devil', 'imp'] },
  '💀': { name: 'skull', keywords: ['dead', 'death'] },
  '☠️': { name: 'skull and crossbones', keywords: ['poison', 'danger', 'pirate'] },
  '💩': { name: 'pile of poo', keywords: ['poop'] },
  '🤡': { name: 'clown face', keywords: ['clown'] },
  '👹': { name: 'ogre', keywords: ['monster'] },
  '👺': { name: 'goblin', keywords: ['monster'] },
  // Gestures
  '👋': { name: 'waving hand', keywords: ['wave', 'hello', 'bye'] },
  '🤚': { name: 'raised back of hand', keywords: ['hand'] },
  '🖐️': { name: 'hand with fingers splayed', keywords: ['hand'] },
  '✋': { name: 'raised hand', keywords: ['hand', 'stop', 'high five'] },
  '🖖': { name: 'vulcan salute', keywords: ['spock'] },
  '👌': { name: 'ok hand', keywords: ['ok', 'okay', 'perfect'] },
  '🤌': { name: 'pinched fingers', keywords: ['italian'] },
  '🤏': { name: 'pinching hand', keywords: ['small', 'tiny'] },
  '✌️': { name: 'victory hand', keywords: ['peace', 'victory'] },
  '🤞': { name: 'crossed fingers', keywords: ['luck', 'hope'] },
  '🤟': { name: 'love-you gesture', keywords: ['love you'] },
  '🤘': { name: 'sign of the horns', keywords: ['rock'] },
  '🤙': { name: 'call me hand', keywords: ['call', 'shaka'] },
  '👈': { name: 'backhand index pointing left', keywords: ['point', 'left'] },
  '👉': { name: 'backhand index pointing right', keywords: ['point', 'right'] },
  '👆': { name: 'backhand index pointing up', keywords: ['point', 'up'] },
  '🖕': { name: 'middle finger', keywords: ['finger'] },
  '👇': { name: 'backhand index pointing down', keywords: ['point', 'down'] },
  '☝️': { name: 'index pointing up', keywords: ['point', 'up'] },
  '👍': { name: 'thumbs up', keywords: ['like', 'yes', 'approve', '+1'] },
  '👎': { name: 'thumbs down', keywords: ['dislike', 'no', '-1'] },
  '✊': { name: 'raised fist', keywords: ['fist', 'power'] },
  '👊': { name: 'oncoming fist', keywords: ['punch', 'fist bump'] },
  '🤛': { name: 'left-facing fist', keywords: ['fist bump'] },
  '🤜': { name: 'right-facing fist', keywords: ['fist bump'] },
  '👏': { name: 'clapping hands', keywords: ['clap', 'applause', 'bravo'] },
  '🙌': { name: 'raising hands', keywords: ['hooray', 'celebration', 'praise'] },
  '👐': { name: 'open hands', keywords: ['hands'] },
  '🤲': { name: 'palms up together', keywords: ['prayer', 'cupped hands'] },
  '🤝': { name: 'handshake', keywords: ['agreement', 'deal', 'meeting'] },
  '🙏': { name: 'folded hands', keywords: ['please', 'pray', 'thanks'] },
  '✍️': { name: 'writing hand', keywords: ['write'] },
  '💅': { name: 'nail polish', keywords: ['nails', 'manicure'] },
  '🤳': { name: 'selfie', keywords: ['phone', 'camera'] },
  '💪': { name: 'flexed biceps', keywords: ['strong', 'muscle'] },
  '🦾': { name: 'mechanical arm', keywords: ['prosthetic', 'robot'] },
  '🦵': { name: 'leg', keywords: ['kick'] },
  '🦿': { name: 'mechanical leg', keywords: ['prosthetic', 'robot'] },
  '🦶': { name: 'foot', keywords: ['kick', 'step'] },
  '👂': { name: 'ear', keywords: ['listen', 'hear'] },
  '🦻': { name: 'ear with hearing aid', keywords: ['hearing', 'deaf'] },
  '👃': { name: 'nose', keywords: ['smell'] },
  '🧠': { name: 'brain', keywords: ['smart', 'intelligent'] },
  '🫀': { name: 'anatomical heart', keywords: ['organ', 'heartbeat'] },
  '🫁': { name: 'lungs', keywords: ['breath', 'organ'] },
  '🦷': { name: 'tooth', keywords: ['dentist'] },
  '🦴': { name: 'bone', keywords: ['skeleton'] },
  '👀': { name: 'eyes', keywords: ['look', 'see', 'watch'] },
  '👁️': { name: 'eye', keywords: ['look', 'see'] },
  '👅': { name: 'tongue', keywords: ['lick'] },
  '👄': { name: 'mouth', keywords: ['lips'] },
  '👶': { name: 'baby', keywords: ['child', 'infant'] },
  '🧒': { name: 'child', keywords: ['kid'] },
  '👦': { name: 'boy', keywords: ['child', 'kid'] },
  '👧': { name: 'girl', keywords: ['child', 'kid'] },
  '🧑': { name: 'person', keywords: ['adult'] },
  '👱': { name: 'person: blond hair', keywords: ['blond'] },
  '👨': { name: 'man', keywords: ['adult'] },
  '🧔': { name: 'person: beard', keywords: ['beard'] },
  '👩': { name: 'woman', keywords: ['adult'] },
  // Hearts
  '❤️': { name: 'red heart', keywords: ['love'] },
  '🧡': { name: 'orange heart', keywords: ['love'] },
  '💛': { name: 'yellow heart', keywords: ['love'] },
  '💚': { name: 'green heart', keywords: ['love'] },
  '💙': { name: 'blue heart', keywords: ['love'] },
  '💜': { name: 'purple heart', keywords: ['love'] },
  '🖤': { name: 'black heart', keywords: ['love'] },
  '🤍': { name: 'white heart', keywords: ['love'] },
  '🤎': { name: 'brown heart', keywords: ['love'] },
  '💔': { name: 'broken heart', keywords: ['heartbreak', 'sad'] },
  '❣️': { name: 'heart exclamation', keywords: ['love'] },
  '💕': { name: 'two hearts', keywords: ['love'] },
  '💞': { name: 'revolving hearts', keywords: ['love'] },
  '💓': { name: 'beating heart', keywords: ['love', 'heartbeat'] },
  '💗': { name: 'growing heart', keywords: ['love'] },
  '💖': { name: 'sparkling heart', keywords: ['love'] },
  '💘': { name: 'heart with arrow', keywords: ['love', 'cupid'] },
  '💝': { name: 'heart with ribbon', keywords: ['love', 'gift', 'valentine'] },
  '💟': { name: 'heart decoration', keywords: ['love'] },
  '♥️': { name: 'heart suit', keywords: ['love', 'cards'] },
  '💋': { name: 'kiss mark', keywords: ['kiss', 'lips'] },
  '💌': { name: 'love letter', keywords: ['letter', 'mail'] },
  '💐': { name: 'bouquet', keywords: ['flowers'] },
  '🌹': { name: 'rose', keywords: ['flower', 'love'] },
  '🥀': { name: 'wilted flower', keywords: ['sad'] },
  '🌷': { name: 'tulip', keywords: ['flower'] },
  '🌸': { name: 'cherry blossom', keywords: ['flower', 'spring'] },
  '💮': { name: 'white flower', keywords: ['flower'] },
  '🏵️': { name: 'rosette', keywords: ['flower'] },
  '🌻': { name: 'sunflower', keywords: ['flower', 'sun'] },
  // Objects
  '📧': { name: 'e-mail', keywords: ['email', 'mail', 'message'] },
  '📨': { name: 'incoming envelope', keywords: ['email', 'mail', 'receive'] },
  '📩': { name: 'envelope with arrow', keywords: ['email', 'mail', 'send'] },
  '📤': { name: 'outbox tray', keywords: ['outbox', 'sent', 'send'] },
  '📥': { name: 'inbox tray', keywords: ['inbox', 'receive'] },
  '📦': { name: 'package', keywords: ['box', 'parcel', 'delivery'] },
  '📫': { name: 'closed mailbox with raised flag', keywords: ['mail'] },
  '📪': { name: 'closed mailbox with lowered flag', keywords: ['mail'] },
  '📬': { name: 'open mailbox with raised flag', keywords: ['mail'] },
  '📭': { name: 'open mailbox with lowered flag', keywords: ['mail'] },
  '📮': { name: 'postbox', keywords: ['mail', 'post'] },
  '📝': { name: 'memo', keywords: ['note', 'write', 'pencil'] },
  '💼': { name: 'briefcase', keywords: ['work', 'business', 'office'] },
  '📁': { name: 'file folder', keywords: ['directory'] },
  '📂': { name: 'open file folder', keywords: ['directory'] },
  '📅': { name: 'calendar', keywords: ['date', 'schedule'] },
  '📆': { name: 'tear-off calendar', keywords: ['date', 'schedule'] },
  '📇': { name: 'card index', keywords: ['rolodex', 'contacts'] },
  '📈': { name: 'chart increasing', keywords: ['graph', 'growth', 'up'] },
  '📉': { name: 'chart decreasing', keywords: ['graph', 'down'] },
  '📊': { name: 'bar chart', keywords: ['graph', 'statistics'] },
  '📋': { name: 'clipboard', keywords: ['list'] },
  '📌': { name: 'pushpin', keywords: ['pin'] },
  '📍': { name: 'round pushpin', keywords: ['pin', 'location'] },
  '📎': { name: 'paperclip', keywords: ['attachment', 'clip'] },
  '📏': { name: 'straight ruler', keywords: ['measure'] },
  '📐': { name: 'triangular ruler', keywords: ['triangle', 'measure'] },
  '✂️': { name: 'scissors', keywords: ['cut'] },
  '📒': { name: 'ledger', keywords: ['notebook'] },
  '📓': { name: 'notebook', keywords: ['notes'] },
  '📔': { name: 'notebook with decorative cover', keywords: ['notes'] },
  '📕': { name: 'closed book', keywords: ['book', 'red'] },
  '📖': { name: 'open book', keywords: ['book', 'read'] },
  '📗': { name: 'green book', keywords: ['book'] },
  '📘': { name: 'blue book', keywords: ['book'] },
  '📙': { name: 'orange book', keywords: ['book'] },
  '📚': { name: 'books', keywords: ['library', 'read'] },
  '📰': { name: 'newspaper', keywords: ['news'] },
  '🔖': { name: 'bookmark', keywords: ['tag'] },
  '🏷️': { name: 'label', keywords: ['tag'] },
  '💰': { name: 'money bag', keywords: ['money', 'dollar'] },
  '💴': { name: 'yen banknote', keywords: ['money', 'yen'] },
  '💵': { name: 'dollar banknote', keywords: ['money', 'dollar'] },
  '💶': { name: 'euro banknote', keywords: ['money', 'euro'] },
  '💷': { name: 'pound banknote', keywords: ['money', 'pound'] },
  '💸': { name: 'money with wings', keywords: ['money', 'spend'] },
  '💳': { name: 'credit card', keywords: ['card', 'payment'] },
  '🧾': { name: 'receipt', keywords: ['invoice'] },
  '💹': { name: 'chart increasing with yen', keywords: ['market', 'graph'] },
  '✉️': { name: 'envelope', keywords: ['email', 'mail', 'letter'] },
  // Symbols
  '✅': { name: 'check mark button', keywords: ['check', 'done', 'yes'] },
  '❌': { name: 'cross mark', keywords: ['no', 'wrong', 'delete'] },
  '❓': { name: 'red question mark', keywords: ['question'] },
  '❗': { name: 'red exclamation mark', keywords: ['exclamation', 'important'] },
  '‼️': { name: 'double exclamation mark', keywords: ['exclamation'] },
  '⁉️': { name: 'exclamation question mark', keywords: ['exclamation', 'question'] },
  '💯': { name: 'hundred points', keywords: ['100', 'perfect', 'score'] },
  '🔴': { name: 'red circle', keywords: ['circle'] },
  '🟠': { name: 'orange circle', keywords: ['circle'] },
  '🟡': { name: 'yellow circle', keywords: ['circle'] },
  '🟢': { name: 'green circle', keywords: ['circle'] },
  '🔵': { name: 'blue circle', keywords: ['circle'] },
  '🟣': { name: 'purple circle', keywords: ['circle'] },
  '⚫': { name: 'black circle', keywords: ['circle'] },
  '⚪': { name: 'white circle', keywords: ['circle'] },
  '🟤': { name: 'brown circle', keywords: ['circle'] },
  '🔶': { name: 'large orange diamond', keywords: ['diamond'] },
  '🔷': { name: 'large blue diamond', keywords: ['diamond'] },
  '🔸': { name: 'small orange diamond', keywords: ['diamond'] },
  '🔹': { name: 'small blue diamond', keywords: ['diamond'] },
  '🔺': { name: 'red triangle pointed up', keywords: ['triangle', 'up'] },
  '🔻': { name: 'red triangle pointed down', keywords: ['triangle', 'down'] },
  '💠': { name: 'diamond with a dot', keywords: ['diamond'] },
  '🔘': { name: 'radio button', keywords: ['radio'] },
  '🔳': { name: 'white square button', keywords: ['square'] },
  '🔲': { name: 'black square button', keywords: ['square'] },
  '▪️': { name: 'black small square', keywords: ['square'] },
  '▫️': { name: 'white small square', keywords: ['square'] },
  '◾': { name: 'black medium-small square', keywords: ['square'] },
  '◽': { name: 'white medium-small square', keywords: ['square'] },
  '◼️': { name: 'black medium square', keywords: ['square'] },
  '◻️': { name: 'white medium square', keywords: ['square'] },
  '⬛': { name: 'black large square', keywords: ['square'] },
  '⬜': { name: 'white large square', keywords: ['square'] },
  '🟥': { name: 'red square', keywords: ['square'] },
  '🟧': { name: 'orange square', keywords: ['square'] },
  '🟨': { name: 'yellow square', keywords: ['square'] },
  '🟩': { name: 'green square', keywords: ['square'] },
  '🟦': { name: 'blue square', keywords: ['square'] },
  '🟪': { name: 'purple square', keywords: ['square'] },
  '⭐': { name: 'star', keywords: ['favorite'] },
  '🌟': { name: 'glowing star', keywords: ['star', 'shine'] },
  '✨': { name: 'sparkles', keywords: ['sparkle', 'shine', 'magic'] },
  '💫': { name: 'dizzy', keywords: ['star'] },
  '⚡': { name: 'high voltage', keywords: ['lightning', 'electricity', 'power'] },
  '🔥': { name: 'fire', keywords: ['hot', 'flame'] },
  '💥': { name: 'collision', keywords: ['boom', 'explosion'] },
  '🎉': { name: 'party popper', keywords: ['party', 'celebration', 'tada'] },
  '🎊': { name: 'confetti ball', keywords: ['party', 'celebration'] },
  '🏆': { name: 'trophy', keywords: ['win', 'award', 'prize'] },
  '🥇': { name: '1st place medal', keywords: ['gold', 'first', 'award'] },
  '🥈': { name: '2nd place medal', keywords: ['silver', 'second', 'award'] },
  '🥉': { name: '3rd place medal', keywords: ['bronze', 'third', 'award'] },
  '🏅': { name: 'sports medal', keywords: ['award'] },
  '🎖️': { name: 'military medal', keywords: ['award'] },
  '📣': { name: 'megaphone', keywords: ['announcement'] },
  '📢': { name: 'loudspeaker', keywords: ['announcement', 'loud'] },
  '🔔': { name: 'bell', keywords: ['notification'] },
  '🔕': { name: 'bell with slash', keywords: ['mute', 'silent'] },
  '🎵': { name: 'musical note', keywords: ['music'] },
  // Arrows
  '➡️': { name: 'right arrow', keywords: ['right'] },
  '⬅️': { name: 'left arrow', keywords: ['left'] },
  '⬆️': { name: 'up arrow', keywords: ['up'] },
  '⬇️': { name: 'down arrow', keywords: ['down'] },
  '↗️': { name: 'up-right arrow', keywords: ['diagonal'] },
  '↘️': { name: 'down-right arrow', keywords: ['diagonal'] },
  '↙️': { name: 'down-left arrow', keywords: ['diagonal'] },
  '↖️': { name: 'up-left arrow', keywords: ['diagonal'] },
  '↕️': { name: 'up-down arrow', keywords: ['vertical'] },
  '↔️': { name: 'left-right arrow', keywords: ['horizontal'] },
  '↩️': { name: 'right arrow curving left', keywords: ['return', 'back'] },
  '↪️': { name: 'left arrow curving right', keywords: ['forward'] },
  '⤴️': { name: 'right arrow curving up', keywords: ['up'] },
  '⤵️': { name: 'right arrow curving down', keywords: ['down'] },
  '🔃': { name: 'clockwise vertical arrows', keywords: ['refresh', 'reload'] },
  '🔄': { name: 'counterclockwise arrows button', keywords: ['refresh', 'sync'] },
  '🔙': { name: 'back arrow', keywords: ['back'] },
  '🔚': { name: 'end arrow', keywords: ['end'] },
  '🔛': { name: 'on! arrow', keywords: ['on'] },
  '🔜': { name: 'soon arrow', keywords: ['soon'] },
  '🔝': { name: 'top arrow', keywords: ['top'] },
  '▶️': { name: 'play button', keywords: ['play'] },
  '⏩': { name: 'fast-forward button', keywords: ['fast forward'] },
  '⏭️': { name: 'next track button', keywords: ['next', 'skip'] },
  '⏯️': { name: 'play or pause button', keywords: ['play', 'pause'] },
  '◀️': { name: 'reverse button', keywords: ['back'] },
  '⏪': { name: 'fast reverse button', keywords: ['rewind'] },
  '⏮️': { name: 'last track button', keywords: ['previous'] },
  '🔀': { name: 'shuffle tracks button', keywords: ['shuffle', 'random'] },
  '🔁': { name: 'repeat button', keywords: ['repeat', 'loop'] },
  '🔂': { name: 'repeat single button', keywords: ['repeat'] },
  '⏸️': { name: 'pause button', keywords: ['pause'] },
  '⏹️': { name: 'stop button', keywords: ['stop'] },
  '⏺️': { name: 'record button', keywords: ['record'] },
  '⏏️': { name: 'eject button', keywords: ['eject'] },
  '🎦': { name: 'cinema', keywords: ['movie', 'film'] },
  '🔅': { name: 'dim button', keywords: ['brightness'] },
  '🔆': { name: 'bright button', keywords: ['brightness'] },
  '📶': { name: 'antenna bars', keywords: ['signal', 'wifi'] },
  '📳': { name: 'vibration mode', keywords: ['vibrate', 'phone'] },
};

// Emoji presentation selector and skin tones, ignored when comparing a pasted emoji
const IGNORED_MARKS = /[\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu;

// True when the word starts the text, or starts a word in it (after a space, hyphen or other punctuation)
function startsWord(text: string, word: string): boolean {
  for (let i = text.indexOf(word); i !== -1; i = text.indexOf(word, i + 1)) {
    if (i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1])) {
      return true;
    }
  }
  return false;
}

// Emojis whose name or keywords have a word starting with each word of the query, or that are the query itself
function searchEmojis(query: string): string[] {
  const pasted = query.replace(IGNORED_MARKS, '');
  const words = query.split(/\s+/);
  return EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(emoji => {
    if (emoji.replace(IGNORED_MARKS, '') === pasted) {
      return true;
    }
    const data = EMOJI_DATA[emoji];
    if (!data) {
      return false;
    }
    const texts = [data.name, ...data.keywords];
    return words.every(word => texts.some(text => startsWord(text, word)));
  });
}

export class EmojiPicker {
  private options: EmojiPickerOptions;
  private overlay: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private tabs: HTMLElement | null = null;
  private emojiContainer: HTMLElement | null = null;

  constructor(options: EmojiPickerOptions) {
    this.options = options;
  }

  open(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      if (this.searchInput?.value) {
        // Start fresh rather than showing the last search's results
        this.searchInput.value = '';
        this.showCategory(0);
      }
      this.searchInput?.focus();
      return;
    }
    
    this.createDialog();
  }
  
  close(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }
  
  private createDialog(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'md-dialog-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    
    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'md-dialog md-emoji-dialog';
    
    // Header
    const header = document.createElement('div');
    header.className = 'md-dialog-header';
    header.innerHTML = `
      <h3>${this.options.trans('Emoticons')}</h3>
      <button type="button" class="md-dialog-close">×</button>
    `;
    header.querySelector('.md-dialog-close')?.addEventListener('click', () => this.close());
    
    // Search
    const searchContainer = document.createElement('div');
    searchContainer.className = 'md-emoji-search';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = this.options.trans('Search...');
    this.searchInput.className = 'md-emoji-search-input';
    searchContainer.appendChild(this.searchInput);
    
    // Body with tabs
    const body = document.createElement('div');
    body.className = 'md-dialog-body md-emoji-body';
    
    // Category tabs
    const tabs = document.createElement('div');
    tabs.className = 'md-emoji-tabs';
    this.tabs = tabs;

    const emojiContainer = document.createElement('div');
    emojiContainer.className = 'md-emoji-container';
    this.emojiContainer = emojiContainer;

    EMOJI_CATEGORIES.forEach((category, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'md-emoji-tab';
      tab.textContent = category.icon;
      tab.title = category.category;
      tab.addEventListener('click', () => {
        this.showCategory(index);
        if (this.searchInput) {
          this.searchInput.value = '';
        }
      });
      tabs.appendChild(tab);
    });

    // Search handler
    this.searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
      if (query) {
        // Search all categories
        this.renderEmojis(emojiContainer, searchEmojis(query));
        tabs.querySelectorAll('.md-emoji-tab').forEach(t => t.classList.remove('md-emoji-tab-active'));
      } else {
        this.showCategory(0);
      }
    });

    // Initial render
    this.showCategory(0);
    
    body.appendChild(tabs);
    body.appendChild(searchContainer);
    body.appendChild(emojiContainer);
    
    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
    
    this.searchInput.focus();
  }
  
  // Highlights a category's tab, alone, and shows its emojis
  private showCategory(index: number): void {
    this.tabs?.querySelectorAll('.md-emoji-tab').forEach((t, i) => t.classList.toggle('md-emoji-tab-active', i === index));
    if (this.emojiContainer) {
      this.renderEmojis(this.emojiContainer, EMOJI_CATEGORIES[index].emojis);
    }
  }

  private renderEmojis(container: HTMLElement, emojis: string[]): void {
    container.innerHTML = '';

    if (emojis.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'md-emoji-empty';
      empty.textContent = this.options.trans('No emoticons found');
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'md-emoji-grid';

    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'md-emoji-btn';
      btn.textContent = emoji;
      // A tooltip, not aria-label: the emoji itself stays the button's accessible name
      btn.title = EMOJI_DATA[emoji]?.name ?? '';

      btn.addEventListener('click', () => {
        this.options.onSelect(emoji);
        this.close();
      });
      
      grid.appendChild(btn);
    });
    
    container.appendChild(grid);
  }
  
  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.dialog = null;
      this.searchInput = null;
      this.tabs = null;
      this.emojiContainer = null;
    }
  }
}
