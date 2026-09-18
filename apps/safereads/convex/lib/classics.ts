/**
 * The pre-approved classics shelf: the ONE list of public-domain titles a kid
 * may read without asking. Both the shelf (preApprovedBooks.ts) and the
 * recommender (recommendations.ts) read from here; the same 38 rows used to
 * be pasted into three files and drift was only a matter of time.
 *
 * Plain module, no Convex functions: safe to import anywhere.
 *
 * Genre keys match GenreBrowser: adventure, animals, fantasy, science,
 * history, fairy-tales, mystery, space, nature, humor, scary, action, etc.
 */

export type ContentLevel = "safe" | "caution" | "mature";

export interface ClassicBook {
  gutenbergId: string;
  title: string;
  author: string;
  minAge: number; // Minimum recommended age
  coverUrl?: string;
  contentLevel: ContentLevel; // Content classification for parent controls
  genres: string[]; // Genre tags for recommendation matching
}

// Gutenberg cover URL helper
function gutenbergCover(id: string): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

export const CLASSICS: ClassicBook[] = [
  // Ages 3-6
  { gutenbergId: "11339", title: "Mother Goose's Nursery Rhymes", author: "Various", minAge: 3, coverUrl: gutenbergCover("11339"), contentLevel: "safe", genres: ["humor", "fairy-tales"] },
  { gutenbergId: "21", title: "Aesop's Fables", author: "Aesop", minAge: 3, coverUrl: gutenbergCover("21"), contentLevel: "safe", genres: ["animals", "fairy-tales"] },
  { gutenbergId: "19993", title: "The Velveteen Rabbit", author: "Margery Williams", minAge: 3, coverUrl: gutenbergCover("19993"), contentLevel: "safe", genres: ["animals", "fantasy"] },
  { gutenbergId: "17208", title: "The Tale of Peter Rabbit", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("17208"), contentLevel: "safe", genres: ["animals", "adventure"] },
  { gutenbergId: "14838", title: "The Tale of Benjamin Bunny", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("14838"), contentLevel: "safe", genres: ["animals"] },
  { gutenbergId: "15234", title: "The Tale of Mrs. Tiggy-Winkle", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("15234"), contentLevel: "safe", genres: ["animals"] },
  { gutenbergId: "23661", title: "The Tale of Jemima Puddle-Duck", author: "Beatrix Potter", minAge: 3, coverUrl: gutenbergCover("23661"), contentLevel: "safe", genres: ["animals"] },
  // Ages 7-9
  { gutenbergId: "11", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", minAge: 7, coverUrl: gutenbergCover("11"), contentLevel: "safe", genres: ["fantasy", "adventure", "humor"] },
  { gutenbergId: "12", title: "Through the Looking-Glass", author: "Lewis Carroll", minAge: 7, coverUrl: gutenbergCover("12"), contentLevel: "safe", genres: ["fantasy", "humor"] },
  { gutenbergId: "55", title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", minAge: 7, coverUrl: gutenbergCover("55"), contentLevel: "safe", genres: ["fantasy", "adventure"] },
  { gutenbergId: "54", title: "The Marvelous Land of Oz", author: "L. Frank Baum", minAge: 7, coverUrl: gutenbergCover("54"), contentLevel: "safe", genres: ["fantasy", "adventure"] },
  { gutenbergId: "2591", title: "Grimm's Fairy Tales", author: "Brothers Grimm", minAge: 7, coverUrl: gutenbergCover("2591"), contentLevel: "caution", genres: ["fairy-tales", "fantasy", "scary"] },
  { gutenbergId: "902", title: "Hans Christian Andersen's Fairy Tales", author: "Hans Christian Andersen", minAge: 7, coverUrl: gutenbergCover("902"), contentLevel: "caution", genres: ["fairy-tales", "fantasy"] },
  { gutenbergId: "16", title: "Peter Pan (Peter and Wendy)", author: "J.M. Barrie", minAge: 7, coverUrl: gutenbergCover("16"), contentLevel: "safe", genres: ["fantasy", "adventure", "action"] },
  { gutenbergId: "289", title: "The Wind in the Willows", author: "Kenneth Grahame", minAge: 7, coverUrl: gutenbergCover("289"), contentLevel: "safe", genres: ["animals", "nature", "adventure"] },
  { gutenbergId: "113", title: "The Secret Garden", author: "Frances Hodgson Burnett", minAge: 7, coverUrl: gutenbergCover("113"), contentLevel: "safe", genres: ["nature", "mystery"] },
  { gutenbergId: "479", title: "A Little Princess", author: "Frances Hodgson Burnett", minAge: 7, coverUrl: gutenbergCover("479"), contentLevel: "safe", genres: ["adventure"] },
  { gutenbergId: "32", title: "Heidi", author: "Johanna Spyri", minAge: 7, coverUrl: gutenbergCover("32"), contentLevel: "safe", genres: ["nature", "adventure"] },
  { gutenbergId: "514", title: "Little Women", author: "Louisa May Alcott", minAge: 7, coverUrl: gutenbergCover("514"), contentLevel: "caution", genres: ["history"] },
  { gutenbergId: "766", title: "David Copperfield", author: "Charles Dickens", minAge: 9, coverUrl: gutenbergCover("766"), contentLevel: "caution", genres: ["history", "adventure"] },
  { gutenbergId: "1260", title: "Jane Eyre", author: "Charlotte Bronte", minAge: 9, coverUrl: gutenbergCover("1260"), contentLevel: "mature", genres: ["mystery"] },
  { gutenbergId: "35", title: "The Time Machine", author: "H.G. Wells", minAge: 9, coverUrl: gutenbergCover("35"), contentLevel: "caution", genres: ["science", "space", "adventure"] },
  // Ages 10-12
  { gutenbergId: "120", title: "Treasure Island", author: "Robert Louis Stevenson", minAge: 10, coverUrl: gutenbergCover("120"), contentLevel: "caution", genres: ["adventure", "action"] },
  { gutenbergId: "1184", title: "The Count of Monte Cristo", author: "Alexandre Dumas", minAge: 10, coverUrl: gutenbergCover("1184"), contentLevel: "mature", genres: ["adventure", "action", "mystery"] },
  { gutenbergId: "1661", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", minAge: 10, coverUrl: gutenbergCover("1661"), contentLevel: "caution", genres: ["mystery", "adventure"] },
  { gutenbergId: "76", title: "Adventures of Huckleberry Finn", author: "Mark Twain", minAge: 10, coverUrl: gutenbergCover("76"), contentLevel: "caution", genres: ["adventure", "humor"] },
  { gutenbergId: "74", title: "The Adventures of Tom Sawyer", author: "Mark Twain", minAge: 10, coverUrl: gutenbergCover("74"), contentLevel: "caution", genres: ["adventure", "humor"] },
  { gutenbergId: "1400", title: "Great Expectations", author: "Charles Dickens", minAge: 10, coverUrl: gutenbergCover("1400"), contentLevel: "caution", genres: ["history", "mystery"] },
  { gutenbergId: "46", title: "A Christmas Carol", author: "Charles Dickens", minAge: 10, coverUrl: gutenbergCover("46"), contentLevel: "caution", genres: ["fantasy", "scary"] },
  { gutenbergId: "345", title: "Dracula", author: "Bram Stoker", minAge: 12, coverUrl: gutenbergCover("345"), contentLevel: "mature", genres: ["scary", "mystery", "action"] },
  { gutenbergId: "1342", title: "Pride and Prejudice", author: "Jane Austen", minAge: 12, coverUrl: gutenbergCover("1342"), contentLevel: "caution", genres: ["history"] },
  { gutenbergId: "84", title: "Frankenstein", author: "Mary Shelley", minAge: 12, coverUrl: gutenbergCover("84"), contentLevel: "mature", genres: ["scary", "science"] },
  // Ages 13+
  { gutenbergId: "1232", title: "The Prince", author: "Niccolo Machiavelli", minAge: 13, coverUrl: gutenbergCover("1232"), contentLevel: "mature", genres: ["history"] },
  { gutenbergId: "98", title: "A Tale of Two Cities", author: "Charles Dickens", minAge: 13, coverUrl: gutenbergCover("98"), contentLevel: "mature", genres: ["history", "action"] },
  { gutenbergId: "2701", title: "Moby Dick", author: "Herman Melville", minAge: 13, coverUrl: gutenbergCover("2701"), contentLevel: "mature", genres: ["adventure", "nature", "action"] },
  { gutenbergId: "1952", title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", minAge: 13, coverUrl: gutenbergCover("1952"), contentLevel: "mature", genres: ["scary", "mystery"] },
  { gutenbergId: "174", title: "The Picture of Dorian Gray", author: "Oscar Wilde", minAge: 13, coverUrl: gutenbergCover("174"), contentLevel: "mature", genres: ["scary", "mystery"] },
  { gutenbergId: "1080", title: "A Modest Proposal", author: "Jonathan Swift", minAge: 13, coverUrl: gutenbergCover("1080"), contentLevel: "mature", genres: ["humor", "history"] },
];

/** Which content levels each parent comfort setting allows. */
export const LEVEL_FILTERS: Record<string, Set<ContentLevel>> = {
  safe_only: new Set<ContentLevel>(["safe"]),
  safe_and_caution: new Set<ContentLevel>(["safe", "caution"]),
  all_classics: new Set<ContentLevel>(["safe", "caution", "mature"]),
};
