# Question files

Add your `.json` or `.txt` question-bank files in this folder.

Supported formats:

1. JSON with a `questionList`, `questions`, `items`, or `data` array.
2. A JSON array of question objects.
3. Plain text formatted like:

```txt
Question 1: What should the nurse do first?
A. Option one
B. Option two
C. Option three
D. Option four
Answer: B
Explanation: Short rationale here.
```

After adding files, run:

```bash
node tools/build-catalog.mjs
```

The included GitHub Action can also rebuild `data/tests.json` automatically after you push changes to GitHub.
