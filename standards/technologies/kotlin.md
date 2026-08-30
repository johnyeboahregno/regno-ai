# Kotlin

> Technology standard for "Kotlin Developer" agents. Sources: Kotlin coding conventions, Android Kotlin guides.

## Language

- Null-safety: avoid `!!`; use `?.`, `?:`, sealed classes for results
- Data classes for values; extension functions for APIs
- ktlint/detekt; immutability by default (`val`, immutable collections)

## Structure

- Gradle (Kotlin DSL); coroutines + structured concurrency
- Feature/module packaging; constructor injection

## Testing

- kotlin.test/JUnit 5 + AssertJ; coroutines-test
- Testcontainers for integration; coverage ≥ 80%

## Android

- Compose UI; ViewModel + unidirectional data flow; flows for state
- Lifecycle-safe collection; no blocking on main

## CI/CD

- `./gradlew check`; detekt; APK/AAB signing in CI
