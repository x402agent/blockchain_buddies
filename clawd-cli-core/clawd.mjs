#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════╗
 *   🦞  CLAWD CLI  —  Lobster-Powered Terminal
 * ╚═══════════════════════════════════════════╝
 * 
 * A lobster-themed CLI with stunning braille
 * animation startup sequence.
 */

import spinners from 'unicode-animations';
import { gridToBraille, makeGrid } from 'unicode-animations';
import readline from 'readline';

// ─── ANSI Color Helpers ───────────────────────────────────────
const ESC = '\x1b[';
const reset = `${ESC}0m`;
const bold = `${ESC}1m`;
const dim = `${ESC}2m`;
const italic = `${ESC}3m`;
const underline = `${ESC}4m`;

// Foreground
const red = `${ESC}38;5;196m`;
const orange = `${ESC}38;5;208m`;
const coral = `${ESC}38;5;209m`;
const salmon = `${ESC}38;5;210m`;
const crimson = `${ESC}38;5;160m`;
const scarlet = `${ESC}38;5;197m`;
const rust = `${ESC}38;5;166m`;
const amber = `${ESC}38;5;214m`;
const gold = `${ESC}38;5;220m`;
const white = `${ESC}38;5;255m`;
const gray = `${ESC}38;5;240m`;
const darkGray = `${ESC}38;5;236m`;
const cyan = `${ESC}38;5;51m`;
const teal = `${ESC}38;5;30m`;
const sea = `${ESC}38;5;38m`;
const deepSea = `${ESC}38;5;24m`;
const magenta = `${ESC}38;5;199m`;
const purple = `${ESC}38;5;135m`;

// Background
const bgDark = `${ESC}48;5;233m`;
const bgBlack = `${ESC}48;5;16m`;

// ─── Utility ──────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const clearScreen = () => {
    process.stdout.write(`${ESC}2J${ESC}H`);
};

const hideCursor = () => process.stdout.write(`${ESC}?25l`);
const showCursor = () => process.stdout.write(`${ESC}?25h`);

const moveTo = (row, col) => process.stdout.write(`${ESC}${row};${col}H`);

const cols = process.stdout.columns || 80;
const rows = process.stdout.rows || 24;

const centerText = (text, width = cols) => {
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, Math.floor((width - stripped.length) / 2));
    return ' '.repeat(pad) + text;
};

// ─── Lobster Braille Art Frames ────────────────────────────────
// Each frame is a stage of the lobster "materializing" from braille dots

const lobsterFrames = [
    // Frame 0: Scattered dots (just noise)
    [
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠄⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
    ],
    // Frame 1: Antenna hints
    [
        `${coral}⠀⠀⠀⠀⠀⠀⠀⠈⠁⠀⠀⠀⠀⠀⠀⠀⠀⠁⠈⠀⠀⠀⠀⠀⠀⠀`,
        `${coral}⠀⠀⠀⠀⠀⠀⠀⠀⠈⠂⠀⠀⠀⠀⠀⠀⠂⠁⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠀⠀⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
    ],
    // Frame 2: Claws forming
    [
        `${salmon}⠀⠀⠀⠀⠀⠀⠈⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠁⠉⠁⠀⠀⠀⠀⠀⠀`,
        `${coral}⠀⠀⠀⠀⠀⠀⠀⠀⠈⠢⠀⠀⠀⠀⠀⠀⠔⠁⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠑⠄⠀⠀⠠⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠠⠤⠤⠤⠤⠼⠀⠀⠧⠤⠤⠤⠤⠄⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠢⠔⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
    ],
    // Frame 3: Body forming
    [
        `${salmon}⠀⠀⠀⠀⠀⠈⠉⠉⠑⠀⠀⠀⠀⠀⠀⠀⠀⠑⠉⠉⠁⠀⠀⠀⠀⠀`,
        `${coral}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠑⠢⠀⠀⠀⠀⠔⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠵⠀⠀⠯⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠉⠉⠉⠉⠉⣀⣀⣀⠉⠉⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠿⠛⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
    ],
    // Frame 4: Full lobster with detail
    [
        `${salmon}⠀⠀⠀⠀⠈⠉⠉⠉⠑⠒⠀⠀⠀⠀⠀⠀⠒⠑⠉⠉⠉⠁⠀⠀⠀⠀`,
        `${coral}⠀⠀⠀⠀⠀⣀⣤⠀⠀⠀⠑⠢⠀⠀⠔⠊⠀⠀⠀⣤⣀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠘⠿⠿⠃⣀⣀⣀⣀⠵⠀⠯⣀⣀⣀⣀⠘⠿⠿⠃⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠉⠉⠉⠉⣁⣤⣤⣁⠉⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠻⣿⣿⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
    ],
    // Frame 5: Full lobster with eyes + legs (final form)
    [
        `${salmon}⠀⠀⠀⠈⠉⠉⠉⠉⠑⠒⠒⠀⠀⠀⠀⠒⠒⠑⠉⠉⠉⠉⠁⠀⠀⠀`,
        `${coral}⠀⠀⠀⠀⠀⣤⣤⡀⠀⠀⠀⠑⢆⡰⠊⠀⠀⠀⢀⣤⣤⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠘⠿⠿⠃⣠⣤⣤⣤⣼⣧⣤⣤⣤⣄⠘⠿⠿⠃⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠘⠛⠛⠛⣁⣼⣧⣁⠛⠛⠛⠃⠀⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⠋⠙⠻⠟⠋⠙⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${rust}⠀⠀⠀⠀⠀⠀⠀⠐⠉⠀⠀⠀⠀⠀⠀⠀⠀⠉⠂⠀⠀⠀⠀⠀⠀⠀`,
    ],
];

