var WelcomeScreen = (function WelcomeScreen(){
	"use strict";

	var publicAPI,
		welcomeScreen;


	welcomeScreen = {
		src: "images/screens/welcome.svg",
		width: 900,
		height: 750,
		hitAreas: [
			{ x1: 605, y1: 130, x2: 845, y2: 295, },	// easy
			{ x1: 665, y1: 315, x2: 905, y2: 480, },	// medium
			{ x1: 570, y1: 490, x2: 810, y2: 655, },	// hard
		],
		scaled: {
			cnv: Browser.createCanvas(),
			ctx: null,
			hitAreas: [],
		},
	};

	welcomeScreen.scaled.ctx = welcomeScreen.scaled.cnv.getContext("2d");
	Screens.defineScreen("welcome",welcomeScreen);


	publicAPI = {
		start: startWelcomeEntering,
		wait: waitAtWelcomeScreen,
	};

	return publicAPI;


	// ******************************

	function startWelcomeEntering() {
		// disable any touch for right now
		Interaction.disableTouch();

		Game.gameState.playHintShown = false;
		Game.gameState.retryLeaving = false;
		Game.gameState.playLeaving = false;
		Game.gameState.welcomeEntering = true;
		Game.gameState.welcomeEnteringTickCount = 0;

		Game.gameState.RAFhook = requestAnimationFrame(runWelcomeEntering);
	}

	function runWelcomeEntering() {
		Debug.trackFramerate();

		Game.gameState.RAFhook = null;

		if (Game.gameState.welcomeEntering) {
			Game.gameState.welcomeEnteringTickCount++;

			if (Game.gameState.welcomeEnteringTickCount <= Game.gameState.welcomeEnteringTickThreshold) {
				var opacityThreshold = 17;
				var popThreshold = 15;
				var popRatio = 1.1;
				var opacity;
				var ratio;

				if (Game.gameState.welcomeEnteringTickCount <= opacityThreshold) {
					opacity = 1 - ((opacityThreshold-Game.gameState.welcomeEnteringTickCount) / opacityThreshold);
				}

				if (Game.gameState.welcomeEnteringTickCount <= popThreshold) {
					ratio = popRatio * (
						1 -
						((popThreshold-Game.gameState.welcomeEnteringTickCount) / popThreshold)
					);
				}
				else {
					ratio = popRatio - (
						(popRatio - 1) * (
							1 - (
								(Game.gameState.welcomeEnteringTickThreshold-Game.gameState.welcomeEnteringTickCount) /
								(Game.gameState.welcomeEnteringTickThreshold-popThreshold)
							)
						)
					);
				}

				drawWelcome(opacity,ratio);

				Game.gameState.RAFhook = requestAnimationFrame(runWelcomeEntering);
			}
			else {
				waitAtWelcomeScreen();
			}
		}
	}

	function waitAtWelcomeScreen() {
		// stop listening to ESC
		EVT.emit("game:cancel-keyboard-esc");

		Debug.resetFramerate();

		// re-enable touch
		Interaction.enableTouch();

		// show screen
		drawWelcome();

		// recycle cloud objects
		EVT.emit("game:cleanup-recycle");

		if (!Game.gameState.welcomeWaiting) {
			Game.gameState.welcomeEntering = false;
			Game.gameState.welcomeWaiting = true;

			Utils.onEvent(Interaction.EVENT_PRESS,onInteraction);
		}
	}

	function onInteraction(evt) {
		var key;
		var buttonPressed;
		var screen = Screens.getWelcomeScreen();

		evt.preventDefault();

		if ((key = Interaction.detectKey(evt))) {
			if (key == Interaction.KEYBOARD_1 || key == Interaction.KEYBOARD_ENTER) {
				buttonPressed = 0;
			}
			else if (key == Interaction.KEYBOARD_2) {
				buttonPressed = 1;
			}
			else if (key == Interaction.KEYBOARD_3) {
				buttonPressed = 2;
			}
		}
		else if ((evt = Interaction.fixTouchCoords(evt))) {
			for (var i=0; i<screen.hitAreas.length; i++) {
				// recognized button press?
				if (Utils.pointInArea(
					evt.clientX-screen.x,
					evt.clientY-screen.y,
					screen.hitAreas[i]
				)) {
					buttonPressed = i;
					break;
				}
			}
		}

		// respond to button press?
		if (buttonPressed != null) {
			Utils.offEvent(Interaction.EVENT_PRESS,onInteraction);
			if (buttonPressed === 0) {
				Game.gameState.difficulty = Game.GAME_EASY;
			}
			else if (buttonPressed === 1) {
				Game.gameState.difficulty = Game.GAME_MEDIUM;
			}
			else if (buttonPressed === 2) {
				Game.gameState.difficulty = Game.GAME_HARD;
			}

			startWelcomeLeaving();
		}
	}

	function startWelcomeLeaving() {
		// disable any touch for right now
		Interaction.disableTouch();

		Game.gameState.welcomeWaiting = false;
		Game.gameState.welcomeLeaving = true;
		Game.gameState.welcomeLeavingTickCount = Game.gameState.welcomeEnteringTickCount;

		Game.gameState.RAFhook = requestAnimationFrame(runWelcomeLeaving);
	}

	function runWelcomeLeaving() {
		Debug.trackFramerate();

		Game.gameState.RAFhook = null;

		if (Game.gameState.welcomeLeaving) {
			Game.gameState.welcomeLeavingTickCount--;

			if (Game.gameState.welcomeLeavingTickCount >= 0) {
				var opacityThreshold = 17;
				var popThreshold = 12;
				var popRatio = 1.1;
				var opacity;
				var ratio;

				if (Game.gameState.welcomeLeavingTickCount <= opacityThreshold) {
					opacity = 1 - ((opacityThreshold-Game.gameState.welcomeLeavingTickCount) / opacityThreshold);
				}

				if (Game.gameState.welcomeLeavingTickCount <= popThreshold) {
					ratio = popRatio * (
						1 -
						((popThreshold-Game.gameState.welcomeLeavingTickCount) / popThreshold)
					);
				}
				else {
					ratio = popRatio - (
						(popRatio - 1) * (
							1 - (
								(Game.gameState.welcomeLeavingTickThreshold-Game.gameState.welcomeLeavingTickCount) /
								(Game.gameState.welcomeLeavingTickThreshold-popThreshold)
							)
						)
					);
				}

				drawWelcome(opacity,ratio);

				Game.gameState.RAFhook = requestAnimationFrame(runWelcomeLeaving);
			}
			else {
				EVT.emit("game:setup");
			}
		}
	}

	function drawWelcome(opacity,ratio) {
		ratio = (ratio != null) ? ratio : 1;
		opacity = (opacity != null) ? opacity: 1;

		EVT.emit("game:clear-scene");

		var screen = Screens.getWelcomeScreen();
		screen.x = (Browser.viewportDims.width-screen.cnv.width) / 2;
		screen.y = (Browser.viewportDims.height-screen.cnv.height) / 2;

		Game.sceneCtx.globalAlpha = opacity;

		if (ratio != 1) {
			Game.sceneCtx.save();
			Utils.scaleCanvas(Game.sceneCtx,Browser.viewportDims.width/2,Browser.viewportDims.height/2,ratio,ratio);
		}

		Game.sceneCtx.drawImage(screen.cnv,screen.x,screen.y);

		if (ratio != 1) {
			Game.sceneCtx.restore();
		}

		Game.sceneCtx.globalAlpha = 1;

		Debug.showInfo();
	}

})();
