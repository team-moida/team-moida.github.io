const firebaseConfig = {
    apiKey: "AIzaSyBYykNZVf20LLQ-YIIeA2TKz9DSBsypRZM",
    authDomain: "moida-otpfc.firebaseapp.com",
    projectId: "moida-otpfc",
    storageBucket: "moida-otpfc.firebasestorage.app",
    messagingSenderId: "407991675090",
    appId: "1:407991675090:web:df9f7d8a7c93a6eb5ae50b"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const APP_ID = 'moida-otpfc';
const getCol = (n) => db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection(n);
const STAFF_ROLES = ['회장','매니저','총무','부총무'];
