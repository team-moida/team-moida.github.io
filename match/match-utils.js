const Icon = {
    Home:({size=18,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    Refresh:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>,
    Save:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
    Camera:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    Download:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Plus:({size=14,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 4v16m8-8H4"/></svg>,
    Minus:({size=14,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 12H4"/></svg>,
    Trash:({size=14,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    Check:({size=14,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>,
    Chart:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    Sun:({size=18,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    Moon:({size=18,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    Calendar:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

const hoursList = Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
const minutesList = ['00','10','20','30','40','50'];
const splitTime = (t) => {const p=(t||'08:00').split(':');return{h:p[0]||'08',m:p[1]||'00'};};

function PresetModal({presetForm, setPresetForm, onSave, onClose}) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-slate-800 mb-4">구장 프리셋 추가</h2>
                <div className="space-y-3 mb-4">
                    <input type="text" placeholder="프리셋 이름 (예: 강남 풋살장)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                        value={presetForm.name} onChange={e=>setPresetForm(p=>({...p,name:e.target.value}))}/>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-600">구장 수:</p>
                        <button onClick={()=>{if(presetForm.courtCount>1){const fn=[...presetForm.fieldNames];fn.pop();const ft=[...presetForm.fieldTypes];ft.pop();setPresetForm(p=>({...p,courtCount:p.courtCount-1,fieldNames:fn,fieldTypes:ft}));}}} className="p-2 rounded-lg bg-slate-100"><Icon.Minus size={14}/></button>
                        <span className="font-black text-lg w-6 text-center">{presetForm.courtCount}</span>
                        <button onClick={()=>{if(presetForm.courtCount<6){const fn=[...presetForm.fieldNames,`${presetForm.courtCount+1}구장`];const ft=[...presetForm.fieldTypes,'6vs6'];setPresetForm(p=>({...p,courtCount:p.courtCount+1,fieldNames:fn,fieldTypes:ft}));}}} className="p-2 rounded-lg bg-slate-100"><Icon.Plus size={14}/></button>
                    </div>
                    {presetForm.fieldNames.map((name,i)=>(
                        <div key={i} className="flex gap-2">
                            <input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black" value={name}
                                onChange={e=>{const fn=[...presetForm.fieldNames];fn[i]=e.target.value;setPresetForm(p=>({...p,fieldNames:fn}));}}/>
                            <select className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-black"
                                value={presetForm.fieldTypes[i]} onChange={e=>{const ft=[...presetForm.fieldTypes];ft[i]=e.target.value;setPresetForm(p=>({...p,fieldTypes:ft}));}}>
                                <option value="6vs6">6vs6</option><option value="5vs5">5vs5</option>
                            </select>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={onSave} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">저장</button>
                </div>
            </div>
        </div>
    );
}
