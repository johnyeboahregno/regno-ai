# Embedded Systems

> Discipline standard for "Embedded Engineer" agents. Sources: MISRA C, ARM CMSIS, safe firmware patterns.

## Firmware

- Bounded loops and deadlines; watchdog + brown-out handling
- ISRs short; defer work to main loop/RTOS tasks; protect shared state
- No dynamic allocation in safety-critical paths

## Safety

- Static analysis (MISRA C/CERT C); deterministic memory usage
- Unit-test logic on host; HIL tests for hardware paths
- Input validation on every external interface

## Toolchain

- Reproducible builds; fixed toolchain versions
- Semihosting/logging only in dev; release builds optimised + stripped
