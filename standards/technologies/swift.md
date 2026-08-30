# Swift

> Technology standard for "Swift Developer" agents. Sources: Swift API Design Guidelines, Apple docs.

## Language

- Value semantics (structs/enums); `let` by default
- Optionals handled explicitly; force-unwrap only when guaranteed
- SwiftFormat/SwiftLint; no `Any` at boundaries

## Structure

- SwiftPM or Xcode project; feature-based modules
- Protocols for abstraction; actors for concurrency (Swift Concurrency)

## Testing

- XCTest/Swift Testing; parametrised tests
- ViewInspector/XCUITest for UI; CI on simulator + device

## iOS

- SwiftUI; @Observable state; async/await over callbacks
- Keychain for secrets; respect App Transport Security

## CI/CD

- `swift build && swift test`; swiftlint; Fastlane signing + TestFlight
