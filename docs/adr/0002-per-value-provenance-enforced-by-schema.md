# Per-value provenance is enforced by the schema, not by policy

Every numeric value in the dataset must carry an official source URL, a
verbatim quote, a retrieval date, and an append-only history — the JSON
Schema rejects a value without them, so the build fails rather than shipping
an unsourced number. We chose enforcement over editorial discipline because
the market scan showed the entire competitive gap is exactly here: rivals
publish either page-level dates or closed provenance; nobody pairs per-value
dates with verbatim quotes on open data. The cost is real (curation is
slower; every new value needs a human-verifiable quote), and it is the cost
we deliberately signed up for: it IS the product.
