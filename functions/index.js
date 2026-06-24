// updated
const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast3", maxInstances: 10 });

const DB_PATH = "artifacts/moida-otpfc/public/data";

// Firestore에 notifications 문서 생성 시 FCM 전송
exports.sendPushNotification = onDocumentCreated(
  `${DB_PATH}/notifications/{notifId}`,
  async (event) => {
    const data = event.data.data();
    const { title, body, targetMemberId, targetMemberIds } = data;

    if (!title || !body) return;

    const tokensSnap = await admin.firestore()
      .collection(`${DB_PATH}/fcm_tokens`)
      .get();

    if (tokensSnap.empty) return;

    // 특정 회원에게만 보내는 경우 필터링
    // targetMemberIds(배열) 우선, 없으면 targetMemberId(단일, 대기승급용)
    // nativeToken(Android)이 있으면 네이티브 우선, 없으면 웹 토큰 사용
    const nativeEntries = []; // { token, docId }
    const webEntries = [];    // { token }

    tokensSnap.forEach(doc => {
      const t = doc.data();
      if (targetMemberIds?.length) {
        if (!targetMemberIds.includes(doc.id)) return;
      } else if (targetMemberId && doc.id !== targetMemberId) return;

      if (t.nativeToken) {
        nativeEntries.push({ token: t.nativeToken, docId: doc.id });
      } else if (t.token) {
        webEntries.push({ token: t.token });
      }
    });

    if (nativeEntries.length === 0 && webEntries.length === 0) return;

    // 네이티브 토큰 발송 (data-only → onMessageReceived 항상 호출 → IMPORTANCE_HIGH 채널 보장)
    if (nativeEntries.length > 0) {
      for (let i = 0; i < nativeEntries.length; i += 500) {
        const chunkEntries = nativeEntries.slice(i, i + 500);
        const chunkTokens = chunkEntries.map(e => e.token);
        const res = await admin.messaging().sendEachForMulticast({
          tokens: chunkTokens,
          data: { title, body },
          android: { priority: 'high' },
        });
        console.log(`[FCM native] 대상: ${chunkTokens.length}, 성공: ${res.successCount}, 실패: ${res.failureCount}`);

        // 유효하지 않은 네이티브 토큰 필드 삭제
        const batch = admin.firestore().batch();
        let needsBatch = false;
        res.responses.forEach((r, idx) => {
          if (!r.success) {
            console.log(`[FCM native] 실패[${idx}] code=${r.error?.code} message=${r.error?.message}`);
            if (
              r.error?.code === "messaging/invalid-registration-token" ||
              r.error?.code === "messaging/registration-token-not-registered"
            ) {
              const docRef = admin.firestore().doc(`${DB_PATH}/fcm_tokens/${chunkEntries[idx].docId}`);
              batch.update(docRef, { nativeToken: admin.firestore.FieldValue.delete() });
              needsBatch = true;
            }
          }
        });
        if (needsBatch) await batch.commit();
      }
    }

    // 웹 토큰 발송 (기존 webpush 방식 유지 — iOS/웹 대상)
    if (webEntries.length > 0) {
      const webTokens = webEntries.map(e => e.token);
      for (let i = 0; i < webTokens.length; i += 500) {
        const chunk = webTokens.slice(i, i + 500);
        const res = await admin.messaging().sendEachForMulticast({
          tokens: chunk,
          data: { title, body },
          android: { priority: 'high' },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default' } },
          },
          webpush: {
            headers: { 'Urgency': 'high' },
            notification: {
              title,
              body,
              icon: 'https://team-moida.github.io/icon.png',
              badge: 'https://team-moida.github.io/icon.png',
              data: { url: 'https://team-moida.github.io/member.html' },
              tag: 'moida',
              renotify: true,
            },
            fcmOptions: { link: "https://team-moida.github.io/member.html" },
          },
        });
        console.log(`[FCM web] 대상: ${chunk.length}, 성공: ${res.successCount}, 실패: ${res.failureCount}`);

        // 유효하지 않은 웹 토큰 문서 삭제
        const invalidWebTokens = [];
        res.responses.forEach((r, idx) => {
          if (!r.success) {
            console.log(`[FCM web] 실패[${idx}] code=${r.error?.code} message=${r.error?.message}`);
            if (
              r.error?.code === "messaging/invalid-registration-token" ||
              r.error?.code === "messaging/registration-token-not-registered"
            ) {
              invalidWebTokens.push(chunk[idx]);
            }
          }
        });
        if (invalidWebTokens.length > 0) {
          const batch = admin.firestore().batch();
          tokensSnap.forEach(doc => {
            if (invalidWebTokens.includes(doc.data().token)) {
              batch.delete(doc.ref);
            }
          });
          await batch.commit();
        }
      }
    }
  }
);

