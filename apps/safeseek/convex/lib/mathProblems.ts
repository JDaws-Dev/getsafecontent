/**
 * Deterministic math problem generator.
 *
 * WHY: a lesson's answer key has to be right. Asking a language model to write
 * both the problems and the answers means a confident wrong key marks a child's
 * correct answer wrong, which is the fastest way to lose a kid's trust in the
 * whole product — and a parent's. Arithmetic is the one subject where we can
 * simply compute the truth, so for the topics below we do, and the model is
 * only asked for the explainer.
 *
 * Returns null for anything it doesn't recognise; the caller falls back to
 * model-written questions for those.
 *
 * Pure functions, no Convex, no node APIs — importable from anywhere.
 */

export type GeneratedQuestion = {
  prompt: string;
  kind: "short" | "choice";
  choices?: string[];
  answer: string;
  explanation: string;
};

/** Deterministic-ish RNG so a given topic+day+kid yields a stable worksheet. */
function makeRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** Difficulty band from the kid's age. A 6-year-old and a 12-year-old are not doing the same sums. */
function bandFor(ageMin: number): 1 | 2 | 3 {
  if (ageMin <= 7) return 1;
  if (ageMin <= 10) return 2;
  return 3;
}

type Generator = (rng: () => number, band: 1 | 2 | 3) => GeneratedQuestion;

/**
 * Topic keyword → problem generator. First match wins, so more specific
 * phrases ("long division") are listed before general ones ("division").
 */
