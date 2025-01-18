import { config } from './config.js';
import { fonts } from './fonts.js';

const audioFileInput = document.getElementById('audioFile');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const playPauseButton = document.getElementById('playPauseButton');
const volumeSlider = document.getElementById('volumeSlider');
const radiusSlider = document.getElementById('radiusSlider');
const rotationSpeedSlider = document.getElementById('rotationSpeedSlider');
const showTrackNameCheckbox = document.getElementById('showTrackName');
const fontSelector = document.getElementById('fontSelector');
const defaultConfigButton = document.getElementById('defaultConfigButton');
const resetPageButton = document.getElementById('resetPageButton');
const hideSettings = document.getElementById('hideSettings');
const settings = document.getElementById('settings');
const showSettings = document.getElementById('showSettings');

hideSettings.addEventListener('click', () => {
    hideSettings.style.display = 'none';
    settings.style.display = 'none';
})

showSettings.addEventListener('click', () => {
    hideSettings.style.display = 'block';
    settings.style.display = 'grid';
})

let audioContext;
let source;
let analyser;
let gainNode;
let isPlaying = true;
let smoothedDataArray = [];
let baseRadius = config.controls.initialRadius;
let targetRadius = baseRadius;
let radiusShrinkEndTime = 0;
let rotationAngle = 0;
let rotationSpeed = config.controls.initialRotationSpeed;
let lastSharpTurnTime = 0;
let nextSharpTurnInterval = getRandomInterval();
let nextSharpTurnAngle = getRandomAngle();
let currentLineWidth = config.canvas.lineWidthMin;
let targetLineWidth = config.canvas.lineWidthMin;
let lastLineWidthChangeTime = performance.now();
let nextLineWidthInterval = getRandomLineWidthInterval();
let alpha = 0.1;
let increasing = true;
let trackName = 'No Track Loaded';
let currentFont = '16px Courier New';

volumeSlider.value = config.controls.initialVolume;
radiusSlider.value = config.controls.initialRadius;
rotationSpeedSlider.value = config.controls.initialRotationSpeed;
canvas.width = config.canvas.width;
canvas.height = config.canvas.height;

function loadAudio(file) {
    trackName = file.name.replace(/\.[^/.]+$/, "");
    if (audioContext) {
        audioContext.close();
    }
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = function (e) {
        audioContext.decodeAudioData(e.target.result, function (buffer) {
            if (source) source.disconnect();
            source = audioContext.createBufferSource();
            source.buffer = buffer;

            source.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioContext.destination);

            source.start();
        });
    };
    reader.readAsArrayBuffer(file);
}

audioFileInput.addEventListener('change', function (event) {
    const files = event.target.files;
    if (files.length > 0) {
        updateAudioList(files);
        loadAudio(files[0]); 
    }
});

defaultConfigButton.addEventListener('click', () => {
    volumeSlider.value = config.controls.initialVolume;
    radiusSlider.value = config.controls.initialRadius;
    rotationSpeedSlider.value = config.controls.initialRotationSpeed;

    showTrackNameCheckbox.checked = true;

    fontSelector.value = `16px ${fonts[0]}`;
    currentFont = fontSelector.value;

    if (gainNode) {
        gainNode.gain.value = config.controls.initialVolume;
    }
    baseRadius = config.controls.initialRadius;
    rotationSpeed = config.controls.initialRotationSpeed;
});

fonts.forEach(font => {
    const option = document.createElement('option');
    option.value = `16px ${font}`;
    option.textContent = font;
    fontSelector.appendChild(option);
});

fontSelector.addEventListener('change', (event) => {
    currentFont = event.target.value;
});

function resetPage() {
    location.reload();
}

resetPageButton.addEventListener('click', resetPage);

function animateBackgroundAlpha() {
    if (increasing) {
        alpha += 0.01;
        if (alpha >= 1) {
            alpha = 1;
            increasing = false;
        }
    } else {
        alpha -= 0.01;
        if (alpha <= 0.1) {
            alpha = 0.1;
            increasing = true;
        }
    }

    config.canvas.backgroundColor = `rgba(0, 0, 0, ${alpha})`;

    requestAnimationFrame(animateBackgroundAlpha);
}

animateBackgroundAlpha();

function getRandomLineWidth() {
    return Math.random() * (config.canvas.lineWidthMax - config.canvas.lineWidthMin) + config.canvas.lineWidthMin;
}

function getRandomLineWidthInterval() {
    return Math.random() * (config.canvas.lineWidthIntervalMax - config.canvas.lineWidthIntervalMin) + config.canvas.lineWidthIntervalMin;
}

function getRandomAngle() {
    return Math.random() * (config.rotation.maxSharpTurnAngle - config.rotation.minSharpTurnAngle) + config.rotation.minSharpTurnAngle;
}

