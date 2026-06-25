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

    // 회칙 본문 렌더(B+): "제N조 ..." 줄 기준으로 조항을 블록 단위로 묶어, 라임 "제N조" 배지 +
    // 굵은 제목 + 본문으로 카드 안에 구분선으로 나눠 표시. (제1조 앞 서문/구조 없는 글은 단일 본문 블록)
    const renderRules = (text) => {
        const lines = (text || '').split('\n');
        const blocks = [];
        let cur = null;
        lines.forEach(line => {
            const m = line.match(/^\s*(제\s*\d+\s*조)\s*(.*)$/);
            if (m) {
                cur = { no: m[1].replace(/\s+/g,''), title: (m[2]||'').trim(), body: [] };
                blocks.push(cur);
            } else {
                if (!cur) { cur = { no: null, title: '', body: [] }; blocks.push(cur); }
                cur.body.push(line);
            }
        });
        return blocks
            .filter(b => b.no || b.title || b.body.some(l => l.trim()))
            .map((b, i) => (
                <div key={i} className={`py-4 first:pt-1 last:pb-1 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    {b.no && <span className="inline-block text-[11px] font-black px-2.5 py-1 rounded-full bg-live text-[#15171E] mb-2.5">{b.no}</span>}
                    {b.title && <h3 className="font-black text-[17px] text-slate-800 leading-snug mb-2">{b.title}</h3>}
                    {b.body.filter(l => l.trim()).map((l, j) => (
                        <p key={j} className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{l}</p>
                    ))}
                </div>
            ));
    };

    return (
        <div className="animate-in">
            {/* 헤더(B+): 큰 "회칙" 제목 + 개정일 칩 + (관리자) 편집 */}
            <div className="flex items-end justify-between gap-3 mb-4 reveal">
                <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
                    <h2 className="font-black text-2xl text-slate-900 leading-none">회칙</h2>
                    {updatedAt && !isEditing && (
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{formatDate(updatedAt)} 개정</span>
                    )}
                </div>
                {isAdminMode && !isEditing && (
                    <button onClick={()=>{setEditContent(content);setIsEditing(true);}}
                        className="p-2 rounded-xl bg-slate-100 text-slate-500 shrink-0 active:scale-95 transition-all">
                        <Icon.Edit size={15}/>
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="reveal">
                    <textarea
                        value={editContent}
                        onChange={e=>setEditContent(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 leading-relaxed resize-none"
                        rows={20}
                        placeholder="회칙 내용을 입력하세요... (예: 제1조 목적)"
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
                <div className="reveal">
                    <div className="card rounded-2xl px-5 py-1">
                        {renderRules(content)}
                    </div>
                    {updatedBy && (
                        <p className="text-[10px] text-slate-400 mt-2 text-right">{updatedBy} 수정</p>
                    )}
                </div>
            ) : (
                <div className="card rounded-2xl p-8 text-center text-slate-400 reveal">
                    <div className="flex justify-center mb-2 opacity-25"><Icon.ShieldCheck size={36}/></div>
                    <p className="font-black text-sm">아직 회칙이 등록되지 않았습니다</p>
                    {isAdminMode && <p className="text-xs mt-1">우측 상단 편집 버튼으로 작성하세요</p>}
                </div>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