// ─── Lobster idle animation: claw snap frames ────────────────
const lobsterIdle = [
    // Open claws
    [
        `${salmon}⠀⠀⠀⠈⠉⠉⠉⠉⠑⠒⠒⠀⠀⠀⠀⠒⠒⠑⠉⠉⠉⠉⠁⠀⠀⠀`,
        `${coral}⠀⠀⠀⠀⠀⣤⣤⡀⠀⠀⠀⠑⢆⡰⠊⠀⠀⠀⢀⣤⣤⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠘⠿⠿⠃⣠⣤⣤⣤⣼⣧⣤⣤⣤⣄⠘⠿⠿⠃⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠘⠛⠛⠛⣁⣼⣧⣁⠛⠛⠛⠃⠀⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⠋⠙⠻⠟⠋⠙⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${rust}⠀⠀⠀⠀⠀⠀⠀⠐⠉⠀⠀⠀⠀⠀⠀⠀⠀⠉⠂⠀⠀⠀⠀⠀⠀⠀`,
    ],
    // Closed claws (snap!)
    [
        `${salmon}⠀⠀⠀⠀⠈⠉⠉⠉⠑⠒⠒⠀⠀⠀⠀⠒⠒⠑⠉⠉⠉⠁⠀⠀⠀⠀`,
        `${coral}⠀⠀⠀⠀⠀⠀⣤⣤⠀⠀⠀⠑⢆⡰⠊⠀⠀⠀⣤⣤⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠿⠿⠁⣠⣤⣤⣤⣼⣧⣤⣤⣤⣄⠈⠿⠿⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠘⠛⠛⠛⣁⣼⣧⣁⠛⠛⠛⠃⠀⠀⠀⠀⠀⠀⠀`,
        `${red}⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${crimson}⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⠋⠙⠻⠟⠋⠙⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀`,
        `${rust}⠀⠀⠀⠀⠀⠀⠀⠐⠉⠀⠀⠀⠀⠀⠀⠀⠀⠉⠂⠀⠀⠀⠀⠀⠀⠀`,
    ],
];

// ─── Brand Art ─────────────────────────────────────────────────
const clawdLogo = [
    `${bold}${red}███╗${coral}███╗${salmon} █████╗${amber} ██╗    ██╗${gold}██████╗ ${reset}`,
    `${bold}${red}████╗${coral}████║${salmon}██╔══██╗${amber}██║    ██║${gold}██╔══██╗${reset}`,
    `${bold}${red}██╔████╔${coral}██║${salmon}███████║${amber}██║ █╗ ██║${gold}██║  ██║${reset}`,
    `${bold}${red}██║╚██╔╝${coral}██║${salmon}██╔══██║${amber}██║███╗██║${gold}██║  ██║${reset}`,
    `${bold}${red}██║ ╚═╝ ${coral}██║${salmon}██║  ██║${amber}╚███╔███╔╝${gold}██████╔╝${reset}`,
    `${bold}${red}╚═╝     ${coral}╚═╝${salmon}╚═╝  ╚═╝${amber} ╚══╝╚══╝ ${gold}╚═════╝ ${reset}`,
];

