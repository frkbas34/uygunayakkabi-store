# Duplicate, leakage, privacy, and integrity report

Date: 2026-07-26

## Deterministic findings

- Selected products: 1.
- Exact duplicate selected hashes: 0.
- Broken selected references: 0.
- Missing selected hashes: 0.
- Hash/byte mismatches: 0.
- Manifest/annotation reference mismatches: 0.
- Calibration/holdout source overlap: 0; no holdout is materialized.
- Orphan annotation JSON files: 0.
- Generated media classified as original: 0.
- Positional slot-authority fields: 0.

Three exact-hash duplicate groups exist only among excluded build artifacts: Payload dark favicon, Payload light favicon, and static Open Graph output repeated across session/temporary build directories. They are explicitly classified as non-product build artifacts and do not enter either corpus subset.

The seven temporary menu-video frames have distinct hashes but remain excluded because near-sequence similarity cannot establish separate product identities and their source/product/rights provenance is undocumented. The seven hero assets have distinct hashes; visual distinctness does not cure missing product provenance. No perceptual duplicate claim was made without a deterministic method and stable product linkage.

## Privacy and sanitization

The selected reference received direct visual and file-metadata review. Findings:

- no person or customer identity visible;
- no name, phone, address, Telegram identifier, order, or lead data;
- no credential, token, signed URL, private storage path, or production URL;
- no EXIF block and no GPS/device metadata detected;
- no identifying personal background or reflection observed;
- source bytes were not modified;
- the WebP-content/`.jpg`-extension mismatch is declared.

No OCR was used. No sanitization copy was needed, so the source remains referenced at its existing tracked path. Rights, own-product linkage, and non-generated originality remain human-review requirements and prevent approval.

Excluded privacy/provenance cases include one lifestyle hero containing a person, branded hero/stock-style images without rights evidence, and a branded screenshot. No secret or private absolute path is stored in portable corpus JSON.

## Leakage controls for future intake

- Hash every original before subset assignment.
- Compare exact hashes across selected, excluded, retired, calibration, and holdout inventories.
- Treat transformed/cropped copies of the same product as one product unless multiple-view membership is explicitly linked under one corpus ID.
- Seal holdout assignment before detailed annotation is shown to developers.
- Never move a generated outcome into Layer A, even after operator approval.
- Source replacement supersedes the old reference and reruns leakage review; it never silently changes an existing benchmark.
