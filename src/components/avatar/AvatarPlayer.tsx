import { Avatar } from "@readyplayerme/visage";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { useLipSync } from "../../hooks/avatar/useLipSync";
import type { AvatarProps, LipSyncProps } from "../../types/avatar";
import { DEFAULT_AVATAR_URL } from "../../constants/config";

const LipSyncSystem = (props: LipSyncProps) => {
  useLipSync(props);
  return null;
};

const AvatarPlayer = ({ 
  isTalking, 
  volumeRef, 
  visemesRef, 
  audioStartTimeRef, 
  audioContextRef 
}: AvatarProps) => {
  const [headMesh, setHeadMesh] = useState<THREE.Mesh | null>(null);
  const [teethMesh, setTeethMesh] = useState<THREE.Mesh | null>(null);

  const handleMesh = (mesh: THREE.Object3D) => {
    if (mesh instanceof THREE.Mesh) {
      if (mesh.name.includes("Head")) setHeadMesh(mesh);
      if (mesh.name.includes("Teeth")) setTeethMesh(mesh);
    }
  };

  useEffect(() => {
    if (headMesh?.morphTargetDictionary) {
      console.log("Available morph targets:", Object.keys(headMesh.morphTargetDictionary).slice(0, 10), "...");
    }
  }, [headMesh]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse-slow" />
      <div className="relative z-10 w-full h-full">
        <Avatar
          modelSrc={DEFAULT_AVATAR_URL}
          className="w-full h-full"
          cameraInitialDistance={2.2}
          cameraTarget={1.55}
          meshCallback={handleMesh}
          headMovement={true}
          idleRotation={true}
        >
          <LipSyncSystem
            visemesRef={visemesRef}
            audioStartTimeRef={audioStartTimeRef}
            audioContextRef={audioContextRef}
            volumeRef={volumeRef}
            isTalking={isTalking}
            headMesh={headMesh}
            teethMesh={teethMesh}
          />
        </Avatar>
      </div>
    </div>
  );
};

export default AvatarPlayer;
