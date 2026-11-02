# Business

> Business-level context that isn't pure domain logic. For game rules see
> `docs/domain/README.md`.

## Model

None. The product is a free, non-commercial parody game — no pricing, plans,
billing, or accounts. There is no monetization surface, and adding one would be
an architectural decision (see `docs/architecture/ARCHITECTURAL_INVARIANTS.md`).

## Policies

- **Privacy:** GDPR/consent rules are owned by `docs/legal/README.md`.
- **Data limits:** cards and groups live in Cloudflare D1 (free-tier sizing);
  the expiry + GC house rules in `docs/architecture/ARCHITECTURE.md` are the
  cost-control policy, not a bug.
- **Newsletter opt-in:** governed by the Brevo integration and
  `docs/legal/README.md`; the only "commercial" surface the product has.

## Goals & metrics

The product optimizes for shareability: finishing a card produces a certificate
worth posting. There are no KPIs, dashboards, or analytics — deliberately, to
keep the privacy surface minimal. Trade-offs default to "less data, less
server, still funny".
