# C++

> Technology standard for "C++ Developer" agents. Sources: ISO C++ Core Guidelines, Google C++ style.

## Language

- C++20; RAII everywhere; avoid raw `new`/`delete` (smart pointers)
- `const` correctness; deliberate pass-by-value/ref
- Core Guidelines: bounds-check; no pointer arithmetic in app code

## Structure

- Namespaces over prefixes; self-contained headers
- One class per file where practical; abstract interfaces for polymorphism

## Testing

- GoogleTest/GMock or Catch2; table/parametrised tests
- Sanitizers (ASan/UBSan/TSan) in CI; coverage ≥ 80%

## Performance

- Profile (perf, VTune) before optimising; move semantics for ownership
- Prefer contiguous containers (vector); avoid hidden copies

## CI/CD

- CMake + Ninja; clang-tidy + clang-format; sanitizer builds
- Multi-stage Docker; static linking where possible
