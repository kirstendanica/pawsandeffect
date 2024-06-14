document.getElementById('upload-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('input');
    if (fileInput.files.length === 0) {
        alert('Please select a file to upload.');
        return;
    }
    const file = fileInput.files[0];
    // Process the file (image or video) to detect the pet's mood
    detectMood(file);
});

/** 
 * Simulates mood detection
 * TODO: Replace with actual AI model output
 **/

function detectMood(file) {
    // Function for handling the AI model for mood detection
    const simulatedMood = 'happy'; // To be replaced with actual AI model output
    displayResult(simulatedMood);
}

function displayResult(mood) {
    document.getElementById('mood-result').innerText = mood;
    document.getElementById('happiness-tips').innerText = getHappinessTips(mood);
    addToMoodDiary(mood);
    document.getElementById('result-section').classList.remove('hidden');
}

function getHappinessTips(mood) {
    const tips = {
        happy: 'You keep doing what you\'re doing... your pet is happy!',
        sad: 'Try spending more time + TLC with your pet.',
        anxious: 'Create a calm environment and comfort your pet.',
        relaxed: 'Your pet is in total relaxation mode. Maintain some distance and let them enjoy it.'
    };
    return tips[mood];
}

function addToMoodDiary(mood) {
    const moodDiary = document.getElementById('mood-diary');
    const newEntry = document.createElement('li');
    const date = new Date().toLocaleString();
    newEntry.innerText = `${date}: ${mood}`;
    moodDiary.appendChild(newEntry);
}
