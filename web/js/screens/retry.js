var RetryScreen = (function RetryScreen(){
	"use strict";

	var publicAPI,
		retryScreen,
		gotoWelcome = false;


	retryScreen = {
		src: "images/screens/retry.svg",
		width: 900,
		height: 600,
		hitAreas: [
			{ x1: 285, y1: 380, x2: 413, y2: 412, },	// best score badge
			{ x1: 110, y1: 450, x2: 430, y2: 580, },	// go back
			{ x1: 465, y1: 450, x2: 785, y2: 580, },	// fly again
		],
		scaled: {
			cnv: Browser.createCanvas(),
			ctx: null,
			hitAreas: [],
		}
	};

	retryScreen.scaled.ctx = retryScreen.scaled.cnv.getContext("2d");
	Screens.defineScreen("retry",retryScreen);


	publicAPI = {
		start: startRetryEntering,
		wait: waitAtRetryScreen,
	};

	return publicAPI;


	// ******************************

	function startRetryEntering() {
		// disable any touch for right now
		Interaction.disableTouch();

		Game.gameState.retryEntering = true;
		Game.gameState.retryEnteringTickCount = 0;
		Game.gameState.origDarknessRatio = Game.gameState.darknessRatio;

		Game.gameState.RAFhook = requestAnimationFrame(runRetryEntering);
	}

	function runRetryEntering() {
		Debug.trackFramerate();

		Game.gameState.RAFhook = null;

		if (Game.gameState.retryEntering) {
			Game.gameState.retryEnteringTickCount++;

			if (Game.gameState.retryEnteringTickCount <= (Game.gameState.retryEnteringTickThreshold + Game.gameState.shakeTickThreshold + 1)) {
				var fallingPosition = null;
				var gameOverPosition = null;
				var screenPosition = null;

				var darknessThreshold = 20;
				var fallingThreshold = 30;
				var startGameOverThreshold = 30;
				var endGameOverThreshold = Game.gameState.retryEnteringTickThreshold;
				var startScreenThreshold = 20;
				var endScreenThreshold = Game.gameState.retryEnteringTickThreshold;

				if (Game.gameState.retryEnteringTickCount <= darknessThreshold) {
					Game.gameState.darknessRatio =
						Game.gameState.origDarknessRatio *
						((darknessThreshold-Game.gameState.retryEnteringTickCount) / darknessThreshold);
				}
				else {
					Game.gameState.darknessRatio = 0;
				}

				if (Game.gameState.retryEnteringTickCount <= fallingThreshold) {
					fallingPosition = 1 - (
						(fallingThreshold-Game.gameState.retryEnteringTickCount) / fallingThreshold
					);
				}

				if (Game.gameState.retryEnteringTickCount >= startGameOverThreshold) {
					if (Game.gameState.retryEnteringTickCount <= endGameOverThreshold) {
						gameOverPosition = 1 - (
							(endGameOverThreshold-Game.gameState.retryEnteringTickCount) /
							(endGameOverThreshold-startGameOverThreshold)
						);
					}
					else {
						gameOverPosition = 1;
					}
				}

				if (Game.gameState.retryEnteringTickCount >= startScreenThreshold) {
					if (Game.gameState.retryEnteringTickCount <= endScreenThreshold) {
						screenPosition = 1 - (
							(endScreenThreshold-Game.gameState.retryEnteringTickCount) /
							(endScreenThreshold-startScreenThreshold)
						);
					}
					else {
						screenPosition = 1;
					}
				}

				if (
					Game.gameState.sceneShaking ||
					Game.gameState.retryEnteringTickCount >= Game.gameState.retryEnteringTickThreshold
				) {
					EVT.emit("game:shake");
				}

				drawRetry(fallingPosition,gameOverPosition,screenPosition);

				Game.gameState.RAFhook = requestAnimationFrame(runRetryEntering);
			}
			else {
				waitAtRetryScreen();
			}
		}
	}

	function waitAtRetryScreen() {
		// stop listening to ESC
		EVT.emit("game:cancel-keyboard-esc");

		Debug.resetFramerate();

		// re-enable touch
		Interaction.enableTouch();

		// draw retry screen
		Game.gameState.darknessRatio = 0;
		drawRetry(null,1,1);

		// recycle cloud objects
		EVT.emit("game:cleanup-recycle");

		if (!Game.gameState.retryWaiting) {
			Game.gameState.retryEntering = false;
			Game.gameState.retryWaiting = true;

			Utils.onEvent(Interaction.EVENT_PRESS,onInteraction);
		}
	}

	function onInteraction(evt) {
		var key;
		var buttonPressed;
		var screen = Screens.getRetryScreen();

		evt.preventDefault();

		if ((key = Interaction.detectKey(evt))) {
			if (key == Interaction.KEYBOARD_1 || key == Interaction.KEYBOARD_ESC) {
				buttonPressed = 1;
			}
			else if (key == Interaction.KEYBOARD_2 || key == Interaction.KEYBOARD_ENTER) {
				buttonPressed = 2;
			}
		}
		else if ((evt = Interaction.fixTouchCoords(evt))) {
			// note: hitAreas[0] is the location of the best-score badge
			for (var i=1; i<screen.hitAreas.length; i++) {
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
			if (buttonPressed === 1) {
				gotoWelcome = true;
				startRetryLeaving();
			}
			else if (buttonPressed === 2) {
				startRetryLeaving();
			}
		}
	}

	function startRetryLeaving() {
		// disable any touch for right now
		Interaction.disableTouch();

		Game.gameState.retryWaiting = false;
		Game.gameState.retryLeaving = true;
		Game.gameState.retryLeavingTickCount = 0;

		Game.gameState.RAFhook = requestAnimationFrame(runRetryLeaving);
	}

	function runRetryLeaving() {
		Debug.trackFramerate();

		Game.gameState.RAFhook = null;

		if (Game.gameState.retryLeaving) {
			Game.gameState.retryLeavingTickCount++;

			if (Game.gameState.retryLeavingTickCount <= Game.gameState.retryLeavingTickThreshold) {
				var y = Math.floor(
					-Browser.viewportDims.height *
					(Game.gameState.retryLeavingTickCount/Game.gameState.retryLeavingTickThreshold)
				);

				drawRetry(null,1,1,0,-y);

				Game.gameState.RAFhook = requestAnimationFrame(runRetryLeaving);
			}
			else if (gotoWelcome) {
				gotoWelcome = false;
				WelcomeScreen.start();
			}
			else {
				EVT.emit("game:setup");
			}
		}
	}

	function drawRetry(fallingPosition,gameOverPosition,screenPosition,leavingOffsetX,leavingOffsetY) {
		var cloud, bird;

		EVT.emit("game:clear-scene");

		// offset scene drawing for shaking
		if (Game.gameState.sceneShaking) {
			Game.sceneCtx.save();
			Game.sceneCtx.translate(Game.gameState.shakeOffsetX,Game.gameState.shakeOffsetY);
		}

		if (fallingPosition != null) {
			var height = Browser.viewportDims.height;
			if (Game.gameState.foregroundCloud.length > 0) {
				height = Math.max(height,Game.gameState.foregroundCloud[0].y+Game.gameState.foregroundCloud[0].cnv.height);
			}
			var yOffset = fallingPosition * -height;
			Game.sceneCtx.save();
			Game.sceneCtx.translate(0,yOffset);

			for (var i=0; i<Game.gameState.backgroundClouds.length; i++) {
				cloud = Game.gameState.backgroundClouds[i];
				Game.sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
			}

			for (var i=0; i<Game.gameState.gameClouds.length; i++) {
				cloud = Game.gameState.gameClouds[i];
				if (!cloud.hit) {
					Game.sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
				}
				else {
					Game.sceneCtx.drawImage(cloud.exploding.cnv,cloud.x,cloud.y);
				}
			}

			if (Game.gameState.birds.length > 0) {
				bird = Game.gameState.birds[0];
				Game.sceneCtx.drawImage(bird.cnv,bird.x,bird.y + bird.flappingOffsetY);
			}

			if (Game.gameState.foregroundCloud.length > 0) {
				cloud = Game.gameState.foregroundCloud[0];
				Game.sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
			}

			Game.sceneCtx.restore();
		}

		// gray out screen to simulate clouding out the sun
		EVT.emit("game:darken-scene");

		// offset scene for retry-leaving
		if (leavingOffsetX != null && leavingOffsetY != null) {
			Game.sceneCtx.save();
			Game.sceneCtx.translate(leavingOffsetX,leavingOffsetY);
		}

		// draw retry screen
		var screen = Screens.getRetryScreen();
		var startY = Browser.viewportDims.height;
		var endY = (Browser.viewportDims.height - screen.height) / 2;

		if (screenPosition != null) {
			screen.x = (Browser.viewportDims.width - screen.width) / 2;
			screen.y = startY + (screenPosition * (endY - startY));
			Game.sceneCtx.drawImage(screen.cnv,screen.x,screen.y,screen.width,screen.height);

			// calculate best-score dimensions
			var bestScoreBadgeX = screen.x + screen.hitAreas[0].x1;
			var bestScoreBadgeY = screen.y + screen.hitAreas[0].y1;
			var bestScoreBadgeWidth = screen.hitAreas[0].x2 - screen.hitAreas[0].x1 + 1;
			var bestScoreBadgeHeight = screen.hitAreas[0].y2 - screen.hitAreas[0].y1 + 1;

			var tmp0 = Text.getText("small","0")[0];
			var bestScoreDigits = Text.getText("small",String(Game.gameState.bestCloudScores[Game.gameState.difficulty]));

			var actualScoreWidth = 0;
			var actualScoreHeight = 0;
			for (var i=0; i<bestScoreDigits.length; i++) {
				actualScoreWidth += bestScoreDigits[i].width;
				actualScoreHeight = Math.max(actualScoreHeight,bestScoreDigits[i].height);
			}

			// sizing the score text to fit comfortably within the best-score badge
			var ratio = 0.9 * Math.min(
				bestScoreBadgeWidth / (tmp0.width * bestScoreDigits.length),
				bestScoreBadgeHeight / tmp0.height
			);
			var scoreHeight = Math.ceil(ratio * actualScoreHeight);
			var scoreWidth = Math.ceil(ratio * actualScoreWidth);
			var scoreX = bestScoreBadgeX + ((bestScoreBadgeWidth-scoreWidth) / 2);
			var scoreY = bestScoreBadgeY + ((bestScoreBadgeHeight-scoreHeight) / 2);

			// scale and cache all digits, if needed
			Utils.cacheScaledDigits("small","bestscore",ratio,scoreHeight);

			// display best-score text one character at a time
			for (var i=0; i<bestScoreDigits.length; i++) {
				var scoreDigit = String(Game.gameState.bestCloudScores[Game.gameState.difficulty]).charAt(i);
				var digitWidth = Math.ceil(bestScoreDigits[i].width * ratio);
				var scaledCachedDigit = Text.getCachedCharacter("bestscore:" + scoreDigit);

				// draw best-score character
				Game.sceneCtx.drawImage(scaledCachedDigit.cnv,scoreX,scoreY);
				scoreX += digitWidth;
			}
		}

		// draw game-over text
		if (gameOverPosition != null) {
			var gameOver = Screens.getElement("gameover");
			startY = -gameOver.scaled.height;
			endY = endY + gameOver.scaled.height;
			gameOver.y = startY + (gameOverPosition * (endY - startY));
			Game.sceneCtx.drawImage(gameOver.scaled.cnv,gameOver.x,gameOver.y);
		}

		// scoreboard and sun-meter
		EVT.emit("game:draw-status");

		// offset scene for retry-leaving
		if (leavingOffsetX != null && leavingOffsetY != null) {
			Game.sceneCtx.restore();
		}

		// offset scene drawing for shaking
		if (Game.gameState.sceneShaking) {
			Game.sceneCtx.restore();
		}

		Debug.showInfo();
	}

})();
