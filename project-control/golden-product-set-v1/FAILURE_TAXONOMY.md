# Golden Product Set V1 failure taxonomy

Version: `gps-failure-taxonomy-v1.0.0`

These stable codes support annotation, blind comparison, operator rejection, and future evaluator reports. They are advisory in GPS V1. “Potentially blocking” is design guidance for a later quality policy, not an implemented generation, preview, publishing, or dispatch gate. A failure needs the suggested evidence and reviewer confidence; an automated score alone does not become product truth.

Family notation: `all` means any footwear family; narrower entries identify especially relevant cases.

## Identity failures

| Code | Turkish operator label | Engineering description | Severity | Families | Suggested evidence | Policy / rejection mapping |
|---|---|---|---|---|---|---|
| `ID_WRONG_PRODUCT_FAMILY` | Yanlış ürün ailesi | Outcome morphology belongs to a different effective family than the reviewed source evidence. | Critical | all | Original references, confirmed family, full outcome | Potentially blocking; `wrong_family` |
| `ID_SILHOUETTE_DRIFT` | Silüet kayması | Global upper/sole/shaft outline or proportion changes beyond supported variation. | High | all | Side/top silhouettes, fingerprint | Potentially blocking; `silhouette_drift` |
| `ID_TOE_SHAPE_DRIFT` | Burun formu kayması | Toe geometry changes between rounded, square, elongated, tapered, or unsupported shape. | High | all | Toe/top/side evidence | Potentially blocking; `toe_drift` |
| `ID_VAMP_LENGTH_DRIFT` | Vamp uzunluğu kayması | Vamp coverage or length shifts materially from supported product construction. | High | loafer, formal_lace_up, casual_closed_shoe | Top/three-quarter evidence | Potentially blocking; `vamp_drift` |
| `ID_OPENING_SHAPE_DRIFT` | Ağız formu kayması | Collar/opening contour, depth, or back closure changes. | High | loafer, open_footwear, heel_or_flat | Top/rear/side evidence | Potentially blocking; `opening_drift` |
| `ID_HEEL_BACK_DRIFT` | Topuk/arka yapı kayması | Heel counter, rear seam, closure, shaft back, or backless state changes. | High | all | Rear and side originals | Potentially blocking; `heel_back_drift` |
| `ID_SOLE_THICKNESS_DRIFT` | Taban kalınlığı kayması | Sole edge thickness/profile changes materially relative to supported evidence. | High | all | Calibrated side evidence or relation | Potentially blocking; `sole_drift` |
| `ID_SEAM_PATH_DRIFT` | Dikiş hattı kayması | Identity-relevant seam/apron/panel path is moved, removed, merged, or invented. | High | all | Clear seam-region reference | Potentially blocking; `seam_drift` |
| `ID_HARDWARE_INVENTION` | Donanım ekleme | Metal bit, buckle, eyelet, chain, stud, or fitting appears without supporting evidence. | Critical | loafer, boot, open_footwear, casual_closed_shoe | Detail reference and hardware fact | Potentially blocking; `hardware_invented` |
| `ID_HARDWARE_REMOVAL` | Donanım silme | Verified hardware is absent, structurally altered, or replaced. | Critical | loafer, boot, open_footwear, casual_closed_shoe | Verified hardware reference | Potentially blocking; `hardware_missing` |
| `ID_ORNAMENT_INVENTION` | Süs ekleme | Tassel, strap, applique, logo-like mark, loop, or ornament appears without evidence. | High | all | Detail/top evidence | Potentially blocking; `ornament_invented` |
| `ID_ORNAMENT_REMOVAL` | Süs silme | Verified ornament/topology disappears or loses defining structure. | High | all | Verified ornament reference | Potentially blocking; `ornament_missing` |
| `ID_MATERIAL_ZONE_DRIFT` | Malzeme bölgesi kayması | Visible material/finish regions migrate, merge, split, or change relationship. | High | all | Region map and original detail | Potentially blocking when locked; `material_zone_drift` |
| `ID_COLOR_BLOCK_DRIFT` | Renk bloğu kayması | Relative color regions, contrast boundaries, or dominant relationships change. | Medium–High | all | Color-region map under known limitations | Advisory unless locked; `color_block_drift` |
| `ID_HANDEDNESS_INCONSISTENCY` | Sağ/sol tutarsızlığı | Left/right morphology, closure, markings, or directional components conflict. | High | all pair outputs | Pair/source handedness evidence | Potentially blocking; `handedness_error` |
| `ID_FAMILY_CONVERSION` | Ürün tipine dönüşme | A specific structural conversion occurs, such as loafer→mule/slipper/moccasin/formal lace-up. | Critical | all, especially loafer | Family evidence and conversion pair | Potentially blocking; `family_conversion` |

## Pack consistency failures

