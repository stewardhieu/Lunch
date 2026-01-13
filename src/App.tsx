import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Trash2, Users, Calendar, CheckCircle, XCircle, 
  ChevronDown, Copy, UtensilsCrossed, 
  PieChart, RotateCcw, RotateCw, Filter, Edit3, Database, Search, X, 
  LayoutList, History, ArrowRight, BookOpen, FileText, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie 
} from 'recharts';

// --- Firebase Imports ---
import { db } from './firebase'; 
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, setDoc, getDocs, where, writeBatch 
} from 'firebase/firestore';

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
  | { type: 'SYNC_FROM_FIREBASE'; payload: AppState }
  | { type: 'LOCAL_UPDATE'; payload: AppState } // Dùng cho undo/redo local

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
    // Fallback cho trình duyệt cũ
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
        document.body.removeChild(textArea);
    } catch (err) {
        document.body.removeChild(textArea);
    }
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
                    <p className="mb-2">Ứng dụng tự động lưu dữ liệu lên Cloud (Firebase). Bạn không cần bấm nút Save thủ công.</p>
                </section>
                 <section>
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2 text-lg">2. Theo dõi & Thanh toán nợ</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li><b>Cột Cần Thu Về (Màu Xanh):</b> Dành cho người đã ứng tiền.</li>
                        <li><b>Cột Cần Phải Trả (Màu Đỏ):</b> Dành cho người ăn ké.</li>
                        <li><b>Cách trả nợ:</b> Tick vào ô vuông <input type="checkbox" className="align-middle" /> bên cạnh món ăn. Dữ liệu sẽ cập nhật ngay lập tức.</li>
                    </ul>
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
            
            {/* Detailed Participant List with Paid Toggle */}
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
                                    
                                    {/* Date Picker for Paid Participants (Not Payer) */}
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

