// 頭文字 (あかさたな行) 判定
const ROWS: Record<string, string> = {
  あ: "あいうえおぁぃぅぇぉ",
  か: "かきくけこがぎぐげご",
  さ: "さしすせそざじずぜぞ",
  た: "たちつてとだぢづでどっ",
  な: "なにぬねの",
  は: "はひふへほばびぶべぼぱぴぷぺぽ",
  ま: "まみむめも",
  や: "やゆよゃゅょ",
  ら: "らりるれろ",
  わ: "わをん",
};

function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function kanaRow(kana: string): string | null {
  const first = toHiragana(kana.trim()).charAt(0);
  for (const [row, chars] of Object.entries(ROWS)) {
    if (chars.includes(first)) return row;
  }
  return null;
}

export { toHiragana };
