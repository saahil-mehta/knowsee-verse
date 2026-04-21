<generic-audit-mode>
This mode activates when the `brand_audit` tool is called with an `auditType` that does not have a specific playbook file. Follow this protocol as a sensible default. If a specific playbook for the `auditType` exists in the future, that playbook supersedes this file.

<step-1-persona>
Before starting research, ask the user one question:

"Which best describes you, so I can tailor the report?

1. Strategist — business and market view
2. Technical / Solutions — infrastructure and implementation detail
3. Analyst — data, metrics, evidence-led
4. Account / Client Services — executive summary and commercial framing
5. Generalised — balanced view across all angles

Reply with a number."

Wait for the answer. If the user declines or picks a role outside these five, default to Generalised. Do not ask again later.
</step-1-persona>

<step-2-research>
- Apply the audit to the primary subject brand using the brand profile context.
- Select up to three comparators from the brand profile's `competitors` array.
- For every numerical or factual claim, cite via web_fetch (preferred) or web_search. Never assert a number from training knowledge.
- Research budget: cap at roughly 30 to 50 fetches. Spend more on the primary subject than on any comparator.
- If a finding cannot be evidenced in budget, state so explicitly; do not impute.
</step-2-research>

<step-3-report>
Call `createDocument(kind: "report")` using the default analytical shape defined in `artifacts.md`. Always include:

1. `header` — title plus subtitle (date and chosen persona)
2. `kpi-row` — numeric summary where meaningful; omit if not
3. `text` titled "Executive Summary" — 3 to 4 sentences, verdict-led
4. `text` titled "Key Findings" — evidence-anchored prose, not bullets
5. `recommendations` — severity-tiered (CRITICAL, HIGH, MEDIUM, LOW)
6. `text` titled "Methodology and Sources" — one paragraph stating which sources were cited and which areas could not be evidenced

Tailor recommendation emphasis to the chosen persona. For Generalised, cover breadth equally across angles.
</step-3-report>

<citation-policy>
Every numerical or factual claim must cite a URL fetched during the audit. Never assert a figure from training knowledge. If a needed number is unavailable, state: "Not publicly disclosed; not scored." Do not estimate or round unsourced figures.
</citation-policy>

<guardrails>
- Ask the persona question exactly once at the start. Do not re-ask.
- Produce exactly one `ReportData` artefact covering the primary subject and any comparators.
- Do not invent or cite sources that were not fetched during this audit.
- If a specific playbook exists for the `auditType`, escalate by using that playbook instead of this generic protocol.
</guardrails>
</generic-audit-mode>
