/* PICO Sound module */

// Wait sound.
async function picoWait(t=1000) {
	await pico.sound.wait(t);
}

// Play beep.
async function picoBeep(cent=0, length=0.1, delay=0) {
	await pico.sound.beep(cent, length, delay);
}

// Play melody.
async function picoPlay(cents=[0], length=0.1, repeat=-1) {
	await pico.sound.play(cents, length, repeat);
}

// Force stop melody.
async function picoStop() {
	await pico.sound.stop();
}

// Play FC sound.
async function picoPlayFc(cent=0, length=0.1, type=0) {
	await pico.sound.playFc(cent, length, type);
}

//************************************************************/
// Namespace.
var pico = pico || {};

// Sound class
pico.Sound = class {

	// constructor.
	constructor() {
		this.audio = null; // Audio context.
		this.oscillator = null; // Oscillator node.
		this.master = null; // Master volume node.
		this.started = false; // Start flag.
		this.endTime = 0; // End time count.
		this.repeat = 0; // Repeat count.

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
				this.master.connect(this.audio.destination);
				this.master.gain.value = 0.1;
				this.oscillator = this.audio.createOscillator();
				this.oscillator.frequency.setValueAtTime(440, this.audio.currentTime);

				// Close audio.
				this.oscillator.onended = () => {
					console.log("Close audio.");
					this.master.disconnect(this.audio.destination);
					this.audio.close();
					this.audio = this.oscillator = this.master = null;
					this.started = false;
					this.endTime = 0;
					this.repeat = 0;
				};
			}

			// Wake lock.
			// Not work on iOS 16 PWA.
			// https://bugs.webkit.org/show_bug.cgi?id=254545
			if (navigator.wakeLock) {
				console.log("Request wake lock.");
				navigator.wakeLock.request("screen");
			} else {
				console.log("No wake lock.");
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	// Wait sound.
	async wait(t=1000) {
		//this._setup();
		try {
			await new Promise(r => setTimeout(r, t));
		} catch (error) {
			console.log(error.message);
		}
	}

	// Play beep.
	async beep(cent=0, length=0.1, delay=0) {
		const volume = 0.1;
		const type = "square"; //"sine", "square", "sawtooth", "triangle";
		//this._setup();
		try {

			// Start audio.
			if (this.audio) {
				console.log("Beep: " + cent + " x " + length + " + " + delay);
				await new Promise(async (resolve) => {
					setTimeout(() => {

						// Connect.
						this.oscillator.type = type;
						this.oscillator.detune.setValueAtTime(cent, this.audio.currentTime);
						this.oscillator.connect(this.master);
						this.master.gain.value = volume;

						// Start.
						if (!this.started) {
							console.log("Start audio.");
							this.oscillator.start();
							this.started = true;
						}

						// End time.
						this.endTime = Date.now() + length * 1000;
						setTimeout(() => {
							console.log("End beep.");
							this.master.gain.value = 0;
							this.endTime = 0;
							this.repeat = 0;
							resolve();
						}, length * 1000);
					}, delay * 1000);
				}); // end of new Promise.
			} else {
				console.log("No audio.");
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	// Play melody.
	async play(cents=[0], length=0.1, repeat=-1) {
		const volume = 0.1;
		const type = "triangle"; //"sine", "square", "sawtooth", "triangle";
		//this._setup();
		try {

			// Start audio.
			if (this.audio) {
				this.repeat = repeat;
				await new Promise(async (resolve) => {
					while (this.repeat) {
						console.log("Play melody " + this.repeat + ": " + cents + " x " + length * cents.length);
						await new Promise(async (resolve) => {

							// Connect.
							this.oscillator.type = type;
							for (let i = 0; i < cents.length; i++) {
								this.oscillator.detune.setValueAtTime(cents[i], this.audio.currentTime + length * i);
							}
							this.oscillator.connect(this.master);
							this.master.gain.value = volume;

							// Start.
							if (!this.started) {
								console.log("Start audio.");
								this.oscillator.start();
								this.started = true;
							}

							// End time.
							this.endTime = Date.now() + length * cents.length * 1000;
							let timer = setInterval(() => {
								if (this.repeat == 0) {
									console.log("Force stop melody " + this.repeat + "." + (Date.now()-this.endTime));
									this.master.gain.value = 0;
									this.endTime = 0;
									this.repeat = 0;
									clearInterval(timer);

									// Resolves.
									resolve();
								} else if (Date.now() >= this.endTime) {
									console.log("End melody " + this.repeat + "." + (Date.now()-this.endTime));
									this.master.gain.value = 0;
									this.endTime = 0;
									this.repeat -= 1;
									clearInterval(timer);

									// Resolves.
									resolve();
								} else {
									console.log("Playing melody " + this.repeat + "." + (Date.now()-this.endTime));
								}
							}, length * 1000);
						}); // end of new Promise.
					}
					this.repeat = 0;
					console.log("End all melodies.");
					resolve();
				}); // end of new Promise.
			} else {
				console.log("No audio.");
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	// Force stop melody.
	async stop() {
		//this._setup();
		try {

			// Stop audio.
			if (this.audio) {
				console.log("Force stop melody.");
				if (this.repeat) {
					await new Promise(async (resolve) => {
						this.repeat = 0; // Force stop all melodies.

						// Wait to stop all melodies.
						let timer = setInterval(() => {
							if (!this.endTime) {
								console.log("Force stoped all melodies.");
								clearInterval(timer);
								resolve();
							}
						}, 10);
					}); // end of new Promise.
				}
			} else {
				console.log("No audio.");
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	// Play FC sound.
	async playFc(cent=0, length=0.1, tone=0) {
		const volume = 0.1;
		//this._setup();
		try {

			// Start audio.
			if (this.audio) {
				await new Promise((resolve) => {

					// Square sound.
					if (tone == 0) {
						console.log("FC" + tone + "(Square): " + cent + " x " + length);

						// Connect oscillator to master volume.
						this.oscillator.type = "square";
						this.oscillator.detune.setValueAtTime(cent, this.audio.currentTime);
						this.oscillator.connect(this.master);
						this.master.gain.value = volume;

						// Disconnect.
						setTimeout(() => {
							console.log("Disconnect square sound.");
							this.oscillator.disconnect(this.master);
						}, length * 1000);

					// Pulse sound.
					} else if (tone == 1 || tone == 2 || tone == 3) {
						const dutyCycles = [0, 0.75, 0.25, 0.125]; // 1=Pulse75% 2=Pulse25% 3=Pulse12.5%.
						console.log("FC" + tone + "(Pulse" + (dutyCycles[tone] * 100) + "%): " + cent + " x " + length);

						// Create pulse filters.
						let pulseFilters = [];
						pulseFilters[0] = this.audio.createGain();
		  			pulseFilters[0].gain.value = -1;
						pulseFilters[tone] = this.audio.createDelay();
					  pulseFilters[tone].delayTime.value = (1.0 - dutyCycles[tone]) / this.oscillator.frequency.value;

						// Connect pulse filters to master volume.
						this.oscillator.type = "sawtooth";
						this.oscillator.detune.setValueAtTime(cent, this.audio.currentTime);
						this.oscillator.connect(pulseFilters[0]).connect(pulseFilters[tone]).connect(this.master);
						this.master.gain.value = volume;

						// Disconnect.
						setTimeout(() => {
							console.log("Disconnect pulse sound.");
							this.oscillator.disconnect(pulseFilters[0]);
							pulseFilters[0].disconnect(pulseFilters[tone]);
							pulseFilters[0] = null;
							pulseFilters[tone].disconnect(this.master);
							pulseFilters[tone] = null;
						}, length * 1000);

					// Triangle sound.
					} else if (tone == 4) {
						console.log("FC" + tone + "(Triangle): " + cent + " x " + length);

						// Connect oscillator to master volume.
						this.oscillator.type = "triangle";
						this.oscillator.detune.setValueAtTime(cent, this.audio.currentTime);
						this.oscillator.connect(this.master);
						this.master.gain.value = volume;

						// Disconnect.
						setTimeout(() => {
							console.log("Disconnect triangle sound.");
							this.oscillator.disconnect(this.master);
						}, length * 1000);

					// Noise sound.
					} else if (tone == 5 || tone == 6) {
						const freqs = [1, 6]; // 5=Noise1 6=Noise6.
						console.log("FC" + tone + "(Noise" + freqs[tone-5] + "): " + length);

						// Create noise buffers.
						let noiseBuffers = [];
						noiseBuffers[tone-5] = this.audio.createBuffer(2, this.audio.sampleRate * length, this.audio.sampleRate);
						let reg = 0x8000;
						for (let j = 0; j < noiseBuffers[tone-5].numberOfChannels; j++) {
						  let buffering = noiseBuffers[tone-5].getChannelData(j);
						  for (let i = 0; i < noiseBuffers[tone-5].length; i++) {
						    //buffering[i] = Math.random() * 2 - 1;
						    reg >>= 1;
						    reg |= ((reg ^ (reg >> freqs[tone-5])) & 1) << 15;
						    buffering[i] = reg & 1;
						  }
						}

						// Connect noise generators to master volume.
						let noiseGenerators = [];
						noiseGenerators[tone-5] = this.audio.createBufferSource();
						noiseGenerators[tone-5].buffer = noiseBuffers[tone-5];
						noiseGenerators[tone-5].connect(this.master);
						noiseGenerators[tone-5].start();
						this.master.gain.value = volume;

						// Disconnect.
						setTimeout(() => {
							console.log("Disconnect noise sound.");
							noiseGenerators[tone-5].disconnect(this.master);
							noiseGenerators[tone-5] = null;
							noiseBuffers[tone-5] = null;
						}, length * 1000);
					}

					// Start.
					if (!this.started) {
						console.log("Start audio.");
						this.oscillator.start();
						this.started = true;
					}

					// End time.
					this.endTime = Date.now() + length * 1000;
					setTimeout(() => {
						if (Date.now() >= this.endTime) {
							console.log("End sound.");
							this.master.gain.value = 0;
							this.endTime = 0;
							this.repeat = 0;
						}
						resolve();
					}, length * 1000);

				}); // end of new Promise.
			}
		} catch (error) {
			console.log(error.message);
		}
	}
};

// Master sound.
pico.sound = new pico.Sound();
