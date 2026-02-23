# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-23

### Added

- Progressive Web App support via `vite-plugin-pwa` and Workbox.
- App update notification banner with `Update now` and `Later` actions when a new version is available.
- Native-style startup splash screen with minimum 1 second duration and fade-out after first data load.
- Loyalty membership form field for alliance/group (for example, `Star Alliance`, `SkyTeam`, `Oneworld`).
- Loyalty card actions for `Edit`, `Show QR/Barcode`, `Delete`, and `Copy number`.
- Clipboard copy feedback for loyalty membership numbers.
- Prettier formatting workflow and Lefthook Git hooks.

### Changed

- Loyalty cards are no longer fully clickable; explicit action buttons are used instead.
- Loyalty list now shows alliance/group badges for faster identification.
- Loyalty add (`+`) header button styling is aligned with flights page styling.
- Stats page hides `Airplanes` and `Airlines` sections when there is no data.
- Flights and home views were refined with improved empty-state and list behavior.

### Fixed

- Service worker registration flow is now aligned with `vite-plugin-pwa` runtime registration.
- Type support for PWA virtual modules was added to avoid TypeScript resolution errors.
- Lint issues related to impure render-time logic in splash timing were resolved.
