import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const useBuyerInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitInquiry = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('buyer_name', data.buyer_name);
      formData.append('buyer_email', data.buyer_email);
      formData.append('buyer_phone', data.buyer_phone);
      formData.append('game_account_id', data.game_account_id);
      formData.append('status', 'pending');
      
      if (data.payment_proof && data.payment_proof.length > 0) {
        for (let i = 0; i < data.payment_proof.length; i++) {
          formData.append('payment_proof', data.payment_proof[i]);
        }
      }
      
      if (data.additional_documents && data.additional_documents.length > 0) {
        for (let i = 0; i < data.additional_documents.length; i++) {
          formData.append('additional_documents', data.additional_documents[i]);
        }
      }

      const record = await pb.collection('buyer_inquiries').create(formData, { $autoCancel: false });
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
      const records = await pb.collection('buyer_inquiries').getFullList({
        sort: '-created',
        expand: 'game_account_id',
        $autoCancel: false
      });
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
      const record = await pb.collection('buyer_inquiries').update(id, { status }, { $autoCancel: false });
      await fetchInquiries();
      return record;
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