import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Sparkles, Timer, ShieldAlert, Waves } from 'lucide-react';
import { OracleProfile } from '../types';
import { arrayBufferToBase64, float32ToInt16, base64ToUint8Array, int16ToFloat32 } from '../utils/audio-utils';

interface LiveOracleSessionProps {
  oracle: OracleProfile;
  avatarUrl: string;
  onEndSession: () => void;
}

const SESSION_DURATION = 480;

export const LiveOracleSession: React.FC<LiveOracleSessionProps> = ({ oracle, avatarUrl, onEndSession }) => {
  const [status, setStatus] = useState<'initial' | 'connecting' | 'connected' | 'error' | 'disconnected'>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectionStep, setConnectionStep] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<Promise<any> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
        cancelAnimationFrame(animationFrameRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        cleanupSession();
    };
  }, []);

  useEffect(() => {
    if (status === 'connected' && timeLeft > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { onEndSession(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [status]);

  const cleanupSession = () => {
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (processorRef.current) try { processorRef.current.disconnect(); } catch(e){}
    if (inputSourceRef.current) try { inputSourceRef.current.disconnect(); } catch(e){}
    if (audioContextRef.current) audioContextRef.current.close();
    if (sessionRef.current) sessionRef.current.then(s => { try { s.close(); } catch(e){} });
  };

  const startRitual = async () => {
    try {
      setStatus('connecting');
      setErrorMessage('');
      
      const ritualSteps = oracle.id === 'asian-elf' 
        ? ['Ouverture du Portail Lunaire...', 'Éveil des racines ancestrales...', 'Elara se manifeste...']
        : ['Purification du vide cosmique...', 'Ancrage du pont céleste...', 'Michael arrive...'];

      for (const step of ritualSteps) {
          setConnectionStep(step);
          await new Promise(r => setTimeout(r, 800));
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
      await outputAudioContext.resume();
      
      const analyser = outputAudioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      analyser.connect(outputAudioContext.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const voice = oracle.id === 'michael' ? 'Charon' : (oracle.id === 'asian-elf' ? 'Kore' : 'Puck');
      const systemInstruction = `Tu es ${oracle.name}, ${oracle.title}. ${oracle.description} Réponds toujours en français, avec sagesse et mystère.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction,
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        },
        callbacks: {
            onopen: () => {
                setStatus('connected');
                const source = audioContext.createMediaStreamSource(stream);
                inputSourceRef.current = source;
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;
                processor.onaudioprocess = (e) => {
                    if (isMicMuted) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = float32ToInt16(inputData);
                    const base64Data = arrayBufferToBase64(pcmData.buffer);
                    sessionPromise.then(session => session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: base64Data } }));
                };
                source.connect(processor);
                const dummyGain = audioContext.createGain();
                dummyGain.gain.value = 0;
                processor.connect(dummyGain);
                visualizeAudio();
            },
            onmessage: async (msg: LiveServerMessage) => {
                const modelAudio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (modelAudio) {
                    setIsSpeaking(true);
                    const audioBytes = base64ToUint8Array(modelAudio);
                    const float32 = int16ToFloat32(new Int16Array(audioBytes.buffer));
                    const buffer = outputAudioContext.createBuffer(1, float32.length, 24000);
                    buffer.getChannelData(0).set(float32);
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(analyser);
                    const now = outputAudioContext.currentTime;
                    const startTime = Math.max(now, nextStartTimeRef.current);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + buffer.duration;
                    source.onended = () => { if (outputAudioContext.currentTime >= nextStartTimeRef.current - 0.05) setIsSpeaking(false); };
                }
            },
            onclose: () => setStatus('disconnected'),
            onerror: (e) => { setStatus('error'); setErrorMessage(e.message || "Interruption astrale."); }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || "Les étoiles sont voilées.");
    }
  };

  const visualizeAudio = () => {
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      setVolume(sum / dataArray.length);
      animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  };

  const portalColor = oracle.id === 'asian-elf' ? 'emerald' : 'amber';
  const speakScale = 1 + (isSpeaking ? (volume / 200) : 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden font-serif flex flex-col items-center justify-center animate-fade-in">
        <div className="absolute inset-0 bg-[#000001]">
            <div className={`absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] ${oracle.id === 'asian-elf' ? 'from-emerald-950/30' : 'from-indigo-950/30'} via-black to-black`}></div>
        </div>

        <div className="relative z-50 flex flex-col items-center w-full max-w-5xl px-8 h-full">
            {status === 'initial' && (
                <div className="flex flex-col items-center gap-12 animate-fade-in-up text-center h-full justify-center">
                    <h1 className="text-6xl md:text-8xl font-serif text-white tracking-[0.3em] uppercase">{oracle.name}</h1>
                    <button onClick={startRitual} className={`group relative px-20 py-8 border border-${portalColor}-500/20 text-${portalColor}-200/80 font-serif text-2xl tracking-[0.4em] uppercase hover:bg-${portalColor}-500/5 transition-all rounded-full`}>
                        <Sparkles size={28} className={`text-${portalColor}-500 group-hover:rotate-12 transition-transform mr-4 inline`} />
                        Entrer en Communion
                    </button>
                    <button onClick={onEndSession} className="text-white/20 uppercase tracking-[0.3em] text-xs">Annuler le Rituel</button>
                </div>
            )}

            {status === 'connecting' && (
                <div className="flex flex-col items-center gap-10 h-full justify-center text-center">
                     <Waves className={`w-24 h-24 text-${portalColor}-500/40 animate-pulse`} />
                     <span className="text-3xl font-light tracking-[0.5em] uppercase text-white/60">{connectionStep}</span>
                </div>
            )}

            {status === 'connected' && (
                <div className="flex flex-col items-center justify-between w-full h-full py-16">
                    <div className="absolute top-8 left-8 flex items-center gap-3 px-6 py-3 bg-black/40 border border-white/10 rounded-full z-[70]">
                        <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'text-red-500' : 'text-amber-500'}`} />
                        <span className="text-xl font-mono text-amber-200">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
                    </div>

                    <div className="relative flex-grow flex items-center justify-center w-full">
                        <div className="relative w-72 h-72 md:w-[480px] md:h-[480px]">
                            <div className={`absolute inset-[-40px] rounded-full bg-${portalColor}-500/5 blur-[120px] transition-all duration-300`} style={{ transform: `scale(${speakScale})`, opacity: isSpeaking ? 0.4 : 0.1 }}></div>
                            
                            <div className="w-full h-full rounded-full overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,1)] border border-white/5 bg-zinc-950 flex items-center justify-center" style={{ maskImage: 'radial-gradient(circle, black 65%, transparent 100%)' }}>
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={avatarUrl} className={`w-full h-full object-cover transition-all duration-500 ${isSpeaking ? 'scale-105 brightness-110' : 'brightness-50 grayscale'}`} alt="Oracle Astral" />
                                    {isSpeaking && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent animate-pulse pointer-events-none"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 bg-black/60 backdrop-blur-xl border border-white/10 px-10 py-6 rounded-full shadow-2xl">
                        <button onClick={() => setIsMicMuted(!isMicMuted)} className={`p-6 rounded-full transition-all ${isMicMuted ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                            {isMicMuted ? <MicOff size={32} /> : <Mic size={32} />}
                        </button>
                        <button onClick={onEndSession} className="px-12 py-5 bg-red-950/40 border border-red-500/20 text-red-500 rounded-full font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-red-500 hover:text-white transition-all">
                            Rompre le lien
                        </button>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="flex flex-col items-center gap-10 h-full justify-center text-center">
                     <div className="p-12 rounded-full bg-red-500/5 border border-red-500/10">
                         <ShieldAlert className="text-red-500/40 w-24 h-24" />
                     </div>
                     <h3 className="text-3xl uppercase tracking-widest font-serif">Rituel Interrompu</h3>
                     <p className="text-red-400/60 text-sm max-w-md italic">{errorMessage}</p>
                     <button onClick={() => window.location.reload()} className="px-16 py-6 bg-white/5 border border-white/10 rounded-full text-white/60 uppercase tracking-[0.4em] text-xs hover:bg-white/10 transition-all">Rallumer la flamme</button>
                </div>
            )}
        </div>
    </div>
  );
};