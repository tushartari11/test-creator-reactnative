---
name: feedback-restart
description: User restarts frontend and backend themselves after a build — do not attempt to restart processes
metadata:
  type: feedback
---

Do not attempt to restart the frontend or backend processes. The user handles restarts themselves after building.

**Why:** User explicitly said "I restarted the frontend and backend after build" when Claude tried to run spring-boot:run. They manage their own process lifecycle.

**How to apply:** After making backend changes, tell the user to rebuild and restart. Do not issue any mvn spring-boot:run, npm start, or similar process commands.
