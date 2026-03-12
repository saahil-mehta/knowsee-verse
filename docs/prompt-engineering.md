# Prompt Engineering Practices

Reference for system prompts in this project, aligned with Anthropic's Claude best practices.

## Principles Applied

### XML tags for structure, not decoration
Claude processes XML tags natively. Use them to separate instructions from data, examples from rules. Every tag name should be descriptive and consistent across prompts.

```
Good:  <geo-levers>, <report-structure>, <brand-profile>
Bad:   <section1>, <info>, <data>
```

### Examples over explanations
One good/bad example pair teaches a pattern better than paragraphs of description. Claude generalises from examples reliably. Wrap in `<examples>` and `<example>` tags.

### Context motivates compliance
Instead of "never do X", explain why X is harmful. Claude generalises from the explanation and applies it to edge cases you didn't anticipate.

```
Weak:   "Do not fabricate numbers"
Strong: "Use only data from the audit summary. Fabricated numbers would undermine
         the empirical credibility that differentiates this report."
```

### Direct and specific constraints
Be precise about what you want. Vague instructions produce vague output.

```
Weak:   "Write a good methodology section"
Strong: "Write one paragraph: N models probed, N prompts, N categories,
         total responses. State the scoring formula weights."
```

### Less aggressive language for Claude 4.6
Claude 4.6 overtriggers on "MUST", "CRITICAL", "NEVER", "ALWAYS". Use normal language. The model is responsive enough that calm instructions work better than shouting.

### Role prompting (one sentence)
Set the role early and move on. Claude doesn't need paragraphs of persona building.

### Match prompt style to desired output
If you want prose output, write prose instructions. If you want structured output, write structured instructions. Claude mirrors the style of the prompt.

## Prompt Architecture

System prompts are composed in `lib/ai/instructions/index.ts`:

```
base system prompt (index.ts)
  + tools.md (tool inventory)
  + brand-mode.md (brand project context, injected per-request)
  + dynamic tokens ({{brand_name}}, {{probe_models}}, etc.)
```

### Dynamic tokens in brand-mode.md
- `{{brand_name}}`, `{{website_url}}`, `{{country}}`, `{{market}}` — from BrandProfile
- `{{categories}}`, `{{competitors}}`, `{{retailers}}` — from BrandProfile (JSON arrays cast to string[])
- `{{probe_models}}` — from PROBE_MODELS config, injected in index.ts

Changing models in `lib/ai/perception/models.ts` automatically updates the system prompt.

## GEO Framework Design

The GEO (Generative Engine Optimisation) playbook uses 6 levers, each mapping to a specific audit data signal:

| Lever | Triggered by | Data field |
|-------|-------------|------------|
| Entity Authority | Low mention rate across all models | modelResults.mentionRate |
| Structured Data | Low/null position despite mentions | modelResults.avgPosition |
| Category Ownership | Low category scores vs competitors | categoryResults.scores |
| Review & UGC Signal | Low sentiment/recommendation despite mentions | modelResults.avgSentiment, avgRecommendation |
| Competitive Displacement | High competitor mention counts | competitorMentions |
| Model-Specific Targeting | Variance in mention rates across models | modelResults (compare across) |

The good/bad example pair in the prompt ensures Claude anchors every recommendation to specific audit numbers rather than generating generic SEO advice.

## Sources

- [Anthropic Claude 4 Best Practices](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Prompt Engineering Overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
