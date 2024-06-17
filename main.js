document.getElementById('uploadButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        alert('Please select a file to upload.');
        return;
    }
    const file = fileInput.files[0];
    processFile(file);
});

async function processFile(file) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
        const mood = await detectMood(img);
        displayResult(mood);
    };
}

async function detectMood(img) {
    // Load MobileNet model
    const model = await tf.loadGraphModel('https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/5/default/1', {fromTFHub: true});

    // Preprocess the image to match the input shape expected by the model
    const tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .expandDims()
        .div(tf.scalar(127.5))
        .sub(tf.scalar(1));

    // Make predictions
    const predictions = await model.predict(tensor).data();

    // Get the highest probability class
    const topPrediction = predictions.indexOf(Math.max(...predictions));

    // For simplicity, we'll map topPrediction to a mood (this is a placeholder and should be replaced with a more accurate mapping)
    const moodMap = {
        0: 'happy',
        1: 'sad',
        2: 'anxious',
        3: 'relaxed'
    };

    // Placeholder: Randomly assigning mood for now as actual model might need specific training
    const randomMood = ['happy', 'sad', 'anxious', 'relaxed'][Math.floor(Math.random() * 4)];

    return randomMood;
}

function displayResult(mood) {
    document.getElementById('moodResult').innerText = mood;
    document.getElementById('happinessTips').innerText = getHappinessTips(mood);
    addToMoodDiary(mood);
    document.getElementById('resultSection').classList.remove('hidden');
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
    const moodDiary = document.getElementById('moodDiary');
    const newEntry = document.createElement('li');
    const date = new Date().toLocaleString();
    newEntry.innerText = `${date}: ${mood}`;
    moodDiary.appendChild(newEntry);
}
