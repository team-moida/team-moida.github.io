// ─── 공지사항 게시판 (전체화면) ───────────────────────────────────────────────
// 홈 헤더 종(🔔) 또는 홈 공지 순환 띠로 진입. 하단 탭 바에는 칸 없음(종/띠가 입구).
// announcements는 use-fcm.js 기준 최신순 + type:'test' 제외됨.
// 관리자(isAdminMode)만: 새 공지 작성 / 선택 삭제 / 상세에서 수정·삭제.
// 일반 회원은 목록·상세 보기만.

// 공지 날짜 포맷 "26.09.10" (YY.MM.DD, 0패딩) — 게시판 로컬 헬퍼
const fmtNoticeDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear() % 100).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
};

// 공지 분류 배지 (모임/공지/중요). 옛 공지는 category 없음 → 기본 '공지'
const NOTICE_CAT = {
    '모임': 'bg-teal-100 text-teal-600',
    '중요': 'bg-red-100 text-red-600',
    '공지': 'bg-slate-200 text-slate-600',
};
const NoticeBadge = ({ category }) => {
    const cat = category || '공지';
    const cls = NOTICE_CAT[cat] || NOTICE_CAT['공지'];
    return <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg ${cls}`}>{cat}</span>;
};

const TabNotice = ({ announcements, isAdminMode, onBack, onAdd, onEdit, onDeleteOne, onDeleteMany, onNavigateMeeting }) => {
    const { useState, useEffect } = React;
    const [selectedId, setSelectedId] = useState(null);   // 상세 보기 대상 (null이면 목록)
    const [selectMode, setSelectMode] = useState(false);  // 선택 삭제 모드
    const [checkedIds, setCheckedIds] = useState([]);     // 선택된 공지 id

    const list = announcements || [];

    // 상세로 보던 공지가 삭제되면(목록에서 사라지면) 자동으로 목록으로 복귀
    useEffect(() => {
        if (selectedId && !list.some(a => a.id === selectedId)) setSelectedId(null);
    }, [list, selectedId]);

    const selected = selectedId ? list.find(a => a.id === selectedId) : null;

    const toggleCheck = (id) => setCheckedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    const exitSelectMode = () => { setSelectMode(false); setCheckedIds([]); };
    const handleDeleteSelected = () => {
        if (checkedIds.length === 0) return;
        onDeleteMany(checkedIds);
        exitSelectMode();
    };

    // ── 상세 화면 ──────────────────────────────────────────────────────────────
    if (selected) {
        return (
            <div className="animate-in">
                <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setSelectedId(null)} className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1 font-black text-sm">
                        <Icon.ChevronLeft size={18}/> 목록
                    </button>
                </div>
                <div className="card rounded-3xl p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <NoticeBadge category={selected.category} />
                            <h2 className="font-black text-lg text-slate-800 min-w-0">{selected.title}</h2>
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-1">{fmtNoticeDate(selected.sentAt)}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selected.body}</p>
                    {selected.sentBy && <p className="text-xs text-slate-400 mt-4">{selected.sentBy}</p>}
                    {selected.linkMeetingId && onNavigateMeeting && (
                        <button onClick={() => onNavigateMeeting(selected)}
                            className="w-full mt-4 py-2.5 rounded-xl bg-teal-500 text-white font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5">
                            신청하러 가기 <Icon.ChevronRight size={16}/>
                        </button>
                    )}
                    {isAdminMode && (
                        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                            <button onClick={() => onEdit(selected)} className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-500 font-black text-sm active:scale-95 transition-all">수정</button>
                            <button onClick={() => onDeleteOne(selected.id)} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-500 font-black text-sm active:scale-95 transition-all">삭제</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── 목록 화면 ──────────────────────────────────────────────────────────────
    return (
        <div className="animate-in">
            {/* 상단: 홈 카드 스타일 hero (뒤로 + 제목) */}
            <div className="rounded-3xl p-5 mb-4 text-white" style={{ background:'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow:'0 10px 28px -8px rgba(249,115,22,0.45)' }}>
                <button onClick={onBack} className="flex items-center gap-1 text-white/85 font-black text-xs mb-2 active:scale-95 transition-all">
                    <Icon.ChevronLeft size={16}/> 홈
                </button>
                <div className="flex items-center gap-3">
                    <Icon.Bell size={26} className="text-white shrink-0"/>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/80">공지 게시판</p>
                        <p className="font-black text-xl leading-tight">공지사항{list.length > 0 && <span className="text-base font-black text-white/80"> · {list.length}건</span>}</p>
                    </div>
                </div>
            </div>

            {/* 관리자 도구 */}
            {isAdminMode && (
                <div className="flex items-center gap-2 mb-3">
                    {selectMode ? (
                        <>
                            <button onClick={handleDeleteSelected} disabled={checkedIds.length === 0}
                                className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${checkedIds.length === 0 ? 'bg-slate-100 text-slate-400' : 'bg-red-500 text-white active:scale-95'}`}>
                                삭제{checkedIds.length > 0 ? ` (${checkedIds.length})` : ''}
                            </button>
                            <button onClick={exitSelectMode} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">취소</button>
                        </>
                    ) : (
                        <>
                            <button onClick={onAdd} className="flex-1 py-2 rounded-xl bg-teal-500 text-white font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-1">
                                <Icon.Plus size={15}/> 새 공지 작성
                            </button>
                            {list.length > 0 && (
                                <>
                                    <button onClick={() => setSelectMode(true)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">선택삭제</button>
                                    <button onClick={() => onDeleteMany(list.map(a => a.id))} className="px-3 py-2 rounded-xl bg-red-50 text-red-500 font-black text-sm active:scale-95 transition-all">전체삭제</button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 목록 */}
            {list.length === 0 ? (
                <div className="card rounded-3xl p-8 text-center text-slate-400">
                    <div className="flex justify-center mb-2 opacity-30"><Icon.Bell size={32}/></div>
                    <p className="font-black text-sm">등록된 공지가 없습니다</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {list.map(a => (
                        <button key={a.id}
                            onClick={() => selectMode ? toggleCheck(a.id) : (a.linkMeetingId && onNavigateMeeting ? onNavigateMeeting(a) : setSelectedId(a.id))}
                            className="w-full card rounded-3xl p-4 text-left active:scale-98 transition-all">
                            <div className="flex items-center gap-3">
                                {selectMode && (
                                    <span className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all ${checkedIds.includes(a.id) ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300'}`}>
                                        {checkedIds.includes(a.id) && <Icon.Check size={12}/>}
                                    </span>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <NoticeBadge category={a.category} />
                                            <p className="font-black text-sm text-slate-800 truncate">{a.title}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">{fmtNoticeDate(a.sentAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{a.body}</p>
                                </div>
                                {!selectMode && <Icon.ChevronRight size={16} className="text-slate-300 flex-shrink-0"/>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
