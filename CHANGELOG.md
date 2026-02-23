# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-23

### Added

- Flight-to-membership linking with optional `mileage granted` on each flight.
- New membership mileage history page showing recent flight mileage entries.
- Quick add (`+`) from membership mileage page to create a pre-linked flight.
- Full-screen modal preview for membership QR/barcode, including member name and number.
- Image-based membership code detection now supports separate QR and barcode targets.

### Changed

- Membership data now stores QR and barcode values in separate fields.
- Membership cards now include a mileage history shortcut action.
- Membership card delete action moved to edit page with confirm/cancel modal.
- Membership form now enforces uppercase for airline, program, alliance, and member name.
- Settings import result now appears in a modal instead of inline message box.
- CSV/JSON import-export updated for new flight and membership fields (`membershipId`, `mileageGranted`, `qrCodeValue`, `barcodeValue`) with backward compatibility.
- Mileage list layout simplified by removing the `Earned` column.

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
