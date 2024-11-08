export const fetchUserOwnedPlaylists = async (accessToken, handleError) => {
    try {
      const userResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!userResponse.ok) {
        handleError("FETCH_USER_PROFILE_ERROR", userResponse.status);
        return [];
      }
      const userData = await userResponse.json();
      const userId = userData.id;
  
      const playlistsResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (playlistsResponse.ok) {
        const data = await playlistsResponse.json();
        const userOwnedPlaylists = data.items.filter(playlist => playlist.owner.id === userId);
        
        if (userOwnedPlaylists.length > 0) {
          const imageUrl = userOwnedPlaylists[0].images[0]?.url;
          if (imageUrl) {
            localStorage.setItem("libraryImage", imageUrl);
          }
        }
        return userOwnedPlaylists;
      } else {
        handleError("FETCH_USER_PLAYLISTS_ERROR", playlistsResponse.status);
        return [];
      }
    } catch (error) {
      handleError("FETCH_USER_PLAYLISTS_ERROR", error.message);
      return [];
    }
  };