
import axios from 'axios';

// Add default header to bypass ngrok warning
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://undenunciatory-stratous-tandra.ngrok-free.dev';

export interface InitiatePaymentResponse {
  success: boolean;
  pay_url?: string;
  merchant_txn_id?: string;
  [key: string]: any;
}

export interface CheckStatusResponse {
  success: boolean;
  status?: 'SUCCESS' | 'FAILURE' | 'PENDING';
  payment_state?: 'COMPLETED' | 'FAILED' | 'PENDING' | string;
  message?: string;
}

export interface SubscriptionStatusResponse {
  hasAccess?: boolean;
  secondsRemaining?: number;
  has_access?: boolean;
  seconds_remaining?: number;
  audio_id?: string;
}

const paymentService = {

  // initiatePayment: async (userId: string, amount: number): Promise<InitiatePaymentResponse> => {
  //   try {
  //     const response = await axios.post(`${API_BASE_URL}/initiate-payment`, {
  //       user_id: userId,
  //       amount,
  //     });
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error initiating payment:', error);
  //     throw error;
  //   }
  // },

  initiatePayment: async (userId: string, amount: number): Promise<InitiatePaymentResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/initiate-payment`, {
        user_id: userId,
        amount,
        // Let's try passing the frontend URL to the backend so it knows where to return the user
        redirect_url: `${window.location.origin}/payment/status`,
        redirect_mode: "REDIRECT"
      });
      return response.data;
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  },


  checkStatus: async (txnId: string): Promise<CheckStatusResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/check-status`, {
        params: { txn_id: txnId },
      });
      return response.data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  },


  getSubscriptionStatus: async (): Promise<SubscriptionStatusResponse> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/subscription-status`);
      return response.data;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      throw error;
    }
  },
};

export default paymentService;
