
import React, { useState, useEffect, useRef } from 'react';
import { getGeminiService } from './services/gemini';
import { TarotCardComponent } from './components/TarotCard';
import { LiveOracleSession } from './components/LiveOracleSession';
import { TarotCard, AppState, DeckType, SpreadConfig, OracleProfile, SoulmateReading } from './types';
import { Sparkles, Moon, Stars, Heart, Calendar, ChevronDown, Wand2, MonitorPlay, Crown, MapPin, ArrowLeft, Loader2, Briefcase, ImagePlus, Footprints, Bird, Zap, Eye, Fingerprint, Search, UserCircle2, Settings2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { lookupViaCity } from 'city-timezones';

const MAJOR_ARCANA_BASE = ["The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance", "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World"];
const THOTH_RENAMES: Record<string, string> = { "Strength": "Lust", "Justice": "Adjustment", "Temperance": "Art", "Judgement": "The Aeon", "The World": "The Universe" };
const DECKS: { id: DeckType; name: string; desc: string; color: string }[] = [
  { id: 'rider', name: 'Rider Waite', desc: 'Classic Symbolism', color: 'text-blue-400' },
  { id: 'marseille', name: 'Marseille', desc: 'Ancient Woodcut', color: 'text-amber-500' },
  { id: 'thoth', name: 'Thoth', desc: 'Esoteric', color: 'text-emerald-400' },
];

const INITIAL_ORACLES: OracleProfile[] = [
  { 
    id: 'michael', 
    name: 'Michael', 
    title: 'The Cosmic Sentinel', 
    description: 'Guardian of universal truths and solar destiny.', 
    imagePrompt: 'Portrait of Michael', 
    baseImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 
    simliFaceId: process.env.SIMLI_FACE_ID_MICHAEL || '', 
    simliApiKey: process.env.SIMLI_API_KEY || '', 
    price: 45, 
    tags: ['Solar Wisdom', 'Stability', 'Destiny'] 
  },
  { 
    id: 'asian-elf', 
    name: 'Elara', 
    title: 'The Moon Seer', 
    description: 'Bridge between the natural world and the astral plane.', 
    imagePrompt: 'Portrait of Elara', 
    baseImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', 
    simliFaceId: '6de27680-7eb0-4f9c-8968-07612c155624', 
    simliApiKey: process.env.SIMLI_API_KEY || '', 
    price: 55, 
    tags: ['Lunar Intuition', 'Soul Ties', 'Nature'] 
  },
  { 
    id: 'serafina', 
    name: 'Serafina', 
    title: 'The Seraphic Weaver', 
    description: 'Master of the golden threads that bind two souls.', 
    imagePrompt: 'Portrait of Serafina', 
    baseImage: 'https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&w=400&q=80', 
    simliFaceId: process.env.SIMLI_FACE_ID_SERAFINA || '', 
    simliApiKey: process.env.SIMLI_API_KEY || '', 
    price: 65, 
    tags: ['Alchemy', 'Harmony', 'Eternal Love'] 
  }
];

const SPREADS: SpreadConfig[] = [
  { id: 'daily', name: 'Daily Inspiration', description: 'A single-card draw.', cardCount: 1, positions: ['Today'], imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' },
  { id: 'yesno', name: 'Yes or No Oracle', description: 'Clear binary answer.', cardCount: 1, positions: ['Answer'], imageUrl: 'https://images.unsplash.com/photo-1494200483035-db7bc6aa5739?auto=format&fit=crop&w=400&q=80' },
  { id: 'decisions', name: 'The Crossroads', description: 'Three card decision spread.', cardCount: 3, positions: ['Current', 'Path', 'Outcome'], imageUrl: 'https://images.unsplash.com/photo-1464802686167-b939a67e06a1?auto=format&fit=crop&w=400&q=80' },
  { id: 'love', name: 'The Love Tarot', description: 'Matters of the heart.', cardCount: 6, positions: ['You', 'Them', 'Dynamic', 'Past', 'Future', 'Advice'], imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=400&q=80', isPremium: true },
  { id: 'insight', name: 'The Deep Insight', description: 'Comprehensive look.', cardCount: 6, positions: ['Core', 'Hidden', 'Immediate', 'Soul', 'External', 'Outcome'], imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80', isPremium: true },
  { id: 'celtic', name: 'Celtic Cross', description: 'Classic ten card spread.', cardCount: 10, positions: ['Heart', 'Crossing', 'Root', 'Past', 'Crown', 'Future', 'Self', 'External', 'Hopes', 'Outcome'], imageUrl: 'https://images.unsplash.com/photo-1433086566608-4670060934f8?auto=format&fit=crop&w=400&q=80', isPremium: true },
];

export default function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [selectedDeck, setSelectedDeck] = useState<DeckType>('rider');
  const [selectedSpread, setSelectedSpread] = useState<SpreadConfig>(SPREADS[0]);
  const [deck, setDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [readingText, setReadingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeckMenuOpen, setIsDeckMenuOpen] = useState(false);
  const [liveSessionActive, setLiveSessionActive] = useState<{active: boolean, oracleId?: string}>({active: false});
  const [oracles, setOracles] = useState<OracleProfile[]>(INITIAL_ORACLES);

  const [soulmateForm, setSoulmateForm] = useState({ date: '', time: '12:00', place: '', gender: 'female', interest: 'male' });
  const [soulmateImage, setSoulmateImage] = useState<string | null>(null);
  const [soulmateReading, setSoulmateReading] = useState<SoulmateReading | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const deckMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const oracleFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingOracleId, setUploadingOracleId] = useState<string | null>(null);

  useEffect(() => {
    const cardNames = MAJOR_ARCANA_BASE.map(name => (selectedDeck === 'thoth' && THOTH_RENAMES[name]) ? THOTH_RENAMES[name] : name);
    const newDeck = cardNames.map((name, i) => ({ id: `card-${i}`, name, isReversed: Math.random() < 0.3, meaningUpright: '', meaningReversed: '' }));
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    setDeck(newDeck);
  }, [selectedDeck]);

  const handleOracleImageUpload = (id: string) => {
    setUploadingOracleId(id);
    oracleFileInputRef.current?.click();
  };

  const onOracleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingOracleId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result;
          setOracles(prev => prev.map(o => o.id === uploadingOracleId ? { ...o, baseImage: base64 } : o));
        }
      };
      reader.readAsDataURL(file);
    }
    setUploadingOracleId(null);
  };

  const handlePlaceInput = (value: string) => {
    setSoulmateForm({...soulmateForm, place: value});
    if (value.length >= 2) {
      try {
        const results = lookupViaCity(value);
        const suggestions = results.slice(0, 10).map(r => `${r.city}, ${r.country}`).filter((city, index, self) => self.indexOf(city) === index);
        setCitySuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) { setShowSuggestions(false); }
    } else { setShowSuggestions(false); }
  };

  const resetExperience = () => {
    setAppState('home');
    setSelectedIndices([]);
    setReadingText('');
    setSoulmateReading(null);
    setSoulmateImage(null);
    setIsLoading(false);
  };

  const handleSpreadSelect = (spread: SpreadConfig) => {
    setSelectedSpread(spread);
    setAppState('shuffling');
    setTimeout(() => setAppState('picking'), 1500);
  };

  const handleCardClick = (index: number) => {
    if (selectedIndices.includes(index)) return;
    if (selectedIndices.length < selectedSpread.cardCount) {
      const newSelection = [...selectedIndices, index];
      setSelectedIndices(newSelection);
      if (newSelection.length === selectedSpread.cardCount) setTimeout(() => handleReveal(newSelection), 800);
    }
  };

  const handleReveal = async (finalIndices: number[]) => {
    setAppState('revealing');
    const gemini = getGeminiService();
    setDeck(prevDeck => prevDeck.map((card, idx) => finalIndices.includes(idx) ? { ...card, isLoadingImage: true } : card));
    await Promise.all(finalIndices.map(async (deckIndex) => {
      const card = deck[deckIndex];
      const base64Image = await gemini.generateCardImage(card.name, selectedDeck);
      setDeck(prevDeck => prevDeck.map((c, i) => i === deckIndex ? { ...c, image: base64Image, isLoadingImage: false } : c));
    }));
  };

  const generateReading = async () => {
    setAppState('reading');
    setIsLoading(true);
    const result = await getGeminiService().getTarotReading("General Guidance", selectedIndices.map(idx => deck[idx]), selectedDeck, selectedSpread);
    setReadingText(result);
    setIsLoading(false);
  };

  const activeOracle = oracles.find(o => o.id === liveSessionActive.oracleId);

  return (
    <div className="min-h-screen bg-[#020205] text-white selection:bg-amber-500/30 overflow-x-hidden font-sans">
      <input ref={oracleFileInputRef} type="file" accept="image/*" className="hidden" onChange={onOracleFileChange} />

      {liveSessionActive.active && activeOracle && (
        <LiveOracleSession oracle={activeOracle} avatarUrl={activeOracle.baseImage} onEndSession={() => setLiveSessionActive({active: false})} />
      )}

      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={resetExperience}>
          <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-all"><Stars className="text-amber-400 w-5 h-5" /></div>
          <span className="text-xl font-serif tracking-[0.2em] uppercase bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Celestial</span>
        </div>
        <div className="flex items-center gap-8">
          <div ref={deckMenuRef} className="relative">
            <button onClick={() => setIsDeckMenuOpen(!isDeckMenuOpen)} className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all">
              <span className="text-xs uppercase tracking-widest text-amber-200/60 font-bold">Deck:</span>
              <span className="text-xs uppercase tracking-widest font-bold">{DECKS.find(d => d.id === selectedDeck)?.name}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDeckMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDeckMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a0a12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up">
                {DECKS.map(d => (
                  <button key={d.id} onClick={() => { setSelectedDeck(d.id); setIsDeckMenuOpen(false); }} className="w-full px-6 py-4 text-left hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                    <div className={`text-xs uppercase tracking-widest font-bold ${selectedDeck === d.id ? 'text-amber-400' : 'text-white/60'}`}>{d.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-black font-bold text-xs uppercase tracking-widest rounded-full hover:bg-amber-400 transition-all"><Crown size={14} /> Inner Circle</button>
        </div>
      </nav>

      {appState === 'home' && (
        <main className="pt-32 pb-20 animate-fade-in">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-12">
              <div className="space-y-4">
                <h2 className="text-5xl md:text-7xl font-serif leading-tight">Consult the <br/><span className="italic text-amber-200/80">Great Mysteries</span></h2>
                <p className="text-slate-400 text-lg max-w-xl font-light">Select a path for your inquiry.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SPREADS.map(spread => (
                  <div key={spread.id} onClick={() => handleSpreadSelect(spread)} className="group relative h-80 rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/5 hover:border-amber-500/30 transition-all">
                    <img src={spread.imageUrl} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-transform duration-1000 group-hover:scale-105" alt={spread.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 p-8 flex flex-col justify-end gap-3">
                      <h3 className="text-2xl font-serif tracking-wide">{spread.name}</h3>
                      <p className="text-sm text-slate-300 font-light">{spread.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-12">
              <div className="p-8 rounded-[3rem] bg-indigo-950/20 border border-white/5 space-y-8">
                <div className="flex items-center gap-3"><MonitorPlay className="text-amber-400" /><h3 className="text-xl font-serif uppercase tracking-widest">Live Oracles</h3></div>
                {oracles.map(o => (
                  <div key={o.id} className="group relative flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                    <div 
                      className="relative w-14 h-14 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all flex items-center justify-center bg-zinc-900"
                      onClick={() => setLiveSessionActive({active: true, oracleId: o.id})}
                    >
                      <OracleAvatar src={o.baseImage} name={o.name} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <MonitorPlay size={16} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-grow" onClick={() => setLiveSessionActive({active: true, oracleId: o.id})}>
                      <h4 className="font-bold text-amber-200">{o.name}</h4>
                      <p className="text-[10px] uppercase tracking-widest text-white/40">{o.title}</p>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOracleImageUpload(o.id); }}
                        className="p-2 bg-white/5 rounded-xl hover:bg-white/20 transition-all text-white/40 hover:text-amber-400"
                        title="Remplacer la photo"
                      >
                        <ImagePlus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-white/20 italic text-center px-4">Utilisez l'icône <ImagePlus size={10} className="inline" /> pour personnaliser vos Oracles.</p>
              </div>
              <div className="p-1 w-full rounded-[3rem] bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20">
                <div className="bg-[#020205] p-8 rounded-[2.9rem] space-y-6 text-center">
                  <Heart className="text-pink-400 w-12 h-12 mx-auto" />
                  <h3 className="text-2xl font-serif">Who is your <br/><span className="text-pink-400">Soulmate?</span></h3>
                  <button onClick={() => setAppState('soulmate-form')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-xs uppercase tracking-[0.3em] font-bold hover:bg-pink-500 hover:text-white transition-all">Begin Vision</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Soulmate Form */}
      {appState === 'soulmate-form' && (
        <div className="min-h-screen pt-32 px-6 flex flex-col items-center animate-fade-in overflow-y-auto pb-20">
          <div className="max-w-2xl w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 space-y-10 shadow-2xl">
            <div className="flex items-center justify-between">
              <button onClick={() => setAppState('home')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><ArrowLeft size={20} /></button>
              <Heart className="text-pink-400 w-8 h-8 animate-pulse" />
              <div className="w-10" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-serif">The <span className="text-pink-400">Soul Sanctuary</span></h2>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.4em]">Aligning the stars with your origin</p>
            </div>
            {/* Form inputs... */}
            <div className="space-y-8">
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] uppercase tracking-widest text-white/30 ml-2">Birth Date</label><input type="date" value={soulmateForm.date} onChange={e => setSoulmateForm({...soulmateForm, date: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm outline-none focus:border-pink-500/50" /></div>
                <div className="space-y-2"><label className="text-[10px] uppercase tracking-widest text-white/30 ml-2">Birth Time</label><input type="time" value={soulmateForm.time} onChange={e => setSoulmateForm({...soulmateForm, time: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm outline-none focus:border-pink-500/50" /></div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/30 ml-2">Place of Birth</label>
                <input type="text" value={soulmateForm.place} onChange={e => handlePlaceInput(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm outline-none focus:border-pink-500/50" placeholder="City, Country" />
              </div>
              <button onClick={() => setAppState('soulmate-processing')} className="w-full py-6 bg-pink-500 rounded-full font-bold uppercase tracking-widest text-xs">Summon Vision</button>
            </div>
          </div>
        </div>
      )}

      {/* Picking and Shuffling states... */}
      {['shuffling', 'picking', 'revealing', 'reading'].includes(appState) && (
        <div className="pt-32 px-6 flex flex-col items-center">
          {appState === 'picking' && (
            <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
              {deck.map((card, idx) => (
                <TarotCardComponent key={card.id} index={idx} isRevealed={false} isSelected={selectedIndices.includes(idx)} onClick={() => handleCardClick(idx)} deckType={selectedDeck} />
              ))}
            </div>
          )}
          {appState === 'revealing' && (
            <div className="flex flex-wrap justify-center gap-8 max-w-7xl">
              {selectedIndices.map((idx, i) => (
                <TarotCardComponent key={deck[idx].id} index={i} card={deck[idx]} isRevealed={true} deckType={selectedDeck} label={selectedSpread.positions[i]} />
              ))}
              <div className="w-full flex justify-center mt-12"><button onClick={generateReading} className="px-12 py-5 bg-amber-500 text-black font-bold uppercase tracking-[0.4em] rounded-full hover:scale-105 transition-all flex items-center gap-4"><Wand2 /> Interpret Reading</button></div>
            </div>
          )}
          {appState === 'reading' && (
            <div className="max-w-4xl mx-auto p-12 rounded-[3rem] bg-white/5 border border-white/5 shadow-2xl animate-fade-in">
              <div className="prose prose-invert prose-amber max-w-none">
                <ReactMarkdown>{readingText}</ReactMarkdown>
              </div>
              <button onClick={resetExperience} className="mt-12 text-amber-500 uppercase tracking-widest font-bold">New Inquiry</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OracleAvatar({ src, name }: { src: string, name: string }) {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [src]);
  if (error || !src) return <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/20"><UserCircle2 size={24} /></div>;
  return <img src={src} className="w-full h-full object-cover" alt={name} onError={() => setError(true)} />;
}
