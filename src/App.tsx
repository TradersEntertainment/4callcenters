import React, { useState, useEffect } from 'react';
import { Search, MapPin, Building2, Phone, Loader2, AlertCircle, Mail, Globe, Users, ExternalLink, Smartphone, Instagram, Star, MessageSquare, Lightbulb, Menu, X, Filter, EyeOff, StickyNote, Save, Bell, Clock, Youtube, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { searchBusinesses, Business, CreativeFilter } from './services/geminiService';
import { generateSalesPitch } from './services/groqService';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SECTOR_GROUPS = [
  {
    title: "Hizmet & Perakende (Spot, Diyet, Güzellik vb.)",
    items: [
      'Güzellik & Kuaför',
      'Diyetisyen & Beslenme',
      'Spor Salonu & Fitness',
      'Spot & İkinci El Eşya',
      'Restoran & Kafe',
      'Turizm & Otelcilik',
      'Otomotiv & Galeri',
      'Organizasyon & Etkinlik'
    ]
  },
  {
    title: "Üretim & Ticaret (Market, Tekstil, İnşaat vb.)",
    items: [
      'Üretim & Fabrika',
      'Tekstil & Giyim',
      'Market & Süpermarket',
      'Mobilya & Dekorasyon',
      'İnşaat & Emlak',
      'Bilişim & Yazılım',
      'Toptan Gıda & İçecek',
      'Lojistik & Nakliye'
    ]
  }
];

function MapUpdater({ businesses }: { businesses: Business[] }) {
  const map = useMap();
  useEffect(() => {
    if (businesses.length > 0) {
      const validBusinesses = businesses.filter(b => b.latitude && b.longitude);
      if (validBusinesses.length > 0) {
        const bounds = L.latLngBounds(validBusinesses.map(b => [b.latitude!, b.longitude!]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [businesses, map]);
  return null;
}

export default function App() {
  const [city, setCity] = useState('');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([SECTOR_GROUPS[0].items[0]]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string>('');
  const [error, setError] = useState('');
  const [onlyMobile, setOnlyMobile] = useState(false);
  const [requireInstagram, setRequireInstagram] = useState(false);
  const [creativeFilter, setCreativeFilter] = useState<CreativeFilter>('none');
  const [country, setCountry] = useState<'Türkiye' | 'Kıbrıs'>('Türkiye');
  const [showResultsPanel, setShowResultsPanel] = useState(true);
  const [yearFilter, setYearFilter] = useState<'all' | 'new' | 'old'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'low' | 'high'>('all');
  const [pitchLoading, setPitchLoading] = useState<string | null>(null);
  const [pitchModal, setPitchModal] = useState<{ isOpen: boolean; content: string; businessName: string } | null>(null);

  // Local Storage State
  const [hiddenBusinesses, setHiddenBusinesses] = useState<string[]>(() => {
    const saved = localStorage.getItem('hiddenBusinesses');
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('businessNotes');
    return saved ? JSON.parse(saved) : {};
  });

  const [reminders, setReminders] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('businessReminders');
    return saved ? JSON.parse(saved) : {};
  });

  const [noteModal, setNoteModal] = useState<{ isOpen: boolean; businessName: string; initialNote: string } | null>(null);
  const [reminderModal, setReminderModal] = useState<{ isOpen: boolean; businessName: string } | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('hiddenBusinesses', JSON.stringify(hiddenBusinesses));
  }, [hiddenBusinesses]);

  useEffect(() => {
    localStorage.setItem('businessNotes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('businessReminders', JSON.stringify(reminders));
  }, [reminders]);

  const handleHideBusiness = (name: string) => {
    setHiddenBusinesses(prev => [...prev, name]);
  };

  const handleSaveNote = (name: string, text: string) => {
    setNotes(prev => ({ ...prev, [name]: text }));
    setNoteModal(null);
  };

  const handleSetReminder = (name: string, minutes: number) => {
    const timestamp = Date.now() + minutes * 60 * 1000;
    setReminders(prev => ({ ...prev, [name]: timestamp }));
    setReminderModal(null);
  };

  const handleRemoveReminder = (name: string) => {
    setReminders(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleResetData = () => {
    if (confirm('Tüm kayıtlı notları, hatırlatıcıları ve gizlenen firmaları silmek istediğinize emin misiniz?')) {
      setHiddenBusinesses([]);
      setNotes({});
      setReminders({});
      localStorage.removeItem('hiddenBusinesses');
      localStorage.removeItem('businessNotes');
      localStorage.removeItem('businessReminders');
      alert('Tüm veriler sıfırlandı.');
    }
  };

  const filteredBusinesses = businesses.filter(b => {
    if (hiddenBusinesses.includes(b.name)) return false;
    let matches = true;

    // Mobile Filter
    if (onlyMobile) {
      if (!b.phones || !b.phones.some(p => {
        const cleaned = p.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.slice(-10).startsWith('5');
      })) {
        matches = false;
      }
    }

    // Instagram Filter
    if (requireInstagram) {
      if (!b.instagram || b.instagram === 'Bilinmiyor') {
        matches = false;
      }
    }

    // Year Filter
    if (yearFilter !== 'all' && b.establishmentYear) {
      const year = parseInt(b.establishmentYear);
      if (!isNaN(year)) {
        const currentYear = new Date().getFullYear();
        if (yearFilter === 'new') {
          // Last 5 years
          if (year < currentYear - 5) matches = false;
        } else if (yearFilter === 'old') {
          // Older than 5 years
          if (year >= currentYear - 5) matches = false;
        }
      }
    }

    // Review Count Filter
    if (reviewFilter !== 'all') {
      const count = b.reviewCount || 0;
      if (reviewFilter === 'low') {
        // Less than 20 reviews
        if (count >= 20) matches = false;
      } else if (reviewFilter === 'high') {
        // 20 or more reviews
        if (count < 20) matches = false;
      }
    }

    return matches;
  });

  const handleSearch = async (isLoadMore = false) => {
    if (!city) {
      setError('Lütfen bir şehir veya bölge adı girin.');
      return;
    }

    if (selectedSectors.length === 0) {
      setError('Lütfen en az bir sektör seçin.');
      return;
    }

    setError('');
    if (isLoadMore) {
      if (!nextPageToken) {
        setLoadingMore(false);
        return; // No more results
      }
      setLoadingMore(true);
    } else {
      setLoading(true);
      setBusinesses([]);
      setNextPageToken('');
      setShowResultsPanel(true);
    }

    try {
      const excludeNames = isLoadMore ? businesses.map(b => b.name) : [];
      const response = await searchBusinesses(
        city,
        selectedSectors,
        excludeNames,
        requireInstagram,
        creativeFilter,
        country,
        isLoadMore ? nextPageToken : ''
      );

      const newBusinesses = response.businesses;
      setNextPageToken(response.nextPageToken);

      if (onlyMobile) {
        const mobileBusinesses = newBusinesses.filter(b =>
          b.phones.some(p => p.startsWith('05'))
        );
        if (isLoadMore) {
          setBusinesses(prev => {
            // Filter duplicates manually just in case
            const existingNames = new Set(prev.map(b => b.name));
            const uniqueNew = mobileBusinesses.filter(b => !existingNames.has(b.name));
            return [...prev, ...uniqueNew];
          });
        } else {
          setBusinesses(mobileBusinesses);
        }
      } else {
        if (isLoadMore) {
          setBusinesses(prev => {
            const existingNames = new Set(prev.map(b => b.name));
            const uniqueNew = newBusinesses.filter(b => !existingNames.has(b.name));
            return [...prev, ...uniqueNew];
          });
        } else {
          setBusinesses(newBusinesses);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Veriler çekilirken bir hata oluştu. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleGeneratePitch = async (business: Business) => {
    setPitchLoading(business.name);
    try {
      const pitch = await generateSalesPitch(business.name, business.sector, city);
      setPitchModal({ isOpen: true, content: pitch, businessName: business.name });
    } catch (err) {
      console.error(err);
      setError('Satış metni oluşturulurken bir hata oluştu.');
    } finally {
      setPitchLoading(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Pitch Modal */}
      {pitchModal && pitchModal.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Satış Stratejisi</h3>
                  <p className="text-sm text-gray-500 font-medium">{pitchModal.businessName}</p>
                </div>
              </div>
              <button
                onClick={() => setPitchModal(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
              <div className="prose prose-blue max-w-none text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                {pitchModal.content}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pitchModal.content);
                  // Optional: Show toast
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Kopyala
              </button>
              <button
                onClick={() => setPitchModal(null)}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-600/20"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteModal && noteModal.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Müşteri Notu</h3>
                  <p className="text-xs text-gray-500 font-medium">{noteModal.businessName}</p>
                </div>
              </div>
              <button
                onClick={() => setNoteModal(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 bg-white">
              <textarea
                id="businessNote"
                defaultValue={noteModal.initialNote}
                className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm text-gray-700"
                placeholder="Bu firma ile yaptığınız görüşmelerin özetini veya önemli notlarınızı buraya yazın..."
              ></textarea>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setNoteModal(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  const text = (document.getElementById('businessNote') as HTMLTextAreaElement).value;
                  handleSaveNote(noteModal.businessName, text);
                }}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {reminderModal && reminderModal.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-700">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Hatırlatıcı Kur</h3>
                  <p className="text-xs text-gray-500 font-medium">{reminderModal.businessName}</p>
                </div>
              </div>
              <button
                onClick={() => setReminderModal(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 bg-white space-y-3">
              <p className="text-sm text-gray-600 font-medium mb-4">Bu firmayı tekrar ne zaman aramak veya ziyaret etmek istersiniz?</p>

              <button onClick={() => handleSetReminder(reminderModal.businessName, 30)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group">
                <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors"><Clock className="w-4 h-4" /></div>
                <div><div className="font-bold text-gray-900">30 Dakika Sonra</div><div className="text-xs text-gray-500">Kısa bir mola sonrası</div></div>
              </button>

              <button onClick={() => handleSetReminder(reminderModal.businessName, 60)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group">
                <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors"><Clock className="w-4 h-4" /></div>
                <div><div className="font-bold text-gray-900">1 Saat Sonra</div><div className="text-xs text-gray-500">Öğle arası veya toplantı bitişi</div></div>
              </button>

              <button onClick={() => handleSetReminder(reminderModal.businessName, 60 * 24)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group">
                <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors"><Clock className="w-4 h-4" /></div>
                <div><div className="font-bold text-gray-900">Yarın Aynı Saatte</div><div className="text-xs text-gray-500">Bugün müsait değillerdi</div></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-full md:w-[400px] flex-shrink-0 bg-white shadow-xl z-20 flex flex-col h-auto max-h-[50vh] md:max-h-full md:h-full border-r border-gray-200 overflow-y-auto overflow-x-hidden md:overflow-visible">
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bölgesel Rehber</h1>
              <p className="text-xs text-gray-500 font-medium">KOBİ & Yerel İşletme Bulucu</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Country Selection */}
          <div className="bg-gray-50 p-1 rounded-xl flex shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => { setCountry('Türkiye'); setCity(''); setBusinesses([]); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${country === 'Türkiye' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🇹🇷 Türkiye
            </button>
            <button
              type="button"
              onClick={() => { setCountry('Kıbrıs'); setCity(''); setBusinesses([]); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${country === 'Kıbrıs' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🇨🇾 Kıbrıs
            </button>
          </div>

          {/* City Input */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="city" className="block text-sm font-semibold text-gray-700">
                {country === 'Kıbrıs' ? 'Bölge / Şehir' : 'İl Adı'}
              </label>
              {country === 'Kıbrıs' && (
                <button
                  type="button"
                  onClick={() => setCity('Tüm KKTC')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  Tüm KKTC
                </button>
              )}
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm"
                placeholder={country === 'Kıbrıs' ? "Örn: Girne" : "Örn: İstanbul, Ankara"}
              />
            </div>
          </div>

          {/* Sectors */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Sektör Seçimi
            </label>
            <div className="space-y-4">
              {SECTOR_GROUPS.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50/50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{group.title}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = group.items.every(item => selectedSectors.includes(item));
                        if (allSelected) {
                          setSelectedSectors(selectedSectors.filter(s => !group.items.includes(s)));
                        } else {
                          const newSectors = [...selectedSectors];
                          group.items.forEach(item => {
                            if (!newSectors.includes(item)) newSectors.push(item);
                          });
                          setSelectedSectors(newSectors);
                        }
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      {group.items.every(item => selectedSectors.includes(item)) ? 'TEMİZLE' : 'TÜMÜNÜ SEÇ'}
                    </button>
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-2">
                    {group.items.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          if (selectedSectors.includes(s)) {
                            setSelectedSectors(selectedSectors.filter(sec => sec !== s));
                          } else {
                            setSelectedSectors([...selectedSectors, s]);
                          }
                        }}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border text-left truncate ${selectedSectors.includes(s)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200 ring-offset-1'
                          : 'bg-white text-gray-600 border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700'
                          }`}
                        title={s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={onlyMobile}
                  onChange={(e) => setOnlyMobile(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-blue-600 checked:bg-blue-600 hover:border-blue-400"
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">Sadece Cep Telefonu</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={requireInstagram}
                  onChange={(e) => setRequireInstagram(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-pink-600 checked:bg-pink-600 hover:border-pink-400"
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">Sadece Instagram Hesabı</span>
            </label>

            {/* Year Filter */}
            <div className="pt-2 border-t border-gray-200 mt-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Kuruluş Yılı
              </label>
              <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                <button
                  onClick={() => setYearFilter('all')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${yearFilter === 'all' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setYearFilter('new')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${yearFilter === 'new' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Son 5 Yıl
                </button>
                <button
                  onClick={() => setYearFilter('old')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${yearFilter === 'old' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  5+ Yıl
                </button>
              </div>
            </div>

            {/* Review Count Filter */}
            <div className="pt-2 border-t border-gray-200 mt-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Yorum Sayısı (Google)
              </label>
              <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                <button
                  onClick={() => setReviewFilter('all')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${reviewFilter === 'all' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setReviewFilter('low')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${reviewFilter === 'low' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Az (&lt;20)
                </button>
                <button
                  onClick={() => setReviewFilter('high')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${reviewFilter === 'high' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Çok (20+)
                </button>
              </div>
            </div>
          </div>

          {/* Creative Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Yaratıcı Filtreler
            </label>
            <div className="relative">
              <select
                value={creativeFilter}
                onChange={(e) => setCreativeFilter(e.target.value as CreativeFilter)}
                className="block w-full pl-3 pr-10 py-3 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 rounded-xl bg-amber-50/30 text-gray-700 font-medium appearance-none cursor-pointer hover:bg-amber-50/50 transition-colors"
              >
                <option value="none">Standart Arama (Filtre Yok)</option>
                <option value="multi-branch">🏢 Çok Şubeli / Zincir Adayı</option>
                <option value="high-reviews">⭐ Yüksek Puanlı / Popüler</option>
                <option value="newly-opened">🆕 Yeni Açılan / Tanıtım İsteyen</option>
                <option value="ecommerce">🛒 E-Ticaret Potansiyeli Olan</option>
                <option value="premium">💎 Premium / Lüks Hizmet</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-500 leading-relaxed">
              Yapay zeka bu kritere uyan firmaları bulmaya çalışır ve neden reklam vermeleri gerektiğini analiz eder.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-white">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={() => handleSearch(false)}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Aranıyor...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Firmaları Bul
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content (Map) */}
      <div className="flex-1 relative bg-gray-200">
        <MapContainer
          center={[39.9207, 32.8541]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <MapUpdater businesses={filteredBusinesses} />
          {filteredBusinesses.map((business, index) => (
            business.latitude && business.longitude && (
              <Marker
                key={index}
                position={[business.latitude, business.longitude]}
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[280px]">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight pr-4">{business.name}</h3>
                      {business.rating && (
                        <div className="flex items-center bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" />
                          <span className="text-xs font-bold text-yellow-700">{business.rating}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{business.address}</span>
                      </div>

                      {business.phones.map((phone, i) => (
                        <div key={i} className="flex items-center text-sm font-medium text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-100">
                          <Phone className="w-3.5 h-3.5 mr-2 text-green-600 flex-shrink-0" />
                          {phone}
                        </div>
                      ))}

                      {business.instagram !== 'Bilinmiyor' && (
                        <a
                          href={business.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-pink-600 hover:text-pink-700 hover:underline"
                        >
                          <Instagram className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                          Instagram Profili
                        </a>
                      )}

                      <button
                        onClick={() => handleGeneratePitch(business)}
                        disabled={pitchLoading === business.name}
                        className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-all shadow-md shadow-blue-600/20 gap-2 disabled:opacity-70"
                      >
                        {pitchLoading === business.name ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Lightbulb className="w-3.5 h-3.5" />
                        )}
                        Satış Metni Oluştur
                      </button>
                    </div>

                    {business.adPotential && (
                      <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-xs text-amber-800 mb-3">
                        <div className="flex items-center gap-1.5 mb-1 font-semibold text-amber-900">
                          <Lightbulb className="w-3 h-3" />
                          Reklam Potansiyeli
                        </div>
                        {business.adPotential}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      {business.mapsUri && (
                        <a
                          href={business.mapsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <MapPin className="w-3 h-3 mr-1.5" />
                          Haritada Git
                        </a>
                      )}
                      {business.website !== 'Bilinmiyor' && (
                        <a
                          href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Globe className="w-3 h-3 mr-1.5" />
                          Web Sitesi
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>

        {/* Floating Results Panel */}
        {businesses.length > 0 && showResultsPanel && (
          <div className="fixed md:absolute inset-0 md:inset-auto md:top-0 md:right-0 z-[3000] w-full md:w-1/2 lg:w-[500px] h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right-10 fade-in duration-300">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                  <div className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-md text-sm font-extrabold">
                    {filteredBusinesses.length}
                  </div>
                  Bulunan Firmalar
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetData}
                  title="Tüm Verileri Sıfırla"
                  className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg flex items-center gap-1 text-xs font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Sıfırla
                </button>
                <button
                  onClick={() => setShowResultsPanel(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 bg-gray-50/50">
              {filteredBusinesses.map((business, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row min-h-[10rem]">
                  {/* Image Section */}
                  <div className="w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 bg-gray-100 relative overflow-hidden">
                    {business.imageUrl ? (
                      <img
                        src={business.imageUrl}
                        alt={business.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 absolute inset-0">
                        <Building2 className="w-10 h-10" />
                      </div>
                    )}
                    {business.rating && (
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-yellow-700 flex items-center shadow-sm z-10">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 mr-1" />
                        {business.rating}
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-gray-900 text-lg leading-tight truncate">{business.name}</h4>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleHideBusiness(business.name)}
                            title="Listeden Kaldır"
                            className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-1.5 rounded-full whitespace-nowrap hidden sm:block">
                            {business.establishmentYear ? `${business.establishmentYear}'den beri` : 'Köklü Firma'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm text-blue-600 font-medium truncate">{business.sector}</div>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {notes[business.name] && (
                            <div className="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md font-bold cursor-pointer hover:bg-yellow-200" onClick={() => setNoteModal({ isOpen: true, businessName: business.name, initialNote: notes[business.name] })}>
                              <StickyNote className="w-3 h-3" />
                              Not var
                            </div>
                          )}
                          {reminders[business.name] && (
                            <div
                              onClick={() => {
                                if (confirm('Hatırlatıcıyı silmek istiyor musunuz?')) handleRemoveReminder(business.name);
                              }}
                              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-bold cursor-pointer transition-colors ${Date.now() > reminders[business.name]
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                }`}>
                              <Bell className={`w-3 h-3 ${Date.now() > reminders[business.name] ? 'animate-bounce' : ''}`} />
                              {Date.now() > reminders[business.name] ? 'Zamanı Geldi!' : 'Hatırlatıcı'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mt-3">
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{business.address}</span>
                      </div>

                      {/* Phone Numbers List */}
                      <div className="flex flex-wrap gap-2">
                        {business.phones.map((phone, pIdx) => (
                          <a
                            key={pIdx}
                            href={`tel:${phone}`}
                            className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border border-green-200 whitespace-nowrap"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {phone}
                          </a>
                        ))}
                      </div>

                      {/* Action Buttons Row 1: CRM Actions */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100 mt-auto">
                        <button
                          onClick={() => handleGeneratePitch(business)}
                          disabled={pitchLoading === business.name}
                          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white text-xs sm:text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-all shadow-md shadow-gray-900/10 whitespace-nowrap gap-1.5 disabled:opacity-70"
                        >
                          {pitchLoading === business.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                          )}
                          <span className="hidden xs:inline">Satış Metni</span>
                          <span className="xs:hidden">Metin</span>
                        </button>

                        <button
                          onClick={() => setNoteModal({ isOpen: true, businessName: business.name, initialNote: notes[business.name] || '' })}
                          className="flex-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs sm:text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-all whitespace-nowrap gap-1.5"
                        >
                          <StickyNote className="w-4 h-4" />
                          Not Al
                        </button>

                        <button
                          onClick={() => setReminderModal({ isOpen: true, businessName: business.name })}
                          className="flex-1 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 text-xs sm:text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-all whitespace-nowrap gap-1.5"
                        >
                          <Bell className="w-4 h-4" />
                          Hatırlat
                        </button>
                      </div>

                      {/* Action Buttons Row 2: External Links */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(business.name + ' ' + city + ' instagram')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[40px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-all shadow-md shadow-pink-500/20"
                          title="Instagram Profilini Çıkar"
                        >
                          <Instagram className="w-4 h-4 mr-1.5" />
                          Instagram
                        </a>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(business.name + ' ' + city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[40px] bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-all shadow-sm"
                          title="Google'da Ara"
                        >
                          <Search className="w-4 h-4 mr-1.5" />
                          Google
                        </a>

                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(business.name + ' ' + city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[40px] bg-white border border-gray-200 hover:bg-gray-50 text-red-600 text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-all shadow-sm"
                          title="Youtube'da Ara"
                        >
                          <Youtube className="w-4 h-4 mr-1.5" />
                          Youtube
                        </a>

                        {business.mapsUri && (
                          <a
                            href={business.mapsUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[40px] bg-white border border-gray-200 hover:bg-gray-50 text-green-600 text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                            title="Haritada Ara"
                          >
                            <MapPin className="w-4 h-4 mr-1.5" />
                            Harita
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {nextPageToken && (
                <button
                  onClick={() => handleSearch(true)}
                  disabled={loadingMore}
                  className="w-full mt-4 py-4 bg-gray-900 hover:bg-gray-800 text-white text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-900/10 transform active:scale-[0.99]"
                >
                  {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Daha Fazla Firma Yükle'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toggle Results Button (when panel is hidden) */}
        {businesses.length > 0 && !showResultsPanel && (
          <button
            onClick={() => setShowResultsPanel(true)}
            className="absolute bottom-6 right-6 z-[1000] bg-white text-gray-900 px-4 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all border border-gray-200"
          >
            <Menu className="w-5 h-5" />
            Listeyi Göster ({businesses.length})
          </button>
        )}
      </div>
    </div>
  );
}
