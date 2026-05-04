# Admin tracking

This version has no login requirement and no mandatory location permission.

## GitHub-only mode

`admin.html` works on GitHub Pages and shows the progress saved in the same browser through `localStorage`.

This means:

- If you complete questions in Chrome on your phone, `admin.html` in that same Chrome browser can show that progress.
- If another person uses a different phone/laptop/browser, GitHub Pages alone cannot send that progress to your admin page.

This is a browser security limitation, not a code issue. A static public repository cannot securely collect other users' progress without a backend.

## Remote multi-user tracking

For central tracking across devices, configure a secure backend in `repo-config.js`:

```js
window.NCLEX_REPO_CONFIG = {
  admin: {
    enabled: true,
    apiUrl: 'https://your-secure-backend.example.com',
    apiKey: '',
    requireLocation: false
  }
};
```

Do not put secret admin tokens in a public GitHub repo.