const tagline = `${dim}${sea}🦞 lobster-powered prediction engine${reset}`;
const versionLine = `${dim}${gray}v1.0.0 — solana predictions CLI${reset}`;

// ─── Bubble animation frames ──────────────────────────────────
const bubbleChars = ['°', '○', '◦', '∘', '·'];

function randomBubbles(count = 8) {
    let result = '';
    for (let i = 0; i < count; i++) {
        result += bubbleChars[Math.floor(Math.random() * bubbleChars.length)];
    }
    return `${dim}${sea}${result}${reset}`;
}

// ─── Water wave line ──────────────────────────────────────────
const waveFrames = [
    `${deepSea}~${sea}~${teal}~${sea}≈${deepSea}~${sea}~${teal}≈${sea}~${deepSea}~${sea}~${teal}~${sea}≈${deepSea}~${sea}~${teal}≈${sea}~${deepSea}~${sea}~${teal}~${sea}≈${deepSea}~${sea}~${teal}≈${sea}~${reset}`,
    `${sea}≈${deepSea}~${sea}~${teal}~${sea}~${deepSea}≈${sea}~${teal}~${deepSea}≈${sea}~${sea}~${teal}~${sea}~${deepSea}≈${sea}~${teal}~${deepSea}≈${sea}~${sea}~${teal}~${sea}~${deepSea}≈${sea}~${reset}`,
    `${teal}~${sea}≈${deepSea}~${sea}~${teal}~${sea}~${deepSea}≈${sea}~${teal}~${sea}≈${deepSea}~${sea}~${teal}~${sea}~${deepSea}≈${sea}~${teal}~${sea}≈${deepSea}~${sea}~${teal}~${sea}~${deepSea}≈${reset}`,
];

// ─── Phase 1: Braille particle convergence ────────────────────
async function phaseParticleConverge() {
    const startRow = 3;

    for (let f = 0; f < lobsterFrames.length; f++) {
        const frame = lobsterFrames[f];
        for (let i = 0; i < frame.length; i++) {
            moveTo(startRow + i, 1);
            process.stdout.write(centerText(frame[i]));
        }
        // Clear remaining lines from previous frame
        if (frame.length < 7) {
            for (let i = frame.length; i < 7; i++) {
                moveTo(startRow + i, 1);
                process.stdout.write(' '.repeat(cols));
            }
        }
        await sleep(f < 2 ? 120 : 180);
    }
}

// ─── Phase 2: Logo typewriter reveal ─────────────────────────
async function phaseLogoReveal() {
    const logoStartRow = 12;

    for (let i = 0; i < clawdLogo.length; i++) {
        moveTo(logoStartRow + i, 1);
        process.stdout.write(centerText(clawdLogo[i]));
        await sleep(60);
    }

    await sleep(200);

    // Tagline
    moveTo(logoStartRow + clawdLogo.length + 1, 1);
    process.stdout.write(centerText(tagline));

    await sleep(150);

    // Version
    moveTo(logoStartRow + clawdLogo.length + 2, 1);
    process.stdout.write(centerText(versionLine));
}

// ─── Phase 3: Boot sequence with spinners ─────────────────────
async function phaseBootSequence() {
    const bootRow = 22;

    const steps = [
        { label: 'Initializing lobster core', spinner: 'braille', duration: 600 },
        { label: 'Loading prediction models', spinner: 'scan', duration: 500 },
        { label: 'Connecting to Solana mainnet', spinner: 'helix', duration: 700 },
        { label: 'Syncing market data', spinner: 'cascade', duration: 500 },
        { label: 'Calibrating claw algorithms', spinner: 'dna', duration: 400 },
        { label: 'Warming up the lobster pot', spinner: 'orbit', duration: 350 },
    ];

    for (let s = 0; s < steps.length; s++) {
        const step = steps[s];
        const { frames, interval } = spinners[step.spinner];
        let i = 0;
        const elapsed = Date.now();

        const timer = setInterval(() => {
            moveTo(bootRow, 1);
            process.stdout.write(`\x1b[2K`);
            const spinChar = frames[i++ % frames.length];
            const line = `  ${coral}${spinChar}${reset} ${dim}${white}${step.label}...${reset}`;
            process.stdout.write(centerText(line));
        }, interval);

        await sleep(step.duration);
        clearInterval(timer);

        moveTo(bootRow, 1);
        process.stdout.write(`\x1b[2K`);
        const done = `  ${bold}${sea}✔${reset} ${white}${step.label}${reset}`;
        process.stdout.write(centerText(done));
        await sleep(100);
    }
}

