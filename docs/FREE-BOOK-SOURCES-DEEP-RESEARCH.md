# Free Children's Book Sources -- Deep Research for SafeReads

*Research date: April 1, 2026*

## Current Integrations

| Source | Books | License | Status |
|--------|-------|---------|--------|
| Project Gutenberg (via Gutendex API) | ~3,000 children's titles | Public domain | Live |
| StoryWeaver by Pratham Books | 38,000+ stories | CC-BY-4.0 | Live |

---

## Source-by-Source Analysis

### 1. Open Library (Internet Archive)

- **URL**: https://openlibrary.org
- **Kid-appropriate books**: Tens of thousands. Subject filtering supports `subject:"Juvenile fiction"` and `subject:"Juvenile literature"` to narrow to children's content.
- **Content quality**: Mixed. Scanned book pages (image-based reading via BookReader), not reflow-friendly. Some have OCR text. Covers available via Covers API.
- **API availability**: Excellent. REST APIs for Search, Books, Subjects, Authors, Covers, and a Read API that turns ISBNs into links to readable editions. BookReader can be embedded via iframe.
- **License**: Openly readable public domain works are "Full View." In-copyright works use a controlled digital lending model (1 user at a time, 1-hour or 14-day loans).
- **Can we embed/display legally?**: Yes for public domain. BookReader iframe embedding is explicitly supported. Controlled lending books require borrowing flow.
- **Formats**: Scanned page images (via BookReader), PDF, ePub (for some), plain text (OCR, variable quality).
- **Age range**: All ages. Must filter by juvenile subjects.
- **Languages**: Primarily English, but multilingual.
- **Rate limits**: 1 req/sec (anonymous), 3 req/sec (identified with User-Agent + email). Not intended as a data backend for third-party services -- they prioritize mission-aligned, open-source projects (SafeReads qualifies).
- **Priority: HIGH** -- Massive catalog, well-documented APIs, embeddable reader, mission-aligned. The BookReader iframe is the easiest path to in-app reading of scanned public domain children's books. Complements Gutenberg (which has clean text) with illustrated/picture books.

---

### 2. Global Digital Library (GDL)

