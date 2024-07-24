require('dotenv').config();
let model;
let moodChart;
let darkMode = localStorage.getItem('darkMode') === 'enabled';
let currentUser = null;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);

async function loadModel() {
    try {
        model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
        const layer = model.getLayer('conv_pw_13_relu');
        console.log('Model loaded successfully');
        return tf.model({ inputs: model.inputs, outputs: layer.output });
    } catch (error) {
        console.error('Error loading model:', error);
        throw new Error('Failed to load the mood detection model.');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        model = await loadModel();
        document.getElementById('upload-btn').disabled = false;
    } catch (error) {
        displayError('Failed to load the mood detection model. Please refresh the page and try again.');
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('logout-btn').classList.remove('hidden');
            document.getElementById('user-info').classList.remove('hidden');
            loadMoodDiary();
        } else {
            currentUser = null;
            document.getElementById('user-email').textContent = '';
            document.getElementById('auth-section').classList.remove('hidden');
            document.getElementById('logout-btn').classList.add('hidden');
            document.getElementById('user-info').classList.add('hidden');
            clearMoodDiary();
        }
    });

    document.getElementById('password').addEventListener('input', checkPasswordStrength);
});

function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthMeter = document.getElementById('password-strength');
    const strength = calculatePasswordStrength(password);
    strengthMeter.textContent = `Password strength: ${strength}`;
}

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    switch (strength) {
        case 0: case 1: return 'Weak';
        case 2: case 3: return 'Medium';
        case 4: case 5: return 'Strong';
        default: return 'Unknown';
    }
}

function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            userCredential.user.sendEmailVerification();
            displayMessage('Verification email sent. Please check your inbox.');
        })
        .catch((error) => displayError(error.message));
}

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
        .catch((error) => displayError(error.message));
}

function logout() {
    firebase.auth().signOut()
        .catch((error) => displayError(error.message));
}

function resetPassword() {
    const email = document.getElementById('email').value;
    if (!email) {
        displayError('Please enter your email address.');
        return;
    }
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => displayMessage('Password reset email sent. Please check your inbox.'))
        .catch((error) => displayError(error.message));
}

document.getElementById('upload-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const resultSection = document.getElementById('result-section');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    resultSection.classList.add('hidden');

    if (fileInput.files.length === 0) {
        displayError('Please select an image or video to upload.');
        return;
    }

    const file = fileInput.files[0];
    try {
        let img;
        if (file.type.startsWith('image/')) {
            img = await processImageFile(file);
        } else if (file.type.startsWith('video/')) {
            img = await processVideoFile(file);
        } else {
            throw new Error('Unsupported file type. Please upload an image or video.');
        }
        const mood = await detectMood(img);
        displayResult(mood);
    } catch (err) {
        displayError(err.message);
    } finally {
        loading.classList.add('hidden');
    }
});

async function processImageFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

async function processVideoFile(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.onloadeddata = () => {
            video.currentTime = video.duration / 2;
        };
        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to create image from video frame'));
                img.src = canvas.toDataURL();
            } catch (error) {
                reject(new Error('Failed to capture frame from video'));
            }
        };
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = URL.createObjectURL(file);
    });
}

async function detectMood(img) {
    try {
        const tensor = tf.browser.fromPixels(img)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .expandDims();
        
        const result = await model.predict(tensor).data();
        console.log('Model prediction result:', result);
        const mood = interpretResult(result);
        console.log('Detected mood:', mood);
        const intensity = document.getElementById('mood-intensity').value;
        return `${mood} (Intensity: ${intensity})`;
    } catch (error) {
        console.error('Error detecting mood:', error);
        throw new Error('Error detecting mood.');
    }
}

function interpretResult(result) {
    console.log('Interpreting result:', result);
    if (Array.isArray(result) && result.length > 0 && !isNaN(result[0])) {
        const moodIndex = result.indexOf(Math.max(...result));
        const moods = ['happy', 'sad', 'anxious', 'relaxed'];
        console.log('Mood index:', moodIndex, 'Moods:', moods);
        return moods[moodIndex] || 'unknown';
    } else {
        console.error('Invalid result format:', result);
        return 'unknown';
    }
}

function displayResult(mood) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('mood-result').innerText = mood;
    document.getElementById('happiness-tips').innerText = getHappinessTips(mood);
    addToMoodDiary(mood);
    updateMoodChart(mood);
    document.getElementById('result-section').classList.remove('hidden');
}

