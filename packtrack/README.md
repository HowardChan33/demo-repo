# PackTrack

Team race progress tracker for [Race Timing Solutions](https://www.racetimingsolutions.com/) / RaceTec `myresults` pages.

Seeded from:

`https://results.racetimingsolutions.com/myresults.aspx?uid=16387-6650-1-182993`

## Why paste-import?

The RTS results host sits behind Cloudflare. This app cannot reliably fetch live pages from a cloud VM, so you paste myresults HTML (or split lines) to update the pack. Data is stored in the browser.

## Develop

```bash
npm install
npm run dev
npm test
npm run build
```
