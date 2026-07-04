import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UploadZone from '@/components/UploadZone.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { useGameAccounts } from '@/hooks/useGameAccounts.js';

export default function EditItemModal({ isOpen, onClose, account, onSuccess }) {
  const { deleteAccount } = useGameAccounts();
  const [formData, setFormData] = useState({
    title: '',
    game_name: '',
    level: '',
    rank: '',
    description: '',
    price: '',
    townhall_level: '',
    account_code: ''
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (account && isOpen) {
      setFormData({
        title: account.title || '',
        game_name: account.game_name || '',
        level: account.level?.toString() || '',
        rank: account.rank || '',
        description: account.description || '',
        price: account.price?.toString() || '',
        townhall_level: account.townhall_level?.toString() || '',
        account_code: account.account_code || ''
      });
      setImages([]);
      setShowDeleteConfirm(false);
    }
  }, [account, isOpen]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (value) => {
    setFormData({
      ...formData,
      game_name: value,
      townhall_level: value !== 'Clash of Clans' ? '' : formData.townhall_level
    });
  };

  const handleTownHallChange = (value) => {
    setFormData({
      ...formData,
      townhall_level: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) return;
    
    setSubmitting(true);
    try {
      const data = new FormData();
      if (formData.title) data.append('title', formData.title);
      data.append('game_name', formData.game_name);
      data.append('level', parseFloat(formData.level));
      if (formData.rank) data.append('rank', formData.rank);
      data.append('description', formData.description);
      data.append('price', parseFloat(formData.price));
      
      // Explicitly append account_code so it is never lost during an update
      if (formData.account_code) {
        data.append('account_code', formData.account_code);
      }
      
      if (formData.game_name === 'Clash of Clans' && formData.townhall_level) {
        data.append('townhall_level', parseInt(formData.townhall_level, 10));
      } else {
        data.append('townhall_level', '');
      }
      
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          data.append('images', images[i]);
        }
      }

      console.log('[EditItemModal] Submitting update payload with keys:', Array.from(data.keys()));

      await pb.collection('game_accounts').update(account.id, data, { $autoCancel: false });
      toast.success('Account successfully updated');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('--- EDIT ITEM ERROR ---');
      console.error('[DEBUG] Full error:', error);
      
      let errorMsg = 'Failed to update account.';
      if (error.response?.data) {
        const validationErrors = Object.entries(error.response.data)
          .map(([field, err]) => `${field}: ${err.message}`)
          .join(' | ');
        errorMsg += ` Details: ${validationErrors}`;
      } else if (error.data?.data) {
        const validationErrors = Object.entries(error.data.data)
          .map(([field, err]) => `${field}: ${err.message}`)
          .join(' | ');
        errorMsg += ` Details: ${validationErrors}`;
      } else {
        errorMsg += ` ${error.message}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!account) return;
    setIsDeleting(true);
    try {
      await deleteAccount(account.id);
      toast.success('Account successfully deleted');
      setShowDeleteConfirm(false);
      onSuccess(); // Refresh list
      onClose();   // Close modal
    } catch (error) {
      toast.error(`Failed to delete account: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Game Account</DialogTitle>
            <DialogDescription>
              Update the listing details below. Leave screenshots empty to keep existing images.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  maxLength={255}
                  className="bg-background border-border text-foreground"
                  placeholder="Contoh: Mobile Legend Skin 210"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_code">Account Code</Label>
                <Input
                  type="text"
                  id="account_code"
                  name="account_code"
                  value={formData.account_code}
                  readOnly
                  className="bg-muted border-border text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_name">Game Name *</Label>
                <Select value={formData.game_name} onValueChange={handleSelectChange} required>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select Game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mobile Legends">Mobile Legends</SelectItem>
                    <SelectItem value="Free Fire">Free Fire</SelectItem>
                    <SelectItem value="Clash of Clans">Clash of Clans</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Account Level *</Label>
                <Input
                  type="number"
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="bg-background border-border text-foreground"
                />
              </div>

              {formData.game_name === 'Clash of Clans' && (
                <div className="space-y-2">
                  <Label htmlFor="townhall_level">TownHall Level *</Label>
                  <Select value={formData.townhall_level} onValueChange={handleTownHallChange} required>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select TH Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(14)].map((_, i) => (
                        <SelectItem key={`th-${i + 1}`} value={(i + 1).toString()}>
                          TH {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="rank">Rank / Tier</Label>
                <Input
                  type="text"
                  id="rank"
                  name="rank"
                  value={formData.rank}
                  onChange={handleInputChange}
                  className="bg-background border-border text-foreground"
                  placeholder="e.g. Mythic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (IDR) *</Label>
                <Input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="bg-background border-border text-foreground resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Update Screenshots (Optional)</Label>
              <UploadZone
                onFilesChange={setImages}
                maxFiles={10}
                accept="image/*"
                label="Upload new proof screenshots to replace existing ones"
              />
            </div>

            <div className="flex justify-between items-center w-full pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)} 
                disabled={submitting || isDeleting}
              >
                Delete Listing
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting || isDeleting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || isDeleting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the 
              <strong className="text-foreground"> {formData.game_name}</strong> account 
              (Level {formData.level}) from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}