/**
 * Film Directors List for Visual Style Application
 *
 * Curated list of influential directors with distinct visual signatures
 * used for applying cinematic styles to generated images via FIBO refinement.
 */

export const DIRECTORS = [
  "Agnès Varda",
  "Akira Kurosawa",
  "Alfred Hitchcock",
  "Andrei Tarkovsky",
  "Atsuko Hirayanagi",
  "Bong Joon-ho",
  "Brian De Palma",
  "Chloé Zhao",
  "Christopher Nolan",
  "Dario Argento",
  "David Cronenberg",
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

export type Director = (typeof DIRECTORS)[number];

/**
 * Randomly selects N unique directors from the list
 *
 * @param count - Number of directors to select
 * @returns Array of randomly selected director names
 *
 * @example
 * ```typescript
 * const directors = selectRandomDirectors(4);
 * // ["Stanley Kubrick", "Akira Kurosawa", "Wes Anderson", "Denis Villeneuve"]
 * ```
 */
export function selectRandomDirectors(count: number): string[] {
  if (count <= 0) {
    return [];
  }

  if (count >= DIRECTORS.length) {
    return [...DIRECTORS];
  }

  // Fisher-Yates shuffle for unbiased random selection
  const shuffled = [...DIRECTORS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}