- **URL**: https://digitallibrary.io
- **Kid-appropriate books**: 8,000+ books, all specifically for children (early readers through primary school).
- **Content quality**: High. Professionally illustrated picture books and early readers. Content sourced from Book Dash, StoryWeaver, African Storybook, Asia Foundation's Let's Read, and others -- effectively an aggregator of the best CC-licensed children's book projects.
- **API availability**: Yes, official REST API (beta) at https://digitallibrary.io/api/. Also provides an OPDS feed. GitHub repo at https://github.com/GlobalDigitalLibraryio/book-api. Requires language code parameter.
- **License**: All content marked with specific Creative Commons licenses (CC-BY, CC-BY-SA, CC-BY-NC). License info included in API responses.
- **Can we embed/display legally?**: Yes, with attribution per CC license terms. Some content is CC-BY-NC which prohibits commercial use -- need to filter by license if SafeReads is a paid product.
- **Formats**: HTML (web reader), PDF, ePub.
- **Age range**: Ages 3-12 (reading levels 1-4, roughly mapping to early readers through grade 5).
- **Languages**: 100+ languages, strong English collection.
- **Rate limits**: Not documented; reasonable use expected.
- **Priority: HIGH** -- Single API aggregates content from multiple high-quality sources (Book Dash, African Storybook, Let's Read, StoryWeaver). Instead of integrating 5 separate sources, GDL gives access to most of them through one endpoint. The CC-BY-NC content needs filtering for a paid app, but CC-BY content is plentiful.

---

### 3. Bloom Library (SIL International)

- **URL**: https://bloomlibrary.org
- **Kid-appropriate books**: 22,000+ books, all designed for early childhood and primary readers.
- **Content quality**: Good to excellent. Created by local communities and educators using Bloom desktop software. Many are beautifully illustrated picture books. Some include audio narration, sign language video, and image descriptions for accessibility.
- **API availability**: Official OPDS API documented at https://docs.bloomlibrary.org/opds/. Requires API credentials (create account, then email bloom-support@sil.org). Supports language filtering, organization-by-language, and ePub access.
- **License**: Creative Commons (varies by book, license specified per title).
- **Can we embed/display legally?**: Yes with attribution. Same CC-BY-NC filtering consideration as GDL.
- **Formats**: ePub, PDF, Bloom source files. OPDS API can return ePub links.
- **Age range**: Ages 2-10 primarily (early childhood and first years of primary school).
- **Languages**: 1,000+ languages (the most linguistically diverse children's book collection in the world).
- **Rate limits**: No formal rate limiting, but the team asks developers not to make queries on every page load. Cache aggressively.
- **Priority: HIGH** -- Huge catalog specifically for children, OPDS API is well-documented, accessibility features (audio, sign language) align perfectly with SafeReads' mission. The 22K+ book count dwarfs most other sources.

---

### 4. Archive.org Children's Library

- **URL**: https://archive.org/details/iacl
- **Kid-appropriate books**: Thousands of digitized children's books from university libraries, NYPL, ICDL, and others.
- **Content quality**: Variable. These are scans of physical books, so picture books retain their illustrations. Quality depends on the scan. Many historical children's books with beautiful original artwork.
- **API availability**: Via Open Library APIs (Search, Books, Read, Covers). The BookReader is open source (https://github.com/internetarchive/bookreader) and embeddable via iframe.
- **License**: Public domain items are freely usable. In-copyright items use controlled digital lending.
- **Can we embed/display legally?**: Yes for public domain via BookReader iframe. In-copyright books require the lending/borrowing flow.
- **Formats**: Scanned pages (BookReader), PDF, ePub (some), Kindle (some), plain text (OCR).
- **Age range**: All ages, but the Children's Library collection is specifically curated for kids.
- **Languages**: Primarily English, some multilingual.
- **Rate limits**: Same as Open Library (1-3 req/sec).
- **Priority: MEDIUM** -- Overlaps significantly with Open Library (same infrastructure). The Children's Library collection is a useful curated subset, but integration effort is essentially the same as Open Library. Treat as part of the Open Library integration rather than a separate source.

---

### 5. Book Dash

- **URL**: https://bookdash.org
- **Kid-appropriate books**: ~200 books (49 print-ready titles plus translations and adaptations).
- **Content quality**: Excellent. Professionally created by volunteer writers, illustrators, and designers. Beautiful, modern picture books. South African nonprofit focused on quality.
- **API availability**: No dedicated API. Books available as PDFs on bookdash.org, ePubs on GitHub (https://bookdash.github.io/bookdash-books/), and via the Book Dash Android app. Source files available for every book.
- **License**: CC-BY-4.0 (the most permissive CC license -- free to use commercially with attribution).
- **Can we embed/display legally?**: Yes, CC-BY-4.0 explicitly allows commercial use with attribution.
- **Formats**: PDF, ePub (via GitHub), source files (InDesign/Illustrator).
- **Age range**: Ages 2-8 (picture books and early readers).
- **Languages**: 11 South African languages plus English.
- **Rate limits**: N/A (static files on GitHub).
- **Priority: MEDIUM** -- Small but extremely high-quality catalog. CC-BY-4.0 is ideal for a paid app. No API means more integration work (scraping GitHub or maintaining a static catalog). Best accessed through GDL's API which already includes Book Dash content.

---

### 6. African Storybook

- **URL**: https://www.africanstorybook.org
- **Kid-appropriate books**: 3,800 original titles + 7,266 translations = ~11,000 stories total.
- **Content quality**: Good. Illustrated picture storybooks designed for early reading (ages 2-10). Created by educators and community members across Africa.
- **API availability**: No formal REST API. However, the Global African Storybook Project on GitHub (https://github.com/global-asp) provides all stories in Markdown format with images. Downloads available in multiple formats from the website (HTML, PDF, ePub, ODT). Also accessible via GDL's API.
- **License**: Creative Commons (CC-BY or CC-BY-NC, varies by story).
- **Can we embed/display legally?**: CC-BY stories yes. CC-BY-NC stories require caution in a paid app.
- **Formats**: HTML, PDF, ePub, Open Document, plain text. Audio in OGG/MP3 for some stories.
- **Age range**: Ages 2-10.
- **Languages**: 236 languages.
- **Rate limits**: N/A (GitHub static files) or via GDL API.
- **Priority: MEDIUM** -- Large collection of quality early readers. Best accessed via GDL rather than directly, since GDL already aggregates this content with a proper API.

---

### 7. Let's Read (Asia Foundation)

- **URL**: https://www.letsreadasia.org
- **Kid-appropriate books**: 8,364 books across 15 categories (STEM, animals, folk tales, empowered girls, health, etc.).
- **Content quality**: High. Books created by local authors and illustrators, curated by The Asia Foundation. Professional quality illustrations.
- **API availability**: No public API documented. Content accessible via the website and mobile apps (iOS/Android). Also available through GDL's API.
- **License**: Creative Commons (specific license per book, noted on each title).
- **Can we embed/display legally?**: Via GDL integration, yes. Direct from letsreadasia.org, would need to check ToS.
- **Formats**: In-app reader (web and mobile), downloadable for offline reading.
- **Age range**: Ages 3-10 (reading levels 1-5).
- **Languages**: 50+ Asian languages plus English.
- **Rate limits**: N/A if accessed via GDL.
- **Priority: MEDIUM** -- Strong collection especially for diverse/multicultural content. No direct API is a limitation. Best accessed through GDL which already includes Let's Read content.

---

### 8. Lit2Go (University of South Florida)

- **URL**: https://etc.usf.edu/lit2go/
- **Kid-appropriate books**: 5,000+ audio passages including book chapters, poems, short stories, fables, nursery rhymes. Approximately 200+ complete audiobooks.
- **Content quality**: High. Professionally recorded audio with accompanying PDF text. Organized by reading level (Flesch-Kincaid), making age-appropriate filtering straightforward. Pre-1922 works.
- **API availability**: No formal API. Has an RSS feed (https://fcit.usf.edu/category/lit2go-audiobooks/feed/). Content is well-structured HTML with consistent URL patterns, making it feasible to build a scraper or static catalog. Each passage has metadata (abstract, citation, playing time, word count, reading level).
- **License**: Public domain (pre-1922 works). Audio recordings are free for classroom use.
- **Can we embed/display legally?**: Text is public domain. Audio recordings are free for educational/classroom use -- commercial use terms unclear, would need to contact USF/FCIT.
- **Formats**: MP3 (audio), PDF (text), HTML (web).
- **Age range**: K-12, with reading level metadata for precise filtering.
- **Languages**: English.
- **Rate limits**: No formal limits documented.
- **Priority: MEDIUM-HIGH** -- Unique value proposition: audio + text for public domain children's literature. Reading level metadata is extremely valuable for SafeReads' age-aware filtering. The lack of a formal API is a hurdle but the content structure is consistent enough to catalog. Complements Gutenberg by adding professional audio narration.

---

### 9. DPLA Open Bookshelf

- **URL**: https://dp.la / https://ebooks.dp.la/open-bookshelf/
- **Kid-appropriate books**: Part of 6,300+ free ebooks, includes a "multicultural children's collection."
- **Content quality**: Good. Curated by librarians across the US. Mix of classics, CC-licensed works, textbooks, and children's books.
- **API availability**: OPDS feed available for integration with OPDS-compatible readers. DPLA has a general search API. The Open Bookshelf uses Library Simplified/SimplyE infrastructure.
- **License**: Mix of public domain and Creative Commons.
- **Can we embed/display legally?**: Yes for public domain and CC-licensed content.
- **Formats**: ePub (via OPDS feed).
- **Age range**: Mixed, children's collection specifically curated.
- **Languages**: Primarily English.
- **Rate limits**: Not documented for OPDS feed.
- **Priority: LOW** -- Small children's collection relative to other sources. The OPDS feed is a plus, but the children's subset is not large enough to justify dedicated integration when Open Library and Gutenberg cover similar ground with more content.

---

### 10. Wikijunior (Wikibooks)

- **URL**: https://en.wikibooks.org/wiki/Wikijunior
- **Kid-appropriate books**: ~12-15 complete books with hundreds of sections. Topics include Astronomy, Animals, Dinosaurs, Countries of the World, Science, History.
- **Content quality**: Variable. Wiki-style content, richly illustrated with photographs and diagrams. Some books are well-developed, others are incomplete stubs. Non-fiction educational content (not stories).
- **API availability**: Full MediaWiki API access. REST API at https://en.wikibooks.org/w/api.php. Can retrieve page content as HTML or wikitext. Well-documented.
- **License**: CC-BY-SA-3.0 (requires share-alike).
- **Can we embed/display legally?**: Yes with attribution and share-alike compliance.
- **Formats**: HTML (via API), PDF (via wiki export), wikitext.
- **Age range**: Ages 4-12 (designed for this range).
- **Languages**: English, Danish, Finnish, French, German, Italian, Japanese, Spanish, Arabic, Bangla.
- **Rate limits**: MediaWiki API has standard rate limits (~200 req/sec for read operations with proper User-Agent).
- **Priority: LOW** -- Small catalog, wiki-quality content is inconsistent, non-fiction only. The MediaWiki API is robust but the content volume doesn't justify the integration effort. Could be a future "non-fiction" supplement.

---

### 11. CK-12 Foundation

- **URL**: https://www.ck12.org / https://flexbooks.ck12.org
- **Kid-appropriate books**: Hundreds of FlexBook textbooks covering K-12 STEM subjects. K-5 science texts available, plus middle/high school by subject.
- **Content quality**: High. Peer-reviewed, interactive digital textbooks with embedded quizzes, videos, and adaptive practice. Used by 200M+ students worldwide.
- **API availability**: No public API documented. Content is accessible via their web platform and requires account creation.
- **Formats**: Web-based interactive reader, PDF export for some titles.
- **License**: CK-12 Foundation License (non-commercial, allows use and adaptation for non-commercial purposes).
- **Can we embed/display legally?**: Unclear for a paid product. The CK-12 license allows non-commercial use. Embedding in a paid app would likely violate terms.
- **Age range**: K-12.
- **Languages**: English primarily.
- **Rate limits**: N/A (no API).
- **Priority: LOW** -- Non-commercial license is a dealbreaker for SafeReads. Content is textbook-focused, not recreational reading. No API. Better suited as a link-out resource than an integration.

---

### 12. Unite for Literacy

- **URL**: https://www.uniteforliteracy.com
- **Kid-appropriate books**: 600+ original picture books, all specifically for young children.
- **Content quality**: Excellent. Original, purpose-built picture books with professional narration in 50+ languages. No ads, no gaming, no logins. Clean, child-safe.
- **API availability**: No public API. Partners can embed a curated selection via iframe. Would need to contact them for partnership/embedding agreement.
- **License**: Proprietary free (free to read online, but not openly licensed for redistribution).
- **Can we embed/display legally?**: Only via partnership agreement with iframe embedding. Cannot download/redistribute.
- **Formats**: Web-based reader with audio narration. No downloadable formats.
- **Age range**: Ages 2-7 (picture books for early/emergent readers).
- **Languages**: English, Spanish, Ukrainian text + 50+ narration languages.
- **Rate limits**: N/A (iframe embed).
- **Priority: MEDIUM** -- Beautiful, kid-safe content with audio narration in many languages. The partnership-only embedding model means higher effort to integrate but the content quality is outstanding. Particularly valuable for the youngest SafeReads users (ages 2-7) which Gutenberg doesn't serve well.

---

### 13. HathiTrust

- **URL**: https://www.hathitrust.org
- **Kid-appropriate books**: Part of 6.5 million+ public domain volumes. Children's books must be filtered from the general collection.
- **Content quality**: Scanned book pages, quality varies. Includes historical children's books with original illustrations.
- **API availability**: Bibliographic API (metadata) and Data API (full text/images, requires authentication). Bulk dataset downloads available for non-commercial research.
- **License**: Public domain works are freely accessible ("Full View"). Authentication required for Data API.
- **Can we embed/display legally?**: Public domain works yes, but the Data API terms specify "non-commercial research" for bulk access. Individual public domain book access should be fine.
- **Formats**: Scanned page images, plain OCR text, PDF.
- **Age range**: All ages (must filter).
- **Languages**: Multilingual.
- **Rate limits**: Requires API credentials, limits not publicly documented.
- **Priority: LOW** -- Massive collection but children's content is not curated or tagged well. Largely duplicates what's available through Open Library/Archive.org (same source institutions). The "non-commercial research" terms for bulk access add legal uncertainty.

---

### 14. Europeana

- **URL**: https://www.europeana.eu
- **Kid-appropriate books**: Part of 55 million+ digital objects. Children's content includes historical spelling books, illustrated fairy tales, etc. Not primarily a children's platform.
- **Content quality**: Variable. Aggregates from European libraries, archives, and museums. Some items are high-resolution scans of beautiful historical children's books.
- **API availability**: Free REST API with API key (free to obtain). Search, Record, and IIIF APIs. Well-documented at https://api.europeana.eu. GitHub: https://github.com/europeana/api2.
- **License**: Each item has a clear rights statement. Mix of public domain, CC licenses, and restricted items.
- **Can we embed/display legally?**: Depends on individual item rights. Public domain and CC items yes.
- **Formats**: Varies by institution (IIIF images, PDF, metadata only for some).
- **Age range**: All ages (must filter, children's content is a small subset).
- **Languages**: All European languages.
- **Rate limits**: API key required, standard rate limits.
- **Priority: LOW** -- Beautiful historical content but children's books are a tiny fraction. The effort to filter, curate, and integrate children's content from 55M items is disproportionate to the yield. Better as a future "historical children's books" special collection.

---

### 15. Storybooks Canada / Global Storybooks (Global-ASP)

- **URL**: https://global-asp.github.io/storybooks-outline/
- **Kid-appropriate books**: 40 core stories translated into dozens of languages (hundreds of versions total).
- **Content quality**: Good. Sourced from African Storybook. Illustrated stories for early readers. Available in clean Markdown format with images.
- **API availability**: All content on GitHub in Markdown format (https://github.com/global-asp). Static files, no API needed. Clean, structured, easy to parse.
- **License**: CC-BY / CC-BY-NC (inherited from African Storybook source).
- **Can we embed/display legally?**: CC-BY stories yes. Same NC caveat.
- **Formats**: Markdown (with images), HTML (via static sites).
- **Age range**: Ages 2-10.
- **Languages**: 40+ languages per story.
- **Rate limits**: N/A (GitHub static files).
- **Priority: LOW** -- Very small catalog (40 stories). Already included in GDL and African Storybook. The Markdown-on-GitHub format is developer-friendly but the content volume doesn't justify a separate integration.

---

### 16. Room to Read Literacy Cloud

- **URL**: https://literacycloud.org
- **Kid-appropriate books**: 2,700+ book titles, all specifically for children in primary school.
- **Content quality**: High. Created by professional children's authors and illustrators worldwide. Includes professional development resources for educators.
- **API availability**: No public API documented. Web-based reader. Books browsable and readable online.
- **License**: Not clearly documented. Funded by Google.org. Free to read and download but redistribution terms unclear.
- **Can we embed/display legally?**: Would need to contact Room to Read for partnership terms. Cannot assume redistribution is permitted.
- **Formats**: Web reader, downloadable for offline use.
- **Age range**: Ages 3-10 (early grade readers).
- **Languages**: 36 languages.
- **Rate limits**: N/A.
- **Priority: LOW-MEDIUM** -- Good content but no API, unclear licensing for third-party apps, and would require partnership negotiation. Lower priority than sources with clear CC licensing and APIs.

---

### 17. Poetry Foundation

- **URL**: https://www.poetryfoundation.org/audiences/children
- **Kid-appropriate books**: 450+ poems specifically tagged for children, plus nursery rhymes and animated poetry videos.
- **Content quality**: Excellent. Curated by the Poetry Foundation, one of the most respected poetry organizations. Includes both classic and contemporary poems.
- **API availability**: No public API. Content accessible via website only. Structured HTML but no documented programmatic access.
- **License**: Proprietary. Poems are copyrighted by their authors/publishers. The Poetry Foundation has display rights but redistribution is not permitted.
- **Can we embed/display legally?**: No. Content is copyrighted and cannot be redistributed or embedded in third-party apps.
- **Formats**: HTML (web only).
- **Age range**: All ages, with children's section.
- **Languages**: English.
- **Rate limits**: N/A.
- **Priority: LOW** -- Copyright restrictions make integration impossible. Could only link out to poetryfoundation.org, not display content in-app.

---

### 18. ReadWorks

- **URL**: https://www.readworks.org
- **Kid-appropriate books**: Thousands of curated nonfiction and fiction reading passages for grades K-12. Each has comprehension questions and vocabulary.
- **Content quality**: Excellent. Purpose-built for education. Leveled by grade and Lexile. Includes audio for some passages.
- **API availability**: No public API. Free platform requires account creation.
- **License**: Proprietary free (free for classroom use, not openly licensed).
- **Can we embed/display legally?**: No. Content is free for direct classroom use on their platform, not for redistribution.
- **Formats**: Web-based reader, printable worksheets.
- **Age range**: K-12.
- **Languages**: English, some Spanish.
- **Rate limits**: N/A.
- **Priority: LOW** -- Excellent educational content but closed platform with no API and no redistribution rights. Would be a "link out" recommendation at best.

---

### 19. Newsela

- **URL**: https://newsela.com
- **Kid-appropriate books**: Not books per se -- leveled news articles and reading passages. Each article available at 5 Lexile levels (grades 2-12).
- **Content quality**: High. Professional journalism adapted for different reading levels.
- **API availability**: No public API. Newsela Lite (free tier) provides one leveled article per week.
- **License**: Proprietary. Content is copyrighted.
- **Can we embed/display legally?**: No.
- **Formats**: Web-based.
- **Age range**: Grades 2-12.
- **Languages**: English, some Spanish.
- **Rate limits**: N/A.
- **Priority: NONE** -- No API, copyrighted content, not books. Does not fit SafeReads' use case.

---

### 20. Epic!

- **URL**: https://www.getepic.com
- **Kid-appropriate books**: 40,000+ books, audiobooks, and videos for kids 12 and under.
- **Content quality**: Excellent. Licensed from 250+ major publishers.
- **API availability**: No public API. Closed ecosystem (web + app).
- **License**: Proprietary. Publisher-licensed content.
- **Can we embed/display legally?**: No. Content is behind a subscription paywall. Free access only for educators during school hours.
- **Formats**: App-based reader.
- **Age range**: Ages 2-12.
- **Languages**: English.
- **Rate limits**: N/A.
- **Priority: NONE** -- Closed, proprietary, subscription-based. Direct competitor, not a source for integration.

---

### 21. Bible APIs (for homeschool audience)

- **URL**: Multiple (bible-api.com, api.esv.org, scripture.api.bible)
- **Kid-appropriate books**: Full Bible text in child-friendly translations (NIrV, ICB, etc.). Multiple free APIs available.
- **Content quality**: Definitive text, various translations. Not illustrated.
- **API availability**: Excellent. Multiple free options:
  - **bible-api.com**: No API key needed, no rate limits, 1,000+ translations
  - **ESV API** (api.esv.org): Free for non-commercial use, returns HTML/text/XML
  - **API.Bible** (scripture.api.bible): 2,500 Bible versions in 1,600+ languages, free API key
- **License**: Varies by translation. KJV and other older translations are public domain. Modern translations have specific usage terms (e.g., ESV allows up to 500 verses without written permission).
- **Can we embed/display legally?**: Public domain translations (KJV, ASV, etc.) yes. Modern translations have quotation limits and attribution requirements.
- **Formats**: JSON, HTML, plain text, XML.
- **Age range**: All ages (child-friendly translations available).
- **Languages**: 1,600+ languages via API.Bible.
- **Rate limits**: bible-api.com has none. ESV API has reasonable limits. API.Bible requires key.
- **Priority: MEDIUM** -- Directly relevant to SafeReads' homeschool audience. Easy to integrate (well-documented REST APIs, no auth needed for some). Could add a "Bible Reading" section alongside free books. KJV/ASV (public domain) are safe; modern child-friendly translations need careful license compliance.

---

### 22. Christian Classics Ethereal Library (CCEL)

- **URL**: https://ccel.org
- **Kid-appropriate books**: Limited children's content. Primarily adult theological texts (Apologetics, Commentaries, Sermons). Genres include "Fiction" and "Creeds and Catechisms" which could have some kid-relevant material (e.g., Pilgrim's Progress, catechisms).
- **Content quality**: High. Carefully digitized theological texts in ThML format, auto-converted to HTML/PDF.
- **API availability**: No formal API documented. Browsable by author/title/subject with search.
- **License**: Public domain (pre-1923 texts primarily).
- **Can we embed/display legally?**: Public domain texts yes.
- **Formats**: HTML, PDF, ePub, ThML (proprietary XML).
- **Age range**: Primarily adult. Some catechism materials suitable for older children (10+).
- **Languages**: English primarily, some other languages.
- **Rate limits**: Not documented.
- **Priority: LOW** -- Very limited children's content. The homeschool audience might appreciate Pilgrim's Progress or catechism texts, but these are already available via Gutenberg. Not worth dedicated integration.

---

### 23. Wikisource

- **URL**: https://en.wikisource.org
- **Kid-appropriate books**: Thousands of public domain works transcribed. Children's content includes fairy tales, nursery rhymes, classic children's novels. Alternative transcriptions to Gutenberg.
- **Content quality**: Good to excellent. Community-proofread transcriptions. Clean text, no scan artifacts.
- **API availability**: Full MediaWiki API. Same infrastructure as Wikipedia.
- **License**: Texts are public domain. Wikisource's own contributions are CC-BY-SA.
- **Can we embed/display legally?**: Yes (public domain works).
- **Formats**: HTML (via API), wikitext, PDF (via wiki export).
- **Age range**: All ages (must filter for children's content).
- **Languages**: 70+ language editions.
- **Rate limits**: Standard MediaWiki API limits.
- **Priority: LOW** -- Largely duplicates Gutenberg content with less convenient access (MediaWiki API vs. Gutendex). Some unique transcriptions not on Gutenberg, but the overlap is high. Not worth separate integration unless specific titles are missing from Gutenberg.

---

### 24. OpenStax

- **URL**: https://openstax.org
- **Kid-appropriate books**: K-12 digital textbooks (via OpenStax K-12 initiative). Primarily high school level. Some content adaptable for middle school.
- **Content quality**: Excellent. Peer-reviewed, Rice University-backed, CC-licensed.
- **API availability**: No public API documented.
- **License**: Creative Commons (CC-BY for most textbooks).
- **Can we embed/display legally?**: CC-BY allows commercial use with attribution.
- **Formats**: Web, PDF, audiobook.
- **Age range**: High school primarily, some middle school.
- **Languages**: English.
- **Rate limits**: N/A.
- **Priority: LOW** -- Textbooks, not recreational reading. Primarily high school level. No API. Could be relevant for a "SafeStudy" integration but not for SafeReads.

---

### 25. Open Textbook Library

- **URL**: https://open.umn.edu/opentextbooks
- **Kid-appropriate books**: Minimal children's content. Primarily college-level textbooks.
- **Content quality**: High (peer-reviewed).
- **API availability**: No documented API.
- **License**: Various CC licenses.
- **Can we embed/display legally?**: N/A (no relevant children's content).
- **Age range**: College level.
- **Priority: NONE** -- Not relevant for SafeReads. College-level textbooks.

---

### 26. Saylor Academy

- **URL**: https://www.saylor.org
- **Kid-appropriate books**: Formerly hosted 100+ free open textbooks (CC-licensed). As of mid-2024, no longer hosts book copies -- redirects to courses at learn.saylor.org. K-12 courses aligned to Common Core exist but are course-based, not book-based.
- **API availability**: No API.
- **License**: CC licenses for course materials.
- **Priority: NONE** -- No longer hosts books. Course-based platform not relevant for SafeReads.

---

### 27. International Children's Digital Library (ICDL)

- **URL**: http://www.childrenslibrary.org
- **Kid-appropriate books**: ~4,000 children's books in 59 languages. Specifically designed for ages 3-13.
- **Content quality**: Good. Curated collection of digitized children's books from around the world.
- **API availability**: No current API. The site has been rebuilt as a static version by the University of Maryland. The original rich interface and search functionality are reduced.
- **License**: Varies by book (publisher permissions, not openly licensed).
- **Can we embed/display legally?**: Unclear. Books are hosted with publisher permission for ICDL specifically. Redistribution rights are per-publisher.
- **Formats**: Scanned page images (web reader).
- **Age range**: Ages 3-13.
- **Languages**: 59 languages.
- **Rate limits**: N/A.
- **Priority: LOW** -- Once a groundbreaking resource, now a static archive. No API, unclear redistribution rights, limited functionality. The content that was useful from ICDL has largely been superseded by GDL, Bloom Library, and other modern initiatives.

---

### 28. National Library of New Zealand (DigitalNZ)

- **URL**: https://natlib.govt.nz / https://digitalnz.org
- **Kid-appropriate books**: Small subset. The National Children's Collection has 100,000+ physical books but digital availability is limited. Some early NZ children's novels digitized via NZ Electronic Text Centre.
- **Content quality**: High for what's digitized.
- **API availability**: DigitalNZ API available (aggregates metadata from 150+ NZ organizations).
- **License**: Varies by item.
- **Can we embed/display legally?**: Depends on individual items.
- **Formats**: Metadata primarily, some full text.
- **Priority: NONE** -- Extremely limited digital children's book content. Not worth integration effort.

---

### 29. Smashwords Free Section

- **URL**: https://www.smashwords.com (OPDS: smashwords.com/lexcycle)
- **Kid-appropriate books**: Part of 70,000+ free titles. Children & Middle Grade is one genre category, but count is not broken out.
- **Content quality**: Highly variable. Self-published content with no quality control. Would require significant curation/filtering.
- **API availability**: OPDS catalog available. No official REST API (unofficial third-party APIs exist).
- **License**: Proprietary. Authors set their own prices; "free" books are still copyrighted with limited usage rights.
- **Can we embed/display legally?**: No. Free to read, not free to redistribute. Authors retain copyright and control distribution channels.
- **Formats**: ePub, PDF, MOBI, and others via Smashwords distribution.
- **Age range**: All ages (must filter).
- **Languages**: Primarily English.
- **Rate limits**: Not documented for OPDS.
- **Priority: LOW** -- Copyright restrictions prevent embedding content. Quality is inconsistent. OPDS feed could be useful for discovery/linking but not in-app reading.

---

### 30. Amazon Kindle Free Section

- **URL**: https://www.amazon.com (Kindle Store > Free)
- **Kid-appropriate books**: Thousands of temporarily-free Kindle books, including children's titles. Selection changes constantly.
- **API availability**: Product Advertising API (PA API) available through Amazon Associates program. Can search by category and filter by price ($0.00).
- **License**: Proprietary. Books are copyrighted; "free" means free to download to Kindle, not free to redistribute.
- **Can we embed/display legally?**: No. Cannot display book content. Can only link to Amazon product pages via affiliate links.
- **Formats**: Kindle format only (not embeddable).
- **Age range**: All ages.
- **Languages**: Multiple.
- **Rate limits**: PA API has rate limits tied to revenue generation.
- **Priority: LOW** -- Cannot embed content. Could add as a "Find Free Kindle Books" discovery feature using affiliate links, but does not add in-app reading content. Affiliate commission on free books is $0. Might add value as a "free book finder" feature pointing parents to free Kindle downloads.

---

### 31. Mustardseed Books

- **URL**: Available via freekidsbooks.org
- **Kid-appropriate books**: Small collection (~20-30 titles). Early readers and leveled books for ages 4-8.
- **Content quality**: Good for the level. Simple illustrated non-fiction and early readers. Leveled (guided reading levels).
- **API availability**: No API. Hosted on freekidsbooks.org as PDFs.
- **License**: Creative Commons.
- **Can we embed/display legally?**: Yes with attribution.
- **Formats**: PDF, web reader.
- **Age range**: Ages 4-8.
- **Languages**: English, some Spanish.
- **Rate limits**: N/A.
- **Priority: LOW** -- Very small collection. Content is available through freekidsbooks.org which also has no API. Not worth dedicated integration; better accessed through a broader aggregator if one existed.

---

## Summary Matrix

| Source | Kid Books | API? | License | Embed OK? | Priority |
|--------|-----------|------|---------|-----------|----------|
| Open Library | 10,000s | REST + iframe | PD + CDL | Yes (PD) | HIGH |
| Global Digital Library | 8,000+ | REST + OPDS | CC (various) | Yes* | HIGH |
| Bloom Library | 22,000+ | OPDS | CC (various) | Yes* | HIGH |
| Lit2Go | 5,000+ passages | RSS only | PD | Likely | MED-HIGH |
| Unite for Literacy | 600+ | Partnership only | Proprietary free | Partnership | MEDIUM |
| Bible APIs | Full Bible | REST (multiple) | PD + licensed | Yes (PD) | MEDIUM |
| Book Dash | ~200 | GitHub static | CC-BY-4.0 | Yes | MEDIUM |
| African Storybook | 11,000+ | GitHub + GDL | CC (various) | Yes* | MEDIUM |
| Let's Read | 8,364 | Via GDL | CC (various) | Via GDL | MEDIUM |
| Archive.org Children's | 1,000s | Same as OL | PD + CDL | Yes (PD) | MEDIUM |
| Room to Read | 2,700+ | None | Unclear | Needs partnership | LOW-MED |
| DPLA Open Bookshelf | ~6,300 | OPDS | PD + CC | Yes | LOW |
| Wikijunior | ~15 books | MediaWiki | CC-BY-SA | Yes | LOW |
| Smashwords | Unknown | OPDS | Proprietary | No | LOW |
| HathiTrust | Millions | REST (auth) | PD (bulk=NC) | Yes (PD) | LOW |
| Europeana | 55M objects | REST | Various | Depends | LOW |
| Storybooks Canada | 40 stories | GitHub static | CC | Yes* | LOW |
| CCEL | Few relevant | None | PD | Yes | LOW |
| Wikisource | Overlaps PG | MediaWiki | PD | Yes | LOW |
| Amazon Kindle Free | 1,000s | PA API | Proprietary | No | LOW |
| ICDL | 4,000 | None (static) | Per-publisher | Unclear | LOW |
| Poetry Foundation | 450+ poems | None | Copyrighted | No | LOW |
| OpenStax | HS textbooks | None | CC-BY | Yes | LOW |
| ReadWorks | 1,000s passages | None | Proprietary | No | LOW |
| Newsela | Articles | None | Proprietary | No | NONE |
| Epic! | 40,000 | None | Proprietary | No | NONE |
| Open Textbook Library | College only | None | CC | N/A | NONE |
| Saylor Academy | Discontinued | None | CC | N/A | NONE |
| NZ National Library | Minimal digital | REST | Various | Depends | NONE |
| CK-12 | STEM textbooks | None | NC only | No (NC) | NONE |
| Mustardseed | ~25 | None | CC | Yes | LOW |

*CC-BY-NC content requires filtering out for use in a paid app.

---

## Top 5 Recommendations for Next Integration

### 1. Global Digital Library (GDL) -- INTEGRATE FIRST

**Why**: One API to rule them all. GDL aggregates content from Book Dash, African Storybook, StoryWeaver (which we already have), Let's Read, and more. By integrating GDL's REST API, SafeReads gains access to 8,000+ purpose-built children's books through a single endpoint. The API is documented, returns CC license info per book, and supports language filtering.

**Effort**: Medium. REST API integration similar to existing Gutendex integration. Need to filter by license (exclude CC-BY-NC for a paid app) and map reading levels to SafeReads age groups.

**What it adds**: Massive catalog of illustrated, modern children's picture books and early readers -- exactly the content gap that Gutenberg (old, text-heavy classics) cannot fill. Multicultural content in 100+ languages.

### 2. Open Library + Archive.org BookReader -- HIGH IMPACT

**Why**: Open Library's APIs are comprehensive and the BookReader iframe is the fastest path to in-app reading of thousands of public domain illustrated children's books. The Subjects API supports `juvenile_fiction` and `juvenile_literature` for precise filtering. The Covers API provides book cover images. Public domain works can be read in-app via embedded BookReader without any lending/DRM concerns.

**Effort**: Medium. Multiple API endpoints to integrate (Search, Subjects, Read, Covers). BookReader embedding is straightforward (iframe). Need to filter for public domain ("Full View") items only to avoid lending flow complexity.

**What it adds**: Illustrated children's books (scanned originals with pictures), which Gutenberg largely lacks. Also adds a visual book reader experience rather than plain text.

### 3. Bloom Library -- LARGEST CHILDREN'S COLLECTION

**Why**: 22,000+ books specifically for children, with an OPDS API that's documented and supports language/collection filtering. The accessibility features (audio narration, sign language, image descriptions) align perfectly with SafeReads' inclusive mission. ePub format works well for in-app readers.

**Effort**: Medium-High. OPDS integration is different from REST (Atom/XML format). Requires API credentials (need to contact bloom-support@sil.org). ePub rendering needed if not already in place. Need license filtering.

**What it adds**: The largest single collection of children's books available through an API. Strong accessibility features. ePub format enables better reading experience than scanned pages.

### 4. Lit2Go -- UNIQUE AUDIOBOOK VALUE

**Why**: Lit2Go is the only source offering professional audio narration paired with text for public domain children's literature. The reading level metadata (Flesch-Kincaid) enables precise age-appropriate filtering that complements SafeReads' kid profiles. Having "read along" audio for classic stories like Aesop's Fables, Alice in Wonderland, and fairy tales is a compelling feature for young readers.

**Effort**: Medium-High. No formal API means building a catalog from RSS feed and/or structured scraping of their well-organized site. Audio hosting/streaming adds technical complexity. Need to confirm commercial use terms for the audio recordings (text itself is public domain).

**What it adds**: Audio narration for classic children's literature -- a genuinely unique feature no other free source provides at this quality level. Reading level metadata for better age filtering.

### 5. Bible APIs -- HOMESCHOOL AUDIENCE FIT

**Why**: SafeReads' primary audience includes homeschool families, many of whom are Christian. Adding Bible reading (especially child-friendly translations) directly in the app creates immediate value for this audience. The APIs are extremely well-documented, free, require no authentication (bible-api.com), and have no rate limits. Integration is trivially easy compared to other sources.

**Effort**: Low. REST API call, JSON response, display text. bible-api.com requires zero setup. For public domain translations (KJV, ASV, WEB), there are no licensing concerns whatsoever.

**What it adds**: Direct appeal to core homeschool audience. Differentiation from competitors. Could offer daily reading plans, chapter navigation, and age-appropriate translation selection. Very low effort for meaningful user value.

---

## Integration Sequence Recommendation

1. **GDL** (weeks 1-2): Biggest content gain per unit of effort. Single API, 8K+ books.
2. **Bible APIs** (week 2): Trivial to integrate, high audience value.
3. **Open Library** (weeks 3-4): BookReader iframe for illustrated books, public domain filtering.
4. **Bloom Library** (weeks 5-6): OPDS integration, 22K books, accessibility features.
5. **Lit2Go** (weeks 7-8): Audio narration catalog, reading level metadata.

This sequence prioritizes quick wins (GDL, Bible) before tackling more complex integrations (OPDS, audio), while steadily expanding SafeReads' free book catalog from the current ~41K (Gutenberg + StoryWeaver) to potentially 70K+ books across diverse formats, languages, and reading levels.

---

## Legal Notes

- **CC-BY-4.0**: Safest license for a paid app. Requires attribution only. (Book Dash, many GDL books)
- **CC-BY-SA**: Requires share-alike. Any adaptations must use the same license. OK for display, problematic if SafeReads modifies content. (Wikijunior, some GDL books)
- **CC-BY-NC**: Non-commercial only. Cannot be used in a paid app without separate permission. Must be filtered out. (Some African Storybook, some GDL books, some Bloom books)
- **Public Domain**: No restrictions whatsoever. (Gutenberg, Bible KJV/ASV, Lit2Go texts, Open Library "Full View")
- **Proprietary Free**: Free to read on the source platform but cannot be redistributed. (Unite for Literacy, ReadWorks, Newsela, Epic, Smashwords)

For any CC-BY-NC content: either filter it out entirely, or make those books available only to users on the free tier (if SafeReads has one). The cleanest approach is to filter to CC-BY and CC-BY-SA and public domain only.
