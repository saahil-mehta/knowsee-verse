# Knowsee Demo Scenarios for Digitas

## The Pitch

Knowsee gives agencies a repeatable, empirical process to answer two questions every brand client asks:

1. **"How visible is my brand to AI?"** — AI models are becoming purchase advisors. If ChatGPT doesn't recommend your client's brand, that's lost revenue. Knowsee measures this empirically across 4 major AI models.

2. **"What do I do about it?"** — Knowsee doesn't just diagnose. It delivers a Generative Engine Optimisation (GEO) playbook with specific, prioritised actions to increase AI visibility.

The process is: **set up a brand in 2 minutes, run an audit in 2 minutes, get a boardroom-ready report with a competitive visibility score and action plan.** No data science team needed. No six-week engagement to get a baseline.

---

## Demo Flow

### Act 1: "It takes 2 minutes to set up a client"

**Scenario 1.1 — Create a brand project (Nike, Sportswear, GB market)**

1. Click "New Brand Project"
2. Fill in:
   - Brand: `Nike`
   - Website: `https://www.nike.com/gb/`
   - Market: `GB`
   - Categories: `Running Shoes`, `Sportswear`, `Athletic Footwear`, `Training Gear`, `Lifestyle Sneakers`
   - Competitors: `Adidas`, `New Balance`, `Puma`, `ASICS`, `On Running`
3. Save

**What to say:** "Every client engagement starts here. Brand name, market, categories, competitors. Two minutes. Everything that follows is driven by this profile."

**Stress test:** Verify all fields save correctly. Navigate away and back — profile should persist.

---

### Act 2: "How visible is Nike to AI?"

**Scenario 2.1 — Run a visibility audit**

1. In the Nike project chat, click "Run an AI visibility audit for Nike" (suggested action)
2. Watch the probe grid appear:
   - 4 model cards (ChatGPT, Gemini, Mistral, Claude) start in "Waiting..." state
   - Progress bars fill as responses stream in
   - Individual probe responses appear in each card
   - Status indicator shows "Probing AI models — X/80 responses received"
3. After probing completes, extraction phase runs ("Analysing responses: X/80 extracted")
4. Report artifact generates automatically in the side panel

**What to say during probing:** "Right now, Knowsee is asking ChatGPT, Gemini, Mistral, and Claude the exact questions a consumer would ask. 'What are the best running shoes in GB?' 'Compare Nike vs Adidas for sportswear.' 'Where can I buy athletic footwear online?' — 20 prompts across 4 models, 80 data points."

**What to say during extraction:** "Now it's reading every response and scoring: Was Nike mentioned? What position? Was the sentiment positive? Were competitors recommended instead? This is empirical, not estimated."

**What to point out in the report:**
- **Visibility Score donut chart**: "This is the headline number you put in front of a CMO. Nike scores X/100 for AI visibility in GB."
- **Model breakdown bar chart**: "Not all AI models treat brands equally. Look — ChatGPT mentions Nike Y% of the time, but Gemini only Z%. That tells you where to focus."
- **Category radar chart**: "Nike owns running shoes but loses to Adidas on lifestyle. This is category-level competitive intelligence."
- **GEO Playbook**: "These aren't generic SEO tips. Each recommendation is specific to Nike's gaps against these competitors in this market."

**Stress test:**
- [ ] Probe grid renders inline (not below the input box)
- [ ] All 4 models complete (80/80 probes)
- [ ] Report generates with all sections (header, KPIs, charts, table, findings, recommendations)
- [ ] Recommendations show consolidated tiers (no duplicate "HIGH IMPACT" headers)
- [ ] Numbers in report match the audit summary (no fabricated data)

---

### Act 3: "Now do the same for their competitor"

**Scenario 3.1 — Create Adidas project and run audit**

1. Create a new brand project:
   - Brand: `Adidas`
   - Website: `https://www.adidas.co.uk/`
   - Market: `GB`
   - Categories: `Running Shoes`, `Sportswear`, `Athletic Footwear`, `Training Gear`, `Lifestyle Sneakers`
   - Competitors: `Nike`, `New Balance`, `Puma`, `ASICS`, `On Running`
2. Run visibility audit

**What to say:** "Same process, competitor's perspective. Now you can compare: Nike scores X, Adidas scores Y. Which AI models prefer which brand? Where does each dominate? This is the competitive intelligence that drives the engagement."

**The sell:** "You're 4 minutes in and you have two empirical, comparable scorecards. Try getting this from a traditional research agency."

**Stress test:**
- [ ] Second audit runs cleanly after first (no stale state)
- [ ] Navigate between Nike and Adidas chats — probe grids stay with their respective chats
- [ ] No connection pool errors despite back-to-back audits

---

### Act 4: "Deep-dive with conversational AI"

**Scenario 4.1 — Ask follow-up questions in the Nike chat**

After the audit, demonstrate conversational analysis:

1. "Which categories is Nike weakest in compared to Adidas?"
2. "What specific content changes would improve Nike's mention rate on Gemini?"
3. "Draft a GEO brief for Nike's content team focusing on running shoes"

**What to say:** "The audit is the starting point, not the end. Your strategist can have a conversation with the data. Ask questions, drill into specifics, get briefing documents — all grounded in the empirical audit data."

**Stress test:**
- [ ] Follow-up questions receive coherent responses referencing the audit data
- [ ] No connection errors from sustained chat usage

