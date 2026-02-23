import React, { useEffect, useRef, useState } from 'react';
import { getAIClient } from '../services/geminiService';
import { Task, Transaction } from '../types';

interface LiveAssistantProps {
  onClose: () => void;
  onAddTask?: (task: Omit<Task, 'id' | 'status'>) => Task;
  onAddFinancial?: (transaction: Omit<Transaction, 'id' | 'status'>) => Transaction;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose, onAddTask, onAddFinancial }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'closed' | 'error'>('connecting');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);

  const decode = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    } catch (e) {
      console.error('Error decoding base64 audio:', e);
      return new Uint8Array(0);
    }
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    if (data.length === 0) return null;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  useEffect(() => {
    let active = true;
    const ai = getAIClient();

    const initAssistant = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = audioContextRef.current.createGain();
        outputNode.connect(audioContextRef.current.destination);

        const tools: any = [{
          function_declarations: [
            {
              name: 'add_task',
              description: 'Adiciona uma nova tarefa ao sistema.',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  project: { type: 'string' },
                  responsible: { type: 'string' },
                  startDate: { type: 'string' },
                  dueDate: { type: 'string' },
                },
                required: ['title', 'project', 'responsible', 'startDate', 'dueDate']
              }
            },
            {
              name: 'add_financial_record',
              description: 'Registra uma nova movimentação financeira.',
              parameters: {
                type: 'object',
                properties: {
                  desc: { type: 'string' },
                  val: { type: 'number' },
                  type: { type: 'string' },
                  cat: { type: 'string' },
                  date: { type: 'string' }
                },
                required: ['desc', 'val', 'type', 'cat', 'date']
              }
            }
          ]
        }];

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.0-flash-exp',
          callbacks: {
            onopen: () => {
              if (!active) return;
              setStatus('active');
              sessionPromise.then(s => s.sendRealtimeInput({ text: "Sistema operacional online. Pode comandar novas tarefas ou lançamentos." }));
            },
            onmessage: async (message: any) => {
              if (!active) return;

              const parts = message.serverContent?.modelTurn?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.call_tool) {
                    const toolCalls = part.call_tool.tool_calls;
                    const functionResponses = toolCalls.map((call: any) => {
                      let response: any = { error: 'Unknown tool' };
                      if (call.name === 'add_task') {
                        const t = onAddTask?.(call.args);
                        response = { output: `Sucesso ao criar tarefa: ${t ? t.title : '?'}` };
                      } else if (call.name === 'add_financial_record') {
                        const f = onAddFinancial?.(call.args);
                        response = { output: `Sucesso: MT ${f ? f.val : '0'} registrado.` };
                      }
                      return { name: call.name, id: call.id, response };
                    });
                    sessionPromise.then(s => s.sendToolResponse({ functionResponses }));
                  }

                  if (part.inlineData?.data && audioContextRef.current) {
                    const ctx = audioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    const decoded = decode(part.inlineData.data);
                    const audioBuffer = await decodeAudioData(decoded, ctx, 24000, 1);
                    if (audioBuffer) {
                      const source = ctx.createBufferSource();
                      source.buffer = audioBuffer;
                      source.connect(outputNode);
                      source.addEventListener('ended', () => sourcesRef.current.delete(source));
                      source.start(nextStartTimeRef.current);
                      nextStartTimeRef.current += audioBuffer.duration;
                      sourcesRef.current.add(source);
                    }
                  }
                }
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: () => { if (active) setStatus('closed'); },
            onerror: (e) => {
              console.error('Live Assistant Error:', e);
              if (active) setStatus('error');
            },
          },
          config: {
            responseModalities: ['audio' as any],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: 'Você é um assistente operacional. Use add_task e add_financial_record quando o usuário solicitar.',
            tools
          }
        });

        sessionRef.current = sessionPromise;
      } catch (err) {
        console.error('Failed to initialize AI Assistant:', err);
        if (active) setStatus('error');
      }
    };

    initAssistant();

    return () => {
      active = false;
      sessionRef.current?.then((s: any) => s.close());
      audioContextRef.current?.close();
      micStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-zinc-800/50 flex flex-col items-center gap-8 overflow-hidden">
        <div className="relative flex items-center justify-center">
          <div className={`absolute inset-0 bg-primary/20 rounded-full animate-ping ${status === 'active' ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className={`relative size-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${status === 'active' ? 'bg-primary shadow-primary/40 scale-110' :
            status === 'error' ? 'bg-red-500 shadow-red-500/40' : 'bg-zinc-200 dark:bg-zinc-800'
            }`}>
            <span className={`material-symbols-outlined text-4xl filled ${status === 'active' ? 'text-white' : 'text-zinc-400'}`}>
              {status === 'error' ? 'error' : 'mic'}
            </span>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-black mb-2 tracking-tight">Assistant Ocean</h3>
          <p className="text-text-sub text-sm font-medium px-4">
            {status === 'connecting' ? 'Iniciando sistema...' :
              status === 'error' ? 'Erro de conexão.' :
                'Sistema Operacional Ativo.'}
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-text-sub px-1 uppercase">
            <span>Rede Neural</span>
            <span className={`flex items-center gap-1.5 ${status === 'active' ? 'text-green-500' : 'text-zinc-500'}`}>
              <span className={`size-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-current'}`}></span>
              {status === 'active' ? 'ONLINE' : status.toUpperCase()}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full bg-primary transition-all duration-1000 ${status === 'active' ? 'w-full' : 'w-0'}`}></div>
          </div>
        </div>

        <div className="grid grid-cols-1 w-full gap-3">
          <button
            onClick={onClose}
            className="w-full py-4 bg-zinc-100 dark:bg-zinc-900 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">power_settings_new</span>
            Encerrar
          </button>
        </div>

        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-32 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};
