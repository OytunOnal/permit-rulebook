# s18 — `spatialCoverage` in the shape Google's parser reads

**Status:** approved 2026-09-16 (human: "tamamdır yapalım"). Site #11.

## What happened

Google Search Console's Datasets report (export of 2026-09-16) reads
`/data/` as a valid Dataset every day since 2026-09-11 and carries one
non-critical warning: *Invalid object type for field "spatialCoverage"*.
The page sends the four countries as `{"@type": "Country", "name": …}` —
correct schema.org (`Country` is a `Place`) — but Google's Dataset parser
accepts `spatialCoverage` only as Text or as `{"@type": "Place"}`; its three
documented examples are a `Place` with `GeoCoordinates`, a `Place` with
`GeoShape`, and a plain string. `Country` is dropped, and with it the only
geographic fact the markup carries.

## What must be true

1. **`spatialCoverage` becomes an array of `{"@type": "Place", "name":
   <country name>}`**, one per country, names from `dataset.countries` as
   today (`src/lib/dataset-ld.ts`). `Place` rather than plain text so a
   parser that does read a type still gets one and the name stays a
   name, not a phrase.
2. **Nothing else in the JSON-LD changes.** `keywords` keeps the country
   names; `name`, `description`, `distribution` untouched.
3. **The test says the decision.** `tests/dataset-ld.test.ts` asserts every
   `spatialCoverage` entry has `@type: "Place"` and a `name` from the
   dataset, and that no entry is typed `Country` — with the reason (Google's
   parser, 2026-09-16, site #11).
4. **The `/data/` clean-day fixture regenerates** with the reason; the
   root-build fingerprint does not move (route pages carry no Dataset
   markup — confirm).

## How it is proved

- The updated test, red on `Country`, green on `Place`.
- After the deploy: the Rich Results test on `https://permitrulebook.com/data/`
  shows the Dataset with no warning on `spatialCoverage`; Search Console →
  Datasets → the warning's *Validate fix* (the human's click; the report
  takes days to re-crawl — a pass is the warning leaving the report, not the
  click).

## What this slice is not

It is not a change to what a reader sees: the JSON-LD is a data block in
the page's head.
