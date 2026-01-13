import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Users, Calendar, CheckCircle, XCircle, 
  ChevronDown, Copy, UtensilsCrossed, 
  PieChart, RotateCcw, RotateCw, Filter, Edit3, Database, X, 
  History, ArrowRight, BookOpen, LogIn, LogOut, User, Key, Lock, 
  LayoutList, ScrollText, Clock // <--- Đã thêm ScrollText, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { db, auth } from './firebase'; 
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
// --- AUTH IMPORTS ---
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updatePassword,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';

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

// [NEW] Log Entry Type
interface LogEntry {
  id: string;
  timestamp: number;
  userEmail: string;
  actionType: 'add' | 'edit' | 'delete' | 'update_status' | 'system';
  details: string;
}

interface AppState {
  people: string[];
  records: MealRecord[];
  logs: LogEntry[]; // [NEW] Added logs array
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

const formatDateTime = (isoString?: string | null | number) => {
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
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise<void>((resolve, reject) => {
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) resolve();
        else reject(new Error('Copy command failed'));
      } catch (err) {
        document.body.removeChild(textArea);
        reject(err);
      }
    });
  }
};

// --- AUTH ERROR MAPPING ---
const mapAuthError = (code: string) => {
  switch (code) {
    case 'auth/email-already-in-use': return 'Email này đã được sử dụng.';
    case 'auth/invalid-email': return 'Email không hợp lệ.';
    case 'auth/user-disabled': return 'Tài khoản đã bị khóa.';
    case 'auth/user-not-found': return 'Tài khoản không tồn tại.';
    case 'auth/wrong-password': return 'Sai mật khẩu.';
    case 'auth/weak-password': return 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
    case 'auth/too-many-requests': return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    case 'auth/requires-recent-login': return 'Vui lòng đăng nhập lại để thực hiện.';
    default: return `Lỗi: ${code}`;
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
                        <li><b>Bước 2:</b> Khi đi ăn, vào tab <b>Nhập Liệu</b>. Chọn ngày, món ăn, tổng tiền. Quan trọng nhất là chọn đúng <b>Người trả tiền</b> (Chủ nợ) và tick chọn những <b>Người ăn</b> (bao gồm cả người trả nếu họ cũng ăn).</li>
                        <li><b>Bước 3:</b> Bấm <b>Lưu</b>. Hệ thống tự động chia tiền và ghi nợ.</li>
                    </ul>
                </section>
                 <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">2. Theo dõi & Thanh toán nợ</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><b>Cột Cần Thu Về (Màu Xanh):</b> Dành cho người đã ứng tiền. Bấm vào tên để xem chi tiết.</li>
                        <li><b>Cột Cần Phải Trả (Màu Đỏ):</b> Dành cho người ăn ké. Bấm vào tên để xem mình đang nợ những khoản nào.</li>
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
                <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">4. Lưu trữ & Bảo mật</h4>
                    <p className="mb-2 text-sm">Hệ thống đồng bộ đám mây (Cloud) theo thời gian thực:</p>
                     <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><b>Khách (Chưa đăng nhập):</b> Chỉ có thể xem dữ liệu, không thể sửa đổi.</li>
                        <li><b>Thành viên (Đã đăng nhập):</b> Có toàn quyền thêm, sửa, xóa dữ liệu.</li>
                    </ul>
                </section>
                <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">5. Lịch sử chỉnh sửa</h4>
                    <p className="mb-2 text-sm">Vào tab <b>Lịch Sử</b> để xem chi tiết ai đã thay đổi gì vào thời gian nào, giúp minh bạch tài chính.</p>
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

// --- AUTH MODAL COMPONENT ---
const AuthModal = ({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: FirebaseUser | null }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'changePass'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError(''); setSuccess('');
            if (user) setMode('changePass'); else setMode('login');
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
                onClose();
            } else if (mode === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
                onClose();
            } else if (mode === 'forgot') {
                await sendPasswordResetEmail(auth, email);
                setSuccess('Email khôi phục mật khẩu đã được gửi!');
            } else if (mode === 'changePass') {
                if (user) {
                    await updatePassword(user, newPassword);
                    setSuccess('Đổi mật khẩu thành công!');
                    setNewPassword('');
                }
            }
        } catch (err: any) {
            setError(mapAuthError(err.code));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">
                        {mode === 'login' && 'Đăng Nhập'}
                        mode === 'register' && 'Đăng Ký Tài Khoản'
                        {mode === 'forgot' && 'Quên Mật Khẩu'}
                        {mode === 'changePass' && 'Đổi Mật Khẩu'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex items-center gap-2"><XCircle className="w-4 h-4"/>{error}</div>}
                    {success && <div className="p-3 bg-green-50 text-green-600 text-xs rounded border border-green-100 flex items-center gap-2"><CheckCircle className="w-4 h-4"/>{success}</div>}

                    {mode !== 'changePass' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500" placeholder="example@email.com" />
                        </div>
                    )}

                    {(mode === 'login' || mode === 'register') && (
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mật khẩu</label>
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500" placeholder="••••••" />
                        </div>
                    )}

                    {mode === 'changePass' && (
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mật khẩu mới</label>
                            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500" placeholder="Nhập mật khẩu mới..." />
                        </div>
                    )}

                    <button disabled={loading} type="submit" className="w-full bg-blue-800 text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-all disabled:opacity-50">
                        {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng Nhập' : mode === 'register' ? 'Đăng Ký' : mode === 'forgot' ? 'Gửi Email' : 'Cập Nhật')}
                    </button>

                    {!user && (
                        <div className="flex justify-between text-xs mt-4 pt-4 border-t">
                            {mode === 'login' ? (
                                <>
                                    <span className="text-gray-500 cursor-pointer hover:text-blue-600" onClick={() => setMode('forgot')}>Quên mật khẩu?</span>
                                    span className="text-blue-600 font-bold cursor-pointer hover:underline" onClick={() => setMode('register')}>Đăng ký mới</span
                                </>
                            ) : (
                                <span className="text-blue-600 font-bold cursor-pointer hover:underline w-full text-center" onClick={() => setMode('login')}>Quay lại đăng nhập</span>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

// --- Refactored RecordForm (Updated with ReadOnly Mode) ---
const RecordForm = ({ initialData, onSubmit, onCancel, submitLabel, people, currentUser }: { 
    initialData: any, 
    onSubmit: (data: any) => void, 
    onCancel?: () => void, 
    submitLabel: string,
    people: string[],
    currentUser: FirebaseUser | null
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
    const isReadOnly = !currentUser; // Read-only logic

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
        if (isReadOnly) return;
        if (fParticipants.some(p => p.name === name)) {
            setFParticipants(fParticipants.filter(p => p.name !== name));
        } else {
            setFParticipants([...fParticipants, { name, paid: name === fPayer, paidAt: name === fPayer ? new Date().toISOString() : null }]);
        }
    };

    const togglePaidStatus = (name: string) => {
        if (isReadOnly) return;
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
        if (isReadOnly) return;
        setFParticipants(fParticipants.map(p => {
            if (p.name === name) {
                return { ...p, paidAt: dateValue ? new Date(dateValue).toISOString() : null };
            }
            return p;
        }));
    }

    const handleSubmit = () => {
        if (isReadOnly) return;
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
        <div className={`space-y-4 ${isReadOnly ? 'opacity-80 pointer-events-none' : ''}`}>
            {isReadOnly && <div className="bg-yellow-50 text-yellow-800 p-2 text-xs rounded border border-yellow-200 text-center font-bold">Bạn cần đăng nhập để thêm hoặc sửa dữ liệu.</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ngày</label>
                    <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} disabled={isReadOnly} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Số tiền</label>
                    <input 
                      type="text" 
                      value={fTotal ? parseInt(fTotal).toLocaleString('vi-VN') : ''}
                      onChange={e => setFTotal(e.target.value.replace(/\D/g, ''))}
                      disabled={isReadOnly}
                      className="w-full p-3 border rounded-lg font-bold text-red-600 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
                      placeholder="0"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nội dung</label>
                <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)} disabled={isReadOnly} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white" placeholder="Món ăn/Cafe..."/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Người trả tiền</label>
                  <select value={fPayer} onChange={e => setFPayer(e.target.value)} disabled={isReadOnly} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none">
                      <option value="">--Chọn--</option>
                      {people.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thêm người tham gia</label>
                  <button onClick={() => !isReadOnly && setFDropdownOpen(!fDropdownOpen)} disabled={isReadOnly} className="w-full p-3 border rounded-lg bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-200 transition-all">
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
                                    <button onClick={() => toggleParticipant(p.name)} disabled={isReadOnly} className="text-gray-300 hover:text-red-500 p-1"><XCircle className="w-4 h-4"/></button>
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
                                          disabled={p.name === fPayer || isReadOnly}
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
                                                disabled={isReadOnly}
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

            {!isReadOnly && (
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
            )}
        </div>
    );
};

const App = () => {
  // --- History & State ---
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const currentState = history[historyIndex] || { people: [], records: [], logs: [] };
  const { people, records, logs } = currentState;
  const isRemoteUpdate = useRef(false);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'entry' | 'debt_history' | 'report' | 'people' | 'logs'>('entry');
  const [showGuide, setShowGuide] = useState(false);
  
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Edit Modal State
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

  // --- INITIALIZATION ---
  
  // 1. Listen for Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Data from Firebase
  useEffect(() => {
    const docRef = doc(db, 'lunch_app', 'main_data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppState;
        // Migration check: if logs doesn't exist, add it
        if (!data.logs) data.logs = [];
        
        if (JSON.stringify(data) !== JSON.stringify(currentState)) {
            isRemoteUpdate.current = true;
            setHistory([data]);
            setHistoryIndex(0);
        }
      } else {
        const savedPeople = localStorage.getItem('lunch_people_v13');
        const savedRecords = localStorage.getItem('lunch_records_v13');
        if (savedPeople || savedRecords) {
            const initialState: AppState = {
                people: savedPeople ? JSON.parse(savedPeople) : [],
                records: savedRecords ? JSON.parse(savedRecords) : [],
                logs: []
            };
            setHistory([initialState]);
            setHistoryIndex(0);
        } else {
            setHistory([{ people: [], records: [], logs: [] }]);
            setHistoryIndex(0);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Save Data (Only if Logged In & Local Change)
  useEffect(() => {
    if (history.length > 0 && historyIndex >= 0) {
      const current = history[historyIndex];
      localStorage.setItem('lunch_people_v13', JSON.stringify(current.people));
      localStorage.setItem('lunch_records_v13', JSON.stringify(current.records));

      // Chỉ lưu lên cloud nếu người dùng đã đăng nhập và không phải là update từ cloud
      if (!isRemoteUpdate.current && currentUser) {
          const docRef = doc(db, 'lunch_app', 'main_data');
          setDoc(docRef, { people: current.people, records: current.records, logs: current.logs })
            .catch(err => console.error("Lỗi lưu Firebase:", err));
      } else {
          isRemoteUpdate.current = false;
      }
    }
  }, [history, historyIndex, currentUser]);

  // --- Dispatcher with Logging ---
  const dispatch = useCallback((action: Action) => {
    // PROTECT ACTIONS: Nếu chưa đăng nhập, không cho sửa
    if (!currentUser && action.type !== 'SET_STATE' && action.type !== 'LOAD_SAMPLE_DATA' && action.type !== 'CLEAR_DATA') {
        alert("Vui lòng đăng nhập để thực hiện thao tác này!");
        return;
    }

    setHistory(prevHistory => {
      const current = prevHistory[historyIndex];
      let newState: AppState = { ...current };
      // Ensure logs array exists
      if (!newState.logs) newState.logs = [];

      const userEmail = currentUser?.email || 'Unknown';
      let logDetail = '';
      let actionType: LogEntry['actionType'] = 'edit';

      switch (action.type) {
        case 'ADD_PERSON': 
            newState.people = [...current.people, action.payload]; 
            actionType = 'add';
            logDetail = `Thêm thành viên: ${action.payload}`;
            break;
        case 'REMOVE_PERSON': 
            newState.people = current.people.filter(p => p !== action.payload); 
            actionType = 'delete';
            logDetail = `Xóa thành viên: ${action.payload}`;
            break;
        case 'ADD_RECORD': 
            newState.records = [action.payload, ...current.records]; 
            actionType = 'add';
            logDetail = `Thêm chi tiêu: ${action.payload.title} (${formatCurrency(action.payload.totalAmount)})`;
            break;
        case 'UPDATE_RECORD': 
            newState.records = current.records.map(r => r.id === action.payload.id ? action.payload : r); 
            actionType = 'edit';
            logDetail = `Sửa chi tiêu: ${action.payload.title}`;
            break;
        case 'DELETE_RECORD': 
            const recordToDelete = current.records.find(r => r.id === action.payload);
            newState.records = current.records.filter(r => r.id !== action.payload); 
            actionType = 'delete';
            logDetail = `Xóa chi tiêu: ${recordToDelete ? recordToDelete.title : 'Không xác định'}`;
            break;
        case 'TOGGLE_PAID':
          const recordToToggle = current.records.find(r => r.id === action.payload.recordId);
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
          actionType = 'update_status';
          logDetail = `Cập nhật thanh toán: ${action.payload.personName} cho khoản ${recordToToggle?.title}`;
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
          actionType = 'update_status';
          logDetail = `Trả hết nợ cho: ${action.payload.personName}`;
          break;
        case 'LOAD_SAMPLE_DATA':
          // ... logic cũ
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
                // ...
            ];
          }
          actionType = 'system';
          logDetail = 'Nạp dữ liệu mẫu';
          break;
        case 'CLEAR_DATA': 
            newState = { people: [], records: [], logs: [] }; 
            actionType = 'system';
            logDetail = 'Xóa toàn bộ dữ liệu';
            break;
        case 'SET_STATE': 
            newState = action.payload; 
            // Không log khi sync từ cloud
            logDetail = ''; 
            break;
        default: return prevHistory;
      }

      // Add Log if details exist
      if (logDetail && action.type !== 'SET_STATE') {
          const newLog: LogEntry = {
              id: generateId(),
              timestamp: Date.now(),
              userEmail: userEmail,
              actionType: actionType,
              details: logDetail
          };
          newState.logs = [newLog, ...newState.logs];
      }

      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(newState);
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex, currentUser]);

  const handleUndo = () => historyIndex > 0 && setHistoryIndex(historyIndex - 1);
  const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1);

  const handleAddPerson = (name: string) => {
    if (!currentUser) return alert("Vui lòng đăng nhập!");
    const trimmedName = name.trim();
    if (trimmedName && !people.includes(trimmedName)) {
      dispatch({ type: 'ADD_PERSON', payload: trimmedName });
      setNewPersonName('');
    }
  };

  const handleSaveRecord = (record: any, isEdit: boolean) => {
     if (!currentUser) return alert("Vui lòng đăng nhập!");
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
  const totalFilteredSpent = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  interface MealDetail { id: string; date: string; title: string; amount: number; isPaid: boolean }
  const getNetBalances = () => {
    const balances: Record<string, { owed: number, debt: number, net: number, meals: MealDetail[] }> = {};
    people.forEach(p => balances[p] = { owed: 0, debt: 0, net: 0, meals: [] });

    filteredRecords.forEach(r => {
       r.participants.forEach(p => {
          if (balances[p.name]) {
              balances[p.name].meals.push({
                  id: r.id, date: r.date, title: r.title, amount: r.perPersonAmount, isPaid: p.paid
              });
          }
          if (p.name !== r.payer && !p.paid) {
             if (balances[p.name]) balances[p.name].debt += r.perPersonAmount;
             if (balances[r.payer]) balances[r.payer].owed += r.perPersonAmount;
          }
       });
    });

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
          return sum + (p ? r.perPersonAmount : 0);
      }, 0);
      return { name: person, value };
  }).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  const debtSummaryData = netBalances.map(nb => ({ name: nb.name, net: nb.net }));
  
  const historyByDate = filteredRecords
    .reduce((acc, record) => {
        const d = record.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(record);
        return acc;
    }, {} as Record<string, MealRecord[]>);
  const sortedHistoryDates = Object.keys(historyByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Helper for Log Icon
  const getLogIcon = (type: LogEntry['actionType']) => {
      switch(type) {
          case 'add': return <Plus className="w-4 h-4 text-green-600"/>;
          case 'delete': return <Trash2 className="w-4 h-4 text-red-600"/>;
          case 'edit': return <Edit3 className="w-4 h-4 text-blue-600"/>;
          case 'update_status': return <CheckCircle className="w-4 h-4 text-purple-600"/>;
          default: return <Database className="w-4 h-4 text-gray-600"/>;
      }
  }

  return (
    <div className="min-h-screen font-sans flex flex-col text-gray-800 bg-gray-50">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter { animation: fadeInUp 0.3s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} user={currentUser} />

      {/* Undo/Redo Controls (Only if logged in) */}
      {currentUser && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="bg-white p-3 rounded-full shadow-lg border hover:bg-blue-50 disabled:opacity-50 transition-all hover:scale-110 active:scale-95">
                <RotateCw className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={handleUndo} disabled={historyIndex <= 0} className="bg-white p-3 rounded-full shadow-lg border hover:bg-blue-50 disabled:opacity-50 transition-all hover:scale-110 active:scale-95">
                <RotateCcw className="w-5 h-5 text-gray-700" />
            </button>
        </div>
      )}

      {/* Header */}
      <header className="text-white p-4 shadow-lg sticky top-0 z-30 transition-all" style={{ backgroundColor: THEME_COLOR }}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold uppercase tracking-wide leading-tight flex items-center gap-1">
                    Sổ Ăn Uống <span className="text-yellow-400 text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">Pro</span>
                </h1>
                <span className="text-xs text-blue-200 opacity-80 font-medium hidden sm:block">Quản lý tài chính văn phòng</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
              {currentUser ? (
                  <div className="flex items-center gap-2">
                      <div className="hidden sm:flex flex-col items-end mr-1">
                          <span className="text-xs text-blue-200">Xin chào,</span>
                          <span className="text-sm font-bold truncate max-w-[100px]">{currentUser.email?.split('@')[0]}</span>
                      </div>
                      <button onClick={() => setAuthModalOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors" title="Đổi mật khẩu">
                          <Key className="w-4 h-4" />
                      </button>
                      <button onClick={() => signOut(auth)} className="flex items-center gap-1 bg-red-500/80 hover:bg-red-600 px-3 py-2 rounded-lg text-xs font-bold transition-colors">
                          <LogOut className="w-4 h-4"/>
                      </button>
                  </div>
              ) : (
                  <button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1 bg-white text-blue-900 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors shadow-md">
                      <LogIn className="w-4 h-4"/> Đăng Nhập
                  </button>
              )}
              
              <button 
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                <BookOpen className="w-5 h-5 sm:w-4 sm:h-4"/>
              </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white shadow-sm sticky top-[72px] z-20 border-b border-gray-100">
        <nav className="max-w-5xl mx-auto flex overflow-x-auto no-scrollbar snap-x">
           {[
             { id: 'entry', icon: Plus, label: 'Nhập Liệu' },
             { id: 'debt_history', icon: LayoutList, label: 'Theo Dõi' },
             { id: 'report', icon: PieChart, label: 'Báo Cáo' },
             { id: 'people', icon: Users, label: 'Thành Viên' },
             { id: 'logs', icon: ScrollText, label: 'Lịch Sử' }, // New Tab
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex-1 min-w-[20%] sm:min-w-[auto] flex flex-col items-center justify-center py-3 px-1 text-xs font-semibold transition-all border-b-4 duration-300 snap-start
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
        
        {/* TAB 1: ENTRY */}
        {activeTab === 'entry' && (
          <div className="animate-enter max-w-2xl mx-auto">
            <AnimatedCard className="p-4 sm:p-6">
              <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2" style={{ color: THEME_COLOR }}>
                <Plus className="w-6 h-6" /> Ghi Nhận Chi Tiêu
              </h3>
              <RecordForm 
                 initialData={{}}
                 people={people}
                 currentUser={currentUser}
                 onSubmit={(data: any) => handleSaveRecord(data, false)}
                 submitLabel="LƯU GIAO DỊCH"
              />
            </AnimatedCard>
          </div>
        )}

        {/* TAB 2: DEBT & HISTORY */}
        {activeTab === 'debt_history' && (
          <div className="space-y-6 animate-enter">
             <AnimatedCard className="p-4 flex flex-col md:flex-row gap-4 border-l-4 border-blue-500 items-center sticky top-[130px] z-10 shadow-md">
                <div className="flex flex-col sm:flex-row gap-2 items-center flex-1 w-full">
                    <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
                        <Filter className="w-4 h-4 text-gray-500"/>
                        <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Lọc từ:</span>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 p-2 rounded text-sm outline-none flex-1 w-full"/>
                        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0"/>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 p-2 rounded text-sm outline-none flex-1 w-full"/>
                    </div>
                </div>
             </AnimatedCard>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* CREDITORS */}
                <AnimatedCard className="overflow-hidden border-green-100">
                    <div className="bg-green-50/80 p-4 border-b border-green-100 flex items-center justify-between backdrop-blur-sm">
                        <h4 className="font-bold text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> CẦN THU VỀ</h4>
                        <span className="text-xs font-medium bg-white px-2 py-1 rounded text-green-700 border border-green-200">Người đã ứng</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {creditors.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Không có khoản cần thu.</div>}
                        {creditors.map(item => (
                            <div key={item.name} className="p-4 bg-white transition-colors hover:bg-green-50/20">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedCreditor(expandedCreditor === item.name ? null : item.name)}>
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">{item.name}</div>
                                        <div className="text-xs text-green-600 flex items-center gap-1 font-medium mt-1">
                                            {expandedCreditor === item.name ? 'Thu gọn' : 'Xem chi tiết'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedCreditor === item.name ? 'rotate-180' : ''}`}/>
                                        </div>
                                    </div>
                                    <span className="font-bold text-green-600 text-lg">+{formatCurrency(item.net)}</span>
                                </div>
                                {expandedCreditor === item.name && (
                                    <div className="mt-3 pt-3 border-t border-green-100 text-sm space-y-2 animate-enter">
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
                        ))}
                    </div>
                </AnimatedCard>

                {/* DEBTORS */}
                <AnimatedCard className="overflow-hidden border-red-100">
                    <div className="bg-red-50/80 p-4 border-b border-red-100 flex items-center justify-between backdrop-blur-sm">
                        <h4 className="font-bold text-red-800 flex items-center gap-2"><XCircle className="w-5 h-5" /> CẦN PHẢI TRẢ</h4>
                        <span className="text-xs font-medium bg-white px-2 py-1 rounded text-red-700 border border-red-200">Chưa đóng</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {debtors.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Không có khoản nợ.</div>}
                        {debtors.map(item => (
                            <div key={item.name} className="p-4 bg-white transition-colors hover:bg-red-50/10">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedPerson(expandedPerson === item.name ? null : item.name)}>
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">{item.name}</div>
                                        <div className="text-xs text-red-500 flex items-center gap-1 font-medium mt-1">
                                            {expandedPerson === item.name ? 'Thu gọn' : 'Xem & Trả nợ'} <ChevronDown className={`w-3 h-3 transition-transform ${expandedPerson === item.name ? 'rotate-180' : ''}`}/>
                                        </div>
                                    </div>
                                    <span className="font-bold text-red-600 text-lg">{formatCurrency(Math.abs(item.net))}</span>
                                </div>
                                {expandedPerson === item.name && (
                                    <div className="mt-4 space-y-4 animate-enter">
                                            <div className="bg-red-50 rounded p-2 text-sm border border-red-100">
                                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-red-200">
                                                    <span className="text-[10px] font-bold text-red-800 uppercase">Chưa trả</span>
                                                    {currentUser && (
                                                        <button 
                                                            onClick={() => dispatch({type: 'MARK_ALL_PAID', payload: {personName: item.name}})}
                                                            className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 uppercase font-bold"
                                                        >
                                                            Trả hết ngay
                                                        </button>
                                                    )}
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
                                                                    <input 
                                                                        type="checkbox" 
                                                                        disabled={!currentUser}
                                                                        className="w-5 h-5 accent-blue-600 cursor-pointer disabled:opacity-50" 
                                                                        onChange={() => dispatch({type: 'TOGGLE_PAID', payload: {recordId: r.id, personName: item.name}})}
                                                                    />
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
                                                                    <input type="checkbox" checked={true} disabled={!currentUser} className="w-4 h-4 accent-gray-400 cursor-pointer disabled:opacity-50" onChange={() => dispatch({type: 'TOGGLE_PAID', payload: {recordId: r.id, personName: item.name}})}/>
                                                                </div>
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

             {/* SECTION 2: TIMELINE */}
             <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                     <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2"><History className="w-6 h-6 text-blue-600"/> Nhật Ký Giao Dịch</h3>
                     <div className="flex flex-wrap items-center gap-3 bg-white rounded-full px-4 py-1.5 border shadow-sm text-xs mt-2 md:mt-0">
                         <span className="flex items-center gap-1 font-bold text-green-700"><CheckCircle className="w-3 h-3"/> Xanh = Đã trả</span>
                         <span className="w-[1px] h-3 bg-gray-300"></span>
                         <span className="flex items-center gap-1 text-gray-500">Xám = Chưa trả</span>
                     </div>
                 </div>

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
                                             
                                             {currentUser && (
                                                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                                    <button onClick={() => setEditingRecord(record)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors">
                                                        <Edit3 className="w-3 h-3"/> Sửa
                                                    </button>
                                                    <button onClick={() => { if(confirm('Xóa giao dịch này?')) dispatch({type: 'DELETE_RECORD', payload: record.id}) }} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors">
                                                        <Trash2 className="w-3 h-3"/> Xóa
                                                    </button>
                                                </div>
                                             )}
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

        {/* TAB 4: REPORT */}
        {activeTab === 'report' && (
          <div className="space-y-6 animate-enter">
             <AnimatedCard className="p-4 flex flex-col md:flex-row items-end gap-4">
                <div className="w-full md:w-auto">
                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wide">Từ ngày</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"/>
                </div>
                <div className="w-full md:w-auto">
                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wide">Đến ngày</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"/>
                </div>
                <div className="w-full md:flex-1 text-right mt-2 md:mt-0">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng chi tiêu (Lọc)</div>
                    <div className="text-2xl font-bold text-blue-800">{formatCurrency(totalFilteredSpent)}</div>
                </div>
             </AnimatedCard>

             {filteredRecords.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatedCard className="p-4 h-72">
                        <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Tỷ trọng chi tiêu</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <RePieChart>
                                <Pie data={spendingByPerson} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5}>
                                    {spendingByPerson.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '11px'}}/>
                            </RePieChart>
                        </ResponsiveContainer>
                    </AnimatedCard>
                    
                    <AnimatedCard className="p-4 h-72">
                        <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Biểu đồ Công nợ</h4>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={debtSummaryData} margin={{top: 5, right: 5, left: -10, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11}} dy={10} />
                                <YAxis tick={{fontSize: 11}} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                                <Bar dataKey="net" radius={[4, 4, 4, 4]} barSize={30}>
                                    {debtSummaryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.net > 0 ? '#10b981' : '#ef4444'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </AnimatedCard>
                </div>
             )}

             <AnimatedCard className="p-4 sm:p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h4 className="font-bold text-gray-700 uppercase flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Bảng Tổng Hợp</h4>
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
                                         <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2">
                                             <div className={`p-1 rounded-full transition-transform duration-200 ${expandedReportRows[nb.name] ? 'rotate-90 bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                                 <ChevronDown className="w-4 h-4"/>
                                             </div>
                                             {nb.name}
                                         </td>
                                         <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${nb.net > 0 ? 'text-green-600' : (nb.net < 0 ? 'text-red-600' : 'text-gray-400')}`}>
                                             {nb.net > 0 ? '+' : ''}{formatCurrency(nb.net)}
                                         </td>
                                         <td className="px-4 py-3 text-right text-gray-400 text-xs">{nb.meals.length} bữa ăn</td>
                                     </tr>
                                     {expandedReportRows[nb.name] && (
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
                                                                     {m.isPaid ? <span className="text-green-600 font-bold">Đã trả</span> : <span className="text-gray-400 italic">Chưa trả</span>}
                                                                     <span className="font-bold text-gray-800 w-[60px] text-right">{formatCurrency(m.amount)}</span>
                                                                 </div>
                                                             </div>
                                                         ))}
                                                     </div>
                                                 ) : <div className="text-xs text-gray-400 italic">Chưa tham gia bữa nào.</div>}
                                             </td>
                                         </tr>
                                     )}
                                 </React.Fragment>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </AnimatedCard>
          </div>
        )}

        {/* TAB 5: PEOPLE */}
        {activeTab === 'people' && (
          <div className="animate-enter max-w-3xl mx-auto">
             <AnimatedCard className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                    <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: THEME_COLOR }}>
                        <Users className="w-6 h-6" /> Danh Sách Thành Viên
                    </h3>
                    <div className="relative w-full sm:w-auto">
                        <button 
                            onClick={() => currentUser && setShowSampleOptions(!showSampleOptions)}
                            disabled={!currentUser}
                            className={`text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1 font-bold transition-all shadow-sm w-full sm:w-auto ${currentUser ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 hover:shadow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        >
                            <Database className="w-3 h-3" /> {currentUser ? 'Dữ liệu mẫu' : 'Đăng nhập để dùng'}
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
                
                {currentUser ? (
                    <div className="flex gap-2 mb-6">
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
                ) : (
                    <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-center text-sm text-yellow-800">
                        <Lock className="w-4 h-4 inline mr-1"/> Bạn cần đăng nhập để thêm hoặc xóa thành viên.
                    </div>
                )}
                
                {people.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                        Chưa có thành viên nào.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {people.map((person, idx) => (
                            <div key={person} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-all group" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <span className="font-medium flex items-center gap-3 text-gray-700">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 flex items-center justify-center text-sm font-bold shadow-sm">
                                        {person.charAt(0)}
                                    </div>
                                    {person}
                                </span>
                                {currentUser && (
                                    <button onClick={() => dispatch({type: 'REMOVE_PERSON', payload: person})} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
             </AnimatedCard>
          </div>
        )}

        {/* TAB 6: LOGS (New Feature) */}
        {activeTab === 'logs' && (
            <div className="animate-enter max-w-3xl mx-auto">
                <AnimatedCard className="p-4 sm:p-6">
                    <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2" style={{ color: THEME_COLOR }}>
                        <ScrollText className="w-6 h-6" /> Lịch Sử Chỉnh Sửa
                    </h3>
                    
                    {(!logs || logs.length === 0) ? (
                        <div className="text-center py-12 text-gray-400 italic">Chưa có lịch sử thay đổi nào.</div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                                    <div className="mt-1 p-2 bg-white rounded-full border shadow-sm">
                                        {getLogIcon(log.actionType)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-800">{log.details}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                            <span className="flex items-center gap-1"><User className="w-3 h-3"/> {log.userEmail.split('@')[0]}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDateTime(log.timestamp)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </AnimatedCard>
            </div>
        )}

      </main>

      {/* EDIT MODAL */}
      {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <Edit3 className="w-5 h-5 text-blue-600"/> Chỉnh Sửa Giao Dịch
                      </h3>
                      <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                      <RecordForm 
                          initialData={{ ...editingRecord }}
                          people={people}
                          currentUser={currentUser}
                          onSubmit={(data: any) => handleSaveRecord(data, true)}
                          onCancel={() => setEditingRecord(null)}
                          submitLabel="CẬP NHẬT NGAY"
                      />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;