/**
 * Google Sign-In — OAuth 2.0 Web client ID (not Android client ID).
 * Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application
 * Also add your debug SHA-1 to the Android OAuth client (package: com.immobiliermobile).
 */
export const GOOGLE_WEB_CLIENT_ID =
  '73742014344-h1g9h1g47krmmdrtijf32cp57mu82b5i.apps.googleusercontent.com';

export const isGoogleSignInConfigured = () =>
  Boolean(
    GOOGLE_WEB_CLIENT_ID &&
      !GOOGLE_WEB_CLIENT_ID.startsWith('REPLACE_WITH'),
  );
