# Flex Academy landing page

Take-home design task for The Flex & Base360: a landing page for Flex Academy, a programme that teaches operators to build and scale a short-term rental company (see `brief.pdf`).

- `concepts/hero-concepts.html`: three interactive hero directions (desktop 1440 / mobile 390) with notes and a recommendation.
- `sites/01-receipts/`: Exploration 1, "The Operating Manual". The page is The Flex's own ops manual, annotated by the founders: a scroll-driven cover where houses multiply from 1 flat to 7 cities, a printed receipt, troubleshooting table, binder chapters, inventory sheet, comparison receipts, case files, house rules and a check-in ticket. Static HTML/CSS/JS with self-hosted fonts (SIL OFL): Gilda Display, the closest open match to the serif in The Flex's "the flex." wordmark, used only in the "flex academy." wordmark; Uncut Sans (Kasper Nordkvist, as used on The Flex's site) for headlines, body and interface; IBM Plex Mono for receipts and labels. Swap `fonts/gilda-display.woff2` for The Flex's licensed logo font if they supply it. Serve the folder, e.g. `python3 -m http.server`.

- `sites/02-keys/`: Exploration 2, "The Key Board". The page adapts to the visitor: they set how many units they run on a hotel-style key board, and the hero advice, an illustrative week of operations work (now vs after 12 weeks), the recommended starting chapter, the CTA labels and the booking flow (which skips the units question) all respond. Aspekta for all text, with BDO Grotesk supplying only apostrophes and commas via a unicode-range subset (both SIL OFL, self-hosted).

- `sites/03-214am/`: Exploration 2 (take two), "2:14am". The page is a night in the life of an operator's phone. A pinned scroll story runs the lock-screen clock from 2:14 to 7:30am: notifications pile up (the stall), then each of the four chapters silences its share, ending on "7:30am. Nothing needs you." What you get is a tappable home screen; objections, comparison and fit are a chat thread; booking is a phone app ending in a lock-screen confirmation. On mobile the device frame drops away and the visitor's own phone becomes the phone. Aspekta, with BDO Grotesk for apostrophes and commas.

Placeholders shown as `[X]` (dashed brass outline) await real figures from The Flex and Base360.

Primary audience: operators with 5–30 units. Primary conversion: "Book a free strategy call".
