import { URLSearchParams } from "url";

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { code, clientId, clientSecret, useCustomCredentials } = req.body;

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.NEXT_PUBLIC_REDIRECT_URI);

    let usedClientId, usedClientSecret;

    if (useCustomCredentials) {
      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Custom credentials are required but not provided" });
      }
      usedClientId = clientId;
      usedClientSecret = clientSecret;
    } else {
      usedClientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
      usedClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    }

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + Buffer.from(`${usedClientId}:${usedClientSecret}`).toString('base64'),
        },
        body: params,
      });

      const responseData = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseData}`);
      }

      const data = JSON.parse(responseData);
      res.status(200).json(data);
    } catch (error) {
      console.error("Token exchange error:", error);
      res.status(500).json({ error: "Failed to fetch access token", details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}