@ -3,58 +3,18 @@ import {
  Plus, Trash2, Users, DollarSign, Calendar, CheckCircle, XCircle, 
  ChevronDown, ChevronUp, Copy, Save, UtensilsCrossed, 
  PieChart, RotateCcw, RotateCw, Filter, Clock, Edit3, Database, Search, X, 
  RefreshCcw, LayoutList, TrendingUp, History, ArrowRight, HelpCircle, FileText, ChevronRight, AlertCircle, BookOpen, User, Menu
  RefreshCcw, LayoutList, TrendingUp, History, ArrowRight, HelpCircle, FileText, ChevronRight, AlertCircle, BookOpen, User, Menu, LogOut, Lock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, query, orderBy
} from 'firebase/firestore';

// ==================================================================================
// 🔴 BẮT ĐẦU CẤU HÌNH FIREBASE 🔴
// Hãy thay toàn bộ object bên dưới bằng config bạn lấy được từ Firebase Console
// ==================================================================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSy_YOUR_API_KEY_HERE", // <-- Dán API Key của bạn vào đây
  authDomain: "your-project.firebaseapp.com", // <-- Thay đổi
  projectId: "your-project-id", // <-- Thay đổi
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
// ==================================================================================
// 🔴 KẾT THÚC CẤU HÌNH 🔴
// ==================================================================================

// Khởi tạo Firebase an toàn
let db: any;
let auth: any;
let isFirebaseReady = false;

try {
    // Chỉ khởi tạo nếu config đã được thay đổi (không phải placeholder mặc định)
    if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        isFirebaseReady = true;
    }
} catch (e) {
    console.error("Lỗi khởi tạo Firebase:", e);
}

// App ID dùng để phân tách dữ liệu chung (Ví dụ: "team-marketing", "team-dev")
// Bạn có thể đổi string này để tạo ra một "phòng" dữ liệu mới
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'lunch-group-01';
import { auth } from './firebase'; // Đảm bảo bạn đã tạo file này ở Bước 2
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

// --- Theme & Style ---
const THEME_COLOR = '#000066'; 
const THEME_COLOR = '#000066'; // Navy Blue

// --- Types ---
interface ParticipantStatus {
@ -74,12 +34,55 @@ interface MealRecord {
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
const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString: string) => { if (!dateString) return ''; const date = new Date(dateString); return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date); };
const formatShortDate = (dateString: string) => { if (!dateString) return ''; const date = new Date(dateString); return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date); };
const formatDateTime = (isoString?: string | null) => { if (!isoString) return ''; const date = new Date(isoString); return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date); };
const formatDayOfWeek = (dateString: string) => { const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; const d = new Date(dateString); return days[d.getDay()]; }
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
@ -98,7 +101,8 @@ const copyToClipboard = (text: string) => {
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) resolve(); else reject(new Error('Copy failed'));
        if (successful) resolve();
        else reject(new Error('Copy command failed'));
      } catch (err) {
        document.body.removeChild(textArea);
        reject(err);
@ -107,9 +111,15 @@ const copyToClipboard = (text: string) => {
  }
};

