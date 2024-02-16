picoTitle("Clock"); // Title.

// Data and settings.
const countMax = 999 * 60; // Maximum count.
const bonusMax = 99; // Maximum bonus time count.

// Screen.
const screenMax = 2; // Maximum screen count.
const screenWidth = 200, screenHeight = 50; // Screen sizes.

// Screen class.
Screen = class {
	constructor() {
		this.centerx = 0; // Center position X.
		this.centery = 0; // Center position Y.
		this.width = screenWidth;
		this.height = screenHeight;
	}
};
var screens = []; // Screen.

// Player.
const playerMax = 8; // Maximum player count.
var playerCount = 2; // Player count.
var playerIndex = 0; // Current player index.
var playerCountMin2 = 2; // Player count for hourglass mode.

// Player class.
Player = class {
	constructor() {
		this.count = 10 * 60; // Time count for each player.
		this.current = 0; // Current time count.
		this.consumed = 0; // Consumed time count.
		this.starting = false; // Start flag.
		this.number = ""; // Display count.
	}
};
var players = []; // Player.

// Clock.
const clockMax = playerMax + 1; // Maximum clock count.
var clockCount = 2; // Clock count.
const clockRects0 = [0,17,17, 0,1,4,0,14,8, 0,3,2,0,10,10]; // Clock base sprite.
const clockRects2 = [0,17,17, 2,1,4,0,14,8, 2,3,2,0,10,10]; // Clock base sprite.
const clockRects3 = [0,17,17, 3,1,4,0,14,8, 3,3,2,0,10,10]; // Clock base sprite.
const clockScale = 6; // Clock base scale.
const numberScale = 0.5; // Clock number scale.
const bonusScale = 0.25; // Clock adiitional/bonus number scale.
const clockPosX = 50; // Clock position X on landscape mode.
const clockPosY = 50; // Clock position Y on portrait mode.
const clockGridX = 125; // Clock position grid base width for 3+ players.
const clockGridY = [-15, 15]; // Clock position grid base height for 3+ players.

// Clock class.
Clock = class {
	constructor() {
		this.scale = 1; // Sprite scale.
		this.angle = 0; // Sprite angle.
		this.centerx = 0; // Center position X.
		this.centery = 0; // Center position Y.
	}
};
var clocks = []; // Clock.

// Global variables.
var state = "waiting"; // Playing state.
var playing = -1; // Playing count.
var count = 10 * 60; // Time count.
var addition = 0; // Additional time count.
var bonus = 0; // Bonus time count.

var counting = false; // Counting up/down flag.
var touching = 0; // Touching count.

var startTime = 0; // Start time.
var landscape = false; // landscape mode.

// Update buttons.
async function appUpdate() {
	if (state == "playing") {
		picoTitle();
		picoLabel("select");
		picoLabel("minus");
		picoLabel("plus");
	} else if (state == "pausing") {
		picoTitle("Clock");
		if (addition > 0) {
			picoLabel("select", "-" + addition);
		} else if (bonus > 0) {
			picoLabel("select", "+" + bonus);
		} else if (bonus < 0) {
			picoLabel("select", "+");
		} else {
			picoLabel("select", "-");
		}
		picoLabel("minus", "-");
		picoLabel("plus", "+");
	} else  {
		picoTitle("Clock");
		if (count > 0) {
			picoLabel("select", "" + picoDiv(count, 60));
		} else {
			picoLabel("select", "0");
		}
		picoLabel("minus", "-");
		picoLabel("plus", "+");
	}
}

// Action button.
async function appAction() {
}

// Select button.
async function appSelect(x) {

	// Change count.
	if (x != 0) {

		// Change count of total time.
		if (state == "waiting") {
			if ((x > 0 && count + x <= 999 * 60) || (x < 0 && count + x > 0)) {
				count = picoDiv(count + x * 60, 60) * 60;
				playing = -1; // Restart.
				picoBeep(1.2, 0.1);
				appUpdate();

			} else {
				picoBeep(-1.2, 0.1);
			}

		// Change count of each player time.
		} else if (state == "pausing") {
			let c = players[playerIndex].count > 0 ? players[playerIndex].current : 0;
			if ((x > 0 && c + x <= 999 * 60) || (x < 0 && c + x > 0)) {
				players[playerIndex].count = players[playerIndex].current = picoDiv(c + x * 60, 60) * 60;
				picoBeep(1.2, 0.1);

			} else {
				picoBeep(-1.2, 0.1);
			}
		} else {
			picoBeep(-1.2, 0.1);
		}

	// Change option.
	} else {

		if (state == "waiting" || state == "pausing") {
			if (bonus == 0 && addition < 10) {
				addition = 10; // -10s additional time (Byoyomi)
			} else if (bonus == 0 && addition < 30) {
				addition = 30; // -30s additional time (Byoyomi)
			} else if (bonus == 0) {
				addition = 0;
				bonus = -1; // +?s opposite time (Hourglass)
			} else if (bonus < 5) {
				addition = 0;
				bonus = 5; // +5s bonus time (Fischer)
			} else if (bonus < 10) {
				addition = 0;
				bonus = 10; // +10s bonus time (Fischer)
			} else {
				addition = 0;
				bonus = 0;
			}
			picoBeep(1.2, 0.1);
			appResize();
			appUpdate();
		} else {
			picoBeep(-1.2, 0.1);
		}
	}
}

