
import { useState, useRef, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import AvatarPlayer from "./components/avatar/AvatarPlayer";
import useChatAudio from "./hooks/useChatAudio";
import Header from "./components/layout/Header";
import InputArea from "./components/chat/InputArea";
import ChatOverlay from "./components/chat/ChatOverlay";
import POSPaymentGate from "./components/payment/POSPaymentGate";
import SessionTimer from "./components/payment/SessionTimer";
import PaymentStatus from "./components/payment/PaymentStatus";
import paymentService from "./services/paymentService";

type SessionState = 'idle' | 'active' | 'expired';

function ChatApp() {
  const [input, setInput] = useState<string>("");
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionDuration, setSessionDuration] = useState(60);
  const location = useLocation();
  
  const { 
    sendMessage, 
    isTalking, 
    volumeRef, 
    replyText, 
    isLoading, 
    visemesRef, 
    audioStartTimeRef, 
    audioContextRef 
  } = useChatAudio();

  const inputRef = useRef<HTMLInputElement>(null);

  // Check subscription status on mount (handles returning from payment)
  useEffect(() => {
    // If we just navigated from a successful payment, instantly activate
    if (location.state?.paymentSuccessful) {
      setSessionDuration(60);
      setSessionState('active');
      setShowPaymentGate(false);
      // Clear state so a reload doesn't falsely keep it active indefinitely
      window.history.replaceState({}, document.title);
      return;
    }

    const checkSubscription = async () => {
      try {
        const status = await paymentService.getSubscriptionStatus();
        const hasAccess = status.has_access ?? status.hasAccess;
        const secondsRemaining = status.seconds_remaining ?? status.secondsRemaining;
        
        if (hasAccess && secondsRemaining > 0) {
          setSessionDuration(secondsRemaining);
          setSessionState('active');
          setShowPaymentGate(false);
        }
      } catch (error) {
        console.log('No active subscription');
      }
    };

    checkSubscription();
  }, [location.state]);

  // Called when countdown timer hits zero
  const handleSessionExpire = useCallback(() => {
    setSessionState('expired');
    setShowPaymentGate(true);
  }, []);

  const handleSpeak = (message?: string) => {
    const textToSend = message || input.trim();
    if (!textToSend || isLoading) return;

    // POS gate: block message if session is not active
    if (sessionState !== 'active') {
      setShowPaymentGate(true);
      return;
    }
    
    console.log("Sending message:", textToSend, "Type:", message ? "voice" : "typed");
    
    sendMessage(textToSend);
    
    if (!message) {
      setInput("");
      console.log("Input cleared for typed message");
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#050505] overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <Header onUpgradeClick={() => setShowPaymentGate(true)} />

      {/* Session Timer */}
      <SessionTimer
        durationSeconds={sessionDuration}
        onExpire={handleSessionExpire}
        isActive={sessionState === 'active'}
      />

      {/* Main Avatar View */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-none">
        <div className="w-full h-full">
          <AvatarPlayer
            isTalking={isTalking}
            volumeRef={volumeRef}
            visemesRef={visemesRef}
            audioStartTimeRef={audioStartTimeRef}
            audioContextRef={audioContextRef}
          />
        </div>

        <ChatOverlay 
          replyText={replyText} 
          isLoading={isLoading} 
        />
      </div>

      <InputArea 
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSpeak}
        inputRef={inputRef}
      />

      <POSPaymentGate 
        isOpen={showPaymentGate} 
        onClose={() => setShowPaymentGate(false)} 
        isClosable={sessionState === 'active'}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/payment/status" element={<PaymentStatus />} />
        <Route path="/payment-return" element={<PaymentStatus />} />
      </Routes>
    </BrowserRouter>
  );
}