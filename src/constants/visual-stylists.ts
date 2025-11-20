/**
 * Visual Stylists List (Directors & Cinematographers)
 *
 * Curated list of influential directors and cinematographers with distinct visual signatures
 * used for applying cinematic styles to generated images via FIBO refinement.
 */

export const DIRECTORS = [
  "Agnès Varda",
  "Alfred Hitchcock",
  "Andrei Tarkovsky",
  "Atsuko Hirayanagi",
  "Bong Joon-ho",
  "Brian De Palma",
  "Chloé Zhao",
  "Christopher Nolan",
  "Dario Argento",
  "David Fincher",
  "David Lynch",
  "David O. Russell",
  "Denis Villeneuve",
  "Derek Cianfrance",
  "Edward Yang",
  "Gaspar Noé",
  "Hirokazu Kore-eda",
  "Joel Coen",
  "Krzysztof Kieslowski",
  "Lars von Trier",
  "Lee Chang-dong",
  "Leos Carax",
  "Martin Scorsese",
  "Matt Reeves",
  "Nicolas Winding Refn",
  "Oliver Stone",
  "Oz Perkins",
  "Park Chan-wook",
  "Pedro Almodóvar",
  "Quentin Tarantino",
  "Robert Altman",
  "Robert Bresson",
  "Roy Andersson",
  "Sam Raimi",
  "Stanley Kubrick",
  "Steven Soderbergh",
  "Terrence Malick",
  "Tobe Hooper",
  "Todd Haynes",
  "Wes Anderson",
  "Wong Kar-wai",
  "Yorgos Lanthimos",
] as const;

export const CINEMATOGRAPHERS = [
  "Bill Pope",
  "Bradford Young",
  "Bruno Delbonnel",
  "Christopher Doyle",
  "Claudio Miranda",
  "Conrad Hall",
  "Darius Khondji",
  "Emmanuel Lubezki",
  "Gordon Willis",
  "Gregg Toland",
  "Hoyte van Hoytema",
  "Janusz Kamiński",
  "Jeff Cronenweth",
  "Linus Sandgren",
  "Matthew Libatique",
  "Rachel Morrison",
  "Robert Richardson",
  "Robert Yeoman",
  "Rodrigo Prieto",
  "Roger Deakins",
  "Sven Nykvist",
  "Vittorio Storaro",
  "Wally Pfister",
] as const;

export const VISUAL_STYLISTS = [...DIRECTORS, ...CINEMATOGRAPHERS] as const;

export type VisualStylist = (typeof VISUAL_STYLISTS)[number];

/**
 * Randomly selects N unique visual stylists (directors or cinematographers) from the list
 *
 * @param count - Number of stylists to select
 * @returns Array of randomly selected stylist names
 *
 * @example
 * ```typescript
 * const stylists = selectRandomVisualStylists(4);
 * // ["Stanley Kubrick", "Roger Deakins", "Denis Villeneuve"]
 * ```
 */
export function selectRandomVisualStylists(count: number): string[] {
  if (count <= 0) {
    return [];
  }

  if (count >= VISUAL_STYLISTS.length) {
    return [...VISUAL_STYLISTS];
  }

  // Fisher-Yates shuffle for unbiased random selection
  const shuffled = [...VISUAL_STYLISTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}
