
import React, { useState } from 'react';
import { X, Loader2, CreditCard, IndianRupee, Sparkles } from 'lucide-react';
import paymentService from '../../services/paymentService';

interface POSPaymentGateProps {
  isOpen: boolean;
  onClose: () => void;
  isClosable?: boolean;
}

const POSPaymentGate: React.FC<POSPaymentGateProps> = ({ isOpen, onClose, isClosable = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // const handlePayment = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     const userId = `kiosk_${Date.now()}`;
  //     const response = await paymentService.initiatePayment(userId, 10);

  //     if (response.paymentUrl) {
  //       window.location.href = response.paymentUrl;
  //     }
  //   } catch (err) {
  //     console.error('Payment failed:', err);
  //     setError('Failed to initiate payment. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = `kiosk_${Date.now()}`;

      // 1. Send the request
      const response = await paymentService.initiatePayment(userId, 10);
      console.log("BACKEND RESPONSE:", response);

      // 3. Check if the URL exists and redirect
      if (response.pay_url) {
        window.location.href = response.pay_url;
      } else {
        setError("Error: Backend did not return a payment URL. Check console.");
      }
      

    } catch (err) {
      console.error('Payment failed:', err);
      setError('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />

        {/* Close Button */}
        {isClosable && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-white/30 hover:text-white transition-colors rounded-full hover:bg-white/5 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-8 md:p-10">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <IndianRupee className="w-10 h-10 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Start Your Session</h2>
            <p className="text-white/50 text-sm mb-8 leading-relaxed">
              Pay <span className="text-emerald-400 font-bold">₹10</span> to chat with Aria AI for <span className="text-blue-400 font-bold">1 minute</span>
            </p>

            {/* Price card */}
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/60 text-sm">Session Fee</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">₹10</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>1 minute of AI Avatar conversation</span>
              </div>
            </div>

            {error && (
              <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay ₹10
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPaymentGate;
