# 🚀 GitHub Stats Generator Setup

This project uses a custom Node.js script to generate GitHub stats (SVG images) and a GitHub Actions workflow to update them automatically.

## 🛠️ Setup Instructions

### 1. Generate a Personal Access Token (PAT)
To fetch your GitHub stats securely, you need a Personal Access Token.
1. Go to **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Set **Expiration** to "No expiration" (or simpler, rotate it periodically).
4. Select the following scopes:
   - `repo` (Full control of private repositories - needed if you want to include private stats)
   - `read:user` (Read all user profile data)
5. Click **Generate token** and **copy it**. (You won't see it again!)

### 2. Add Secret to Repository
1. Go to your repository on GitHub.
2. Click **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. **Name**: `GH_TOKEN`
5. **Secret**: Paste your PAT here.
6. Click **Add secret**.

### 3. Usage
- The workflow runs **daily at midnight UTC**.
- It also runs whenever you **push to the main branch**.
- You can manually trigger it from the **Actions** tab > **Update GitHub Stats** > **Run workflow**.

### 🔧 Customization
- **Theme**: Edit `scripts/fetch-stats.js` to change behavior or SVG styles (colors, fonts).
- **Icons**: You can swap the SVG paths in `scripts/fetch-stats.js`.
