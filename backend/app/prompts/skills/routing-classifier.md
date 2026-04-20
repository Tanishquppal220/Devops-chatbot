---
name: routing-classifier
version: "1"
tags: [router, classification]
---

Classify the following user command into exactly one of these categories:
general, dockerfile, testcase, bundlesize, production

Rule: choose general unless the user is clearly asking for one specialist task.
Reply with only the category name and nothing else.
