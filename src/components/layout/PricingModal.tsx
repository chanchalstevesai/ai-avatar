
import React, { useState } from 'react';
import { Check, X, Shield, Zap, Star, Loader2 } from 'lucide-react';
import paymentService from '../../services/paymentService';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isClosable?: boolean;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, isClosable = true }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePayment = async (planId: string, amount: number) => {
    try {
      setLoading(planId);
      setError(null);
      const userId = `user_12345`; // Or however you want to identify the user here

      // 1. Send the request
      const response = await paymentService.initiatePayment(userId, amount);

      // 2. LOG THE RESPONSE TO SEE WHAT IT ACTUALLY CONTAINS
      console.log("BACKEND RESPONSE:", response);

      // 3. Check if the URL exists and redirect
      if (response.pay_url) {
        window.location.href = response.pay_url;
      } else {
        setError("Error: Backend did not return a payment URL. Check console.");
      }
    } catch (err) {
      console.error("Payment failed:", err);
      setError("Failed to initiate payment. Please try again.");
    } finally {
      setLoading(null);
    }
  };


  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 499,
      features: ['10 AI Avatars', 'Standard Voice', '720p Export', 'Community Support'],
      icon: <Zap className="w-6 h-6 text-blue-400" />,
      recommended: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 999,
      features: ['Unlimited AI Avatars', 'Premium Neural Voices', '4K Ultra HD Export', 'Priority Support', 'Custom Backgrounds'],
      icon: <Star className="w-6 h-6 text-amber-400" />,
      recommended: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 2499,
      features: ['Everything in Pro', 'Custom AI Training', 'API Access', 'Dedicated Manager', 'White-label Solution'],
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      recommended: false,
    }
  ];

  return (
    // Fixed: Allow scrolling on the overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Fixed: Removed overflow-hidden, added my-auto for vertical centering */}
      <div className="relative w-full max-w-5xl bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl my-auto">
        {/* Close Button */}
        {isClosable && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/5 z-10"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="p-8 md:p-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Upgrade Your Experience</h2>
            <p className="text-white/60 text-lg">Choose the perfect plan for your AI Avatar journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${plan.recommended
                  ? 'bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-blue-500/50 md:scale-105 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full tracking-wider uppercase whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <div className="p-3 w-fit rounded-xl bg-white/5 mb-4">
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-4xl font-bold text-white">₹{plan.price}</span>
                    <span className="ml-1 text-white/40">/month</span>
                  </div>
                </div>

                <ul className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-white/70 text-sm">
                      <Check className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePayment(plan.id, plan.price)}
                  disabled={!!loading}
                  className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${plan.recommended
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                    : 'bg-white text-black hover:bg-white/90'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Get Started</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;