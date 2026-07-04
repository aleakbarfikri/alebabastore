import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

const BuyerInquiryTable = ({ inquiries, onStatusChange }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied code: ${text}`);
  };

  if (!inquiries || inquiries.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No customer inquiries yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="uppercase tracking-wider border-b border-border bg-muted/50 text-muted-foreground font-semibold text-xs">
          <tr>
            <th scope="col" className="px-6 py-4">Date</th>
            <th scope="col" className="px-6 py-4">Buyer Info</th>
            <th scope="col" className="px-6 py-4">Account Code</th>
            <th scope="col" className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {inquiries.map((inquiry) => {
            const accountCode = inquiry.expand?.game_account_id?.account_code || 'N/A';
            
            return (
              <tr key={inquiry.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(inquiry.created).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">{inquiry.buyer_name}</div>
                  <div className="text-xs text-muted-foreground">{inquiry.buyer_phone}</div>
                  <div className="text-xs text-muted-foreground">{inquiry.buyer_email}</div>
                </td>
                <td className="px-6 py-4">
                  {accountCode !== 'N/A' ? (
                    <div className="account-code-badge" title="Copy Account Code">
                      <span>{accountCode}</span>
                      <button 
                        onClick={() => copyToClipboard(accountCode)}
                        className="account-code-copy-btn ml-1"
                        aria-label="Copy account code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Not available</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Select
                    value={inquiry.status}
                    onValueChange={(value) => onStatusChange(inquiry.id, value)}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs bg-background border-border">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BuyerInquiryTable;