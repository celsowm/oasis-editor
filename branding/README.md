# Oasis Editor Brand Assets

`branding/source/`
- `oasis-icon.svg`: canonical full artwork imported from the original design.

`branding/generated/`
- `logo-full.png`: full vertical artwork for docs, README, and larger previews.
- `logo-mark-square.png`: smaller derivative of the original full artwork used for icon-like surfaces.
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`: browser favicon set.
- `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`: app-style icons.
- `github-pages-icon.png`: square preview asset for docs and repository collateral.
- `social-card.png`: share image for Open Graph and Twitter cards.

`public/branding/`
- Published copies of the generated assets used by Vite during site builds.

Regenerate everything with:

```bash
npm run brand:generate
```
