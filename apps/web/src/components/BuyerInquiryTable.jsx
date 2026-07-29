import React from 'react';
import { Copy, CheckCircle2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

const BuyerInquiryTable = ({ inquiries, onVerify, onSync, onResend }) => {
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
            <th scope="col" className="px-6 py-4">Pembayaran & Pengiriman</th>
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
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      inquiry.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                      inquiry.status === 'awaiting_confirmation' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-muted text-muted-foreground'
                    }`}>{inquiry.status}</span>
                    {!['paid', 'expired', 'cancelled'].includes(inquiry.status) && (
                      <button onClick={() => onSync(inquiry.order_id)} className="p-2 rounded-lg bg-primary/10 text-primary" title="Sinkronkan status dari TemanQRIS">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    {inquiry.status === 'awaiting_confirmation' && (
                      <button onClick={() => onVerify(inquiry.order_id)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600" title="Verifikasi pembayaran">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {inquiry.status === 'paid' && inquiry.delivery_error && (
                      <button onClick={() => onResend(inquiry.order_id)} className="p-2 rounded-lg bg-primary/10 text-primary" title="Kirim ulang email">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {inquiry.fulfilled_at && <div className="text-xs text-emerald-600 mt-1">Email terkirim</div>}
                  {inquiry.delivery_error && <div className="text-xs text-destructive mt-1 max-w-[240px] whitespace-normal">{inquiry.delivery_error}</div>}
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
