// Optional repository settings.
// Leave owner/repo blank if you use data/tests.json or GitHub Pages URL inference.
// For a public GitHub Pages repo, the app can infer owner/repo from the URL.
window.NCLEX_REPO_CONFIG = {
  owner: '',
  repo: '',
  branch: 'main',
  questionsDir: 'questions',
  useGitHubAutoDiscovery: true,

  // Optional backend reporting requires your own secure backend/database.
  // Login/password and mandatory location access are disabled in this version.
  admin: {
    enabled: false,
    apiUrl: '',
    apiKey: '',
    usersEndpoint: '',
    heartbeatEndpoint: '',
    progressEndpoint: '',
    requireLocation: false,
    offlineDays: 3,
    heartbeatSeconds: 60,
    appId: 'nclex-rn-repository'
  }
};
