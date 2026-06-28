---
title: "Campaign"
folder: campaign
type: folder-readme
---

# Campaign

Core campaign identity — candidate, office, jurisdiction, election date, and profile summary.

## What belongs here

- One topic or entity per markdown file (kebab-case slug)
- Link related pages with `[[wikilinks]]` or YAML `related` paths
- Set `node_type` in frontmatter when syncing to the knowledge graph

## Example page

```markdown
---
title: "Example campaign page"
node_type: candidate
summary: "One-line description for index and graph."
status: draft
tags: []
---

# Example campaign page

Body content. Cite sources and link to related knowledge.
```
