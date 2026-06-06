# Exclusivity Policy

## Purpose

This document defines the company's policy on granting exclusivity to influencer and affiliate partners. The policy protects the business from granting exclusivity before a partner's performance is proven, while preserving the option to offer exclusivity as a reward for demonstrated results.

> "Exclusivity is not available to new partners.
>
> Partners may become eligible for exclusivity review after demonstrating measurable performance and sustained participation.
>
> All exclusivity arrangements are reviewed individually and may include performance requirements, time limitations, and renewal conditions."

---

## Eligibility

### Default Status

All new creators and partners are assigned:

- **Exclusivity Type:** `none`
- **Exclusivity Status:** `not_eligible`

No exclusivity is offered, implied, or promised to any new partner.

### Eligibility Criteria

A partner may become eligible for an exclusivity review after demonstrating one or more of the following:

- Qualified lead volume
- Sales volume
- Conversion performance
- Revenue contribution
- Sustained campaign participation

**Note:** Specific performance thresholds are configurable and reviewed periodically. They are not hard-coded in the system.

---

## Exclusivity Types

| Type | Definition |
|------|-----------|
| `none` | Standard partner relationship. No exclusivity applies. |
| `soft` | Limited exclusivity for a defined category, product type, or campaign period. |
| `full` | Formal exclusivity agreement with defined term and performance obligations. |

---

## Exclusivity Statuses

| Status | Meaning |
|--------|---------|
| `not_eligible` | Default. Partner has not yet met eligibility criteria. |
| `eligible_for_review` | Partner has demonstrated qualifying performance. Review may be initiated. |
| `under_review` | Exclusivity is being actively evaluated by the team. |
| `approved` | Exclusivity has been granted. Start and end dates apply. |
| `declined` | Review concluded without granting exclusivity. |
| `expired` | A previously approved exclusivity arrangement has lapsed. |

---

## Review Process

1. A team member identifies a partner who has met one or more eligibility criteria.
2. The partner's exclusivity status is updated to `eligible_for_review`.
3. An internal review is initiated (status: `under_review`).
4. The team evaluates performance data, campaign history, and business fit.
5. A decision is made: `approved` or `declined`.

Eligibility review is **always initiated by the company team** — never automatically triggered by the system.

---

## Approval Process

When exclusivity is approved:

- The exclusivity type (`soft` or `full`) is recorded.
- A defined start date and end date are set.
- Any performance requirements or conditions are documented in the notes field.
- The partner and any relevant contracts must reflect the agreed terms.

---

## Renewal Process

Exclusivity arrangements are **not automatically renewed**.

Before an arrangement expires, the team should:

1. Review the partner's continued performance against original criteria.
2. Assess whether the exclusivity arrangement delivered business value.
3. Decide to renew (create a new approved record), allow to expire, or modify terms.

---

## Expiration Rules

- Exclusivity expires on the defined end date.
- Upon expiration, the status transitions to `expired`.
- Expired arrangements do not revert to `not_eligible` — they remain as `expired` to preserve history.
- A new review may be initiated from the `expired` status.

---

## Future Compatibility

This schema and policy are designed to support future modules including:

- **Exclusive campaigns** — campaigns restricted to partners with approved exclusivity
- **Exclusive territories** — geographic restrictions for `soft` or `full` exclusivity
- **Exclusive product categories** — category-level exclusivity for specific verticals
- **Exclusive creator agreements** — partner portal display of exclusivity status and terms

No redesign of the core schema is required to add these features.

---

## Document History

| Date | Change |
|------|--------|
| 2026-06-05 | Initial policy created |
