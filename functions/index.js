// updated
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
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
              icon: 'https://nakdo0415-crypto.github.io/moida/icon.png',
              badge: 'https://nakdo0415-crypto.github.io/moida/icon.png',
              data: { url: 'https://nakdo0415-crypto.github.io/moida/member.html' },
              tag: 'moida',
              renotify: true,
            },
            fcmOptions: { link: "https://nakdo0415-crypto.github.io/moida/member.html" },
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
    const { status, meetingDate, waitingNumber: cancelledWaitingNumber } = deletedData;

    if (!meetingDate) return;

    const meetingRef = db.doc(`${DB_PATH}/meetings/${meetingDate}`);
    const mirrorRef = db.doc(`${DB_PATH}/settings/meeting_schedule_v2`);
    const registrationsRef = db.collection(`${DB_PATH}/registrations`);

    if (status === "confirmed") {
      let upgradedMemberId = null;

      try {
        await db.runTransaction(async (tx) => {
          // ── 읽기 먼저 ──────────────────────────────────────────────────────
          const meetingDoc = await tx.get(meetingRef);
          if (!meetingDoc.exists) return;

          const meetingData = meetingDoc.data();
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
            db.doc(`${DB_PATH}/weekly_session/${meetingDate}_${waitingData.memberId}`),
            {
              memberId: waitingData.memberId,
              name: waitingData.name || "",
              gender: waitingData.gender || "",
              level: waitingData.level || "",
              date: meetingDate,
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
          remainingSnap.docs
            .filter(d => (d.data().waitingNumber || 0) > cancelledWaitingNumber)
            .forEach(d => tx.update(d.ref, { waitingNumber: FV.increment(-1) }));
        });
      } catch (e) {
        console.error("순번 재정렬 실패:", e);
        throw e;
      }
    }
  }
);
