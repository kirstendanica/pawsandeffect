console.log("main.js is loaded");

const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log("Firebase initialized");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Local Storage Helpers
    function saveSettings(settingKey, settingValue) {
        localStorage.setItem(settingKey, JSON.stringify(settingValue));
    }

    function loadSettings(settingKey) {
        return JSON.parse(localStorage.getItem(settingKey));
    }

    // Mood Diary Management
    function saveMoodDiary(entry) {
        let diary = loadSettings('moodDiary') || [];
        diary.push(entry);
        saveSettings('moodDiary', diary);
        saveMoodDiaryToFirestore(entry);
    }

    function loadMoodDiary() {
        return loadSettings('moodDiary') || [];
    }

    function saveAuthState(user) {
        saveSettings('authUser', user);
    }

    function loadAuthState() {
        return loadSettings('authUser');
    }

    function saveMoodDiaryToFirestore(entry) {
        const user = loadAuthState();
        if (user) {
            db.collection('moodDiary').add({
                uid: user.uid,
                date: entry.date,
                mood: entry.mood,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                showMessage('Mood entry saved to Firestore');
            }).catch(error => {
                showError('Error saving mood entry to Firestore: ' + error.message);
            });
        }
    }

    function loadMoodDiaryFromFirestore() {
        const user = loadAuthState();
        if (user) {
            db.collection('moodDiary').where('uid', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        const entry = doc.data();
                        addMoodDiaryEntryToUI({ date: entry.date, mood: entry.mood });
                    });
                })
                .catch(error => {
                    showError('Error loading mood entries from Firestore: ' + error.message);
                });
        }
    }

    // Authentication
    function signUp() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log("Signing up with email:", email);

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("User signed up:", userCredential.user);
                saveAuthState(userCredential.user);
                showUserInfo(userCredential.user);
            })
            .catch(error => {
                console.error("Error signing up:", error.message);
                showError(error.message);
            });
    }

    function login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log("Logging in with email:", email);

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("User logged in:", userCredential.user);
                saveAuthState(userCredential.user);
                showUserInfo(userCredential.user);
                loadMoodDiaryFromFirestore();
            })
            .catch(error => {
                console.error("Error logging in:", error.message);
                showError(error.message);
            });
    }
    function logout() {
        firebase.auth().signOut()
            .then(() => {
                console.log("User logged out");
                saveAuthState(null);
                showUserInfo(null);
                clearMoodDiary();
            })
            .catch(error => {
                console.error("Error logging out:", error.message);
                showError(error.message);
            });
    }
    
    // User Interface Updates
    function showUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        const authSection = document.getElementById('auth-section');
        const userEmail = document.getElementById('user-email');
        const logoutBtn = document.getElementById('logout-btn');
    
        if (user) {
            userInfo.classList.remove('hidden');
            authSection.classList.add('hidden');
            userEmail.textContent = user.email;
            logoutBtn.classList.remove('hidden');
        } else {
            userInfo.classList.add('hidden');
            authSection.classList.remove('hidden');
            userEmail.textContent = '';
            logoutBtn.classList.add('hidden');
        }
    }
    
    // Mood Diary Entry UI
    function addMoodDiaryEntry(mood) {
        const date = new Date().toISOString();
        const entry = { date, mood };
        saveMoodDiary(entry);
        addMoodDiaryEntryToUI(entry);
    }
    
    function addMoodDiaryEntryToUI(entry) {
        const moodList = document.getElementById('mood-diary');
        const li = document.createElement('li');
        li.textContent = `${new Date(entry.date).toLocaleString()}: ${entry.mood}`;
        moodList.appendChild(li);
    }
    
    function clearMoodDiary() {
        document.getElementById('mood-diary').innerHTML = '';
    }
    
    // Notifications and Error Handling
    function showMessage(message) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.classList.remove('hidden');
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 3000);
    }
    
    function showError(error) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = error;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 3000);
    }
    
    function resetPassword() {
        const email = document.getElementById('email').value;
        if (email) {
            firebase.auth().sendPasswordResetEmail(email)
                .then(() => {
                    showMessage('Password reset email sent. Check your inbox.');
                })
                .catch(error => {
                    showError('Error sending password reset email: ' + error.message);
                });
        } else {
            showError('Please enter your email address.');
        }
    }
    
    // Miscellaneous
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    }
    
    // File Upload and Mood Detection
    function handleFileUpload() {
        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-btn');
        console.log("File input changed", fileInput.files);
        uploadBtn.disabled = !fileInput.files.length;
    }
    
    document.getElementById('file-input').addEventListener('change', handleFileUpload);
    
    function uploadFile() {
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        if (file) {
            showLoading(true);
            const user = loadAuthState();
            if (user) {
                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(`pet_images/${user.uid}/${file.name}`);
    
                fileRef.put(file).then((snapshot) => {
                    console.log('Uploaded a file!');
                    return snapshot.ref.getDownloadURL();}).then((downloadURL) => {
                        console.log('File available at', downloadURL);
                        detectMood(downloadURL);
                    }).catch((error) => {
                        showLoading(false);
                        showError('Error uploading file: ' + error.message);
                    });
                } else {
                    showLoading(false);
                    showError('User not logged in');
                }
            }
        }
        
        function clearFileInput() {
            document.getElementById('file-input').value = '';
        }
        
        function detectMood(imageUrl) {
            console.log('Detecting mood from image:', imageUrl);
            setTimeout(() => {
                showLoading(false);
                const mood = ['Happy', 'Sad', 'Excited', 'Relaxed'][Math.floor(Math.random() * 4)];
                updateMoodResult(mood);
                addMoodDiaryEntry(mood);
                updateMoodChart();
            }, 2000);
        }
        
        // Mood Result and Happiness Tips
        function updateMoodResult(mood) {
            const moodResult = document.getElementById('mood-result');
            moodResult.textContent = mood;
            document.getElementById('result-section').classList.remove('hidden');
            updateHappinessTips(mood);
        }
        
        function updateHappinessTips(mood) {
            const tipsElement = document.getElementById('happiness-tips');
            const tips = {
                'Happy': 'Keep up the good work! Regular playtime and cuddles will maintain your pet\'s happiness.',
                'Sad': 'Spend extra time with your pet today. Consider new toys or activities to lift their spirits.',
                'Excited': 'Channel that energy into fun games or training sessions. It\'s a great time for learning!',
                'Relaxed': 'Your pet is content. This is a good time for gentle grooming or quiet bonding.'
            };
            tipsElement.textContent = tips[mood] || 'Spend quality time with your pet to understand their needs better.';
        }
        
        function updateMoodChart() {
            console.log('Updating mood chart');
        }
        
        // Loading State
        function showLoading(isLoading) {
            const loadingElement = document.getElementById('loading');
            loadingElement.classList.toggle('hidden', !isLoading);
        }
        
        // Event Listeners
        document.getElementById('signUpButton').addEventListener('click', signUp);
        document.getElementById('loginButton').addEventListener('click', login);
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
        document.getElementById('upload-btn').addEventListener('click', uploadFile);
        document.getElementById('resetPasswordButton').addEventListener('click', resetPassword);
        
        document.addEventListener('DOMContentLoaded', () => {
            const user = loadAuthState();
            if (user) {
                showUserInfo(user);
                loadMoodDiaryFromFirestore();
            } else {
                showUserInfo(null);
            }
        });
});