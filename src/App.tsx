import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Users, CheckCircle, XCircle, 
  ChevronDown, Copy, UtensilsCrossed, 
  PieChart, RotateCcw, RotateCw, Filter, Edit3, Database, X, 
  LayoutList, History, BookOpen, Lock, Loader2, LogOut, Cloud, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// --- FIREBASE CONFIGURATION (THAY THẾ BẰNG KEY CỦA BẠN) ---
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "lunch-money-app.firebaseapp.com",
  projectId: "lunch-money-app",
  storageBucket: "lunch-money-app.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Theme & Style ---
const THEME_COLOR = '#000066'; // Navy Blue

// --- Types ---
interface ParticipantStatus {
  name: string;
  paid: boolean;
  paidAt?: string | null;
}

interface MealRecord {
  id: string;
  date: string;
  createdAt: number;
  title: string;
  totalAmount: number;
  perPersonAmount: number;
  payer: string;
  participants: ParticipantStatus[];
}

interface AppState {
  people: string[];
  records: MealRecord[];
}

// --- Actions ---
type Action = 
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_PERSON'; payload: string }
  | { type: 'REMOVE_PERSON'; payload: string }
  | { type: 'ADD_RECORD'; payload: MealRecord }
  | { type: 'UPDATE_RECORD'; payload: MealRecord }
  | { type: 'DELETE_RECORD'; payload: string }
  | { type: 'TOGGLE_PAID'; payload: { recordId: string, personName: string } }
  | { type: 'MARK_ALL_PAID'; payload: { personName: string } }
  | { type: 'LOAD_SAMPLE_DATA'; payload: 'full' | 'people_only' }
  | { type: 'CLEAR_DATA'; };

// --- Helper Functions ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatShortDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
};

const formatDateTime = (isoString?: string | null) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('vi-VN', { 
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
  }).format(date);
};

const formatDayOfWeek = (dateString: string) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const d = new Date(dateString);
    return days[d.getDay()];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const copyToClipboard = (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(textArea);
    return Promise.resolve();
  }
};

