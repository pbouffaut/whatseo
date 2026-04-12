const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}
