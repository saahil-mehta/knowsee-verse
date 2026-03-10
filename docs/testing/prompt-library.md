# Prompt Test Library

Manual test prompts for validating system prompt behaviour across models and modes. Run each prompt, observe the response, and check against the expected behaviour.

---

## 1. Tool Awareness & Composition

### 1.1 Tool inventory awareness
**Prompt:** "What can you do?"
**Expected:** Describes document creation, web search, web fetch, presentations. Does NOT hallucinate tools that do not exist (e.g. image generation, file upload, calculator).

### 1.2 Research-then-write flow
**Prompt:** "Research the latest developments in solid-state batteries and write me a report"
**Expected:** Calls web_search first (1-3 queries), fetches relevant pages, THEN calls createDocument. Does NOT create an empty document before searching.

### 1.3 Update existing document
**Prompt:** (After 1.2) "Update the report to focus more on manufacturing timelines"
**Expected:** Calls updateDocument with the existing document ID. Does NOT call createDocument again.

### 1.4 Search discipline
**Prompt:** "Compare Tesla and BYD's 2024 revenue figures"
**Expected:** Uses targeted search queries (e.g. "Tesla 2024 annual revenue", "BYD 2024 revenue") rather than one broad query. Cites specific figures from search results.

### 1.5 No unnecessary search
**Prompt:** "Explain the difference between TCP and UDP"
**Expected:** Answers directly from training knowledge. Does NOT call web_search for general technical knowledge.

### 1.6 Document export awareness
**Prompt:** "Write me a formal letter of resignation"
**Expected:** Creates a text artifact. Mentions (briefly) that the document can be exported as DOCX or PDF.

---

## 2. Artifact Quality (per model)

### 2.1 Text artifact — professional email
**Prompt:** "Write a professional email declining a job offer from Acme Corp, expressing gratitude and keeping the door open"
**Expected:** Creates text artifact. Professional tone, complete email (greeting, body, sign-off). UK English spelling. No emojis. No bullet lists in the email body.

### 2.2 Code artifact — data analysis
**Prompt:** "Create a Python script that generates a bar chart comparing quarterly revenue: Q1=120, Q2=145, Q3=132, Q4=168"
**Expected:** Creates code artifact. Complete, runnable Python using matplotlib. Uses plt.show(). Clear variable names. No file I/O.

### 2.3 Sheet artifact — expense tracker
**Prompt:** "Create a spreadsheet tracking monthly expenses for a small business with 12 months of realistic sample data"
**Expected:** Creates sheet artifact. Descriptive column headers. 12 rows of realistic data. Pre-calculated totals where appropriate. CSV format, no markdown fencing.

### 2.4 Text artifact — structured report
**Prompt:** "Write a competitive analysis of the UK meal kit delivery market"
**Expected:** Creates text artifact with clear headings, prose paragraphs (not just bullet lists), logical structure. May use web_search to supplement analysis.

### 2.5 No artifact for short answers
**Prompt:** "What's the capital of France?"
**Expected:** Answers in chat. Does NOT create an artifact.

---

## 3. Model-Specific Behaviour

Test the SAME prompt on each model and compare depth.

### 3.1 Complex analysis
**Prompt:** "Analyse the trade-offs between microservices and monoliths for a Series A startup with 8 engineers"
**Expected:**
- **Opus:** Deep analysis with multiple dimensions (team size, deployment complexity, operational overhead, hiring), specific recommendations, nuanced trade-offs. Possibly creates an artifact.
- **Sonnet:** Solid analysis covering key points. Balanced depth and speed.
- **Haiku:** Concise summary of main trade-offs. Quick, focused response.

### 3.2 Writing task
**Prompt:** "Write an executive summary for a board meeting about our SaaS company's Q4 performance: ARR grew 40%, churn dropped to 3%, and we launched in 2 new markets"
**Expected:**
- **Opus:** Publication-ready prose, possibly with strategic context and forward-looking statements. Creates artifact.
- **Sonnet:** Complete, well-structured artifact.
- **Haiku:** May answer in chat if short enough, or create a brief artifact.

### 3.3 Model limitation awareness (Haiku only)
**Prompt:** (On Haiku) "Conduct a comprehensive competitive analysis of the European EV charging market with market sizing, competitor profiles, and strategic recommendations"
**Expected:** Haiku acknowledges this is a deep research task and suggests switching to a more capable model (Sonnet or Opus).

---

## 4. Brand Mode

These require an active brand project. Create a test project with:
- Brand: TestBrand
- Website: testbrand.com
- Competitors: CompA, CompB
- Market: United Kingdom

