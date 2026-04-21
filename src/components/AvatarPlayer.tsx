import { Avatar } from "@readyplayerme/visage";

interface Props {
  audioUrl: string | null;
}

const AvatarPlayer = ({ audioUrl }: Props) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background radial glow */}
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse-slow" />
      
      <div className="relative z-10 w-full h-full">
        <Avatar
          {...({
            modelSrc: "https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female.glb",
            audioSrc: audioUrl ?? undefined,
            autoPlay: true,
            className: "w-full h-full",
            cameraInitialDistance: 1.8,
            cameraTarget: 1.5,
          } as any)}
        />    
      </div>
    </div>
  );
};

export default AvatarPlayer;