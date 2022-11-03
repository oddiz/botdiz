const parseTitleStrings = require("./parseTitleStrings");
import dotenv from "dotenv";
import { Track as ShoukakuTrack } from "shoukaku";
import {
    BotdizTrack,
    BotdizShoukakuTrack,
    QueueTrack,
    YoutubeRecommended,
} from "../modules/MusicPlayer/MusicControllerLavalink";
import { spotifyApiManager } from "../modules/SpotifyApiHandler";

//@ts-ignore
import ytdl from "ytdl-core";
import fetch from "node-fetch";

dotenv.config();

function isBotdizShoukakuTrack(track: QueueTrack): track is BotdizShoukakuTrack {
    return (track as BotdizShoukakuTrack).info.identifier !== undefined;
}
function isBotdizTrack(track: QueueTrack): track is BotdizTrack {
    return (
        (track as BotdizTrack).isSpotify !== undefined &&
        (track as BotdizTrack).info.artist !== undefined &&
        (track as BotdizTrack).info.title !== undefined
    );
}
export const getRecommended = async (queueItem: QueueTrack) => {
    try {
        if (isBotdizShoukakuTrack(queueItem)) {
            //song is from lavalink player

            const songUri = queueItem.info.uri;
            if (songUri) {
                const ytdlVideoInfo = await ytdl.getInfo(songUri);

                let track, artist;
                const videoTitle = ytdlVideoInfo.videoDetails?.title;

                const ytMediaInfo = ytdlVideoInfo.videoDetails?.media;
                if (ytMediaInfo && ytMediaInfo.category === "Music" && ytMediaInfo.song && ytMediaInfo.artist) {
                    track = ytMediaInfo.song;
                    artist = ytMediaInfo.artist;
                } else {
                    //try to parse the title
                    const result = parseTitleStrings(videoTitle);

                    if (result) {
                        if (result.title === result.artist) {
                            //couldn't parse the title correctly
                            track = null;
                            artist = null;
                        }
                        track = result.title;
                        artist = result.artist;
                    }
                }

                if (!(track && artist)) return null;

                const lastFmRecommendedSongs = await lastFmRecommend(track, artist);

                if (!lastFmRecommendedSongs || lastFmRecommendedSongs.length === 0) {
                    const recommendedYoutube = ytdlVideoInfo.related_videos;

                    const parsedForQueue: YoutubeRecommended[] = recommendedYoutube.map(
                        (video: { title?: any; thumbnails: { url: any }[] }) => {
                            return {
                                info: {
                                    title: video.title,
                                },
                                isYoutubeRecommended: true,
                                thumbnail: video.thumbnails[0].url,
                                recommendedSong: true,
                                isSpotify: false,
                            };
                        }
                    );

                    return parsedForQueue;
                }

                const parsedRecommended: BotdizTrack[] = lastFmRecommendedSongs.map((song) => {
                    return {
                        info: {
                            trackName: song.name,
                            artist: song.artist.name,
                            title: song.artist.name + " - " + song.name,
                        },
                        isSpotify: false,
                        recommendedSong: true,
                    };
                });

                return parsedRecommended;
            }

            return null;
        } else if (isBotdizTrack(queueItem) && queueItem.isSpotify) {
            //song is from spotify

            if (!(queueItem.info.trackId && queueItem.info.artistId)) return null;

            const recommended = await spotifyRecommend(queueItem.info.trackId, queueItem.info.artistId);

            if (!recommended) return null;

            const parsedRecommended: BotdizTrack[] = recommended.map((song) => {
                return {
                    info: {
                        trackId: song.id,
                        artistId: song.artists[0].id,
                        trackName: song.name,
                        artist: song.artists[0].name,
                        title: song.artists[0].name + " - " + song.name,
                    },
                    isSpotify: true,
                    recommendedSong: true,
                };
            });

            return parsedRecommended;
        } else {
            //if the song is from previous youtube recommended don't recommend anything
            return null;
        }
    } catch (error) {
        console.log("Error while trying to recommend song: " + error);

        return null;
    }
};

type LastFMSong = {
    name: string;
    match: number;
    url: string;
    duration: number;
    artist: {
        name: string;
        mbid: string;
        url: string;
    };
    image: {
        "#text": string;
        size: string;
    }[];
};
async function lastFmRecommend(trackName: string, artist: string) {
    const livefmApiKey = process.env.LIVEFM_API_KEY;

    const livefmRecommendedUrl = `http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(
        artist
    )}&track=${encodeURIComponent(trackName)}&autocorrect=1&api_key=${livefmApiKey}&format=json`;

    const result = await fetch(livefmRecommendedUrl).then((res) => res.json());

    try {
        const songs: LastFMSong[] = result.similartracks.track;

        return songs;
    } catch (error) {
        return null;
    }
}

async function spotifyRecommend(trackId: string, artistId: string) {
    const spotifyApi = await spotifyApiManager.getSpotifyApi();

    const recommendedReply = await spotifyApi.getRecommendations({
        seed_tracks: [trackId],
        seed_artists: [artistId],
        limit: 15,
    });

    try {
        const songs = recommendedReply.body.tracks;

        return songs;
    } catch (error) {
        return null;
    }
}
