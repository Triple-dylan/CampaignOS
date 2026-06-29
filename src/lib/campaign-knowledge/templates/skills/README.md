---
title: "Skills"
folder: skills
type: folder-readme
---

# Skills

Reusable agent skills and playbooks for drafting, research, and compliance checks.

Each subdirectory contains a `SKILL.md` mirror of the canonical harness skill under `src/lib/harness/skills/`.

## What belongs here

- One topic or entity per markdown file (kebab-case slug)
- Link related pages with `[[wikilinks]]` or YAML `related` paths
- Set `node_type` in frontmatter when syncing to the knowledge graph

## Example page

```markdown
---
title: "Example skills page"
node_type: task
summary: "One-line description for index and graph."
status: draft
tags: []
---

# Example skills page

Body content. Cite sources and link to related knowledge.
```
