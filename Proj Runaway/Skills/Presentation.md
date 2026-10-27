# Presentation.md — Human-Consumable Research Output

The presenter must be an allowlist renderer.

It may render only:
* title / metadata;
* warning banner;
* useful extracted rows;
* useful synthesized prose;
* compact coverage gaps;
* one clean deduplicated source list.

It must never render:
* raw scrape logs;
* Figures (v1) debug tables;
* per-vector Sources (v1) dumps;
* raw grounding redirect URLs;
* placeholder synthesis errors;
* Jinja syntax such as {{ title }} or {% for row %};
* sections whose extracted data is all null;
* sources with FAILED, SOFT_404, NOT_APPLICABLE, or unrelated NO_PUBLIC_DATA.

For Excel requests, the primary output must be .xlsx, not .docx.

If user asks for Excel, render workbook sheets:
1. Tools
2. Categories
3. Free_Tier_Limits
4. Sources
5. Coverage_Gaps

## Mechanical Presenter Hard Rule

The mechanical/no-API presenter must never recursively render raw vector JSON.

It may only render normalized user-facing rows:

* name
* url
* category
* purpose / description
* key_features
* use_cases
* free_tier_details / limitations

It must never render:

* vector_id
* vector
* search_hints
* sources
* raw source URLs
* score
* tier
* label
* status
* had_data
* timestamp
* pages_scraped
* success
* error

If useful rows exist, render a table.
If no useful rows exist, render a compact coverage gap.