// registrations 문서 삭제 시 → 대기 자동 승급 + 순번 재정렬
exports.onRegistrationDeleted = onDocumentDeleted(
  `${DB_PATH}/registrations/{docId}`,
  async (event) => {
    const db = admin.firestore();
    const FV = admin.firestore.FieldValue;
    const deletedData = event.data.data();
    const { status, meetingDate, meetingId, waitingNumber: cancelledWaitingNumber } = deletedData;

    if (!meetingDate) return;

    const _mid = meetingId || meetingDate; // meetingId 없는 구 문서 대비 fallback
    const _mType = (deletedData.meetingType || "self") === "match" ? "match" : "self";
    const _mirrorKey = _mType === "match" ? "meeting_schedule_match" : "meeting_schedule_v2";

    const meetingRef = db.doc(`${DB_PATH}/meetings/${_mid}`);
    const mirrorRef = db.doc(`${DB_PATH}/settings/${_mirrorKey}`);
    const registrationsRef = db.collection(`${DB_PATH}/registrations`);

    if (status === "confirmed") {
      let upgradedMemberId = null;

      try {
        await db.runTransaction(async (tx) => {
          // ── 읽기 먼저 ──────────────────────────────────────────────────────
          const meetingDoc = await tx.get(meetingRef);
          if (!meetingDoc.exists) return;

          const meetingData = meetingDoc.data();

          // ── 매칭: 빈 자리와 같은 성별 대기자만 승급 ─────────────────────
          if (meetingData.meetingType === "match") {
            const isFemale = (deletedData.gender || "") === "여성";
            const maxG = isFemale ? (meetingData.maxFemale || 0) : (meetingData.maxMale || 0);
            const confG = isFemale ? (meetingData.confirmedFemaleCount || 0) : (meetingData.confirmedMaleCount || 0);
            if (confG >= maxG) return; // 이미 다른 신청이 자리를 채움
            const confField = isFemale ? "confirmedFemaleCount" : "confirmedMaleCount";
            const waitField = isFemale ? "waitingFemaleCount" : "waitingMaleCount";

            // 같은 모임의 대기자 전체 조회 후 같은 성별만 추려 가장 오래된 1명 승급
            const allWaitingSnap = await tx.get(
              registrationsRef
                .where("meetingDate", "==", meetingDate)
                .where("status", "==", "waiting")
            );
            const sameGender = allWaitingSnap.docs.filter(
              d => (((d.data().gender || "") === "여성") === isFemale)
            );
            if (sameGender.length === 0) return;
            sameGender.sort((a, b) => {
              const ta = a.data().registeredAt, tb = b.data().registeredAt;
              return (ta && ta.toMillis ? ta.toMillis() : 0) - (tb && tb.toMillis ? tb.toMillis() : 0);
            });
            const promoteDoc = sameGender[0];
            const promoteData = promoteDoc.data();
            upgradedMemberId = promoteData.memberId;

            tx.update(promoteDoc.ref, { status: "confirmed", waitingNumber: null });
            tx.set(
              db.doc(`${DB_PATH}/weekly_session/${_mid}_${promoteData.memberId}`),
              {
                memberId: promoteData.memberId,
                name: promoteData.name || "",
                gender: promoteData.gender || "",
                level: promoteData.level || "",
                date: meetingDate,
                meetingId: _mid,
                checkedIn: false,
                checkInTime: null,
                status: "active",
                isGuest: false,
                team: null,
                createdAt: FV.serverTimestamp(),
              }
            );
            const matchUpd = {
              confirmedCount: FV.increment(1),
              waitingCount: FV.increment(-1),
              [confField]: FV.increment(1),
              [waitField]: FV.increment(-1),
            };
            tx.update(meetingRef, matchUpd);
            tx.update(mirrorRef, matchUpd);

            // 같은 성별 나머지 대기자 순번 -1 (승급자 제외, waitingNumber > 1)
            sameGender
              .filter(d => d.id !== promoteDoc.id && (d.data().waitingNumber || 0) > 1)
              .forEach(d => tx.update(d.ref, { waitingNumber: FV.increment(-1) }));
            return;
          }

          const confirmedCount = meetingData.confirmedCount || 0;
          const maxLimit = meetingData.maxLimit || 18;
          // 취소 자리를 다른 신청이 이미 채운 경우 승급 안 함
          if (confirmedCount >= maxLimit) return;

          // 대기 1번 — registeredAt 오름차순 첫 번째
          const waitingSnap = await tx.get(
            registrationsRef
              .where("meetingDate", "==", meetingDate)
              .where("status", "==", "waiting")
              .orderBy("registeredAt")
              .limit(1)
          );
          if (waitingSnap.empty) return;

          const waitingDoc = waitingSnap.docs[0];
          const waitingData = waitingDoc.data();

          // 나머지 대기자 전체 (순번 재정렬용)
          const allWaitingSnap = await tx.get(
            registrationsRef
              .where("meetingDate", "==", meetingDate)
              .where("status", "==", "waiting")
          );

          upgradedMemberId = waitingData.memberId;

          // ── 쓰기 ──────────────────────────────────────────────────────────
          tx.update(waitingDoc.ref, { status: "confirmed", waitingNumber: null });

          tx.set(
            db.doc(`${DB_PATH}/weekly_session/${_mid}_${waitingData.memberId}`),
            {
              memberId: waitingData.memberId,
              name: waitingData.name || "",
              gender: waitingData.gender || "",
              level: waitingData.level || "",
              date: meetingDate,
              meetingId: _mid,
              checkedIn: false,
              checkInTime: null,
              status: "active",
              isGuest: false,
              team: null,
              createdAt: FV.serverTimestamp(),
            }
          );

          tx.update(meetingRef, {
            confirmedCount: FV.increment(1),
            waitingCount: FV.increment(-1),
          });
          tx.update(mirrorRef, {
            confirmedCount: FV.increment(1),
            waitingCount: FV.increment(-1),
          });

          // 나머지 대기자 순번 -1 (승급된 대기자 제외, waitingNumber > 1)
          allWaitingSnap.docs
            .filter(d => d.id !== waitingDoc.id && (d.data().waitingNumber || 0) > 1)
            .forEach(d => tx.update(d.ref, { waitingNumber: FV.increment(-1) }));
        });

        // 트랜잭션 완료 후 승급자 개인 알림 (targetMemberId → 그 사람 토큰만 전송)
        if (upgradedMemberId) {
          await db.collection(`${DB_PATH}/notifications`).add({
            title: "참가 확정!",
            body: `${meetingDate} 모임 대기에서 참가 확정으로 바뀌었습니다.`,
            targetMemberId: upgradedMemberId,
            sentAt: FV.serverTimestamp(),
          });
        }
      } catch (e) {
        console.error("승급 처리 실패:", e);
        throw e; // Function 자동 재시도를 위해 에러 전파
      }

    } else if (status === "waiting") {
      if (!cancelledWaitingNumber || cancelledWaitingNumber <= 0) return;

      try {
        await db.runTransaction(async (tx) => {
          // 취소된 순번보다 높은 대기자 전체 조회 후 순번 -1
          const remainingSnap = await tx.get(
            registrationsRef
              .where("meetingDate", "==", meetingDate)
              .where("status", "==", "waiting")
          );
          // 매칭은 같은 성별 대기 줄만 순번 재정렬 (성별별 대기번호이므로)
          const isMatch = deletedData.meetingType === "match";
          const cancelledFemale = (deletedData.gender || "") === "여성";
          remainingSnap.docs
            .filter(d => (d.data().waitingNumber || 0) > cancelledWaitingNumber)
            .filter(d => !isMatch || (((d.data().gender || "") === "여성") === cancelledFemale))
            .forEach(d => tx.update(d.ref, { waitingNumber: FV.increment(-1) }));
        });
      } catch (e) {
        console.error("순번 재정렬 실패:", e);
        throw e;
      }
    }
  }
);

