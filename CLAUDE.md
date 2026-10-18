# Since: notes for Claude

Expo app (SDK 54 packages, but React Native 0.76.3 / React 18.3.1 are pinned), Android-first. The owner is non-technical and tests on a real Android phone via an EAS preview APK (`eas build --platform android --profile preview`). That phone install is the **last** step; automated tests come first. See `TESTING.md` for the test setup.

- All item mutations go through `src/domain/items/service.ts` (keeps cloud, local cache and notifications in step).
- Wording style: calm, plain, never nagging.
- Tests: `npx tsc --noEmit`, `npm test` (domain, `jest.config.js`), `npm run test:ui` (components, `jest.ui.config.js`), Maestro flows in `.maestro/` (run by CI on an Android emulator against a build with `EXPO_PUBLIC_E2E=1`, which swaps in `src/lib/fakeSupabase.ts`).
- Selectors: give interactive elements a `testID` (kebab-case, e.g. `add-save-button`) and use it in tests and flows rather than visible text.

## Standing rules for every task

1. **Tests ship with the change.** Every feature or bug fix that changes behaviour or UI includes tests in the same PR:
   - component tests (`*.ui.test.tsx`) for screen logic and flows, and domain tests (`*.test.ts`) for service and logic changes;
   - a Maestro flow in `.maestro/` if it adds or changes a user-facing journey or layout.

   Pure refactors and copy tweaks don't need new tests, but must keep the existing ones passing.
2. **Bug fixes start with a failing test.** First add a test that fails because of the bug, and see it fail. Then fix it and see it pass.
3. **Run only what's relevant while working.** Before opening a PR, run `tsc` and the relevant tests only, e.g. `npx jest path/to/file` or `-t "name"`, not the whole suite repeatedly. Run the full suite (`tsc`, `npm test`, `npm run test:ui`) once at the end.
4. **Keep token use low.**
   - Don't rewrite or restructure existing tests unless they're wrong.
   - Don't download or read Maestro screenshots or recordings when CI is green; open them only when a flow fails.
   - When reading test or CI output, look at summary and failure lines only (e.g. `grep -E "✓|✕|●|Tests:"`), not full logs.
5. **Never mark work done or open a PR while tests fail.** If a test can't be written or run (e.g. it needs a real device, or the emulator job can't run), say so in the PR and explain why.
6. **Every PR description includes:**
   - **What changed**
   - **Tests covering it**: which test files and flows
   - **CI checks passed**: tsc, domain tests, component tests, Android flows (state any that didn't run or aren't green yet)
   - **Check on your phone**: a short manual checklist for what automation can't verify on a real Android phone, e.g. keyboard feel on the owner's device, edge-to-edge insets (status bar and nav bar), notification timing.
