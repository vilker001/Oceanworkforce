
import React, { useState } from 'react';
import { usePhotoSessions } from '../../src/hooks/usePhotoSessions';
import { useTeam } from '../../src/hooks/useTeam';
import { PhotoSession, ServiceCatalogItem, Transaction, User } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';

interface PhotoSessionsProps {
  currentUser: User;
  transactions?: Transaction[];
  onAddTransaction?: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
}

const locationLabels = { estúdio: 'Estúdio', exterior: 'Exterior' };

export const PhotoSessions: React.FC<PhotoSessionsProps> = ({ currentUser, transactions = [], onAddTransaction }) => {
  const { sessions, catalog, loading, createSession, completeSession, deleteSession, addCatalogItem, deleteCatalogItem } = usePhotoSessions();
  const { team } = useTeam();
  const { confirm } = useConfirm();

  const isManager = ['Gestor de Projetos', 'Gestor Técnico'].includes(currentUser.role);
  const isPhotographer = currentUser.role === 'Fotógrafo';
  const canManageCatalog = isManager || isPhotographer;

  const [activeTab, setActiveTab] = useState<'sessions' | 'catalog'>('sessions');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Agendada' | 'Executada'>('Todos');
  const [mainTab, setMainTab] = useState<'Sessões' | 'Despesas' | 'Investimentos'>('Sessões');

  const [sessionForm, setSessionForm] = useState({
    service_type: '',
    location_type: 'estudio' as 'estudio' | 'exterior',
    date: '',
    time: '10:00',
    duration_estimated: '60', // minutos
    client_name: '',
    client_phone: '',
    price_mt: '',
    notes: '',
    photographer_id: currentUser.id || '',
  });

  const [catalogForm, setCatalogForm] = useState({
    catalog_type: 'BMS Studio' as 'BMS Studio' | 'Ocean Group',
    name: '',
    description: '',
    price_mt: '',
  });

  const photographers = team.filter(m => m.role === 'Fotógrafo');
  const mySessions = sessions.filter(s =>
    isManager ? true : s.photographer_id === currentUser.id
  );
  const filteredSessions = mySessions.filter(s =>
    filterStatus === 'Todos' ? true : s.status === filterStatus
  );
  
  const bmsCatalog = catalog.filter(i => i.catalog_type === 'BMS Studio');

  const selectCatalogItem = (item: ServiceCatalogItem) => {
    setSessionForm(p => ({ ...p, service_type: item.name, price_mt: String(item.price_mt) }));
  };

  const handleSaveSession = async () => {
    if (!sessionForm.service_type || !sessionForm.date || !sessionForm.client_name || !sessionForm.price_mt) return;
    setSaving(true);
    try {
      const photogId = sessionForm.photographer_id || currentUser.id || '';
      const resolvedPhotographer = team.find(m => m.id === photogId);
      const resolvedName = resolvedPhotographer?.name || currentUser.name;
      await createSession({
        service_type: sessionForm.service_type,
        location_type: sessionForm.location_type,
        date: sessionForm.date,
        time: sessionForm.time,
        duration_estimated: sessionForm.duration_estimated,
        client_name: sessionForm.client_name,
        client_phone: sessionForm.client_phone,
        price_mt: parseFloat(sessionForm.price_mt),
        notes: sessionForm.notes || undefined,
        status: 'Agendada',
        photographer_id: photogId,
        photographer_name: resolvedName,
      });
      setShowSessionModal(false);
      setSessionForm({ service_type: '', location_type: 'estudio', date: '', time: '10:00', duration_estimated: '60', client_name: '', client_phone: '', price_mt: '', notes: '', photographer_id: currentUser.id || '' });
    } catch (e: any) { 
      console.error(e); 
      alert("Erro ao marcar sessão: " + (e.message || JSON.stringify(e)));
    } finally { setSaving(false); }
  };

  const handleSaveCatalog = async () => {
    if (!catalogForm.name || !catalogForm.price_mt) return;
    setSaving(true);
    try {
      await addCatalogItem({ catalog_type: catalogForm.catalog_type, name: catalogForm.name, description: catalogForm.description, price_mt: parseFloat(catalogForm.price_mt) });
      setShowCatalogModal(false);
      setCatalogForm({ catalog_type: 'BMS Studio', name: '', description: '', price_mt: '' });
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleComplete = async (session: PhotoSession) => {
    const ok = await confirm({
      title: 'Confirmar Conclusão',
      message: `Confirmar conclusão da sessão "${session.service_type}" com ${session.client_name}?\n\n50% (MT ${(session.price_mt * 0.5).toFixed(0)}) irá para a empresa.\n50% (MT ${(session.price_mt * 0.5).toFixed(0)}) para o fotógrafo.`,
      confirmText: 'Confirmar'
    });
    if (!ok) return;
    try {
      await completeSession(session.id, session);
    } catch (e) { console.error(e); }
  };

  const handleAllocateProfit = async (session: PhotoSession, type: 'expense' | 'investment') => {
    if (!onAddTransaction) return;
    const companyRevenue = session.price_mt * 0.5;
    const desc = window.prompt(`Alocando MT ${companyRevenue} (Lucro da Empresa).\n\nDescrição para a ${type === 'expense' ? 'Despesa' : 'Poupança/Investimento'}:`);
    if (!desc) return;
    
    try {
      await onAddTransaction({
        desc: `[Sessão ${session.service_type}] ${desc}`,
        val: companyRevenue,
        type: type,
        cat: type === 'expense' ? 'Estúdio Fotográfico' : 'Poupança de Equipamento',
        date: new Date().toISOString().split('T')[0],
        status: 'Pago'
      });
      alert('Valor alocado com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao alocar valor.');
    }
  };

  const totalRevenue = sessions.filter(s => s.status === 'Executada').reduce((sum, s) => sum + s.price_mt, 0);
  const myRevenue = sessions.filter(s => s.status === 'Executada' && s.photographer_id === currentUser.id).reduce((sum, s) => sum + s.price_mt * 0.5, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black">Sessões de Fotografia</h2>
          <p className="text-sm text-text-sub">{sessions.filter(s => s.status === 'Agendada').length} agendadas · {sessions.filter(s => s.status === 'Executada').length} executadas</p>
        </div>
        <div className="flex gap-2">
          {canManageCatalog && (
            <button onClick={() => setShowCatalogModal(true)} className="flex items-center gap-2 border border-gray-200 dark:border-zinc-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all">
              <span className="material-symbols-outlined text-base">menu_book</span> Catálogo
            </button>
          )}
          {(isPhotographer || isManager) && (
            <button onClick={() => setShowSessionModal(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-base">add_a_photo</span> Agendar Sessão
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
        {(['Sessões', 'Despesas', 'Investimentos'] as const).map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            className={`px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${mainTab === t ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-sub hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {mainTab === 'Sessões' && (
        <>
          {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase text-text-sub mb-1">Receita Total</p>
          <p className="text-xl font-black text-green-600">MT {totalRevenue.toLocaleString('pt-MZ')}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase text-text-sub mb-1">Ganho Individual</p>
          <p className="text-xl font-black text-blue-600">MT {myRevenue.toLocaleString('pt-MZ')}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase text-text-sub mb-1">Sessões Agendadas</p>
          <p className="text-xl font-black">{sessions.filter(s => s.status === 'Agendada').length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase text-text-sub mb-1">Taxa de Execução</p>
          <p className="text-xl font-black">{sessions.length > 0 ? ((sessions.filter(s => s.status === 'Executada').length / sessions.length) * 100).toFixed(0) : 0}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['Todos', 'Agendada', 'Executada'] as const).map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === f ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-text-sub'}`}>{f}</button>
        ))}
      </div>

      {/* Catalog quick view */}
      {bmsCatalog.length > 0 && showSessionModal && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-2">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">Selecionar do Catálogo:</p>
          <div className="flex flex-wrap gap-2">
            {bmsCatalog.map(item => (
              <button key={item.id} onClick={() => selectCatalogItem(item)}
                className="text-xs bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100 transition-all font-medium">
                {item.name} — MT {item.price_mt.toLocaleString('pt-MZ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="text-center py-12 text-text-sub">A carregar sessões...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-text-sub">photo_camera</span>
          <p className="text-text-sub mt-2 font-medium">Nenhuma sessão encontrada</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredSessions.map(session => (
            <div key={session.id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">photo_camera</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-sm">{session.service_type}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${session.status === 'Agendada' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{session.status}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{locationLabels[session.location_type]}</span>
                    </div>
                    <p className="text-xs text-text-sub mt-0.5">{session.client_name} · {session.date} às {session.time} · {Number(session.duration_estimated) >= 60 ? `${Math.floor(Number(session.duration_estimated)/60)}h${Number(session.duration_estimated)%60 || ''}` : `${session.duration_estimated}min`}</p>
                    {session.photographer_name && <p className="text-xs text-text-sub">Fotógrafo: {session.photographer_name}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <p className="text-[10px] text-text-sub">Preço Total</p>
                        <p className="font-black text-sm text-green-600">MT {session.price_mt.toLocaleString('pt-MZ')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-sub">Empresa (50%)</p>
                        <p className="font-bold text-xs">MT {(session.price_mt * 0.5).toLocaleString('pt-MZ')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-sub">Fotógrafo (50%)</p>
                        <p className="font-bold text-xs">MT {(session.price_mt * 0.5).toLocaleString('pt-MZ')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.status === 'Agendada' && (isPhotographer || isManager) && (
                    <button onClick={() => handleComplete(session)} className="text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-all">
                      Marcar Executada
                    </button>
                  )}
                  {session.status === 'Executada' && isManager && onAddTransaction && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleAllocateProfit(session, 'expense')} className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-all">
                        + Despesa Estúdio
                      </button>
                      <button onClick={() => handleAllocateProfit(session, 'investment')} className="text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-all">
                        + Poupança Equip.
                      </button>
                    </div>
                  )}
                  {isManager && (
                    <button onClick={() => deleteSession(session.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <span className="material-symbols-outlined text-base text-red-400">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {mainTab === 'Despesas' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5">
          <h3 className="font-black text-lg mb-4">Despesas do Estúdio</h3>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {transactions.filter(t => t.cat === 'Estúdio Fotográfico' && t.type === 'expense').length === 0 ? (
              <p className="text-text-sub text-sm py-4">Nenhuma despesa registada.</p>
            ) : transactions.filter(t => t.cat === 'Estúdio Fotográfico' && t.type === 'expense').map(t => (
              <div key={t.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{t.desc}</p>
                  <p className="text-xs text-text-sub">{new Date(t.date).toLocaleDateString('pt-MZ')}</p>
                </div>
                <span className="font-black text-red-500">-MT {t.val.toLocaleString('pt-MZ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mainTab === 'Investimentos' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5">
          <h3 className="font-black text-lg mb-4">Investimentos e Poupança</h3>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {transactions.filter(t => t.cat === 'Poupança de Equipamento' && t.type === 'investment').length === 0 ? (
              <p className="text-text-sub text-sm py-4">Nenhum investimento registado.</p>
            ) : transactions.filter(t => t.cat === 'Poupança de Equipamento' && t.type === 'investment').map(t => (
              <div key={t.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{t.desc}</p>
                  <p className="text-xs text-text-sub">{new Date(t.date).toLocaleDateString('pt-MZ')}</p>
                </div>
                <span className="font-black text-amber-600">MT {t.val.toLocaleString('pt-MZ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg">Agendar Sessão</h3>
              <button onClick={() => setShowSessionModal(false)}><span className="material-symbols-outlined text-text-sub">close</span></button>
            </div>

            {/* Quick Catalog Select */}
            {bmsCatalog.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold text-text-sub uppercase mb-2 block">Selecionar do Catálogo</label>
                <div className="flex flex-wrap gap-2">
                  {bmsCatalog.map(item => (
                    <button key={item.id} onClick={() => selectCatalogItem(item)}
                      className={`text-xs border px-2 py-1 rounded-lg transition-all font-medium ${sessionForm.service_type === item.name ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'}`}>
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Tipo de Serviço *</label>
                <input type="text" value={sessionForm.service_type} onChange={e => setSessionForm(p => ({ ...p, service_type: e.target.value }))}
                  placeholder="Ex: Sessão Retrato" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Localização</label>
                  <select value={sessionForm.location_type} onChange={e => setSessionForm(p => ({ ...p, location_type: e.target.value as any }))}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                    <option value="estudio">Estúdio</option>
                    <option value="exterior">Exterior</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Duração Estimada</label>
                  <select value={sessionForm.duration_estimated} onChange={e => setSessionForm(p => ({ ...p, duration_estimated: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                    <option value="30">30 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                    <option value="120">2 horas</option>
                    <option value="180">3 horas</option>
                    <option value="240">4 horas</option>
                    <option value="480">Dia todo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Data *</label>
                  <input type="date" value={sessionForm.date} onChange={e => setSessionForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Hora</label>
                  <input type="time" value={sessionForm.time} onChange={e => setSessionForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Nome do Cliente *</label>
                <input type="text" value={sessionForm.client_name} onChange={e => setSessionForm(p => ({ ...p, client_name: e.target.value }))}
                  placeholder="Nome do cliente" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Telefone do Cliente</label>
                <input type="text" value={sessionForm.client_phone} onChange={e => setSessionForm(p => ({ ...p, client_phone: e.target.value }))}
                  placeholder="+258 8X XXX XXXX" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Preço (MT) *</label>
                <input type="number" value={sessionForm.price_mt} onChange={e => setSessionForm(p => ({ ...p, price_mt: e.target.value }))}
                  placeholder="5000" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                {sessionForm.price_mt && (
                  <p className="text-xs text-text-sub mt-1">
                    Empresa: <span className="font-bold text-green-600">MT {(parseFloat(sessionForm.price_mt) * 0.5).toFixed(0)}</span> · Fotógrafo: <span className="font-bold text-blue-600">MT {(parseFloat(sessionForm.price_mt) * 0.5).toFixed(0)}</span>
                  </p>
                )}
              </div>
              {isManager && photographers.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Fotógrafo Responsável</label>
                  <select value={sessionForm.photographer_id} onChange={e => setSessionForm(p => ({ ...p, photographer_id: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                    {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1 block">Notas</label>
                <textarea rows={2} value={sessionForm.notes} onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Instruções especiais, equipamento necessário..." className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSessionModal(false)} className="flex-1 border border-gray-200 dark:border-zinc-700 rounded-xl py-2.5 text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800">Cancelar</button>
              <button onClick={handleSaveSession} disabled={saving || !sessionForm.service_type || !sessionForm.date || !sessionForm.client_name || !sessionForm.price_mt}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
                {saving ? 'A guardar...' : 'Agendar Sessão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg">Catálogo de Serviços</h3>
              <button onClick={() => setShowCatalogModal(false)}><span className="material-symbols-outlined text-text-sub">close</span></button>
            </div>

            {/* Existing catalog items */}
            <div className="mb-6">
              <p className="text-xs font-bold text-text-sub uppercase mb-3">Serviços Atuais</p>
              {catalog.length === 0 ? (
                <p className="text-sm text-text-sub">Nenhum serviço no catálogo</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {['BMS Studio', 'Ocean Group'].map(type => (
                    <div key={type}>
                      <p className="text-xs font-black text-text-sub uppercase mb-2">{type}</p>
                      {catalog.filter(i => i.catalog_type === type).map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl mb-2">
                          <div>
                            <p className="text-sm font-bold">{item.name}</p>
                            <p className="text-xs text-text-sub">MT {item.price_mt.toLocaleString('pt-MZ')}</p>
                          </div>
                          <button onClick={() => deleteCatalogItem(item.id)} className="text-red-400 hover:bg-red-50 p-1 rounded-lg">
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new item */}
            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <p className="text-xs font-bold text-text-sub uppercase mb-3">Adicionar Novo Serviço</p>
              <div className="space-y-3">
                <select value={catalogForm.catalog_type} onChange={e => setCatalogForm(p => ({ ...p, catalog_type: e.target.value as any }))}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option>BMS Studio</option>
                  <option>Ocean Group</option>
                </select>
                <input type="text" value={catalogForm.name} onChange={e => setCatalogForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do serviço" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                <input type="number" value={catalogForm.price_mt} onChange={e => setCatalogForm(p => ({ ...p, price_mt: e.target.value }))}
                  placeholder="Preço em MT" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCatalogModal(false)} className="flex-1 border border-gray-200 dark:border-zinc-700 rounded-xl py-2.5 text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800">Fechar</button>
              <button onClick={handleSaveCatalog} disabled={saving || !catalogForm.name || !catalogForm.price_mt}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
                {saving ? 'A guardar...' : 'Adicionar ao Catálogo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
