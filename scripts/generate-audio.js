const fs = require('fs');
const path = require('path');

function createWavBuffer(sampleRate, durationSec, generateSample) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const totalSamples = Math.floor(sampleRate * durationSec);
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // "data" subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.max(-1, Math.min(1, generateSample(t, i, totalSamples)));
    const intSample = Math.round(sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

// 1. Messenger chime (double pop)
function generateMessengerWav() {
  const sampleRate = 44100;
  const duration = 0.4; // 400ms

  return createWavBuffer(sampleRate, duration, (t) => {
    let s = 0;
    // Pop 1: 0 to 0.15s (1318Hz -> 1567Hz)
    if (t >= 0 && t < 0.15) {
      const p = t / 0.15;
      const freq = 1318 + p * (1568 - 1318);
      const env = Math.exp(-t * 25);
      s += Math.sin(2 * Math.PI * freq * t) * env * 0.7;
    }
    // Pop 2: 0.07 to 0.35s (1046Hz -> 1318Hz)
    if (t >= 0.07 && t < 0.35) {
      const dt = t - 0.07;
      const p = dt / 0.28;
      const freq = 1046 + p * (1318 - 1046);
      const env = Math.exp(-dt * 20);
      s += Math.sin(2 * Math.PI * freq * t) * env * 0.6;
    }
    return s;
  });
}

// 2. Alarm ringing chime (6 seconds pulsing alarm sequence)
function generateAlarmWav() {
  const sampleRate = 44100;
  const duration = 6.0; // 6 seconds

  return createWavBuffer(sampleRate, duration, (t) => {
    let s = 0;
    const cycle = t % 0.6; // Repeat every 600ms
    if (cycle < 0.45) {
      // High chime tone pair
      const p = cycle / 0.45;
      const freq1 = 1318 + Math.sin(p * Math.PI * 4) * 150;
      const env1 = Math.exp(-cycle * 12);
      s += Math.sin(2 * Math.PI * freq1 * t) * env1 * 0.6;

      if (cycle > 0.08) {
        const dt = cycle - 0.08;
        const freq2 = 1760;
        const env2 = Math.exp(-dt * 15);
        s += Math.sin(2 * Math.PI * freq2 * t) * env2 * 0.5;
      }
    }
    return s;
  });
}

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'messenger.wav'), generateMessengerWav());
fs.writeFileSync(path.join(publicDir, 'alarm.wav'), generateAlarmWav());
console.log('Audio files messenger.wav and alarm.wav generated in /public');
