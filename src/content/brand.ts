/**
 * Founder and brand story copy shared by the homepage and About page.
 * Quote and philosophy come from the master prompt / PRD.
 */
export const BRAND_STORY = {
  founder: {
    eyebrow: "Cerita Kami",
    quote:
      "Karena cantik bukan hanya tentang bagaimana orang lain melihat kita. Cantik adalah tentang bagaimana kita melihat dan menghargai diri kita sendiri.",
    name: "Wina Ranesa",
    role: "Founder & Owner CNS Beauty",
    philosophy:
      "Merawat diri bukan sekadar tentang bagaimana kita terlihat, tetapi tentang menghargai diri sendiri, membangun kepercayaan diri, dan menciptakan ritual kecil untuk mencintai diri sendiri setiap hari.",
    cta: "Kenali CNS Beauty",
    /**
     * Founder-approved story, one string per paragraph. Intentionally empty:
     * we don't write the founder's personal story on her behalf. Until it is
     * provided, the section shows the quote and philosophy only.
     */
    story: [] as readonly string[],
  },
} as const;