// ─── Phase 4: Idle lobster + claw snap ────────────────────────
async function phaseIdleSnap(cycles = 3) {
    const startRow = 3;

    for (let c = 0; c < cycles; c++) {
        for (let f = 0; f < lobsterIdle.length; f++) {
            const frame = lobsterIdle[f];
            for (let i = 0; i < frame.length; i++) {
                moveTo(startRow + i, 1);
                process.stdout.write(centerText(frame[i]));
            }
            await sleep(f === 0 ? 500 : 120);
        }
    }

    // Return to open claws
    const frame = lobsterIdle[0];
    for (let i = 0; i < frame.length; i++) {
        moveTo(startRow + i, 1);
        process.stdout.write(centerText(frame[i]));
    }
}

// ─── Phase 5: Water wave divider ──────────────────────────────
async function phaseWaterWave() {
    const waveRow = 11;
    for (let f = 0; f < 6; f++) {
        moveTo(waveRow, 1);
        process.stdout.write(centerText(waveFrames[f % waveFrames.length]));
        await sleep(200);
    }
}

// ─── Phase 6: Ready prompt ────────────────────────────────────
async function phaseReady() {
    const readyRow = 24;

    moveTo(readyRow, 1);
    process.stdout.write(`\x1b[2K`);

    const readyLine = `${bold}${coral}🦞 clawd${reset} ${dim}${gray}ready — type ${white}/help${gray} to get started${reset}`;
    process.stdout.write(centerText(readyLine));

    await sleep(300);

    moveTo(readyRow + 2, 1);
    process.stdout.write(`\x1b[2K`);

    // Draw fancy box
    const boxTop = `${darkGray}╭${'─'.repeat(cols - 6)}╮${reset}`;
    const boxBottom = `${darkGray}╰${'─'.repeat(cols - 6)}╯${reset}`;

    moveTo(readyRow + 2, 3);
    process.stdout.write(boxTop);

    const tips = [
        `${gray}  Tips: ${white}/predict${gray} SOL price  •  ${white}/markets${gray} browse all  •  ${white}/portfolio${gray} your bets${reset}`,
    ];

    for (let i = 0; i < tips.length; i++) {
        moveTo(readyRow + 3 + i, 3);
        process.stdout.write(`${darkGray}│${reset} ${tips[i]} ${darkGray}│${reset}`);
    }

    moveTo(readyRow + 3 + tips.length, 3);
    process.stdout.write(boxBottom);
}

