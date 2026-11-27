# CampusFile – Reviews

## Routes
| URL                    | Page                          |
|------------------------|-------------------------------|
| `/reviews`             | Student reviews portal        |
| `/reviews/login`       | Student login page (new)      |
| `/reviews/admin`       | Admin portal                  |

(Locally the `/reviews` prefix is optional: `/`, `/login`, `/admin`. `?portal=login` / `?portal=admin` also work.)

## Folders
```
src/
  main.jsx        route picker (lazy-loads each portal)
  styles/         global.css (shared look)
  auth/           student login: LoginForm (shared), LoginPage, LoginModal, authApi, session, authConfig
  user/           public reviews portal: App, api, normalizers, helpful, config
  admin/          admin portal, fully self-contained: AdminApp, adminApi, adminConfig, adminToken, adminData, admin.css
```
`admin/` imports nothing from `user/` or `auth/` (only the shared `styles/global.css`).

## Google login
Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID`. The Google button enables itself when it is set.
For local testing add `http://localhost:5173` to "Authorized JavaScript origins" of that client in Google Cloud Console.

## Run
```
npm install
npm run dev
```
