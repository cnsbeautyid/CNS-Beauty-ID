// Lexical retrieval query for public.match_knowledge (owner decision: lexical
// first, embeddings later). websearch_to_tsquery ANDs plain words, so a whole
// question rarely matches; keywords are OR-ed instead and ts_rank orders by
// how many match. Pure, for unit tests.

const STOPWORDS = new Set([
  "ada", "adalah", "agar", "akan", "aku", "anda", "apa", "apakah", "atau", "bagaimana", "bagi", "bahwa", "banyak",
  "belum", "berapa", "bisa", "boleh", "buat", "cara", "dalam", "dan", "dari", "dengan", "di", "dong", "gimana",
  "harus", "ini", "itu", "jadi", "jika", "juga", "kah", "kalau", "kami", "kamu", "kan", "karena", "ke", "kok",
  "lagi", "lebih", "mana", "mau", "nya", "oleh", "pada", "para", "saja", "sama", "saya", "sih", "sudah", "supaya",
  "tapi", "tentang", "tidak", "tolong", "untuk", "yang", "ya", "ingin", "kenapa", "mengapa", "please", "the", "and",
]);

const MAX_TERMS = 8;

export function toLexicalQuery(text: string): string | null {
  const terms = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !STOPWORDS.has(term));
  const unique = [...new Set(terms)].slice(0, MAX_TERMS);
  return unique.length > 0 ? unique.join(" or ") : null;
}

export const KNOWLEDGE_CATEGORIES = ["brand", "shipping", "policy", "product", "ingredient", "faq"] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];
