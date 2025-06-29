import { useEffect, useRef } from "react";
import Player from "video.js/dist/types/player";
import videojs from "video.js";
import "videojs-youtube";
import "video.js/dist/video-js.css";

export default function VideoJSPlayer({
  options,
  onReady,
}: {
  options: any;
  onReady: (player: Player) => void;
}) {
  const videoRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoRef.current?.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, options, () => {
        if (onReady) onReady(player);
      }));
    } else {
      const player = playerRef.current;
      player.width(options.width);
      player.height(options.height);
    }
  }, [options]);

  useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
}