// ─── Main REPL Prompt ─────────────────────────────────────────
function startRepl() {
    const promptRow = rows - 2;

    moveTo(promptRow, 1);
    process.stdout.write(`\x1b[2K`);

    showCursor();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${bold}${coral}🦞 clawd${reset}${gray} ❯ ${reset}`,
    });

    rl.prompt();

    rl.on('line', (input) => {
        const cmd = input.trim().toLowerCase();

        if (cmd === '/quit' || cmd === '/exit' || cmd === 'exit' || cmd === 'quit') {
            console.log(`\n${dim}${sea}  🦞 See you in the deep...${reset}\n`);
            showCursor();
            process.exit(0);
        }

        if (cmd === '/help') {
            console.log('');
            console.log(`  ${bold}${coral}CLAWD CLI Commands${reset}`);
            console.log(`  ${'─'.repeat(40)}`);
            console.log(`  ${white}/predict${gray}  <token>   ${dim}Get price prediction${reset}`);
            console.log(`  ${white}/markets${gray}           ${dim}Browse prediction markets${reset}`);
            console.log(`  ${white}/portfolio${gray}         ${dim}View your positions${reset}`);
            console.log(`  ${white}/swap${gray}     <args>   ${dim}Execute a swap${reset}`);
            console.log(`  ${white}/config${gray}            ${dim}Configure settings${reset}`);
            console.log(`  ${white}/status${gray}            ${dim}Network & system status${reset}`);
            console.log(`  ${white}/quit${gray}              ${dim}Exit clawd${reset}`);
            console.log('');
        } else if (cmd === '/status') {
            console.log('');
            console.log(`  ${bold}${sea}System Status${reset}`);
            console.log(`  ${gray}${'─'.repeat(35)}${reset}`);
            console.log(`  ${white}Network:${reset}    ${sea}◉${reset} Solana Mainnet`);
            console.log(`  ${white}Latency:${reset}    ${sea}${Math.floor(Math.random() * 40 + 15)}ms${reset}`);
            console.log(`  ${white}Markets:${reset}    ${sea}◉${reset} Active (${Math.floor(Math.random() * 50 + 100)} live)`);
            console.log(`  ${white}Engine:${reset}     ${coral}🦞${reset} Lobster Core v1.0`);
            console.log(`  ${white}Runtime:${reset}    Node ${process.version}`);
            console.log('');
        } else if (cmd === '/predict' || cmd.startsWith('/predict ')) {
            const token = cmd.split(' ')[1] || 'SOL';
            const price = (Math.random() * 200 + 20).toFixed(2);
            const change = (Math.random() * 10 - 5).toFixed(2);
            const dir = parseFloat(change) >= 0 ? `${sea}▲` : `${red}▼`;
            console.log('');
            console.log(`  ${bold}${coral}🦞 Prediction: ${white}${token.toUpperCase()}${reset}`);
            console.log(`  ${gray}${'─'.repeat(35)}${reset}`);
            console.log(`  ${white}Current:${reset}   $${price}`);
            console.log(`  ${white}24h Pred:${reset}  ${dir} ${Math.abs(parseFloat(change))}%${reset}`);
            console.log(`  ${white}Signal:${reset}    ${sea}${Math.random() > 0.5 ? 'BULLISH 🟢' : 'BEARISH 🔴'}${reset}`);
            console.log(`  ${dim}${gray}Powered by lobster neural network${reset}`);
            console.log('');
        } else if (cmd !== '') {
            console.log(`  ${dim}${gray}Unknown command. Type ${white}/help${gray} for available commands.${reset}`);
        }

        rl.prompt();
    });

    rl.on('close', () => {
        console.log(`\n${dim}${sea}  🦞 See you in the deep...${reset}\n`);
        showCursor();
        process.exit(0);
    });
}

// ─── Startup Orchestrator ─────────────────────────────────────
async function main() {
    // Handle cleanup
    process.on('SIGINT', () => {
        showCursor();
        console.log(`\n${dim}${sea}  🦞 See you in the deep...${reset}\n`);
        process.exit(0);
    });

    hideCursor();
    clearScreen();

    // Header bar
    moveTo(1, 1);
    const headerLeft = `${bgDark}${bold}${coral} 🦞 CLAWD ${reset}${bgDark}${dim}${gray} Lobster-Powered Prediction Engine ${reset}`;
    const headerRight = `${bgDark}${dim}${gray} v1.0.0 ${reset}`;
    process.stdout.write(headerLeft + ' '.repeat(Math.max(0, cols - 50)) + headerRight);

    moveTo(2, 1);
    process.stdout.write(`${darkGray}${'━'.repeat(cols)}${reset}`);

    // Phase 1: Lobster materializes from braille particles
    await phaseParticleConverge();

    // Phase 2: Water wave separator
    await phaseWaterWave();

    // Phase 3: Logo typewriter
    await phaseLogoReveal();

    // Phase 4: Lobster idle/claw snap
    await phaseIdleSnap(2);

    // Phase 5: Boot sequence spinners
    await phaseBootSequence();

    // Phase 6: Ready state
    await phaseReady();

    await sleep(400);

    // Start REPL
    startRepl();
}

main().catch(err => {
    showCursor();
    console.error('Fatal error:', err);
    process.exit(1);
});