| Code | Turkish operator label | Engineering description | Severity | Families | Suggested evidence | Policy / rejection mapping |
|---|---|---|---|---|---|---|
| `PACK_UNRELATED_SLOT_RESULT` | İlgisiz kare sonucu | One requested semantic slot depicts a materially different product identity. | Critical | all | All slot results plus pinned fingerprint | Potentially blocking; `unrelated_slot` |
| `PACK_SCALE_INCONSISTENCY` | Ölçek tutarsızlığı | Apparent product scale relationship varies beyond contract tolerance. | Medium | all | Geometry metadata and pack montage | Advisory/potentially blocking by future contract; `scale_inconsistent` |
| `PACK_CENTERING_INCONSISTENCY` | Merkezleme tutarsızlığı | Product center offsets vary materially between equivalent slot contracts. | Medium | all | Canvas/subject center metadata | Advisory; `centering_inconsistent` |
| `PACK_CANVAS_OCCUPANCY_INCONSISTENCY` | Kadraj doluluk tutarsızlığı | Subject-to-canvas occupancy is unstable across the pack. | Medium | all | Bounding/occupancy metadata | Advisory; `occupancy_inconsistent` |
| `PACK_FRAMING_INCONSISTENCY` | Kadraj tutarsızlığı | Margins, clipping, viewpoint framing, or pair placement violates slot intent. | Medium–High | all | Slot contract and outcome | Potentially blocking when clipped; `framing_inconsistent` |
| `PACK_BACKGROUND_INCONSISTENCY` | Arka plan tutarsızlığı | Background color, horizon, texture, or lighting context changes unexpectedly. | Low–Medium | all | Background contract and pack | Advisory; `background_inconsistent` |
| `PACK_DUPLICATED_SLOT_PURPOSE` | Yinelenen kare amacı | Two results satisfy the same semantic purpose while another purpose is missing. | High | all | Stable slot-purpose records | Potentially blocking; `duplicate_slot_purpose` |
| `PACK_SLOT_IDENTITY_LOSS` | Kare kimliği kaybı | Result cannot be traced to its requested stable slot identity and contract. | Critical | all | Attempt/slot lineage | Potentially blocking; `slot_identity_lost` |
| `PACK_SLOT_RESULT_RELABELING` | Kare sonucu yeniden etiketlenmiş | A later result inherits another slot's label after failure/retry/persistence. | Critical | all | Pre-created slot results and event lineage | Potentially blocking; `slot_relabeling` |
| `PACK_PARTIAL_RESULT_COMPACTION` | Kısmi sonuç sıkışması | Failed/missing result is removed so positional arrays shift later semantic identities. | Critical | all | Requested IDs versus terminal records | Potentially blocking; `partial_compaction` |
| `PACK_PAIR_INCONSISTENCY` | Çift ayakkabı tutarsızlığı | Shoes in one pair or across pair slots differ in construction, color, scale, or symmetry. | High | all pair outputs | Pair originals, per-shoe comparison | Potentially blocking; `pair_inconsistent` |

## Quality failures

| Code | Turkish operator label | Engineering description | Severity | Families | Suggested evidence | Policy / rejection mapping |
|---|---|---|---|---|---|---|
| `QUAL_MALFORMED_GEOMETRY` | Bozuk geometri | Physically implausible upper, sole, heel, opening, or component geometry. | Critical | all | Full-resolution outcome | Potentially blocking; `malformed_geometry` |
| `QUAL_MERGED_COMPONENTS` | Birleşmiş parçalar | Distinct laces, straps, shoes, soles, or ornaments fuse incorrectly. | High | all | Detail and full outcome | Potentially blocking; `merged_components` |
| `QUAL_MISSING_COMPONENTS` | Eksik parça | Structurally required or verified component disappears. | High | all | Locked facts and outcome | Potentially blocking; `missing_component` |
| `QUAL_EXTRA_COMPONENTS` | Fazladan parça | Unsupported shoe, lace, strap, sole section, ornament, or appendage appears. | High | all | Source/outcome comparison | Potentially blocking; `extra_component` |
| `QUAL_TEXTURE_ARTIFACT` | Doku artefaktı | Repetition, smearing, plasticity, broken grain, or synthetic noise degrades product evidence. | Medium–High | all | Full-resolution region crop for review only | Advisory/potentially blocking; `texture_artifact` |
| `QUAL_SHADOW_AS_STRUCTURE` | Gölge ürün sanılmış | Shadow/reflection is rendered or evaluated as a product edge, seam, opening, or component. | High | all | Source sufficiency and lighting evidence | Potentially blocking; `shadow_as_structure` |
| `QUAL_STITCHING_AS_HARDWARE` | Dikiş metal sanılmış | Stitch, loop, highlight, or perforation becomes metal hardware. | High | loafer, sneaker_lifestyle, casual_closed_shoe | Detail reference and hardware unknown/absence | Potentially blocking; `stitch_as_hardware` |
| `QUAL_EXCESSIVE_STYLIZATION` | Aşırı stilizasyon | Artistic treatment obscures or transforms product identity beyond profile/contract intent. | High | all | Profile and identity comparison | Potentially blocking; `over_stylized` |
| `QUAL_REFERENCE_CONTAMINATION` | Referans bulaşması | Source background, person, text, unrelated object, border, watermark, or composite leaks into output. | High | all | Original/source and outcome | Potentially blocking; `reference_contamination` |
| `QUAL_MISLEADING_DETAIL` | Yanıltıcı detay | Detail looks plausible but asserts unsupported construction, material, branding, or function. | High | all | Explicit unknowns and detailed outcome | Potentially blocking; `misleading_detail` |
| `QUAL_UNREADABLE_DETAIL` | Okunamayan detay | Required detail is too blurred, compressed, occluded, or small to assess. | Medium | all | Native-resolution output and slot purpose | Advisory/retry candidate; `detail_unreadable` |

## Severity use

- **Critical:** identity or lineage is unreliable; a later quality policy would normally reject or quarantine.
- **High:** material identity/quality defect; likely rejection after human confirmation.
- **Medium:** meaningful but potentially recoverable or profile-dependent deviation.
- **Low:** presentation issue with no demonstrated identity impact.

Operator rejection stores one or more codes, free-text context, affected stable slot ID(s), evidence reference(s), reviewer confidence, and timestamp. A code never changes the approved Layer A annotation automatically.
