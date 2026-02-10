// Pre-cached YouTube channel data for SafeTube interactive demo
// These are popular channels with pre-generated AI safety analysis results

export type SafetyRating = "safe" | "caution" | "not_recommended";

export interface ContentFlag {
  category: string;
  level: "none" | "mild" | "moderate" | "heavy";
  details: string;
}

export interface RecentVideo {
  title: string;
  views: string;
}

export interface DemoChannel {
  id: string;
  name: string;
  handle: string; // @username
  thumbnailUrl: string;
  bannerUrl?: string;
  subscriberCount: string;
  videoCount: string;
  description: string;
  safetyRating: SafetyRating;
  ageRecommendation: string;
  summary: string;
  contentFlags: ContentFlag[];
  recentVideos: RecentVideo[];
  // Special flags
  isVerified?: boolean;
  isKidsFocused?: boolean;
}

export const demoChannels: DemoChannel[] = [
  // SAFE - Kid-Focused Educational
  {
    id: "blippi",
    name: "Blippi",
    handle: "@Blippi",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKbVr5c14TxXc_kU6sDYVg8zyKv8fvJzm3H-qrDz=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "19.4M",
    videoCount: "800+",
    description: "Blippi explores the world with fun and educational videos for kids. Learn about colors, shapes, animals, and more!",
    safetyRating: "safe",
    ageRecommendation: "2-6",
    summary: "Highly popular educational content designed specifically for preschool and early elementary children. All videos are age-appropriate with no concerning content. Teaches colors, shapes, numbers, and real-world concepts through playful exploration.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "" },
      { category: "Scary Content", level: "none", details: "" },
      { category: "Educational Value", level: "heavy", details: "Strong educational focus on learning concepts" },
    ],
    recentVideos: [
      { title: "Blippi Visits the Zoo!", views: "12M" },
      { title: "Learn Colors with Blippi at the Playground", views: "8.5M" },
      { title: "Blippi Explores a Fire Truck", views: "15M" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
  {
    id: "sesame-street",
    name: "Sesame Street",
    handle: "@SesameStreet",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKZbC9z8j_3p2k5F7m7Y3K_a_Q5YK-UzC1x2P6bQ=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "24.8M",
    videoCount: "6,000+",
    description: "Welcome to Sesame Street! Learn with Elmo, Cookie Monster, Big Bird, and all your favorite friends.",
    safetyRating: "safe",
    ageRecommendation: "2-7",
    summary: "The gold standard for children's educational content. Decades of experience creating age-appropriate, educational, and inclusive programming. All content is carefully produced for young viewers.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "" },
      { category: "Educational Value", level: "heavy", details: "Letters, numbers, social-emotional learning" },
      { category: "Inclusivity", level: "heavy", details: "Diverse characters, disability representation" },
    ],
    recentVideos: [
      { title: "Elmo's World: Shapes", views: "5.2M" },
      { title: "ABCs with Cookie Monster", views: "8.1M" },
      { title: "Sesame Street: Kindness is Cool", views: "3.4M" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
  {
    id: "national-geographic-kids",
    name: "National Geographic Kids",
    handle: "@NatGeoKids",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKZmeLmgr1Y8x8b-x5aHmgEBHzjJ3H4H5z0Y2Q=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "2.4M",
    videoCount: "1,200+",
    description: "Amazing animal facts, weird-but-true stories, and cool science experiments for curious kids!",
    safetyRating: "safe",
    ageRecommendation: "6-12",
    summary: "High-quality educational content about animals, nature, and science. All content is carefully curated for young audiences. May show natural predator-prey dynamics but handled appropriately for kids.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Nature footage may show predator-prey (educational context)" },
      { category: "Language", level: "none", details: "" },
      { category: "Educational Value", level: "heavy", details: "Science, animals, nature, geography" },
      { category: "Scary Content", level: "mild", details: "Some animals might be intimidating to very young viewers" },
    ],
    recentVideos: [
      { title: "Amazing Facts About Sharks!", views: "2.1M" },
      { title: "How Do Volcanoes Work?", views: "1.8M" },
      { title: "Weird But True: Animal Edition", views: "950K" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
  {
    id: "ryan-world",
    name: "Ryan's World",
    handle: "@RyansWorld",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYB9eKZr8P7v4L2p9LQj5K5E5Q6H2aL4nE3Fw=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "36.8M",
    videoCount: "2,500+",
    description: "Ryan and his family make fun videos about toys, games, science experiments, and more!",
    safetyRating: "safe",
    ageRecommendation: "3-8",
    summary: "Popular family-friendly channel featuring a child host and his family. Content includes toy reviews, educational experiments, and family challenges. Heavy commercial/toy promotion aspect.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "" },
      { category: "Commercial Content", level: "moderate", details: "Significant toy advertising and brand partnerships" },
      { category: "Educational Value", level: "mild", details: "Some science experiments and learning content" },
    ],
    recentVideos: [
      { title: "Ryan Opens Mystery Eggs!", views: "25M" },
      { title: "Science Experiments You Can Do at Home", views: "18M" },
      { title: "Ryan's Family Challenge!", views: "12M" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
  {
    id: "cocomelon",
    name: "Cocomelon - Nursery Rhymes",
    handle: "@Cocomelon",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKaSqG7b5u8HwjzKlHcWMJK8kQLj5M7UX2w=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "178M",
    videoCount: "1,000+",
    description: "Cocomelon helps kids learn letters, numbers, animal sounds, colors, and more through fun animated nursery rhymes.",
    safetyRating: "safe",
    ageRecommendation: "0-5",
    summary: "The most subscribed children's channel on YouTube. Colorful 3D animated nursery rhymes and educational songs. Content is specifically designed for babies, toddlers, and preschoolers. No concerning content.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "" },
      { category: "Educational Value", level: "heavy", details: "ABCs, numbers, colors, social skills" },
      { category: "Scary Content", level: "none", details: "" },
    ],
    recentVideos: [
      { title: "Wheels on the Bus + More Nursery Rhymes", views: "500M" },
      { title: "Bath Song - Kids Songs", views: "250M" },
      { title: "ABC Song with Balloons", views: "180M" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
  // SAFE - Family Entertainment
  {
    id: "mark-rober",
    name: "Mark Rober",
    handle: "@MarkRober",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKZWeMCsx4Q9e_Hm6nhOOUQ3faBhiTus_93kYQ=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "28.5M",
    videoCount: "120+",
    description: "Former NASA engineer making science and engineering fun with creative experiments and builds!",
    safetyRating: "safe",
    ageRecommendation: "8+",
    summary: "High-quality science and engineering content from a former NASA engineer. Videos feature creative experiments, charity initiatives, and STEM education. Occasional mild language (rare). Great for inspiring interest in science.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "mild", details: "Rare mild expressions" },
      { category: "Educational Value", level: "heavy", details: "Science, engineering, problem-solving" },
      { category: "Scary Content", level: "none", details: "" },
    ],
    recentVideos: [
      { title: "World's Largest Nerf Gun", views: "45M" },
      { title: "Glitter Bomb Trap for Package Thieves", views: "120M" },
      { title: "Building a Real Squirrel Obstacle Course", views: "95M" },
    ],
    isVerified: true,
  },
  {
    id: "dude-perfect",
    name: "Dude Perfect",
    handle: "@DudePerfect",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYqC1TvHdVJ5VvC7-5b3HzJwQ0d8_rFyL1sVw=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "60.5M",
    videoCount: "400+",
    description: "Five best friends making crazy trick shots, battles, and more! Family-friendly fun for everyone.",
    safetyRating: "safe",
    ageRecommendation: "6+",
    summary: "Sports and trick shot entertainment from five friends. Content is intentionally family-friendly with no profanity or mature content. Some videos feature mild competition and friendly rivalry. Great for sports-loving kids.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "Intentionally family-friendly" },
      { category: "Scary Content", level: "mild", details: "Some extreme sports/stunts" },
      { category: "Competition", level: "mild", details: "Friendly competition and rivalry" },
    ],
    recentVideos: [
      { title: "World's Longest Trick Shot", views: "35M" },
      { title: "Overtime 24 - Battle Edition", views: "28M" },
      { title: "Airplane Trick Shots", views: "42M" },
    ],
    isVerified: true,
  },
  // CAUTION - Needs Parent Review
  {
    id: "mrbeast",
    name: "MrBeast",
    handle: "@MrBeast",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKb5XNx3_k-xWZA5wj6f7q0j3L0aHyM9ql8VKQ=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "316M",
    videoCount: "800+",
    description: "I do crazy expensive stunts and give away lots of money! Subscribe to see wild challenges.",
    safetyRating: "caution",
    ageRecommendation: "10+",
    summary: "Extremely popular channel featuring expensive stunts, challenges, and large cash giveaways. While generally family-friendly, content may promote unrealistic expectations about money. Some videos feature mild peril and high-stakes competition. Rare mild language.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "mild", details: "Occasional mild expressions" },
      { category: "Mature Themes", level: "moderate", details: "Large sums of money, gambling-like competitions" },
      { category: "Scary Content", level: "mild", details: "Some challenge scenarios involve mild peril" },
    ],
    recentVideos: [
      { title: "$1 vs $1,000,000 Hotel Room!", views: "180M" },
      { title: "I Survived 7 Days in the Jungle", views: "150M" },
      { title: "Last To Leave Circle Wins $500,000", views: "200M" },
    ],
    isVerified: true,
  },
  {
    id: "mrbeast-gaming",
    name: "MrBeast Gaming",
    handle: "@MrBeastGaming",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYxGzJwp3_3VXHZ4wPJ9c0P5d8H4eF2rWvM8w=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "45M",
    videoCount: "350+",
    description: "MrBeast's gaming channel featuring Minecraft, Fortnite, and more with huge cash prizes!",
    safetyRating: "caution",
    ageRecommendation: "10+",
    summary: "Gaming content with cash prize competitions. Games featured include Minecraft and Fortnite (rated T for Teen). Competitive atmosphere with monetary incentives. Similar concerns to main channel regarding money/gambling themes.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Video game violence (Fortnite, Minecraft combat)" },
      { category: "Language", level: "mild", details: "Occasional mild expressions" },
      { category: "Mature Themes", level: "moderate", details: "Cash prizes, competitive pressure" },
      { category: "Gaming Content", level: "moderate", details: "Features games rated T for Teen" },
    ],
    recentVideos: [
      { title: "Last To Stop Playing Minecraft Wins $100,000", views: "85M" },
      { title: "Fortnite but Every Kill = $1,000", views: "65M" },
      { title: "100 Players Simulate Civilization in Minecraft", views: "90M" },
    ],
    isVerified: true,
  },
  {
    id: "unspeakable",
    name: "Unspeakable",
    handle: "@Unspeakable",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYqJ0P3W-Y3vLmU5H4s9Y8P2L8Q0V0X5sN1YA=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "17.5M",
    videoCount: "1,200+",
    description: "Fun family-friendly gaming and challenge videos! Minecraft, crazy challenges, and more!",
    safetyRating: "caution",
    ageRecommendation: "8+",
    summary: "Gaming and challenge content aimed at younger audiences. While creator tries to be family-friendly, some content includes mildly crude humor, loud reactions, and occasional edgy jokes. Minecraft and other gaming content.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Minecraft combat, game violence" },
      { category: "Language", level: "mild", details: "Occasional mild humor, loud reactions" },
      { category: "Mature Themes", level: "mild", details: "Some bathroom/gross-out humor" },
      { category: "Hyperactivity", level: "moderate", details: "Very energetic, constant yelling/excitement" },
    ],
    recentVideos: [
      { title: "100 Layers of Slime Challenge!", views: "25M" },
      { title: "Minecraft But Everything is Random", views: "18M" },
      { title: "World's Biggest Bounce House!", views: "22M" },
    ],
    isVerified: true,
  },
  {
    id: "preston",
    name: "Preston",
    handle: "@Preston",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKaWBxX8q_5k0Q9Y5T8S9N2P7dL8sK5H2F0VzQ=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "21M",
    videoCount: "3,000+",
    description: "Gaming, pranks, and challenges! Minecraft, Roblox, and crazy experiments with my wife Brianna!",
    safetyRating: "caution",
    ageRecommendation: "8+",
    summary: "Family-oriented gaming and challenge content. Creator is married and makes content with wife. Generally kid-friendly but some pranks and challenges may not be suitable for youngest viewers. Gaming content includes Minecraft and Roblox.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Video game combat" },
      { category: "Language", level: "mild", details: "Generally clean with rare mild expressions" },
      { category: "Pranks", level: "moderate", details: "Prank videos that kids may try to imitate" },
      { category: "Relationship Content", level: "mild", details: "Married couple content, appropriate" },
    ],
    recentVideos: [
      { title: "Minecraft But Difficulty Keeps Increasing", views: "12M" },
      { title: "Pranking My Wife for 24 Hours", views: "8M" },
      { title: "Roblox Speed Challenge!", views: "15M" },
    ],
    isVerified: true,
  },
  {
    id: "ssniperwolf",
    name: "SSSniperWolf",
    handle: "@SSSniperWolf",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYwqH8_x3vF5_8M_Y4H2J0k8N0D5vQ0L2P9WQ=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "34M",
    videoCount: "3,500+",
    description: "Reaction videos, gaming, DIYs, and more! New videos every day!",
    safetyRating: "caution",
    ageRecommendation: "12+",
    summary: "Popular reaction and gaming content. Some videos cover mature topics through reaction format. Commentary can include discussions of relationships, drama, and internet culture not suitable for younger kids. Generally clean language.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Video game content, reaction to viral videos" },
      { category: "Language", level: "mild", details: "Generally clean but some mature topics" },
      { category: "Mature Themes", level: "moderate", details: "Reacts to relationship drama, adult situations" },
      { category: "Internet Culture", level: "moderate", details: "TikTok/social media content reactions" },
    ],
    recentVideos: [
      { title: "Reacting to Craziest TikToks", views: "8M" },
      { title: "DIY Life Hacks That Actually Work", views: "12M" },
      { title: "Most Satisfying Video Ever", views: "15M" },
    ],
    isVerified: true,
  },
  {
    id: "pewdiepie",
    name: "PewDiePie",
    handle: "@PewDiePie",
    thumbnailUrl: "https://yt3.googleusercontent.com/5oUY3tashyxfqsjO5SGhjT4dus8FkN9CsAHwXWISFrdPYii1FudD4ICtLfuCw6-THJsJbgoY=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "111M",
    videoCount: "4,700+",
    description: "I make videos.",
    safetyRating: "caution",
    ageRecommendation: "13+",
    summary: "One of YouTube's most famous creators. Content has evolved over time but still includes gaming, commentary, and meme reviews. Occasional mild profanity and mature humor. Some past controversies. Best for teens.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Video game content" },
      { category: "Language", level: "moderate", details: "Occasional profanity and crude humor" },
      { category: "Mature Themes", level: "moderate", details: "Adult humor, internet culture, memes" },
      { category: "Controversial History", level: "moderate", details: "Past controversies worth researching" },
    ],
    recentVideos: [
      { title: "Minecraft Hardcore - Day 1000", views: "25M" },
      { title: "Meme Review", views: "8M" },
      { title: "Reacting to My Old Videos", views: "12M" },
    ],
    isVerified: true,
  },
  // NOT RECOMMENDED
  {
    id: "dream",
    name: "Dream",
    handle: "@Dream",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYjBN-wVnAZiTv4vjqj5h4I5U9J4bN8V7u1KA=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "32M",
    videoCount: "140+",
    description: "Minecraft speedrunner and content creator",
    safetyRating: "caution",
    ageRecommendation: "10+",
    summary: "Popular Minecraft content creator known for speedruns and 'Manhunt' series. Content is generally appropriate but some videos have intense competitive moments. Community drama and controversies have surrounded the creator.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Minecraft combat" },
      { category: "Language", level: "mild", details: "Occasional mild expressions during intense moments" },
      { category: "Intense Content", level: "moderate", details: "High-stress competitive gameplay" },
      { category: "Community Drama", level: "moderate", details: "Various controversies in online community" },
    ],
    recentVideos: [
      { title: "Minecraft Speedrunner VS 5 Hunters", views: "75M" },
      { title: "Minecraft, But It's Random...", views: "35M" },
      { title: "Dream SMP Highlights", views: "20M" },
    ],
    isVerified: true,
  },
  {
    id: "ishowspeed",
    name: "IShowSpeed",
    handle: "@IShowSpeed",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKaWBbxJ3H5Q-vLPk0YF5cL7K8_WMJP9q4sLKQ=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "27M",
    videoCount: "500+",
    description: "SPEED. Streaming, gaming, and entertainment.",
    safetyRating: "not_recommended",
    ageRecommendation: "16+",
    summary: "Extremely energetic and unpredictable streaming content. Known for loud outbursts, controversial statements, and inappropriate behavior. Frequent profanity and mature themes. Not suitable for children.",
    contentFlags: [
      { category: "Violence", level: "mild", details: "Gaming violence, verbal aggression" },
      { category: "Language", level: "heavy", details: "Frequent profanity and inappropriate language" },
      { category: "Mature Themes", level: "heavy", details: "Adult humor, controversial statements" },
      { category: "Unpredictable Content", level: "heavy", details: "Live streams with unfiltered content" },
    ],
    recentVideos: [
      { title: "IShowSpeed Meets Ronaldo", views: "50M" },
      { title: "Speed Plays Jump Scare Games", views: "15M" },
      { title: "24 Hour Stream Challenge", views: "8M" },
    ],
    isVerified: true,
  },
  {
    id: "ksi",
    name: "KSI",
    handle: "@KSI",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKbpY_q7E8hL4vPmCP_3X2YJ5nM8Q_VL4mW9Fw=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "24M",
    videoCount: "1,400+",
    description: "Music. Boxing. YouTube. Prime.",
    safetyRating: "not_recommended",
    ageRecommendation: "16+",
    summary: "Adult entertainment content including boxing, music, and comedy. Frequent profanity, sexual references, and crude humor throughout. Past controversial content. Not appropriate for children or young teens.",
    contentFlags: [
      { category: "Violence", level: "moderate", details: "Boxing content, physical challenges" },
      { category: "Language", level: "heavy", details: "Frequent strong profanity" },
      { category: "Sexual Content", level: "moderate", details: "Sexual references and jokes" },
      { category: "Mature Themes", level: "heavy", details: "Adult humor, drinking references" },
    ],
    recentVideos: [
      { title: "Try Not To Laugh (Impossible)", views: "12M" },
      { title: "Sidemen Sunday Special", views: "18M" },
      { title: "Boxing Training Camp", views: "8M" },
    ],
    isVerified: true,
  },
  {
    id: "logan-paul",
    name: "Logan Paul",
    handle: "@LoganPaul",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYwJ9g_x3V8H2Lf9M5Y_4K8N0D5vQ0X5mP9WQ=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "23.6M",
    videoCount: "700+",
    description: "Entrepreneur, Boxer, Podcaster, and YouTuber",
    safetyRating: "not_recommended",
    ageRecommendation: "16+",
    summary: "Adult content creator with history of controversial incidents. Current content includes boxing, podcasting (Impaulsive), and WWE. Frequent mature themes, adult humor, and inappropriate content for children.",
    contentFlags: [
      { category: "Violence", level: "moderate", details: "Boxing, WWE wrestling content" },
      { category: "Language", level: "heavy", details: "Strong profanity throughout" },
      { category: "Mature Themes", level: "heavy", details: "Adult discussions, controversial topics" },
      { category: "Controversial History", level: "heavy", details: "Past incidents including infamous Japan video" },
    ],
    recentVideos: [
      { title: "Impaulsive Podcast Highlights", views: "5M" },
      { title: "WWE SummerSlam Vlog", views: "8M" },
      { title: "Training for Next Fight", views: "4M" },
    ],
    isVerified: true,
  },
  // More Safe Channels
  {
    id: "pinkfong",
    name: "Pinkfong Baby Shark",
    handle: "@Pinkfong",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKZq5_Y8aJ3K2mL7N5v2X8Q0Z5sH4dF0vR9N8Q=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "74M",
    videoCount: "3,000+",
    description: "Home of Baby Shark and fun educational songs for kids!",
    safetyRating: "safe",
    ageRecommendation: "0-6",
    summary: "The channel behind the viral Baby Shark song. All content is specifically designed for babies, toddlers, and preschoolers. Educational songs about numbers, animals, and daily routines. Completely safe for young children.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "" },
      { category: "Educational Value", level: "heavy", details: "Songs, learning, early childhood development" },
      { category: "Scary Content", level: "none", details: "" },
    ],
    recentVideos: [
      { title: "Baby Shark Dance | Sing and Dance!", views: "15B" },
      { title: "Five Little Monkeys", views: "500M" },
      { title: "Animal Songs Compilation", views: "200M" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
  {
    id: "crash-course-kids",
    name: "Crash Course Kids",
    handle: "@CrashCourseKids",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKYxGzJwp3_3VXHZ4wPJ9c0P5d8H4eF2rWvM8w=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "1.2M",
    videoCount: "200+",
    description: "Science education videos for elementary students from the Crash Course team!",
    safetyRating: "safe",
    ageRecommendation: "8-12",
    summary: "High-quality educational science content designed for elementary school students. Covers earth science, life science, and physical science. All content is carefully produced by educational professionals.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "" },
      { category: "Educational Value", level: "heavy", details: "Science curriculum aligned content" },
      { category: "Scary Content", level: "none", details: "" },
    ],
    recentVideos: [
      { title: "What is an Ecosystem?", views: "2.5M" },
      { title: "The Water Cycle Explained", views: "3.1M" },
      { title: "How Do Volcanoes Form?", views: "1.8M" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
  {
    id: "art-for-kids-hub",
    name: "Art for Kids Hub",
    handle: "@ArtforKidsHub",
    thumbnailUrl: "https://yt3.googleusercontent.com/ytc/APkrFKbX8H5vL2mN7Y9K0Z8Q3P5sX2dL8vF0qR9M4Q=s176-c-k-c0x00ffffff-no-rj",
    subscriberCount: "6.8M",
    videoCount: "2,500+",
    description: "Learn how to draw with step-by-step tutorials! Art lessons for kids of all ages.",
    safetyRating: "safe",
    ageRecommendation: "4+",
    summary: "Family-run art instruction channel. A father creates drawing tutorials with his kids, making it relatable for young viewers. Completely wholesome content focused on creativity and art skills.",
    contentFlags: [
      { category: "Violence", level: "none", details: "" },
      { category: "Language", level: "none", details: "" },
      { category: "Educational Value", level: "heavy", details: "Art skills, creativity, following instructions" },
      { category: "Family Content", level: "heavy", details: "Wholesome family participation" },
    ],
    recentVideos: [
      { title: "How To Draw A Unicorn", views: "15M" },
      { title: "How To Draw Baby Yoda", views: "8M" },
      { title: "How To Draw A Dragon", views: "12M" },
    ],
    isVerified: true,
    isKidsFocused: true,
  },
];

// Search function for demo
export function searchDemoChannels(query: string): DemoChannel[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return [];

  // Check if it looks like a YouTube URL or handle
  const handleMatch = normalizedQuery.match(/@?([a-z0-9_-]+)/i);

  return demoChannels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(normalizedQuery) ||
      channel.handle.toLowerCase().includes(normalizedQuery) ||
      (handleMatch && channel.handle.toLowerCase().includes(handleMatch[1].toLowerCase()))
  );
}

// Get a channel by ID
export function getDemoChannelById(id: string): DemoChannel | undefined {
  return demoChannels.find((channel) => channel.id === id);
}
