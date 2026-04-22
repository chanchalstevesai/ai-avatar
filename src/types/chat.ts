export interface Viseme {
  time: number;
  viseme: string;
  value: number;
}

export interface ChatAudioHook {
  sendMessage: (message: string) => void;
  replyText: string;
  isLoading: boolean;
  isTalking: boolean;
  volumeRef: React.MutableRefObject<number>;
  visemesRef: React.MutableRefObject<Viseme[]>;
  audioStartTimeRef: React.MutableRefObject<number>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  
   
}
