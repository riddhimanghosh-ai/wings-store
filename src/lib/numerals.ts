/**
 * Spoken-numeral vocabulary, per locale.
 *
 * This is the one thing in the extraction pipeline that cannot be read out of
 * the database: brands, products, aliases and units are all deployment data,
 * but "how does this language say seventy" is a property of the language. It
 * lives here as a locale table rather than inline in a prompt so that opening a
 * new market is a data change, not a code change.
 *
 * Only the morphology is described. Both the speech-to-text keyterm list and
 * the word-to-integer glossary given to the extraction model are generated from
 * it, so the two can never drift apart and no individual value can be quietly
 * tuned to make a particular test case pass.
 */

type Scale = {
  word: string;
  value: number;
};

type NumeralLocale = {
  /** Words for 1-9, in order. */
  digits: string[];
  /** Prefix meaning "one of", e.g. Indonesian se- in sepuluh, seratus. */
  onePrefix: string;
  /** Multiplier words, smallest first. */
  scales: Scale[];
  /** Word forming the teens, if the language has a distinct one. */
  teenScale?: Scale;
};

const NUMERAL_LOCALES: Record<string, NumeralLocale> = {
  id: {
    digits: [
      "satu",
      "dua",
      "tiga",
      "empat",
      "lima",
      "enam",
      "tujuh",
      "delapan",
      "sembilan",
    ],
    onePrefix: "se",
    scales: [
      { word: "puluh", value: 10 },
      { word: "ratus", value: 100 },
      { word: "ribu", value: 1000 },
    ],
    teenScale: { word: "belas", value: 10 },
  },
};

export const DEFAULT_NUMERAL_LOCALE = "id";

function localeSpec(locale: string) {
  return NUMERAL_LOCALES[locale] ?? NUMERAL_LOCALES[DEFAULT_NUMERAL_LOCALE];
}

/**
 * Every spoken number word in the locale paired with its integer value,
 * generated from the locale's morphology: the bare digits, each scale standing
 * alone with the "one" prefix, the teens, and each digit against each scale.
 */
export function numeralGlossary(
  locale: string = DEFAULT_NUMERAL_LOCALE
): { word: string; value: number }[] {
  const spec = localeSpec(locale);
  const restDigits = spec.digits.slice(1);
  const digitValue = (word: string) => spec.digits.indexOf(word) + 1;

  return [
    ...spec.digits.map((word) => ({ word, value: digitValue(word) })),
    // sepuluh 10, seratus 100, seribu 1000 — a scale standing on its own.
    ...spec.scales.map((s) => ({ word: `${spec.onePrefix}${s.word}`, value: s.value })),
    // sebelas 11, dua belas 12, ... — teens, where the language has them.
    ...(spec.teenScale
      ? [
          {
            word: `${spec.onePrefix}${spec.teenScale.word}`,
            value: spec.teenScale.value + 1,
          },
          ...restDigits.map((d) => ({
            word: `${d} ${spec.teenScale!.word}`,
            value: spec.teenScale!.value + digitValue(d),
          })),
        ]
      : []),
    // dua puluh 20, tiga ratus 300, ... — every digit against every scale. The
    // "one" case is already covered by the prefixed forms above.
    ...spec.scales.flatMap((s) =>
      restDigits.map((d) => ({ word: `${d} ${s.word}`, value: digitValue(d) * s.value }))
    ),
  ];
}

/**
 * Just the words, for priming a speech-to-text decoder.
 *
 * Speech-to-text with English-biased auto-detection runs these together (a
 * spoken "<digit> puluh" arrives as a single run-on token), which destroys the
 * quantity before the extraction model ever sees it. Priming the decoder with
 * the full set keeps them intact.
 */
export function numeralKeyterms(locale: string = DEFAULT_NUMERAL_LOCALE): string[] {
  return numeralGlossary(locale).map((entry) => entry.word);
}

/** The same table rendered for a prompt: "satu=1, dua=2, ...". */
export function numeralGlossaryBlock(locale: string = DEFAULT_NUMERAL_LOCALE): string {
  return numeralGlossary(locale)
    .map((entry) => `${entry.word}=${entry.value}`)
    .join(", ");
}

/** The prefix meaning "one of a scale", e.g. Indonesian "se". */
export function onePrefix(locale: string = DEFAULT_NUMERAL_LOCALE): string {
  return localeSpec(locale).onePrefix;
}

/** The scale words themselves, e.g. "puluh", "ratus" — used to explain morphology. */
export function scaleWords(locale: string = DEFAULT_NUMERAL_LOCALE): string[] {
  const spec = localeSpec(locale);
  return [...(spec.teenScale ? [spec.teenScale.word] : []), ...spec.scales.map((s) => s.word)];
}
