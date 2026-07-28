# Product Intake and Operator Flow

## Canonical flow

1. Receive real product photos through Telegram or create/edit the product in Payload.
2. Store the product as a draft with original media in `Products.images`.
3. Optionally queue generated marketing images for any product with a valid reference. Current `#gorsel` uses Gemini and requests all five standard slots. Protected-brand classification never blocks generation.
4. Inspect the Telegram preview. Approval attaches selected Media to `Products.generativeGallery`; rejection leaves the gallery unchanged.
5. Complete the database-backed confirmation wizard for title, category/type, price, sizes/stock, brand, and targets.
6. Generate content and run audit/diagnostics.
7. Record Image QC PASS for generated media before activation/publishing. Original-only media can pass the image gate without a generated-image decision.
8. Review `/productflow`, publish readiness, brand safety, claims, and target-channel provider state. Brand safety is enforced here and at approval/publishing/dispatch boundaries, not at generation eligibility.
9. Activate only through the shared guard. Website becomes visible natively; external channels dispatch or queue through controlled paths.

## Operator reads

Use `/loadplan`, `/brandplan`, `/imageqcplan`, `/productflow <ref>`, `/imageplan <ref>`, `/catalogqa`, `/categoryfill`, `/business`, `/funnel`, `/leadplan`, and Shopier preview/dashboard commands before mutations.

## Important current drift

The active task already allows protected-brand products, matching the current operator decision. The unused `evaluateImageBrandGate()` helper/test and `brand_review_first` generation advice in read-only image plans encode the rejected older policy and should be removed in a separately authorized implementation change. Identity/logo fidelity checks may still compare visible reference facts; they do not make a product ineligible for generation.

Rejected, regenerated, failed-save, and unapproved slot Media still lack persisted lifecycle, hold, quarantine, restore, cleanup-batch, and tombstone state. The canonical V1 policy is now pure/read-only and cannot authorize deletion. Its production census found 527 generated Media: 203 remain pending operator decisions across the same 44 legacy previews, 136 fail closed to legacy manual review, 9 are failure evidence, 5 are smoke evidence, and 174 are permanent business assets. No quarantine or physical cleanup candidate exists. Operator decisions must remain exact-job/exact-asset actions; partial legacy slot identity must never be guessed.
