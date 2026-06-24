# Android, Web, OTA, And Releases

Bright OS uses public version format `X.Y.Z.S`.

- Current public baseline: `0.0.1.1`.
- Ordinary web/OTA releases increment `Z`.
- APK releases increment `S`.
- Browser web and Android OTA use the same public version.
- Android `versionCode` is technical install metadata; baseline is `1`.

Use one build for ordinary web-layer publication:

```bash
npm run publish:client-web-layer
```

Build and publish a release APK only when native Android code, Capacitor config, permissions, signing, manifest values, application id, SDK versions, icons, splash assets, native plugins, or native compatibility boundaries change.

Release APK signing is env-only. Required variables:

- `BRIGHT_OS_ANDROID_KEYSTORE_PATH`
- `BRIGHT_OS_ANDROID_STORE_PASSWORD`
- `BRIGHT_OS_ANDROID_KEY_ALIAS`
- `BRIGHT_OS_ANDROID_KEY_PASSWORD`

Do not commit APKs, OTA bundles, release pages, keystores, signing passwords, or generated deploy output.
