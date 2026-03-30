# SafeStudy TODO

## Code Quality (from audit)
- [ ] Refactor KidSearch.jsx (1,659 lines) into sub-components: SearchInput, ResponseDisplay, ImageLightbox, DiagramRenderer, VoiceSearch
- [ ] Remove all console.log statements from production code
- [ ] Add ErrorBoundary component wrapping all routes
- [ ] Add search cache cleanup cron job

## UX Fixes (from Chrome extension review)
- [ ] Fix duplicate history entries (logging both Learn + Images mode as separate events)
- [ ] Fix back arrow confusion — profile switch arrow looks like nav back button
- [ ] Add "Not appropriate?" flag button on results for parents/kids to report bad results
- [ ] Add safety indicator badge in kid UI (small shield icon, always visible)
- [ ] Add value proposition text on profile picker screen ("AI-powered search, built for kids")
- [ ] Make Family Code less technical-looking on profile picker
- [ ] Increase visual weight of unselected Learn/Images tabs
- [ ] Smoother fade-in transition from skeleton to loaded content
- [ ] Add delete button (x) on individual history items in autocomplete dropdown
- [ ] Add skip-navigation for accessibility
- [ ] Add font-size control for differently-abled users
- [ ] Clarify image attribution — "Filtered by SafeStudy" not just "Google"
- [ ] Deduplicate search history entries

## Monetization (later)
- [ ] Stripe integration (webhook handler, checkout, portal)
- [ ] Payment UI (SubscriptionCard, upgrade buttons)
- [ ] Trial expiration cron job
- [ ] Subscription sync hook (useSubscriptionSync)
- [ ] Complete email system (subscription, payment failed, cancellation)

## Polish
- [ ] Landing page: add testimonials, stronger CTA messaging
- [ ] Admin dashboard: break into sub-components
- [ ] PWA support (service worker, manifest)
- [ ] Full ARIA label pass
- [ ] Mobile responsiveness testing
- [ ] Performance audit (bundle size, Lighthouse)

*Last updated: Mar 29, 2026*
