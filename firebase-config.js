// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCadZIoYzIc_QhEkGjv86G4rjFwMASd5ig",
  authDomain: "nothing-d3af4.firebaseapp.com",
  databaseURL: "https://nothing-d3af4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nothing-d3af4",
  storageBucket: "nothing-d3af4.firebasestorage.app",
  messagingSenderId: "7155955115",
  appId: "1:7155955115:web:3bd80618f9aff1a4dc8eee",
  measurementId: "G-XSVGL2M8LL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth and Firestore references
const auth = firebase.auth();
const db = firebase.firestore();

// Google authentication provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Function to handle admin access
function isAdmin(email) {
    // For development purposes, allow all users to access admin
    return true;
    
    // Uncomment below for production to restrict access
    /*
    const adminEmails = [
        'admin@example.com',
        // Add more admin emails as needed
    ];
    
    return adminEmails.includes(email);
    */
} 