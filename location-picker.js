// ─── 지도 장소 선택 모달 ──────────────────────────────────────────────────────
const LocationPickerModal = ({ isOpen, onClose, onConfirm, initialLat, initialLng, initialName }) => {
    const mapContainerRef = React.useRef(null);
    const mapRef = React.useRef(null);
    const markerRef = React.useRef(null);
    const [placeName, setPlaceName] = React.useState('');
    const [lat, setLat] = React.useState(37.5665);
    const [lng, setLng] = React.useState(126.9780);
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [searching, setSearching] = React.useState(false);
    const [locating, setLocating] = React.useState(false);
    const [geocodeFailed, setGeocodeFailed] = React.useState(false);
    const [favorites, setFavorites] = React.useState([]);   // 장소 즐겨찾기 (settings/location_favorites · 운영진 공유)
    const [favManage, setFavManage] = React.useState(false); // 관리(수정/삭제) 모드
    const reverseGeocode = async (y, x) => {
        try {
            const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${x}&y=${y}`;
            const res = await fetch(KAKAO_PROXY + encodeURIComponent(url), { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } });
            const json = await res.json();
            const doc = json.documents && json.documents[0];
            if (doc) {
                const n = (doc.road_address && doc.road_address.building_name) || (doc.address && doc.address.address_name) || (doc.road_address && doc.road_address.address_name) || '';
                if (n) { setPlaceName(n.trim()); setGeocodeFailed(false); }
            }
        } catch (_) { setGeocodeFailed(true); }
    };
    const moveMarker = (newLat, newLng) => {
        setLat(newLat); setLng(newLng);
        if (markerRef.current) markerRef.current.setLatLng([newLat, newLng]);
        if (mapRef.current) mapRef.current.setView([newLat, newLng], mapRef.current.getZoom());
    };
    const doSearch = async () => {
        const q = query.trim(); if (!q) return;
        setSearching(true); setResults([]);
        try {
            const kw = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=8`;
            const r1 = await fetch(KAKAO_PROXY + encodeURIComponent(kw), { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } });
            const d1 = await r1.json();
            if (d1.documents && d1.documents.length > 0) { setResults(d1.documents); }
            else {
                const addr = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=8`;
                const r2 = await fetch(KAKAO_PROXY + encodeURIComponent(addr), { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } });
                const d2 = await r2.json();
                if (d2.documents && d2.documents.length > 0) setResults(d2.documents.map(d => ({place_name:d.address_name,road_address_name:(d.road_address&&d.road_address.address_name)||'',x:d.x,y:d.y})));
                else alert('검색 결과가 없습니다.\n업체명이나 주소를 다르게 입력해보세요.');
            }
        } catch (_) { alert('검색 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.'); }
        setSearching(false);
    };
    const selectResult = (place) => {
        const y = parseFloat(place.y), x = parseFloat(place.x);
        moveMarker(y, x);
        if (mapRef.current) mapRef.current.setView([y, x], 17);
        setPlaceName(place.place_name || '');
        setResults([]); setQuery('');
    };
    const goCurrentLocation = () => {
        if (!navigator.geolocation) { alert('위치 정보를 지원하지 않는 브라우저입니다.'); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const y = pos.coords.latitude, x = pos.coords.longitude;
            moveMarker(y, x);
            if (mapRef.current) mapRef.current.setView([y, x], 17);
            await reverseGeocode(y, x);
            setLocating(false);
        }, () => { alert('위치 정보를 가져올 수 없습니다.'); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
    };
    // ── 장소 즐겨찾기 (등록/적용/수정/삭제) — settings/location_favorites 에 목록으로 저장 ──
    const saveFavorites = async (next) => {
        setFavorites(next);
        try { if (typeof getCol === 'function') await getCol('settings').doc('location_favorites').set({ list: next, updatedAt: new Date().toISOString() }); }
        catch (_) { alert('즐겨찾기 저장에 실패했습니다.'); }
    };
    const addFavorite = () => {
        const nm = (placeName || '').trim();
        if (!nm) { alert('먼저 장소를 선택하거나 장소명을 입력해주세요.'); return; }
        if (favorites.some(f => f.name === nm && Math.abs((f.lat || 0) - lat) < 1e-5 && Math.abs((f.lng || 0) - lng) < 1e-5)) { alert('이미 즐겨찾기에 등록된 장소예요.'); return; }
        saveFavorites([...favorites, { id: 'fav_' + Date.now(), name: nm, lat, lng }]);
    };
    const applyFavorite = (f) => {
        moveMarker(f.lat, f.lng);
        if (mapRef.current) mapRef.current.setView([f.lat, f.lng], 17);
        setPlaceName(f.name || ''); setResults([]); setQuery('');
    };
    const renameFavorite = (f) => {
        const nm = window.prompt('즐겨찾기 이름 수정', f.name || '');
        if (nm == null) return;
        const t = nm.trim(); if (!t) return;
        saveFavorites(favorites.map(x => x.id === f.id ? { ...x, name: t } : x));
    };
    const deleteFavorite = (f) => { saveFavorites(favorites.filter(x => x.id !== f.id)); };
    React.useEffect(() => {
        if (!isOpen || typeof getCol !== 'function') return;
        let active = true;
        getCol('settings').doc('location_favorites').get()
            .then(d => { if (active && d.exists && Array.isArray(d.data().list)) setFavorites(d.data().list); })
            .catch(() => {});
        setFavManage(false);
        return () => { active = false; };
    }, [isOpen]);
    React.useEffect(() => {
        if (!isOpen) return;
        setPlaceName(initialName || ''); setQuery(''); setResults([]); setGeocodeFailed(false);
        const initLat = initialLat || 37.5665, initLng = initialLng || 126.9780;
        setLat(initLat); setLng(initLng);
        const t = setTimeout(() => {
            if (!mapContainerRef.current || mapRef.current) return;
            const map = L.map(mapContainerRef.current, { center: [initLat, initLng], zoom: 16 });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
            const pin = `<div style="width:26px;height:26px;background:#ef4444;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(239,68,68,0.5)"></div>`;
            const icon = L.divIcon({ html: pin, iconSize: [26,26], iconAnchor: [13,26], className: '' });
            const marker = L.marker([initLat, initLng], { draggable: true, icon }).addTo(map);
            marker.on('dragend', async (e) => { const p = e.target.getLatLng(); setLat(p.lat); setLng(p.lng); await reverseGeocode(p.lat, p.lng); });
            map.on('click', async (e) => { marker.setLatLng(e.latlng); setLat(e.latlng.lat); setLng(e.latlng.lng); await reverseGeocode(e.latlng.lat, e.latlng.lng); });
            mapRef.current = map; markerRef.current = marker;
            setTimeout(() => map.invalidateSize(), 300);
        }, 200);
        return () => { clearTimeout(t); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; } };
    }, [isOpen]);
    window.useMoidaBack && window.useMoidaBack(isOpen, onClose);
    if (!isOpen) return null;
    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', flexDirection:'column', background:'var(--t-surface)' }}>
            <div style={{ position:'relative', zIndex:10, flexShrink:0, display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
                <button onClick={onClose} style={{ padding:8, borderRadius:12, background:'var(--t-s2)', border:'none', cursor:'pointer', display:'flex' }}>
                    <Icon.ArrowLeft size={18} />
                </button>
                <div style={{ flex:1 }}>
                    <p style={{ fontWeight:700, fontSize:14, color:'var(--t-text)', margin:0 }}>장소 선택</p>
                    <p style={{ fontSize:10, color:'var(--c-sub)', margin:0 }}>업체명·주소 검색 또는 지도를 직접 클릭하세요</p>
                </div>
                {locating && <div style={{ width:18, height:18, border:'2px solid #ec4899', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />}
            </div>
            <div style={{ position:'relative', zIndex:10, flexShrink:0, padding:'10px 12px', borderBottom:'1px solid var(--t-border)', background:'var(--t-s2)' }}>
                <div style={{ display:'flex', gap:8 }}>
                    <input type="text" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') doSearch(); }} placeholder="업체명 또는 주소 검색"
                        style={{ flex:1, background:'var(--t-surface)', border:'1px solid var(--t-border)', borderRadius:12, padding:'8px 12px', fontSize:12, fontFamily:'inherit', fontWeight:700, outline:'none', userSelect:'text', WebkitUserSelect:'text', color:'var(--t-text)' }} />
                    <button onClick={doSearch} disabled={searching} style={{ padding:'8px 16px', background:searching?'var(--c-sub)':'var(--t-btn)', color:'#fff', border:'none', borderRadius:12, fontSize:12, fontWeight:700, cursor:searching?'default':'pointer', fontFamily:'inherit' }}>{searching?'...':'검색'}</button>
                    <button onClick={goCurrentLocation} style={{ padding:'8px 12px', background:'#fff0f6', border:'none', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', color:'#ec4899' }}><Icon.MapPin size={16} /></button>
                </div>
                {/* 장소 즐겨찾기 — 칩 누르면 적용 / [관리]에서 이름수정·삭제 / [+ 저장]은 현재 장소 등록 */}
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                    <span style={{ flexShrink:0, fontSize:11, fontWeight:700, color:'#ec4899' }}>⭐ 즐겨찾기</span>
                    {favorites.map(f => (
                        <span key={f.id} style={{ flexShrink:0, display:'flex', alignItems:'center', background:'var(--t-surface)', border:'1px solid var(--t-border)', borderRadius:999, padding:'4px 10px' }}>
                            <button onClick={() => favManage ? renameFavorite(f) : applyFavorite(f)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'var(--t-text)', fontFamily:'inherit', whiteSpace:'nowrap', padding:0 }}>{f.name}</button>
                            {favManage && <button onClick={() => deleteFavorite(f)} title="삭제" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-danger)', display:'flex', padding:0, marginLeft:6 }}><Icon.X size={12} /></button>}
                        </span>
                    ))}
                    <button onClick={addFavorite} style={{ flexShrink:0, background:'#fff0f6', border:'1px solid #fbcfe8', borderRadius:999, padding:'4px 10px', fontSize:12, fontWeight:700, color:'#ec4899', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>+ 저장</button>
                    {favorites.length > 0 && (
                        <button onClick={() => setFavManage(v => !v)} style={{ flexShrink:0, background:'var(--t-s2)', border:'1px solid var(--t-border)', borderRadius:999, padding:'4px 10px', fontSize:12, fontWeight:700, color:'var(--c-sub)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>{favManage ? '완료' : '관리'}</button>
                    )}
                </div>
                {results.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:12, right:12, background:'var(--t-surface)', border:'1px solid var(--t-border)', borderRadius:16, boxShadow:'0 8px 24px rgba(0,0,0,0.18)', zIndex:20, overflow:'hidden', maxHeight:280, overflowY:'auto' }}>
                        {results.map((place, i) => (
                            <button key={i} onClick={() => selectResult(place)} style={{ width:'100%', textAlign:'left', padding:'12px 16px', background:'none', border:'none', borderBottom:'1px solid var(--t-border)', cursor:'pointer', fontFamily:'inherit' }}>
                                <p style={{ fontSize:13, fontWeight:700, color:'var(--t-text)', margin:0 }}>{place.place_name}</p>
                                <p style={{ fontSize:10, color:'var(--c-sub)', margin:'2px 0 0' }}>{place.road_address_name||place.address_name||''}</p>
                                {place.category_name && <p style={{ fontSize:10, color:'#ec4899', margin:'2px 0 0' }}>{place.category_name}</p>}
                            </button>
                        ))}
                        <button onClick={() => setResults([])} style={{ width:'100%', padding:'10px', background:'var(--t-s2)', border:'none', fontSize:11, color:'var(--c-sub)', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>닫기</button>
                    </div>
                )}
            </div>
            <div ref={mapContainerRef} style={{ flex:1, minHeight:0, zIndex:1 }} />
            <div style={{ position:'relative', zIndex:10, flexShrink:0, padding:'16px', borderTop:'1px solid var(--t-border)', background:'var(--t-surface)', display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                    <div style={{ display:'flex', justifyContent:'space-between', margin:'0 0 4px 4px' }}>
                        <p style={{ fontSize:10, fontWeight:700, color:'#ec4899', textTransform:'uppercase', margin:0 }}>장소명</p>
                        {geocodeFailed && <p style={{ fontSize:10, fontWeight:700, color:'var(--c-danger)', margin:0 }}>⚠ 주소 자동 조회 실패 — 직접 입력해주세요</p>}
                    </div>
                    <input type="text" value={placeName} onChange={e=>{ setPlaceName(e.target.value); setGeocodeFailed(false); }} placeholder="장소명을 직접 수정할 수 있습니다"
                        style={{ width:'100%', background:'var(--t-s2)', border:'1px solid var(--t-border)', borderRadius:12, padding:'12px 16px', fontSize:14, fontFamily:'inherit', fontWeight:700, outline:'none', boxSizing:'border-box', userSelect:'text', WebkitUserSelect:'text', color:'var(--t-text)' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 4px' }}>
                    <span style={{ fontSize:10, color:'var(--c-sub)', fontFamily:'monospace' }}>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                    <a href={`https://map.kakao.com/link/map/${encodeURIComponent(placeName||'위치')},${lat},${lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'#3b82f6', fontWeight:700, textDecoration:'underline' }}>카카오맵 확인 →</a>
                </div>
                <button onClick={() => { if(!placeName.trim()){alert('장소명을 입력해주세요.');return;} onConfirm({name:placeName.trim(),lat,lng}); }}
                    style={{ width:'100%', padding:'16px', background:'var(--t-btn)', color:'#fff', border:'none', borderRadius:16, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    이 위치로 설정
                </button>
            </div>
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
