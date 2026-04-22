import {type MorphWeights } from "../types/avatar";

export const VISEME_TO_MORPH_MAP: Record<string, Partial<MorphWeights>> = {
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

export const DEFAULT_WEIGHTS: MorphWeights = {
  jawOpen: 0,
  mouthOpen: 0,
  lipsStretch: 0,
  mouthSmile: 0,
  tongueOut: 0,
};
