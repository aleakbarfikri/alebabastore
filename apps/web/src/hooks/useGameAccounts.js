import { useState, useCallback } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export const useGameAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllAccounts = useCallback(async (filter = '') => {
    setLoading(true);
    setError(null);
    try {
      const records = await api(`/accounts${filter ? `?game_name=${encodeURIComponent(filter)}` : ''}`);
      setAccounts(records);
      return records;
    } catch (err) {
      console.error('[useGameAccounts] fetchAllAccounts error:', err);
      const errorMessage = err.message || 'Failed to fetch game accounts.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccountById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      if (!id) throw new Error('Account ID is required.');
      const record = await api(`/accounts/${encodeURIComponent(id)}`);
      return record;
    } catch (err) {
      console.error(`[useGameAccounts] fetchAccountById error for ID ${id}:`, err);
      const errorMessage = err.message || 'Failed to fetch account details.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      
      Object.keys(data).forEach(key => {
        if (key !== 'images') {
          if (data[key] !== undefined && data[key] !== null) {
            formData.append(key, data[key]);
          }
        }
      });
      
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          formData.append('images', data.images[i]);
        }
      }

      const record = await api('/accounts', { method: 'POST', body: formData });
      await fetchAllAccounts();
      return record;
    } catch (err) {
      console.error('[useGameAccounts] createAccount error:', err);
      const errorMessage = err.message || 'Failed to create game account.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAllAccounts]);

  const updateAccount = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      if (!id) throw new Error('Account ID is required for update.');
      const formData = new FormData();
      
      Object.keys(data).forEach(key => {
        if (key !== 'images') {
          if (data[key] !== undefined && data[key] !== null) {
            formData.append(key, data[key]);
          }
        }
      });
      
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          formData.append('images', data.images[i]);
        }
      }

      const record = await api(`/accounts/${encodeURIComponent(id)}`, { method: 'PATCH', body: formData });
      await fetchAllAccounts();
      return record;
    } catch (err) {
      console.error(`[useGameAccounts] updateAccount error for ID ${id}:`, err);
      const errorMessage = err.message || 'Failed to update game account.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAllAccounts]);

  const deleteAccount = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error("Invalid record ID provided for deletion.");
      }
      await api(`/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await fetchAllAccounts();
      return true;
    } catch (err) {
      console.error(`[useGameAccounts] deleteAccount error for ID ${id}:`, err);
      const errorMessage = err.message || "An unexpected error occurred while deleting the account.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchAllAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAllAccounts,
    fetchAccountById,
    createAccount,
    updateAccount,
    deleteAccount
  };
};
