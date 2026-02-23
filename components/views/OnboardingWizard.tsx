import React, { useState } from 'react';
import { UserRole } from '../../types';

interface OnboardingWizardProps {
    onFinish: (data: { role: UserRole; avatar: string; kpis: string[]; name: string }) => void;
}

const ROLES: { id: UserRole; title: string, desc: string, icon: string }[] = [
    { id: 'Gestor de Projectos', title: 'Gestor de Projectos', desc: 'Coordenação estratégica e execução técnica.', icon: 'account_tree' },
    { id: 'Gestor Criativo', title: 'Gestor Criativo', desc: 'Direção de arte e inovação visual.', icon: 'palette' },
    { id: 'Gestor de Parceiros e Clientes', title: 'Gestor de Parceiros e Clientes', desc: 'Relacionamento e expansão de mercado.', icon: 'handshake' },
    { id: 'Gestor de Trading e Negociação', title: 'Gestor de Trading e Negociação', desc: 'Operações financeiras e deals estratégicos.', icon: 'currency_exchange' },
    { id: 'Designer', title: 'Designer', desc: 'Produção visual e criativa.', icon: 'brush' },
    { id: 'Promoter de Venda', title: 'Promoter de Venda', desc: 'Prospecção e ativação comercial.', icon: 'campaign' },
    { id: 'Videomaker', title: 'Videomaker', desc: 'Captação e edição de vídeo.', icon: 'videocam' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onFinish }) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState({
        name: '',
        role: 'Gestor de Projectos' as UserRole,
        avatar: '', // User must upload or we use default
        kpis: ['ROI', 'Margem', 'Tarefas Concluídas']
    });

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const suggestions = ['Tempo de Resposta', 'Satisfação (CSAT)', 'Custo por Lead', 'NPS', 'Retenção', 'Volume de Trading'];

    const toggleKpi = (kpi: string) => {
        setData(prev => ({
            ...prev,
            kpis: prev.kpis.includes(kpi) ? prev.kpis.filter(i => i !== kpi) : [...prev.kpis, kpi]
        }));
    };

    const next = () => {
        if (step === 1 && !data.name) return alert('Por favor, informe seu nome.');
        setStep(s => s + 1);
    };
    const prev = () => setStep(s => s - 1);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl flex flex-col gap-8">
                {/* Progress Bar */}
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Onboarding Ocean</p>
                        <p className="text-text-sub text-[10px] font-black uppercase tracking-widest">Etapa {step} de 4</p>
                    </div>
                    <div className="h-1.5 bg-white dark:bg-zinc-900 rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800">
                        <div
                            className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,86,179,0.3)]"
                            style={{ width: `${(step / 4) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-8 lg:p-16 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-24 -mr-24 size-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>

                    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {step === 1 && (
                            <div className="flex flex-col gap-10">
                                <div className="text-center md:text-left">
                                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">Bem-vindo à Ocean</h1>
                                    <p className="text-text-sub text-lg font-medium">Como podemos te chamar?</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">Nome completo ou artístico</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-6 text-2xl font-black outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                                        placeholder="Ex: Alex Rivera"
                                        value={data.name}
                                        onChange={e => setData({ ...data, name: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex flex-col gap-10">
                                <div className="text-center md:text-left">
                                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">Qual seu cargo?</h1>
                                    <p className="text-text-sub text-lg font-medium">Selecione sua função principal na Ocean Group.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {ROLES.map((role) => (
                                        <button
                                            key={role.id}
                                            onClick={() => setData({ ...data, role: role.id })}
                                            className={`group p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 text-left relative overflow-hidden ${data.role === role.id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-gray-50 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 hover:border-gray-200 dark:hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${data.role === role.id ? 'bg-primary text-white scale-110 rotate-3 shadow-lg' : 'bg-white dark:bg-zinc-800 text-text-sub group-hover:bg-primary/10 group-hover:text-primary group-hover:-rotate-3'
                                                }`}>
                                                <span className="material-symbols-outlined text-2xl">{role.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg mb-1">{role.title}</h4>
                                                <p className="text-text-sub text-xs font-medium leading-relaxed">{role.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="flex flex-col gap-10">
                                <div className="text-center md:text-left">
                                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">Sua Foto</h1>
                                    <p className="text-text-sub text-lg font-medium">Deixe seu perfil com a sua cara.</p>
                                </div>

                                <div className="flex flex-col items-center justify-center gap-8 py-8">
                                    <div className="relative group">
                                        <div className={`size-48 rounded-[3rem] border-4 border-dashed flex items-center justify-center transition-all overflow-hidden ${data.avatar ? 'border-primary border-solid shadow-2xl shadow-primary/20' : 'border-gray-200 dark:border-zinc-700 hover:border-primary/50'}`}>
                                            {data.avatar ? (
                                                <img src={data.avatar} alt="Foto de Perfil" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-zinc-800">add_a_photo</span>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handlePhotoChange}
                                        />
                                    </div>
                                    <p className="text-xs font-black text-text-sub uppercase tracking-[0.2em]">Clique para fazer o upload</p>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="flex flex-col gap-8">
                                <div className="text-center md:text-left">
                                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">Métricas Chave</h1>
                                    <p className="text-text-sub text-lg font-medium">Selecione as métricas que mais importam para você.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-text-sub uppercase tracking-widest">Selecionados ({data.kpis.length})</h3>
                                        <div className="flex flex-wrap gap-2.5">
                                            {data.kpis.map(item => (
                                                <div key={item} className="flex items-center gap-2 pl-4 pr-1.5 py-2.5 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20">
                                                    {item}
                                                    <button onClick={() => toggleKpi(item)} className="hover:bg-white/20 rounded-lg p-1 transition-colors">
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-text-sub uppercase tracking-widest">Sugestões</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {suggestions.filter(s => !data.kpis.includes(s)).map(item => (
                                                <button
                                                    key={item}
                                                    onClick={() => toggleKpi(item)}
                                                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/30 border border-transparent hover:border-primary/20 text-xs font-black uppercase tracking-widest transition-all hover:bg-white dark:hover:bg-zinc-800 shadow-sm"
                                                >
                                                    {item}
                                                    <span className="material-symbols-outlined text-primary text-lg">add_circle</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-16 pt-8 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            {step > 1 ? (
                                <button
                                    onClick={prev}
                                    className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-text-sub hover:text-text-main transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Voltar
                                </button>
                            ) : <div></div>}

                            <button
                                onClick={step === 4 ? () => onFinish(data) : next}
                                className="bg-primary hover:bg-primary-dark text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-2xl shadow-primary/30 flex items-center gap-3 transform hover:-translate-y-1 active:scale-95 transition-all"
                            >
                                {step === 4 ? 'Finalizar Setup' : 'Próxima Etapa'}
                                <span className="material-symbols-outlined text-sm">
                                    {step === 4 ? 'task_alt' : 'arrow_forward'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