// --- Custom Components ---
const AnimatedCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <div 
    className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500 hover:shadow-md ${className}`}
    style={{ animation: `fadeInUp 0.5s ease-out ${delay}s both` }}
  >
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm z-50">
        <p className="font-bold text-gray-800 mb-1">{label || payload[0].name}</p>
        <p className="text-blue-600 font-semibold">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// --- LOGIN COMPONENT ---
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            onLoginSuccess(userCredential.user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Tài khoản hoặc mật khẩu không đúng.');
            } else {
                setError('Lỗi: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <AnimatedCard className="w-full max-w-md p-8 shadow-xl border-blue-100">
                <div className="text-center mb-8">
                    <div className="bg-blue-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
                        <UtensilsCrossed className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-blue-900 uppercase tracking-wide">Sổ Ăn Uống</h2>
                    <p className="text-gray-500 text-sm mt-2">Đăng nhập để đồng bộ dữ liệu</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                        <input 
                            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mật khẩu</label>
                        <input 
                            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in">
                            <XCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}
                    <button 
                        type="submit" disabled={loading}
                        className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-2">
                             <Lock className="w-4 h-4" /> ĐĂNG NHẬP
                          </span>
                        )}
                    </button>
                </form>
            </AnimatedCard>
        </div>
    );
};

// --- Guide Modal ---
const GuideModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0">
                <h3 className="font-bold text-xl text-blue-900 flex items-center gap-2"><BookOpen className="w-6 h-6"/> HƯỚNG DẪN</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-gray-700 leading-relaxed text-sm">
                <p><b>1. Đồng bộ dữ liệu:</b> Dữ liệu giờ đây được lưu trên Cloud. Mọi người đăng nhập cùng tài khoản (hoặc các tài khoản trong cùng hệ thống) sẽ thấy dữ liệu giống nhau.</p>
                <p><b>2. Quy trình:</b> Vào "Thành viên" tạo tên -> Vào "Nhập liệu" để thêm món ăn -> Vào "Theo dõi" để xem nợ và tick trả nợ.</p>
            </div>
             <div className="p-4 border-t bg-gray-50 text-right sticky bottom-0">
                <button onClick={onClose} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors">Đã hiểu</button>
            </div>
        </div>
    </div>
);

// --- RecordForm ---
const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: { 
    initialData: any, onSubmit: (data: any) => void, onCancel?: () => void, submitLabel: string, people: string[]
}) => {
    const [fDate, setFDate] = useState(initialData.date || new Date().toISOString().slice(0, 10));
    const [fTitle, setFTitle] = useState(initialData.title || '');
    const [fTotal, setFTotal] = useState(initialData.totalAmount?.toString() || '');
    const [fPayer, setFPayer] = useState(initialData.payer || '');
    const [fParticipants, setFParticipants] = useState<ParticipantStatus[]>(
        initialData.participants || (initialData.participantNames || []).map((name: string) => ({ name, paid: false, paidAt: null }))
    );
    const [fDropdownOpen, setFDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setFDropdownOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleParticipant = (name: string) => {
        if (fParticipants.some(p => p.name === name)) {
            setFParticipants(fParticipants.filter(p => p.name !== name));
        } else {
            setFParticipants([...fParticipants, { name, paid: name === fPayer, paidAt: name === fPayer ? new Date().toISOString() : null }]);
        }
    };

    const togglePaidStatus = (name: string) => {
        if (name === fPayer) return; 
        setFParticipants(fParticipants.map(p => {
            if (p.name === name) {
                const newPaid = !p.paid;
                return { ...p, paid: newPaid, paidAt: newPaid ? new Date().toISOString() : null };
            }
            return p;
        }));
    };

    const updatePaidDate = (name: string, dateValue: string) => {
        setFParticipants(fParticipants.map(p => p.name === name ? { ...p, paidAt: dateValue ? new Date(dateValue).toISOString() : null } : p));
    }

    const handleSubmit = () => {
        const amount = parseInt(fTotal.replace(/\D/g, ''), 10);
        onSubmit({ date: fDate, title: fTitle, totalAmount: amount, payer: fPayer, participants: fParticipants });
    };

    const toLocalInputString = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    // --- FIX: Move logic out of JSX to prevent Parsing Errors ---
    const participantLabel = fParticipants.length > 0 
        ? `${fParticipants.length} người được chọn` 
        : 'Chọn thêm...';

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ngày</label>
                    <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Số tiền</label>
                    <input type="text" value={fTotal ? parseInt(fTotal).toLocaleString('vi-VN') : ''} onChange={e => setFTotal(e.target.value.replace(/\D/g, ''))} className="w-full p-3 border rounded-lg font-bold text-red-600 focus:ring-2 focus:ring-red-200 outline-none bg-white" placeholder="0"/>
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nội dung</label>
                <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white" placeholder="Món ăn/Cafe..."/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Người trả tiền</label>
                  <select value={fPayer} onChange={e => setFPayer(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-200 outline-none">
                      <option value="">--Chọn--</option>
                      {people.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thêm người tham gia</label>
                  <button onClick={() => setFDropdownOpen(!fDropdownOpen)} className="w-full p-3 border rounded-lg bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-200">
                      <span className="truncate text-gray-600">{participantLabel}</span>
                      <ChevronDown className="w-4 h-4"/>
                  </button>
                  {fDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 animate-in zoom-in-95">
                          {people.map(p => (
                              <div key={p} onClick={() => toggleParticipant(p)} className={`flex justify-between p-3 hover:bg-gray-100 cursor-pointer rounded-lg ${fParticipants.some(fp => fp.name === p) ? 'text-gray-400 bg-gray-50' : 'text-gray-800'}`}>
                                  {p} {fParticipants.some(fp => fp.name === p) && <CheckCircle className="w-4 h-4"/>}
                              </div>
                          ))}
                      </div>
                  )}
                </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Danh sách chia tiền ({fParticipants.length})</label>
                {fParticipants.length === 0 ? <div className="text-center text-gray-400 text-xs py-4 italic">Chưa chọn ai</div> : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {fParticipants.map(p => (
                            <div key={p.name} className="flex items-start justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:border-blue-300">
                                <div className="flex items-center gap-2 mt-1">
                                    <button onClick={() => toggleParticipant(p.name)} className="text-gray-300 hover:text-red-500 p-1"><XCircle className="w-4 h-4"/></button>
                                    <span className="font-medium text-sm">{p.name}</span>
                                    {p.name === fPayer && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Người trả</span>}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => !p.name.includes(fPayer) && togglePaidStatus(p.name)}>
                                        <label className={`text-[10px] font-bold cursor-pointer ${p.paid ? 'text-green-600' : 'text-red-500'}`}>{p.paid ? 'Đã trả' : 'Chưa trả'}</label>
                                        <input type="checkbox" checked={p.paid || p.name === fPayer} disabled={p.name === fPayer} onChange={() => togglePaidStatus(p.name)} className="w-4 h-4 accent-green-600 cursor-pointer"/>
                                    </div>
                                    {p.paid && p.name !== fPayer && (
                                        <input type="datetime-local" value={toLocalInputString(p.paidAt)} onChange={(e) => updatePaidDate(p.name, e.target.value)} className="text-[10px] border border-gray-300 rounded px-1 py-0.5 w-auto text-gray-600 bg-gray-50 outline-none"/>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex gap-2 pt-2">
                <button onClick={handleSubmit} className="flex-1 bg-blue-800 text-white py-3 rounded-lg font-bold hover:bg-blue-900 shadow-md">{submitLabel}</button>
                {onCancel && <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200">Hủy</button>}
            </div>
        </div>
    );
};

// --- MAIN APP ---
const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // --- History & State ---
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const currentState = history[historyIndex] || { people: [], records: [] };
  const { people, records } = currentState;

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'entry' | 'debt_history' | 'report' | 'people'>('entry');
  const [showGuide, setShowGuide] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MealRecord | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedCreditor, setExpandedCreditor] = useState<string | null>(null);
  const [showSampleOptions, setShowSampleOptions] = useState(false);
  const [expandedReportRows, setExpandedReportRows] = useState<Record<string, boolean>>({});

  // --- AUTH & FIRESTORE SYNC ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        setDataLoading(true);
        const docRef = doc(db, "lunch_app", "main_data");
        const unsubscribeData = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as AppState;
                setHistory([data]);
                setHistoryIndex(0);
            } else {
                setHistory([{ people: [], records: [] }]);
                setHistoryIndex(0);
            }
            setDataLoading(false);
        });
        return () => unsubscribeData();
      } else {
        setHistory([{ people: [], records: [] }]);
        setHistoryIndex(0);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- SAVE TO FIRESTORE (DEBOUNCED) ---
  const saveTimeoutRef = useRef<any>(null);
  
  const saveToFirestore = (newState: AppState) => {
      if (!currentUser) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
          try {
              await setDoc(doc(db, "lunch_app", "main_data"), newState);
              console.log("Saved to Cloud");
          } catch (e) {
              console.error("Error saving document: ", e);
              alert("Lỗi lưu dữ liệu: Kiểm tra mạng!");
          }
      }, 1000); 
  };

  // --- Dispatcher ---
  const dispatch = useCallback((action: Action) => {
    setHistory(prevHistory => {
      const current = prevHistory[historyIndex];
      let newState: AppState = { ...current };

      switch (action.type) {
        case 'ADD_PERSON': newState.people = [...current.people, action.payload]; break;
        case 'REMOVE_PERSON': newState.people = current.people.filter(p => p !== action.payload); break;
        case 'ADD_RECORD': newState.records = [action.payload, ...current.records]; break;
        case 'UPDATE_RECORD': newState.records = current.records.map(r => r.id === action.payload.id ? action.payload : r); break;
        case 'DELETE_RECORD': newState.records = current.records.filter(r => r.id !== action.payload); break;
        case 'TOGGLE_PAID':
          newState.records = current.records.map(r => {
            if (r.id !== action.payload.recordId) return r;
            return {
              ...r,
              participants: r.participants.map(p => {
                if (p.name !== action.payload.personName) return p;
                const newPaidStatus = !p.paid;
                return { ...p, paid: newPaidStatus, paidAt: newPaidStatus ? new Date().toISOString() : null };
              })
            };
          });
          break;
        case 'MARK_ALL_PAID':
          newState.records = current.records.map(r => ({
            ...r,
            participants: r.participants.map(p => {
              if (p.name === action.payload.personName && !p.paid && r.payer !== p.name) {
                return { ...p, paid: true, paidAt: new Date().toISOString() };
              }
              return p;
            })
          }));
          break;
        case 'LOAD_SAMPLE_DATA':
          newState.people = ["Khánh", "Minh Anh", "Hiếu", "Chị Trang"];
          if (action.payload === 'full') {
             const now = new Date(); const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
             newState.records = [
                { id: generateId(), date: now.toISOString().slice(0, 10), createdAt: Date.now(), title: "Cafe sáng (Team họp)", totalAmount: 180000, perPersonAmount: 45000, payer: "Khánh", participants: [ { name: "Khánh", paid: true, paidAt: now.toISOString() }, { name: "Minh Anh", paid: false }, { name: "Hiếu", paid: false }, { name: "Chị Trang", paid: false } ] },
                { id: generateId(), date: yesterday.toISOString().slice(0, 10), createdAt: Date.now() - 10000, title: "Cơm tấm sườn bì", totalAmount: 220000, perPersonAmount: 55000, payer: "Chị Trang", participants: [ { name: "Khánh", paid: true, paidAt: now.toISOString() }, { name: "Minh Anh", paid: false }, { name: "Hiếu", paid: false }, { name: "Chị Trang", paid: true, paidAt: yesterday.toISOString() } ] }
             ];
          }
          break;
        case 'CLEAR_DATA': newState = { people: [], records: [] }; break;
        default: return prevHistory;
      }
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(newState);
      setHistoryIndex(newHistory.length - 1);
      saveToFirestore(newState);
      return newHistory;
    });
  }, [historyIndex, currentUser]);

  const handleUndo = () => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); saveToFirestore(history[newIndex]); } };
  const handleRedo = () => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setHistoryIndex(newIndex); saveToFirestore(history[newIndex]); } };

  const handleAddPerson = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !people.includes(trimmedName)) { dispatch({ type: 'ADD_PERSON', payload: trimmedName }); setNewPersonName(''); }
  };

  const handleSaveRecord = (record: any, isEdit: boolean) => {
     if (!record.title || !record.totalAmount || record.totalAmount <= 0 || !record.payer || !record.participants.length) return alert('Thông tin chưa đủ!');
     const perPerson = Math.ceil(record.totalAmount / record.participants.length);
     const fullParticipants: ParticipantStatus[] = record.participants.map((p: any) => {
        const isPayer = p.name === record.payer;
        return { name: p.name, paid: isPayer ? true : p.paid, paidAt: isPayer ? (p.paidAt || new Date().toISOString()) : (p.paid ? (p.paidAt || new Date().toISOString()) : null) };
     });
     const finalRecord: MealRecord = {
         id: isEdit && editingRecord ? editingRecord.id : generateId(),
         createdAt: isEdit && editingRecord ? editingRecord.createdAt : Date.now(),
         date: record.date || new Date().toISOString().slice(0, 10),
         title: record.title || '',
         totalAmount: record.totalAmount,
         perPersonAmount: perPerson,
         payer: record.payer || '',
         participants: fullParticipants
     };
     if (isEdit) { dispatch({ type: 'UPDATE_RECORD', payload: finalRecord }); setEditingRecord(null); } 
     else { dispatch({ type: 'ADD_RECORD', payload: finalRecord }); }
  };

  const filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
  const totalFilteredSpent = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  // FIX: Safe check for logic outside JSX
  const hasFilteredRecords = filteredRecords.length > 0;

  const getNetBalances = () => {
    const balances: Record<string, { owed: number, debt: number, net: number, meals: any[] }> = {};
    people.forEach(p => balances[p] = { owed: 0, debt: 0, net: 0, meals: [] });
    filteredRecords.forEach(r => {
       r.participants.forEach(p => {
          if (balances[p.name]) balances[p.name].meals.push({ id: r.id, date: r.date, title: r.title, amount: r.perPersonAmount, isPaid: p.paid });
          if (p.name !== r.payer && !p.paid) {
             if (balances[p.name]) balances[p.name].debt += r.perPersonAmount;
             if (balances[r.payer]) balances[r.payer].owed += r.perPersonAmount;
          }
       });
    });
    Object.keys(balances).forEach(key => { balances[key].net = balances[key].owed - balances[key].debt; });
    return Object.entries(balances).map(([name, val]) => ({ name, ...val }));
  };

  const netBalances = getNetBalances();
  const creditors = netBalances.filter(x => x.net > 0).sort((a, b) => b.net - a.net);
  const debtors = netBalances.filter(x => x.net < 0).sort((a, b) => a.net - b.net);
  const spendingByPerson = people.map(person => ({ name: person, value: filteredRecords.reduce((sum, r) => { const p = r.participants.find(pt => pt.name === person); return sum + (p ? r.perPersonAmount : 0); }, 0) })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  const debtSummaryData = netBalances.map(nb => ({ name: nb.name, net: nb.net }));
  
  const historyByDate = filteredRecords.reduce((acc, record) => { const d = record.date; if (!acc[d]) acc[d] = []; acc[d].push(record); return acc; }, {} as Record<string, MealRecord[]>);
  const sortedHistoryDates = Object.keys(historyByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-900 font-bold"><Loader2 className="w-8 h-8 animate-spin mr-2"/> Đang tải...</div>;
  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="min-h-screen font-sans flex flex-col text-gray-800 bg-gray-50">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-enter { animation: fadeInUp 0.3s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="bg-white p-3 rounded-full shadow-lg border hover:bg-blue-50 disabled:opacity-50 transition-all"><RotateCw className="w-5 h-5 text-gray-700" /></button>
        <button onClick={handleUndo} disabled={historyIndex <= 0} className="bg-white p-3 rounded-full shadow-lg border hover:bg-blue-50 disabled:opacity-50 transition-all"><RotateCcw className="w-5 h-5 text-gray-700" /></button>
      </div>
      <header className="text-white p-4 shadow-lg sticky top-0 z-30 transition-all" style={{ backgroundColor: THEME_COLOR }}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
            <div>
                <h1 className="text-lg font-bold uppercase tracking-wide leading-tight flex items-center gap-1">Sổ Ăn Uống <span className="text-yellow-400 text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">Cloud</span></h1>
                <span className="text-xs text-blue-200 opacity-80 font-medium hidden sm:flex items-center gap-1">
                    {dataLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Cloud className="w-3 h-3"/>}
                    {currentUser.email}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => setShowGuide(true)} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold transition-colors"><BookOpen className="w-5 h-5 sm:w-4 sm:h-4"/></button>
              <button onClick={() => signOut(auth)} className="bg-red-500/20 hover:bg-red-500/40 px-3 py-2 rounded-lg text-sm font-bold transition-colors text-red-100"><LogOut className="w-5 h-5 sm:w-4 sm:h-4"/></button>
          </div>
        </div>
      </header>
      <div className="bg-white shadow-sm sticky top-[72px] z-20 border-b border-gray-100">
        <nav className="max-w-5xl mx-auto flex overflow-x-auto no-scrollbar snap-x">
           {[
             { id: 'entry', icon: Plus, label: 'Nhập Liệu' },
             { id: 'debt_history', icon: LayoutList, label: 'Theo Dõi' },
             { id: 'report', icon: PieChart, label: 'Báo Cáo' },
             { id: 'people', icon: Users, label: 'Thành Viên' },
           ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[25%] sm:min-w-[auto] flex flex-col items-center justify-center py-3 px-1 text-xs font-semibold transition-all border-b-4 duration-300 snap-start ${activeTab === tab.id ? `border-[${THEME_COLOR}] text-[${THEME_COLOR}] bg-blue-50/60` : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`} style={activeTab === tab.id ? { color: THEME_COLOR, borderColor: THEME_COLOR } : {}}>
               <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'transform scale-110' : ''} transition-transform`} />{tab.label}
             </button>
           ))}
        </nav>
      </div>

      <main className="max-w-5xl mx-auto w-full p-3 sm:p-4 pb-24 flex-1">
        {activeTab === 'entry' && (
          <div className="animate-enter max-w-2xl mx-auto">
            <AnimatedCard className="p-4 sm:p-6">
              <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2" style={{ color: THEME_COLOR }}><Plus className="w-6 h-6" /> Ghi Nhận Chi Tiêu</h3>
              <RecordForm initialData={{}} people={people} onSubmit={(data: any) => handleSaveRecord(data, false)} submitLabel="LƯU GIAO DỊCH" />
            </AnimatedCard>
          </div>
        )}
        {activeTab === 'debt_history' && (
             <div className="space-y-6 animate-enter">
                <AnimatedCard className="p-4 flex flex-col md:flex-row gap-4 border-l-4 border-blue-500 items-center sticky top-[130px] z-10 shadow-md">
                   <div className="flex flex-col sm:flex-row gap-2 items-center flex-1 w-full">
                       <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0"><Filter className="w-4 h-4 text-gray-500"/><span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Lọc từ:</span></div>
                       <div className="flex items-center gap-2 w-full"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 p-2 rounded text-sm outline-none flex-1 w-full"/><ArrowRight className="w-4 h-4 text-gray-400 shrink-0"/><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 p-2 rounded text-sm outline-none flex-1 w-full"/></div>
                   </div>
                </AnimatedCard>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <AnimatedCard className="overflow-hidden border-green-100">
                        <div className="bg-green-50/80 p-4 border-b border-green-100 flex items-center justify-between backdrop-blur-sm"><h4 className="font-bold text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> CẦN THU VỀ</h4></div>
                        <div className="divide-y divide-gray-100">
                            {creditors.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Không có khoản cần thu.</div>}
                            {creditors.map(item => (
                                <div key={item.name} className="p-4 bg-white hover:bg-green-50/20">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedCreditor(expandedCreditor === item.name ? null : item.name)}>
                                        <div><div className="font-bold text-lg text-gray-800">{item.name}</div><div className="text-xs text-green-600 flex items-center gap-1 font-medium mt-1">{expandedCreditor === item.name ? 'Thu gọn' : 'Xem chi tiết'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedCreditor === item.name ? 'rotate-180' : ''}`}/></div></div>
                                        <span className="font-bold text-green-600 text-lg">+{formatCurrency(item.net)}</span>
                                    </div>
                                    {expandedCreditor === item.name && (
                                        <div className="mt-3 pt-3 border-t border-green-100 text-sm space-y-2 animate-enter">
                                            {filteredRecords.map(r => {
                                                if (r.payer === item.name) {
                                                    const unpaid = r.participants.filter(p => !p.paid && p.name !== item.name);
                                                    if (unpaid.length > 0) return (
                                                        <div key={r.id} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1">
                                                            <div className="flex-1 pr-2"><div className="font-medium text-gray-700">{r.title}</div><div className="text-[10px] text-gray-400">{formatShortDate(r.date)}</div><div className="text-[11px] text-red-500 font-medium mt-0.5">Chưa trả: {unpaid.map(p => p.name).join(', ')}</div></div>
                                                            <div className="font-medium text-green-600 text-right whitespace-nowrap"><div>+{formatCurrency(r.perPersonAmount * unpaid.length)}</div></div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </AnimatedCard>
                    <AnimatedCard className="overflow-hidden border-red-100">
                        <div className="bg-red-50/80 p-4 border-b border-red-100 flex items-center justify-between backdrop-blur-sm"><h4 className="font-bold text-red-800 flex items-center gap-2"><XCircle className="w-5 h-5" /> CẦN PHẢI TRẢ</h4></div>
                        <div className="divide-y divide-gray-100">
                             {debtors.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Không có khoản nợ.</div>}
                             {debtors.map(item => (
                                 <div key={item.name} className="p-4 bg-white hover:bg-red-50/10">
                                     <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedPerson(expandedPerson === item.name ? null : item.name)}>
                                         <div><div className="font-bold text-lg text-gray-800">{item.name}</div><div className="text-xs text-red-500 flex items-center gap-1 font-medium mt-1">{expandedPerson === item.name ? 'Thu gọn' : 'Xem & Trả nợ'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedPerson === item.name ? 'rotate-180' : ''}`}/></div></div>
                                         <span className="font-bold text-red-600 text-lg">{formatCurrency(Math.abs(item.net))}</span>
                                     </div>
                                     {expandedPerson === item.name && (
                                         <div className="mt-4 space-y-4 animate-enter">
                                             <div className="bg-red-50 rounded p-2 text-sm border border-red-100">
                                                 <div className="flex justify-between items-center mb-2 pb-2 border-b border-red-200">
                                                     <span className="text-[10px] font-bold text-red-800 uppercase">Chưa trả</span>
                                                     <button onClick={() => dispatch({type: 'MARK_ALL_PAID', payload: {personName: item.name}})} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 uppercase font-bold">Trả hết ngay</button>
                                                 </div>
                                                 {filteredRecords.map(r => {
                                                     const p = r.participants.find(part => part.name === item.name);
                                                     if (p && !p.paid && r.payer !== item.name) {
                                                         return (
                                                             <div key={r.id} className="flex justify-between items-center py-2 border-b border-red-100/50 last:border-0 hover:bg-white rounded px-1 transition-colors">
                                                                 <div className="flex-1 pr-2"><div className="font-medium text-gray-800">{r.title}</div><div className="text-[10px] text-gray-500">{formatShortDate(r.date)} • Ứng: <b>{r.payer}</b></div></div>
                                                                 <div className="flex items-center gap-3"><span className="font-bold text-red-600 whitespace-nowrap">{formatCurrency(r.perPersonAmount)}</span><input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer" onChange={() => dispatch({type: 'TOGGLE_PAID', payload: {recordId: r.id, personName: item.name}})}/></div>
                                                             </div>
                                                         )
                                                     }
                                                     return null;
                                                 })}
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             ))}
                        </div>
                    </AnimatedCard>
                </div>
                <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                     <div className="flex flex-col md:flex-row justify-between items-center mb-6"><h3 className="font-bold text-lg text-gray-700 flex items-center gap-2"><History className="w-6 h-6 text-blue-600"/> Nhật Ký Giao Dịch</h3></div>
                     {sortedHistoryDates.length === 0 ? <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">Không có dữ liệu.</div> : (
                         sortedHistoryDates.map(date => (
                             <div key={date} className="relative pl-4 sm:pl-6 border-l-2 border-blue-200 ml-2 pb-6 last:pb-0">
                                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                                 <div className="mb-4">
                                     <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm">{formatDayOfWeek(date)}, {formatDate(date)}</div>
                                     <div className="space-y-4">
                                         {historyByDate[date].map((record, rIdx) => (
                                             <AnimatedCard key={record.id} className="p-4 hover:border-blue-300 relative group border-l-4 border-l-transparent hover:border-l-blue-500 transition-all" delay={rIdx * 0.05}>
                                                 <div className="flex justify-between items-start mb-2"> 
                                                     <div><h4 className="font-bold text-gray-800 text-base">{record.title}</h4><div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100 whitespace-nowrap">{record.payer} chi</span></div></div>
                                                     <div className="text-right pl-2"><div className="font-bold text-lg text-gray-800 whitespace-nowrap">{formatCurrency(record.totalAmount)}</div><div className="text-xs text-gray-500 font-medium whitespace-nowrap">~{formatCurrency(record.perPersonAmount)}</div></div>
                                                 </div>
                                                 <div className="flex flex-wrap gap-2 mt-3 mb-4">
                                                     {record.participants.map(p => (
                                                         <div key={p.name} className={`px-2 py-1 rounded border text-xs flex items-center gap-1 transition-colors cursor-help ${p.paid ? 'bg-green-50 text-green-700 border-green-200 font-bold shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`} title={p.paid && p.paidAt ? `Đã trả lúc: ${formatDateTime(p.paidAt)}` : 'Chưa trả'}>
                                                             {p.name} {p.paid && <CheckCircle className="w-3 h-3"/>}
                                                         </div>
                                                     ))}
                                                 </div>
                                                 <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                                     <button onClick={() => setEditingRecord(record)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors"><Edit3 className="w-3 h-3"/> Sửa</button>
                                                     <button onClick={() => { if(confirm('Xóa giao dịch này?')) dispatch({type: 'DELETE_RECORD', payload: record.id}) }} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors"><Trash2 className="w-3 h-3"/> Xóa</button>
                                                 </div>
                                             </AnimatedCard>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                         ))
                     )}
                </div>
             </div>
        )}
        {activeTab === 'report' && (
             <div className="space-y-6 animate-enter">
                  <AnimatedCard className="p-4 flex flex-col md:flex-row items-end gap-4">
                      <div className="w-full md:w-auto"><label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wide">Từ ngày</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"/></div>
                      <div className="w-full md:w-auto"><label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wide">Đến ngày</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"/></div>
                      <div className="w-full md:flex-1 text-right mt-2 md:mt-0"><div className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng chi tiêu (Lọc)</div><div className="text-2xl font-bold text-blue-800">{formatCurrency(totalFilteredSpent)}</div></div>
                  </AnimatedCard>
                  {/* FIX: Move logic check out of JSX */}
                  {hasFilteredRecords && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <AnimatedCard className="p-4 h-72">
                               <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Tỷ trọng chi tiêu</h4>
                               <ResponsiveContainer width="100%" height="90%"><RePieChart><Pie data={spendingByPerson} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5}>{spendingByPerson.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}</Pie><RechartsTooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '11px'}}/></RePieChart></ResponsiveContainer>
                           </AnimatedCard>
                           <AnimatedCard className="p-4 h-72">
                               <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Biểu đồ Công nợ</h4>
                               <ResponsiveContainer width="100%" height="90%"><BarChart data={debtSummaryData} margin={{top: 5, right: 5, left: -10, bottom: 0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11}} dy={10} /><YAxis tick={{fontSize: 11}} /><RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.02)'}} /><Bar dataKey="net" radius={[4, 4, 4, 4]} barSize={30}>{debtSummaryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.net > 0 ? '#10b981' : '#ef4444'} />)}</Bar></BarChart></ResponsiveContainer>
                           </AnimatedCard>
                      </div>
                  )}
             </div>
        )}
        {activeTab === 'people' && (
          <div className="animate-enter max-w-3xl mx-auto">
             <AnimatedCard className="p-4 sm:p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                     <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: THEME_COLOR }}><Users className="w-6 h-6" /> Danh Sách Thành Viên</h3>
                     <div className="relative w-full sm:w-auto">
                        <button onClick={() => setShowSampleOptions(!showSampleOptions)} className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center justify-center gap-1 font-bold transition-all shadow-sm w-full sm:w-auto"><Database className="w-3 h-3" /> Dữ liệu mẫu</button>
                        {showSampleOptions && (
                            <div className="absolute right-0 mt-2 w-full sm:w-52 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                                <button onClick={() => { dispatch({type: 'LOAD_SAMPLE_DATA', payload: 'people_only'}); setShowSampleOptions(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">Chỉ nạp tên thành viên</button>
                                <button onClick={() => { dispatch({type: 'LOAD_SAMPLE_DATA', payload: 'full'}); setShowSampleOptions(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">Nạp dữ liệu test đầy đủ</button>
                                <button onClick={() => { if(confirm('Xóa sạch mọi dữ liệu?')) { dispatch({type: 'CLEAR_DATA'}); setShowSampleOptions(false); }}} className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 font-medium"><Trash2 className="w-3 h-3 inline mr-1"/> Xóa sạch dữ liệu</button>
                            </div>
                        )}
                     </div>
                 </div>
                 <div className="flex gap-2 mb-6">
                     <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Nhập tên thành viên..." className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all" onKeyDown={(e) => e.key === 'Enter' && handleAddPerson(newPersonName)}/>
                     <button onClick={() => handleAddPerson(newPersonName)} className="text-white px-5 rounded-lg font-bold hover:opacity-90 transition-all shadow-md active:scale-95" style={{ backgroundColor: THEME_COLOR }}><Plus className="w-5 h-5" /></button>
                 </div>
                 {people.length === 0 ? <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl">Chưa có thành viên nào.</div> : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                         {people.map((person, idx) => (
                             <div key={person} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-all group" style={{ animationDelay: `${idx * 0.05}s` }}>
                                 <span className="font-medium flex items-center gap-3 text-gray-700"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 flex items-center justify-center text-sm font-bold shadow-sm">{person.charAt(0)}</div>{person}</span>
                                 <button onClick={() => dispatch({type: 'REMOVE_PERSON', payload: person})} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                             </div>
                         ))}
                     </div>
                 )}
             </AnimatedCard>
          </div>
        )}
      </main>
      
      {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-600"/> Chỉnh Sửa</h3><button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"><X className="w-5 h-5" /></button></div>
                  <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto"><RecordForm initialData={{ ...editingRecord, participants: editingRecord.participants }} people={people} onSubmit={(data: any) => handleSaveRecord(data, true)} onCancel={() => setEditingRecord(null)} submitLabel="CẬP NHẬT NGAY"/></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;