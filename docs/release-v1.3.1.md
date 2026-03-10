# Seshflow v1.3.1 Release Notes

`v1.3.1` is a patch release focused on AI-facing ergonomics, safer command probing, and contract-model consistency.

## Highlights

- pre-init command probes such as `seshflow ncfr` are now side-effect free
- default help now focuses on normal usage, while integration/developer surfaces move behind `seshflow --help --advanced`
- high-frequency command payloads are smaller and omit empty sections by default
- contract bundle import guidance is clearer for JSON object, JSON array, and JSONL formats
- contract `kind` and `protocol` are now both descriptive fields, so values like `event-stream` are accepted consistently

## Package versions

- `@seshflow/cli@1.3.1`
- `@seshflow/shared@1.3.1`
- `@seshflow/web@1.3.1`

## What changed since v1.3.0

- Prevented `ncfr` and other pre-init probes from creating partial workspace state
- Added advanced-help separation for integration-facing commands
- Reduced default JSON verbosity for `ncfr`, `next`, `start`, `done`, and `show`
- Added lightweight unbound-contract and inspection hints for high-frequency flows
- Clarified bundle import usage in docs and init output
- Relaxed contract kind/protocol validation to support broader descriptive contract models

## Notes

- `v1.4.0` remains planned and has not started.
- This release does not change the `v1.3.0` contract-first feature boundary; it hardens the shipped experience.