const TOPIC_GENERATORS: Array<{ match: RegExp; gen: Generator }> = [
  {
    match: /\blong division\b/i,
    gen: (rng, band) => {
      const divisor = band === 1 ? randInt(rng, 2, 5) : band === 2 ? randInt(rng, 3, 9) : randInt(rng, 11, 25);
      const quotient = band === 1 ? randInt(rng, 3, 12) : band === 2 ? randInt(rng, 12, 99) : randInt(rng, 20, 200);
      const remainder = randInt(rng, 0, divisor - 1);
      const dividend = divisor * quotient + remainder;
      const answer = remainder === 0 ? `${quotient}` : `${quotient} r${remainder}`;
      return {
        prompt: `${dividend} ÷ ${divisor} = ?${remainder === 0 ? "" : " (write the remainder as r, like 12 r3)"}`,
        kind: "short",
        answer,
        explanation:
          remainder === 0
            ? `${divisor} goes into ${dividend} exactly ${quotient} times.`
            : `${divisor} × ${quotient} = ${divisor * quotient}, and ${dividend} − ${divisor * quotient} = ${remainder} left over.`,
      };
    },
  },
  {
    match: /\b(divid|division|quotient)\w*\b/i,
    gen: (rng, band) => {
      const divisor = band === 1 ? randInt(rng, 2, 5) : band === 2 ? randInt(rng, 2, 10) : randInt(rng, 3, 12);
      const quotient = band === 1 ? randInt(rng, 2, 10) : band === 2 ? randInt(rng, 3, 20) : randInt(rng, 5, 50);
      const dividend = divisor * quotient;
      return {
        prompt: `${dividend} ÷ ${divisor} = ?`,
        kind: "short",
        answer: `${quotient}`,
        explanation: `${divisor} × ${quotient} = ${dividend}, so ${dividend} ÷ ${divisor} = ${quotient}.`,
      };
    },
  },
  {
    match: /\b(multipl|times table|product)\w*\b/i,
    gen: (rng, band) => {
      const a = band === 1 ? randInt(rng, 2, 6) : band === 2 ? randInt(rng, 3, 12) : randInt(rng, 11, 25);
      const b = band === 1 ? randInt(rng, 2, 6) : band === 2 ? randInt(rng, 3, 12) : randInt(rng, 6, 19);
      return {
        prompt: `${a} × ${b} = ?`,
        kind: "short",
        answer: `${a * b}`,
        explanation: `${a} groups of ${b} makes ${a * b}.`,
      };
    },
  },
  {
    match: /\b(add|addition|sum|plus)\w*\b/i,
    gen: (rng, band) => {
      const hi = band === 1 ? 20 : band === 2 ? 200 : 5000;
      const a = randInt(rng, 2, hi);
      const b = randInt(rng, 2, hi);
      return {
        prompt: `${a} + ${b} = ?`,
        kind: "short",
        answer: `${a + b}`,
        explanation: `${a} + ${b} = ${a + b}.`,
      };
    },
  },
  {
    match: /\b(subtract|subtraction|minus|difference|take away)\w*\b/i,
    gen: (rng, band) => {
      const hi = band === 1 ? 20 : band === 2 ? 200 : 5000;
      const a = randInt(rng, 5, hi);
      const b = randInt(rng, 2, a);
      return {
        prompt: `${a} − ${b} = ?`,
        kind: "short",
        answer: `${a - b}`,
        explanation: `${a} − ${b} = ${a - b}.`,
      };
    },
  },
  {
    match: /\bfraction\w*\b/i,
    gen: (rng, band) => {
      // Same denominator for the youngest band; unlike denominators after that.
      const d1 = band === 1 ? randInt(rng, 2, 8) : randInt(rng, 2, 10);
      const d2 = band === 1 ? d1 : randInt(rng, 2, 12);
      const n1 = randInt(rng, 1, d1 - 1);
      const n2 = randInt(rng, 1, d2 - 1);
      const num = n1 * d2 + n2 * d1;
      const den = d1 * d2;
      const g = gcd(num, den) || 1;
      // Always reduced all the way — the tutor prompt has said so since April
      // and the lesson key must agree with it.
      const answer = `${num / g}/${den / g}`;
      return {
        prompt: `${n1}/${d1} + ${n2}/${d2} = ? (reduce your answer all the way)`,
        kind: "short",
        answer,
        explanation: `Give both fractions the same bottom number: ${n1}/${d1} = ${n1 * d2}/${den} and ${n2}/${d2} = ${n2 * d1}/${den}. Add the tops: ${num}/${den}, which reduces to ${answer}.`,
      };
    },
  },
  {
    match: /\b(percent|percentage)\w*\b/i,
    gen: (rng) => {
      const pct = [10, 20, 25, 50, 75][randInt(rng, 0, 4)];
      const base = randInt(rng, 2, 40) * 10;
      const answer = (base * pct) / 100;
      return {
        prompt: `What is ${pct}% of ${base}?`,
        kind: "short",
        answer: `${answer}`,
        explanation: `${pct}% means ${pct} out of every 100, so ${pct}% of ${base} is ${answer}.`,
      };
    },
  },
  {
    match: /\bdecimal\w*\b/i,
    gen: (rng, band) => {
      const places = band === 1 ? 1 : 2;
      const f = Math.pow(10, places);
      const a = randInt(rng, 10, 400) / f;
      const b = randInt(rng, 10, 400) / f;
      const answer = Number((a + b).toFixed(places));
      return {
        prompt: `${a} + ${b} = ?`,
        kind: "short",
        answer: `${answer}`,
        explanation: `Line up the decimal points, then add: ${a} + ${b} = ${answer}.`,
      };
    },
  },
  {
    match: /\b(round|rounding)\b/i,
    gen: (rng, band) => {
      const to = band === 1 ? 10 : [10, 100][randInt(rng, 0, 1)];
      const n = randInt(rng, to, to * 40) + randInt(rng, 1, to - 1);
      const answer = Math.round(n / to) * to;
      return {
        prompt: `Round ${n} to the nearest ${to}.`,
        kind: "short",
        answer: `${answer}`,
        explanation: `${n} is closest to ${answer} when you round to the nearest ${to}. Remember to round to the nearest value, never just chop the digits off.`,
      };
    },
  },
  {
    match: /\b(area|perimeter)\b/i,
    gen: (rng, band) => {
      const w = randInt(rng, 2, band === 1 ? 9 : 20);
      const h = randInt(rng, 2, band === 1 ? 9 : 20);
      const wantArea = rng() > 0.5;
      return wantArea
        ? {
            prompt: `A rectangle is ${w} cm wide and ${h} cm tall. What is its area in square cm?`,
            kind: "short",
            answer: `${w * h}`,
            explanation: `Area of a rectangle is width × height: ${w} × ${h} = ${w * h} square cm.`,
          }
        : {
            prompt: `A rectangle is ${w} cm wide and ${h} cm tall. What is its perimeter in cm?`,
            kind: "short",
            answer: `${2 * (w + h)}`,
            explanation: `Perimeter is all four sides added up: ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.`,
          };
    },
  },
];

/**
 * Build a set of exact-answer math questions for a topic, or null when the
 * topic isn't one this generator understands.
 *
 * `seed` should be stable for a given kid + topic + day so the same lesson
 * shows the same problems if it's reopened.
 */
export function generateMathQuestions(
  topic: string,
  ageMin: number,
  count: number,
  seed: string,
): GeneratedQuestion[] | null {
  const entry = TOPIC_GENERATORS.find((t) => t.match.test(topic));
  if (!entry) return null;

  const rng = makeRng(seed);
  const band = bandFor(ageMin);
  const out: GeneratedQuestion[] = [];
  const seen = new Set<string>();

  // Bounded retries: distinct prompts matter more than hitting `count` exactly.
  for (let attempts = 0; out.length < count && attempts < count * 12; attempts++) {
    const q = entry.gen(rng, band);
    if (seen.has(q.prompt)) continue;
    seen.add(q.prompt);
    out.push(q);
  }

  return out.length > 0 ? out : null;
}

/** Does this generator know the topic? Used to pick the lesson prompt shape. */
export function hasMathGenerator(topic: string): boolean {
  return TOPIC_GENERATORS.some((t) => t.match.test(topic));
}