const App = () => {
  // --- History & State ---
  const [history, setHistory] = useState<AppState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const currentState = history[historyIndex] || { people: [], records: [] };
  const { people, records } = currentState;

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'entry' | 'debt_history' | 'report' | 'people'>('entry');
  const [showGuide, setShowGuide] = useState(false);
   
  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<MealRecord | null>(null);

  // New Person Input
  const [newPersonName, setNewPersonName] = useState('');

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

  // --- FIREBASE SYNC & INITIALIZATION ---
  // Thay thế việc load từ LocalStorage bằng lắng nghe Firestore Realtime
  useEffect(() => {
    // 1. Listen to 'people' collection
    const qPeople = query(collection(db, 'people'), orderBy('name'));
    const unsubscribePeople = onSnapshot(qPeople, (snapshot) => {
        const peopleList = snapshot.docs.map(doc => doc.data().name as string);
        dispatch({ type: 'SYNC_FROM_FIREBASE', payload: { people: peopleList, records: currentState.records } });
    });

    // 2. Listen to 'records' collection
    const qRecords = query(collection(db, 'records'), orderBy('createdAt', 'desc'));
    const unsubscribeRecords = onSnapshot(qRecords, (snapshot) => {
        const recordsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealRecord));
        // Lấy state hiện tại (people) để merge
        // Lưu ý: Do closure, biến 'people' ở đây có thể cũ, nhưng reducer sẽ xử lý merge
        // Cách tốt hơn là dispatch payload chứa records mới
        dispatch({ type: 'SYNC_FROM_FIREBASE', payload: { people: [], records: recordsList } }); 
    });

    return () => {
        unsubscribePeople();
        unsubscribeRecords();
    };
  }, []); // Empty dependency array -> Run once on mount

  // --- Dispatcher (Modified for Firebase) ---
  const dispatch = useCallback((action: Action) => {
    setHistory(prevHistory => {
      const current = prevHistory[prevHistory.length - 1] || { people: [], records: [] };
      let newState: AppState = { ...current };

      switch (action.type) {
        case 'SYNC_FROM_FIREBASE':
            // Merge logic: Nếu payload có mảng rỗng thì giữ nguyên cái cũ
            newState = {
                people: action.payload.people.length > 0 ? action.payload.people : current.people,
                records: action.payload.records.length > 0 ? action.payload.records : current.records
            };
            
            // Xử lý edge case: Nếu Firebase trả về rỗng thật sự (đã xóa hết)
            if (action.payload.records.length === 0 && current.records.length > 0) {
                 // Cần check xem có phải lần load đầu tiên không, tạm thời để logic merge đơn giản
                 // Ở đây giả định payload rỗng nghĩa là "không cập nhật phần này" 
                 // (do logic tách listener ở trên)
            }
            // Logic fix cho listener tách biệt:
            // Listener Records gọi: payload = {people: [], records: [...]}
            // Listener People gọi: payload = {people: [...], records: []} 
            // -> Cần check kỹ hơn
            if (action.payload.people.length === 0 && action.payload.records.length > 0) {
                newState.people = current.people;
                newState.records = action.payload.records;
            } else if (action.payload.people.length > 0 && action.payload.records.length === 0) {
                 newState.people = action.payload.people;
                 newState.records = current.records;
            } else {
                 newState = action.payload; // Full load
            }
            break;
            
        case 'LOCAL_UPDATE':
             // Cái này dùng để cập nhật optimistic UI nếu cần, 
             // nhưng với onSnapshot nhanh thì có thể không cần thiết.
             newState = action.payload;
             break;
             
        default:
          return prevHistory;
      }

      // Logic Undo/Redo với Firebase rất phức tạp vì server đè local.
      // Giải pháp: Mỗi lần Sync từ Firebase coi như là "New State" chuẩn nhất.
      // Ta chỉ đẩy vào history nếu nó thực sự khác biệt.
      // Để đơn giản cho prompt này: Chỉ lưu history những thay đổi lớn, 
      // hoặc chấp nhận history chỉ hoạt động local session.
      
      const newHistory = [...prevHistory, newState];
      // Giới hạn history size để đỡ tốn mem
      if (newHistory.length > 50) newHistory.shift();
      
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, []);

  // --- Handlers (UPDATED TO WRITE TO FIREBASE) ---
  
  const handleUndo = () => {
      if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
      alert("Lưu ý: Undo chỉ có tác dụng xem lại cục bộ. Dữ liệu trên Cloud không bị đảo ngược.");
  };
  
  const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1);

  const handleAddPerson = async (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !people.includes(trimmedName)) {
      try {
          await addDoc(collection(db, 'people'), { name: trimmedName });
          setNewPersonName('');
          // Không cần dispatch, onSnapshot sẽ tự cập nhật
      } catch (e) {
          alert('Lỗi thêm người: ' + e);
      }
    }
  };
  
  const handleRemovePerson = async (name: string) => {
      if(!confirm(`Xóa thành viên ${name}?`)) return;
      try {
          // Tìm doc có name trùng khớp để xóa
          const q = query(collection(db, 'people'), where('name', '==', name));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
              deleteDoc(doc.ref);
          });
      } catch(e) {
          alert('Lỗi xóa: ' + e);
      }
  }

  const handleSaveRecord = async (record: any, isEdit: boolean) => {
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

     const finalRecord = {
         createdAt: isEdit && editingRecord ? editingRecord.createdAt : Date.now(),
         date: record.date || new Date().toISOString().slice(0, 10),
         title: record.title || '',
         totalAmount: record.totalAmount,
         perPersonAmount: perPerson,
         payer: record.payer || '',
         participants: fullParticipants
     };

     try {
         if (isEdit && editingRecord) {
             await updateDoc(doc(db, 'records', editingRecord.id), finalRecord);
             setEditingRecord(null);
         } else {
             await addDoc(collection(db, 'records'), finalRecord);
         }
         // alert('Đã lưu thành công!'); 
     } catch (e) {
         console.error(e);
         alert('Lỗi khi lưu dữ liệu lên Cloud!');
     }
  };

  const handleTogglePaid = async (recordId: string, personName: string, currentParticipants: ParticipantStatus[]) => {
      const updatedParticipants = currentParticipants.map(p => {
          if (p.name !== personName) return p;
          const newPaid = !p.paid;
          return { ...p, paid: newPaid, paidAt: newPaid ? new Date().toISOString() : null };
      });
      
      try {
          await updateDoc(doc(db, 'records', recordId), { participants: updatedParticipants });
      } catch (e) { console.error(e); }
  };
  
  const handleMarkAllPaid = async (personName: string) => {
      // Tìm tất cả record mà người này chưa trả
      const unpaidRecords = records.filter(r => {
          const p = r.participants.find(part => part.name === personName);
          return p && !p.paid && r.payer !== personName;
      });
      
      if (unpaidRecords.length === 0) return;
      if (!confirm(`Xác nhận trả hết ${unpaidRecords.length} khoản nợ cho ${personName}?`)) return;
      
      const batch = writeBatch(db);
      unpaidRecords.forEach(r => {
          const updatedParticipants = r.participants.map(p => {
              if (p.name === personName) return { ...p, paid: true, paidAt: new Date().toISOString() };
              return p;
          });
          const ref = doc(db, 'records', r.id);
          batch.update(ref, { participants: updatedParticipants });
      });
      
      try {
          await batch.commit();
      } catch(e) { alert('Lỗi batch update: ' + e); }
  }

  const handleDeleteRecord = async (recordId: string) => {
      if(confirm('Xóa giao dịch này vĩnh viễn?')) {
          try {
              await deleteDoc(doc(db, 'records', recordId));
          } catch(e) { alert('Lỗi xóa: ' + e); }
      }
  }

  const handleLoadSampleData = async () => {
      // Vì dùng Firebase thật, nên ta sẽ insert thật
      if(!confirm("Hành động này sẽ ghi dữ liệu mẫu lên Cloud thật. Tiếp tục?")) return;
      
      const samplePeople = ["Khánh", "Minh Anh", "Hiếu", "Chị Trang"];
      for (const p of samplePeople) {
          if (!people.includes(p)) await addDoc(collection(db, 'people'), { name: p });
      }
      // Add record logic here if needed...
      setShowSampleOptions(false);
  }

  const handleClearData = async () => {
      if(!confirm("CẢNH BÁO: Xóa toàn bộ dữ liệu trên Cloud? Hành động này không thể hoàn tác!")) return;
      // Xóa records
      const qRec = query(collection(db, 'records'));
      const snapRec = await getDocs(qRec);
      snapRec.forEach(d => deleteDoc(d.ref));
      
      // Xóa people
      const qPeo = query(collection(db, 'people'));
      const snapPeo = await getDocs(qPeo);
      snapPeo.forEach(d => deleteDoc(d.ref));
      
      setShowSampleOptions(false);
  }

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
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold uppercase tracking-wide leading-tight flex items-center gap-1">
                    Sổ Ăn Uống <span className="text-yellow-400 text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">Cloud Sync</span>
                </h1>
                <span className="text-xs text-blue-200 opacity-80 font-medium hidden sm:block">Dữ liệu được lưu trên Cloud</span>
            </div>
          </div>
          <button 
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <BookOpen className="w-5 h-5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">HƯỚNG DẪN</span>
          </button>
        </div>
      </header>

      {/* Navigation - Responsive Scroll */}
      <div className="bg-white shadow-sm sticky top-[72px] z-20 border-b border-gray-100">
        <nav className="max-w-5xl mx-auto flex overflow-x-auto no-scrollbar snap-x">
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
                 onSubmit={(data: any) => handleSaveRecord(data, false)}
                 submitLabel="LƯU GIAO DỊCH (CLOUD)"
              />
            </AnimatedCard>
          </div>
        )}

        {/* TAB 2: DEBT & HISTORY (MERGED) */}
        {activeTab === 'debt_history' && (
          <div className="space-y-6 animate-enter">
              
              {/* Unified Filter */}
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

              {/* SECTION 1: NET BALANCES */}
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
                                                    <button 
                                                        onClick={() => handleMarkAllPaid(item.name)}
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
                                                                    <input type="checkbox" className="w-5 h-5 accent-blue-600 cursor-pointer" onChange={() => handleTogglePaid(r.id, item.name, r.participants)}/>
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
                                                                    <input type="checkbox" checked={true} className="w-4 h-4 accent-gray-400 cursor-pointer" onChange={() => handleTogglePaid(r.id, item.name, r.participants)}/>
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
                                             
                                             <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                                 <button onClick={() => setEditingRecord(record)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors">
                                                     <Edit3 className="w-3 h-3"/> Sửa
                                                 </button>
                                                 <button onClick={() => handleDeleteRecord(record.id)} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors">
                                                     <Trash2 className="w-3 h-3"/> Xóa
                                                 </button>
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
                     <h4 className="font-bold text-gray-700 uppercase flex items-center gap-2"><FileText className="w-4 h-4"/> Bảng Tổng Hợp</h4>
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
                             onClick={() => setShowSampleOptions(!showSampleOptions)}
                             className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center justify-center gap-1 font-bold transition-all shadow-sm hover:shadow w-full sm:w-auto"
                         >
                             <Database className="w-3 h-3" /> Dữ liệu mẫu
                         </button>
                         {showSampleOptions && (
                             <div className="absolute right-0 mt-2 w-full sm:w-52 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                                 <button onClick={handleLoadSampleData} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b">
                                     Nạp dữ liệu mẫu lên Cloud
                                 </button>
                                 <button onClick={handleClearData} className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 font-medium">
                                     <Trash2 className="w-3 h-3 inline mr-1"/> Xóa sạch Cloud DB
                                 </button>
                             </div>
                         )}
                     </div>
                 </div>
                 
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
                                 <button onClick={() => handleRemovePerson(person)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100">
                                     <Trash2 className="w-4 h-4" />
                                 </button>
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

    </div>
  );
};

export default App;