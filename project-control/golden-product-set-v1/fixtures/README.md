# Fixture storage policy

Golden Product Set V1 uses repository-relative references instead of duplicating product binaries. The only materialized draft record references `public/products/kahve-deri.jpg` and pins its SHA-256 digest in `manifest.json`.

Do not place generated, approved-generated, rejected-generated, screenshot, production-downloaded, customer, or undocumented temporary media here. A future copied fixture is allowed only when sanitization requires a derived local original and the manifest records both source and sanitized hashes, review attribution, change reason, and source replacement history.

This directory intentionally contains no copied binary in V1: duplicating the existing tracked file would add no integrity and would create two locations requiring synchronization.
