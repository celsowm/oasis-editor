declare module "hypher" {
  interface HypherLanguage {
    id?: string;
    leftmin: number;
    rightmin: number;
    patterns: Record<number, string>;
    exceptions?: string;
  }
  class Hypher {
    constructor(language: HypherLanguage);
    /** Splits a word into its hyphenation syllables. */
    hyphenate(word: string): string[];
    hyphenateText(text: string, minLength?: number): string;
  }
  export default Hypher;
}

declare module "hyphenation.pt" {
  const language: {
    id: string;
    leftmin: number;
    rightmin: number;
    patterns: Record<number, string>;
    exceptions?: string;
  };
  export default language;
}

declare module "hyphenation.en-us" {
  const language: {
    id: string;
    leftmin: number;
    rightmin: number;
    patterns: Record<number, string>;
    exceptions?: string;
  };
  export default language;
}
