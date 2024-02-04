picoTitle("Clock"); // Title.

// Data and settings.
var colors = [255,255,255, 223,223,223, 191,191,191, 127,127,127, 63,63,63, 0,0,0]; // Count colors.

// Global variables.
var player = 2; // Player count.
var count = 0; // Time count.
var addition = 0; // Additional time count.
var bonus = 0; // Bonus time count.
var playing = -1; // Playing count.
var locked = false; // Locked menu.

const playerMax = 8; // Maximum player count.
const numberMax = 6; // Maximum number of digits.
const countMax = 999 * 60; // Maximum count.

// Update buttons.
async function appUpdate(c, a=0, b=0, p=0) {
	count = c > countMax ? countMax : c > 0 ? c : 0;
	addition = a > countMax ? countMax : a > 0 ? a : 0;
	bonus = b > 99 ? 99 : b; // Hourglass mode if b < 0.
	player = p > playerMax ? playerMax : p > 0 ? p : 2;

	picoLabel("minus", "x" + player);
	if (count > 0) {
		picoLabel("select", "" + picoDiv(count, 60));
	} else {
		picoLabel("select", "0");
	}
	if (bonus != 0) {
		picoLabel("plus", "+" + (bonus > 0 ? bonus : ""));
	} else {
		picoLabel("plus", "-" + (addition > 0 ? addition : ""));
	}

	playing = -2; // Replay.
}

// Action button.
async function appAction() {
}

// Select button.
async function appSelect(x) {

	if(locked) {

		// Low beep on press locked button.
		picoBeep(-1.2, 0.1);

	// Change player.
	} else if (x < 0) {

		if (x != 0) {
			appUpdate(count, addition, bonus, picoMod(player, playerMax) + 1);
		} else {
			appUpdate(count, addition, bonus, 2);
		}

		// High beep on press button.
		picoBeep(1.2, 0.1);

	// Change count.
	} else if (x == 0) {

		if (count <  5 * 60) {
			appUpdate(5 * 60, addition, bonus, player); // 5m
		} else if (count < 10 * 60) {
			appUpdate(10 * 60, addition, bonus, player); // 10m
		} else if (count < 15 * 60) {
			appUpdate(15 * 60, addition, bonus, player); // 15m
		} else if (count < 20 * 60) {
			appUpdate(20 * 60, addition, bonus, player); // 20m
		} else {
			appUpdate(0, addition, bonus, player);
		}

		// High beep on press button.
		picoBeep(1.2, 0.1);

	// Change option.
	} else {
		if (bonus == 0 && addition < 10) {
			appUpdate(count, 10, 0, player); // -10s additional time (Byoyomi)
		} else if (bonus == 0 && addition < 30) {
			appUpdate(count, 30, 0, player); // -30s additional time (Byoyomi)
		} else if (bonus == 0) {
			appUpdate(count, 0, -1, player); // +?s opposite time (Hourglass)
		} else if (bonus < 5) {
			appUpdate(count, 0, 5, player); // +5s bonus time (Fischer)
		} else if (bonus < 10) {
			appUpdate(count, 0, 10, player); // +10s bonus time (Fischer)
		} else {
			appUpdate(count, 0, 0, player);
		}

		// High beep on press button.
		picoBeep(1.2, 0.1);
	}
}

// Screen.
const screenMax = 2;
const screenWidth = 200, screenHeight = 50;

// Screen class.
Screen = class {
	constructor() {
		this.centerx = 0; // Center position X.
		this.centery = 0; // Center position Y.
		this.width = 200;
		this.height = 50;
	}
};
var screens = [];

// Player.
var playerCount = 2; // Player count.
var playerIndex = 0; // Current player index.
var playerCountMin2 = 2; // Player count for hourglass mode.

// Player class.
Player = class {
	constructor() {
		this.count = 0; // Time count.
		this.addition = 0; // Additional time count.
		this.bonus = 0; // Bonus time count.
		this.current = 0; // Current time count.
		this.consumed = 0; // Consumed time count.
		this.frames = []; // Sprite frames by current time.
		this.starting = false; // Start flag.
		this.number = 0; // Display count.
	}
};
var players = [];