function getHappinessTips(mood) {
    const tips = {
        happy: [
            'Keep doing what you\'re doing! Your pet is happy.',
            'Ensure regular playtime and exercise.',
            'Maintain a healthy diet and hydration.'
        ],
        sad: [
            'Try spending more time playing with your pet.',
            'Ensure your pet has a comfortable and cozy space.',
            'Check for any changes in your pet\'s environment that might be causing stress.'
        ],
        anxious: [
            'Create a calm environment and comfort your pet.',
            'Use soothing music or white noise to help your pet relax.',
            'Consider using calming products like pheromone diffusers.'
        ],
        relaxed: [
            'Your pet is relaxed. Maintain a routine to keep them happy.',
            'Provide plenty of soft bedding and a quiet space.',
            'Keep up with regular health check-ups to ensure continued well-being.'
        ]
    };
    const moodKey = mood.split(' ')[0].toLowerCase();
    console.log('Mood key:', moodKey);
    if (!tips[moodKey]) {
        console.log('Unknown mood:', moodKey);
        return 'Unable to provide tips for this mood.';
    }
    return tips[moodKey][Math.floor(Math.random() * tips[moodKey].length)];
}

function addToMoodDiary(mood) {
    if (!currentUser) return;

    const date = new Date().toISOString();
    firebase.firestore().collection('moodDiary')
        .doc(currentUser.uid)
        .collection('entries')
        .add({
            date: date,
            mood: mood
        })
        .then(() => {
            loadMoodDiary();
        })
        .catch((error) => {
            console.error("Error adding document: ", error);
        });
}

function loadMoodDiary() {
    if (!currentUser) return;

    const moodDiaryList = document.getElementById('mood-diary');
    moodDiaryList.innerHTML = '';

    firebase.firestore().collection('moodDiary')
        .doc(currentUser.uid)
        .collection('entries')
        .orderBy('date', 'desc')
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const entry = doc.data();
                const newEntry = document.createElement('li');
                newEntry.innerHTML = `
                    ${new Date(entry.date).toLocaleString()}: ${entry.mood}
                    <button onclick="deleteMoodEntry('${doc.id}')">Delete</button>
                `;
                moodDiaryList.appendChild(newEntry);
            });
            updateMoodChart();
        })
        .catch((error) => {
            console.error("Error loading mood diary: ", error);
        });
}

function deleteMoodEntry(entryId) {
    if (!currentUser) return;

    firebase.firestore().collection('moodDiary')
        .doc(currentUser.uid)
        .collection('entries')
        .doc(entryId)
        .delete()
        .then(() => {
            displayMessage('Mood entry deleted successfully');
            loadMoodDiary();
        })
        .catch((error) => {
            console.error("Error deleting mood entry: ", error);
            displayError('Failed to delete mood entry');
        });
}

function clearMoodDiary() {
    document.getElementById('mood-diary').innerHTML = '';
    if (moodChart) {
        moodChart.data.labels = [];
        moodChart.data.datasets[0].data = [];
        moodChart.update();
    }
}

function displayError(message) {
    document.getElementById('loading').classList.add('hidden');
    const error = document.getElementById('error');
    error.innerText = message;
    error.classList.remove('hidden');
}

function displayMessage(message) {
    const messageElement = document.getElementById('message');
    messageElement.innerText = message;
    messageElement.classList.remove('hidden');
    setTimeout(() => {
        messageElement.classList.add('hidden');
    }, 5000);
}

function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode ? 'enabled' : 'disabled');
}

function saveMoodIntensity(intensity) {
    localStorage.setItem('moodIntensity', intensity);
}

function loadMoodIntensity() {
    return localStorage.getItem('moodIntensity') || 5;
}

window.onload = () => {
    initializeMoodChart();
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
    document.getElementById('mood-intensity').value = loadMoodIntensity();
    document.getElementById('mood-intensity').addEventListener('change', (e) => saveMoodIntensity(e.target.value));
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
};

function initializeMoodChart() {
    const ctx = document.getElementById('mood-chart').getContext('2d');
    moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pet Mood Over Time',
                data: [],
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateMoodChart() {
    if (!currentUser) return;

    firebase.firestore().collection('moodDiary')
        .doc(currentUser.uid)
        .collection('entries')
        .orderBy('date', 'asc')
        .get()
        .then((querySnapshot) => {
            const labels = [];
            const data = [];
            querySnapshot.forEach((doc) => {
                const entry = doc.data();
                labels.push(new Date(entry.date));
                data.push(entry.mood);
            });

            moodChart.data.labels = labels;
            moodChart.data.datasets[0].data = data;
            moodChart.update();
        })
        .catch((error) => {
            console.error("Error updating mood chart: ", error);
        });
}