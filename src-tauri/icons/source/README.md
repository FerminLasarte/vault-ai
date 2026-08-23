# Icon sources

`logo-vault.svg` is the original artwork. `app-icon.svg` is that same artwork
centred on a padded square canvas, which is what the icon generator needs — an
app icon has to be square, and macOS expects breathing room rather than art that
bleeds to the edge.

Regenerate every platform icon after changing either file:

```bash
npx tauri icon src-tauri/icons/source/app-icon.svg
```

That command also writes `android/` and `ios/` directories. This is a
desktop-only project, so delete them afterwards.

The in-app mark is not generated from these: it lives in
`src/components/VaultLogo.tsx`, which takes `currentColor` so it follows the
theme instead of being a fixed black-on-white image.