---

### Act 5: "The technical audit — is the website AI-ready?"

**Scenario 5.1 — Run a brand audit (agentic commerce)**

1. In the Nike chat, type: "Run a full agentic commerce audit for Nike"
2. Watch the research plan generate (chain of thought UI)
3. The system will:
   - Analyse Nike's structured data (schema.org, JSON-LD)
   - Evaluate product detail pages for machine readability
   - Assess checkout flow for programmatic interaction
   - Test mobile experience and site search
   - Compare against Adidas, New Balance, Puma

**What to say:** "The visibility audit tells you how AI models perceive the brand. The technical audit tells you why. Is the website giving AI models the structured data they need? Are product pages machine-readable? Can an AI agent actually complete a purchase? This is the remediation roadmap."

**The combined pitch:** "Visibility audit gives you the diagnosis. Technical audit gives you the root cause. GEO playbook gives you the treatment plan. That's a complete engagement you can sell to any brand client."

**Stress test:**
- [ ] Brand audit runs after visibility audit without errors
- [ ] Web search and web fetch tools work correctly
- [ ] Report generates as artifact

---

### Act 6: "A completely different vertical"

**Scenario 6.1 — Beauty brand (Charlotte Tilbury)**

1. Create a new brand project:
   - Brand: `Charlotte Tilbury`
   - Website: `https://www.charlottetilbury.com/uk`
   - Market: `GB`
   - Categories: `Luxury Makeup`, `Skincare`, `Foundation`, `Lipstick`, `Gift Sets`
   - Competitors: `MAC`, `NARS`, `Fenty Beauty`, `Rare Beauty`, `Bobbi Brown`
2. Run visibility audit
3. Run brand audit

**What to say:** "Same tool, completely different vertical. Sportswear, beauty, electronics, financial services — the process is identical. Set up the brand, run the audits, get the intelligence. That's what makes this scalable across your client portfolio."

**Stress test:**
- [ ] Third audit in the session runs cleanly
- [ ] Different category prompts generated (beauty-specific, not sportswear)
- [ ] No UI artefacts from previous audits leaking

---

## The Digitas Value Propositions

### 1. Sell AI Visibility Audits as a Service

**Process:** Quarterly AI visibility audits for every brand client.

- **Baseline audit**: Where does the brand stand today across AI models?
- **Competitive benchmarking**: How does the brand compare to named competitors?
- **GEO playbook**: Specific, prioritised actions to improve AI visibility
- **Progress tracking**: Re-run quarterly to measure improvement

**Revenue model:** Retainer per client per quarter. The tool does the empirical work; your strategists add the narrative and client management.

### 2. GEO (Generative Engine Optimisation) as a New Practice

**The insight:** SEO optimises for Google's index. GEO optimises for AI model training data, retrieval-augmented generation, and tool-use patterns. Different playbook, new budget line.

**What Knowsee provides:**
- Empirical baseline (visibility score)
- Model-specific gaps (which AI models under-represent the brand)
- Category-specific gaps (which product categories the brand loses)
- Competitor intelligence (who the AI models recommend instead)
- Actionable recommendations (structured data, content strategy, technical fixes)

**What Digitas adds:**
- Client relationship and strategic narrative
- Content creation and implementation
- Cross-channel integration (SEO + GEO + paid)
- Measurement and reporting cadence

### 3. Agentic Commerce Readiness

**The next wave:** AI agents that browse, compare, and purchase on behalf of consumers. Is your client's website ready?

- **Structured data audit**: Can AI agents parse product information?
- **Checkout readiness**: Can an agent complete a purchase programmatically?
- **Competitive positioning**: How do competitors compare on machine readability?

---

## Technical Stress Test Checklist

Run these alongside the demo scenarios to verify reliability:

### Connection Pool
- [ ] 5+ chats opened in quick succession — no `MaxClientsInSessionMode` errors
- [ ] Audit runs while other chats are active — no timeouts
- [ ] Back-to-back audits across different projects — no connection exhaustion

### Probe Grid Isolation
- [ ] Probe grid only appears in the chat that triggered it
- [ ] Navigating to a different chat shows no probe grid
- [ ] Navigating back to the audit chat shows the persisted probe grid
- [ ] Hard page refresh preserves the probe grid (from tool output)

### Report Integrity
- [ ] All report sections render (header, KPIs, charts, table, findings, recommendations)
- [ ] Recommendation tiers are consolidated (one heading per tier)
- [ ] No React console errors (duplicate keys, etc.)
- [ ] Numbers in report match the raw audit data (no hallucinated metrics)

### Edge Cases
- [ ] Audit with a brand that AI models barely know (niche brand) — should show low scores, not errors
- [ ] Rapid chat switching during an active audit — grid stays in the correct chat
- [ ] Browser back/forward navigation — no UI corruption
- [ ] Multiple browser tabs open to different chats — no cross-tab state leaking

---

## Pre-Demo Checklist

1. [ ] `make dev` starts cleanly
2. [ ] Supabase connection works (port 6543, transaction mode)
3. [ ] Vercel AI Gateway key is valid (check one probe manually)
4. [ ] Run one full audit end-to-end as a dry run
5. [ ] Clear browser console — start demo with zero errors
6. [ ] Have 2-3 brand projects pre-created as fallbacks if live setup fails
7. [ ] Terminal hidden, only browser visible
8. [ ] Screen recording running as backup
