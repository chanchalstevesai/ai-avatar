import * as THREE from "three";

export interface MorphWeights {
  jawOpen: number;
  mouthOpen: number;
  lipsStretch: number;
  mouthSmile: number;
  tongueOut: number;
}

export interface AvatarProps {
  isTalking: boolean;
  volumeRef: React.MutableRefObject<number>;
  visemesRef: React.MutableRefObject<any[]>;
  audioStartTimeRef: React.MutableRefObject<number>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
}

export interface LipSyncProps extends AvatarProps {
  headMesh: THREE.Mesh | null;
  teethMesh: THREE.Mesh | null;
}