// Load.
async function appLoad() {

	// Create screens.
	for (let i = 0; i < screenMax; i++) {
		screens[i] = new Screen();
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
			count = numbers[0] < 0 ? 0 : numbers[0] * 60 < countMax ? numbers[0] * 60 : countMax;
			addition = numbers[1] < 0 ? 0 : numbers[1] < bonusMax ? numbers[1] : bonusMax;
			bonus = 0;
			playerCount = numbers[2] <= 0 ? 2 : numbers[2] < playerMax ? numbers[2] : playerMax;

		// Bonus time mode. (Fischer) / Hourglass mode.
		} else if (value.match(/b/i)) {
			count = numbers[0] < 0 ? 0 : numbers[0] * 60 < countMax ? numbers[0] * 60 : countMax;
			addition = 0
			bonus = numbers[1] <= 0 ? -1 : numbers[1] < bonusMax ? numbers[1] : bonusMax;
			playerCount = numbers[2] <= 0 ? 2 : numbers[2] < playerMax ? numbers[2] : playerMax;

		// Simple multi players mode. (Kiremake)
		} else if (value.match(/x/i)) {
			count = numbers[0] < 0 ? 0 : numbers[0] * 60 < countMax ? numbers[0] * 60 : countMax;
			addition = 0
			bonus = 0;
			playerCount = numbers[1] <= 0 ? 2 : numbers[1] < playerMax ? numbers[1] : playerMax;

		// Simple 2 players mode. (Kiremake)
		} else if (numbers[0] > 0) {
			count = numbers[0] < 0 ? 0 : numbers[0] * 60 < countMax ? numbers[0] * 60 : countMax;
			addition = 0
			bonus = 0;
			playerCount = 2;
		}
	}
	playerCountMin2 = playerCount > 2 ? playerCount : 2; // Minimum 2 players for hourglass mode.
	clockCount = playerCount <= 2 ? playerCount : playerCount + 1; // Add playing button on 3+ players mode.

	state = "waiting";
	appResize(); // Initialize positions.
	appUpdate(); // Initialize buttons.
}

