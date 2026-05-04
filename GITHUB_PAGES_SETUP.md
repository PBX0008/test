# GitHub Pages setup

This package is ready to run as a static GitHub Pages site.

## Fast setup

1. Upload all files in this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. The included workflow `.github/workflows/deploy-pages.yml` will deploy the site.
5. Open the Pages URL shown by GitHub.

## Main app

Open `index.html`, then press **OPEN APP**. The question catalog is loaded from `data/tests.json`, and the question files are loaded from the `questions/` folder. The app also keeps GitHub auto-discovery enabled, so public GitHub repos can discover new `.json` and `.txt` files in the `questions/` folder.

## Admin page

Open `admin.html` from the same GitHub Pages site.

Because GitHub Pages is static, `admin.html` can track and display progress saved in the same browser only. That is the only secure GitHub-only option without exposing a secret token. To track multiple devices/users centrally, you must connect a secure backend or database; do not place secret tokens in a public GitHub repository.