// ── 정기 모임 자동 생성 (매시 정각, KST 기준) ────────────────────────────────
// settings/recurring_meeting 의 생성요일·시각이 현재(KST)와 맞으면
// 다음 모임일을 자동 생성. 이미 있으면 건너뜀(중복 방지).
// recurring_overrides/{날짜} 가 있으면 그 값을 우선 적용.
function composeRecurringAnnouncement(data) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const fmtD = (ds) => {
    if (!ds) return "";
    const d = new Date(ds + "T00:00:00");
    return isNaN(d.getTime()) ? ds : `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  };
  const title = `📅 ${fmtD(data.date)} 모임 안내`;
  const lines = [`${data.start} ~ ${data.end}`];
  if (data.location) lines.push(`📍 ${data.location}`);
  lines.push(`👥 최대 ${data.maxLimit}명`);
  return { title, body: lines.join("\n") };
}

exports.generateRecurringMeeting = onSchedule(
  { schedule: "0 * * * *", timeZone: "Asia/Seoul" },
  async () => {
    const db = admin.firestore();
    const FV = admin.firestore.FieldValue;
    const pad = (n) => String(n).padStart(2, "0");

    const cfgSnap = await db.doc(`${DB_PATH}/settings/recurring_meeting`).get();
    if (!cfgSnap.exists) return;
    const cfg = cfgSnap.data();
    if (!cfg.enabled) return;

    // 현재 KST 시각
    const kst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const nowWeekday = kst.getDay();
    const nowHour = kst.getHours();
    if (nowWeekday !== Number(cfg.uploadWeekday) || nowHour !== Number(cfg.uploadHour)) return;

    // 다음 모임 날짜 (모임 요일까지 남은 일수)
    let daysUntil = (Number(cfg.weekday) - nowWeekday + 7) % 7;
    if (daysUntil === 0) daysUntil = 7; // 같은 요일이면 다음 주
    const target = new Date(kst);
    target.setDate(kst.getDate() + daysUntil);
    const targetDate = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    const todayStr = `${kst.getFullYear()}-${pad(kst.getMonth() + 1)}-${pad(kst.getDate())}`;

    // 날짜별 미리 지정값 (있으면 우선) — meetingId 결정 전에 필요
    const ovrSnap = await db.doc(`${DB_PATH}/recurring_overrides/${targetDate}`).get();
    const ovr = ovrSnap.exists ? ovrSnap.data() : null;
    const hasOverride = !!ovr;
    const pick = (k, dflt) =>
      (ovr && ovr[k] !== undefined && ovr[k] !== null && ovr[k] !== "") ? ovr[k] : dflt;

    const meetingType = (pick("meetingType", cfg.defaultMeetingType || "self") === "match") ? "match" : "self";
    const meetingId = meetingType === "match" ? `${targetDate}__match` : targetDate;

    const meetingRef = db.doc(`${DB_PATH}/meetings/${meetingId}`);
    if ((await meetingRef.get()).exists) return; // 이미 생성됨 → 중복 방지
    const maxMale = meetingType === "match" ? Number(pick("maxMale", 0)) : 0;
    const maxFemale = meetingType === "match" ? Number(pick("maxFemale", 0)) : 0;
    const maxLimit = meetingType === "match" ? (maxMale + maxFemale) : Number(pick("maxLimit", cfg.defaultMaxLimit || 18));
    const start = cfg.start || "08:00";
    const end = cfg.end || "10:00";
    const nowLocal = `${kst.getFullYear()}-${pad(kst.getMonth() + 1)}-${pad(kst.getDate())}T${pad(kst.getHours())}:${pad(kst.getMinutes())}`;

    // 신청 마감 시각 — 설정값(마감 요일+시) 있으면 사용, 없으면 모임 시작 시각(기존 동작)
    let registrationCloseAt = `${targetDate}T${start}`;
    if (cfg.regCloseWeekday !== undefined && cfg.regCloseWeekday !== null &&
        cfg.regCloseHour !== undefined && cfg.regCloseHour !== null) {
      const backDays = (Number(cfg.weekday) - Number(cfg.regCloseWeekday) + 7) % 7;
      const closeD = new Date(target);
      closeD.setDate(target.getDate() - backDays);
      const closeDateStr = `${closeD.getFullYear()}-${pad(closeD.getMonth() + 1)}-${pad(closeD.getDate())}`;
      registrationCloseAt = `${closeDateStr}T${pad(Number(cfg.regCloseHour))}:00`;
    }

    const data = {
      date: targetDate, meetingId, start, end,
      location: pick("location", cfg.defaultLocation || ""),
      locationLat: pick("locationLat", cfg.defaultLat != null ? cfg.defaultLat : null),
      locationLng: pick("locationLng", cfg.defaultLng != null ? cfg.defaultLng : null),
      locationRadius: Number(pick("locationRadius", cfg.defaultRadius || 100)),
      enableQR: pick("enableQR", cfg.defaultEnableQR || false),
      meetingType,
      opponentName: meetingType === "match" ? pick("opponentName", "") : "",
      maxMale, maxFemale,
      confirmedMaleCount: 0, confirmedFemaleCount: 0,
      waitingMaleCount: 0, waitingFemaleCount: 0,
      maxLimit,
      managerId: cfg.managerId || "", managerName: cfg.managerName || "",
      status: "upcoming",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      isRegistrationEnabled: true,
      isFirstComeFirstServed: pick("isFirstComeFirstServed", cfg.defaultFCFS !== false),
      registrationOpenAt: nowLocal,
      registrationCloseAt,
      confirmedCount: 0, waitingCount: 0,
      autoGenerated: true,
      needsReview: !hasOverride,
    };

    await meetingRef.set(data);

    // 새 모임이 활성(오늘 이후 같은 종류 중 가장 가까운 미종료) 모임이면 mirror 동기화
    try {
      const allSnap = await db.collection(`${DB_PATH}/meetings`).get();
      const allMeetings = allSnap.docs.map(d => d.data())
        .filter(m => m.status !== "done" && String(m.date) >= todayStr);
      const isSameType = (m) => (m.meetingType || "self") === meetingType;
      const nearestSameType = allMeetings.filter(isSameType)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
      if (nearestSameType && nearestSameType.date === targetDate) {
        const mirrorKey = meetingType === "match" ? "meeting_schedule_match" : "meeting_schedule_v2";
        const mirrorData = {
          date: data.date, meetingId: data.meetingId, start: data.start, end: data.end,
          location: data.location, locationLat: data.locationLat, locationLng: data.locationLng,
          locationRadius: data.locationRadius, enableQR: data.enableQR,
          meetingType: data.meetingType, opponentName: data.opponentName,
          maxMale: data.maxMale, maxFemale: data.maxFemale,
          confirmedMaleCount: 0, confirmedFemaleCount: 0, waitingMaleCount: 0, waitingFemaleCount: 0,
          maxLimit: data.maxLimit, managerId: data.managerId, managerName: data.managerName,
          testMode: false,
          isRegistrationEnabled: data.isRegistrationEnabled,
          isFirstComeFirstServed: data.isFirstComeFirstServed,
          registrationOpenAt: data.registrationOpenAt, registrationCloseAt: data.registrationCloseAt,
          confirmedCount: 0, waitingCount: 0,
        };
        await db.doc(`${DB_PATH}/settings/${mirrorKey}`).set(mirrorData);
      }
    } catch (e) { console.error("mirror 동기화 실패:", e); }

    // 생성과 동시에 전체 공지 푸시
    if (cfg.autoAnnounce) {
      try {
        const ann = composeRecurringAnnouncement(data);
        await db.collection(`${DB_PATH}/notifications`).add({
          title: ann.title, body: ann.body,
          sentAt: FV.serverTimestamp(), sentBy: data.managerName || "정기 모임 안내",
        });
      } catch (e) { console.error("정기 모임 공지 실패:", e); }
    }

    console.log(`[정기모임] 생성: ${meetingId} (type=${meetingType}, override=${hasOverride})`);
  }
);

// ── 정기 모임 자동 생성 전 사전 알림 (10분 전·5분 전, 전체 회원) ────────────────
// settings/recurring_meeting 의 생성요일·시각(uploadWeekday/uploadHour:00) 기준
// 10분 전·5분 전에 "곧 신청 시작" 푸시를 전체 회원에게 발송 (pushOnly: 게시판 미표시).
// 실제로 생성될 모임이 아직 없을 때만 보냄(이미 있으면 신청이 새로 열리지 않음).
exports.notifyBeforeRecurring = onSchedule(
  { schedule: "*/5 * * * *", timeZone: "Asia/Seoul" },
  async () => {
    const db = admin.firestore();
    const FV = admin.firestore.FieldValue;
    const pad = (n) => String(n).padStart(2, "0");

    const cfgSnap = await db.doc(`${DB_PATH}/settings/recurring_meeting`).get();
    if (!cfgSnap.exists) return;
    const cfg = cfgSnap.data();
    if (!cfg.enabled) return;

    const kst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    // 생성 시각(uploadWeekday, uploadHour:00) 기준 10분 전 / 5분 전인지 판정
    const hits = (offsetMin) => {
      const t = new Date(kst.getTime() + offsetMin * 60000);
      return t.getDay() === Number(cfg.uploadWeekday)
        && t.getHours() === Number(cfg.uploadHour)
        && t.getMinutes() === 0;
    };
    const mins = hits(10) ? 10 : hits(5) ? 5 : 0;
    if (!mins) return;

    // 곧 생성될 모임 날짜 (생성 시각 기준 — generateRecurringMeeting과 동일 규칙)
    const genMoment = new Date(kst.getTime() + mins * 60000);
    let daysUntil = (Number(cfg.weekday) - genMoment.getDay() + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    const target = new Date(genMoment);
    target.setDate(genMoment.getDate() + daysUntil);
    const targetDate = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;

    // 이미 생성된 모임이면 알림 생략 (신청이 새로 열리지 않으므로)
    const ovrSnap = await db.doc(`${DB_PATH}/recurring_overrides/${targetDate}`).get();
    const ovr = ovrSnap.exists ? ovrSnap.data() : null;
    const meetingType = ((ovr && ovr.meetingType ? ovr.meetingType : cfg.defaultMeetingType || "self") === "match") ? "match" : "self";
    const meetingId = meetingType === "match" ? `${targetDate}__match` : targetDate;
    if ((await db.doc(`${DB_PATH}/meetings/${meetingId}`).get()).exists) return;

    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const dLabel = `${target.getMonth() + 1}/${target.getDate()}(${days[target.getDay()]})`;

    await db.collection(`${DB_PATH}/notifications`).add({
      title: "⏰ 곧 이번 모임 신청 시작",
      body: `${mins}분 후 ${dLabel} 정기 모임 신청이 열립니다. 미리 준비해 주세요!`,
      type: "recurring_reminder",
      pushOnly: true,
      sentAt: FV.serverTimestamp(),
      sentBy: "정기 모임 안내",
    });

    console.log(`[정기 사전알림] ${mins}분 전 → 전체 발송 (모임 ${dLabel})`);
  }
);

// ── 회비 납부 신고 시 운영진에게 푸시 ─────────────────────────────────────────
// 회원이 홈에서 "송금했어요(납부 신고)" → dues_reports 문서 생성(status:pending)
// → 운영진(STAFF_ROLES) 회원에게 알림. notifications 문서를 추가하면
// 위 sendPushNotification 이 실제 전송을 처리한다.
const DUES_STAFF_ROLES = ["회장", "매니저", "총무", "부총무"];
const DUES_LABELS_FN = { monthly: "월납", rest: "휴식", half_year: "반년납", full_year: "1년납" };

exports.notifyDuesReport = onDocumentCreated(
  `${DB_PATH}/dues_reports/{reportId}`,
  async (event) => {
    const data = event.data && event.data.data();
    if (!data || data.status !== "pending") return;

    const db = admin.firestore();
    const FV = admin.firestore.FieldValue;

    // 운영진 회원 id 수집 (fcm_tokens 문서 id = 회원 id 와 동일)
    const membersSnap = await db.collection(`${DB_PATH}/members`).get();
    const adminIds = [];
    membersSnap.forEach((doc) => {
      const m = doc.data();
      if (m && !m.isResigned && DUES_STAFF_ROLES.includes(m.role)) adminIds.push(doc.id);
    });
    if (adminIds.length === 0) return;

    const who = data.memberName || "회원";
    const what = DUES_LABELS_FN[data.payType] || "회비";
    const amt = (Number(data.amount) || 0).toLocaleString("ko-KR");

    await db.collection(`${DB_PATH}/notifications`).add({
      title: "💰 회비 납부 신고",
      body: `${who}님이 ${data.month || ""} ${what} ${amt}원 납부를 신고했어요. 확인해 주세요.`,
      targetMemberIds: adminIds,
      type: "dues",
      pushOnly: true,
      sentAt: FV.serverTimestamp(),
      sentBy: "회비 신고",
    });

    console.log(`[회비신고] ${who} ${what} ${amt}원 → 운영진 ${adminIds.length}명 알림`);
  }
);

// ── 워치 명령 처리 (라운드 완료 토글) ─────────────────────────────────────────
// 워치가 종료/취소를 누르면 watch_commands 컬렉션에 { roundId, done } 문서를 추가한다.
// (오프라인이면 워치에 큐로 쌓였다가 재연결 시 자동 전송됨 — Firestore 기본 오프라인 큐잉)
// 서버가 이 문서를 받아 해당 라운드의 완료 상태를 match_schedules + watch_control 에
// 트랜잭션으로 반영한 뒤 명령 문서를 삭제한다. → 관리자 폰이 꺼져 있어도 동작.
// done 을 명시(토글 아님)하므로 같은 명령이 중복 도착해도 결과가 동일(멱등).
exports.processWatchCommand = onDocumentCreated(
  `${DB_PATH}/watch_commands/{cmdId}`,
  async (event) => {
    const cmd = event.data && event.data.data();
    const cmdRef = event.data.ref;
    if (!cmd || cmd.roundId == null) {
      await cmdRef.delete().catch(() => {});
      return;
    }
    const roundId = cmd.roundId;
    const wantDone = !!cmd.done;

    const db = admin.firestore();
    const wcRef = db.doc(`${DB_PATH}/settings/watch_control`);

    try {
      await db.runTransaction(async (tx) => {
        // ── 읽기 (트랜잭션은 모든 읽기를 쓰기보다 먼저 해야 함) ───────────
        const wcSnap = await tx.get(wcRef);
        if (!wcSnap.exists) return;
        const wc = wcSnap.data();
        const activeId = wc.activeMatchScheduleId || null;

        // (A) 활성 문서를 읽어 이 모임의 종류(정기/매칭)·식별자를 알아낸다(①번 방식).
        let activeSnap = null;
        if (activeId) {
          const aSnap = await tx.get(db.doc(`${DB_PATH}/match_schedules/${activeId}`));
          if (aSnap.exists) activeSnap = aSnap;
        }

        // (B) 그 모임의 '가장 최신 매치표 문서'를 홈과 똑같은 규칙으로 찾는다(미러 기준).
        //     target = 홈이 실제로 읽는 그 문서 → 여기에 +1 해야 홈에 반영된다.
        let target = null;      // { ref, data }
        let allowAdvance = true; // 미러로 정상 해결됐을 때만 라운드 +1 허용
        if (activeSnap) {
          const aMeetingId = String(activeSnap.data().meetingId || "");
          const isMatch = aMeetingId.endsWith("__match");
          const mirrorKey = isMatch ? "meeting_schedule_match" : "meeting_schedule_v2";
          const mirrorSnap = await tx.get(db.doc(`${DB_PATH}/settings/${mirrorKey}`));
          if (mirrorSnap.exists && mirrorSnap.data().date) {
            const mDate = mirrorSnap.data().date;
            const mid = isMatch ? mDate + "__match" : mDate;       // getMeetingId 규칙
            const altMid = isMatch ? mDate : mDate + "__match";    // 반대 종류(보조 검색서 제외)
            const matchCol = db.collection(`${DB_PATH}/match_schedules`);
            let cands = (await tx.get(matchCol.where("meetingId", "==", mid)))
              .docs.map((d) => ({ ref: d.ref, data: d.data() }));
            if (!cands.length) { // 보조: 같은 날짜(반대 종류 제외) — 홈 폴백과 동일
              cands = (await tx.get(matchCol.where("meetingDate", "==", mDate)))
                .docs.map((d) => ({ ref: d.ref, data: d.data() }))
                .filter((x) => x.data.meetingId !== altMid);
            }
            cands.sort((a, b) =>
              String(b.data.createdAt || "").localeCompare(String(a.data.createdAt || "")));
            if (cands.length) target = cands[0]; // createdAt 최신 = 홈이 보는 문서
          }
        }
        // (C) 폴백: 미러/매치표 못 찾음 → 활성 문서 기준으로 '완료 표시만'(+1 건너뜀, 기존 동작 보존).
        if (!target && activeSnap) {
          target = { ref: activeSnap.ref, data: activeSnap.data() };
          allowAdvance = false;
        }

        // ── 쓰기 ─────────────────────────────────────────────────────────
        let advanceTo = null;
        if (target) {
          const tData = target.data;
          const set = new Set(tData.completedMatches || []);
          if (wantDone) set.add(roundId); else set.delete(roundId);
          // 멱등·마지막 가드: 그 라운드가 '지금 현재 라운드'이고 완료 동작일 때만 +1.
          if (allowAdvance && wantDone) {
            const list = (tData.schedule && tData.schedule.list) || [];
            const roundIndex = list.findIndex((s) => s && s.id === roundId);
            const curIdx = tData.currentMatchIndex == null ? 0 : tData.currentMatchIndex;
            if (roundIndex !== -1 && roundIndex === curIdx && curIdx < list.length) {
              advanceTo = curIdx + 1;
            }
          }
          const schedUpdate = { completedMatches: Array.from(set) };
          if (advanceTo !== null) schedUpdate.currentMatchIndex = advanceTo;
          tx.update(target.ref, schedUpdate);
        }

        // watch_control.rounds done 플래그 + (넘김 시) 현재 라운드 동기화 + 활성 포인터 자가 치유.
        const newRounds = (wc.rounds || []).map(
          (r) => (r && r.id === roundId ? { ...r, done: wantDone } : r)
        );
        const wcUpdate = { rounds: newRounds };
        if (advanceTo !== null) wcUpdate.currentMatchIndex = advanceTo;
        if (target && allowAdvance && target.ref.id !== activeId) {
          wcUpdate.activeMatchScheduleId = target.ref.id; // 다음부터 최신 문서를 가리키게
        }
        tx.update(wcRef, wcUpdate);
      });
    } catch (e) {
      console.error("[워치명령] 처리 실패:", e);
      throw e; // 실패 시 Function 자동 재시도
    }

    await cmdRef.delete().catch(() => {});
    console.log(`[워치명령] round ${roundId} → done=${wantDone}`);
  }
);

// ── 매치표 완료 → 현재 라운드 자동 넘김 ──────────────────────────────────────
// 워치 경기기록은 매치표 문서의 completedMatches(완료 체크)만 직접 갱신하고 현재 라운드는 안 올린다.
// 그래서 '완료 체크가 추가되는 순간'을 감지해, 그게 지금 현재 라운드면 currentMatchIndex 를 +1 한다.
// → 워치/홈/매치 크게보기/회원화면이 모두 같은 문서를 보므로 홈 '현재 N라운드'에 반영된다.
// 폰 종료(syncMatchState)는 한 write 에 completedMatches+currentMatchIndex 를 함께 올리므로,
// after 시점엔 이미 다음 라운드가 현재 → '추가된 id == 현재 라운드 id' 가 아니어서 자동으로 건너뜀(이중 넘김 없음).
exports.advanceRoundOnComplete = onDocumentUpdated(
  `${DB_PATH}/match_schedules/{schedId}`,
  async (event) => {
    const before = event.data && event.data.before && event.data.before.data();
    const after = event.data && event.data.after && event.data.after.data();
    if (!before || !after) return;

    // 1) 새로 '추가된' 완료 라운드 id 추출 (완료취소·무변화면 종료 → 번호 그대로)
    const beforeSet = new Set((before.completedMatches || []).map((x) => String(x)));
    const addedIds = (after.completedMatches || [])
      .map((x) => String(x))
      .filter((id) => !beforeSet.has(id));
    if (!addedIds.length) return;

    // 2) 현재 라운드 정보 (마지막 라운드 가드)
    const list = (after.schedule && after.schedule.list) || [];
    const curIdx = after.currentMatchIndex == null ? 0 : after.currentMatchIndex;
    if (!list.length || curIdx >= list.length) return;
    const curRoundId = list[curIdx] && list[curIdx].id != null ? String(list[curIdx].id) : null;
    if (curRoundId == null) return;

    // 3) 추가된 완료가 '현재 라운드'일 때만 +1
    if (!addedIds.includes(curRoundId)) return;

    // 4) 트랜잭션으로 최신 상태 재확인 후 한 칸만 (멱등: 다른 트리거가 이미 올렸으면 no-op)
    const db = admin.firestore();
    const schedRef = db.doc(`${DB_PATH}/match_schedules/${event.params.schedId}`);
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(schedRef);
        if (!snap.exists) return;
        const d = snap.data();
        const curList = (d.schedule && d.schedule.list) || [];
        const idx = d.currentMatchIndex == null ? 0 : d.currentMatchIndex;
        if (!curList.length || idx >= curList.length) return;
        const nowRoundId = curList[idx] && curList[idx].id != null ? String(curList[idx].id) : null;
        const completed = new Set((d.completedMatches || []).map((x) => String(x)));
        // 여전히 '현재 라운드가 완료됨' 상태일 때만 넘김
        if (nowRoundId != null && completed.has(nowRoundId)) {
          tx.update(schedRef, { currentMatchIndex: idx + 1 });
        }
      });
    } catch (e) {
      console.error("[라운드자동넘김] 실패:", e);
      throw e; // 실패 시 자동 재시도
    }
    console.log(`[라운드자동넘김] ${event.params.schedId} round ${curRoundId} 완료 → 현재 라운드 +1`);
  }
);
