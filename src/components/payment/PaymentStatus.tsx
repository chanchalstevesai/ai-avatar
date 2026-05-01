
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2, ArrowLeft } from 'lucide-react';
import paymentService from '../../services/paymentService';

const PaymentStatus: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'FAILURE' | 'PENDING'>('LOADING');
  const [message, setMessage] = useState<string | null>(null);

  const txnId = searchParams.get('txnId') || searchParams.get('txn_id') || searchParams.get('transactionId') || searchParams.get('merchantTransactionId');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!txnId) {
        setStatus('FAILURE');
        setMessage('No transaction ID found.');
        return;
      }

      try {
        const response = await paymentService.checkStatus(txnId);

        if (response.status === 'SUCCESS' || response.payment_state === 'COMPLETED') {
          setStatus('SUCCESS');
          setTimeout(() => {
            navigate("/", { state: { paymentSuccessful: true } });
          }, 2000);
        } else if (response.status === 'FAILURE' || response.payment_state === 'FAILED') {
          setStatus('FAILURE');
          setMessage(response.message || 'Payment was declined.');
        } else {
          setStatus('PENDING');
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus('FAILURE');
        setMessage('Could not verify payment. Please try again.');
      }
    };

    verifyPayment();
  }, [txnId]);

  const renderContent = () => {
    switch (status) {
      case 'LOADING':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <h2 className="text-2xl font-bold text-white">Verifying Payment...</h2>
            <p className="text-white/40">Please do not close this window.</p>
          </div>
        );
      case 'SUCCESS':
        return (
          <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
              <CheckCircle2 className="w-20 h-20 text-emerald-500 relative" />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
              <p className="text-white/60 mb-6">Your session is ready. Go back to start chatting with Aria AI.</p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 w-full max-w-sm mx-auto">
                <div className="flex justify-between mb-2">
                  <span className="text-white/40 text-sm">Transaction</span>
                  <span className="text-white text-sm font-mono truncate ml-2 max-w-[180px]">{txnId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Amount</span>
                  <span className="text-emerald-400 text-sm font-bold">₹10</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'FAILURE':
        return (
          <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
              <XCircle className="w-20 h-20 text-red-500 relative" />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Payment Failed</h2>
              <p className="text-white/60 mb-6">No funds were debited from your account.</p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 w-full">
                <p className="text-white/40 text-sm text-center">
                  {message || "Payment cancelled or declined by bank."}
                </p>
              </div>
            </div>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in duration-500">
            <Clock className="w-20 h-20 text-amber-500" />
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Payment Pending</h2>
              <p className="text-white/60 mb-6">Waiting for confirmation from the bank. This may take a few minutes.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
        {renderContent()}

        <button
          onClick={() => navigate('/')}
          className="w-full py-4 mt-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {status === 'SUCCESS' ? 'Start Chatting →' : 'Back to Home'}
        </button>
      </div>
    </div>
  );
};

export default PaymentStatus;
