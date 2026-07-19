export interface ScriptChunk {
  index: number;
  content: string;
}

export function chunkScriptText(text: string, chunkSize: number = 1000, overlap: number = 200): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  if (!text || text.trim().length === 0) return chunks;

  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.substring(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({ index, content: chunkText });
      index++;
    }
    start += (chunkSize - overlap);
  }

  return chunks;
}
