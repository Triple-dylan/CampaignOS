/**
 * Lines shown while the assistant is working — US civic facts and quotes from
 * famous officeholders instead of a generic "thinking" label.
 */
export type ThinkingLine = {
  text: string;
  /** Attribution for quotes; omitted for facts. */
  attribution?: string;
};

export const THINKING_LINES: readonly ThinkingLine[] = [
  {
    text: "The ballot is stronger than the bullet.",
    attribution: "Abraham Lincoln",
  },
  {
    text: "Ask not what your country can do for you — ask what you can do for your country.",
    attribution: "John F. Kennedy",
  },
  {
    text: "Believe you can and you're halfway there.",
    attribution: "Theodore Roosevelt",
  },
  {
    text: "It is amazing what you can accomplish if you do not care who gets the credit.",
    attribution: "Harry S. Truman",
  },
  {
    text: "The buck stops here.",
    attribution: "Harry S. Truman",
  },
  {
    text: "If you don't have a seat at the table, bring a folding chair.",
    attribution: "Shirley Chisholm",
  },
  {
    text: "What the people want is very simple — they want an America as good as its promise.",
    attribution: "Barbara Jordan",
  },
  {
    text: "The only thing we have to fear is fear itself.",
    attribution: "Franklin D. Roosevelt",
  },
  {
    text: "A house divided against itself cannot stand.",
    attribution: "Abraham Lincoln",
  },
  {
    text: "Liberty, when it begins to take root, is a plant of rapid growth.",
    attribution: "George Washington",
  },
  {
    text: "The government closest to the people serves the people best.",
    attribution: "Thomas Jefferson (attributed)",
  },
  {
    text: "Elections belong to the people. It's their decision.",
    attribution: "Abraham Lincoln",
  },
  {
    text: "There is nothing wrong with America that cannot be cured by what is right with America.",
    attribution: "Bill Clinton",
  },
  {
    text: "Change will not come if we wait for some other person or some other time.",
    attribution: "Barack Obama",
  },
  {
    text: "Freedom is never more than one generation away from extinction.",
    attribution: "Ronald Reagan",
  },
  {
    text: "In politics, nothing happens by accident. If it happens, you can bet it was planned that way.",
    attribution: "Franklin D. Roosevelt (attributed)",
  },
  { text: "The U.S. Constitution is the oldest written national constitution still in use." },
  { text: "Federal law requires congressional elections on the Tuesday after the first Monday in November." },
  { text: "The first presidential campaign buttons appeared for George Washington's 1789 inauguration." },
  { text: "Wyoming was the first state to grant women the right to vote, in 1869." },
  { text: "The 26th Amendment lowered the voting age to 18 in 1971." },
  { text: "More than 500,000 elected offices exist across the United States." },
  { text: "The word 'campaign' comes from military use — candidates once 'took the field' like armies." },
  { text: "Yard signs date back to the 1800s, when supporters painted candidate names on barns and fences." },
  { text: "The shortest inaugural address was George Washington's second — just 135 words." },
  { text: "Door-to-door canvassing remains one of the most effective voter-turnout methods ever measured." },
] as const;

export function randomThinkingLineIndex(exclude?: number): number {
  if (THINKING_LINES.length <= 1) return 0;
  let index = Math.floor(Math.random() * THINKING_LINES.length);
  while (index === exclude) {
    index = Math.floor(Math.random() * THINKING_LINES.length);
  }
  return index;
}
