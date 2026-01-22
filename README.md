<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Smart Planner & Financial Guardian

<!-- Last updated to trigger GitHub Actions -->

## Deployment

### Firebase Hosting

To deploy this application to Firebase Hosting:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

The application will be deployed to your Firebase Hosting URL.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1An9GD5_baE5ZBCh1mfhbBEh0sWLHXwCQ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
