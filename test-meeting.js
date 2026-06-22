// ─── 🧪 테스트 모임 ───────────────────────────────────────────────────────────
// 버튼 한 번으로: 현재 시각 기준 모임 + 나 포함 랜덤 인원 + 팀편성 + 매치표 자동 생성.
// 만든 모든 문서에 isTest:true 태깅 → 삭제 시 isTest 문서를 전부 쓸어 '흔적 없이' 제거.
// 실제 데이터는 안 건드림: 현재 모임(mirror)·watch_control은 손대지 않고,
//   빈 날짜를 골라 모임을 만든다(팀/매치는 날짜로 묶이므로 충돌 방지).
//   모임 탭에서 그 모임을 열면(viewMeeting) effectiveMeeting 기준으로 팀/매치가 보인다.

const _tmP2 = (n) => String(n).padStart(2, '0');
const _tmTeamName = (i) => (typeof getTeamName === 'function' ? getTeamName(i) : String.fromCharCode(65 + i));
const _tmLevelPts = (lvl) => (typeof getLevelPoints === 'function' ? getLevelPoints(lvl) : (parseInt(lvl) || 4));
const _tmShuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 매치 스케줄 생성 (handlers-match.js matchGenerateTable 규칙과 동일)
function _tmGenerateSchedule(config, teamsArr) {
    const teams = teamsArr.map((_, i) => _tmTeamName(i));
    const teamSizes = {}; teamsArr.forEach((t, i) => { teamSizes[_tmTeamName(i)] = t.members.length; });
    const { courtCount, matchDuration, breakDuration, startTime, endTime } = config;
    let currentTime = new Date(`2024-01-01T${startTime}:00`);
    const limitTime = new Date(`2024-01-01T${endTime}:00`);
    const teamStats = {}; teams.forEach(t => teamStats[t] = 0);
    const matchupHistory = {}; teams.forEach(t1 => { matchupHistory[t1] = {}; teams.forEach(t2 => { if (t1 !== t2) matchupHistory[t1][t2] = 0; }); });
    const courtUsage = {}, lastOpponent = {};
    teams.forEach(t => { courtUsage[t] = {}; for (let i = 0; i < courtCount; i++) courtUsage[t][i] = 0; lastOpponent[t] = null; });
    const sessionList = []; let matchIdx = 1;
    while (currentTime < limitTime) {
        let usedInSession = new Set(), sessionMatches = [];
        const sessionCourts = Array.from({ length: courtCount }, (_, i) => ({ idx: i, type: config.fieldTypes[i] || '6vs6' }));
        for (const court of sessionCourts) {
            let candidates = teams.filter(t => !usedInSession.has(t));
            if (candidates.length < 2) continue;
            candidates.sort(() => Math.random() - 0.5);
            let bestPair = null, minScore = Infinity;
            for (let i = 0; i < candidates.length; i++) {
                for (let j = i + 1; j < candidates.length; j++) {
                    const t1 = candidates[i], t2 = candidates[j];
                    const isB2B = (lastOpponent[t1] === t2 || lastOpponent[t2] === t1);
                    const score = matchupHistory[t1][t2] * 10000 + (teamStats[t1] + teamStats[t2]) * 100 + (courtUsage[t1][court.idx] + courtUsage[t2][court.idx]) * 50 + (isB2B ? 500000 : 0) + Math.random();
                    if (score < minScore) { minScore = score; bestPair = [t1, t2]; }
                }
            }
            if (bestPair) {
                const [t1, t2] = bestPair;
                sessionMatches.push({ match: [t1, t2], fieldIdx: court.idx });
                usedInSession.add(t1); usedInSession.add(t2);
                matchupHistory[t1][t2]++; matchupHistory[t2][t1]++;
                teamStats[t1]++; teamStats[t2]++;
                courtUsage[t1][court.idx]++; courtUsage[t2][court.idx]++;
                lastOpponent[t1] = t2; lastOpponent[t2] = t1;
            }
        }
        if (sessionMatches.length > 0) {
            const startL = currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            const endC = new Date(currentTime.getTime() + matchDuration * 60000);
            const endL = endC.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            sessionList.push({ id: matchIdx++, time: `${startL} - ${endL}`, startTime: startL, endTime: endL, matches: sessionMatches.sort((a, b) => a.fieldIdx - b.fieldIdx), resting: teams.filter(t => !usedInSession.has(t)) });
            currentTime = new Date(currentTime.getTime() + (matchDuration + breakDuration) * 60000);
            if (new Date(currentTime.getTime() - breakDuration * 60000) >= limitTime) break;
        } else break;
    }
    return { list: sessionList, stats: teamStats };
}

