import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import LongPressLink from "../../components/LongPressLink";
import Image from "next/image";
export const runtime = "experimental-edge";

const ArtistPage = ({
  artist,
  currentlyPlayingTrackUri,
  handleError,
  error,
}) => {
  const router = useRouter();
  const accessToken = router.query.accessToken;
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);

  useEffect(() => {
    if (error) {
      handleError(error.type, error.message);
    }
  }, [error, handleError]);

  useEffect(() => {
    const artistImage =
      artist.images && artist.images.length > 0 ? artist.images[0].url : "";
    localStorage.setItem("artistPageImage", artistImage);
  }, [artist]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        playArtistTopTracks();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isShuffleEnabled]);

  useEffect(() => {
    const fetchPlaybackState = async () => {
      try {
        const response = await fetch("https://api.spotify.com/v1/me/player", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setIsShuffleEnabled(data.shuffle_state);
        }
      } catch (error) {
        handleError("FETCH_PLAYBACK_STATE_ERROR", error.message);
      }
    };

    fetchPlaybackState();
  }, [accessToken]);

  const playArtistTopTracks = async () => {
    try {
      const devicesResponse = await fetch(
        "https://api.spotify.com/v1/me/player/devices",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const devicesData = await devicesResponse.json();

      if (devicesData.devices.length === 0) {
        handleError(
          "NO_DEVICES_AVAILABLE",
          "No devices available for playback"
        );
        return;
      }

      const device = devicesData.devices[0];
      const activeDeviceId = device.id;

      if (!device.is_active) {
        await fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_ids: [activeDeviceId],
            play: false,
          }),
        });
      }

      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${isShuffleEnabled}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const trackUris = artist.topTracks.map((track) => track.uri);

      let offset;
      if (isShuffleEnabled) {
        const randomPosition = Math.floor(Math.random() * trackUris.length);
        offset = { position: randomPosition };
      } else {
        offset = { position: 0 };
      }

      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: trackUris,
          offset: offset,
        }),
      });
      router.push("/now-playing");
    } catch (error) {
      handleError("PLAY_ARTIST_TOP_TRACKS_ERROR", error.message);
    }
  };

  const playTrack = async (trackUri, trackIndex) => {
    try {
      const devicesResponse = await fetch(
        "https://api.spotify.com/v1/me/player/devices",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const devicesData = await devicesResponse.json();

      if (devicesData.devices.length === 0) {
        handleError(
          "NO_DEVICES_AVAILABLE",
          "No devices available for playback"
        );
        return;
      }

      const device = devicesData.devices[0];
      const activeDeviceId = device.id;

      if (!device.is_active) {
        const transferResponse = await fetch(
          "https://api.spotify.com/v1/me/player",
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [activeDeviceId],
              play: false,
            }),
          }
        );

        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          handleError("TRANSFER_PLAYBACK_ERROR", errorData);
          return;
        }
      }

      const allTrackUris = artist.topTracks.map((track) => track.uri);
      const tracksToPlay = allTrackUris.slice(trackIndex);

      const playResponse = await fetch(
        "https://api.spotify.com/v1/me/player/play",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: tracksToPlay,
            device_id: activeDeviceId,
          }),
        }
      );

      if (!playResponse.ok) {
        const errorData = await playResponse.json();
        handleError("PLAY_TRACK_ERROR", errorData);
      }
    } catch (error) {
      handleError("PLAY_TRACK_REQUEST_ERROR", error.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 pt-10 px-12 max-h-screen fadeIn-animation">
      <div className="md:w-1/3 h-screen sticky top-0">
        {artist.images && artist.images.length > 0 ? (
          <div className="min-w-[280px] mr-10">
            <LongPressLink
              spotifyUrl={artist.external_urls.spotify}
              accessToken={accessToken}
            >
              <Image
                src={artist.images[0].url || "/images/not-playing.webp"}
                alt="Artist Image"
                width={280}
                height={280}
                className="aspect-square rounded-full drop-shadow-xl"
              />
            </LongPressLink>
            <LongPressLink
              spotifyUrl={artist.external_urls.spotify}
              accessToken={accessToken}
            >
              <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                {artist.name}
              </h4>
            </LongPressLink>
            <h4 className="text-[28px] font-[560] text-white/60 truncate tracking-tight max-w-[280px]">
              {artist.followers.total.toLocaleString()} Followers
            </h4>
          </div>
        ) : (
          <p>No image available</p>
        )}
      </div>

      <div className="md:w-2/3 ml-20 h-screen overflow-y-scroll scroll-container scroll-smooth pb-12">
        {artist.topTracks && artist.topTracks.length > 0 ? (
          artist.topTracks.map((track, index) => (
            <div key={track.id} className="flex gap-12 items-start mb-4">
              <div className="text-[32px] font-[580] text-center text-white/60 w-6 mt-3">
                {track.uri === currentlyPlayingTrackUri ? (
                  <div className="w-5">
                    <section>
                      <div className="wave0"></div>
                      <div className="wave1"></div>
                      <div className="wave2"></div>
                      <div className="wave3"></div>
                    </section>
                  </div>
                ) : (
                  <p>{index + 1}</p>
                )}
              </div>

              <div className="flex-grow">
                <LongPressLink
                  href="/now-playing"
                  spotifyUrl={track.external_urls.spotify}
                  accessToken={accessToken}
                >
                  <div onClick={() => playTrack(track.uri, index)}>
                    <p className="text-[32px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                      {track.name}
                    </p>
                  </div>
                </LongPressLink>
                <div className="flex flex-wrap">
                  {track.artists.map((artist, artistIndex) => (
                    <LongPressLink
                      key={artist.id}
                      spotifyUrl={artist.external_urls.spotify}
                      accessToken={accessToken}
                    >
                      <p
                        className={`text-[28px] font-[560] text-white/60 truncate tracking-tight ${
                          artistIndex < track.artists.length - 1
                            ? 'mr-2 after:content-[","]'
                            : ""
                        }`}
                      >
                        {artist.name}
                      </p>
                    </LongPressLink>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No tracks available</p>
        )}
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  const { artistId } = context.params;
  const accessToken = context.query.accessToken || null;

  if (!accessToken) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      return {
        props: {
          error: {
            type: "FETCH_ARTIST_ERROR",
            message: errorData.error.message,
          },
          artist: null,
          accessToken: null,
        },
      };
    }

    const artistData = await res.json();

    const topTracksRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const topTracksData = await topTracksRes.json();

    return {
      props: {
        artist: { ...artistData, topTracks: topTracksData.tracks },
        accessToken,
        error: null,
      },
    };
  } catch (error) {
    return {
      props: {
        error: {
          type: "FETCH_ARTIST_ERROR",
          message: error.message,
        },
        artist: null,
        accessToken: null,
      },
    };
  }
}

export default ArtistPage;
