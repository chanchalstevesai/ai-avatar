
// export default AvatarPlayer;
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

interface MorphWeights {
  jawOpen: number;
  mouthOpen: number;
  lipsStretch: number;
  mouthSmile: number;
  tongueOut: number;
}

// --- FIX 3: Deepgram viseme names map to these phoneme groups ---
// Deepgram sends standard ARPAbet/viseme IDs — adjust weights for more natural look
const VISEME_TO_MORPH_MAP: Record<string, Partial<MorphWeights>> = {
  "sil":  { jawOpen: 0,   mouthOpen: 0,   lipsStretch: 0,   mouthSmile: 0 },
  "PP":   { jawOpen: 0.15, mouthOpen: 0.05, lipsStretch: 0.05 },             // p, b, m
  "FF":   { jawOpen: 0.2,  mouthOpen: 0.15, lipsStretch: 0.1  },             // f, v
  "TH":   { jawOpen: 0.25, mouthOpen: 0.2,  lipsStretch: 0.05 },             // th
  "DD":   { jawOpen: 0.2,  mouthOpen: 0.2,  lipsStretch: 0.05 },             // d, t, n
  "kk":   { jawOpen: 0.35, mouthOpen: 0.3,  lipsStretch: 0.05 },             // k, g
  "SS":   { jawOpen: 0.1,  mouthOpen: 0.15, lipsStretch: 0.45, mouthSmile: 0.1 }, // s, z
  "CH":   { jawOpen: 0.3,  mouthOpen: 0.25, lipsStretch: 0.2  },             // ch, j, sh
  "RR":   { jawOpen: 0.25, mouthOpen: 0.2,  lipsStretch: 0.15 },             // r
  "aa":   { jawOpen: 0.85, mouthOpen: 0.65, lipsStretch: 0.05 },             // ah, aa (wide open)
  "E":    { jawOpen: 0.55, mouthOpen: 0.45, lipsStretch: 0.25 },             // eh, ae
  "I":    { jawOpen: 0.3,  mouthOpen: 0.2,  lipsStretch: 0.55, mouthSmile: 0.25 }, // ih, iy
  "O":    { jawOpen: 0.55, mouthOpen: 0.5,  lipsStretch: 0.1  },             // oh, ow (round)
  "U":    { jawOpen: 0.3,  mouthOpen: 0.25, lipsStretch: 0.05 },             // uh, uw (pursed)
};

const DEFAULT_WEIGHTS: MorphWeights = {
  jawOpen: 0,
  mouthOpen: 0,
  lipsStretch: 0,
  mouthSmile: 0,
  tongueOut: 0,
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
  teethMesh,
}: {
  visemesRef: React.MutableRefObject<any[]>;
  audioStartTimeRef: React.MutableRefObject<number>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  volumeRef: React.MutableRefObject<number>;
  isTalking: boolean;
  headMesh: THREE.Mesh | null;
  teethMesh: THREE.Mesh | null;
}) => {

  useFrame(() => {
    if (!headMesh) return;

    const visemes = visemesRef.current;
    const audioContext = audioContextRef.current;
    const audioStartTime = audioStartTimeRef.current;

    const targetWeights: MorphWeights = { ...DEFAULT_WEIGHTS };

    if (isTalking && visemes.length > 0 && audioContext && audioStartTime > 0) {
      // --- FIX 4: Correct elapsed time calculation ---
      // audioStartTimeRef is the AudioContext scheduled start time, so this is always accurate
      const elapsed = audioContext.currentTime - audioStartTime;

      let currentIdx = -1;

      for (let i = 0; i < visemes.length; i++) {
        if (visemes[i].time <= elapsed) {
          currentIdx = i;
        } else {
          break;
        }
      }

      if (currentIdx >= 0) {
        const currentViseme = visemes[currentIdx];
        const nextViseme = visemes[currentIdx + 1] || null;

        const weights = VISEME_TO_MORPH_MAP[currentViseme.viseme] ?? VISEME_TO_MORPH_MAP["sil"];

        // --- FIX 5: Deepgram value is already 0-1 amplitude, use directly (don't multiply) ---
        (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach((key) => {
          targetWeights[key] = weights[key] ?? 0;
        });

        // Smooth blend into next viseme
        if (nextViseme) {
          const duration = nextViseme.time - currentViseme.time;
          if (duration > 0) {
            const blendFactor = Math.min((elapsed - currentViseme.time) / duration, 1);
            const nextWeights = VISEME_TO_MORPH_MAP[nextViseme.viseme] ?? VISEME_TO_MORPH_MAP["sil"];

            (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach((key) => {
              const nextVal = nextWeights[key] ?? 0;
              targetWeights[key] = THREE.MathUtils.lerp(targetWeights[key], nextVal, blendFactor);
            });
          }
        }
      }
    } else if (isTalking) {
      // Fallback: volume-driven animation
      const volume = volumeRef.current;
      const intensity = Math.min(volume * 2.5, 1);
      targetWeights.jawOpen = intensity * 0.7;
      targetWeights.mouthOpen = intensity * 0.5;
      targetWeights.lipsStretch = intensity * 0.2;
    }

    // --- FIX 6: Faster lerp (0.6) for snappier, more natural mouth movement ---
    (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach((morphName) => {
      const targetValue = targetWeights[morphName];
      const morphIndex = headMesh.morphTargetDictionary?.[morphName];
      if (morphIndex !== undefined && headMesh.morphTargetInfluences) {
        headMesh.morphTargetInfluences[morphIndex] = THREE.MathUtils.lerp(
          headMesh.morphTargetInfluences[morphIndex] ?? 0,
          targetValue,
          0.6  // was 0.35 — higher = snappier mouth, more natural
        );
      }
    });

    // Sync teeth to jaw
    if (teethMesh) {
      const jawIndex = headMesh.morphTargetDictionary?.["jawOpen"];
      const teethJawIndex = teethMesh.morphTargetDictionary?.["jawOpen"];
      if (jawIndex !== undefined && teethJawIndex !== undefined && headMesh.morphTargetInfluences && teethMesh.morphTargetInfluences) {
        teethMesh.morphTargetInfluences[teethJawIndex] = headMesh.morphTargetInfluences[jawIndex];
      }
    }
  });

  return null;
};

export default AvatarPlayer;
