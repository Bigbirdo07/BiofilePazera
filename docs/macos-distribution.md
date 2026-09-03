# BioFile Toolkit V1 — macOS Packaging & Distribution Readiness

**Version**: `1.0.0-rc.2`

---

## 1. Packaging Commands

To build the standalone `.app` and `.dmg` installer bundle on macOS:

```bash
# Build desktop app bundle
npm run tauri build
```

The output artifacts will be placed in:
`src-tauri/target/release/bundle/dmg/biofile-toolkit_1.0.0-rc.2_aarch64.dmg`
`src-tauri/target/release/bundle/macos/biofile-toolkit.app`

---

## 2. Code Signing & Notarization Checklist

For public macOS distribution outside developer machines, Apple Developer credentials are required:

1. **Apple Developer ID Application Certificate**: Installed in macOS Keychain.
2. **`APPLE_SIGNING_IDENTITY`**: Set in build environment.
3. **Apple Notarization (`xcrun notarytool`)**: Submit `.dmg` for Apple notarization before public release.

---

## 3. Gatekeeper User Workaround (Unsigned Development Build)

If testing an unsigned `.app` on macOS beta tester machines:

```bash
# Clear Gatekeeper quarantine attribute if blocked on first launch
xattr -cr /Applications/biofile-toolkit.app
```
