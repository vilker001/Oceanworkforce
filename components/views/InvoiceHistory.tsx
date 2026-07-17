import React, { useState, useMemo } from 'react';
import { User, View } from '../../types';
import { useInvoices } from '../../src/hooks/useInvoices';

interface InvoiceHistoryProps {
  user: User;
  onNavigate: (view: View) => void;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({ user, onNavigate }) => {
  const { invoices, loading, error, cancelInvoice, updateInvoiceStatus } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todas' | 'emitida' | 'paga' | 'anulada'>('Todas');

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchStatus = statusFilter === 'Todas' ? true : inv.estado === statusFilter;
      const matchSearch = inv.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inv.client_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [invoices, statusFilter, searchQuery]);

  const handleCancel = async (id: string, codigo: string) => {
    const ok = window.confirm(`Tem a certeza que deseja ANULAR a factura ${codigo}? Esta ação não pode ser desfeita.`);
    if (ok) {
      await updateInvoiceStatus(id, 'anulada');
    }
  };

  const toggleStatus = async (id: string, currentState: string) => {
    if (currentState === 'anulada') return;
    const newState = currentState === 'emitida' ? 'paga' : 'emitida';
    await updateInvoiceStatus(id, newState);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Link copiado para a área de transferência!');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Histórico de Facturação</h2>
          <p className="text-text-sub text-sm">Consulte as facturas emitidas e os seus estados.</p>
        </div>
        <button
          onClick={() => onNavigate(View.INVOICE_NEW)}
          className="px-6 py-3 bg-primary text-white text-sm font-black uppercase rounded-2xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span> Nova Factura
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">
          Erro ao carregar facturas: {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50 dark:bg-zinc-800/30">
          <div className="relative max-w-md w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sub text-lg">search</span>
            <input
              type="text"
              placeholder="Procurar por código ou cliente..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            {(['Todas', 'emitida', 'paga', 'anulada'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === status
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white dark:bg-zinc-800 text-text-sub border border-gray-200 dark:border-zinc-700 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
              <tr className="text-[10px] uppercase font-bold text-text-sub tracking-widest">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Cliente / Emitente</th>
                <th className="px-6 py-4">Data Emissão</th>
                <th className="px-6 py-4">Total (MT)</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-sub">A carregar facturas...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-gray-300">receipt_long</span>
                    <p className="text-sm font-bold text-text-sub">Nenhuma factura encontrada.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-black text-sm">{inv.codigo}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-text-sub">{inv.client_name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Emitida por: {inv.emitido_por_nome}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-sub">{new Date(inv.data_emissao).toLocaleDateString('pt-MZ')}</td>
                    <td className="px-6 py-4 font-black text-primary">MT {inv.total.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(inv.id, inv.estado)}
                        disabled={inv.estado === 'anulada'}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                          inv.estado === 'emitida' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                          inv.estado === 'paga' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                          'bg-red-100 text-red-700 cursor-not-allowed'
                        }`}
                        title={inv.estado !== 'anulada' ? "Clique para mudar estado" : ""}
                      >
                        {inv.estado}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.pdf_url && (
                          <>
                            <button onClick={() => handleDownload(inv.pdf_url!)} className="p-2 text-text-sub hover:text-primary hover:bg-primary/10 rounded-lg transition-colors tooltip" title="Baixar PDF">
                              <span className="material-symbols-outlined text-sm">download</span>
                            </button>
                            <button onClick={() => copyLink(inv.pdf_url!)} className="p-2 text-text-sub hover:text-primary hover:bg-primary/10 rounded-lg transition-colors tooltip" title="Copiar Link">
                              <span className="material-symbols-outlined text-sm">link</span>
                            </button>
                          </>
                        )}
                        {inv.estado !== 'anulada' && ['Gestor de Projetos', 'Gestor Técnico'].includes(user.role) && (
                          <button onClick={() => handleCancel(inv.id, inv.codigo)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Anular Factura">
                            <span className="material-symbols-outlined text-sm">cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
