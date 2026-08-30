# C

> Technology standard for "C Developer" agents. Sources: C17, CERT C, MISRA C.

## Language

- C17; all warnings as errors (`-Wall -Wextra -Werror`)
- Explicit ownership and cleanup; no leaks (Valgrind/ASan in CI)
- Bounds-checked string/array ops; never `strcpy`/`sprintf`

## Structure

- `.c` + `.h` pairs; include guards (`#pragma once`)
- Public API in headers; `static` for internal linkage

## Testing

- Unit: Check/Unity/CMocka; test pure logic on host
- Sanitizers + Valgrind in CI; fault-injection for error paths

## Safety

- Integer-overflow checks; validate all external input
- MISRA C subset for safety-critical code

## CI/CD

- Make/CMake; `-Werror`, sanitizers, coverage; reproducible builds
