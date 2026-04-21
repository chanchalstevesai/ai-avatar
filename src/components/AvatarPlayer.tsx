// AvatarPlayer.tsx
import { Avatar } from "@readyplayerme/visage";
import { useEffect, useRef } from "react";

interface Props {
  audioUrl: string | null;
}

const AvatarPlayer = ({ audioUrl }: Props) => {
  const playedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (audioUrl && audioUrl !== playedUrlRef.current) {
      console.log("Playing new audio:", audioUrl);
      playedUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      const avatarElement = document.querySelector('visage-avatar') as HTMLElement & { playAudio?: (url: string) => void };

      if (avatarElement?.playAudio) {
        avatarElement.playAudio(audioUrl);
      }

      audio.play().catch(err => console.warn("Audio playback failed:", err));

      return () => {
        audio.pause();
      };
    }
  }, [audioUrl]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse-slow" />
      <div className="relative z-10 w-full h-full">
        <Avatar
          key={audioUrl ?? "default"}
          modelSrc="https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female.glb"
          className="w-full h-full"
          cameraInitialDistance={1.8}
          cameraTarget={1.5}
        />
      </div>
    </div>
  );
};

export default AvatarPlayer;