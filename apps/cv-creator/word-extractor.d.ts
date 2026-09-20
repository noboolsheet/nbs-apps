// Declaración mínima de tipos para word-extractor (no trae los suyos).
declare module 'word-extractor' {
  export default class WordExtractor {
    extract(input: string | Buffer): Promise<{ getBody(): string }>;
  }
}