// 충돌 없는 빈 날짜 찾기 (오늘부터 — 정기/매칭 id 둘 다 비어 있는 날)
async function _tmFindFreeDate() {
    const d = new Date();
    for (let i = 0; i < 21; i++) {
        const ds = `${d.getFullYear()}-${_tmP2(d.getMonth() + 1)}-${_tmP2(d.getDate())}`;
        const [self, match] = await Promise.all([getCol('meetings').doc(ds).get(), getCol('meetings').doc(ds + '__match').get()]);
        if (!self.exists && !match.exists) return ds;
        d.setDate(d.getDate() + 1);
    }
    return null;
}

async function createTestMeeting({ me, activeMembers, showAlert, showConfirm }) {
    if (!me || !me.id) return showAlert('오류', '내 회원 정보를 찾을 수 없습니다.');
    showConfirm('🧪 테스트 모임 생성',
        '현재 시각 기준 테스트 모임을 만들고, 나 포함 랜덤 인원으로 팀편성·매치표까지 자동 생성합니다.\n(테스트 표식이 붙어 나중에 [테스트 삭제]로 흔적 없이 지울 수 있어요.)',
        async () => {
            try {
                const date = await _tmFindFreeDate();
                if (!date) return showAlert('알림', '빈 날짜를 찾지 못했습니다 (앞으로 3주 내 모두 사용 중).');
                const meetingId = date; // 정기(self) → getMeetingId = 날짜

                // 시간: 현재 시각(10분 내림) ~ +2시간
                const now = new Date();
                const sH = now.getHours(), sM = Math.floor(now.getMinutes() / 10) * 10;
                let eH = sH + 2, eM = sM; if (eH > 23) { eH = 23; eM = 50; }
                const start = `${_tmP2(sH)}:${_tmP2(sM)}`, end = `${_tmP2(eH)}:${_tmP2(eM)}`;

                // 참가자: 나 + 랜덤 (최대 18명 = 6×3팀)
                const pool = _tmShuffle((activeMembers || []).filter(m => m && m.id && m.id !== me.id));
                const chosen = [{ id: me.id, name: me.name || '나', gender: me.gender || '남성', level: me.level || 4 }]
                    .concat(pool.map(m => ({ id: m.id, name: m.name, gender: m.gender || '남성', level: m.level || 4 })))
                    .slice(0, Math.min(18, 1 + pool.length));
                const teamCount = chosen.length >= 9 ? 3 : chosen.length >= 4 ? 2 : 1;
                if (chosen.length < 2) return showAlert('알림', '활동 회원이 너무 적어 테스트 모임을 만들 수 없습니다.');

                // 팀 분배(테스트용 간단 분배: 레벨 내림차순 스네이크) + scoreSum
                const teams = Array.from({ length: teamCount }, () => ({ members: [], scoreSum: 0 }));
                const sorted = [...chosen].sort((a, b) => (b.level || 4) - (a.level || 4));
                let fwd = true, ci = 0;
                while (ci < sorted.length) {
                    const order = fwd ? teams : [...teams].reverse();
                    for (const t of order) { if (ci >= sorted.length) break; t.members.push(sorted[ci++]); }
                    fwd = !fwd;
                }
                teams.forEach(t => { t.scoreSum = t.members.reduce((s, m) => s + _tmLevelPts(m.level || 4), 0); });

                const nowIso = new Date().toISOString();
                const batch = db.batch();

                // 1) 모임 문서
                batch.set(getCol('meetings').doc(meetingId), {
                    date, meetingId, start, end, location: '🧪 테스트 모임',
                    locationLat: null, locationLng: null, locationRadius: 100, enableQR: false,
                    meetingType: 'self', opponentName: '',
                    maxMale: 0, maxFemale: 0, confirmedMaleCount: 0, confirmedFemaleCount: 0, waitingMaleCount: 0, waitingFemaleCount: 0,
                    maxLimit: 24, managerId: me.id || '', managerName: me.name || '테스트', editPin: '',
                    status: 'upcoming', createdAt: nowIso, updatedAt: nowIso,
                    isRegistrationEnabled: false, isFirstComeFirstServed: true, registrationOpenAt: '', registrationCloseAt: '',
                    confirmedCount: chosen.length, waitingCount: 0, isTest: true,
                });

                // 2) 참가자(선정+출석체크 완료) — weekly_session
                chosen.forEach((m, idx) => {
                    batch.set(getCol('weekly_session').doc(`${meetingId}_${m.id}`), {
                        memberId: m.id, name: m.name, gender: m.gender, level: m.level,
                        date, meetingId, checkedIn: true, checkInTime: start, status: 'active',
                        isGuest: false, team: null, createdAt: new Date(Date.now() + idx).toISOString(), isTest: true,
                    });
                });

                // 3) 팀편성 확정 — team_drafts (isConfirmed:true)
                batch.set(getCol('team_drafts').doc(), {
                    meetingDate: date, meetingId, meetingTimeRange: `${start} ~ ${end}`,
                    createdAt: nowIso, timeLabel: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                    teams, managerName: me.name || '테스트', isConfirmed: true, isTest: true,
                });

                // 4) 매치표 — match_schedules
                const config = {
                    meetingDate: date, courtCount: 3, matchDuration: 12, breakDuration: 3, subIntervalSec: 180,
                    startTime: start, endTime: end, location: '🧪 테스트 모임',
                    fieldNames: ['1구장', '2구장', '3구장'], fieldTypes: ['6vs6', '6vs6', '6vs6'], strictCourtSize: false,
                };
                const schedule = _tmGenerateSchedule(config, teams);
                batch.set(getCol('match_schedules').doc(), {
                    schedule, config, completedMatches: [], currentMatchIndex: 0,
                    createdAt: nowIso, meetingDate: date, meetingId,
                    label: `${date} 테스트 매치 (${schedule.list.length}라운드)`, isTest: true,
                });

                // 5) 삭제용 마커
                batch.set(getCol('settings').doc('test_meeting'), { testId: meetingId, date, createdAt: nowIso });

                await batch.commit();
                showAlert('🧪 테스트 모임 생성 완료',
                    `${date} ${start}~${end} · ${chosen.length}명 / ${teamCount}팀 / ${schedule.list.length}라운드\n\n모임 탭 목록에서 '🧪 테스트 모임'을 열면 출석·팀·매치를 볼 수 있어요.\n끝나면 [테스트 삭제]로 흔적 없이 지우세요.`);
            } catch (e) {
                showAlert('오류', '테스트 모임 생성 실패: ' + (e?.message || e));
            }
        });
}

