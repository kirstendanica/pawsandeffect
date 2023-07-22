let moodChart;

document.getElementById('upload-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('input');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const resultSection = document.getElementById('result-section');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    resultSection.classList.add('hidden');

    if (fileInput.files.length === 0) {
        displayError('No file selected. Please select an image or video to upload.');
        loading.classList.add('hidden');
        return;
    }

    const file = fileInput.files[0];
    if (file.type.startsWith('image/')) {
        processImageFile(file);
    } else if (file.type.startsWith('video/')) {
        processVideoFile(file);
    } else {
        displayError('Unsupported file type. Please upload an image or video.');
        loading.classList.add('hidden');
    }
});

async function processImageFile(file) {
    try {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            try {
                const mood = await detectMood(img);
                displayResult(mood);
            } catch (err) {
                displayError('Error processing the image. Please try again.');
            }
        };
    } catch (error) {
        displayError('Error loading the image file.');
    }
}

async function processVideoFile(file) {
    try {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.onloadeddata = async () => {
            try {
                video.currentTime = video.duration / 2; 
            } catch (err) {
                displayError('Error processing the video file.');
            }
        };
        video.onseeked = async () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const img = document.createElement('img');
                img.src = canvas.toDataURL();
                img.onload = async () => {
                    try {
                        const mood = await detectMood(img);
                        displayResult(mood);
                    } catch (err) {
                        displayError('Error processing the video frame.');
                    }
                };
            } catch (error) {
                displayError('Error capturing frame from video.');
            }
        };
    } catch (error) {
        displayError('Error loading the video file.');
    }
}

async function detectMood(img) {
    try {
        const randomMood = ['happy', 'sad', 'anxious', 'relaxed'][Math.floor(Math.random() * 4)];
        return randomMood;
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
            'Check for any changes in your pet’s environment that might be causing stress.'
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
    return tips[mood][Math.floor(Math.random() * tips[mood].length)];
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

window.onload = () => {
    loadMoodDiary();
    initializeMoodChart();
};

function initializeMoodChart() {
    const ctx = document.getElementById('mood-chart').getContext('2d');
    moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Dates will go here
            datasets: [{
                label: 'Pet Mood Over Time',
                data: [], // Moods will go here
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
