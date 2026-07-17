import React, { useState, useEffect, useMemo } from 'react';
import { User, Client, InvoiceItem } from '../../types';
import { useClients } from '../../src/hooks/useClients';
import { useInvoices } from '../../src/hooks/useInvoices';
import { pdf } from '@react-pdf/renderer';
import { InvoicePDF } from './InvoicePDF';
import { supabase } from '../../src/lib/supabase';
import { View } from '../../types';

interface InvoiceNewProps {
  user: User;
  onNavigate: (view: View) => void;
}

export const InvoiceNew: React.FC<InvoiceNewProps> = ({ user, onNavigate }) => {
  const { clients } = useClients();
  const { companyProfile, createInvoice, updateInvoiceUrl } = useInvoices();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([{ descricao: '', quantidade: 1, preco_unitario: 0, total_linha: 0 }]);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [validadeDias, setValidadeDias] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total_linha, 0), [items]);
  const iva = useMemo(() => subtotal * 0.16, [subtotal]);
  const total = useMemo(() => subtotal + iva, [subtotal, iva]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'quantidade' || field === 'preco_unitario') {
      item.total_linha = Number(item.quantidade) * Number(item.preco_unitario);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { descricao: '', quantidade: 1, preco_unitario: 0, total_linha: 0 }]);
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      setError('Seleccione um cliente.');
      return;
    }
    if (items.some(i => !i.descricao || i.quantidade <= 0 || i.preco_unitario <= 0)) {
      setError('Preencha correctamente todos os itens da factura.');
      return;
    }
    if (!companyProfile) {
      setError('Perfil da empresa não configurado.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const invoiceData = {
        client_id: selectedClient.id,
        emitido_por: user.id || '',
        subtotal,
        iva,
        total,
        forma_pagamento: formaPagamento,
        validade_dias: validadeDias
      };

      // 1. Create Invoice in DB
      const newInvoice = await createInvoice(invoiceData as any, items);

      // 2. Generate PDF Blob
      const pdfBlob = await pdf(
        <InvoicePDF 
          invoice={{ ...newInvoice, items } as any} 
          company={companyProfile} 
          client={selectedClient} 
        />
      ).toBlob();

      // 3. Upload to Supabase Storage
      const fileName = `${newInvoice.codigo.replace('/', '_')}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 4. Get URL and update DB
      const { data: urlData } = supabase.storage.from('facturas').getPublicUrl(fileName);
      await updateInvoiceUrl(newInvoice.id, urlData.publicUrl);

      // 5. Navigate to History
      onNavigate(View.INVOICE_HISTORY);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao emitir factura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Nova Factura</h2>
          <p className="text-text-sub text-sm">Emissão de factura para cliente do CRM.</p>
        </div>
        <button
          onClick={() => onNavigate(View.INVOICE_HISTORY)}
          className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-sm font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          Ver Histórico
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-8">
        
        {/* Company & Client Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Company */}
          <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-700">
            <h3 className="text-[10px] font-black uppercase text-primary mb-4 tracking-widest">Emitente (Empresa)</h3>
            {companyProfile ? (
              <div className="space-y-2 text-sm">
                <p className="font-bold text-lg">{companyProfile.nome}</p>
                <p className="text-text-sub">{companyProfile.endereco}</p>
                <p className="text-text-sub">{companyProfile.contacto}</p>
                <p className="font-bold">NUIT: {companyProfile.nuit}</p>
              </div>
            ) : (
              <p className="text-sm text-amber-600">Perfil da empresa não encontrado. Configure-o primeiro.</p>
            )}
          </div>

          {/* Client */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <h3 className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest">Cliente (Destinatário)</h3>
            <select
              className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              required
            >
              <option value="">Seleccione um cliente do CRM...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
              ))}
            </select>

            {selectedClient && (
              <div className="space-y-1 text-sm bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl">
                <p className="font-bold">{selectedClient.name}</p>
                <p className="text-text-sub">{selectedClient.location}</p>
                <p className="text-text-sub">{selectedClient.email} / {selectedClient.phone}</p>
                {selectedClient.nuit && <p className="font-bold">NUIT: {selectedClient.nuit}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div>
          <h3 className="text-[10px] font-black uppercase text-text-sub mb-4 tracking-widest border-b border-gray-100 dark:border-zinc-800 pb-2">Itens da Factura</h3>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Descrição</label>
                  <input
                    type="text"
                    required
                    value={item.descricao}
                    onChange={e => handleItemChange(index, 'descricao', e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm outline-none"
                    placeholder="Ex: Website Informativo"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantidade}
                    onChange={e => handleItemChange(index, 'quantidade', Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm outline-none text-center"
                  />
                </div>
                <div className="w-40">
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Preço Unit. (MT)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={item.preco_unitario}
                    onChange={e => handleItemChange(index, 'preco_unitario', Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm outline-none text-right"
                  />
                </div>
                <div className="w-40">
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Total (MT)</label>
                  <div className="w-full bg-gray-100 dark:bg-zinc-900 border-none rounded-xl p-3 text-sm text-right font-bold text-text-sub">
                    {item.total_linha.toLocaleString('pt-MZ')}
                  </div>
                </div>
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex items-center gap-2 text-primary font-bold text-xs uppercase px-4 py-2 hover:bg-primary/10 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span> Adicionar Linha
          </button>
        </div>

        {/* Totals & Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 dark:border-zinc-800 pt-8">
          
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-text-sub tracking-widest">Condições (Opcional)</h3>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-text-sub uppercase">Forma de Pagamento Especifica</label>
              <input
                type="text"
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm outline-none"
                placeholder="Ex: 50% adjudicação e 50% entrega"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-text-sub uppercase">Validade (Dias)</label>
              <input
                type="number"
                value={validadeDias}
                onChange={e => setValidadeDias(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-zinc-850 rounded-2xl p-6 space-y-4 flex flex-col justify-end">
            <div className="flex justify-between items-center text-sm font-bold text-text-sub">
              <span>SUBTOTAL</span>
              <span>MT {subtotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-text-sub">
              <span>IVA (16%)</span>
              <span>MT {iva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-full h-px bg-gray-200 dark:bg-zinc-700"></div>
            <div className="flex justify-between items-center text-2xl font-black text-primary">
              <span>TOTAL</span>
              <span>MT {total.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>A Processar...</>
            ) : (
              <>
                <span className="material-symbols-outlined">receipt_long</span>
                Emitir Factura
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
