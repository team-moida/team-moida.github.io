// updated
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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
    const { title, body, targetMemberId } = data;

    if (!title || !body) return;

    const tokensSnap = await admin.firestore()
      .collection(`${DB_PATH}/fcm_tokens`)
      .get();

    if (tokensSnap.empty) return;

    // 특정 회원에게만 보내는 경우 필터링
    const tokens = [];
    tokensSnap.forEach(doc => {
      const t = doc.data();
      if (!t.token) return;
      if (targetMemberId && doc.id !== targetMemberId) return;
      tokens.push(t.token);
    });

    if (tokens.length === 0) return;

    // 500개씩 나눠서 전송 (FCM 제한)
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const res = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        data: { title, body },
        android: { priority: 'high' },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: 'default' } },
        },
        webpush: {
          fcmOptions: { link: "https://nakdo0415-crypto.github.io/moida/" },
          notification: {
            icon: "https://nakdo0415-crypto.github.io/moida/icon.png",
            badge: "https://nakdo0415-crypto.github.io/moida/icon.png",
          },
        },
      });

      // 유효하지 않은 토큰 삭제
      const invalidTokenDocs = [];
      res.responses.forEach((r, idx) => {
        if (!r.success && (
          r.error?.code === "messaging/invalid-registration-token" ||
          r.error?.code === "messaging/registration-token-not-registered"
        )) {
          invalidTokenDocs.push(chunk[idx]);
        }
      });

      if (invalidTokenDocs.length > 0) {
        const batch = admin.firestore().batch();
        tokensSnap.forEach(doc => {
          if (invalidTokenDocs.includes(doc.data().token)) {
            batch.delete(doc.ref);
          }
        });
        await batch.commit();
      }
    }
  }
);
