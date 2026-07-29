import { useState, useCallback } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export const useBuyerInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitInquiry = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const record = await api('/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return record;
    } catch (err) {
      console.error('[useBuyerInquiries] submitInquiry error:', err);
      const errorMessage = err.message || 'Failed to submit inquiry.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const orders = await api('/admin/orders');
      const records = orders.map((order) => ({
        ...order,
        id: order.id,
        buyer_email: order.buyer_email,
        buyer_name: order.buyer_name,
        buyer_phone: order.buyer_phone,
        created: order.created_at,
        expand: { game_account_id: { account_code: order.account_code } },
      }));
      setInquiries(records);
      return records;
    } catch (err) {
      console.error('[useBuyerInquiries] fetchInquiries error:', err);
      const errorMessage = err.message || 'Failed to fetch inquiries.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInquiryStatus = useCallback(async (id, status) => {
    setLoading(true);
    setError(null);
    try {
      if (!id) throw new Error('Inquiry ID is required.');
      if (status !== 'paid') throw new Error('Status pembayaran hanya dapat berubah melalui TemanQRIS.');
      return true;
    } catch (err) {
      console.error(`[useBuyerInquiries] updateInquiryStatus error for ID ${id}:`, err);
      const errorMessage = err.message || 'Failed to update inquiry status.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchInquiries]);

  return {
    inquiries,
    loading,
    error,
    submitInquiry,
    fetchInquiries,
    updateInquiryStatus
  };
};
