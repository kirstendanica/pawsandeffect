let moodChart;
let darkMode = localStorage.getItem('darkMode') === 'enabled';

document.getElementById('upload-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('input');
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
        const intensity = document.getElementById('mood-intensity').value;
        const moods = ['happy', 'sad', 'anxious', 'relaxed'];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        return `${randomMood} (Intensity: ${intensity})`;
    } catch (error) {
        throw new Error('Error detecting mood.');
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
    return tips[moodKey][Math.floor(Math.random() * tips[moodKey].length)];
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
    loadMoodDiary();
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

    const moodDiary = JSON.parse(localStorage.getItem('moodDiary')) || [];
    moodDiary.forEach(entry => {
        moodChart.data.labels.push(new Date(entry.date));
        moodChart.data.datasets[0].data.push(entry.mood);
    });
    moodChart.update();
}

function updateMoodChart(mood) {
    const date = new Date();
    moodChart.data.labels.push(date);
    moodChart.data.datasets[0].data.push(mood);
    moodChart.update();
}