import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Users, Calendar, CheckCircle, XCircle, 
  ChevronDown, Copy, UtensilsCrossed, 
  PieChart, RotateCcw, RotateCw, Filter, Edit3, Database, X, 
  LayoutList, History, ArrowRight, BookOpen, LogOut, Lock, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

// --- FIREBASE CONFIGURATION (THAY THẾ BẰNG KEY CỦA BẠN) ---
// 1. Vào Firebase Console -> Project Settings -> General -> Cuộn xuống "Your apps"
// 2. Chọn "SDK setup and configuration" -> Config
// 3. Copy dán đè vào object bên dưới:
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
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Copy failed', err);
    }
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
                setError('Email hoặc mật khẩu không chính xác.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Quá nhiều lần thử sai. Vui lòng đợi.');
            } else {
                setError('Lỗi đăng nhập: ' + err.message);
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
                    <p className="text-gray-500 text-sm mt-2">Đăng nhập để quản lý chi tiêu</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mật khẩu</label>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <XCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4" /> ĐĂNG NHẬP</>}
                    </button>
                </form>
                
                <div className="mt-6 text-center text-xs text-gray-400 border-t pt-4">
                    Ứng dụng nội bộ • Vui lòng liên hệ Admin để cấp tài khoản
                </div>
            </AnimatedCard>
        </div>
    );
};

// --- Guide Modal (Giữ nguyên) ---
const GuideModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0">
                <h3 className="font-bold text-xl text-blue-900 flex items-center gap-2">
                    <BookOpen className="w-6 h-6"/> HƯỚNG DẪN SỬ DỤNG
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-gray-700 leading-relaxed">
                <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">1. Quy trình cơ bản</h4>
                    <p className="mb-2">Ứng dụng hoạt động theo quy tắc: <b>Một người trả tiền trước, sau đó chia đều cho những người cùng ăn.</b></p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><b>Bước 1:</b> Vào tab <b>Thành Viên</b> để nhập tên mọi người trong nhóm (Chỉ cần làm 1 lần).</li>
                        <li><b>Bước 2:</b> Khi đi ăn, vào tab <b>Nhập Liệu</b>. Chọn ngày, món ăn, tổng tiền. Quan trọng nhất là chọn đúng <b>Người trả tiền</b> (Chủ nợ) và tick chọn những <b>Người ăn</b>.</li>
                        <li><b>Bước 3:</b> Bấm <b>Lưu</b>. Hệ thống tự động chia tiền và ghi nợ.</li>
                    </ul>
                </section>
                <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">2. Theo dõi & Thanh toán nợ</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><b>Cột Cần Thu Về (Màu Xanh):</b> Dành cho người đã ứng tiền.</li>
                        <li><b>Cột Cần Phải Trả (Màu Đỏ):</b> Dành cho người ăn ké.</li>
                        <li><b>Cách trả nợ:</b> Tick vào ô vuông <input type="checkbox" className="align-middle" /> bên cạnh món ăn để xác nhận đã trả.</li>
                    </ul>
                </section>
                <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">3. Lưu ý dữ liệu</h4>
                    <p className="text-sm">Hiện tại dữ liệu được lưu trên trình duyệt của máy bạn. Việc đăng nhập chỉ giúp bảo vệ quyền truy cập ứng dụng.</p>
                </section>
            </div>
            <div className="p-4 border-t bg-gray-50 text-right sticky bottom-0">
                <button onClick={onClose} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors">
                    Đã hiểu
                </button>
            </div>
        </div>
    </div>
);