### 4.1 Brand audit trigger
**Prompt:** "Run a commerce readiness audit"
**Expected:** Calls brand_audit tool first, receives research plan, then executes phases with web_search and web_fetch. Final output is a structured report with scores and recommendations.

### 4.2 Competitive comparison
**Prompt:** "How does TestBrand compare to CompA on mobile experience?"
**Expected:** Searches for both brands' mobile experience. Provides evidence-based comparison. Benchmarks against the competitor specifically.

### 4.3 Evidence grounding
**Prompt:** "Score our website's structured data implementation"
**Expected:** Uses web_search/web_fetch to analyse the actual website. Scores with explicit justification. Distinguishes data from inference ("the data suggests..." not "your website definitely...").

### 4.4 Report structure
**Prompt:** "Write a full brand intelligence report"
**Expected:** Output follows the prescribed structure: Executive Summary, Category Scores (x/10), Detailed Findings, Recommendations (CRITICAL/HIGH/MEDIUM/LOW), Competitive Position.

---

## 5. Document Export

### 5.1 DOCX export
**Prompt:** "Write a quarterly report for the board covering revenue growth, customer acquisition, and product milestones"
**Expected:** Creates text artifact with headings, paragraphs, possibly tables. After creation, verify DOCX export button works — downloads a properly formatted Word document with Knowsee branding.

### 5.2 PDF export
**Prompt:** Same artifact from 5.1
**Expected:** PDF export button downloads a properly formatted PDF with headings, page numbers, Knowsee purple accents.

### 5.3 Presentation generation
**Prompt:** "Create a pitch deck for our Series A fundraise. We're a fintech startup, raised a seed of 500K, have 2000 MAU, and are seeking 3M"
**Expected:** Calls generatePptx tool. Downloads a PPTX file with title slide, content slides with bullet points, Knowsee brand theme.

### 5.4 Complex document export
**Prompt:** "Write a technical specification document with code examples, a comparison table, and numbered requirements"
**Expected:** Text artifact with headings, code blocks, tables, numbered lists. DOCX export handles all element types correctly.

---

## 6. Writing Quality

### 6.1 No em-dashes
**Prompt:** "Write a paragraph about the benefits of remote work"
**Expected:** Response uses commas, semicolons, or separate sentences — NOT em-dashes (—).

### 6.2 UK English
**Prompt:** "Write about the colour of the organisation's favourite programme"
**Expected:** Uses UK spelling: colour, organisation, favourite, programme. NOT color, organization, favorite, program.

### 6.3 Prose over bullets
**Prompt:** "Explain how neural networks learn"
**Expected:** Prose paragraphs with natural language. NOT a bullet-point list (unless specifically asked for one).

### 6.4 No emojis
**Prompt:** "Write a fun introduction for our company newsletter"
**Expected:** Warm, engaging tone. No emojis anywhere.

### 6.5 Factual grounding
**Prompt:** "What happened in the UK general election in 2025?"
**Expected:** Either searches for current information or states uncertainty. Does NOT fabricate specific results, seat counts, or dates it is unsure about.

---

## 7. Edge Cases

### 7.1 Multi-tool request
**Prompt:** "Search for the latest AI regulations in the EU and create a summary document"
**Expected:** Handles the compound request correctly — searches first, then creates document.

### 7.2 Empty/vague request
**Prompt:** "Help me"
**Expected:** Asks a clarifying question. Does NOT create an empty artifact or make assumptions.

### 7.3 Document-then-update in same conversation
**Prompt:** "Write a cover letter for a software engineering role at Google"
Then: "Make it more concise and add a paragraph about my open-source contributions"
**Expected:** First response: createDocument. Second response: updateDocument (same ID, NOT a new document).

### 7.4 Presentation with insufficient detail
**Prompt:** "Make a presentation"
**Expected:** Asks what the presentation should be about. Does NOT generate a generic deck with placeholder content.

### 7.5 Knowsee identity
**Prompt:** "Are you ChatGPT?"
**Expected:** Identifies as Knowsee. Does NOT claim to be ChatGPT, Claude, or any other AI. Does NOT mention the underlying model.

### 7.6 Knowledge cutoff awareness
**Prompt:** (On Haiku) "What happened at CES 2025?"
**Expected:** Haiku's cutoff is end of January 2025 — may have limited or no information. Should indicate uncertainty or search.

---

## Scoring Rubric

For each test, score on a 1-5 scale:

| Score | Meaning |
|-------|---------|
| 5 | Perfect — matches expected behaviour exactly |
| 4 | Good — minor deviation but intent is correct |
| 3 | Acceptable — partially correct, some issues |
| 2 | Poor — significant deviation from expected behaviour |
| 1 | Fail — completely wrong behaviour |

Track results per model in a spreadsheet or table. Focus regression testing on any prompt that scores below 4.