// Clock.
const clockMax = playerMax + 1; // Maximum clock count.
//const numberMax = 6; // Maximum number of digits.
var clockCount = 2; // Clock count.
const clockScale = 6; // Clock scale.
const numberScale = 0.5; // Number scale.
const clockPosX = 50; // Clock position X on landscape mode.
const clockPosY = 50; // Clock position Y on portrait mode.
const clockGridX = 125; // Clock position grid base width for 3+ players.
const clockGridY = [-15, 15]; // Clock position grid base height for 3+ players.
const buttonWidth = numberWidth = 40;
const clockRects = [-7,-4,14,8, -5,-6,10,10]; // Clock base sprite.

// Clock class.
Clock = class {
	constructor() {
		this.scale = 1; // Sprite scale.
		this.angle = 0; // Sprite angle.
		this.centerx = 0; // Center position X.
		this.centery = 0; // Center position Y.
	}
};
var clocks = [];

// Playing states.
var waiting = 1; // Waiting state: 0=playing, 1=w82start, 2=w82restart.
var pausing = false; // Pausing on pressing.
var timeout = false; // Timeout flag.
var hourglass = false; // Hourglass mode.
var counting = false; // Counting up/down flag.
var holding = 0; // Holding count.

var startTime = 0; // Start time.
var landscape = false; // landscape mode.

// Load.
async function appLoad() {

	// Create screens.
	for (let j = 0; j < screenMax; j++) {
		screens[j] = new Screen();
	}

	// Create players.
	for (let j = 0; j < playerMax; j++) {
		players[j] = new Player();
	}

	// Create clocks.
	for (let k = 0; k < clockMax; k++) {
		clocks[k] = new Clock();
	}

	// Load query params.
	let value = picoStrings();
	if (value) {
		let numbers = picoNumbers();

		// Additional time mode. (Byoyomi)
		if (value.match(/a/i)) {
			appUpdate(numbers[0] * 60, numbers[1], 0, numbers[2]);
			locked = true;

		// Bonus time mode. (Fischer) / Hourglass mode.
		} else if (value.match(/b/i)) {
			appUpdate(numbers[0] * 60, 0, numbers[1] > 0 ? numbers[1] : -1, numbers[2]);
			locked = true;

		// Simple multi players mode. (Kiremake)
		} else if (value.match(/x/i)) {
			appUpdate(numbers[0] * 60, 0, 0, numbers[1]);
			locked = true;

		// Simple 2 players mode. (Kiremake)
		} else if (numbers[0] > 0) {
			appUpdate(numbers[0] * 60, 0, 0, 2);
			locked = true;

		// Default.
		} else {
			appUpdate(10 * 60, 0, 0, 2);
		}

	// Default.
	} else {
		appUpdate(10 * 60, 0, 0, 2);
	}

	// Load pallete data.
	picoColor(colors);
}

// Resize.
async function appResize() {
	landscape = picoWidescreen();

	// Reset layouts.
	// 1 Screen for solo player.
	if (playerCount <= 1) {
		screens[0].centerx = screens[1].centerx = 0;
		screens[0].centery = screens[1].centery = 0;
		screens[0].width  = screens[1].width  = 200;
		screens[0].height = screens[1].height = 50;

		// 1 Screen for solo player.
		for (let j = 0; j < 1; j++) {
			clocks[j].centerx = 0;
			clocks[j].centery = 0;
			clocks[j].scale = clockScale;
			clocks[j].angle = 0;
		}

	// 2 Screens for 2 players.
	} else {

		// Set sprite positions and scale for landscape mode.
		if (landscape) {
			screens[0].centerx = clockPosX;
			screens[0].centery = 0;
			screens[1].centerx = -clockPosX;
			screens[1].centery = 0;
			screens[0].width  = screens[1].width  = 50;
			screens[0].height = screens[1].height = 200;

		// Set sprite positions and scale for portrait mode.
		} else {
			screens[0].centerx = 0;
			screens[0].centery = clockPosY;
			screens[1].centerx = 0;
			screens[1].centery = -clockPosY;
			screens[0].width  = screens[1].width  = 200;
			screens[0].height = screens[1].height = 50;
		}

		// 2 Screens for 2 players.
		if (playerCount <= 2) {
			for (let j = 0; j < 2; j++) {
				clocks[j].centerx = 0;
				clocks[j].centery = 0;
				clocks[j].scale = clockScale;
				clocks[j].angle = 0;
			}

			// Upsidedown for portrait mode.
			if (!landscape) {
				clocks[1].angle = 180;
			}

		// 2 Screens for 3+ players.
		} else {
			clocks[0].centerx = 0;
			clocks[0].centery = 0;
			clocks[0].scale = clockScale;
			clocks[0].angle = 0;

			if (playerCount <= 4) {
				for (let j = 0; j < playerCount; j++) {
					clocks[j + 1].centerx = clockGridX * (j - playerCount/2 + 0.5) / (playerCount + 1);
					clocks[j + 1].centery = 0;
					clocks[j + 1].scale = clockScale / playerCount;
					clocks[j + 1].angle = 0;
				}
			} else {
				let playerCount2 = picoDiv(playerCount, 2);
				let playerCount1 = playerCount - playerCount2;
				for (let j = 0; j < playerCount1; j++) {
					clocks[j + 1].centerx = clockGridX * (j - playerCount1/2 + 0.5) / (playerCount1 + 1);
					clocks[j + 1].centery = clockGridY[0];
					clocks[j + 1].scale = clockScale / playerCount1;
					clocks[j + 1].angle = 0;
				}
				for (let j = playerCount1; j < playerCount; j++) {
					clocks[j + 1].centerx = clockGridX * (j - playerCount2/2 - playerCount1 + 0.5) / (playerCount2 + 1);
					clocks[j + 1].centery = clockGridY[1];
					clocks[j + 1].scale = clockScale / playerCount1;
					clocks[j + 1].angle = 0;
				}
			}
		}
	}

	picoFlush();
}

