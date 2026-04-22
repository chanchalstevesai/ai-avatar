




// export default AvatarPlayer;
import { Avatar } from "@readyplayerme/visage";
import { useEffect, useRef, useState } from "react";
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


// CORRECTED: Match your avatar's actual morph target names
const VISEME_TO_MORPH_MAP: Record<string, Partial<MorphWeights>> = {
  "sil": { jawOpen: 0, mouthOpen: 0, lipsStretch: 0, mouthSmile: 0 },
  "PP": { jawOpen: 0.25, mouthOpen: 0.15, lipsStretch: 0.05 },  // P, B, M
  "FF": { jawOpen: 0.15, mouthOpen: 0.25, lipsStretch: 0.1 },   // F, V
  "TH": { jawOpen: 0.2, mouthOpen: 0.2, lipsStretch: 0.05 },    // TH
  "DD": { jawOpen: 0.3, mouthOpen: 0.25, lipsStretch: 0.05 },   // D, T, N
  "kk": { jawOpen: 0.4, mouthOpen: 0.35, lipsStretch: 0.05 },   // K, G
  "SS": { jawOpen: 0.1, mouthOpen: 0.15, lipsStretch: 0.45, mouthSmile: 0.1 }, // S, Z
  "CH": { jawOpen: 0.35, mouthOpen: 0.3, lipsStretch: 0.2 },    // CH, J, SH
  "RR": { jawOpen: 0.25, mouthOpen: 0.2, lipsStretch: 0.15 },   // R
  "aa": { jawOpen: 0.9, mouthOpen: 0.7, lipsStretch: 0.05 },    // AA (wide open)
  "E": { jawOpen: 0.6, mouthOpen: 0.5, lipsStretch: 0.25 },     // EH
  "I": { jawOpen: 0.35, mouthOpen: 0.25, lipsStretch: 0.55, mouthSmile: 0.25 }, // IH/IY
  "O": { jawOpen: 0.6, mouthOpen: 0.55, lipsStretch: 0.1 },     // OH/OW
  "U": { jawOpen: 0.35, mouthOpen: 0.3, lipsStretch: 0.05 },    // UH/UW
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

  // Debug: Log available morph targets
  useEffect(() => {
    if (headMesh?.morphTargetDictionary) {
      console.log("🎨 Available morph targets:", Object.keys(headMesh.morphTargetDictionary));
      console.log("🎨 Sample of first 10:", Object.keys(headMesh.morphTargetDictionary).slice(0, 10));
    }
  }, [headMesh]);
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
  const smoothVolumeRef = useRef(0);
  const lastVisemeRef = useRef<string>("");
  const mappingTestedRef = useRef(false);


  // Helper function to get morph index with corrected naming (viewer_ prefix)
  const getMorphIndex = (mesh: THREE.Mesh, morphName: string): number | undefined => {
    if (!mesh.morphTargetDictionary) return undefined;

    // Try exact match first
    let index = mesh.morphTargetDictionary[morphName];
    if (index !== undefined) return index;

    // Try viseme_ prefix (your avatar's naming)
    if (morphName !== 'jawOpen' && morphName !== 'mouthOpen' && morphName !== 'mouthSmile') {
      const visemeName = `viseme_${morphName}`;
      index = mesh.morphTargetDictionary[visemeName];
      if (index !== undefined) return index;
    }

    // For special case 'sil'
    if (morphName === 'sil') {
      index = mesh.morphTargetDictionary['viseme_sil'];
      if (index !== undefined) return index;
    }

    // For jaw/mouth controls (these don't have viseme_ prefix)
    if (morphName === 'jawOpen') {
      index = mesh.morphTargetDictionary['jawOpen'];
      if (index !== undefined) return index;
    }

    return undefined;
  };

  useFrame(() => {
    if (!headMesh) return;

    if (!mappingTestedRef.current) {
      console.log("🔍 Running mapping test...");
      const testMorphs = ['jawOpen', 'mouthOpen', 'sil', 'PP', 'aa'];
      testMorphs.forEach(name => {
        let idx = headMesh.morphTargetDictionary?.[name];
        if (idx === undefined) idx = headMesh.morphTargetDictionary?.[`viewer_${name}`];
        if (idx === undefined && name === 'sil') idx = headMesh.morphTargetDictionary?.['viewer_sil'];
        if (idx === undefined && name === 'DD') idx = headMesh.morphTargetDictionary?.['viewseme_DD'];

        console.log(`🔍 Mapping test: "${name}" → index: ${idx !== undefined ? idx : 'NOT FOUND'}`);
      });
      mappingTestedRef.current = true;
    }

    const visemes = visemesRef.current;
    const audioContext = audioContextRef.current;
    const audioStartTime = audioStartTimeRef.current;

    const targetWeights: MorphWeights = { ...DEFAULT_WEIGHTS };

    // Use viseme data if available
    if (isTalking && visemes.length > 0 && audioContext && audioStartTime > 0) {
      const elapsed = audioContext.currentTime - audioStartTime;

      // Log every 30 frames to see timing
      if (Math.random() < 0.03) {
        const nextViseme = visemes.find(v => v.time > elapsed);
        console.log(`⏱️ Audio time: ${elapsed.toFixed(3)}s, Next viseme: ${nextViseme?.viseme} at ${nextViseme?.time}s`);
      }

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

        if (lastVisemeRef.current !== currentViseme.viseme) {
          console.log(`🎤 Viseme: ${currentViseme.viseme} at ${elapsed.toFixed(3)}s`);
          lastVisemeRef.current = currentViseme.viseme;
        }

        const weights = VISEME_TO_MORPH_MAP[currentViseme.viseme] ?? VISEME_TO_MORPH_MAP["sil"];

        (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach((key) => {
          targetWeights[key] = weights[key] ?? 0;
        });

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
    }
    // Volume-based fallback
    else if (isTalking) {
      const volume = volumeRef.current;
      let intensity = Math.min(volume * 2.5, 1);
      const naturalVariation = 0.85 + Math.random() * 0.3;
      intensity = intensity * naturalVariation;
      smoothVolumeRef.current = smoothVolumeRef.current * 0.7 + intensity * 0.3;
      const finalIntensity = smoothVolumeRef.current;

      targetWeights.jawOpen = finalIntensity * 0.7;
      targetWeights.mouthOpen = finalIntensity * 0.5;
      targetWeights.lipsStretch = finalIntensity * 0.2;

      if (Math.random() < 0.02) {
        targetWeights.mouthSmile = 0.3;
      }
    }

    // Apply morph targets with corrected naming
    (Object.keys(targetWeights) as Array<keyof MorphWeights>).forEach((morphName) => {
      const targetValue = targetWeights[morphName];
      const morphIndex = getMorphIndex(headMesh, morphName);

      if (morphIndex !== undefined && headMesh.morphTargetInfluences) {
        const currentValue = headMesh.morphTargetInfluences[morphIndex] ?? 0;
        const lerpSpeed = visemes.length > 0 ? 0.6 : 0.4;
        headMesh.morphTargetInfluences[morphIndex] = THREE.MathUtils.lerp(
          currentValue,
          targetValue,
          lerpSpeed
        );
      }
    });

    // Sync teeth to jaw
    if (teethMesh) {
      const jawIndex = getMorphIndex(headMesh, 'jawOpen');
      const teethJawIndex = teethMesh.morphTargetDictionary?.['jawOpen'];
      if (jawIndex !== undefined && teethJawIndex !== undefined &&
        headMesh.morphTargetInfluences && teethMesh.morphTargetInfluences) {
        teethMesh.morphTargetInfluences[teethJawIndex] = headMesh.morphTargetInfluences[jawIndex];
      }
    }
  });

  return null;
};

export default AvatarPlayer;