// --- Components ---
const AnimatedCard = ({ children, className = "", delay = 0 }: any) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500 hover:shadow-md ${className}`} style={{ animation: `fadeInUp 0.5s ease-out ${delay}s both` }}>{children}</div>
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
@ -117,7 +127,9 @@ const CustomTooltip = ({ active, payload, label }: any) => {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm z-50">
        <p className="font-bold text-gray-800 mb-1">{label || payload[0].name}</p>
        <p className="text-blue-600 font-semibold">{formatCurrency(payload[0].value)}</p>
        <p className="text-blue-600 font-semibold">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
@ -134,10 +146,6 @@ const GuideModal = ({ onClose }: { onClose: () => void }) => (
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-gray-700 leading-relaxed">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <h5 className="font-bold text-blue-800 mb-1">🔥 Dữ liệu Online (Firebase)</h5>
                    <p className="text-sm">Dữ liệu giờ đây được lưu trên đám mây. Bạn có thể chia sẻ App ID <b>"{APP_ID}"</b> cho đồng nghiệp để cùng xem và chỉnh sửa trên nhiều máy khác nhau.</p>
                </div>
                <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">1. Quy trình cơ bản</h4>
                    <p className="mb-2">Ứng dụng hoạt động theo quy tắc: <b>Một người trả tiền trước, sau đó chia đều cho những người cùng ăn.</b></p>
@ -155,6 +163,14 @@ const GuideModal = ({ onClose }: { onClose: () => void }) => (
                        <li><b>Cách trả nợ:</b> Tick vào ô vuông <input type="checkbox" className="align-middle" /> bên cạnh món ăn. Khoản đó sẽ chuyển xuống mục <b>"Lịch sử đã trả"</b>.</li>
                    </ul>
                </section>
                 <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">3. Chỉnh sửa & Cập nhật ngày trả</h4>
                    <p className="mb-2 text-sm">Khi bấm nút <b>Sửa</b> (biểu tượng bút chì) ở Nhật ký giao dịch:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Bạn có thể tick chọn <b>"Đã trả"</b> cho từng người.</li>
                        <li>Khi tick chọn, một ô chọn <b>Ngày giờ</b> sẽ hiện ra bên dưới. Bạn có thể bấm vào đó để sửa lại ngày trả nợ.</li>
                    </ul>
                </section>
            </div>
            <div className="p-4 border-t bg-gray-50 text-right sticky bottom-0">
                <button onClick={onClose} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors">
@ -165,8 +181,14 @@ const GuideModal = ({ onClose }: { onClose: () => void }) => (
    </div>
);

// --- RecordForm Component ---
const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: any) => {
// --- Refactored RecordForm (Outside App) ---
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
@ -254,7 +276,7 @@ const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: an
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Người trả tiền</label>
                  <select value={fPayer} onChange={e => setFPayer(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none">
                      <option value="">--Chọn--</option>
                      {people.map((p: string) => <option key={p} value={p}>{p}</option>)}
                      {people.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="relative" ref={dropdownRef}>
@ -267,7 +289,7 @@ const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: an
                  </button>
                  {fDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 animate-in zoom-in-95 duration-200">
                          {people.map((p: string) => (
                          {people.map(p => (
                              <div key={p} onClick={() => toggleParticipant(p)}
                                   className={`flex justify-between p-3 hover:bg-gray-100 cursor-pointer rounded-lg ${fParticipants.some(fp => fp.name === p) ? 'text-gray-400 bg-gray-50' : 'text-gray-800'}`}>
                                  {p} {fParticipants.some(fp => fp.name === p) && <CheckCircle className="w-4 h-4"/>}
@ -307,6 +329,7 @@ const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: an
                                        />
                                    </div>
                                    
                                    {/* Date Picker for Paid Participants (Not Payer) */}
                                    {p.paid && p.name !== fPayer && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <input 
@ -338,178 +361,378 @@ const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people }: an
    );
};

// --- LOGIN COMPONENT ---
const LoginScreen = ({ onLogin }: { onLogin: (e: React.FormEvent, m: string, p: string) => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await onLogin(e, email, password);
        } catch (err: any) {
             console.error(err);
             if (err.code === 'auth/invalid-credential') setError('Email hoặc mật khẩu không đúng.');
             else if (err.code === 'auth/too-many-requests') setError('Quá nhiều lần thử sai. Hãy đợi một chút.');
             else setError('Đăng nhập thất bại: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" style={{ backgroundColor: '#f0f4f8' }}>
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                 <div className="p-8 pb-6 text-center text-white" style={{ backgroundColor: THEME_COLOR }}>
                     <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <UtensilsCrossed className="w-8 h-8 text-white" />
                     </div>
                     <h1 className="text-2xl font-bold">SỔ ĂN UỐNG</h1>
                     <p className="text-blue-200 text-sm mt-1">Đăng nhập để quản lý chi tiêu</p>
                 </div>
                 
                 <div className="p-8 pt-6">
                     {error && (
                         <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 border border-red-100">
                             <AlertCircle className="w-4 h-4 shrink-0"/> {error}
                         </div>
                     )}
                     <form onSubmit={handleSubmit} className="space-y-4">
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                             <input 
                                type="email" 
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none transition-all"
                                placeholder="name@example.com"
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mật khẩu</label>
                             <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                             />
                         </div>
                         <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg mt-2 flex justify-center items-center gap-2"
                            style={{ backgroundColor: THEME_COLOR }}
                         >
                            {isLoading ? (
                                <RefreshCcw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" /> ĐĂNG NHẬP
                                </>
                            )}
                         </button>
                     </form>
                     <p className="text-center text-xs text-gray-400 mt-6">
                        © 2026 Ứng dụng quản lý nội bộ.
                     </p>
                 </div>
            </div>
        </div>
    )
}

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- History & State ---
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Safe default state if history is empty
  const currentState = history[historyIndex] || { people: [], records: [] };
  const { people, records } = currentState;

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'entry' | 'debt_history' | 'report' | 'people'>('entry');
  const [showGuide, setShowGuide] = useState(false);
  
  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<MealRecord | null>(null);

  // New Person Input
  const [newPersonName, setNewPersonName] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));

  // Unified Filter State (Date Range)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Expanded State
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedCreditor, setExpandedCreditor] = useState<string | null>(null);
  const [showSampleOptions, setShowSampleOptions] = useState(false);
  const [expandedReportRows, setExpandedReportRows] = useState<Record<string, boolean>>({});

  // --- AUTH ---
  // --- Initialization & Auth Check ---
  useEffect(() => {
    if (!isFirebaseReady) return;
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            // Trường hợp chạy trong môi trường đặc biệt của Canvas
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- REALTIME DATA SYNC ---
  // Load data ONLY if logged in
  useEffect(() => {
      if (!isFirebaseReady || !currentUser) return;
    if (currentUser) {
        const savedPeople = localStorage.getItem('lunch_people_v13');
        const savedRecords = localStorage.getItem('lunch_records_v13');
        const initialState: AppState = {
          people: savedPeople ? JSON.parse(savedPeople) : [],
          records: savedRecords ? JSON.parse(savedRecords) : []
        };
        setHistory([initialState]);
        setHistoryIndex(0);
    }
  }, [currentUser]);

      // 1. Sync People
      const peopleUnsub = onSnapshot(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), (docSnap) => {
          if (docSnap.exists()) {
              setPeople(docSnap.data().people || []);
          }
      });
  useEffect(() => {
    if (currentUser && history.length > 0) {
      localStorage.setItem('lunch_people_v13', JSON.stringify(people));
      localStorage.setItem('lunch_records_v13', JSON.stringify(records));
    }
  }, [people, records, history, currentUser]);

  // --- Authentication Handlers ---
  const handleLogin = async (e: React.FormEvent, email: string, pass: string) => {
      await signInWithEmailAndPassword(auth, email, pass);
  };

  const handleLogout = async () => {
      if(confirm('Bạn có chắc muốn đăng xuất?')) {
          await signOut(auth);
      }
  };

  // --- Dispatcher ---
  const dispatch = useCallback((action: Action) => {
    setHistory(prevHistory => {
      const current = prevHistory[historyIndex];
      let newState: AppState = { ...current };

      // 2. Sync Records
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'meals')); 
      const recordsUnsub = onSnapshot(q, (snapshot) => {
          const loadedRecords: MealRecord[] = [];
          snapshot.forEach((doc) => {
              loadedRecords.push({ id: doc.id, ...doc.data() } as MealRecord);
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
          // Client sort (or add orderBy to query if index created)
          loadedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRecords(loadedRecords);
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

      return () => {
          peopleUnsub();
          recordsUnsub();
      };
  }, [currentUser]);
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(newState);
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  // --- Handlers ---
  const handleUndo = () => historyIndex > 0 && setHistoryIndex(historyIndex - 1);
  const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1);

  // --- HANDLERS ---
  const handleAddPerson = async (name: string) => {
    if (!isFirebaseReady) return alert("Vui lòng cấu hình Firebase trong code để lưu dữ liệu.");
  const handleAddPerson = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !people.includes(trimmedName)) {
        const newPeople = [...people, trimmedName];
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), { people: newPeople }, { merge: true });
        setNewPersonName('');
      dispatch({ type: 'ADD_PERSON', payload: trimmedName });
      setNewPersonName('');
    }
  };

  const handleRemovePerson = async (name: string) => {
      if (!isFirebaseReady) return;
      if(confirm(`Xóa ${name}?`)) {
          const newPeople = people.filter(p => p !== name);
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), { people: newPeople }, { merge: true });
      }
  }
  const handleSaveRecord = (record: any, isEdit: boolean) => {
      if (!record.title) return alert('Thiếu nội dung chi!');
      if (!record.totalAmount || record.totalAmount <= 0) return alert('Số tiền không hợp lệ!');
      if (!record.payer) return alert('Chưa chọn người chi!');
      if (!record.participants || record.participants.length === 0) return alert('Chưa chọn người tham gia!');

  const handleSaveRecord = async (record: any, isEdit: boolean) => {
     if (!isFirebaseReady) return alert("Vui lòng cấu hình Firebase!");
     if (!record.title || !record.totalAmount || !record.payer || record.participants.length === 0) {
         return alert('Vui lòng nhập đủ thông tin!');
     }

     const perPerson = Math.ceil(record.totalAmount / record.participants.length);
     
     const fullParticipants = record.participants.map((p: any) => ({
        name: p.name,
        paid: p.name === record.payer ? true : p.paid,
        paidAt: p.name === record.payer ? (p.paidAt || new Date().toISOString()) : (p.paid ? (p.paidAt || new Date().toISOString()) : null)
     }));

     const recordData = {
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
         date: record.date,
         title: record.title,
         date: record.date || new Date().toISOString().slice(0, 10),
         title: record.title || '',
         totalAmount: record.totalAmount,
         perPersonAmount: perPerson,
         payer: record.payer,
         payer: record.payer || '',
         participants: fullParticipants
     };

     const docId = isEdit && editingRecord ? editingRecord.id : generateId();
     
     try {
         await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', docId), recordData);
         if (isEdit) setEditingRecord(null);
         else alert('Đã lưu thành công!');
     } catch (e) {
         alert('Lỗi lưu: ' + e);
     }
  };
      };

  const handleDeleteRecord = async (id: string) => {
      if (!isFirebaseReady) return;
      if (confirm('Xóa giao dịch này?')) {
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', id));
      if (isEdit) {
          dispatch({ type: 'UPDATE_RECORD', payload: finalRecord });
          setEditingRecord(null);
      } else {
          dispatch({ type: 'ADD_RECORD', payload: finalRecord });
      }
  }

  const handleTogglePaid = async (recordId: string, personName: string) => {
      if (!isFirebaseReady) return;
      const record = records.find(r => r.id === recordId);
      if (!record) return;
  };

      const updatedParticipants = record.participants.map(p => {
          if (p.name !== personName) return p;
          const newPaid = !p.paid;
          return { ...p, paid: newPaid, paidAt: newPaid ? new Date().toISOString() : null };
      });
  const toggleReportRow = (name: string) => {
      setExpandedReportRows(prev => ({ ...prev, [name]: !prev[name] }));
  }

      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', recordId), { ...record, participants: updatedParticipants });
  };
  // --- VIEW LOGIC ---

  const handleMarkAllPaid = async (personName: string) => {
      if (!isFirebaseReady) return;
      if (!confirm(`Xác nhận ${personName} trả hết nợ?`)) return;
      const unpaidRecords = records.filter(r => r.payer !== personName && r.participants.some(p => p.name === personName && !p.paid));
      for (const record of unpaidRecords) {
          const updatedParticipants = record.participants.map(p => {
              if (p.name === personName) return { ...p, paid: true, paidAt: new Date().toISOString() };
              return p;
          });
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'meals', record.id), { ...record, participants: updatedParticipants });
      }
  };
  // 1. Loading State
  if (authLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
               <RefreshCcw className="w-8 h-8 text-blue-900 animate-spin" />
          </div>
      );
  }

  const toggleReportRow = (name: string) => setExpandedReportRows(prev => ({ ...prev, [name]: !prev[name] }));
  // 2. Unauthenticated State
  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  // --- CALCULATION LOGIC (Same as before) ---
  // 3. Main App Logic (Computed only when logged in)
  const filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
  const totalFilteredSpent = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  interface MealDetail { id: string; date: string; title: string; amount: number; isPaid: boolean }
  const getNetBalances = () => {
    const balances: Record<string, any> = {};
    const balances: Record<string, { owed: number, debt: number, net: number, meals: MealDetail[] }> = {};
    people.forEach(p => balances[p] = { owed: 0, debt: 0, net: 0, meals: [] });

    filteredRecords.forEach(r => {
       r.participants.forEach(p => {
          if (balances[p.name]) balances[p.name].meals.push({ id: r.id, date: r.date, title: r.title, amount: r.perPersonAmount, isPaid: p.paid });
          if (balances[p.name]) {
              balances[p.name].meals.push({
                  id: r.id,
                  date: r.date,
                  title: r.title,
                  amount: r.perPersonAmount,
                  isPaid: p.paid
              });
          }
          if (p.name !== r.payer && !p.paid) {
             if (balances[p.name]) balances[p.name].debt += r.perPersonAmount;
             if (balances[r.payer]) balances[r.payer].owed += r.perPersonAmount;
          }
       });
    });
    Object.keys(balances).forEach(key => { balances[key].net = balances[key].owed - balances[key].debt; });

    Object.keys(balances).forEach(key => {
        balances[key].net = balances[key].owed - balances[key].debt;
    });
    return Object.entries(balances).map(([name, val]) => ({ name, ...val }));
  };

  const netBalances = getNetBalances();
  const creditors = netBalances.filter(x => x.net > 0).sort((a, b) => b.net - a.net);
  const debtors = netBalances.filter(x => x.net < 0).sort((a, b) => a.net - b.net);
  

  const spendingByPerson = people.map(person => {
      const value = filteredRecords.reduce((sum, r) => {
          const p = r.participants.find(pt => pt.name === person);
@ -520,77 +743,128 @@ const App = () => {

  const debtSummaryData = netBalances.map(nb => ({ name: nb.name, net: nb.net }));
  
  const historyByDate = filteredRecords.reduce((acc: any, record) => {
  const historyByDate = filteredRecords
    .reduce((acc, record) => {
        const d = record.date;
        if (!acc[d]) acc[d] = []; acc[d].push(record); return acc;
    }, {});
        if (!acc[d]) acc[d] = [];
        acc[d].push(record);
        return acc;
    }, {} as Record<string, MealRecord[]>);
  const sortedHistoryDates = Object.keys(historyByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="min-h-screen font-sans flex flex-col text-gray-800 bg-gray-50">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter { animation: fadeInUp 0.3s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* Undo/Redo Controls */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="bg-white p-3 rounded-full shadow-lg border hover:bg-blue-50 disabled:opacity-50 transition-all hover:scale-110 active:scale-95">
            <RotateCw className="w-5 h-5 text-gray-700" />
        </button>
        <button onClick={handleUndo} disabled={historyIndex <= 0} className="bg-white p-3 rounded-full shadow-lg border hover:bg-blue-50 disabled:opacity-50 transition-all hover:scale-110 active:scale-95">
            <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Header */}
      <header className="text-white p-4 shadow-lg sticky top-0 z-30 transition-all" style={{ backgroundColor: THEME_COLOR }}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold uppercase tracking-wide leading-tight flex items-center gap-1">Sổ Ăn Uống <span className="text-yellow-400 text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">Online</span></h1>
                <h1 className="text-lg font-bold uppercase tracking-wide leading-tight flex items-center gap-1">
                    Sổ Ăn Uống <span className="text-yellow-400 text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">Pro</span>
                </h1>
                <span className="text-xs text-blue-200 opacity-80 font-medium hidden sm:block">Quản lý tài chính văn phòng</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
              {!isFirebaseReady && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded animate-pulse">Thiếu Config Firebase</span>}
              <button onClick={() => setShowGuide(true)} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold transition-colors">
              <button 
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                <BookOpen className="w-5 h-5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">HƯỚNG DẪN</span>
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1 bg-red-600/80 hover:bg-red-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors text-white"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5 sm:w-4 sm:h-4"/> 
              </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {/* Navigation - Responsive Scroll */}
      <div className="bg-white shadow-sm sticky top-[72px] z-20 border-b border-gray-100">
        <nav className="max-w-5xl mx-auto flex overflow-x-auto no-scrollbar snap-x">
           {[{ id: 'entry', icon: Plus, label: 'Nhập Liệu' }, { id: 'debt_history', icon: LayoutList, label: 'Theo Dõi' }, { id: 'report', icon: PieChart, label: 'Báo Cáo' }, { id: 'people', icon: Users, label: 'Thành Viên' }].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[25%] sm:min-w-[auto] flex flex-col items-center justify-center py-3 px-1 text-xs font-semibold transition-all border-b-4 duration-300 snap-start ${activeTab === tab.id ? `border-[${THEME_COLOR}] text-[${THEME_COLOR}] bg-blue-50/60` : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`} style={activeTab === tab.id ? { color: THEME_COLOR, borderColor: THEME_COLOR } : {}}>
               <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'transform scale-110' : ''} transition-transform`} />{tab.label}
           {[
             { id: 'entry', icon: Plus, label: 'Nhập Liệu' },
             { id: 'debt_history', icon: LayoutList, label: 'Theo Dõi' },
             { id: 'report', icon: PieChart, label: 'Báo Cáo' },
             { id: 'people', icon: Users, label: 'Thành Viên' },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex-1 min-w-[25%] sm:min-w-[auto] flex flex-col items-center justify-center py-3 px-1 text-xs font-semibold transition-all border-b-4 duration-300 snap-start
                 ${activeTab === tab.id 
                   ? `border-[${THEME_COLOR}] text-[${THEME_COLOR}] bg-blue-50/60` 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
               style={activeTab === tab.id ? { color: THEME_COLOR, borderColor: THEME_COLOR } : {}}
             >
               <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'transform scale-110' : ''} transition-transform`} />
               {tab.label}
             </button>
           ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full p-3 sm:p-4 pb-24 flex-1">
        {!isFirebaseReady && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm">
                <div className="flex">
                    <div className="flex-shrink-0"><AlertCircle className="h-5 w-5 text-yellow-400" /></div>
                    <div className="ml-3"><p className="text-sm text-yellow-700">Bạn chưa cài đặt Firebase Config. Vui lòng mở file code và dán config vào biến <b>firebaseConfig</b> ở dòng 23.</p></div>
                </div>
            </div>
        )}

        
        {/* TAB 1: ENTRY */}
        {activeTab === 'entry' && (
          <div className="animate-enter max-w-2xl mx-auto">
            <AnimatedCard className="p-4 sm:p-6">
              <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2" style={{ color: THEME_COLOR }}><Plus className="w-6 h-6" /> Ghi Nhận Chi Tiêu</h3>
              <RecordForm initialData={{}} people={people} onSubmit={(data: any) => handleSaveRecord(data, false)} submitLabel="LƯU GIAO DỊCH" />
              <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2" style={{ color: THEME_COLOR }}>
                <Plus className="w-6 h-6" /> Ghi Nhận Chi Tiêu
              </h3>
              <RecordForm 
                 initialData={{}}
                 people={people}
                 onSubmit={(data: any) => handleSaveRecord(data, false)}
                 submitLabel="LƯU GIAO DỊCH"
              />
            </AnimatedCard>
          </div>
        )}

        {/* TAB 2: DEBT & HISTORY */}
        {/* TAB 2: DEBT & HISTORY (MERGED) */}
        {activeTab === 'debt_history' && (
          <div className="space-y-6 animate-enter">
              
             {/* Unified Filter */}
             <AnimatedCard className="p-4 flex flex-col md:flex-row gap-4 border-l-4 border-blue-500 items-center sticky top-[130px] z-10 shadow-md">
                <div className="flex flex-col sm:flex-row gap-2 items-center flex-1 w-full">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0"><Filter className="w-4 h-4 text-gray-500"/><span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Lọc từ:</span></div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                        <Filter className="w-4 h-4 text-gray-500"/>
                        <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Lọc từ:</span>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 p-2 rounded text-sm outline-none flex-1 w-full"/>
                        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0"/>
@ -599,12 +873,13 @@ const App = () => {
                </div>
             </AnimatedCard>

             {/* SECTION 1: NET BALANCES */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* CREDITORS */}
                <AnimatedCard className="overflow-hidden border-green-100">
                    <div className="bg-green-50/80 p-4 border-b border-green-100 flex items-center justify-between backdrop-blur-sm">
                        <h4 className="font-bold text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> CẦN THU VỀ</h4>
                        <span className="text-xs font-medium bg-white px-2 py-1 rounded text-green-700 border border-green-200">Đã ứng</span>
                        <span className="text-xs font-medium bg-white px-2 py-1 rounded text-green-700 border border-green-200">Người đã ứng</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {creditors.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Không có khoản cần thu.</div>}
@ -621,22 +896,26 @@ const App = () => {
                                </div>
                                {expandedCreditor === item.name && (
                                    <div className="mt-3 pt-3 border-t border-green-100 text-sm space-y-2 animate-enter">
                                        {filteredRecords.map(r => {
                                             if (r.payer === item.name) {
                                                 const unpaid = r.participants.filter(p => !p.paid && p.name !== item.name);
                                                 if (unpaid.length > 0) return (
                                                     <div key={r.id} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1">
                                                         <div className="flex-1 pr-2">
                                                             <div className="font-medium text-gray-700">{r.title}</div>
                                                             <div className="text-[10px] text-gray-400">{formatShortDate(r.date)}</div>
                                                             <div className="text-[11px] text-red-500 font-medium mt-0.5">Chưa trả: {unpaid.map(p => p.name).join(', ')}</div>
                                                         </div>
                                                         <div className="font-medium text-green-600 text-right whitespace-nowrap">+{formatCurrency(r.perPersonAmount * unpaid.length)}</div>
                                                     </div>
                                                 )
                                             }
                                             return null;
                                        })}
                                            {filteredRecords.map(r => {
                                               if (r.payer === item.name) {
                                                  const unpaid = r.participants.filter(p => !p.paid && p.name !== item.name);
                                                  if (unpaid.length > 0) {
                                                      return (
                                                          <div key={r.id} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1">
                                                               <div className="flex-1 pr-2">
                                                                  <div className="font-medium text-gray-700">{r.title}</div>
                                                                  <div className="text-[10px] text-gray-400">{formatShortDate(r.date)}</div>
                                                                  <div className="text-[11px] text-red-500 font-medium mt-0.5">Chưa trả: {unpaid.map(p => p.name).join(', ')}</div>
                                                               </div>
                                                               <div className="font-medium text-green-600 text-right whitespace-nowrap">
                                                                  <div>+{formatCurrency(r.perPersonAmount * unpaid.length)}</div>
                                                               </div>
                                                          </div>
                                                      )
                                                  }
                                               }
                                               return null;
                                            })}
                                    </div>
                                )}
                            </div>
@ -665,47 +944,58 @@ const App = () => {
                                </div>
                                {expandedPerson === item.name && (
                                    <div className="mt-4 space-y-4 animate-enter">
                                        <div className="bg-red-50 rounded p-2 text-sm border border-red-100">
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-red-200">
                                                <span className="text-[10px] font-bold text-red-800 uppercase">Chưa trả</span>
                                                <button onClick={() => handleMarkAllPaid(item.name)} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 uppercase font-bold">Trả hết ngay</button>
                                            <div className="bg-red-50 rounded p-2 text-sm border border-red-100">
                                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-red-200">
                                                    <span className="text-[10px] font-bold text-red-800 uppercase">Chưa trả</span>
                                                    <button 
                                                        onClick={() => dispatch({type: 'MARK_ALL_PAID', payload: {personName: item.name}})}
                                                        className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 uppercase font-bold"
                                                    >
                                                        Trả hết ngay
                                                    </button>
                                                </div>
                                                {filteredRecords.map(r => {
                                                    const p = r.participants.find(part => part.name === item.name);
                                                    if (p && !p.paid && r.payer !== item.name) {
                                                        return (
                                                            <div key={r.id} className="flex justify-between items-center py-2 border-b border-red-100/50 last:border-0 hover:bg-white rounded px-1 transition-colors">
                                                                <div className="flex-1 pr-2">
                                                                    <div className="font-medium text-gray-800">{r.title}</div>
                                                                    <div className="text-[10px] text-gray-500">{formatShortDate(r.date)} • Ứng: <b>{r.payer}</b></div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-bold text-red-600 whitespace-nowrap">{formatCurrency(r.perPersonAmount)}</span>
                                                                    <input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer" onChange={() => dispatch({type: 'TOGGLE_PAID', payload: {recordId: r.id, personName: item.name}})}/>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                            
                                            {/* PAID HISTORY */}
                                            <div className="bg-gray-50 rounded p-2 text-sm border border-gray-200">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-2 border-b pb-1">Lịch sử đã trả</div>
                                                {filteredRecords.map(r => {
                                                    const p = r.participants.find(part => part.name === item.name);
                                                    if (p && p.paid && r.payer !== item.name) {
                                                        return (
                                                            <div key={r.id} className="flex justify-between items-center py-1.5 opacity-70 hover:opacity-100 border-b border-gray-100 last:border-0">
                                                                <div className="flex-1 pr-2">
                                                                    <div className="font-medium text-gray-600 line-through decoration-gray-400">{r.title}</div>
                                                                    <div className="text-[9px] text-blue-600">Đã trả: {p.paidAt ? formatDateTime(p.paidAt) : '---'}</div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-500 text-xs line-through whitespace-nowrap">{formatCurrency(r.perPersonAmount)}</span>
                                                                    <input type="checkbox" checked={true} className="w-4 h-4 accent-gray-400 cursor-pointer" onChange={() => dispatch({type: 'TOGGLE_PAID', payload: {recordId: r.id, personName: item.name}})}/>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                            {filteredRecords.map(r => {
                                                const p = r.participants.find(part => part.name === item.name);
                                                if (p && !p.paid && r.payer !== item.name) return (
                                                    <div key={r.id} className="flex justify-between items-center py-2 border-b border-red-100/50 last:border-0 hover:bg-white rounded px-1 transition-colors">
                                                        <div className="flex-1 pr-2">
                                                            <div className="font-medium text-gray-800">{r.title}</div>
                                                            <div className="text-[10px] text-gray-500">{formatShortDate(r.date)} • Ứng: <b>{r.payer}</b></div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-red-600 whitespace-nowrap">{formatCurrency(r.perPersonAmount)}</span>
                                                            <input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer" onChange={() => handleTogglePaid(r.id, item.name)}/>
                                                        </div>
                                                    </div>
                                                )
                                                return null;
                                            })}
                                        </div>
                                        <div className="bg-gray-50 rounded p-2 text-sm border border-gray-200">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-2 border-b pb-1">Lịch sử đã trả</div>
                                            {filteredRecords.map(r => {
                                                const p = r.participants.find(part => part.name === item.name);
                                                if (p && p.paid && r.payer !== item.name) return (
                                                    <div key={r.id} className="flex justify-between items-center py-1.5 opacity-70 hover:opacity-100 border-b border-gray-100 last:border-0">
                                                        <div className="flex-1 pr-2">
                                                            <div className="font-medium text-gray-600 line-through decoration-gray-400">{r.title}</div>
                                                            <div className="text-[9px] text-blue-600">Đã trả: {p.paidAt ? formatDateTime(p.paidAt) : '---'}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500 text-xs line-through whitespace-nowrap">{formatCurrency(r.perPersonAmount)}</span>
                                                            <input type="checkbox" checked={true} className="w-4 h-4 accent-gray-400 cursor-pointer" onChange={() => handleTogglePaid(r.id, item.name)}/>
                                                        </div>
                                                    </div>
                                                )
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
@ -714,54 +1004,79 @@ const App = () => {
                </AnimatedCard>
             </div>

             {/* SECTION 2: TIMELINE (HISTORY) */}
             <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2"><History className="w-6 h-6 text-blue-600"/> Nhật Ký Giao Dịch</h3>
                     
                     <div className="flex flex-wrap items-center gap-3 bg-white rounded-full px-4 py-1.5 border shadow-sm text-xs mt-2 md:mt-0">
                         <span className="flex items-center gap-1 font-bold text-green-700"><CheckCircle className="w-3 h-3"/> Xanh = Đã trả</span>
                         <span className="w-[1px] h-3 bg-gray-300"></span>
                         <span className="flex items-center gap-1 text-gray-500">Xám = Chưa trả</span>
                     </div>
                 </div>
                 {sortedHistoryDates.map(date => (
                     <div key={date} className="relative pl-4 sm:pl-6 border-l-2 border-blue-200 ml-2 pb-6 last:pb-0">
                         <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                         <div className="mb-4">
                             <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm">{formatDayOfWeek(date)}, {formatDate(date)}</div>
                             <div className="space-y-4">
                                 {historyByDate[date].map((record: any, rIdx: number) => (
                                     <AnimatedCard key={record.id} className="p-4 hover:border-blue-300 relative group border-l-4 border-l-transparent hover:border-l-blue-500 transition-all" delay={rIdx * 0.05}>
                                         <div className="flex justify-between items-start mb-2"> 
                                             <div>
                                                 <h4 className="font-bold text-gray-800 text-base">{record.title}</h4>
                                                 <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                                     <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100 whitespace-nowrap">{record.payer} chi</span>
                                                     <ArrowRight className="w-3 h-3 text-gray-300 hidden sm:block"/>
                                                     <span className="text-xs">{record.participants.length} người</span>

                 {sortedHistoryDates.length === 0 ? (
                     <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
                         <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                         Không có dữ liệu.
                     </div>
                 ) : (
                     sortedHistoryDates.map(date => (
                         <div key={date} className="relative pl-4 sm:pl-6 border-l-2 border-blue-200 ml-2 pb-6 last:pb-0">
                             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                             
                             <div className="mb-4">
                                 <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3 shadow-sm">
                                     {formatDayOfWeek(date)}, {formatDate(date)}
                                 </div>
                                 <div className="space-y-4">
                                     {historyByDate[date].map((record, rIdx) => (
                                         <AnimatedCard key={record.id} className="p-4 hover:border-blue-300 relative group border-l-4 border-l-transparent hover:border-l-blue-500 transition-all" delay={rIdx * 0.05}>
                                             <div className="flex justify-between items-start mb-2"> 
                                                 <div>
                                                     <h4 className="font-bold text-gray-800 text-base">{record.title}</h4>
                                                     <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                                         <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100 whitespace-nowrap">{record.payer} chi</span>
                                                         <ArrowRight className="w-3 h-3 text-gray-300 hidden sm:block"/>
                                                         <span className="text-xs">{record.participants.length} người</span>
                                                     </div>
                                                 </div>
                                                 <div className="text-right pl-2">
                                                     <div className="font-bold text-lg text-gray-800 whitespace-nowrap">{formatCurrency(record.totalAmount)}</div>
                                                     <div className="text-xs text-gray-500 font-medium whitespace-nowrap">~{formatCurrency(record.perPersonAmount)}</div>
                                                 </div>
                                             </div>
                                             <div className="text-right pl-2">
                                                 <div className="font-bold text-lg text-gray-800 whitespace-nowrap">{formatCurrency(record.totalAmount)}</div>
                                                 <div className="text-xs text-gray-500 font-medium whitespace-nowrap">~{formatCurrency(record.perPersonAmount)}</div>

                                             <div className="flex flex-wrap gap-2 mt-3 mb-4">
                                                 {record.participants.map(p => (
                                                     <div 
                                                         key={p.name} 
                                                         className={`px-2 py-1 rounded border text-xs flex items-center gap-1 transition-colors cursor-help
                                                         ${p.paid ? 'bg-green-50 text-green-700 border-green-200 font-bold shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                                                         title={p.paid && p.paidAt ? `Đã trả lúc: ${formatDateTime(p.paidAt)}` : 'Chưa trả'}
                                                     >
                                                         {p.name} 
                                                         {p.paid && <CheckCircle className="w-3 h-3"/>}
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                         <div className="flex flex-wrap gap-2 mt-3 mb-4">
                                             {record.participants.map((p: any) => (
                                                 <div key={p.name} className={`px-2 py-1 rounded border text-xs flex items-center gap-1 transition-colors cursor-help ${p.paid ? 'bg-green-50 text-green-700 border-green-200 font-bold shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`} title={p.paid && p.paidAt ? `Đã trả lúc: ${formatDateTime(p.paidAt)}` : 'Chưa trả'}>
                                                     {p.name} {p.paid && <CheckCircle className="w-3 h-3"/>}
                                                 </div>
                                             ))}
                                         </div>
                                         <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                             <button onClick={() => setEditingRecord(record)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors"><Edit3 className="w-3 h-3"/> Sửa</button>
                                             <button onClick={() => handleDeleteRecord(record.id)} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors"><Trash2 className="w-3 h-3"/> Xóa</button>
                                         </div>
                                     </AnimatedCard>
                                 ))}
                                             
                                             <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                                 <button onClick={() => setEditingRecord(record)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors">
                                                     <Edit3 className="w-3 h-3"/> Sửa
                                                 </button>
                                                 <button onClick={() => { if(confirm('Xóa giao dịch này?')) dispatch({type: 'DELETE_RECORD', payload: record.id}) }} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors">
                                                     <Trash2 className="w-3 h-3"/> Xóa
                                                 </button>
                                             </div>
                                         </AnimatedCard>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     </div>
                 ))}
                     ))
                 )}
             </div>
          </div>
        )}
@ -798,6 +1113,7 @@ const App = () => {
                            </RePieChart>
                        </ResponsiveContainer>
                    </AnimatedCard>
                    
                    <AnimatedCard className="p-4 h-72">
                        <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Biểu đồ Công nợ</h4>
                        <ResponsiveContainer width="100%" height="90%">
@ -818,23 +1134,69 @@ const App = () => {
             <AnimatedCard className="p-4 sm:p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h4 className="font-bold text-gray-700 uppercase flex items-center gap-2"><FileText className="w-4 h-4"/> Bảng Tổng Hợp</h4>
                    <button onClick={() => { const lines = netBalances.map(nb => `${nb.name}: ${formatCurrency(nb.net)}`).join('\n'); copyToClipboard(lines); alert('Đã copy!'); }} className="text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded font-medium transition-colors w-full sm:w-auto justify-center"><Copy className="w-3 h-3"/> Copy nội dung</button>
                    <button onClick={() => {
                        const lines = netBalances.map(nb => `${nb.name}: ${formatCurrency(nb.net)}`).join('\n');
                        copyToClipboard(lines);
                        alert('Đã copy!');
                    }} className="text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded font-medium transition-colors w-full sm:w-auto justify-center">
                        <Copy className="w-3 h-3"/> Copy nội dung
                    </button>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left border-collapse min-w-[500px] sm:min-w-0">
                         <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                             <tr><th className="px-4 py-3 border-b w-[40%]">Thành viên</th><th className="px-4 py-3 border-b text-right">Dư nợ</th><th className="px-4 py-3 border-b text-right">Chi tiết</th></tr>
                             <tr>
                                 <th className="px-4 py-3 border-b w-[40%]">Thành viên</th>
                                 <th className="px-4 py-3 border-b text-right">Dư nợ</th>
                                 <th className="px-4 py-3 border-b text-right">Chi tiết</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {netBalances.map(nb => (
                                 <React.Fragment key={nb.name}>
                                     <tr className="hover:bg-gray-50 cursor-pointer group" onClick={() => toggleReportRow(nb.name)}>
                                         <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2"><div className={`p-1 rounded-full transition-transform duration-200 ${expandedReportRows[nb.name] ? 'rotate-90 bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}><ChevronRight className="w-4 h-4"/></div>{nb.name}</td>
                                         <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${nb.net > 0 ? 'text-green-600' : (nb.net < 0 ? 'text-red-600' : 'text-gray-400')}`}>{nb.net > 0 ? '+' : ''}{formatCurrency(nb.net)}</td>
                                         <td className="px-4 py-3 text-right text-gray-400 text-xs">{nb.meals.length} bữa ăn (Xem)</td>
                                     <tr 
                                        className="hover:bg-gray-50 cursor-pointer group"
                                        onClick={() => toggleReportRow(nb.name)}
                                     >
                                         <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2">
                                             <div className={`p-1 rounded-full transition-transform duration-200 ${expandedReportRows[nb.name] ? 'rotate-90 bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                                 <ChevronRight className="w-4 h-4"/>
                                             </div>
                                             {nb.name}
                                         </td>
                                         <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${nb.net > 0 ? 'text-green-600' : (nb.net < 0 ? 'text-red-600' : 'text-gray-400')}`}>
                                             {nb.net > 0 ? '+' : ''}{formatCurrency(nb.net)}
                                         </td>
                                         <td className="px-4 py-3 text-right text-gray-400 text-xs">
                                             {nb.meals.length} bữa ăn (Xem)
                                         </td>
                                     </tr>
                                     {expandedReportRows[nb.name] && (
                                         <tr className="bg-gray-50/50 animate-in fade-in"><td colSpan={3} className="px-4 py-3 pl-4 sm:pl-12"><div className="text-[11px] uppercase font-bold text-gray-400 mb-2">Lịch sử tham gia:</div>{nb.meals.length > 0 ? (<div className="space-y-2">{nb.meals.map((m, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-xs shadow-sm"><div className="flex gap-2 sm:gap-3 flex-1 overflow-hidden"><span className="font-mono text-gray-500 whitespace-nowrap">{formatShortDate(m.date)}</span><span className="font-medium text-gray-700 truncate">{m.title}</span></div><div className="flex items-center gap-2 pl-2">{m.isPaid ? <span className="text-green-600 flex items-center gap-1 font-bold bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap hidden sm:flex"><CheckCircle className="w-3 h-3"/> Đã trả</span> : <span className="text-gray-400 italic whitespace-nowrap hidden sm:inline">Chưa trả</span>}<span className="font-bold text-gray-800 w-[60px] text-right">{formatCurrency(m.amount)}</span></div></div>))}</div>) : <div className="text-xs text-gray-400 italic">Chưa tham gia bữa nào.</div>}</td></tr>
                                         <tr className="bg-gray-50/50 animate-in fade-in">
                                             <td colSpan={3} className="px-4 py-3 pl-4 sm:pl-12">
                                                 <div className="text-[11px] uppercase font-bold text-gray-400 mb-2">Lịch sử tham gia:</div>
                                                 {nb.meals.length > 0 ? (
                                                     <div className="space-y-2">
                                                         {nb.meals.map((m, idx) => (
                                                             <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-xs shadow-sm">
                                                                 <div className="flex gap-2 sm:gap-3 flex-1 overflow-hidden">
                                                                     <span className="font-mono text-gray-500 whitespace-nowrap">{formatShortDate(m.date)}</span>
                                                                     <span className="font-medium text-gray-700 truncate">{m.title}</span>
                                                                 </div>
                                                                 <div className="flex items-center gap-2 pl-2">
                                                                     {m.isPaid ? 
                                                                         <span className="text-green-600 flex items-center gap-1 font-bold bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap hidden sm:flex"><CheckCircle className="w-3 h-3"/> Đã trả</span> 
                                                                         : 
                                                                         <span className="text-gray-400 italic whitespace-nowrap hidden sm:inline">Chưa trả</span>
                                                                     }
                                                                     <span className="font-bold text-gray-800 w-[60px] text-right">{formatCurrency(m.amount)}</span>
                                                                 </div>
                                                             </div>
                                                         ))}
                                                     </div>
                                                 ) : <div className="text-xs text-gray-400 italic">Chưa tham gia bữa nào trong khoảng thời gian này.</div>}
                                             </td>
                                         </tr>
                                     )}
                                 </React.Fragment>
                             ))}
@ -842,6 +1204,7 @@ const App = () => {
                     </table>
                 </div>
             </AnimatedCard>

          </div>
        )}

@ -850,22 +1213,68 @@ const App = () => {
          <div className="animate-enter max-w-3xl mx-auto">
             <AnimatedCard className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                    <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: THEME_COLOR }}><Users className="w-6 h-6" /> Danh Sách Thành Viên</h3>
                    <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: THEME_COLOR }}>
                        <Users className="w-6 h-6" /> Danh Sách Thành Viên
                    </h3>
                    <div className="relative w-full sm:w-auto">
                        <button 
                            onClick={() => setShowSampleOptions(!showSampleOptions)}
                            className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center justify-center gap-1 font-bold transition-all shadow-sm hover:shadow w-full sm:w-auto"
                        >
                            <Database className="w-3 h-3" /> Dữ liệu mẫu
                        </button>
                        {showSampleOptions && (
                            <div className="absolute right-0 mt-2 w-full sm:w-52 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                                <button onClick={() => { dispatch({type: 'LOAD_SAMPLE_DATA', payload: 'people_only'}); setShowSampleOptions(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">
                                    Chỉ nạp tên thành viên
                                </button>
                                <button onClick={() => { dispatch({type: 'LOAD_SAMPLE_DATA', payload: 'full'}); setShowSampleOptions(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">
                                    Nạp dữ liệu test đầy đủ
                                </button>
                                <button onClick={() => { if(confirm('Xóa sạch mọi dữ liệu?')) { dispatch({type: 'CLEAR_DATA'}); setShowSampleOptions(false); }}} className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 font-medium">
                                    <Trash2 className="w-3 h-3 inline mr-1"/> Xóa sạch dữ liệu
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-2 mb-6">
                    <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Nhập tên thành viên..." className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all" onKeyDown={(e) => e.key === 'Enter' && handleAddPerson(newPersonName)}/>
                    <button onClick={() => handleAddPerson(newPersonName)} className="text-white px-5 rounded-lg font-bold hover:opacity-90 transition-all shadow-md active:scale-95" style={{ backgroundColor: THEME_COLOR }}><Plus className="w-5 h-5" /></button>
                    <input 
                        type="text" 
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Nhập tên thành viên..." 
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPerson(newPersonName)}
                    />
                    <button 
                        onClick={() => handleAddPerson(newPersonName)} 
                        className="text-white px-5 rounded-lg font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
                        style={{ backgroundColor: THEME_COLOR }}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
                
                {people.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl"><Users className="w-12 h-12 mx-auto mb-2 opacity-20"/>Chưa có thành viên nào.</div>
                    <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                        Chưa có thành viên nào.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {people.map((person, idx) => (
                            <div key={person} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-all group" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <span className="font-medium flex items-center gap-3 text-gray-700">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 flex items-center justify-center text-sm font-bold shadow-sm">{person.charAt(0)}</div>{person}
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 flex items-center justify-center text-sm font-bold shadow-sm">
                                        {person.charAt(0)}
                                    </div>
                                    {person}
                                </span>
                                <button onClick={() => handleRemovePerson(person)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => dispatch({type: 'REMOVE_PERSON', payload: person})} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
@ -873,6 +1282,7 @@ const App = () => {
             </AnimatedCard>
          </div>
        )}

      </main>

      {/* EDIT MODAL */}
@ -880,16 +1290,29 @@ const App = () => {
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-600"/> Chỉnh Sửa Giao Dịch</h3>
                      <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <Edit3 className="w-5 h-5 text-blue-600"/> Chỉnh Sửa Giao Dịch
                      </h3>
                      <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                      <RecordForm initialData={{...editingRecord, participants: editingRecord.participants}} people={people} onSubmit={(data: any) => handleSaveRecord(data, true)} onCancel={() => setEditingRecord(null)} submitLabel="CẬP NHẬT NGAY" />
                      <RecordForm 
                          initialData={{
                              ...editingRecord,
                              participants: editingRecord.participants 
                          }}
                          people={people}
                          onSubmit={(data: any) => handleSaveRecord(data, true)}
                          onCancel={() => setEditingRecord(null)}
                          submitLabel="CẬP NHẬT NGAY"
                      />
                  </div>
              </div>
          </div>
      )}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

    </div>
  );
};
