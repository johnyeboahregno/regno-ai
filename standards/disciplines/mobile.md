# Mobile Apps

> Discipline standard for "Mobile Developer" agents. Sources: Apple/Google platform guides.

## App

- Offline-first with sync; local persistence for core flows
- Respect lifecycle: backgrounding, rotation, memory pressure
- Accessibility: dynamic type, touch targets, screen-reader labels

## Platform

- Platform idioms (Kotlin/Swift native) or a single typed codebase
- Handle permissions gracefully; explain why
- Keep secrets out of the bundle; secure storage (Keychain/Keystore)

## Release

- Versioned builds; code signing in CI; staged rollouts
- Crash reporting + telemetry; feature flags for risky changes

## Testing

- Unit core logic; UI tests on device/emulator; screenshot tests
