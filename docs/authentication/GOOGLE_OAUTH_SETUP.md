# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the Regno AI Chat application.

## 1. Create Google OAuth Credentials

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.developers.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one

### Step 2: Enable Google+ API
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click "Enable"

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" for user type
   - Fill in the required fields (App name, User support email, etc.)
   - Add your domain to "Authorized domains"
   - Add scopes: `email`, `profile`, `openid`

### Step 4: Configure OAuth Client
1. Choose "Web application" as the application type
2. Give it a name (e.g., "Regno AI")
3. Add authorized JavaScript origins:
   - For development: `http://localhost:5173`
   - For production: `https://yourdomain.com`
4. Add authorized redirect URIs:
   - For development: `http://localhost:5173/auth/google/callback`
   - For production: `https://yourdomain.com/auth/google/callback`
5. Click "Create"

### Step 5: Get Your Credentials
1. Copy the "Client ID" and "Client Secret"
2. Keep these secure and never commit them to version control

## 2. Configure Environment Variables

### Step 1: Create Environment File
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

### Step 2: Add Your Credentials
Edit `.env` and add your Google OAuth credentials:

```bash
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

## 3. Set Up Routing (if using a router)

If you're using a router like SvelteKit, create a route for the OAuth callback:

### SvelteKit Example
Create `src/routes/auth/google/callback/+page.svelte`:

```svelte
<script>
  import GoogleAuthCallback from '$lib/components/GoogleAuthCallback.svelte';
</script>

<GoogleAuthCallback />
```

### Vanilla Svelte Example
If not using a router, you can handle the callback in your main app:

```javascript
// In your main app component
import { googleAuthService } from './lib/services/googleAuth.js';

// Check for OAuth callback on app load
onMount(async () => {
  if (window.location.pathname === '/auth/google/callback') {
    try {
      const userInfo = await googleAuthService.handleCallback();
      if (userInfo) {
        // Handle successful authentication
        console.log('User authenticated:', userInfo);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
    }
  }
});
```

## 4. Production Deployment

### Update Environment Variables
For production, update your `.env` file:

```bash
VITE_GOOGLE_CLIENT_ID=your_production_client_id
VITE_GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

### Update Google Console Settings
1. Go back to Google Cloud Console
2. Update your OAuth client settings:
   - Add your production domain to authorized origins
   - Add your production callback URL to authorized redirect URIs

## 5. Testing

### Development Testing
1. Start your development server: `npm run dev`
2. Click the "Continue with Google" button
3. You should be redirected to Google's OAuth flow
4. After granting permissions, you'll be redirected back to your app

### Production Testing
1. Deploy your application
2. Test the OAuth flow on your production domain
3. Verify that users can sign in and their information is correctly stored

## 6. Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Check that your redirect URI in `.env` exactly matches what's configured in Google Console
   - Ensure there are no trailing slashes or extra characters

2. **"invalid_client" error**
   - Verify your Client ID is correct
   - Check that the OAuth client is enabled

3. **CORS errors**
   - Ensure your domain is added to "Authorized JavaScript origins"
   - Check that you're using HTTPS in production

4. **Popup blocked**
   - The Google OAuth uses a popup window
   - Users need to allow popups for your domain
   - Consider implementing the redirect flow as a fallback

### Debug Mode
You can enable debug logging by adding this to your component:

```javascript
// Enable debug logging
googleAuthService.setConfig({
  debug: true
});
```

## 7. Security Best Practices

1. **Never expose client secrets in frontend code**
   - Client secrets should only be used server-side
   - The current implementation uses popup flow which doesn't require the secret

2. **Use HTTPS in production**
   - Google requires HTTPS for production OAuth flows

3. **Validate tokens server-side**
   - Always verify Google tokens on your backend
   - Don't trust client-side authentication alone

4. **Implement proper logout**
   - Clear all authentication tokens
   - Consider revoking Google tokens if needed

## 8. Alternative Flows

### Redirect Flow
If popups are problematic, you can use the redirect flow:

```javascript
// Instead of popup
googleAuthService.signInWithRedirect();
```

### Server-Side Flow
For more security, implement server-side OAuth:
1. Send authorization code to your backend
2. Exchange code for tokens server-side
3. Return user data to frontend

This implementation provides a solid foundation for Google OAuth authentication that's secure, user-friendly, and production-ready.