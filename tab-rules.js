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

    return (
        <div className="animate-in">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">OTP FC 회칙</p>
                {isAdminMode && !isEditing && (
                    <button onClick={()=>{setEditContent(content);setIsEditing(true);}}
                        className="p-2 rounded-xl bg-blue-50 text-blue-500">
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
                    <div className="card rounded-2xl p-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</p>
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
