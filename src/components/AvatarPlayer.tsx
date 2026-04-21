import { Avatar } from "@readyplayerme/visage";
import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  isTalking: boolean;
  volumeRef: React.MutableRefObject<number>;
  visemesRef: React.MutableRefObject<any[]>;
  audioStartTimeRef: React.MutableRefObject<number>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
}

// Define the morph target weights type
interface MorphWeights {
  jawOpen: number;
  mouthOpen: number;
  lipsStretch: number;
  mouthSmile: number;
  tongueOut: number;
}

// Map backend visemes to actual morph target weights
const VISEME_TO_MORPH_MAP: Record<string, Partial<MorphWeights>> = {
  "sil": { jawOpen: 0, mouthOpen: 0, lipsStretch: 0, mouthSmile: 0 },
  "PP": { jawOpen: 0.1, mouthOpen: 0.1, lipsStretch: 0.1 },
  "FF": { jawOpen: 0.2, mouthOpen: 0.2, lipsStretch: 0.1 },
  "TH": { jawOpen: 0.3, mouthOpen: 0.3, lipsStretch: 0.1 },
  "DD": { jawOpen: 0.2, mouthOpen: 0.2, lipsStretch: 0.1 },
  "kk": { jawOpen: 0.3, mouthOpen: 0.3, lipsStretch: 0.1 },
  "SS": { jawOpen: 0.1, mouthOpen: 0.2, lipsStretch: 0.4, mouthSmile: 0.1 },
  "CH": { jawOpen: 0.3, mouthOpen: 0.3, lipsStretch: 0.2 },
  "RR": { jawOpen: 0.2, mouthOpen: 0.2, lipsStretch: 0.2 },
  "aa": { jawOpen: 0.8, mouthOpen: 0.6, lipsStretch: 0.1 },
  "E": { jawOpen: 0.5, mouthOpen: 0.4, lipsStretch: 0.2 },
  "I": { jawOpen: 0.3, mouthOpen: 0.2, lipsStretch: 0.5, mouthSmile: 0.2 },
  "O": { jawOpen: 0.5, mouthOpen: 0.4, lipsStretch: 0.2 },
  "U": { jawOpen: 0.3, mouthOpen: 0.2, lipsStretch: 0.4 },
};

const DEFAULT_WEIGHTS: MorphWeights = {
  jawOpen: 0,
  mouthOpen: 0,
  lipsStretch: 0,
  mouthSmile: 0,
  tongueOut: 0
};

const AvatarPlayer = ({ isTalking, volumeRef, visemesRef, audioStartTimeRef, audioContextRef }: Props) => {
  const [headMesh, setHeadMesh] = useState<THREE.Mesh | null>(null);
  const [teethMesh, setTeethMesh] = useState<THREE.Mesh | null>(null);

  const handleMesh = (mesh: THREE.Object3D) => {
    if (mesh instanceof THREE.Mesh) {
      if (mesh.name.includes("Head")) setHeadMesh(mesh);
      if (mesh.name.includes("Teeth")) setTeethMesh(mesh);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse-slow" />
      <div className="relative z-10 w-full h-full">
        <Avatar
          modelSrc="https://readyplayerme-assets.s3.amazonaws.com/animations/visage/female.glb"
          className="w-full h-full"
          cameraInitialDistance={2.2}
          cameraTarget={1.55}
          meshCallback={handleMesh}
          headMovement={true}
          idleRotation={true}
        >
          <LipSyncViseme 
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

const LipSyncViseme = ({ 
  visemesRef, 
  audioStartTimeRef, 
  audioContextRef,
  volumeRef, 
  isTalking, 
  headMesh, 
  teethMesh 
}: { 
  visemesRef: React.MutableRefObject<any[]>,
  audioStartTimeRef: React.MutableRefObject<number>,
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  volumeRef: React.MutableRefObject<number>, 
  isTalking: boolean, 
  headMesh: THREE.Mesh | null, 
  teethMesh: THREE.Mesh | null 
}) => {
  
  useFrame(() => {
    if (!headMesh) return;

    const visemes = visemesRef.current;
    const audioContext = audioContextRef.current;
    const audioStartTime = audioStartTimeRef.current;

    // Initialize all morph targets to 0
    const targetWeights: MorphWeights = { ...DEFAULT_WEIGHTS };

    // Use viseme data if available
    if (isTalking && visemes.length > 0 && audioContext && audioStartTime > 0) {
      const elapsed = audioContext.currentTime - audioStartTime;
      
      let currentViseme = null;
      let nextViseme = null;
      
      for (let i = 0; i < visemes.length; i++) {
        if (visemes[i].time <= elapsed) {
          currentViseme = visemes[i];
          if (i + 1 < visemes.length) {
            nextViseme = visemes[i + 1];
          }
        } else {
          break;
        }
      }
      
      if (currentViseme) {
        const weights = VISEME_TO_MORPH_MAP[currentViseme.viseme] || VISEME_TO_MORPH_MAP["sil"];
        const intensity = currentViseme.value || 1.0;
        
        // Apply weights with proper typing
        (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach(key => {
          targetWeights[key] = (weights[key] || 0) * intensity;
        });
        
        // Blend with next viseme
        if (nextViseme && nextViseme.time) {
          const blendFactor = (elapsed - currentViseme.time) / (nextViseme.time - currentViseme.time);
          if (blendFactor > 0 && blendFactor < 1) {
            const nextWeights = VISEME_TO_MORPH_MAP[nextViseme.viseme] || VISEME_TO_MORPH_MAP["sil"];
            const nextIntensity = nextViseme.value || 1.0;
            
            (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach(key => {
              const nextValue = (nextWeights[key] || 0) * nextIntensity;
              targetWeights[key] = THREE.MathUtils.lerp(targetWeights[key], nextValue, blendFactor);
            });
          }
        }
      }
    }
    // Fallback to volume-based
    else if (isTalking) {
      const volume = volumeRef.current;
      const intensity = Math.min(volume * 2.5, 1);
      targetWeights.jawOpen = intensity * 0.6;
      targetWeights.mouthOpen = intensity * 0.4;
      targetWeights.lipsStretch = intensity * 0.2;
    }

    // Apply morph targets
    (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach((morphName) => {
      const targetValue = targetWeights[morphName];
      const morphIndex = headMesh.morphTargetDictionary?.[morphName];
      if (morphIndex !== undefined) {
        headMesh.morphTargetInfluences![morphIndex] = THREE.MathUtils.lerp(
          headMesh.morphTargetInfluences![morphIndex] || 0,
          targetValue,
          0.35
        );
      }
    });

    // Sync teeth
    if (teethMesh) {
      const jawIndex = headMesh.morphTargetDictionary?.["jawOpen"];
      const teethJawIndex = teethMesh.morphTargetDictionary?.["jawOpen"];
      if (jawIndex !== undefined && teethJawIndex !== undefined) {
        teethMesh.morphTargetInfluences![teethJawIndex] = headMesh.morphTargetInfluences![jawIndex];
      }
    }
  });

  return null;
}

export default AvatarPlayer;