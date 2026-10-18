# Testing

Every pull request (PR) is tested automatically on GitHub before you install anything on your phone. Installing a build on the phone is the last step: a final check of what automation can't judge.

## What runs on every PR

The PR page shows a check called **CI** with two parts:

1. **Type check and tests** (about 3 minutes)
   - **Type check (tsc):** catches code mistakes, like a typo in a name or a missing value.
   - **Domain tests (`npm test`):** the app's rules, with no screens. For example: undoing "done" puts the old date back, deleting then undoing restores the item, items without a repeat sort last and get no reminders.
   - **Component tests (`npm run test:ui`):** the real screens rendered in a simulated phone. They tap buttons and type text, then check what appears.
2. **Android flows (Maestro)** (about 15–25 minutes)
   - Builds a test version of the app and runs it on an Android emulator (a virtual phone).
   - A robot taps through the main journeys:
     - adding an item, with and without a repeat
     - the "Add a name to save" hint
     - marking done, then Undo
     - editing an item
     - deleting an item, then Undo
     - the header buttons (＋ and Account)
     - reaching Save while the keyboard is open
   - It saves screenshots you can download.

Part 2 only starts if part 1 passes.

## What is *not* tested automatically

- **Real sign-in and syncing with your Supabase account.** Test builds use a pretend, in-memory backend: always signed in, and starts empty. That keeps tests fast and means no real accounts or data are touched. Sign-in, sync between devices and account deletion still need a check on the phone.
- **How things look and feel on your own phone:** keyboard behaviour on your keyboard app, exact spacing around the status bar and the bottom navigation bar, fonts, and colours. The emulator is a standard Pixel-style virtual phone.
- **Exactly where things sit on screen.** The flows can show that the header buttons *work* (if they were under the status bar, the taps would fail), but they can't measure positions. The screenshots let you look.
- **Notification timing.** Reminders are scheduled days ahead; tests check *what* gets scheduled, not that it arrives at 9am.
- **The camera / food scan.**
- **iOS.**

## How to read a failed check

1. Open the PR on GitHub and scroll to the checks near the bottom. A red ✗ marks the part that failed.
2. Click **Details** next to the red one. The failing step is marked with a red ✗.
   - **Type check:** the first line names the file and line, e.g. `src/screens/AddItemScreen.tsx(42,5): error ...`.
   - **Domain tests / component tests:** look for lines starting with `✕` (the test's name says what broke) and `●` (what was expected versus what happened).
   - **Android flows:** the log names the flow that failed, e.g. `06-delete-undo`, and the step, e.g. `Assert that "Passport deleted" is visible... FAILED`.
3. For Android flow failures, scroll to the bottom of the run's summary page. Under **Artifacts**, download **maestro-results**. It holds a screenshot of each flow's key moment, plus the screen at the moment of failure (inside `debug/`).

If only the Android flows failed and the message mentions the emulator or a timeout, before any of our own steps ran, it may be a GitHub hiccup. Re-run it once with the **Re-run jobs** button. If it fails again, it's real.

## Running tests yourself (optional)

```
npm install
npx tsc --noEmit
npm test            # domain tests
npm run test:ui     # component tests
```

The Maestro flows need an Android emulator or a phone with USB debugging, plus a test build (made with `EXPO_PUBLIC_E2E=1`). CI does this for you, so you don't need to.

## Where things live

- `src/**/__tests__/*.test.ts`: domain tests (Jest, `jest.config.js`)
- `src/**/__tests__/*.ui.test.tsx`: component tests (Jest + jest-expo + React Native Testing Library, `jest.ui.config.js`, mocks in `jest.ui.setup.js`)
- `.maestro/`: Android flows, one file per journey
- `.github/workflows/ci.yml`: the CI check
- `src/lib/fakeSupabase.ts`: the in-memory backend used by tests
