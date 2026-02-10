// Pre-cached song data for SafeTunes interactive demo
// These are popular songs with pre-generated content analysis results

export type ContentRating = "clean" | "mild" | "caution" | "explicit";
export type ParentVerdict = "approved" | "review" | "not_recommended";

export interface ContentFlag {
  category: string;
  level: "none" | "mild" | "moderate" | "heavy";
  details: string;
}

export interface DemoSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string; // Apple Music or fallback artwork URL
  releaseYear: number;
  duration: string; // formatted as "3:45"
  rating: ContentRating;
  parentVerdict: ParentVerdict;
  ageRecommendation: string;
  summary: string;
  contentFlags: ContentFlag[];
  // For showing "clean vs explicit" comparison
  hasExplicitVersion?: boolean;
  isKidzBopVersion?: boolean;
}

export const demoSongs: DemoSong[] = [
  // Kid-Friendly Pop
  {
    id: "shake-it-off",
    title: "Shake It Off",
    artist: "Taylor Swift",
    album: "1989",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5a/1b/6c/5a1b6c33-1f45-eb41-c86b-e6c63ed08b97/source/600x600bb.jpg",
    releaseYear: 2014,
    duration: "3:39",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "An upbeat anthem about ignoring negativity and critics. Entirely clean lyrics with positive messaging about self-confidence and not letting others bring you down.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Positive self-confidence message" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Brief mention of dating but nothing explicit" },
    ],
  },
  {
    id: "let-it-go",
    title: "Let It Go",
    artist: "Idina Menzel",
    album: "Frozen (Original Motion Picture Soundtrack)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d2/3c/8a/d23c8a3e-ec7c-f52b-e0e1-9e8f81b5a8f8/source/600x600bb.jpg",
    releaseYear: 2013,
    duration: "3:44",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "Disney's iconic empowerment anthem from Frozen. Completely family-friendly with themes of self-acceptance and embracing who you are.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Self-acceptance, empowerment" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "" },
    ],
  },
  {
    id: "uptown-funk",
    title: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    album: "Uptown Special",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/bc/3d/31/bc3d3164-24f8-7a94-2a88-3e8a1a7b3d1b/source/600x600bb.jpg",
    releaseYear: 2014,
    duration: "4:30",
    rating: "mild",
    parentVerdict: "approved",
    ageRecommendation: "8+",
    summary: "A fun, retro-style dance track. One instance of 'damn' and some mild boastful lyrics. Overall a great party song suitable for most kids.",
    contentFlags: [
      { category: "Language", level: "mild", details: "One use of 'damn'" },
      { category: "Themes", level: "mild", details: "Boastful lyrics about being cool/stylish" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Flirtatious but not explicit" },
    ],
  },
  {
    id: "happy",
    title: "Happy",
    artist: "Pharrell Williams",
    album: "Despicable Me 2 (Original Motion Picture Soundtrack)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/e1/a7/63/e1a763c6-ed14-8c4a-c500-ab5c254d38b5/source/600x600bb.jpg",
    releaseYear: 2013,
    duration: "3:53",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "An infectious feel-good song from Despicable Me 2. Clean lyrics celebrating happiness and positivity. Perfect for all ages.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Pure positivity and joy" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "" },
    ],
  },
  {
    id: "cant-stop-the-feeling",
    title: "Can't Stop the Feeling!",
    artist: "Justin Timberlake",
    album: "Trolls (Original Motion Picture Soundtrack)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ea/8b/c5/ea8bc5c8-bfa0-3a4a-31e8-7a5a5c8c1d2e/source/600x600bb.jpg",
    releaseYear: 2016,
    duration: "3:56",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "An uplifting dance track from the Trolls movie. Completely clean with themes of joy, dancing, and feeling good. Great for all ages.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Dancing, happiness, positivity" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Sweet, innocent references" },
    ],
  },
  // Songs That Need Review
  {
    id: "anti-hero",
    title: "Anti-Hero",
    artist: "Taylor Swift",
    album: "Midnights",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/92/11339232-48c7-2db4-4a5f-0e5e2f51e4f3/source/600x600bb.jpg",
    releaseYear: 2022,
    duration: "3:20",
    rating: "mild",
    parentVerdict: "review",
    ageRecommendation: "10+",
    summary: "A introspective song about self-criticism and insecurity. Contains themes of anxiety and self-doubt. One use of 'sexy' in the original version. Clean version available.",
    contentFlags: [
      { category: "Language", level: "mild", details: "One use of 'sexy' (clean version available)" },
      { category: "Themes", level: "moderate", details: "Self-criticism, anxiety, feeling like a burden" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "References to past relationships" },
    ],
    hasExplicitVersion: true,
  },
  {
    id: "flowers",
    title: "Flowers",
    artist: "Miley Cyrus",
    album: "Endless Summer Vacation",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e0/ef/45/e0ef45f9-9baf-80b8-c1d9-f7ce07c4d5ca/source/600x600bb.jpg",
    releaseYear: 2023,
    duration: "3:21",
    rating: "mild",
    parentVerdict: "review",
    ageRecommendation: "10+",
    summary: "A self-empowerment anthem about self-love after a breakup. Clean language but themes of adult relationships and independence. Good for tweens who can understand context.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "moderate", details: "Post-breakup independence, self-love, subtle references to adult relationship issues" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "References past romantic relationship" },
    ],
  },
  {
    id: "believer",
    title: "Believer",
    artist: "Imagine Dragons",
    album: "Evolve",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music117/v4/15/22/bd/1522bd93-5c6a-b3ca-d0f8-9fd4c13a72c3/source/600x600bb.jpg",
    releaseYear: 2017,
    duration: "3:24",
    rating: "mild",
    parentVerdict: "approved",
    ageRecommendation: "8+",
    summary: "A powerful rock anthem about overcoming pain and growing stronger. Contains the word 'hell' once. Themes of resilience and perseverance make it inspiring for older kids.",
    contentFlags: [
      { category: "Language", level: "mild", details: "One use of 'hell'" },
      { category: "Themes", level: "mild", details: "Overcoming pain, resilience, strength through adversity" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "" },
    ],
  },
  // Disney/Kid-Focused
  {
    id: "we-dont-talk-about-bruno",
    title: "We Don't Talk About Bruno",
    artist: "Carolina Gaitan & Mauro Castillo",
    album: "Encanto (Original Motion Picture Soundtrack)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/64/11/aa/6411aa93-ad21-de84-4f87-f25bae379b69/source/600x600bb.jpg",
    releaseYear: 2021,
    duration: "3:36",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "The viral hit from Disney's Encanto. Completely family-friendly with catchy Latin rhythms and storytelling about a misunderstood family member.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "mild", details: "Superstition, family secrets, mild spooky imagery" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Brief mention of wedding prediction" },
    ],
  },
  {
    id: "surface-pressure",
    title: "Surface Pressure",
    artist: "Jessica Darrow",
    album: "Encanto (Original Motion Picture Soundtrack)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/64/11/aa/6411aa93-ad21-de84-4f87-f25bae379b69/source/600x600bb.jpg",
    releaseYear: 2021,
    duration: "3:25",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "A powerful song from Encanto about the pressure of family expectations. Relatable themes for kids about stress and responsibility. Completely clean.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "mild", details: "Family pressure, stress, responsibility - handled in age-appropriate way" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "" },
    ],
  },
  {
    id: "how-far-ill-go",
    title: "How Far I'll Go",
    artist: "Auli'i Cravalho",
    album: "Moana (Original Motion Picture Soundtrack)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music111/v4/b1/a5/f2/b1a5f291-7f2f-4939-4b7c-0b6c3f7c7d9b/source/600x600bb.jpg",
    releaseYear: 2016,
    duration: "2:43",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "Moana's signature song about following your dreams and finding your path. Beautiful, empowering message with no concerning content.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Adventure, self-discovery, following dreams" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "" },
    ],
  },
  // Songs to Avoid / Not Recommended
  {
    id: "bad-guy",
    title: "bad guy",
    artist: "Billie Eilish",
    album: "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/82/7e/5f/827e5f30-8e98-0abb-47e3-b0a3872a8a12/source/600x600bb.jpg",
    releaseYear: 2019,
    duration: "3:14",
    rating: "caution",
    parentVerdict: "not_recommended",
    ageRecommendation: "13+",
    summary: "A dark, edgy track with themes of seduction and being a 'villain.' Contains suggestive content, references to violence ('might seduce your dad'), and mature themes throughout.",
    contentFlags: [
      { category: "Language", level: "mild", details: "No profanity but suggestive wordplay" },
      { category: "Themes", level: "heavy", details: "Seduction, manipulation, dark imagery" },
      { category: "Violence", level: "mild", details: "References to bruises, harm" },
      { category: "Romance", level: "heavy", details: "Suggestive content, seduction themes" },
    ],
  },
  {
    id: "blinding-lights",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/fc/63/0a/fc630a80-99d4-0c85-b1ed-a8d9b3e0c2bc/source/600x600bb.jpg",
    releaseYear: 2020,
    duration: "3:22",
    rating: "mild",
    parentVerdict: "review",
    ageRecommendation: "10+",
    summary: "An 80s-inspired synth-pop hit. Lyrics reference loneliness and longing. Contains 'hell' once. No explicit content but themes of emotional dependency.",
    contentFlags: [
      { category: "Language", level: "mild", details: "One use of 'hell'" },
      { category: "Themes", level: "moderate", details: "Loneliness, emotional dependency, nightlife" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Longing for someone" },
    ],
  },
  // Ed Sheeran
  {
    id: "shape-of-you",
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/7e/cf/f1/7ecff178-3b5e-8e88-0e7e-1e8e6d0e0e0e/source/600x600bb.jpg",
    releaseYear: 2017,
    duration: "3:53",
    rating: "caution",
    parentVerdict: "not_recommended",
    ageRecommendation: "13+",
    summary: "A catchy pop song about physical attraction. Lyrics focus heavily on body image and physical intimacy ('putting Van the Man on the jukebox' is about seduction). Not suitable for younger kids.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "heavy", details: "Physical attraction, body focus, bar scene/drinking" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "heavy", details: "Strong focus on physical intimacy and attraction" },
    ],
  },
  {
    id: "perfect",
    title: "Perfect",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/7e/cf/f1/7ecff178-3b5e-8e88-0e7e-1e8e6d0e0e0e/source/600x600bb.jpg",
    releaseYear: 2017,
    duration: "4:23",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "A beautiful love ballad about finding your perfect partner. Sweet, romantic but not explicit. References dancing and growing old together. Great for all ages.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "True love, commitment, dancing" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Sweet, wholesome romantic themes" },
    ],
  },
  // One Direction
  {
    id: "what-makes-you-beautiful",
    title: "What Makes You Beautiful",
    artist: "One Direction",
    album: "Up All Night",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5e/68/94/5e689472-3d8c-d714-8cfa-d56e9d2b0e7d/source/600x600bb.jpg",
    releaseYear: 2011,
    duration: "3:19",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "A classic pop hit about appreciating someone's natural beauty and humility. Completely clean with positive messaging about self-worth.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Self-confidence, natural beauty, positivity" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Sweet, innocent crush" },
    ],
  },
  // Kidz Bop version for comparison
  {
    id: "levitating-kidz-bop",
    title: "Levitating",
    artist: "KIDZ BOP Kids",
    album: "KIDZ BOP 2022",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/ab/4b/3c/ab4b3c1d-1f0d-d5a3-37d5-4e8c8e2c2c2c/source/600x600bb.jpg",
    releaseYear: 2022,
    duration: "3:23",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "Kidz Bop's kid-friendly version of the Dua Lipa hit. All suggestive lyrics have been replaced with age-appropriate alternatives. Perfect for younger kids.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Fun, dancing, friendship" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "Changed to friendship themes" },
    ],
    isKidzBopVersion: true,
  },
  {
    id: "levitating",
    title: "Levitating",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/2a/4c/45/2a4c458a-3cd1-7d98-cd8f-3bb0d04e0fb9/source/600x600bb.jpg",
    releaseYear: 2020,
    duration: "3:23",
    rating: "mild",
    parentVerdict: "review",
    ageRecommendation: "10+",
    summary: "A disco-pop dance track about attraction and romance. Some suggestive dancing references ('I got you moonlight, you're my starlight'). No explicit language but mature themes.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "mild", details: "Nightclub/dancing, attraction" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "moderate", details: "Flirtatious, attraction-focused" },
    ],
  },
  // More family-friendly options
  {
    id: "count-on-me",
    title: "Count on Me",
    artist: "Bruno Mars",
    album: "Doo-Wops & Hooligans",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/14/c4/b6/14c4b697-9c5e-dd27-7a9c-5c1e3e5c5c5c/source/600x600bb.jpg",
    releaseYear: 2010,
    duration: "3:17",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "A heartwarming song about friendship and being there for each other. Completely clean with beautiful themes of loyalty and support.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Friendship, loyalty, support" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "" },
    ],
  },
  {
    id: "a-million-dreams",
    title: "A Million Dreams",
    artist: "Ziv Zaifman, Hugh Jackman & Michelle Williams",
    album: "The Greatest Showman (Original Motion Picture Soundtrack)",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/82/3c/17/823c1777-8a59-4a0e-13e0-9d6e9e4c4c4c/source/600x600bb.jpg",
    releaseYear: 2017,
    duration: "4:30",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "An inspiring song from The Greatest Showman about dreaming big and believing in possibilities. Beautiful, empowering message for all ages.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Dreams, hope, imagination" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "mild", details: "Sweet love between dreamers" },
    ],
  },
  {
    id: "fight-song",
    title: "Fight Song",
    artist: "Rachel Platten",
    album: "Wildfire",
    coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music5/v4/e8/41/54/e8415481-b4c1-8a63-12c1-9a9a9a9a9a9a/source/600x600bb.jpg",
    releaseYear: 2015,
    duration: "3:23",
    rating: "clean",
    parentVerdict: "approved",
    ageRecommendation: "All ages",
    summary: "A powerful anthem about inner strength and perseverance. Completely clean with empowering themes about believing in yourself.",
    contentFlags: [
      { category: "Language", level: "none", details: "" },
      { category: "Themes", level: "none", details: "Empowerment, strength, perseverance" },
      { category: "Violence", level: "none", details: "" },
      { category: "Romance", level: "none", details: "" },
    ],
  },
];

// Search function for demo
export function searchDemoSongs(query: string): DemoSong[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return [];

  return demoSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(normalizedQuery) ||
      song.artist.toLowerCase().includes(normalizedQuery) ||
      song.album.toLowerCase().includes(normalizedQuery)
  );
}

// Get a song by ID
export function getDemoSongById(id: string): DemoSong | undefined {
  return demoSongs.find((song) => song.id === id);
}
