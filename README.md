# NCLEX RN Practice Bank

A mobile-friendly static question-bank app for GitHub Pages. It lists question files from the `questions/` folder, lets the user choose a file before starting, and saves test progress/results in the device browser.

## What is included

- `index.html` — main app page
- `assets/styles.css` — responsive professional styling
- `assets/app.js` — catalog, parser, testing engine, GitHub discovery, imported-file storage, saved progress
- `questions/` — put all `.json` and `.txt` question files here
- `data/tests.json` — test catalog used by the app
- `tools/build-catalog.mjs` — rebuilds `data/tests.json` from `questions/`
- `.github/workflows/build-catalog.yml` — optional GitHub Action that updates the catalog after question files are pushed
- `repo-config.js` — optional GitHub auto-discovery settings
- `site.webmanifest` and `sw.js` — installable/mobile-friendly shell

## Important fix in this version

The app now builds the test list from three sources and merges them together:

1. `data/tests.json`
2. GitHub auto-discovery from the `questions/` folder
3. Question files imported on the phone/browser with **Import files**

This means that if `data/tests.json` is stale, files in the GitHub `questions/` folder can still appear after refresh when GitHub discovery is available. Imported local files are also saved in the browser using IndexedDB, so they keep showing after refresh on the same device.

## Add more question files for GitHub Pages

1. Copy your `.json` or `.txt` files into the `questions/` folder.
2. Run this locally before pushing:

```bash
node tools/build-catalog.mjs
```

3. Commit and push:

```bash
git add .
git commit -m "Add question files"
git push
```

The GitHub Action included in this repo can also rebuild the catalog automatically when files in `questions/` change.

## If new GitHub files are not showing

Check these points:

1. Your files must be inside the exact folder named `questions/`.
2. File names must end in `.json` or `.txt`.
3. If you use GitHub Pages, wait until **Actions** and **Pages deployment** finish.
4. Open `repo-config.js` and set `owner` and `repo` if your site uses a custom domain or GitHub discovery cannot infer the repo.
5. Hard refresh the page. On mobile, clear the site cache if an old service worker is still loaded.

Example `repo-config.js`:

```js
window.NCLEX_REPO_CONFIG = {
  owner: 'your-github-username',
  repo: 'your-repository-name',
  branch: 'main',
  questionsDir: 'questions',
  useGitHubAutoDiscovery: true
};
```

## Import multiple files directly on mobile/browser

Use **Import files** on the home screen and select multiple `.json` or `.txt` files. The app stores them on that same phone/browser and shows them in the list after refresh.

This is useful when you open the HTML locally, because browsers cannot automatically scan a local folder for security reasons.

## Enable GitHub Pages

1. Push these files to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch: `main`, folder: `/root`.
5. Save. Open the GitHub Pages URL after deployment.

## Progress saving

Progress is saved in the current browser/device. On mobile, the same phone/browser can resume tests later. If the browser cache/site data is cleared, saved progress is removed.

Saved data includes:

- current question position
- selected answers
- completed questions
- score
- time spent
- finished result

No database or login is required.

## Supported JSON format

The app supports JSON files where questions are inside any of these keys:

- `questionList`
- `questions`
- `items`
- `data`

It also supports a raw array of question objects.

Each question can use fields like:

```json
{
  "questionText": "Question text here",
  "answerChoiceList": [
    { "choice": "Option 1", "choiceNumber": 1 },
    { "choice": "Option 2", "choiceNumber": 2 }
  ],
  "correctAnswer": "1",
  "explanationText": "Rationale here"
}
```

## Supported TXT format

Plain text is supported too:

```txt
Question 1: What should the nurse do first?
A. Assess airway
B. Call provider
C. Document findings
D. Recheck in one hour
Answer: A
Explanation: Airway is the priority.
```

## Notes

- Opening `index.html` directly from phone storage cannot automatically list files from a folder. Use **Import files** or GitHub Pages.
- For GitHub Pages, the best permanent workflow is: add files to `questions/`, run `node tools/build-catalog.mjs`, commit and push.
- The **Import files** option is saved only on the same device/browser.