// Main.
async function appMain() {

	// Initialize.
	if (playing < 0) {

		// Reset playing states.
		waiting = 1;
		starting = 0;
		pausing = false;
		timeout = false;
		hourglass = bonus < 0;
		counting = false;

		// Reset player states.
		playerCount = player;
		playerIndex = -1;
		playerCountMin2 = playerCount > 2 ? playerCount : 2; // Minimum 2 players for hourglass mode.
		clockCount = playerCount <= 2 ? playerCount : playerCount + 1; // Add playing button on 3+ players mode.
		for (let j = 0; j < playerCountMin2; j++) {
			players[j].count = players[j].current = count;
			players[j].addition = addition;
			players[j].bonus = bonus;
			players[j].consumed = 0;
			players[j].starting = false;
		}

		appResize();

		// Reset playing count.
		playing = 1;
	}

	if (playing <= 1) {

		// Start clock.
		startTime = picoTime();
	}

	let currentTime = picoTime();
	let spendTime = currentTime - startTime;
	startTime = currentTime;

	// Update time count.
	if (!waiting && !pausing && !timeout) {
		players[playerIndex].consumed += spendTime / 1000; // Chessclock style.
		// players[playerIndex].consumed += picoDiv(spendTime, 1000); // Stopwatch style.

		// Main time count.
		if (players[playerIndex].count > 0) {

			// Update all reversed players count on hourglass mode.
			if (players[playerIndex].bonus < 0) {
				for (let j = 0; j < playerCountMin2; j++) {
					if (j != playerIndex) {
						players[j].current = players[j].count + players[playerIndex].consumed;
					}
				}
			}

			// Update main count.
			players[playerIndex].current = players[playerIndex].count - players[playerIndex].consumed;
			if (players[playerIndex].current <= 0) {

				// Start additional time.
				if (players[playerIndex].addition > 0) {

					// Adjust remained consumed count to avoid continuous beep.
					players[playerIndex].current = players[playerIndex].consumed = players[playerIndex].consumed - players[playerIndex].count;
					players[playerIndex].count = 0;

					// Restart.
					playing = 0; // No reset.

				// Time out.
				} else {
					players[playerIndex].current = players[playerIndex].count = players[playerIndex].consumed = 0;
					timeout = true;

					// Long beep on timeout.
					picoBeep(0, 4);
				}
			}

		// Additional time count.
		// (0 Additional time == Free time count)
		} else if (players[playerIndex].addition >= 0) {
			players[playerIndex].current = players[playerIndex].consumed > countMax ? countMax : players[playerIndex].consumed;

			// Time out.
			if (players[playerIndex].addition > 0 && players[playerIndex].current >= players[playerIndex].addition) {
				players[playerIndex].current = players[playerIndex].addition;
				timeout = true;

				// Long beep on timeout.
				picoBeep(0, 4);
			}
		}
	}

	// Beep timing.
	let counter = -1;
	if (!waiting && !pausing && !timeout && playerIndex >= 0) {

		// Starting count.
		if (players[playerIndex].starting) {
			console.log("Starting count.");

			players[playerIndex].starting = false;
			counting = false; // Reset flag to avoid continuous beep.

		// Count down on main time count.
		} else if (players[playerIndex].count > 0) {
			if (players[playerIndex].addition > 0) {
				counter = players[playerIndex].current + 60; // No sound for the last 60 seconds.
			} else {
				counter = players[playerIndex].current;
			}

		// Count up on additional time count.
		} else {
			if (players[playerIndex].addition <= 0) {
				counter = 1000*60 - players[playerIndex].current; // No sound for the last XX seconds.
			} else if (players[playerIndex].addition <= 5) {
				counter = players[playerIndex].addition - players[playerIndex].current + 5; // Change sound for the last 5 to 10 seconds.
			} else {
				counter = players[playerIndex].addition - players[playerIndex].current;
			}
		}
	}

	// Update counting cycle.
	if (counter >= 0) {
		if (picoMod(counter * 1000, 1000) < 500) {
			counting = true;

		// Beep on counting flag switched.
		} else if (counting) {

			// Long beep last 5 seconds.
			if (counter < 5) {
				console.log("Long beep last 5 seconds.");
				picoBeep(0, 0.5);

			// Beep last 10 seconds.
			} else if (counter < 10) {
				console.log("Beep last 10 seconds.");
				picoBeep(0, 0.1);

			// Beep every 10 seconds for the last 30 seconds.
			} else if (counter < 30 && !picoMod(counter + 1, 10)) {
				console.log("Beep every 10 seconds for the last 30 seconds.");
				picoBeep(0, 0.1);

			// Beep every 60 seconds.
			} else if (!picoMod(counter + 1, 60)) {
				console.log("Beep every 60 seconds.");
				picoBeep(0, 0.1);
			}
			counting = false;
		}
	}

	// Update player states.
	for (let j = 0; j < playerCount; j++) {

		// Show delay about 1 second for count down on main time count.
		let sec = "00"; // Second part.
		if (players[j].count > 0 && !(hourglass && j != playerIndex)) {
			let s = picoMod(players[j].current + 0.9999, 60); // Round up decimal to integer.
			sec = s < 10 ? "0" + s : s;
		} else if (players[j].current >= 1) {
			let s = picoMod(players[j].current, 60);
			sec = s < 10 ? "0" + s : s;
		}

		// Colon mark.
		let colon = ":";
		if (!waiting && !pausing && !timeout && j == playerIndex) {
			colon = counting ? " " : ":";
		}

		// Show delay about 1 second for count down on main time count.
		let min = "  "; // Minute part.
		if (players[j].count > 0) {
			let m = picoDiv(players[j].current + 0.9999, 60); // Round up decimal to integer.
			min = m < 10 ? "0" + m : m;
		} else if (players[j].current >= 60) {
			let m = picoDiv(players[j].current, 60);
			min = m < 10 ? " " + m : m;
		}

		players[j].number = min + colon + sec;
	}

	// Update angle by screen orientation.
	/*if (playerCount >= 2) {
		clocks[0].angle = 0;
		if (!landscape) {
			screens[0].centerx = 0;
			screens[0].centery = clockPosY;
			screens[1].centerx = 0;
			screens[1].centery = -clockPosY;
		} else {
			screens[0].centerx = -clockPosX;
			screens[0].centery = 0;
			screens[1].centerx = clockPosX;
			screens[1].centery = 0;
		}
	}*/

	// Update angle for hourglass mode.
	if (hourglass) {

		// For solo player.
		if (playerCount <= 1) {
			for (let k = 0; k < playerCountMin2; k++) {
				if (waiting != 1 && k != playerIndex) {
					clocks[k].angle = 180;
				} else {
					clocks[k].angle = 0;
				}
			}

		// For 2 players without portrait mode.
		} else if (playerCount <= 2 && landscape) {
			for (let k = 0; k < playerCountMin2; k++) {
				if (waiting != 1 && k != playerIndex) {
					clocks[k].angle = 180;
				} else {
					clocks[k].angle = 0;
				}
			}

		// For 3+ players.
		} else if (playerCount >= 3) {
			for (let k = 1; k < clockMax; k++) {
				if (k != playerIndex + 1) {
					clocks[k].angle = 180;
				} else {
					clocks[k].angle = 0;
				}
			}
		}
	}

	// Update button sprites.
	let p = playing >= 0 && playing < 6 ? 1 - 0.025 * (6 - playing) : 1;
	for (let k = 0; k < clockMax; k++) {

		// Switching clocks for 1-2 players.
		if (playerCount <= 2) {
			if (k < clockCount) {
				let x = clocks[k].centerx + screens[k].centerx;
				let y = clocks[k].centery + screens[k].centery;

				// Waiting.
				if (waiting) {
					if (waiting >= 2) { // Wait to restart.
						await picoRect(clockRects, 2, x, y, clocks[k].angle, clocks[k].scale * p);
					} else if (pausing && k == playerIndex) { // Just starting.
						await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
					} else if (playerIndex < 0) { // Waiting.
						await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
					} else { // Opposite player.
						await picoRect(clockRects, 3, x, y, clocks[k].angle, clocks[k].scale);
					}

				// Playing.
				} else {
					if (k == playerIndex) { // Playing.
						await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
					} else if (hourglass && playerCount <= 1) { // Reversed hourglass solo player.
						await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
					} else { // Opposite player.
						await picoRect(clockRects, 3, x, y, clocks[k].angle, clocks[k].scale);
					}
				}
			}

		// Cyclic clocks for 3+ playres.
		} else {
			if (k < clockCount) {
				let x = clocks[k].centerx + screens[k == 0 ? 0 : 1].centerx;
				let y = clocks[k].centery + screens[k == 0 ? 0 : 1].centery;

				// Waiting to start.
				if (waiting == 1) {
					if (k == 0) { // Playing.
						if (pausing) { // Just starting.
							await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
						} else { // Waiting.
							await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
						}
					} else { // Another players.
						await picoRect(clockRects, 3, x, y, clocks[k].angle, clocks[k].scale);
					}

				// Playing.
				} else {
					if (k == 0 || k == playerIndex + 1) { // Playing or target player.
						if (waiting >= 2) { // Wait to restart.
							await picoRect(clockRects, 2, x, y, clocks[k].angle, clocks[k].scale * p);
						} else {
							if (k == 0) { // Playing
								await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
							} else if (k == playerIndex + 1) { // Target player.
								await picoRect(clockRects, 0, x, y, clocks[k].angle, clocks[k].scale * p);
							}
						}
					} else { // Another players.
						await picoRect(clockRects, 3, x, y, clocks[k].angle, clocks[k].scale);
					}
				}
			}
		}
	}

	// Update number sprites.
	for (let k = 0; k < clockMax; k++) {
		let j = k;
		if (playerCount >= 3 && k < clockCount) {
			if (k == 0) {
				j = playerIndex >= 0 ? playerIndex : 0;
			} else {
				j = k - 1;
			}

			let x = clocks[k].centerx + screens[k == 0 ? 0 : 1].centerx;
			let y = clocks[k].centery + screens[k == 0 ? 0 : 1].centery;

			// Draw clock number.
			await picoChar(players[j].number, -1, x, y, clocks[k].angle, clocks[k].scale*numberScale);

		} else if (playerCount <= 2 && k < clockCount) {

			let x = clocks[k].centerx + screens[k].centerx;
			let y = clocks[k].centery + screens[k].centery;

			// Draw clock number.
			await picoChar(players[j].number, -1, x, y, clocks[k].angle, clocks[k].scale*numberScale);
		}
	}

	// Read input.
	let actions = [
		picoAction(screens[0].centerx, screens[0].centery, screens[0].width, screens[0].height),
		picoAction(screens[1].centerx, screens[1].centery, screens[1].width, screens[1].height)];
	let motions = [
		picoMotion(screens[0].centerx, screens[0].centery, screens[0].width, screens[0].height),
		picoMotion(screens[1].centerx, screens[1].centery, screens[1].width, screens[1].height)];

	let action = (playerCount == 2 && !waiting) ? actions[playerIndex] : (actions[0] || actions[1]);
	let motion = (playerCount == 2 && !waiting) ? motions[playerIndex] : (motions[0] || motions[1]);

	// Cancel/Reset on pressed.
	if (motion && holding >= 60) {
		console.log("Holding Motion:" + motions[0] + "," + motions[1] + " Action:" + actions[0] + "," + actions[1]);

		// Reset timeout or starting.
		if (timeout || waiting == 1) {
			timeout = false;
			playing = -2;

		// Pause playing.
		} else if (!pausing) {
			if (playerIndex >= 0) {

				// Update time count.
				if (players[playerIndex].count > 0) {

					// Update all players count.
					if (players[playerIndex].bonus < 0) {
						for (let j = 0; j < playerMax; j++) {
							let c = players[j].count + (j == playerIndex ? -players[playerIndex].consumed : players[playerIndex].consumed);
							players[j].current = players[j].count = c > countMax ? countMax : c > 0 ? c : 0;
						}
						players[playerIndex].consumed = 0;

					// Update current players count.
					} else {
						let c = players[playerIndex].count - players[playerIndex].consumed;
						players[playerIndex].current = players[playerIndex].count = c > 0 ? c : 0;
						players[playerIndex].consumed = 0;
					}
				}
			}

			// Pause.
			pausing = true;
		}

		// Reset waiting state.
		if (!waiting) {
			waiting = 2;

			// High 3 beeps on pause.
			picoBeep(1.2, 0.1);
			picoBeep(1.2, 0.1, 0.2);
			picoBeep(1.2, 0.1, 0.4);
		}

	// Check user action on timeout.
	} else if (action && timeout) {

		// Low beep on timeout.
		picoBeep(-1.2, 0.1);

	// Check user action on tapping.
	} else if (action && holding < 60) {
		console.log("Action Motion:" + motions[0] + "," + motions[1] + " Action:" + actions[0] + "," + actions[1]);
		holding = 0;

		if (playerIndex >= 0) {

			// Update time count on turn end.
			if (players[playerIndex].count > 0) {

				// Update all players count.
				if (players[playerIndex].bonus < 0) {
					for (let j = 0; j < playerMax; j++) {
						let c = players[j].count + (j == playerIndex ? -players[playerIndex].consumed : players[playerIndex].consumed);
						players[j].current = players[j].count = c > countMax ? countMax : c > 0 ? c : 0;
					}
					players[playerIndex].consumed = 0;

				// Add bonus time.
				} else if (!waiting) {
					let c = players[playerIndex].count - players[playerIndex].consumed + players[playerIndex].bonus;
					players[playerIndex].current = players[playerIndex].count = c > countMax ? countMax : c > 0 ? c : 0;
					players[playerIndex].consumed = 0;
				}

			// Reset additional time count on turn end.
			} else if (players[playerIndex].addition > 0) {
				players[playerIndex].current = players[playerIndex].consumed = 0;
			}
		}

		// Start.
		if (waiting) {

			// Start from opposite side on 2 players mode.
			if (playerCount == 2) {
				if (actions[0]) {
					playerIndex = 1;
				} else {
					playerIndex = 0;
				}
			} else if (playerIndex < 0) {
				playerIndex = 0;
			}

			// Start.
			waiting = 0;
			players[playerIndex].starting = true;

			// High 2 beeps on starting.
			picoBeep(1.2, 0.1);
			picoBeep(1.2, 0.1, 0.2);

		} else {

			// Switch players.
			playerIndex = picoMod(playerIndex + 1, playerCount > 2 ? playerCount : 2);
			players[playerIndex].starting = true;

			// High beep on switching.
			picoBeep(1.2, 0.1);
		}

		pausing = false;
		playing = -1; // No reset.

	// Check user motion.
	} else if (motion && holding < 60) {
		console.log("Motion Motion:" + motions[0] + "," + motions[1] + " Action:" + actions[0] + "," + actions[1]);
		holding++;

		// Start pausing.
		pausing = true;
		playing = 1;

		// Waiting to start from opposite side on 2 players mode.
		if (waiting && !timeout) {
			waiting = 1; // Reset waiting.
			if (playerCount == 2) {
				if (motions[0]) {
					playerIndex = 0;
				} else {
					playerIndex = 1;
				}
			} else if (playerIndex < 0) {
				playerIndex = 0;
			}
		}

	} else {
		holding = 0;
	}

	// Wakelock and flush on playing.
	if (!waiting || playing < 6) {
		picoWakelock(true);
		picoFlush();
	} else if (playing < 7) {
		picoWakelock(false);
	}

	// Increment playing count.
	playing++;
};
