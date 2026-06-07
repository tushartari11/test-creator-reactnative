---
name: feedback-no-signoff
description: Do not add Co-Authored-By sign-off lines to git commits
metadata:
  type: feedback
---

Never add `Co-Authored-By: Claude ...` sign-off lines to git commit messages.

**Why:** User preference — they don't want attribution lines in commits.

**How to apply:** Always omit the Co-Authored-By trailer from every commit message.
