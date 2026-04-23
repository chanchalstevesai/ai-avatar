import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type{ MorphWeights, LipSyncProps } from "../../types/avatar";
import { VISEME_TO_MORPH_MAP, DEFAULT_WEIGHTS } from "../../constants/visemeMap";

export const useLipSync = ({
  visemesRef,
  audioStartTimeRef,
  audioContextRef,
  volumeRef,
  isTalking,
  headMesh,
  teethMesh,
}: LipSyncProps) => {
  const smoothVolumeRef = useRef(0);
  const lastVisemeRef = useRef<string>("");
  const mappingTestedRef = useRef(false);

  const getMorphIndex = (mesh: THREE.Mesh, morphName: string): number | undefined => {
    if (!mesh.morphTargetDictionary) return undefined;

    let index = mesh.morphTargetDictionary[morphName];
    if (index !== undefined) return index;

    if (morphName !== 'jawOpen' && morphName !== 'mouthOpen' && morphName !== 'mouthSmile') {
      const visemeName = `viseme_${morphName}`;
      index = mesh.morphTargetDictionary[visemeName];
      if (index !== undefined) return index;
    }

    if (morphName === 'sil') {
      index = mesh.morphTargetDictionary['viseme_sil'];
      if (index !== undefined) return index;
    }

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

    if (isTalking && visemes.length > 0 && audioContext && audioStartTime > 0) {
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

        if (lastVisemeRef.current !== currentViseme.viseme) {
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

    if (teethMesh) {
      const jawIndex = getMorphIndex(headMesh, 'jawOpen');
      const teethJawIndex = teethMesh.morphTargetDictionary?.['jawOpen'];
      if (jawIndex !== undefined && teethJawIndex !== undefined &&
        headMesh.morphTargetInfluences && teethMesh.morphTargetInfluences) {
        teethMesh.morphTargetInfluences[teethJawIndex] = headMesh.morphTargetInfluences[jawIndex];
      }
    }
  });
};
