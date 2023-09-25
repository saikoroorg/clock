/* PICO Sound module */

// Wait sound.
async function picoWait(t=1000) {
	await pico.sound.wait(t);
}

// Play beep.
async function picoBeep(kcent=0, length=0.1, delay=0) {
	await pico.sound.beep(kcent, length, delay);
}

//************************************************************/

// Namespace.
var pico = pico || {};

// Sound class.
pico.Sound = class {

	// Wait sound.
	async wait(t=1000) {
		await new Promise(r => setTimeout(r, t));
	}

	// Beep.
	async beep(kcent=0, length=0.1, delay=0) {
		const type = "square"; //"sine", "square", "sawtooth", "triangle";
		const volume = 0.1;
		await this._start(type, [kcent], volume, length, delay);
	}

	//*----------------------------------------------------------*/

	// constructor.
	constructor() {
		this.audio = null; // Audio context.
		this.oscillator = null; // Oscillator node.
		this.master = null; // Master volume node.
		this.started = false; // Start flag.
		this.endTime = 0; // End time count.

		// Setup after click event for audio permission.
		document.addEventListener("click", () => {
			this._setup();
		});

		// Setup after visibility changed to visible.
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				this._setup();
			}
		});
	}

	// Setup sound.
	_setup() {
		try {

			// Create audio.
			if (this.audio == null) {
				console.log("Create audio.");
				this.audio = new window.AudioContext();
				this.master = this.audio.createGain();
				this.master.gain.value = 0.1;
				this.master.connect(this.audio.destination);
				this.oscillator = this.audio.createOscillator();
				this.oscillator.frequency.setValueAtTime(440, this.audio.currentTime);

				// Close audio.
				this.oscillator.onended = () => {
					console.log("Close audio.");
					this.master.gain.value = 0.1;
					this.master.disconnect(this.audio.destination);
					this.audio.close();
					this.audio = this.oscillator = this.master = null;
					this.started = false;
					this.endTime = 0;
				};
			}
		} catch (error) {
			console.error(error.name, error.message);
		}
	}

	// Stop sound.
	async _stop() {
		if (this.audio == null) {
			console.log("No audio.");
			return;
		} else if (!this.started) {
			console.log("Not started.");
			return;
		}

		// Stop audio.
		console.log("Stop.");
		this.master.gain.value = 0;
		this.endTime = 0;
	}
	
	// Start sound.
	async _start(type="square", kcent=0, volume=0.1, length=0.1, delay=0) {
		if (this.audio == null) {
			console.log("No audio.");
			return;
		} else if (this.endTime > Date.now() + delay * 1000) {
			console.log("Not end previous sound.");
			return;
		}

		console.log("Start: " + kcent + " x " + length + " + " + delay);
		await new Promise((resolve) => {

			// Set end time.
			this.endTime = Date.now() + length * 1000 + delay * 1000;

			// Wait to start.
			setTimeout(() => {

				// Connect.
				if (type) {
					this.master.gain.value = volume;
					this.oscillator.type = type;
					this.oscillator.detune.setValueAtTime(kcent * 1000, this.audio.currentTime);
					this.oscillator.connect(this.master);
				}

				// Start.
				if (!this.started) {
					console.log("Start audio.");
					this.oscillator.start();
					this.started = true;
				}

				// Wait to end.
				setTimeout(() => {
					console.log("End: " + kcent + " x " + length);
					this.master.gain.value = 0;
					this.oscillator.disconnect(this.master);
					resolve();
				}, length * 1000);
			}, delay * 1000);
		}); // end of new Promise.
	}

	// Repeat sounds.
	async _repeat(type="square", kcents=[0], volume=0.1, length=0.1, repeat=0) {
		if (this.audio == null) {
			console.log("No audio.");
			return;
		} else if (this.endTime > Date.now()) {
			console.log("Not end previous sound.");
			return;
		}

		console.log("Repeat: " + kcents + " x " + length * kcents.length + " x " + repeat);
		await new Promise((resolve) => {

			// Set end time.
			this.endTime = Date.now() + length * kcents.length * 1000;

			// Connect.
			this.master.gain.value = volume;
			this.oscillator.type = type;
			for (let i = 0; i < kcents.length; i++) {
				this.oscillator.detune.setValueAtTime(kcents[i] * 1000, this.audio.currentTime + length * i);
			}
			this.oscillator.connect(this.master);

			// Start.
			if (!this.started) {
				console.log("Start audio.");
				this.oscillator.start();
				this.started = true;
			}

			// Wait to end.
			let timer = setInterval(() => {
				if (this.endTime > 0 && repeat == 0) {
					console.log("Loop: " + kcents + " x " + length * kcents.length + " x " + repeat);
					for (let i = 0; i < kcents.length; i++) {
						this.oscillator.detune.setValueAtTime(kcents[i] * 1000, this.audio.currentTime + length * i);
					}
					this.endTime = Date.now() + length * kcents.length * 1000;
				} else if (this.endTime > 0 && repeat > 0) {
					for (let i = 0; i < kcents.length; i++) {
						this.oscillator.detune.setValueAtTime(kcents[i] * 1000, this.audio.currentTime + length * i);
					}
					repeat -= 1;
					console.log("Repeat: " + kcents + " x " + length * kcents.length + " x " + repeat);
					this.endTime = Date.now() + length * kcents.length * 1000;
				} else {
					repeat -= 1;
					console.log("End: " + kcents + " x " + length * kcents.length + " x " + repeat);
					this.master.gain.value = 0;
					this.oscillator.disconnect(this.master);
					clearInterval(timer);
					resolve();
				}
			}, length * kcents.length * 1000);
		}); // end of new Promise.
	}
};

// Master sound.
pico.sound = new pico.Sound();