function getRandomInterval() {
    return Math.random() * (config.rotation.maxSharpTurnInterval - config.rotation.minSharpTurnInterval) + config.rotation.minSharpTurnInterval;
}

radiusSlider.addEventListener('input', (event) => {
    baseRadius = Number(event.target.value);
    targetRadius = baseRadius;
});

rotationSpeedSlider.addEventListener('input', (event) => {
    rotationSpeed = Number(event.target.value);
});

audioFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    trackName = file.name.replace(/\.[^/.]+$/, "");
    if (audioContext) {
        audioContext.close();
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = function(e) {
        audioContext.decodeAudioData(e.target.result, function(buffer) {
            source = audioContext.createBufferSource();
            source.buffer = buffer;

            analyser = audioContext.createAnalyser();
            analyser.fftSize = config.audio.fftSize;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            smoothedDataArray = new Float32Array(dataArray.length);

            gainNode = audioContext.createGain();

            source.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioContext.destination);

            source.start();

            function draw() {
                ctx.fillStyle = config.canvas.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                analyser.getByteTimeDomainData(dataArray);

                let averageVolume = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const volume = Math.abs(dataArray[i] - 128) / 128;
                    averageVolume += volume;

                    if (volume < config.audio.volumeThreshold) {
                        smoothedDataArray[i] += (dataArray[i] - smoothedDataArray[i]) * config.audio.smoothing;
                    } else {
                        smoothedDataArray[i] = dataArray[i];
                    }
                }
                averageVolume /= dataArray.length;

                const currentTime = performance.now();

                if (averageVolume > config.audio.dbThreshold && currentTime > radiusShrinkEndTime) {
                    targetRadius = baseRadius * config.audio.radiusShrinkFactor;
                    radiusShrinkEndTime = currentTime + config.audio.radiusShrinkDuration;
                }

                if (currentTime > radiusShrinkEndTime) {
                    targetRadius += (baseRadius - targetRadius) * config.audio.smoothing;
                }

                baseRadius = targetRadius;

                if (currentTime - lastLineWidthChangeTime > nextLineWidthInterval) {
                    targetLineWidth = getRandomLineWidth();
                    lastLineWidthChangeTime = currentTime;
                    nextLineWidthInterval = getRandomLineWidthInterval();
                }

                currentLineWidth += (targetLineWidth - currentLineWidth) * config.canvas.lineWidthChangeSpeed;

                if (currentTime - lastSharpTurnTime > nextSharpTurnInterval) {
                    rotationAngle += nextSharpTurnAngle;
                    lastSharpTurnTime = currentTime;
                    nextSharpTurnInterval = getRandomInterval();
                    nextSharpTurnAngle = getRandomAngle();
                }
                rotationAngle += rotationSpeed;

                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotationAngle);

                const gradientStops = averageVolume > config.audio.volumeThreshold
                    ? config.canvas.highVolumeGradientStops
                    : config.canvas.circleGradientStops;

                const gradient = ctx.createRadialGradient(0, 0, baseRadius, 0, 0, baseRadius + 100);
                gradientStops.forEach(stop => gradient.addColorStop(stop.offset, stop.color));

                ctx.beginPath();
                const totalPoints = smoothedDataArray.length;
                for (let i = 0; i < totalPoints; i++) {
                    const angle = (i / totalPoints) * 2 * Math.PI;
                    const radius =
                        baseRadius +
                        (averageVolume > config.audio.volumeThreshold ? averageVolume * 100 : 0) +
                        (smoothedDataArray[i] / 128.0) * (canvas.height / 6);
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.closePath();
                ctx.strokeStyle = gradient;
                ctx.lineWidth = currentLineWidth;
                ctx.stroke();
                ctx.restore();

                if (showTrackNameCheckbox.checked) {
                    ctx.fillStyle = config.text.color;
                    ctx.font = currentFont;
                    ctx.textAlign = config.text.align;

                    const textX = config.text.position.x === 'center' ? canvas.width / 2 : 0;
                    const textY = config.text.position.y === 'bottom' 
                        ? canvas.height - config.text.offsetY 
                        : config.text.offsetY;

                    ctx.fillText(trackName, textX, textY);
                }

                requestAnimationFrame(draw);
            }

            draw();
        });
    };
    reader.readAsArrayBuffer(file);
});

playPauseButton.addEventListener('click', () => {
    if (source) {
        if (isPlaying) {
            audioContext.suspend();
            playPauseButton.textContent = 'Play';
        } else {
            audioContext.resume();
            playPauseButton.textContent = 'Pause';
        }
        isPlaying = !isPlaying;
    }
});

volumeSlider.addEventListener('input', (event) => {
    if (gainNode) {
        gainNode.gain.value = event.target.value;
    }
});