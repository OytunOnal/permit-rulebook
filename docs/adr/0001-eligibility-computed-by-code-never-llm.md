# Eligibility is computed by code, never by an LLM

Eligibility is evaluated with deterministic predicates (`eq`/`in`/`gte`/
points/`any`) over declared answers and schema-validated official values —
an LLM never participates in the verdict, the gap analysis, or the leverage
steps. We chose this over LLM-based evaluation because the product's entire
claim is determinism: the same declarations always yield the same verdict,
every displayed number is testable against its quoted source, and the output
stays categorical ("threshold is X, you declared Y") — which is also the
legal positioning (BGH Smartlaw: a fixed routine is not individual legal
examination). LLMs are confined to two narrow future roles, neither of which
touches judgment: phrasing polish at build time, and quote-grounded Q&A about
a route.

## Considered options

- **LLM-evaluated eligibility** — flexible, but untestable, non-reproducible,
  cost-per-session, and it would convert the tool into individualized
  assessment (legal exposure).
- **Hybrid (code + LLM tie-breaks)** — inherits the worst of both: any LLM
  participation in the verdict breaks reproducibility and the audit story.