// Resize.
async function appResize() {
	landscape = picoWideScreen();

	// Reset layouts for 1 screen.
	if (playerCount <= 1) {
		screens[0].centerx = screens[1].centerx = 0;
		screens[0].centery = screens[1].centery = 0;
		screens[0].width = screens[1].width = screenWidth;
		screens[0].height = screens[1].height = screenHeight;

		// 1 Screen for solo player.
		for (let j = 0; j < 1; j++) {
			clocks[j].centerx = clocks[j].centery = 0;
			clocks[j].scale = clockScale;
			clocks[j].angle = 0;
		}

	// Reset layouts for 2 screens.
	} else {

		// Set sprite positions and scale for landscape mode.
		if (landscape) {
			screens[0].centerx = clockPosX;
			screens[1].centerx = -clockPosX;
			screens[0].centery = screens[1].centery = 0;
			screens[0].width = screens[1].width = screenHeight;
			screens[0].height = screens[1].height = screenWidth;

		// Set sprite positions and scale for portrait mode.
		} else {
			screens[0].centery = clockPosY;
			screens[1].centery = -clockPosY;
			screens[0].centerx = screens[1].centerx = 0;
			screens[0].width = screens[1].width = screenWidth;
			screens[0].height = screens[1].height = screenHeight;
		}

		// 2 Screens for 2 players.
		if (playerCount <= 2) {
			for (let j = 0; j < 2; j++) {
				clocks[j].centerx = clocks[j].centery = 0;
				clocks[j].scale = clockScale;
				clocks[j].angle = 0;
			}

			// Upsidedown for portrait mode.
			if (!landscape) {
				clocks[1].angle = 180;
			}

		// 2 Screens for 3+ players.
		} else {
			clocks[0].centerx = clocks[0].centery = 0;
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
		console.log("Initialize playing states.");

		// Reset playing states.
		state = "waiting";
		counting = false;

		// Reset player states.
		playerIndex = -1;
		for (let j = 0; j < playerCountMin2; j++) {
			players[j].count = players[j].current = count;
			players[j].consumed = 0;
			players[j].starting = false;
		}

		// Start clock.
		startTime = picoTime();

		// Reset playing count.
		playing = 1;
	}

	let currentTime = picoTime();
	let spendTime = currentTime - startTime;
	startTime = currentTime;

	// Update time count.
	if (state == "playing" && touching <= 0) {
		players[playerIndex].consumed += spendTime / 1000; // Chessclock style.
		// players[playerIndex].consumed += picoDiv(spendTime, 1000); // Stopwatch style.

		// Main time count.
		if (players[playerIndex].count > 0) {

			// Update all reversed players count on hourglass mode.
			if (bonus < 0) {
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
				if (addition > 0) {

					// Adjust remained consumed count to avoid continuous beep.
					players[playerIndex].current = players[playerIndex].consumed = players[playerIndex].consumed - players[playerIndex].count;
					players[playerIndex].count = 0;

					// Restart.
					playing = 0; // No reset.

				// Time out.
				} else {
					players[playerIndex].current = players[playerIndex].count = players[playerIndex].consumed = 0;
					state = "timeout";
					appUpdate();

					// Long beep on timeout.
					picoBeep(0, 4);

					// Unlock.
					console.log("Unlock screen.");
					picoLockScreen(false);
				}
			}

		// Additional time count.
		// (0 Additional time == Free time count)
		} else if (addition >= 0) {
			players[playerIndex].current = players[playerIndex].consumed > countMax ? countMax : players[playerIndex].consumed;

			// Time out.
			if (addition > 0 && players[playerIndex].current >= addition) {
				players[playerIndex].current = addition;
				state = "timeout";

				// Long beep on timeout.
				picoBeep(0, 4);
			}
		}
	}

	// Beep timing.
	let counter = -1;
	if (state == "playing" && touching <= 0 && playerIndex >= 0) {

		// Starting count.
		if (players[playerIndex].starting) {
			console.log("Starting count.");

			players[playerIndex].starting = false;
			counting = false; // Reset flag to avoid continuous beep.

		// Count down on main time count.
		} else if (players[playerIndex].count > 0) {
			if (addition > 0) {
				counter = players[playerIndex].current + 60; // No sound for the last 60 seconds.
			} else {
				counter = players[playerIndex].current;
			}

		// Count up on additional time count.
		} else {
			if (addition <= 0) {
				counter = 1000*60 - players[playerIndex].current; // No sound for the last XX seconds.
			} else if (addition <= 5) {
				counter = addition - players[playerIndex].current + 5; // Change sound for the last 5 to 10 seconds.
			} else {
				counter = addition - players[playerIndex].current;
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
		if (players[j].count > 0 && !(bonus < 0 && j != playerIndex)) {
			let s = picoMod(players[j].current + 0.9999, 60); // Round up decimal to integer.
			sec = s < 10 ? "0" + s : s;
		} else if (players[j].current >= 1) {
			let s = picoMod(players[j].current, 60);
			sec = s < 10 ? "0" + s : s;
		}

		// Colon mark.
		let colon = ":";
		if (state == "playing" && touching <= 0 && j == playerIndex) {
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

	// Update angle for hourglass mode.
	if (bonus < 0) {

		// For solo player.
		if (playerCount <= 1) {
			for (let k = 0; k < playerCountMin2; k++) {
				if (state == "playing" && k != playerIndex) {
					clocks[k].angle = 180;
				} else {
					clocks[k].angle = 0;
				}
			}

		// For 2 players without portrait mode.
		} else if (playerCount <= 2 && landscape) {
			for (let k = 0; k < playerCountMin2; k++) {
				if (state == "playing" && k != playerIndex) {
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
	let s = playing < 5 ? 0.8 + 0.04 * playing : 1;
	for (let k = 0; k < clockMax; k++) {

		// Switching clocks for 1-2 players.
		if (playerCount <= 2) {
			if (k < clockCount) {
				let i = k;
				let x = clocks[k].centerx + screens[i].centerx;
				let y = clocks[k].centery + screens[i].centery;

				// Waiting.
				if (state == "waiting" || state == "pausing") {
					if (state == "pausing" && k == playerIndex) { // Wait to restart.
						await picoSprite(clockRects2, -1, x, y, clocks[k].angle, clocks[k].scale * s);
					} else if (touching > 0 && k == playerIndex) { // Just starting.
						await picoSprite(clockRects2, -1, x, y, clocks[k].angle, clocks[k].scale * s);
					} else if (playerIndex < 0) { // Waiting.
						await picoSprite(clockRects0, -1, x, y, clocks[k].angle, clocks[k].scale * s);
					} else { // Opposite player.
						await picoSprite(clockRects3, -1, x, y, clocks[k].angle, clocks[k].scale);
					}

				// Playing.
				} else {
					if (k == playerIndex) { // Playing.
						await picoSprite(clockRects0, -1, x, y, clocks[k].angle, clocks[k].scale * s);
					} else if (bonus < 0 && playerCount <= 1) { // Reversed hourglass solo player.
						await picoSprite(clockRects0, -1, x, y, clocks[k].angle, clocks[k].scale * s);
					} else { // Opposite player.
						await picoSprite(clockRects3, -1, x, y, clocks[k].angle, clocks[k].scale);
					}
				}
			}

		// Cyclic clocks for 3+ playres.
		} else {
			if (k < clockCount) {
				let i = k == 0 ? 0 : 1;
				let x = clocks[k].centerx + screens[i].centerx;
				let y = clocks[k].centery + screens[i].centery;

				// Waiting to start.
				if (state == "waiting") {
					if (k == 0) { // Playing.
						if (touching > 0) { // Just starting.
							await picoSprite(clockRects2, -1, x, y, clocks[k].angle, clocks[k].scale * s);
						} else { // Waiting.
							await picoSprite(clockRects0, -1, x, y, clocks[k].angle, clocks[k].scale * s);
						}
					} else { // Another players.
						await picoSprite(clockRects3, -1, x, y, clocks[k].angle, clocks[k].scale);
					}

				// Playing.
				} else {
					if (k == 0 || k == playerIndex + 1) { // Playing or target player.
						if (state == "pausing") { // Wait to restart.
							await picoSprite(clockRects2, -1, x, y, clocks[k].angle, clocks[k].scale * s);
						} else {
							if (k == 0) { // Playing
								await picoSprite(clockRects0, -1, x, y, clocks[k].angle, clocks[k].scale * s);
							} else if (k == playerIndex + 1) { // Target player.
								await picoSprite(clockRects0, -1, x, y, clocks[k].angle, clocks[k].scale * s);
							}
						}
					} else { // Another players.
						await picoSprite(clockRects3, -1, x, y, clocks[k].angle, clocks[k].scale);
					}
				}
			}
		}
	}

	// Update number sprites.
	for (let k = 0; k < clockCount; k++) {
		let i = k, j = k;
		if (playerCount >= 3) {
			if (k == 0) {
				i = 0;
				j = playerIndex >= 0 ? playerIndex : 0;
			} else {
				i = 1;
				j = k - 1;
			}
		}

		// Draw clock number.
		let x = clocks[k].centerx + screens[i].centerx;
		let y = clocks[k].centery + screens[i].centery;
		await picoChar(players[j].number, -1, x, y, clocks[k].angle, clocks[k].scale*numberScale);

		// Draw additional information.
		y = clocks[k].angle >= 180 ? y + clocks[k].scale*4 : y - clocks[k].scale*4;
		if (addition > 0) {
			await picoChar("-" + addition, 4, x, y, clocks[k].angle, clocks[k].scale*bonusScale);
		} else if (bonus > 0) {
			await picoChar("+" + bonus, 4, x, y, clocks[k].angle, clocks[k].scale*bonusScale);
		} else if (bonus) {
			await picoChar("+", 4, x, y, clocks[k].angle, clocks[k].scale*bonusScale);
		}
	}

	// Read input.
	let actions = [
		picoAction(screens[0].centerx, screens[0].centery, screens[0].width, screens[0].height),
		picoAction(screens[1].centerx, screens[1].centery, screens[1].width, screens[1].height)];
	let motions = [
		picoMotion(screens[0].centerx, screens[0].centery, screens[0].width, screens[0].height),
		picoMotion(screens[1].centerx, screens[1].centery, screens[1].width, screens[1].height)];

	let action = (playerCount == 2 && state == "playing") ? actions[playerIndex] : (actions[0] || actions[1]);
	let motion = (playerCount == 2 && state == "playing") ? motions[playerIndex] : (motions[0] || motions[1]);

	// Cancel/Reset on pressed.
	if (motion && touching >= 60) {
		console.log("Holding " + touching + ": motion=" + motions[0] + "," + motions[1] + " action=" + actions[0] + "," + actions[1]);

		// Reset timeout or starting.
		if (state == "timeout") {
			console.log("Reset timeout or starting.");

			state = "waiting";
			playing = -2;
			appUpdate()

			// High 3 beeps on pause.
			picoBeep(1.2, 0.1);
			picoBeep(1.2, 0.1, 0.2);
			picoBeep(1.2, 0.1, 0.4);

			// Unlock.
			console.log("Unlock screen.");
			picoLockScreen(false);

		// Pause playing.
		} else if (state == "playing") {
			console.log("Pause playing.");

			state = "pausing";
			appUpdate()

			if (playerIndex >= 0) {

				// Update time count.
				if (players[playerIndex].count > 0) {

					// Update all players count.
					if (bonus < 0) {
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

			// High 3 beeps on pause.
			picoBeep(1.2, 0.1);
			picoBeep(1.2, 0.1, 0.2);
			picoBeep(1.2, 0.1, 0.4);

			// Unlock.
			console.log("Unlock screen.");
			picoLockScreen(false);
		}

	// Check user action on timeout.
	} else if (action && state == "timeout") {

		// Low beep on timeout.
		picoBeep(-1.2, 0.1);

	// Check user action on tapping.
	} else if (action && touching < 60) {
		console.log("Touched " + touching + ": motion=" + motions[0] + "," + motions[1] + " action=" + actions[0] + "," + actions[1]);
		touching = 0;

		if (state == "playing" && playerIndex >= 0) {
			console.log("Update time count on turn end.");

			// Update time count on turn end.
			if (players[playerIndex].count > 0) {

				// Update all players count.
				if (bonus < 0) {
					for (let j = 0; j < playerMax; j++) {
						let c = players[j].count + (j == playerIndex ? -players[playerIndex].consumed : players[playerIndex].consumed);
						players[j].current = players[j].count = c > countMax ? countMax : c > 0 ? c : 0;
					}
					players[playerIndex].consumed = 0;

				// Add bonus time.
				} else if (state == "playing") {
					let c = players[playerIndex].count - players[playerIndex].consumed + bonus;
					players[playerIndex].current = players[playerIndex].count = c > countMax ? countMax : c > 0 ? c : 0;
					players[playerIndex].consumed = 0;
				}

			// Reset additional time count on turn end.
			} else if (addition > 0) {
				players[playerIndex].current = players[playerIndex].consumed = 0;
			}
		}

		// Start or restart.
		if (state == "waiting" || state == "pausing") {
			console.log("Start or restart.");

			// Restart from opposite side on 2 players mode.
			if (playerCount == 2 && state == "waiting") {
				if (actions[0]) {
					playerIndex = 1;
				} else {
					playerIndex = 0;
				}
			} else if (playerIndex < 0) {
				playerIndex = 0;
			}

			// Start.
			state = "playing";
			players[playerIndex].starting = true;
			appUpdate();

			// High 2 beeps on starting.
			picoBeep(1.2, 0.1);
			picoBeep(1.2, 0.1, 0.2);

			// Lock.
			console.log("Lock screen.");
			picoLockScreen(true);

		} else {
			console.log("Switch players.");

			// Switch players.
			playerIndex = picoMod(playerIndex + 1, playerCount > 2 ? playerCount : 2);
			players[playerIndex].starting = true;

			// High beep on switching.
			picoBeep(1.2, 0.1);
		}

		playing = -1; // No reset.

	// Check user motion.
	} else if (motion && touching < 60) {
		console.log("Touching " + touching + ": motion=" + motions[0] + "," + motions[1] + " action=" + actions[0] + "," + actions[1]);

		touching++;
		playing = 1;

		// Waiting to restart from opposite side on 2 players mode.
		if (state == "waiting" || state == "timeout") {
			console.log("Waiting to restart from opposite side on 2 players mode.");
			if (playerCount == 2 && state == "waiting") {
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
		touching = 0;
	}

	// Update animation if playing.
	if (state != "waiting" || playing < 5) {
		picoFlush();
	}

	// Increment playing count.
	playing++;
};
