# booba-pass Usage Guide

This guide explains the main workflows inside the app.

## 1. Home and navigation

- Open the app and use bottom navigation to move between:
  - Home
  - Flights
  - Map
  - Stats
  - Loyalty
- Use the header actions on each page to create new records quickly.

## 2. Add and manage flights

### Create a flight

1. Go to `Flights`.
2. Tap `+`.
3. Fill required fields:
   - Departure airport
   - Arrival airport
   - Departure/arrival schedule
   - Airline
   - Flight number
4. Add optional fields such as seat, aircraft, notes, photos, boarding pass, and tracking URL.
5. Optionally link a loyalty membership and add mileage granted for that flight.
6. Save.

### Edit or delete a flight

1. Open a flight from the list.
2. Use the edit action to update details.
3. Use delete to remove the flight.

### Past/upcoming filters

- In `Flights`, switch between `All`, `Past`, and `Upcoming`.

## 3. Map view

- Go to `Map` to visualize your routes.
- The map reflects flights currently stored on your device.

## 4. Stats view

- Go to `Stats` for:
  - Total flights
  - Total distance
  - Total hours
  - Aircraft breakdown (shown only when data exists)
  - Airline distribution (shown only when data exists)
- Use the year selector to filter stats by year or view all-time.

## 5. Loyalty memberships

### Create a membership

1. Go to `Loyalty`.
2. Tap `+`.
3. Enter:
   - Airline name
   - Program name (optional)
   - Alliance/group (optional)
   - Member full name
   - Membership number
   - QR code value (optional)
   - Barcode value (optional)
4. Optionally upload an image of the QR/barcode; the app auto-detects and fills the corresponding field.
5. Save.

### Membership card actions

Each loyalty card includes explicit buttons:

- `Mileage history`: open list of recent flights and mileage linked to that membership
- `Edit`: open edit form
- `Copy number`: copy membership number to clipboard
- `Show QR` / `Show barcode`: open full-screen scan code preview

### Delete a membership

- Open the membership `Edit` page.
- Tap `Delete Membership` at the bottom.
- Confirm in the modal.

### Membership mileage history

- Open `Loyalty` and tap the mileage history icon on a card.
- The list is ordered by most recent flights first.
- Each row shows flight code, route, date, and granted mileage.
- Tap `+` on that page to create a new flight already linked to that membership.

## 6. Backup, restore, and maintenance

Go to `Settings` -> `Data & Privacy`.

### Export

- `Full Backup (JSON)`: exports flights + loyalty + media metadata fields.
- `Flights Data (CSV)`: exports flights in CSV format, including membership link and mileage fields.

### Import

- Import `.json` or `.csv`.
- Import uses smart upsert:
  - existing matching records are updated
  - new records are added
- Import supports old and new membership code structures (legacy `codeValue/codeType` and split `qrCodeValue/barcodeValue`).

### Maintenance

- `Fix Missing Timezones`: fills missing flight timezone data from local airport database.

### Danger zone

- `Clear All App Data` removes all local flights, memberships, and related stored data.

## 7. Theme and appearance

In `Settings` -> `Appearance`, choose:

- Light
- Dark
- System

## 8. PWA install and updates

### Install

- iOS Safari: Share -> Add to Home Screen
- Android Chrome: Menu -> Install app

### Update flow

- When a new app version is available, a banner appears.
- Tap `Update now` to reload with latest assets.
- Tap `Later` to dismiss temporarily.

### Settings feedback

- Import completion results are shown in a modal dialog (success or failure).

### Splash screen behavior

- On app launch, splash shows for native feel.
- It stays visible for at least 1 second and hides after first data load.

## 9. Data model notes

- Data is stored locally in IndexedDB on your device/browser.
- Uninstalling the app or clearing site data can remove local records.
- Keep periodic JSON backups if the data is important to you.
