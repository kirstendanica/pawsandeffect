document.getElementById('upload-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('input');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const resultSection = document.getElementById('result-section');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    resultSection.classList.add('hidden');

    if (fileInput.files.length === 0) {
        alert('Please select a file to upload.');
        loading.classList.add('hidden');
        return;
    }

    const file = fileInput.files[0];
    if (file.type.startsWith('image/')) {
        processImageFile(file);
    } else if (file.type.startsWith('video/')) {
        processVideoFile(file);
    } else {
        alert('Unsupported file type. Please upload an image or video.');
        loading.classList.add('hidden');
    }
});

async function processImageFile(file) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
        const mood = await detectMood(img);
        displayResult(mood);
    };
}

async function processVideoFile(file) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.onloadeddata = async () => {
        video.currentTime = video.duration / 2; // Capture a frame from the middle of the video
    };
    video.onseeked = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = document.createElement('img');
        img.src = canvas.toDataURL();
        img.onload = async () => {
            const mood = await detectMood(img);
            displayResult(mood);
        };
    };
}

async function detectMood(img) {
    try {
        // Placeholder: Use simple analysis or a pre-trained model for better accuracy
        const randomMood = ['happy', 'sad', 'anxious', 'relaxed'][Math.floor(Math.random() * 4)];
        return randomMood;
    } catch (error) {
        displayError('Error detecting mood. Please try again.');
    }
}

function displayResult(mood) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('mood-result').innerText = mood;
    document.getElementById('happiness-tips').innerText = getHappinessTips(mood);
    addToMoodDiary(mood);
    document.getElementById('result-section').classList.remove('hidden');
}

function getHappinessTips(mood) {
    const tips = {
        happy: 'Keep doing what you\'re doing! Your pet is happy.',
        sad: 'Try spending more time playing with your pet.',
        anxious: 'Create a calm environment and comfort your pet.',
        relaxed: 'Your pet is relaxed. Maintain a routine to keep them happy.'
    };
    return tips[mood];
}

function addToMoodDiary(mood) {
    const moodDiary = document.getElementById('mood-diary');
    const newEntry = document.createElement('li');
    const date = new Date().toLocaleString();
    newEntry.innerText = `${date}: ${mood}`;
    moodDiary.appendChild(newEntry);

    saveMoodDiary(mood, date);
}

function saveMoodDiary(mood, date) {
    let moodDiary = JSON.parse(localStorage.getItem('moodDiary')) || [];
    moodDiary.push({ date, mood });
    localStorage.setItem('moodDiary', JSON.stringify(moodDiary));
}

function loadMoodDiary() {
    const moodDiary = JSON.parse(localStorage.getItem('moodDiary')) || [];
    const moodDiaryList = document.getElementById('mood-diary');
    moodDiary.forEach(entry => {
        const newEntry = document.createElement('li');
        newEntry.innerText = `${entry.date}: ${entry.mood}`;
        moodDiaryList.appendChild(newEntry);
    });
}

function displayError(message) {
    document.getElementById('loading').classList.add('hidden');
    const error = document.getElementById('error');
    error.innerText = message;
    error.classList.remove('hidden');
}

// Load the mood diary on page load
window.onload = loadMoodDiary;
