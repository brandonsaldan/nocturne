import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import classNames from "classnames";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";
import Drawer, {
  DrawerTrigger,
  DrawerContent,
} from "../components/common/navigation/Drawer";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { fetchUserOwnedPlaylists } from "../services/userPlaylistService";
import LongPressLink from "../components/common/navigation/LongPressLink";
import Image from "next/image";
import { getCurrentDevice } from "@/services/deviceService";
import { getTextDirection } from "../constants/fonts";
import {
  HeartIcon,
  HeartIconFilled,
  BackIcon,
  PauseIcon,
  PlayIcon,
  ForwardIcon,
  MenuIcon,
  VolumeOffIcon,
  VolumeLowIcon,
  VolumeLoudIcon,
  PlaylistAddIcon,
  GoToAlbumIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  LyricsIcon,
} from "../components/icons";

const NowPlaying = ({
  accessToken,
  currentPlayback,
  fetchCurrentPlayback,
  drawerOpen,
  setDrawerOpen,
  setActiveSection,
  updateGradientColors,
  handleError,
  showBrightnessOverlay,
}) => {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(null);
  const [isVolumeVisible, setIsVolumeVisible] = useState(false);
  const volumeTimeoutRef = useRef(null);
  const volumeSyncIntervalRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off");
  const [trackNameScrollingEnabled, setTrackNameScrollingEnabled] =
    useState(false);
  const previousTrackId = useRef(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const currentTrackId = useRef(null);
  const lyricsContainerRef = useRef(null);
  const [lyricsUnavailable, setLyricsUnavailable] = useState(false);
  const fetchedTracks = useRef(new Set());
  const [lyricsMenuOptionEnabled, setlyricsMenuOptionEnabled] = useState(false);
  const trackNameRef = useRef(null);
  const containerWidth = 380;
  const scrollSpeed = 40;
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    if (currentPlayback && currentPlayback.item) {
      setActiveSection("nowPlaying");
      const albumImage = currentPlayback.item.album?.images?.[0]?.url;
      updateGradientColors(albumImage || null, "nowPlaying");
    }
  }, [currentPlayback, updateGradientColors, setActiveSection]);

  useEffect(() => {
    const handleAppEscape = () => {
      if (drawerOpen) {
        setDrawerOpen(false);
      }
    };

    window.addEventListener("app-escape-pressed", handleAppEscape);

    return () => {
      window.removeEventListener("app-escape-pressed", handleAppEscape);
    };
  }, [drawerOpen, setDrawerOpen]);

  const parseLRC = (lrc) => {
    const lines = lrc.split("\n");
    return lines
      .map((line) => {
        const match = line.match(/\[(\d{2}):(\d{2}\.\d{2})\](.*)/);
        if (match) {
          const [, minutes, seconds, text] = match;
          const time = parseInt(minutes) * 60 + parseFloat(seconds);
          return {
            time: Math.max(0, time - 1.0),
            text: text.trim(),
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);
  };

  const fetchLyrics = useCallback(async () => {
    if (!currentPlayback || !currentPlayback.item) return;

    const trackId = currentPlayback.item.id;
    if (fetchedTracks.current.has(trackId)) return;

    setIsLoadingLyrics(true);
    setLyricsUnavailable(false);
    const trackName = currentPlayback.item.name;
    const artistName = currentPlayback.item.artists[0].name;

    try {
      const response = await fetch(
        `/api/v1/app/lyrics?name=${encodeURIComponent(
          trackName
        )}&artist=${encodeURIComponent(artistName)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const parsed = parseLRC(data.lyrics);
      setParsedLyrics(parsed);
      currentTrackId.current = trackId;
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setParsedLyrics([]);
      setLyricsUnavailable(true);
    } finally {
      setIsLoadingLyrics(false);
      fetchedTracks.current.add(trackId);
    }
  }, [currentPlayback]);

  useEffect(() => {
    if (currentPlayback && currentPlayback.item) {
      const newTrackId = currentPlayback.item.id;
      if (newTrackId !== currentTrackId.current) {
        setParsedLyrics([]);
        setCurrentLyricIndex(-1);
        setLyricsUnavailable(false);
        if (showLyrics && !fetchedTracks.current.has(newTrackId)) {
          fetchLyrics();
        }
      }
    } else {
      setShowLyrics(false);
      setParsedLyrics([]);
      setCurrentLyricIndex(-1);
      setLyricsUnavailable(false);
    }
  }, [currentPlayback, fetchLyrics, showLyrics]);

  const handleToggleLyrics = useCallback(() => {
    setShowLyrics((prev) => {
      if (
        !prev &&
        !lyricsUnavailable &&
        !fetchedTracks.current.has(currentPlayback?.item?.id)
      ) {
        fetchLyrics();
      }
      return !prev;
    });
  }, [fetchLyrics, lyricsUnavailable, currentPlayback]);

  useEffect(() => {
    if (!showLyrics || !currentPlayback || parsedLyrics.length === 0) return;

    const updateCurrentLyric = () => {
      const currentTime = currentPlayback.progress_ms / 1000;
      const newIndex = parsedLyrics.findIndex(
        (lyric) => lyric.time > currentTime
      );
      setCurrentLyricIndex(
        newIndex === -1 ? parsedLyrics.length - 1 : Math.max(0, newIndex - 1)
      );
    };

    updateCurrentLyric();
    const intervalId = setInterval(updateCurrentLyric, 100);

    return () => clearInterval(intervalId);
  }, [showLyrics, currentPlayback, parsedLyrics]);

  useEffect(() => {
    if (currentLyricIndex >= 0 && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const lyricElement = container.children[currentLyricIndex];
      if (lyricElement) {
        lyricElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentLyricIndex]);

  useEffect(() => {
    const scrollingEnabled = localStorage.getItem("trackNameScrollingEnabled");
    const lyricsMenuEnabled = localStorage.getItem("lyricsMenuEnabled");

    if (scrollingEnabled === null) {
      localStorage.setItem("trackNameScrollingEnabled", "true");
      setTrackNameScrollingEnabled(true);
    } else {
      setTrackNameScrollingEnabled(scrollingEnabled === "true");
    }

    if (lyricsMenuEnabled === null) {
      localStorage.setItem("lyricsMenuEnabled", "true");
      setlyricsMenuOptionEnabled(true);
    } else {
      setlyricsMenuOptionEnabled(lyricsMenuEnabled === "true");
    }
  }, []);

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (accessToken) {
        try {
          const userPlaylists = await fetchUserOwnedPlaylists(accessToken);
          setPlaylists(userPlaylists);
        } catch (error) {
          console.error("Error fetching user playlists:", error);
        }
      }
    };

    fetchPlaylists();
  }, [accessToken]);

  useEffect(() => {
    const syncVolume = () => {
      if (!currentPlayback?.device?.volume_percent) return;
      setVolume(currentPlayback.device.volume_percent);
    };

    syncVolume();
    volumeSyncIntervalRef.current = setInterval(syncVolume, 5000);

    return () => {
      if (volumeSyncIntervalRef.current) {
        clearInterval(volumeSyncIntervalRef.current);
      }
    };
  }, [currentPlayback?.device?.volume_percent]);

  const changeVolume = async (newVolume) => {
    if (!accessToken) return;
    try {
      const actualNewVolume = Math.max(0, Math.min(100, newVolume));

      await fetch(
        `https://api.spotify.com/v1/me/player/volume?volume_percent=${actualNewVolume}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setVolume(actualNewVolume);
      setIsVolumeVisible(true);

      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
      volumeTimeoutRef.current = setTimeout(() => {
        setIsVolumeVisible(false);
      }, 2000);
    } catch (error) {
      console.error("Error changing volume:", error);
    }
  };

  const handleWheelScroll = (event) => {
    if (!showBrightnessOverlay && !drawerOpen) {
      if (event.deltaX > 0) {
        changeVolume(volume + 7);
      } else if (event.deltaX < 0) {
        changeVolume(volume - 7);
      }
    }
  };

  useEffect(() => {
    const scrollHandler = (event) => {
      if (!drawerOpen) {
        handleWheelScroll(event);
      }
    };

    window.addEventListener("wheel", scrollHandler);
    return () => {
      window.removeEventListener("wheel", scrollHandler);
    };
  }, [volume, accessToken, drawerOpen]);

  const checkIfTrackIsLiked = useCallback(
    async (trackId) => {
      if (!accessToken) return;

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const likedArray = await response.json();
          setIsLiked(likedArray[0]);
        } else {
          console.error("Error checking if track is liked:", response.status);
        }
      } catch (error) {
        return;
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (currentPlayback && currentPlayback.item) {
      const currentTrackId = currentPlayback.item.id;
      if (currentTrackId !== previousTrackId.current) {
        checkIfTrackIsLiked(currentTrackId);
        previousTrackId.current = currentTrackId;
      }
    }
  }, [currentPlayback, checkIfTrackIsLiked]);

  const toggleLikeTrack = async () => {
    if (!accessToken || !currentPlayback || !currentPlayback.item) return;

    const trackId = currentPlayback.item.id;
    const endpoint = isLiked
      ? `https://api.spotify.com/v1/me/tracks?ids=${trackId}`
      : `https://api.spotify.com/v1/me/tracks?ids=${trackId}`;

    const method = isLiked ? "DELETE" : "PUT";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        setIsLiked(!isLiked);
      } else {
        console.error("Error toggling like track:", response.status);
      }
    } catch (error) {
      console.error("Error toggling like track:", error);
    }
  };

  const togglePlayPause = async () => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204 || response.status === 404) {
        const device = await getCurrentDevice(accessToken, handleError);

        if (device) {
          await fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [device.id],
              play: true,
            }),
          });
        } else {
          handleError(
            "NO_DEVICES_AVAILABLE",
            "No devices available for playback"
          );
          return;
        }
      } else {
        const endpoint =
          currentPlayback && currentPlayback.is_playing
            ? "https://api.spotify.com/v1/me/player/pause"
            : "https://api.spotify.com/v1/me/player/play";

        await fetch(endpoint, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }

      fetchCurrentPlayback();
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        togglePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlayPause]);

  const skipToNext = async () => {
    try {
      await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      fetchCurrentPlayback();
    } catch (error) {
      console.error("Error skipping to next track:", error);
    }
  };

  const skipToPrevious = async () => {
    try {
      if (currentPlayback && currentPlayback.progress_ms > 3000) {
        await fetch("https://api.spotify.com/v1/me/player/seek?position_ms=0", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } else {
        await fetch("https://api.spotify.com/v1/me/player/previous", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
      fetchCurrentPlayback();
    } catch (error) {
      console.error("Error skipping to previous track:", error);
    }
  };

  const PlayPauseButton = () => {
    if (currentPlayback && currentPlayback.is_playing) {
      return <PauseIcon className="w-14 h-14" />;
    } else {
      return <PlayIcon className="w-14 h-14" />;
    }
  };

  const addTrackToPlaylist = async (playlistId) => {
    if (!accessToken || !currentPlayback || !currentPlayback.item) return;

    setSelectedPlaylistId(playlistId);

    try {
      let allTracks = [];
      let nextURL = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

      while (nextURL) {
        const response = await fetch(nextURL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            "Error fetching tracks in playlist: " + (await response.json())
          );
        }

        const data = await response.json();
        allTracks = allTracks.concat(data.items);
        nextURL = data.next;
      }

      const currentTrackIds = allTracks.map((item) => item.track.id);

      if (currentTrackIds.includes(currentPlayback.item.id)) {
        setOpen(true);
        return;
      }

      await addTrackToPlaylistAPI(playlistId);
    } catch (error) {
      console.error("Error checking playlist contents:", error);
    }
  };

  const addTrackToPlaylistAPI = async (playlistId) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [`spotify:track:${currentPlayback.item.id}`],
          }),
        }
      );

      if (!response.ok) {
        console.error("Error adding track to playlist:", response.status);
      }
    } catch (error) {
      console.error("Error adding track to playlist:", error);
    }
  };

  const handleAddAnyway = () => {
    setOpen(false);
    if (selectedPlaylistId) {
      addTrackToPlaylistAPI(selectedPlaylistId);
    }
  };

  useEffect(() => {
    if (currentPlayback) {
      setIsShuffled(currentPlayback.shuffle_state);
      setRepeatMode(currentPlayback.repeat_state);
    }
  }, [currentPlayback]);

  const toggleShuffle = async () => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${!isShuffled}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setIsShuffled(!isShuffled);
        fetchCurrentPlayback();
      } else {
        console.error("Error toggling shuffle:", response.status);
      }
    } catch (error) {
      console.error("Error toggling shuffle:", error);
    }
  };

  const toggleRepeat = async () => {
    const nextMode =
      repeatMode === "off"
        ? "context"
        : repeatMode === "context"
        ? "track"
        : "off";
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${nextMode}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setRepeatMode(nextMode);
        fetchCurrentPlayback();
      } else {
        console.error("Error toggling repeat:", response.status);
      }
    } catch (error) {
      console.error("Error toggling repeat:", error);
    }
  };

  const trackName =
    currentPlayback && currentPlayback.item
      ? currentPlayback.item.type === "episode"
        ? currentPlayback.item.name
        : currentPlayback.item.name || "Not Playing"
      : "Not Playing";
  const artistName =
    currentPlayback && currentPlayback.item
      ? currentPlayback.item.type === "episode"
        ? currentPlayback.item.show.name
        : currentPlayback.item.artists.map((artist) => artist.name).join(", ")
      : "";
  const albumArt = currentPlayback?.item
    ? currentPlayback.item.type === "episode"
      ? currentPlayback.item.show.images[0]?.url
      : currentPlayback.item?.album?.images?.[0]?.url
    : "/images/not-playing.webp";
  const isPlaying = currentPlayback ? currentPlayback.is_playing : false;
  const progress =
    currentPlayback && currentPlayback.item
      ? (currentPlayback.progress_ms / currentPlayback.item.duration_ms) * 100
      : 0;

  useEffect(() => {
    if (trackNameRef.current && currentPlayback?.item?.name) {
      const trackNameWidth = trackNameRef.current.offsetWidth;
      const scrollDistance = Math.max(0, trackNameWidth - containerWidth);
      const scrollDuration = (scrollDistance / scrollSpeed) * 2;

      trackNameRef.current.style.setProperty(
        "--scroll-duration",
        `${scrollDuration}s`
      );
      trackNameRef.current.style.setProperty(
        "--final-position",
        `-${scrollDistance}px`
      );

      setShouldScroll(trackNameWidth > containerWidth);
    }
  }, [trackName, containerWidth]);

  const getTextStyles = (text) => {
    const { direction, script } = getTextDirection(text);

    const fontClasses = {
      arabic: "font-noto-naskh-ar",
      hebrew: "font-noto-sans-he",
    };

    return {
      className: `text-[40px] font-[580] tracking-tight transition-colors duration-1000 ease-in-out
        ${direction === "rtl" ? "text-right" : "text-left"}
        ${fontClasses[script] || ""}`,
    };
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-transparent z-30"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="flex flex-col gap-4 h-screen w-full z-10 fadeIn-animation">
        <div className="md:w-1/3 flex flex-row items-center px-12 pt-10">
          <div className="min-w-[280px] mr-8">
            <LongPressLink
              href={
                currentPlayback?.item?.type === "episode"
                  ? `/show/${currentPlayback.item.show.id}`
                  : `/album/${currentPlayback?.item?.album?.id}`
              }
              spotifyUrl={
                currentPlayback?.item?.type === "episode"
                  ? currentPlayback.item.show.external_urls?.spotify
                  : currentPlayback?.item?.album?.external_urls?.spotify
              }
              accessToken={accessToken}
            >
              <Image
                src={albumArt}
                alt={
                  currentPlayback?.item?.type === "episode"
                    ? "Podcast Cover"
                    : "Album Art"
                }
                width={280}
                height={280}
                priority
                className="aspect-square rounded-[12px] drop-shadow-xl"
              />
            </LongPressLink>
          </div>
          {!showLyrics || !currentPlayback?.item ? (
            <div className="flex-1 text-center md:text-left">
              <LongPressLink
                href={
                  currentPlayback?.item?.type === "episode"
                    ? `/show/${currentPlayback.item.show.id}`
                    : `/album/${currentPlayback?.item?.album?.id}`
                }
                spotifyUrl={
                  currentPlayback?.item?.type === "episode"
                    ? currentPlayback.item.show.external_urls?.spotify
                    : currentPlayback?.item?.album?.external_urls?.spotify
                }
                accessToken={accessToken}
              >
                {trackNameScrollingEnabled ? (
                  <div className="track-name-container">
                    <h4
                      ref={trackNameRef}
                      key={currentPlayback?.item?.id || "not-playing"}
                      className={`track-name text-[40px] font-[580] text-white tracking-tight whitespace-nowrap ${
                        trackNameScrollingEnabled && shouldScroll
                          ? "animate-scroll"
                          : ""
                      }`}
                    >
                      {trackName}
                    </h4>
                  </div>
                ) : (
                  <h4 className="text-[40px] font-[580] text-white truncate tracking-tight max-w-[400px]">
                    {trackName}
                  </h4>
                )}
              </LongPressLink>
              <LongPressLink
                href={
                  currentPlayback?.item?.type === "episode"
                    ? `/show/${currentPlayback.item.show.id}`
                    : `/artist/${currentPlayback?.item?.artists[0]?.id}`
                }
                spotifyUrl={
                  currentPlayback?.item?.type === "episode"
                    ? currentPlayback.item.show.external_urls?.spotify
                    : currentPlayback?.item?.artists[0]?.external_urls?.spotify
                }
                accessToken={accessToken}
              >
                <h4 className="text-[36px] font-[560] text-white/60 truncate tracking-tight max-w-[380px]">
                  {currentPlayback?.item?.type === "episode"
                    ? currentPlayback.item.show.name
                    : artistName}
                </h4>
              </LongPressLink>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-[280px]">
              <div
                className="flex-1 text-left overflow-y-auto h-[280px] w-[380px]"
                ref={lyricsContainerRef}
              >
                {isLoadingLyrics ? (
                  <p className="text-white text-[40px] font-[580] tracking-tight transition-colors duration-300">
                    Loading lyrics...
                  </p>
                ) : parsedLyrics.length > 0 ? (
                  parsedLyrics.map((lyric, index) => {
                    const { className } = getTextStyles(lyric.text);

                    const conditionalClass =
                      index === currentLyricIndex
                        ? "text-white"
                        : index === currentLyricIndex - 1
                        ? "text-white/40"
                        : index === currentLyricIndex + 1
                        ? "text-white/40"
                        : "text-white/40";

                    return (
                      <p
                        key={index}
                        className={`${className} ${conditionalClass}`}
                      >
                        {lyric.text}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-white text-[40px] font-[580] tracking-tight transition-colors duration-300">
                    Lyrics not available
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-full px-12 overflow-hidden">
          <div className="w-full bg-white/20 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="progress-bar bg-white h-2"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between items-center w-full px-12 mt-4">
          <div className="flex-shrink-0" onClick={toggleLikeTrack}>
            {isLiked ? (
              <HeartIconFilled className="w-14 h-14" />
            ) : (
              <HeartIcon className="w-14 h-14" />
            )}
          </div>

          <div className="flex justify-center gap-12 flex-1">
            <div onClick={skipToPrevious}>
              <BackIcon className="w-14 h-14" />
            </div>
            <div>
              <div onClick={togglePlayPause}>
                <PlayPauseButton />
              </div>
            </div>
            <div onClick={skipToNext}>
              <ForwardIcon className="w-14 h-14" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <MenuButton>
                  <MenuIcon className="w-14 h-14 fill-white/60" />
                </MenuButton>
              </div>

              <MenuItems
                transition
                className="absolute right-0 bottom-full z-10 mb-2 w-[22rem] origin-bottom-right divide-y divide-slate-100/25 bg-[#161616] rounded-[13px] shadow-xl transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
              >
                <div className="py-1">
                  <DrawerTrigger onClick={() => setDrawerOpen(true)}>
                    <MenuItem>
                      <div className="group flex items-center justify-between px-4 py-[16px] text-sm text-white font-[560] tracking-tight">
                        <span className="text-[28px]">Add to a Playlist</span>
                        <PlaylistAddIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white/60"
                        />
                      </div>
                    </MenuItem>
                  </DrawerTrigger>
                </div>
                <div className="py-1">
                  <Link
                    href={`/album/${currentPlayback?.item?.album?.id}?accessToken=${accessToken}`}
                  >
                    <MenuItem>
                      <div className="group flex items-center justify-between px-4 py-[16px] text-sm text-white font-[560] tracking-tight">
                        <span className="text-[28px]">Go to Album</span>
                        <GoToAlbumIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white/60"
                        />
                      </div>
                    </MenuItem>
                  </Link>
                </div>
                <div className="py-1">
                  <MenuItem onClick={toggleRepeat}>
                    <div className="group flex items-center justify-between px-4 py-[16px] text-sm text-white font-[560] tracking-tight">
                      <span className="text-[28px]">
                        {repeatMode === "off"
                          ? "Enable Repeat"
                          : repeatMode === "context"
                          ? "Enable Repeat One"
                          : "Disable Repeat"}
                      </span>
                      {repeatMode === "off" ? (
                        <RepeatIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white/60"
                        />
                      ) : repeatMode === "context" ? (
                        <RepeatIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white"
                        />
                      ) : (
                        <RepeatOneIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white"
                        />
                      )}
                    </div>
                  </MenuItem>
                </div>
                <div className="py-1">
                  <MenuItem onClick={toggleShuffle}>
                    <div className="group flex items-center justify-between px-4 py-[16px] text-sm text-white font-[560] tracking-tight">
                      <span className="text-[28px]">
                        {isShuffled ? "Disable Shuffle" : "Enable Shuffle"}
                      </span>
                      {isShuffled ? (
                        <ShuffleIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white"
                        />
                      ) : (
                        <ShuffleIcon
                          aria-hidden="true"
                          className="h-8 w-8 text-white/60"
                        />
                      )}
                    </div>
                  </MenuItem>
                </div>
                {lyricsMenuOptionEnabled ? (
                  <div className="py-1">
                    <MenuItem onClick={handleToggleLyrics}>
                      <div className="group flex items-center justify-between px-4 py-[16px] text-sm text-white font-[560] tracking-tight">
                        <span className="text-[28px]">
                          {showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                        </span>
                        {showLyrics ? (
                          <LyricsIcon
                            aria-hidden="true"
                            className="h-8 w-8 text-white"
                          />
                        ) : (
                          <LyricsIcon
                            aria-hidden="true"
                            className="h-8 w-8 text-white/60"
                          />
                        )}
                      </div>
                    </MenuItem>
                  </div>
                ) : null}
              </MenuItems>
            </Menu>
          </div>
        </div>
        <div
          className={classNames(
            "fixed right-0 top-[70px] transform transition-opacity duration-300",
            {
              "opacity-0 volumeOutScale": !isVolumeVisible,
              "opacity-100 volumeInScale": isVolumeVisible,
            }
          )}
        >
          <div className="w-14 h-44 bg-slate-700/60 rounded-[17px] flex flex-col-reverse drop-shadow-xl overflow-hidden">
            <div
              className={classNames(
                "bg-white w-full transition-height duration-300",
                {
                  "rounded-b-[13px]": volume < 100,
                  "rounded-[13px]": volume === 100,
                }
              )}
              style={{ height: `${volume ?? 100}%` }}
            >
              <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center h-6 pb-7">
                {volume === 0 && <VolumeOffIcon className="w-7 h-7" />}
                {volume > 0 && volume <= 60 && (
                  <VolumeLowIcon className="w-7 h-7 ml-1.5" />
                )}
                {volume > 60 && <VolumeLoudIcon className="w-7 h-7" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <DrawerContent>
          <div className="mx-auto flex pl-8 pr-4 overflow-x-scroll scroll-container">
            {playlists.map((item) => (
              <div key={item.id} className="min-w-[280px] mr-10 mb-4">
                <LongPressLink
                  href={`/playlist/${item.id}`}
                  spotifyUrl={item?.external_urls?.spotify}
                  accessToken={accessToken}
                >
                  <div
                    onClick={async (e) => {
                      e.preventDefault();
                      await addTrackToPlaylist(item.id);
                      setDrawerOpen(false);
                    }}
                  >
                    <Image
                      src={item?.images?.[0]?.url || "/images/not-playing.webp"}
                      alt="Playlist Art"
                      width={280}
                      height={280}
                      className="mt-8 aspect-square rounded-[12px] drop-shadow-xl"
                    />
                    <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                      {item.name}
                    </h4>
                  </div>
                </LongPressLink>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={open} onClose={setOpen} className="relative z-40">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/10 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
        />

        <div className="fixed inset-0 z-40 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-[17px] bg-black/30 backdrop-blur-xl px-0 pb-0 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-[36rem] data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
            >
              <div>
                <div className="text-center">
                  <DialogTitle
                    as="h3"
                    className="text-[36px] font-[560] tracking-tight text-white font-sans"
                  >
                    Already Added
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-[28px] font-[560] tracking-tight text-white/60">
                      This track is already in the playlist.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-0 border-t border-slate-100/25">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full justify-center px-3 py-3 text-[28px] font-[560] tracking-tight text-[#6c8bd5] shadow-sm sm:col-start-2"
                >
                  Don't Add
                </button>
                <button
                  type="button"
                  data-autofocus
                  onClick={handleAddAnyway}
                  className="mt-3 inline-flex w-full justify-center px-3 py-3 text-[28px] font-[560] tracking-tight text-[#fe3b30] shadow-sm sm:col-start-1 sm:mt-0 border-r border-slate-100/25"
                >
                  Add Anyway
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default NowPlaying;
