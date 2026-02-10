// Pre-cached book data for SafeReads interactive demo
// These are popular children's/YA books with pre-generated analysis results

export type Severity = "none" | "mild" | "moderate" | "heavy";
export type Verdict = "safe" | "caution" | "warning";

export interface ContentFlag {
  category: string;
  severity: Severity;
  details: string;
}

export interface DemoBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string; // Google Books thumbnail or fallback
  isbn?: string;
  verdict: Verdict;
  ageRecommendation: string;
  summary: string;
  contentFlags: ContentFlag[];
}

export const demoBooks: DemoBook[] = [
  {
    id: "harry-potter-1",
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    coverUrl: "https://books.google.com/books/content?id=wrOQLV6xB-wC&printsec=frontcover&img=1&zoom=1",
    isbn: "9780590353427",
    verdict: "caution",
    ageRecommendation: "8+",
    summary: "A magical adventure suitable for most children 8 and up. Contains fantasy violence, mild scary moments, and themes of good vs. evil. The story addresses bullying, loss of parents, and finding one's place in the world.",
    contentFlags: [
      { category: "Violence", severity: "mild", details: "Fantasy battles with magic spells, minor injuries" },
      { category: "Scary Content", severity: "moderate", details: "Dark creatures, tense confrontation with villain" },
      { category: "Language", severity: "none", details: "" },
      { category: "Romance", severity: "none", details: "" },
      { category: "Death/Grief", severity: "mild", details: "References to deceased parents" },
    ],
  },
  {
    id: "diary-wimpy-kid-1",
    title: "Diary of a Wimpy Kid",
    author: "Jeff Kinney",
    coverUrl: "https://books.google.com/books/content?id=J9u4C0vPYVMC&printsec=frontcover&img=1&zoom=1",
    isbn: "9780810993136",
    verdict: "safe",
    ageRecommendation: "8-12",
    summary: "A humorous middle school diary with relatable social situations. Very mild content throughout. Some bathroom humor and sibling rivalry that kids will find entertaining.",
    contentFlags: [
      { category: "Violence", severity: "none", details: "" },
      { category: "Language", severity: "mild", details: "Words like 'stupid' and 'dumb'" },
      { category: "Scary Content", severity: "none", details: "" },
      { category: "Romance", severity: "none", details: "" },
      { category: "Bullying", severity: "mild", details: "Social dynamics, some teasing between characters" },
    ],
  },
  {
    id: "percy-jackson-1",
    title: "The Lightning Thief",
    author: "Rick Riordan",
    coverUrl: "https://books.google.com/books/content?id=vhfHV4misS4C&printsec=frontcover&img=1&zoom=1",
    isbn: "9780786838653",
    verdict: "caution",
    ageRecommendation: "9+",
    summary: "An action-packed Greek mythology adventure. Contains fantasy violence with monsters and sword fighting. Deals with themes of ADHD/dyslexia positively, and explores complex family dynamics.",
    contentFlags: [
      { category: "Violence", severity: "moderate", details: "Battles with mythological monsters, sword fighting" },
      { category: "Scary Content", severity: "mild", details: "Greek monsters like Medusa, the Underworld" },
      { category: "Language", severity: "none", details: "" },
      { category: "Romance", severity: "none", details: "" },
      { category: "Death/Grief", severity: "mild", details: "Character deaths, discussion of mortality" },
    ],
  },
  {
    id: "hunger-games-1",
    title: "The Hunger Games",
    author: "Suzanne Collins",
    coverUrl: "https://books.google.com/books/content?id=sazytgAACAAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780439023528",
    verdict: "warning",
    ageRecommendation: "13+",
    summary: "A dystopian novel with significant violence and mature themes. Children fight to the death in televised games. Explores survival, government oppression, and moral complexity. Best for mature teens.",
    contentFlags: [
      { category: "Violence", severity: "heavy", details: "Children killing children, detailed death scenes" },
      { category: "Scary Content", severity: "moderate", details: "Life-threatening situations, dystopian setting" },
      { category: "Language", severity: "mild", details: "Minimal profanity" },
      { category: "Romance", severity: "mild", details: "Romantic tension, kissing" },
      { category: "Death/Grief", severity: "heavy", details: "Multiple character deaths, trauma" },
    ],
  },
  {
    id: "wonder",
    title: "Wonder",
    author: "R.J. Palacio",
    coverUrl: "https://books.google.com/books/content?id=G83qCAAAQBAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780375869020",
    verdict: "safe",
    ageRecommendation: "8+",
    summary: "A heartwarming story about kindness and acceptance. A boy with facial differences navigates school. Very mild content with powerful messages about bullying, friendship, and embracing differences.",
    contentFlags: [
      { category: "Violence", severity: "none", details: "" },
      { category: "Bullying", severity: "moderate", details: "Realistic bullying scenarios, exclusion" },
      { category: "Language", severity: "mild", details: "Very mild, rare instances" },
      { category: "Scary Content", severity: "none", details: "" },
      { category: "Emotional Content", severity: "mild", details: "Sad moments, character deals with loneliness" },
    ],
  },
  {
    id: "charlottes-web",
    title: "Charlotte's Web",
    author: "E.B. White",
    coverUrl: "https://books.google.com/books/content?id=K2E_AAAAQBAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780064400558",
    verdict: "safe",
    ageRecommendation: "6+",
    summary: "A classic tale of friendship between a pig and a spider. Gentle themes about life, death, and loyalty. The spider's eventual death is handled sensitively and naturally.",
    contentFlags: [
      { category: "Violence", severity: "none", details: "" },
      { category: "Death/Grief", severity: "mild", details: "Natural death of beloved character" },
      { category: "Language", severity: "none", details: "" },
      { category: "Scary Content", severity: "none", details: "" },
      { category: "Animal Welfare", severity: "mild", details: "Discussion of farm animals and their fate" },
    ],
  },
  {
    id: "captain-underpants-1",
    title: "Captain Underpants",
    author: "Dav Pilkey",
    coverUrl: "https://books.google.com/books/content?id=zcPTPQAACAAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780590846288",
    verdict: "safe",
    ageRecommendation: "7-10",
    summary: "Silly superhero humor with lots of bathroom jokes. Very kid-friendly content with cartoonish mischief. Some parents may find the potty humor excessive, but content is age-appropriate.",
    contentFlags: [
      { category: "Violence", severity: "none", details: "" },
      { category: "Bathroom Humor", severity: "moderate", details: "Frequent potty jokes, underwear references" },
      { category: "Language", severity: "none", details: "" },
      { category: "Mischief", severity: "mild", details: "Pranks on teachers, rule-breaking" },
      { category: "Scary Content", severity: "none", details: "" },
    ],
  },
  {
    id: "dog-man-1",
    title: "Dog Man",
    author: "Dav Pilkey",
    coverUrl: "https://books.google.com/books/content?id=XZUSDAAAQBAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780545581608",
    verdict: "safe",
    ageRecommendation: "7+",
    summary: "Comic-style superhero adventure with silly humor. A dog-cop hybrid fights crime. Similar to Captain Underpants but with less bathroom humor. Positive messages about doing good.",
    contentFlags: [
      { category: "Violence", severity: "mild", details: "Cartoonish action, no real harm" },
      { category: "Language", severity: "none", details: "" },
      { category: "Bathroom Humor", severity: "mild", details: "Some potty jokes" },
      { category: "Scary Content", severity: "none", details: "" },
      { category: "Romance", severity: "none", details: "" },
    ],
  },
  {
    id: "divergent",
    title: "Divergent",
    author: "Veronica Roth",
    coverUrl: "https://books.google.com/books/content?id=_iLrAQAAQBAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780062024039",
    verdict: "warning",
    ageRecommendation: "14+",
    summary: "A dystopian thriller with significant violence and mature themes. Features intense action, character deaths, and exploration of identity and belonging. Contains a romantic subplot with kissing.",
    contentFlags: [
      { category: "Violence", severity: "heavy", details: "Combat training, knife throwing, shootings" },
      { category: "Death/Grief", severity: "heavy", details: "Multiple deaths including family members" },
      { category: "Scary Content", severity: "moderate", details: "Fear simulations, psychological manipulation" },
      { category: "Romance", severity: "mild", details: "Kissing, romantic tension" },
      { category: "Language", severity: "mild", details: "Occasional strong language" },
    ],
  },
  {
    id: "the-giver",
    title: "The Giver",
    author: "Lois Lowry",
    coverUrl: "https://books.google.com/books/content?id=xVGaPQAACAAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780544336261",
    verdict: "caution",
    ageRecommendation: "11+",
    summary: "A thought-provoking dystopian novel about a society without pain or color. Explores heavy themes including euthanasia (called 'release') and the cost of a 'perfect' society. Appropriate for mature middle schoolers.",
    contentFlags: [
      { category: "Death/Grief", severity: "moderate", details: "Euthanasia of elderly and infants (implied)" },
      { category: "Violence", severity: "mild", details: "Description of wartime memories" },
      { category: "Mature Themes", severity: "moderate", details: "Societal control, loss of free will" },
      { category: "Language", severity: "none", details: "" },
      { category: "Romance", severity: "mild", details: "Awakening feelings discussed clinically" },
    ],
  },
  {
    id: "holes",
    title: "Holes",
    author: "Louis Sachar",
    coverUrl: "https://books.google.com/books/content?id=SIuKPgAACAAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780440414803",
    verdict: "safe",
    ageRecommendation: "10+",
    summary: "An adventure story about a boy sent to a juvenile detention camp. Contains themes of injustice, friendship, and perseverance. Some historical violence in flashback scenes but handled appropriately for middle grade.",
    contentFlags: [
      { category: "Violence", severity: "mild", details: "Historical violence in flashbacks, harsh camp conditions" },
      { category: "Death/Grief", severity: "mild", details: "Character deaths in historical storyline" },
      { category: "Language", severity: "none", details: "" },
      { category: "Scary Content", severity: "mild", details: "Dangerous yellow-spotted lizards" },
      { category: "Romance", severity: "mild", details: "Brief romantic subplot in flashback" },
    ],
  },
  {
    id: "matilda",
    title: "Matilda",
    author: "Roald Dahl",
    coverUrl: "https://books.google.com/books/content?id=mI_xAwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    isbn: "9780142410370",
    verdict: "safe",
    ageRecommendation: "7+",
    summary: "A beloved story about a gifted girl with neglectful parents and a cruel headmistress. Contains Dahl's signature dark humor and justice themes. The 'bad' adults get their comeuppance.",
    contentFlags: [
      { category: "Violence", severity: "mild", details: "Comedic punishment scenes, mean headmistress" },
      { category: "Neglect/Abuse", severity: "mild", details: "Parents neglect and insult Matilda" },
      { category: "Language", severity: "none", details: "" },
      { category: "Scary Content", severity: "mild", details: "Trunchbull is intimidating but cartoonishly evil" },
      { category: "Romance", severity: "none", details: "" },
    ],
  },
];

// Search function for demo
export function searchDemoBooks(query: string): DemoBook[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return [];

  return demoBooks.filter(
    (book) =>
      book.title.toLowerCase().includes(normalizedQuery) ||
      book.author.toLowerCase().includes(normalizedQuery)
  );
}

// Get a book by ID
export function getDemoBookById(id: string): DemoBook | undefined {
  return demoBooks.find((book) => book.id === id);
}
