// ─── 회칙 탭 ────────────────────────────────────────────────────────────────────
const TabRules = ({ isAdminMode, showAlert, memberName }) => {
    const { useState, useEffect } = React;
    const [content, setContent] = useState('');
    const [updatedAt, setUpdatedAt] = useState('');
    const [updatedBy, setUpdatedBy] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsub = getCol('settings').doc('club_rules').onSnapshot(doc => {
            if (doc.exists) {
                const d = doc.data();
                setContent(d.content || '');
                setUpdatedAt(d.updatedAt || '');
                setUpdatedBy(d.updatedBy || '');
            } else {
                setContent('');
                setUpdatedAt('');
                setUpdatedBy('');
            }
        });
        return () => unsub();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await getCol('settings').doc('club_rules').set({
                content: editContent,
                updatedAt: new Date().toISOString(),
                updatedBy: memberName || '관리자',
            });
            setIsEditing(false);
            showAlert('완료', '회칙이 저장되었습니다.');
        } catch(e) {
            showAlert('오류', '저장 실패');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
    };

    // 회칙 본문 렌더: "제N조 ..." 줄은 라임 배지 + 볼드 제목, 그 외는 본문 (구조 없으면 그대로 본문)
    const renderRules = (text) => {
        const lines = (text || '').split('\n');
        return lines.map((line, i) => {
            const m = line.match(/^\s*(제\s*\d+\s*조)\s*(.*)$/);
            if (m) return (
                <div key={i} className="flex items-baseline gap-2 mt-5 first:mt-0">
                    <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-lg bg-live text-[#15171E]">{m[1].replace(/\s+/g,'')}</span>
                    {m[2] && <span className="font-black text-[15px] text-slate-800 leading-snug">{m[2]}</span>}
                </div>
            );
            if (line.trim() === '') return <div key={i} className="h-2"/>;
            return <p key={i} className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mt-1">{line}</p>;
        });
    };

    return (
        <div className="animate-in">
            <div className="rounded-2xl p-5 mb-4 text-white flex items-center justify-between gap-3" style={{ background:'linear-gradient(135deg,#334155,#1e293b)', boxShadow:'0 10px 28px -8px rgba(30,41,59,0.5)' }}>
                <div className="flex items-center gap-3 min-w-0">
                    <Icon.ShieldCheck size={28} className="text-white shrink-0"/>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/70">우리 팀 규칙</p>
                        <p className="font-black text-xl leading-tight">OTP FC 회칙</p>
                    </div>
                </div>
                {isAdminMode && !isEditing && (
                    <button onClick={()=>{setEditContent(content);setIsEditing(true);}}
                        className="p-2 rounded-xl bg-white/20 text-white shrink-0 active:scale-95 transition-all">
                        <Icon.Edit size={15}/>
                    </button>
                )}
            </div>

            {isEditing ? (
                <div>
                    <textarea
                        value={editContent}
                        onChange={e=>setEditContent(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 leading-relaxed resize-none"
                        rows={20}
                        placeholder="회칙 내용을 입력하세요..."
                    />
                    <div className="flex gap-2 mt-3">
                        <button onClick={()=>setIsEditing(false)}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">
                            취소
                        </button>
                        <button onClick={handleSave} disabled={isSaving}
                            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all ${isSaving?'bg-teal-300 text-white':'bg-teal-500 text-white'}`}>
                            {isSaving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </div>
            ) : content ? (
                <div>
                    <div className="card rounded-2xl p-5">
                        {renderRules(content)}
                    </div>
                    {updatedAt && (
                        <p className="text-[10px] text-slate-400 mt-2 text-right">
                            {formatDate(updatedAt)}{updatedBy && ` · ${updatedBy}`} 수정
                        </p>
                    )}
                </div>
            ) : (
                <div className="card rounded-2xl p-8 text-center text-slate-400">
                    <div className="flex justify-center mb-2 opacity-25"><Icon.ShieldCheck size={36}/></div>
                    <p className="font-black text-sm">아직 회칙이 등록되지 않았습니다</p>
                    {isAdminMode && <p className="text-xs mt-1">우측 상단 편집 버튼으로 작성하세요</p>}
                </div>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