async function deleteTestMeeting({ showAlert, showConfirm }) {
    showConfirm('🧪 테스트 모임 삭제',
        '테스트로 만든 모든 기록(모임·참가자·팀편성·매치표)을 흔적 없이 삭제합니다. 실제 모임은 건드리지 않습니다.',
        async () => {
            try {
                const cols = ['meetings', 'weekly_session', 'team_drafts', 'match_schedules', 'history', 'registrations'];
                let total = 0;
                for (const c of cols) {
                    let snap;
                    try { snap = await getCol(c).where('isTest', '==', true).get(); } catch (_) { continue; }
                    if (!snap || snap.empty) continue;
                    let batch = db.batch(), n = 0;
                    for (const d of snap.docs) {
                        batch.delete(d.ref); n++; total++;
                        if (n >= 450) { await batch.commit(); batch = db.batch(); n = 0; }
                    }
                    if (n > 0) await batch.commit();
                }
                await getCol('settings').doc('test_meeting').delete().catch(() => {});
                showAlert('삭제 완료', total > 0 ? `테스트 기록 ${total}건을 삭제했습니다.` : '삭제할 테스트 기록이 없습니다.');
            } catch (e) {
                showAlert('오류', '테스트 삭제 실패: ' + (e?.message || e));
            }
        });
}
