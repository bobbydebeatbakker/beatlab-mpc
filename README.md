# BEATLAB — mobile-first sampler

A free browser-based sampler project built with HTML, CSS, JavaScript and the Web Audio API. No native app or paid IDE required.

## Run it on Android
1. Extract `beatlab-project.zip` using a file manager that can open ZIP files.
2. Open `index.html` in Chrome. Some Android file managers block JavaScript from `file://`; if that happens, use a free static host such as GitHub Pages or Netlify Drop, or edit/test with an Android code editor.
3. Tap **Import audio** and choose a WAV or MP3 file.
4. Tap pads to preview. Use the chopper sliders or Auto-chop 16.

## Project structure
- `index.html` — app structure and accessible controls
- `src/styles.css` — mobile-first dark MPC-inspired interface
- `src/app.js` — audio engine, sample loading/chopping, pads, patterns, sequencer, EQ and reverb
- `manifest.webmanifest` — installable web app metadata
- `sw.js` — basic offline shell cache (requires HTTPS or localhost)

## First development milestone
Keep audio and sequencing logic in `src/app.js`; do not put all features back into one inline script. This starter supports one selected EQ band (frequency 0–20 kHz with gain), a simple reverb-size control, 16 pads, 16-step patterns and equal 16-way chopping.

## Current limitations
- Pattern playback uses browser timers, so timing is a prototype rather than sample-accurate scheduling.
- Browser support for MP3/WAV decoding depends on the browser/device.
- Local file access and service workers differ by browser. Installability/offline caching requires serving over HTTPS.
- This is a web app, not a native Android application.
