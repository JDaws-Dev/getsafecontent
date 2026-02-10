import { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useToast } from '../common/Toast';

function BillingHistory({ stripeCustomerId }) {
  const { showToast, ToastContainer } = useToast();
  const getInvoiceHistory = useAction(api.stripeActions.getInvoiceHistory);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!stripeCustomerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const invoiceData = await getInvoiceHistory({ stripeCustomerId });
        setInvoices(invoiceData);
        setError('');
      } catch (err) {
        console.error('Failed to fetch invoices:', err);
        setError('Failed to load billing history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [stripeCustomerId, getInvoiceHistory]);

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Paid
          </span>
        );
      case 'open':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Open
          </span>
        );
      case 'void':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
            Void
          </span>
        );
      case 'uncollectible':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
            {status}
          </span>
        );
    }
  };

  const handleDownloadReceipt = async (invoice) => {
    if (invoice.invoicePdf) {
      window.open(invoice.invoicePdf, '_blank');
      showToast('Opening receipt in new tab...', 'success');
    } else if (invoice.hostedInvoiceUrl) {
      window.open(invoice.hostedInvoiceUrl, '_blank');
      showToast('Opening invoice in new tab...', 'info');
    } else {
      showToast('Receipt not available for this invoice', 'warning');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading billing history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        {ToastContainer}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium">No billing history yet</p>
          <p className="text-sm text-gray-500 mt-1">Your invoices will appear here once you're charged</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Billing History</h2>
        <p className="text-sm text-gray-600 mb-6">
          View and download your past invoices and receipts
        </p>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {new Date(invoice.paidAt || invoice.created).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">
                    <div className="font-medium">{invoice.description}</div>
                    {invoice.number && (
                      <div className="text-xs text-gray-500 mt-1">Invoice #{invoice.number}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <button
                      onClick={() => handleDownloadReceipt(invoice)}
                      className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">{invoice.description}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(invoice.paidAt || invoice.created).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  {invoice.number && (
                    <div className="text-xs text-gray-500 mt-1">Invoice #{invoice.number}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 text-lg mb-1">
                    {formatCurrency(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
              </div>

              <button
                onClick={() => handleDownloadReceipt(invoice)}
                className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Receipt
              </button>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-medium">About Your Invoices</p>
              <p className="text-blue-700 mt-1">
                Your receipts are securely stored by Stripe and available for download at any time.
                Keep them for your records or tax purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BillingHistory;
