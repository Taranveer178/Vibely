# Vibely

Vibely is a React/Vite client backed directly by Firebase Authentication, Cloud Firestore, and Cloud Storage. The UI is split into contexts, reusable components, layouts, views, and service modules under `src/`.

## Local setup

1. Copy `.env.example` to `.env.local` and configure the Firebase Web API key from the Firebase Console for the `vibely-1d289` project (**Project settings → General → Your apps → SDK setup and configuration**).
2. Install dependencies with `npm install`.
3. Run `npm run dev`. `npm run build` and `npm run lint` validate the client.

Firebase Authentication handles registration and login; Firestore stores profiles, chats, stories, circles, moments, and connection requests, and Firebase Storage stores uploaded media. There is no separate `VITE_API_BASE_URL` or Worker API requirement. Deploy the included `firestore.rules` and `storage.rules` in the Firebase Console before using database-backed features and uploads. Admin screens require an existing admin role on the user's `users/{uid}` document; do not grant admin access from client code. The admin dashboard shows account and recent-activity counts; transcript and report totals remain unavailable until those features write corresponding data. If Firebase reports `auth/api-key-not-valid`, verify the key is copied from the Web app configuration for this same Firebase project and check that its Google Cloud API-key restrictions allow the app's domains and the Identity Toolkit API.

Enable the **Email/Password** provider in Firebase Authentication. Registration creates a Firebase Auth account and saves private and discoverable profile documents. Make sure the Firebase Storage bucket is enabled.

## Local testing

Create a Firestore database and deploy `firestore.rules`; deploy `storage.rules` if testing profile photos, stories, moments, or voice uploads. New user profiles are written to `users/{uid}` (private) and `profiles/{uid}` (discoverable). Stories, circles, moments, and connection requests are created by their respective screens. To test chat messaging, create a `chats/{chatId}` document with a `participants` array containing the participating Firebase UIDs; messages are written under its `messages` subcollection. Set an admin user's `role` to `admin` in the Firebase Console; client code cannot grant admin privileges.

## Client state

The theme is stored in `localStorage`. Firebase Authentication persists the session and restores it on app boot. Saved-message IDs/content are persisted in account-scoped browser storage.
