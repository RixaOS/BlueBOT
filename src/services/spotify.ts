import SpotifyWebApi from "spotify-web-api-node";
import { config } from "../config.ts";

const spotify = new SpotifyWebApi({
  clientId: config.SPOTIFY_CLIENT_ID,
  clientSecret: config.SPOTIFY_CLIENT_SECRET,
});

let tokenExpiry = 0;

async function refreshAccessToken() {
  if (Date.now() < tokenExpiry) return;

  const data = await spotify.clientCredentialsGrant();
  spotify.setAccessToken(data.body.access_token);
  tokenExpiry = Date.now() + data.body.expires_in * 1000;
}

export async function searchSpotifyTrack(query: string) {
  await refreshAccessToken();

  const res = await spotify.searchTracks(query, { limit: 1 });
  const track = res.body.tracks?.items?.[0];

  if (!track) return null;

  return {
    name: track.name,
    artists: track.artists.map((a) => a.name).join(", "),
    url: track.external_urls.spotify,
    album: track.album.name,
    image: track.album.images[0]?.url,
  };
}
