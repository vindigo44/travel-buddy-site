# Travel Buddy — public site

The Travel Buddy app's public pages, served by GitHub Pages at https://vindigo44.github.io/travel-buddy-site/

- `index.html` — home (design: Claude Design project bbb979c4, `Home.dc.html`)
- `support.html` — contact and FAQ, the App Store support URL (design: `Support.dc.html`)
- `privacy.html` — privacy policy (the app links to it; design: `Privacy.dc.html`, text from `PRIVACY.md`)
- `terms.html` — terms of use and subscription (the app links to it; design: `Terms.dc.html`)
- `delete-account.html` — deleting the account with or without the app, and what it erases (Google Play's data deletion URL; design: `DeleteAccount.dc.html`)
- `legal.html` — legal notice (design: `Legal.dc.html`); the publisher's details are still marked placeholders, so it is `noindex` and not linked from the footer yet
- `auth.html` — where Supabase sends an email link it can't open in the app (set it as the project's Site URL): link worked (phone or computer), expired, or password reset to finish in the app; `?state=confirmed|expired|phone|recovery` previews each (design: `Auth.dc.html`)
- `join.html` — an invitation to a shared trip (`?code=`): opens the app at `travelbuddy://join?code=…`, with the code to type if it isn't installed; `noindex`
- `trip.html` — a trip's public page (`?t=` slug): reads what its creator published through Supabase's `get_public_trip` with the anon key (public by design), renders it with `textContent` only, and offers "Copy this trip into Travel Buddy"; `noindex`
- `404.html` — GitHub Pages serves it at any missing address, so it uses `<base href="/travel-buddy-site/">`: change it if the site moves to its own domain (design: `NotFound.dc.html`)

Plain HTML, CSS and a little JavaScript, no build step, no outside request except `trip.html`'s read of the
published trip (the Space Grotesk font is in `assets/fonts`, SIL OFL). Each page holds English and French; `assets/prefs.js` shows one and sets the
theme (`?lang=` / `?theme=`, then the visitor's choice from the header's switches, then the browser's;
English and the system's theme without JavaScript). `assets/motion.js` plays the animations (the
design's `site-motion.js`): once each, nothing with Reduce Motion, content readable without it.
The English privacy policy's source is `PRIVACY.md` in the app's repo: change both together.

Work happens in the app's repo (private), folder `site/` on `main` (the old `site` branch is behind it); publishing copies that folder
to the public repo `vindigo44/travel-buddy-site`, without `BRIEF.md` (the working brief: content, style,
animations and design prompts).

Preview: `python3 -m http.server 8123` in this folder, then http://127.0.0.1:8123