// --- RecordForm (Giữ nguyên logic cũ) ---
const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: { 
    initialData: any, 
    onSubmit: (data: any) => void, 
    onCancel?: () => void, 
    submitLabel: string,
    people: string[]
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
        function handleClickOutside(event: MouseEvent) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setFDropdownOpen(false);
          }
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
        setFParticipants(fParticipants.map(p => {
            if (p.name === name) {
                return { ...p, paidAt: dateValue ? new Date(dateValue).toISOString() : null };
            }
            return p;
        }));
    }

    const handleSubmit = () => {
        const amount = parseInt(fTotal.replace(/\D/g, ''), 10);
        onSubmit({ date: fDate, title: fTitle, totalAmount: amount, payer: fPayer, participants: fParticipants });
    };

    const toLocalInputString = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        return local.toISOString().slice(0, 16);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ngày</label>
                    <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Số tiền</label>
                    <input 
                      type="text" 
                      value={fTotal ? parseInt(fTotal).toLocaleString('vi-VN') : ''}
                      onChange={e => setFTotal(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-3 border rounded-lg font-bold text-red-600 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
                      placeholder="0"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nội dung</label>
                <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white" placeholder="Món ăn/Cafe..."/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Người trả tiền</label>
                  <select value={fPayer} onChange={e => setFPayer(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none">
                      <option value="">--Chọn--</option>
                      {people.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thêm người tham gia</label>
                  <button onClick={() => setFDropdownOpen(!fDropdownOpen)} className="w-full p-3 border rounded-lg bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-200 transition-all">
                      <span className="truncate text-gray-600">
                          {fParticipants.length > 0 ? `${fParticipants.length} người được chọn` : 'Chọn thêm...'}
                      </span>
                      <ChevronDown className="w-4 h-4"/>
                  </button>
                  {fDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 animate-in zoom-in-95 duration-200">
                          {people.map(p => (
                              <div key={p} onClick={() => toggleParticipant(p)}
                                   className={`flex justify-between p-3 hover:bg-gray-100 cursor-pointer rounded-lg ${fParticipants.some(fp => fp.name === p) ? 'text-gray-400 bg-gray-50' : 'text-gray-800'}`}>
                                  {p} {fParticipants.some(fp => fp.name === p) && <CheckCircle className="w-4 h-4"/>}
                              </div>
                          ))}
                      </div>
                  )}
                </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Danh sách chia tiền ({fParticipants.length})</label>
                {fParticipants.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-4 italic">Chưa chọn ai</div>
                ) : (
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
                                        <label className={`text-[10px] font-bold cursor-pointer ${p.paid ? 'text-green-600' : 'text-red-500'}`}>
                                            {p.paid ? 'Đã trả' : 'Chưa trả'}
                                        </label>
                                        <input 
                                          type="checkbox" 
                                          checked={p.paid || p.name === fPayer} 
                                          disabled={p.name === fPayer}
                                          onChange={() => togglePaidStatus(p.name)}
                                          className="w-4 h-4 accent-green-600 cursor-pointer"
                                        />
                                    </div>
                                    {p.paid && p.name !== fPayer && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <input 
                                                type="datetime-local"
                                                value={toLocalInputString(p.paidAt)}
                                                onChange={(e) => updatePaidDate(p.name, e.target.value)}
                                                className="text-[10px] border border-gray-300 rounded px-1 py-0.5 w-auto text-gray-600 bg-gray-50 focus:bg-white outline-none focus:border-blue-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-2">
                <button onClick={handleSubmit} className="flex-1 bg-blue-800 text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-all transform active:scale-[0.98] shadow-md">
                    {submitLabel}
                </button>
                {onCancel && (
                    <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition-all">
                        Hủy
                    </button>
                )}
            </div>
        </div>
    );
};

// --- MAIN APP ---
const App = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedCreditor, setExpandedCreditor] = useState<string | null>(null);
  const [showSampleOptions, setShowSampleOptions] = useState(false);
  const [expandedReportRows, setExpandedReportRows] = useState<Record<string, boolean>>({});

  // --- Initialization & Auth Listener ---
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    // Load data regardless of auth (since it's in localStorage)
    const savedPeople = localStorage.getItem('lunch_people_v13');
    const savedRecords = localStorage.getItem('lunch_records_v13');
    const initialState: AppState = {
      people: savedPeople ? JSON.parse(savedPeople) : [],
      records: savedRecords ? JSON.parse(savedRecords) : []
    };
    setHistory([initialState]);
    setHistoryIndex(0);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('lunch_people_v13', JSON.stringify(people));
      localStorage.setItem('lunch_records_v13', JSON.stringify(records));
    }
  }, [people, records, history]);

  // --- Dispatcher ---
  const dispatch = useCallback((action: Action) => {
    setHistory(prevHistory => {
      const current = prevHistory[historyIndex];
      let newState: AppState = { ...current };

      switch (action.type) {
        case 'ADD_PERSON':
          newState.people = [...current.people, action.payload];
          break;
        case 'REMOVE_PERSON':
          newState.people = current.people.filter(p => p !== action.payload);
          break;
        case 'ADD_RECORD':
          newState.records = [action.payload, ...current.records];
          break;
        case 'UPDATE_RECORD':
          newState.records = current.records.map(r => 
            r.id === action.payload.id ? action.payload : r
          );
          break;
        case 'DELETE_RECORD':
          newState.records = current.records.filter(r => r.id !== action.payload);
          break;
        case 'TOGGLE_PAID':
          newState.records = current.records.map(r => {
            if (r.id !== action.payload.recordId) return r;
            return {
              ...r,
              participants: r.participants.map(p => {
                if (p.name !== action.payload.personName) return p;
                const newPaidStatus = !p.paid;
                return { 
                  ...p, 
                  paid: newPaidStatus,
                  paidAt: newPaidStatus ? new Date().toISOString() : null
                };
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
            const now = new Date();
            const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
            newState.records = [
                {
                    id: generateId(),
                    date: now.toISOString().slice(0, 10),
                    createdAt: Date.now(),
                    title: "Cafe sáng (Team họp)",
                    totalAmount: 180000,
                    perPersonAmount: 45000,
                    payer: "Khánh",
                    participants: [
                        { name: "Khánh", paid: true, paidAt: now.toISOString() },
                        { name: "Minh Anh", paid: false },
                        { name: "Hiếu", paid: false },
                        { name: "Chị Trang", paid: false }
                    ]
                },
                {
                    id: generateId(),
                    date: yesterday.toISOString().slice(0, 10),
                    createdAt: Date.now() - 10000,
                    title: "Cơm tấm sườn bì",
                    totalAmount: 220000,
                    perPersonAmount: 55000,
                    payer: "Chị Trang",
                    participants: [
                        { name: "Khánh", paid: true, paidAt: now.toISOString() },
                        { name: "Minh Anh", paid: false },
                        { name: "Hiếu", paid: false },
                        { name: "Chị Trang", paid: true, paidAt: yesterday.toISOString() }
                    ]
                }
            ];
          }
          break;
        case 'CLEAR_DATA':
            newState = { people: [], records: [] };
            break;
        default:
          return prevHistory;
      }

      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(newState);
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  // --- Handlers ---
  const handleUndo = () => historyIndex > 0 && setHistoryIndex(historyIndex - 1);
  const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1);

  const handleAddPerson = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !people.includes(trimmedName)) {
      dispatch({ type: 'ADD_PERSON', payload: trimmedName });
      setNewPersonName('');
    }
  };

  const handleSaveRecord = (record: any, isEdit: boolean) => {
     if (!record.title) return alert('Thiếu nội dung chi!');
     if (!record.totalAmount || record.totalAmount <= 0) return alert('Số tiền không hợp lệ!');
     if (!record.payer) return alert('Chưa chọn người chi!');
     if (!record.participants || record.participants.length === 0) return alert('Chưa chọn người tham gia!');

     const perPerson = Math.ceil(record.totalAmount / record.participants.length);
     
     const fullParticipants: ParticipantStatus[] = record.participants.map((p: any) => {
        const isPayer = p.name === record.payer;
        return {
            name: p.name,
            paid: isPayer ? true : p.paid,
            paidAt: isPayer ? (p.paidAt || new Date().toISOString()) : (p.paid ? (p.paidAt || new Date().toISOString()) : null)
        };
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

     if (isEdit) {
         dispatch({ type: 'UPDATE_RECORD', payload: finalRecord });
         setEditingRecord(null);
     } else {
         dispatch({ type: 'ADD_RECORD', payload: finalRecord });
     }
  };

  const toggleReportRow = (name: string) => {
      setExpandedReportRows(prev => ({ ...prev, [name]: !prev[name] }));
  }

  // --- Logic for Unified View ---
  const filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
  const totalFilteredSpent = filtered