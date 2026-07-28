import React, { useState, useMemo } from 'react';
import { ServiceCatalogItem, User } from '../../types';
import { usePhotoSessions } from '../../src/hooks/usePhotoSessions';
import { supabase } from '../../src/lib/supabase';
import { useConfirm } from '../ui/ConfirmDialog';

interface ServiceCatalogProps {
  currentUser: User;
}

const catalogTypeConfig = {
  'Ocean Group': {
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    gradient: 'from-blue-600 to-indigo-600',
    icon: 'waves',
    description: 'Serviços de marketing digital e gestão de redes sociais'
  },
  'BMS Studio': {
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-200 dark:border-violet-800',
    gradient: 'from-violet-600 to-purple-600',
    icon: 'photo_camera',
    description: 'Serviços de fotografia e produção audiovisual'
  }
};

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({ currentUser }) => {
  const { catalog, loading, addCatalogItem, deleteCatalogItem, refetchCatalog } = usePhotoSessions();
  const { confirm } = useConfirm();

  const isManager = ['Gestor de Projetos', 'Gestor Técnico'].includes(currentUser.role);
  const isPhotographer = currentUser.role === 'Fotógrafo';

  const [activeTab, setActiveTab] = useState<'Ocean Group' | 'BMS Studio'>('Ocean Group');
  
  const canManageCurrentTab = activeTab === 'Ocean Group' ? isManager : (isManager || isPhotographer);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ServiceCatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    catalog_type: 'Ocean Group' as 'Ocean Group' | 'BMS Studio',
    name: '',
    description: '',
    price_mt: '',
  });

  const openAddModal = (type: 'Ocean Group' | 'BMS Studio') => {
    setEditItem(null);
    setForm({ catalog_type: type, name: '', description: '', price_mt: '' });
    setShowModal(true);
  };

  const openEditModal = (item: ServiceCatalogItem) => {
    setEditItem(item);
    setForm({
      catalog_type: item.catalog_type,
      name: item.name,
      description: item.description || '',
      price_mt: String(item.price_mt),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price_mt || parseFloat(form.price_mt) <= 0) return;
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase.from('service_catalog').update({
          name: form.name,
          description: form.description,
          price_mt: parseFloat(form.price_mt),
          catalog_type: form.catalog_type,
        }).eq('id', editItem.id);
        if (error) throw error;
        await refetchCatalog();
      } else {
        await addCatalogItem({
          catalog_type: form.catalog_type,
          name: form.name,
          description: form.description,
          price_mt: parseFloat(form.price_mt),
        });
      }
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao guardar serviço.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ServiceCatalogItem) => {
    const ok = await confirm({
      title: 'Remover Serviço',
      message: `Remover "${item.name}" do catálogo? Esta ação não pode ser desfeita.`,
      isDanger: true,
      confirmText: 'Remover',
    });
    if (!ok) return;
    try {
      await deleteCatalogItem(item.id);
    } catch (e) {
      alert('Erro ao remover serviço.');
    }
  };

  const filteredCatalog = useMemo(() => {
    return catalog.filter(item =>
      item.catalog_type === activeTab &&
      (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [catalog, activeTab, searchQuery]);

  const totalValue = filteredCatalog.reduce((sum, item) => sum + item.price_mt, 0);
  const config = catalogTypeConfig[activeTab];

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Catálogo de Serviços</h2>
          <p className="text-text-sub text-sm mt-1">
            Todos os serviços e preços disponíveis na Ocean Group e BMS Studio.
            {!canManageCurrentTab && <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">Apenas visualização.</span>}
          </p>
        </div>
        {canManageCurrentTab && (
          <button
            onClick={() => openAddModal(activeTab)}
            className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            Novo Serviço
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {(['Ocean Group', 'BMS Studio'] as const).map(type => {
          const cfg = catalogTypeConfig[type];
          const count = catalog.filter(i => i.catalog_type === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                activeTab === type
                  ? `bg-gradient-to-r ${cfg.gradient} text-white border-transparent shadow-lg`
                  : `bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 ${cfg.color} hover:border-current`
              }`}
            >
              <span className="material-symbols-outlined text-lg">{cfg.icon}</span>
              {type}
              <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                activeTab === type ? 'bg-white/20 text-white' : `${cfg.bg} ${cfg.color}`
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary Banner */}
      <div className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-5 text-white flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">{config.icon}</span>
          </div>
          <div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider">{activeTab}</p>
            <p className="text-xl font-black">{config.description}</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-white/70 text-xs font-bold uppercase">Serviços Disponíveis</p>
          <p className="text-3xl font-black">{filteredCatalog.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sub text-lg">search</span>
        <input
          type="text"
          placeholder="Pesquisar serviços..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className={`size-16 rounded-2xl flex items-center justify-center ${config.bg}`}>
            <span className={`material-symbols-outlined text-3xl ${config.color}`}>{config.icon}</span>
          </div>
          <div>
            <p className="font-black text-lg">Nenhum serviço encontrado</p>
            <p className="text-text-sub text-sm mt-1">
              {canManageCurrentTab ? 'Clique em "Novo Serviço" para adicionar o primeiro serviço.' : 'O catálogo ainda não tem serviços registados.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCatalog.map((item, idx) => (
            <div
              key={item.id}
              className={`group bg-white dark:bg-zinc-900 border-2 ${config.border} rounded-2xl p-5 flex flex-col gap-3 hover:shadow-lg transition-all hover:-translate-y-0.5`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <span className={`material-symbols-outlined text-lg ${config.color}`}>
                    {activeTab === 'Ocean Group' ? 'hub' : 'photo_camera'}
                  </span>
                </div>
                {canManageCurrentTab && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(item)}
                      className="size-7 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="size-7 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                      title="Remover"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="flex-1">
                <h3 className="font-black text-sm leading-tight">{item.name}</h3>
                {item.description && (
                  <p className="text-xs text-text-sub mt-1 leading-relaxed">{item.description}</p>
                )}
              </div>

              {/* Price */}
              <div className={`flex items-center justify-between pt-3 border-t ${config.border}`}>
                <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Preço Base</span>
                <span className={`text-lg font-black ${config.color}`}>
                  MT {item.price_mt.toLocaleString('pt-MZ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {!canManageCurrentTab && (
        <div className="flex items-center gap-2 text-xs text-text-sub bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-amber-500 text-sm">info</span>
          Para adicionar ou alterar preços, contacte o Gestor de Projetos.
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black">{editItem ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-text-sub hover:text-red-500 transition-colors">close</button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Catalog Type */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Catálogo</label>
                <div className="flex gap-2">
                  {(['Ocean Group', 'BMS Studio'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, catalog_type: type }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        form.catalog_type === type
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-200 dark:border-zinc-700 text-text-sub hover:border-primary'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Nome do Serviço *</label>
                <input
                  className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Ex: Gestão de Instagram"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Descrição (Opcional)</label>
                <textarea
                  rows={2}
                  className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-3 text-sm border-none focus:ring-2 focus:ring-primary outline-none resize-none"
                  placeholder="Breve descrição do que está incluído..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Price */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Preço Base (MT) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-text-sub">MT</span>
                  <input
                    type="number"
                    min="1"
                    className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-3 pl-9 text-sm border-none focus:ring-2 focus:ring-primary outline-none w-full font-bold"
                    placeholder="0"
                    value={form.price_mt}
                    onChange={e => setForm(p => ({ ...p, price_mt: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.price_mt || parseFloat(form.price_mt) <= 0}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-black text-sm uppercase shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'A guardar...' : (editItem ? 'Guardar Alterações' : 'Adicionar ao Catálogo')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
