(function Game(){
	"use strict";

	var BUILD_NUMBER = "1.0.4",

		sceneCnv,
		sceneCtx,

		tmpCnv = Browser.createCanvas(),
		tmpCtx = tmpCnv.getContext("2d"),

		GAME_EASY = 0,
		GAME_MEDIUM = 1,
		GAME_HARD = 2,

		BACKGROUND_CLOUD = 0,
		GAME_CLOUD = 1,
		FOREGROUND_CLOUD = 2,

		gameState = {
			difficulty: GAME_EASY,
		},

		DEBUG = true,
		frameCount,
		framerate,
		framerateTimestamp;

	Browser.setupEvents(onViewportSize);

	resetFramerate();

	// initialize UI
	Promise.all([
		waitForDocument(),
		loadResources(),
		Browser.checkOrientation(),
	])
	.catch(function(err){
		console.log(err);
	})
	.then(snapToViewport)
	.then(initGame)
	.then(onViewportSize)
	.then(startWelcomeEntering);



	// ******************************

	// clear canvas
	function clearScene() {
		sceneCtx.fillStyle = "#BAE6F5";
		sceneCtx.fillRect(-20,-20,Browser.viewportDims.width+40,Browser.viewportDims.height+40);
	}

	function showFramerate() {
		sceneCtx.fillText(framerate + " fps",275,20);
	}

	function showBuild() {
		sceneCtx.fillText("Build: " + BUILD_NUMBER,150,20);
	}

	function showDebugInfo() {
		if (DEBUG) {
			sceneCtx.font = "20px sans-serif";
			sceneCtx.fillStyle = "white";

			showFramerate();
			showBuild();
		}
	}

	function waitForDocument() {
		return new Promise(function executor(resolve){
			if (!Browser.DOMReady) {
				Browser.onDOMReady(onDocument);
			}
			else {
				onDocument();
			}

			// ******************************

			function onDocument() {
				sceneCnv = Browser.getElement("[rel~=js-scene]");
				sceneCtx = sceneCnv.getContext("2d");
				resolve();
			}
		});
	}

	function loadResources() {
		return Promise.all([
			Plane.load(),
			Clouds.load(),
			Bird.load(),
			Text.load(),
			Screens.load(),
			PlayHint.load(),
		]);
	}

	function onPlayPress(evt) {
		evt.preventDefault();

		if (gameState.playing) {
			var key = Interaction.detectKey(evt);
			if (
				evt.type != "keydown" ||
				key == Interaction.KEYBOARD_SPACE
			) {
				gameState.engineRunning = true;
			}

			if (key == Interaction.KEYBOARD_ESC) {
				gameState.playing = false;
				waitAtRetryScreen();
			}
		}
	}

	function onPlayRelease(evt) {
		evt.preventDefault();

		if (gameState.playing &&
			(
				evt.type != "keydown" ||
				Interaction.detectKey(evt) == Interaction.KEYBOARD_SPACE
			)
		) {
			gameState.engineRunning = false;
		}
	}

	function manageBestCloudScore() {
		gameState.bestCloudScore[gameState.difficulty] =
			Math.max(
				gameState.cloudScore,
				gameState.bestCloudScore[gameState.difficulty]
			);
	}

	function waitAtWelcomeScreen() {
		// stop listening to ESC
		Utils.offEvent("keydown keypress",escapeCancelGame);

		var evtNames = "keydown keypress mousedown touchstart pointerstart";

		framerateTimestamp = frameCount = null;
		resetFramerate();

		// re-enable touch
		Interaction.enableTouch();

		// show screen
		drawWelcome();

		// recycle cloud objects
		cleanupRecycle();

		if (!gameState.welcomeWaiting) {
			gameState.welcomeEntering = false;
			gameState.welcomeWaiting = true;

			var screen = Screens.getWelcomeScreen();
			Utils.onEvent(evtNames,onInteraction);
		}


		// ******************************

		function onInteraction(evt) {
			var key;
			var buttonPressed;

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
			else if ((evt = Interaction.detectTouch(evt))) {
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
				Utils.offEvent(evtNames,onInteraction);
				if (buttonPressed === 0) {
					gameState.difficulty = GAME_EASY;
				}
				else if (buttonPressed === 1) {
					gameState.difficulty = GAME_MEDIUM;
				}
				else if (buttonPressed === 2) {
					gameState.difficulty = GAME_HARD;
				}
				startWelcomeLeaving();
			}
		}
	}

	function cleanupRecycle() {
		// recycle all remaining clouds
		for (var i=0; i<gameState.backgroundClouds.length; i++) {
			Clouds.recycleCloudObject(gameState.backgroundClouds[i]);
		}
		for (var i=0; i<gameState.gameClouds.length; i++) {
			Clouds.recycleCloudObject(gameState.gameClouds[i]);
		}
		for (var i=0; i<gameState.foregroundCloud.length; i++) {
			Clouds.recycleCloudObject(gameState.foregroundCloud[i]);
		}
		gameState.backgroundClouds.length = gameState.gameClouds.length =
			gameState.foregroundCloud.length = 0;
	}

	function waitAtRetryScreen() {
		// stop listening to ESC
		Utils.offEvent("keydown keypress",escapeCancelGame);

		var evtNames = "keydown keypress mousedown touchstart pointerstart";

		framerateTimestamp = frameCount = null;
		resetFramerate();

		// re-enable touch
		Interaction.enableTouch();

		// draw retry screen
		manageBestCloudScore();
		gameState.darknessRatio = 0;
		drawRetry(null,1,1);

		// recycle cloud objects
		cleanupRecycle();

		if (!gameState.retryWaiting) {
			gameState.retryEntering = false;
			gameState.retryWaiting = true;

			var screen = Screens.getRetryScreen();
			Utils.onEvent(evtNames,onInteraction);
		}


		// ******************************

		function onInteraction(evt) {
			var key;
			var buttonPressed;

			evt.preventDefault();

			if ((key = Interaction.detectKey(evt))) {
				if (key == Interaction.KEYBOARD_1 || key == Interaction.KEYBOARD_ESC) {
					buttonPressed = 1;
				}
				else if (key == Interaction.KEYBOARD_2 || key == Interaction.KEYBOARD_ENTER) {
					buttonPressed = 2;
				}
			}
			else if ((evt = Interaction.detectTouch(evt))) {
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
				Utils.offEvent(evtNames,onInteraction);
				if (buttonPressed === 1) {
					startRetryLeaving(/*gotoWelcome=*/true);
				}
				else if (buttonPressed === 2) {
					startRetryLeaving(/*gotoWelcome=*/false);
				}
			}
		}
	}

	function setupGame() {
		gameState.welcomeLeaving = false;
		gameState.retryLeaving = false;

		return Promise.resolve(initGame())
		.then(startPlayEntering);
	}

	function fillArray(arr,val,count) {
		arr.length = count;
		for (var i=0; i<count; i++) {
			arr[i] = val;
		}
		return arr;
	}

	function initGame() {
		gameState.RAFhook = null;

		gameState.bestCloudScore = gameState.bestCloudScore || {};
		gameState.bestCloudScore[GAME_EASY] = gameState.bestCloudScore[GAME_EASY] || 0;
		gameState.bestCloudScore[GAME_MEDIUM] = gameState.bestCloudScore[GAME_MEDIUM] || 0;
		gameState.bestCloudScore[GAME_HARD] = gameState.bestCloudScore[GAME_HARD] || 0;

		gameState.welcomeEntering = false;
		gameState.welcomeWaiting = false;
		gameState.welcomeLeaving = false;
		gameState.playEntering = false;
		gameState.playing = false;
		gameState.playLeaving = false;
		gameState.retryEntering = false;
		gameState.retryWaiting = false;
		gameState.retryLeaving = false;

		gameState.engineRunning = false;
		gameState.cloudScore = 0;

		gameState.planeY = 0;

		gameState.minAltitude = 0;
		gameState.maxAltitude = 1000;
		gameState.altitudeLevelOffThreshold = 850;
		gameState.altitude = 700;

		gameState.minVelocity = -25;
		gameState.maxVelocity = 15;
		gameState.velocity = 0;
		gameState.displayVelocity = 0;

		gameState.minPlaneAngle = -30;
		gameState.maxPlaneAngle = 18;
		gameState.planeAngle = 0;

		gameState.welcomeEnteringTickCount = 0;
		gameState.welcomeEnteringTickThreshold = 20;
		gameState.welcomeLeavingTickCount = gameState.welcomeEnteringTickThreshold;
		gameState.welcomeLeavingTickThreshold = gameState.welcomeEnteringTickThreshold;

		gameState.playEnteringTickCount = 0;
		gameState.playEnteringTickThreshold = 360;

		gameState.retryEnteringTickCount = 0;
		gameState.retryEnteringTickThreshold = 45;
		gameState.retryLeavingTickCount = 0;
		gameState.retryLeavingTickThreshold = 20;

		gameState.sunRatioTickCount = 0;
		gameState.sunRatioTickThreshold = 10;
		gameState.sunRatioBefore = null;
		gameState.sunRatioAfter = null;

		if (gameState.difficulty === GAME_EASY) {
			gameState.sunRatioThreshold = 0.01;
			gameState.darknessRatio = 0.35;
			gameState.cloudHistorySize = 5;
			gameState.cloudHistory = fillArray(gameState.cloudHistory || [],0,gameState.cloudHistorySize);
			calcSunRatio(/*immed=*/true);

			gameState.gravity = -0.45;
			gameState.engine = 1.9;

			gameState.gameCloudHitThreshold = 8;
			gameState.gameCloudTickCount = 0;
			gameState.gameCloudNewCloudThresholdMin = 180;
			gameState.gameCloudNewCloudThresholdMax = 240;
			gameState.gameCloudNewCloudThreshold = 180;
			gameState.gameCloudSpeed = Math.round(7 * gameState.speedRatio);
			gameState.gameCloudScaling = 1.1;

			// no foreground clouds in easy mode
			gameState.foregroundTickCount = 0;
			gameState.foregroundNewCloudThresholdMin = 0;
			gameState.foregroundNewCloudThresholdMax = 0;
			gameState.foregroundNewCloudThreshold = 0;
			gameState.foregroundCloudSpeed = 0;

			gameState.birdTickCount = 0;
			gameState.newBirdThresholdMin = 600;
			gameState.newBirdThresholdMax = 900;
			gameState.newBirdThreshold = 600;
			gameState.birdSpeed = Math.round(4 * gameState.speedRatio);
			gameState.birdFlappingThresholdRatio = 0.25;
			gameState.birdFlappingVelocity = Math.round(1 * gameState.speedRatio * 2) / 2;
		}
		else if (gameState.difficulty === GAME_MEDIUM) {
			gameState.sunRatioThreshold = 0.03;
			gameState.darknessRatio = 0.75;
			gameState.cloudKilledCredit = 1;
			gameState.cloudMissedCredit = 0;
			gameState.cloudHistorySize = 5;
			gameState.cloudHistory = fillArray(gameState.cloudHistory || [],gameState.cloudKilledCredit,gameState.cloudHistorySize);
			calcSunRatio(/*immed=*/true);

			gameState.gravity = -0.55;
			gameState.engine = 2.3;

			gameState.gameCloudHitThreshold = 11;
			gameState.gameCloudTickCount = 0;
			gameState.gameCloudNewCloudThresholdMin = 60;
			gameState.gameCloudNewCloudThresholdMax = 180;
			gameState.gameCloudNewCloudThreshold = 150;
			gameState.gameCloudSpeed = Math.round(9 * gameState.speedRatio);
			gameState.gameCloudScaling = 1;

			gameState.foregroundTickCount = 0;
			gameState.foregroundNewCloudThresholdMin = 420;
			gameState.foregroundNewCloudThresholdMax = 840;
			gameState.foregroundNewCloudThreshold = 420;
			gameState.foregroundCloudSpeed = Math.round(11 * gameState.speedRatio);

			gameState.birdTickCount = 0;
			gameState.newBirdThresholdMin = 200;
			gameState.newBirdThresholdMax = 300;
			gameState.newBirdThreshold = 250;
			gameState.birdSpeed = Math.round(7 * gameState.speedRatio);
			gameState.birdFlappingThresholdRatio = 0.5;
			gameState.birdFlappingVelocity = Math.round(3 * gameState.speedRatio * 2) / 2;
		}
		else if (gameState.difficulty === GAME_HARD) {
			gameState.sunRatioThreshold = 0.03;
			gameState.darknessRatio = 1;
			gameState.cloudKilledCredit = 1;
			gameState.cloudMissedCredit = -0.2;
			gameState.cloudHistorySize = 5;
			gameState.cloudHistory = fillArray(gameState.cloudHistory || [],gameState.cloudKilledCredit,gameState.cloudHistorySize);
			gameState.cloudHistory[gameState.cloudHistorySize-1] = gameState.cloudMissedCredit;
			calcSunRatio(/*immed=*/true);

			gameState.gravity = -0.85;
			gameState.engine = 2.4;

			gameState.gameCloudHitThreshold = 6;
			gameState.gameCloudTickCount = 0;
			gameState.gameCloudNewCloudThresholdMin = 35;
			gameState.gameCloudNewCloudThresholdMax = 110;
			gameState.gameCloudNewCloudThreshold = 75;
			gameState.gameCloudSpeed = Math.round(11 * gameState.speedRatio);
			gameState.gameCloudScaling = 0.75;

			gameState.foregroundTickCount = 0;
			gameState.foregroundNewCloudThresholdMin = 360;
			gameState.foregroundNewCloudThresholdMax = 780;
			gameState.foregroundNewCloudThreshold = 360;
			gameState.foregroundCloudSpeed = Math.round(7 * gameState.speedRatio);

			gameState.birdTickCount = 0;
			gameState.newBirdThresholdMin = 150;
			gameState.newBirdThresholdMax = 250;
			gameState.newBirdThreshold = 175;
			gameState.birdSpeed = Math.round(8 * gameState.speedRatio);
			gameState.birdFlappingThresholdRatio = 0.75;
			gameState.birdFlappingVelocity = Math.round(4 * gameState.speedRatio * 2) / 2;
		}

		(gameState.backgroundClouds = gameState.backgroundClouds || []).length = 0;
		(gameState.gameClouds = gameState.gameClouds || []).length = 0;
		(gameState.foregroundCloud = gameState.foregroundCloud || []).length = 0;
		(gameState.birds = gameState.birds || []).length = 0;

		gameState.backgroundTickCount = 0;
		gameState.backgroundNewCloudThresholdMin = 300;
		gameState.backgroundNewCloudThresholdMax = 600;
		gameState.backgroundNewCloudThreshold = 420;
		gameState.backgroundCloudSpeed = 1;
		gameState.backgroundCloudInitialCount = Math.round(6 * gameState.speedRatio);

		gameState.sceneShaking = false;
		gameState.shakeTickCount = 0;
		gameState.shakeTickThreshold = 10;
		gameState.shakeOffsetX = 0;
		gameState.shakeOffsetY = 0;
		gameState.shakeDeltaX = Math.min(-8,Math.round(-12 * gameState.speedRatio));
		gameState.shakeDeltaY = Math.min(-5,Math.round(-8 * gameState.speedRatio));
	}

	function startWelcomeEntering() {
		// disable any touch for right now
		Interaction.disableTouch();

		gameState.playHintShown = false;
		gameState.retryLeaving = false;
		gameState.playLeaving = false;
		gameState.welcomeEntering = true;
		gameState.welcomeEnteringTickCount = 0;

		gameState.RAFhook = requestAnimationFrame(runWelcomeEntering);
	}

	function startWelcomeLeaving() {
		// disable any touch for right now
		Interaction.disableTouch();

		gameState.welcomeWaiting = false;
		gameState.welcomeLeaving = true;
		gameState.welcomeLeavingTickCount = gameState.welcomeEnteringTickCount;

		gameState.RAFhook = requestAnimationFrame(runWelcomeLeaving);
	}

	function startPlayEntering() {
		// disable any touch for right now
		Interaction.disableTouch();

		// handle ESC during game
		Utils.onEvent("keydown keypress",escapeCancelGame);

		clearScene();

		// generate background clouds to start
		for (var i=0; i<gameState.backgroundCloudInitialCount; i++) {
			// generate a new cloud
			var cloud = Clouds.getCloud(BACKGROUND_CLOUD);

			// find a non-overlapping position for the new
			// cloud (to look nicer at start)
			positionBackgroundCloud(cloud);

			// save the new cloud (and position)
			gameState.backgroundClouds[i] = cloud;
		}

		gameState.welcomeWaiting = false;
		gameState.retryLeaving = false;
		gameState.playEntering = true;
		gameState.planeXStart = (gameState.planeX = -gameState.planeSize);
		gameState.planeY = altitudeToViewport(gameState.altitude);

		Plane.setAngle(gameState.planeAngle);
		PlayHint.scaleTo(gameState.planeSize * 1.5);

		gameState.RAFhook = requestAnimationFrame(runPlayEntering);
	}

	function startPlaying() {
		Interaction.enableTouch();

		gameState.playHintShown = true;
		gameState.playEntering = false;
		gameState.playing = true;
		Clouds.setCloudScaling(gameState.gameCloudScaling);

		Interaction.setupPlayInteraction(onPlayPress,onPlayRelease);

		gameState.RAFhook = requestAnimationFrame(runPlaying);
	}

	function startPlayLeaving() {
		// stop listening to ESC
		Utils.offEvent("keydown keypress",escapeCancelGame);

		Interaction.teardownPlayInteraction(onPlayPress,onPlayRelease);

		// disable any touch for right now
		Interaction.disableTouch();

		gameState.playing = false;
		gameState.playLeaving = true;
		gameState.engineRunning = false;
		gameState.minAltitude = -gameState.maxAltitude;
		gameState.engine = 0;
		gameState.gravity *= 2;
		gameState.minVelocity = -29;
		gameState.birdTickCount = 0;

		gameState.RAFhook = requestAnimationFrame(runPlayLeaving);
	}

	function startRetryEntering() {
		// disable any touch for right now
		Interaction.disableTouch();

		gameState.retryEntering = true;
		gameState.retryEnteringTickCount = 0;
		gameState.origDarknessRatio = gameState.darknessRatio;
		manageBestCloudScore();

		gameState.RAFhook = requestAnimationFrame(runRetryEntering);
	}

	function startRetryLeaving(gotoWelcome) {
		// disable any touch for right now
		Interaction.disableTouch();

		gameState.retryWaiting = false;
		gameState.retryLeaving = true;
		gameState.retryLeavingTickCount = 0;
		if (gotoWelcome) {
			gameState.gotoWelcome = true;
		}

		gameState.RAFhook = requestAnimationFrame(runRetryLeaving);
	}

	function runWelcomeEntering() {
		trackFramerate();

		gameState.RAFhook = null;

		if (gameState.welcomeEntering) {
			gameState.welcomeEnteringTickCount++;

			if (gameState.welcomeEnteringTickCount <= gameState.welcomeEnteringTickThreshold) {
				var opacityThreshold = 17;
				var popThreshold = 15;
				var popRatio = 1.1;
				var opacity;
				var ratio;

				if (gameState.welcomeEnteringTickCount <= opacityThreshold) {
					opacity = 1 - ((opacityThreshold-gameState.welcomeEnteringTickCount) / opacityThreshold);
				}

				if (gameState.welcomeEnteringTickCount <= popThreshold) {
					ratio = popRatio * (
						1 -
						((popThreshold-gameState.welcomeEnteringTickCount) / popThreshold)
					);
				}
				else {
					ratio = popRatio - (
						(popRatio - 1) * (
							1 - (
								(gameState.welcomeEnteringTickThreshold-gameState.welcomeEnteringTickCount) /
								(gameState.welcomeEnteringTickThreshold-popThreshold)
							)
						)
					);
				}

				drawWelcome(opacity,ratio);

				gameState.RAFhook = requestAnimationFrame(runWelcomeEntering);
			}
			else {
				waitAtWelcomeScreen();
			}
		}
	}

	function runWelcomeLeaving() {
		trackFramerate();

		gameState.RAFhook = null;

		if (gameState.welcomeLeaving) {
			gameState.welcomeLeavingTickCount--;

			if (gameState.welcomeLeavingTickCount >= 0) {
				var opacityThreshold = 17;
				var popThreshold = 12;
				var popRatio = 1.1;
				var opacity;
				var ratio;

				if (gameState.welcomeLeavingTickCount <= opacityThreshold) {
					opacity = 1 - ((opacityThreshold-gameState.welcomeLeavingTickCount) / opacityThreshold);
				}

				if (gameState.welcomeLeavingTickCount <= popThreshold) {
					ratio = popRatio * (
						1 -
						((popThreshold-gameState.welcomeLeavingTickCount) / popThreshold)
					);
				}
				else {
					ratio = popRatio - (
						(popRatio - 1) * (
							1 - (
								(gameState.welcomeLeavingTickThreshold-gameState.welcomeLeavingTickCount) /
								(gameState.welcomeLeavingTickThreshold-popThreshold)
							)
						)
					);
				}

				drawWelcome(opacity,ratio);

				gameState.RAFhook = requestAnimationFrame(runWelcomeLeaving);
			}
			else {
				setupGame();
			}
		}
	}

	function runPlayEntering() {
		trackFramerate();

		gameState.RAFhook = null;

		if (gameState.playEntering) {
			gameState.playEnteringTickCount++;

			if (gameState.playEnteringTickCount <= gameState.playEnteringTickThreshold) {
				if (!gameState.playHintShown) {
					var opacityTickThreshold = 60;
					var planeTickThreshold = opacityTickThreshold + 60;
					var hintTickThreshold = planeTickThreshold + 6;
					var hintCompleteThreshold = hintTickThreshold + 90;
					var hintFadeThreshold = hintCompleteThreshold + 30;
					var hintFadeCompleteThreshold = hintFadeThreshold + 30;
					var countdownTickThreshold = gameState.playEnteringTickThreshold - 180;

					var showSunMeter = gameState.playEnteringTickCount >= hintTickThreshold;
				}
				else {
					gameState.playEnteringTickThreshold = 210;

					var opacityTickThreshold = 60;
					var planeTickThreshold = opacityTickThreshold + 60;
					var hintTickThreshold = -1;
					var hintCompleteThreshold = -1;
					var hintFadeThreshold = -1;
					var hintFadeCompleteThreshold = -1;
					var countdownTickThreshold = gameState.playEnteringTickThreshold - 180;

					var showSunMeter = gameState.playEnteringTickCount >= planeTickThreshold;
				}

				var sceneOpacity = 1;
				// fade in the clouds?
				if (gameState.playEnteringTickCount < opacityTickThreshold) {
					sceneOpacity = gameState.playEnteringTickCount / opacityTickThreshold;
				}
				// slide in the plane?
				else if (gameState.playEnteringTickCount < planeTickThreshold) {
					gameState.planeX = Math.ceil(
						gameState.planeXStart +
						(
							(gameState.planeXThreshold - gameState.planeXStart) *
							(
								(gameState.playEnteringTickCount-opacityTickThreshold) /
								(planeTickThreshold-opacityTickThreshold)
							)
						)
					);
				}

				var hintOpacity = 0;
				if (gameState.playEnteringTickCount >= hintTickThreshold) {
					if (gameState.playEnteringTickCount < hintCompleteThreshold) {
						hintOpacity = 1;
						PlayHint.tick();
					}
					else if (gameState.playEnteringTickCount < hintFadeThreshold) {
						hintOpacity = 1;
					}
					else if (gameState.playEnteringTickCount < hintFadeCompleteThreshold) {
						hintOpacity = (hintFadeCompleteThreshold - gameState.playEnteringTickCount) / (hintFadeCompleteThreshold - hintFadeThreshold);
					}
				}

				// start countdown?
				var countdown = 0;
				if (gameState.playEnteringTickCount >= countdownTickThreshold) {
					countdown = Math.min(Math.max(
						Math.ceil(
							(gameState.playEnteringTickThreshold-gameState.playEnteringTickCount) / 60
						),
						1
					),3);
				}

				Plane.tick();
				backgroundTick();

				drawIntro(sceneOpacity,countdown,hintOpacity,showSunMeter);

				gameState.RAFhook = requestAnimationFrame(runPlayEntering);
			}
			else {
				startPlaying();
			}
		}
	}

	function runPlaying() {
		trackFramerate();

		gameState.RAFhook = null;

		if (gameState.playing) {
			gravity();
			if (gameState.engineRunning) {
				runEngine();
			}
			positionPlane();

			// keep playing?
			if (checkAltitude() && checkSun() && checkPlane()) {
				Plane.tick();
				backgroundTick();
				gameCloudTick();
				foregroundTick();
				birdTick();
				shakeTick();
				calcSunRatio();
				sunRatioTick();

				// paint the canvas
				drawGameScene();

				// keep going?
				if (gameState.playing) {
					gameState.RAFhook = requestAnimationFrame(runPlaying);
					return;
				}
			}
			else {
				shakeScene();
			}

			startPlayLeaving();
		}
	}

	function runPlayLeaving() {
		trackFramerate();

		gameState.RAFhook = null;

		if (gameState.playLeaving) {
			gravity();
			positionPlane();
			backgroundTick();
			gameCloudTick();
			foregroundTick();
			if (gameState.birds.length > 0) {
				if (!gameState.birds[0].dead) {
					birdTick();
				}
				else {
					killBirdTick();
				}
			}
			shakeTick();
			sunRatioTick();

			// paint the canvas
			drawGameScene();

			// plane still dropping off screen?
			if (altitudeToViewport(gameState.altitude) < Browser.viewportDims.height) {
				gameState.RAFhook = requestAnimationFrame(runPlayLeaving);
			}
			// start retry entry sequence
			else {
				startRetryEntering();
			}
		}
	}

	function runRetryEntering() {
		trackFramerate();

		gameState.RAFhook = null;

		if (gameState.retryEntering) {
			gameState.retryEnteringTickCount++;

			if (gameState.retryEnteringTickCount <= (gameState.retryEnteringTickThreshold + gameState.shakeTickThreshold)) {
				var fallingPosition = null;
				var gameOverPosition = null;
				var screenPosition = null;

				var darknessThreshold = 20;
				var fallingThreshold = 30;
				var startGameOverThreshold = 30;
				var endGameOverThreshold = gameState.retryEnteringTickThreshold;
				var startScreenThreshold = 20;
				var endScreenThreshold = gameState.retryEnteringTickThreshold;

				if (gameState.retryEnteringTickCount <= darknessThreshold) {
					gameState.darknessRatio =
						gameState.origDarknessRatio *
						((darknessThreshold-gameState.retryEnteringTickCount) / darknessThreshold);
				}
				else {
					gameState.darknessRatio = 0;
				}

				if (gameState.retryEnteringTickCount <= fallingThreshold) {
					fallingPosition = 1 - (
						(fallingThreshold-gameState.retryEnteringTickCount) / fallingThreshold
					);
				}

				if (gameState.retryEnteringTickCount >= startGameOverThreshold) {
					if (gameState.retryEnteringTickCount <= endGameOverThreshold) {
						gameOverPosition = 1 - (
							(endGameOverThreshold-gameState.retryEnteringTickCount) /
							(endGameOverThreshold-startGameOverThreshold)
						);
					}
					else {
						gameOverPosition = 1;
					}
				}

				if (gameState.retryEnteringTickCount >= startScreenThreshold) {
					if (gameState.retryEnteringTickCount <= endScreenThreshold) {
						screenPosition = 1 - (
							(endScreenThreshold-gameState.retryEnteringTickCount) /
							(endScreenThreshold-startScreenThreshold)
						);
					}
					else {
						screenPosition = 1;
					}
				}

				if (gameState.retryEnteringTickCount === gameState.retryEnteringTickThreshold) {
					shakeScene();
				}
				else if (gameState.retryEnteringTickCount > gameState.retryEnteringTickThreshold) {
					shakeTick();
				}

				drawRetry(fallingPosition,gameOverPosition,screenPosition);

				gameState.RAFhook = requestAnimationFrame(runRetryEntering);
			}
			else {
				waitAtRetryScreen();
			}
		}
	}

	function runRetryLeaving() {
		trackFramerate();

		gameState.RAFhook = null;

		if (gameState.retryLeaving) {
			gameState.retryLeavingTickCount++;

			if (gameState.retryLeavingTickCount <= gameState.retryLeavingTickThreshold) {
				var y = Math.floor(
					-Browser.viewportDims.height *
					(gameState.retryLeavingTickCount/gameState.retryLeavingTickThreshold)
				);

				drawRetry(null,1,1,0,-y);

				gameState.RAFhook = requestAnimationFrame(runRetryLeaving);
			}
			else if (gameState.gotoWelcome) {
				gameState.gotoWelcome = false;
				startWelcomeEntering();
			}
			else {
				setupGame();
			}
		}
	}

	function drawWelcome(opacity,ratio) {
		ratio = (ratio != null) ? ratio : 1;
		opacity = (opacity != null) ? opacity: 1;

		clearScene();

		var screen = Screens.getWelcomeScreen();
		screen.x = (Browser.viewportDims.width-screen.cnv.width) / 2;
		screen.y = (Browser.viewportDims.height-screen.cnv.height) / 2;

		sceneCtx.globalAlpha = opacity;

		if (ratio != 1) {
			sceneCtx.save();
			Utils.scaleCanvas(sceneCtx,Browser.viewportDims.width/2,Browser.viewportDims.height/2,ratio,ratio);
		}

		sceneCtx.drawImage(screen.cnv,screen.x,screen.y);

		if (ratio != 1) {
			sceneCtx.restore();
		}

		sceneCtx.globalAlpha = 1;

		showDebugInfo();
	}

	function drawIntro(drawOpacity,countdown,hintOpacity,showSunMeter) {
		var cloud;

		clearScene();

		sceneCtx.globalAlpha = drawOpacity;

		for (var i=0; i<gameState.backgroundClouds.length; i++) {
			cloud = gameState.backgroundClouds[i];
			sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
		}

		sceneCtx.globalAlpha = 1;

		var plane = Plane.getPlane();
		sceneCtx.drawImage(plane.cnv,gameState.planeX,gameState.planeY);

		// gray out screen to simulate clouding out the sun
		darkenScene(drawOpacity);

		if (hintOpacity > 0) {
			sceneCtx.globalAlpha = hintOpacity;
			var hint = PlayHint.getHint();
			var planeHeight = Plane.getScaledHeight();
			sceneCtx.drawImage(hint.cnv,gameState.planeXThreshold + gameState.planeSize,gameState.planeY + (planeHeight / 3));
			sceneCtx.globalAlpha = 1;
		}

		if (showSunMeter) {
			// scoreboard and sun-meter
			drawGameStatus();
		}

		if (countdown) {
			var numChar = Text.getCachedCharacter("countdown:" + countdown);
			var x = ((Browser.viewportDims.width - numChar.cnv.width) / 2);
			var y = 25;

			sceneCtx.drawImage(numChar.cnv,x,y,numChar.cnv.width,numChar.cnv.height);
		}

		showDebugInfo();
	}

	function drawGameScene() {
		var cloud, bird;

		clearScene();

		// offset scene drawing for shaking
		if (gameState.sceneShaking) {
			sceneCtx.save();
			sceneCtx.translate(gameState.shakeOffsetX,gameState.shakeOffsetY);
		}

		for (var i=0; i<gameState.backgroundClouds.length; i++) {
			cloud = gameState.backgroundClouds[i];
			sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
		}

		var plane = Plane.getPlane();
		sceneCtx.drawImage(plane.cnv,gameState.planeX,gameState.planeY);

		for (var i=0; i<gameState.gameClouds.length; i++) {
			cloud = gameState.gameClouds[i];
			if (!cloud.hit) {
				sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);

				// draw target on top of game cloud?
				if (cloud.target.scale) {
					var targetWidth = cloud.target.cnv.width * cloud.target.scale;
					var targetHeight = cloud.target.cnv.height * cloud.target.scale;
					var targetX = cloud.target.x + (cloud.target.cnv.width / 2) - (targetWidth / 2);
					var targetY = cloud.target.y + (cloud.target.cnv.height / 2) - (targetHeight / 2);
					sceneCtx.drawImage(cloud.target.cnv,cloud.x+targetX,cloud.y+targetY,targetWidth,targetHeight);
				}
			}
			else {
				sceneCtx.drawImage(cloud.exploding.cnv,cloud.x,cloud.y);
			}
		}

		if (gameState.birds.length > 0) {
			bird = gameState.birds[0];
			if (!bird.dead) {
				sceneCtx.drawImage(bird.cnv,bird.x,bird.y + bird.flappingOffsetY);
			}
			else {
				sceneCtx.save();
				Utils.rotateCanvas(sceneCtx,bird.x + bird.originX,bird.y + bird.flappingOffsetY + bird.originY,bird.angle);
				sceneCtx.drawImage(bird.cnv,bird.x,bird.y + bird.flappingOffsetY);
				sceneCtx.restore();
			}
		}

		if (gameState.foregroundCloud.length > 0) {
			cloud = gameState.foregroundCloud[0];
			sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
		}

		// gray out screen to simulate clouding out the sun
		darkenScene();

		// scoreboard and sun-meter
		drawGameStatus();

		// offset scene drawing for shaking
		if (gameState.sceneShaking) {
			sceneCtx.restore();
		}

		showDebugInfo();
	}

	function darkenScene(drawOpacity) {
		drawOpacity = (drawOpacity != null) ? drawOpacity : 1;
		if (gameState.sunRatio < 1) {
			var overflow = Math.max(Math.abs(gameState.shakeDeltaX),Math.abs(gameState.shakeDeltaY));
			var curAlpha = sceneCtx.globalAlpha;
			sceneCtx.globalAlpha = (0.6 - (0.6 * gameState.sunRatio)) * gameState.darknessRatio * drawOpacity;
			sceneCtx.fillStyle = "black";
			sceneCtx.fillRect(0-overflow,0-overflow,Browser.viewportDims.width+(2*overflow),Browser.viewportDims.height+(2*overflow));
			sceneCtx.globalAlpha = curAlpha;
		}
	}

	function drawGameStatus() {
		// draw scoreboard
		sceneCtx.globalAlpha = 0.9;
		var scoreboard = Screens.getElement("scoreboard");
		sceneCtx.drawImage(scoreboard.scaled.cnv,scoreboard.x,scoreboard.y);
		sceneCtx.globalAlpha = 1;

		// calculate score dimensions
		var tmp0 = Text.getText("small","0")[0];
		var scoreDigits = Text.getText("small",String(gameState.cloudScore));

		var actualScoreWidth = 0;
		var actualScoreHeight = 0;
		for (var i=0; i<scoreDigits.length; i++) {
			actualScoreWidth += scoreDigits[i].width;
			actualScoreHeight = Math.max(actualScoreHeight,scoreDigits[i].height);
		}

		// sizing the score text to fit comfortably within the scoreboard
		var ratio = (scoreDigits.length === 1) ?
				0.5 * scoreboard.scaled.size / tmp0.height :
				0.55 * scoreboard.scaled.size / (tmp0.width * scoreDigits.length);
		var scoreWidth = Math.ceil(ratio * actualScoreWidth);
		var scoreHeight = Math.ceil(ratio * actualScoreHeight);
		var scoreX = scoreboard.x + ((scoreboard.scaled.size-scoreWidth) / 2);
		var scoreY = scoreboard.y + ((scoreboard.scaled.size-scoreHeight) / 2);

		// scale and cache all digits, if needed
		cacheScaledDigits("small","scoreboard",ratio,scoreHeight);

		// display score text one character at a time
		for (var i=0; i<scoreDigits.length; i++) {
			var scoreDigit = String(gameState.cloudScore).charAt(i);
			var digitWidth = Math.ceil(scoreDigits[i].width * ratio);
			var scaledCachedDigit = Text.getCachedCharacter("scoreboard:" + scoreDigit);

			// draw score character
			sceneCtx.drawImage(scaledCachedDigit.cnv,scoreX,scoreY);
			scoreX += digitWidth;
		}

		// draw sun-meter
		var sunMeter = Screens.getElement("sunMeter");
		var sunMeterBar = Screens.getElement("sunMeterBar");
		var sunMeterBarTop = Screens.getElement("sunMeterBarTop");
		var ratio = sunMeter.scaled.height / sunMeter.height;
		var sunMeterX = scoreboard.x + ((scoreboard.scaled.size - sunMeter.scaled.width) / 2);
		var sunMeterY = scoreboard.y + scoreboard.scaled.size + 10;

		tmpCtx.globalAlpha = 1;
		tmpCnv.width = sunMeter.scaled.width;
		tmpCnv.height = sunMeter.scaled.height;
		tmpCtx.drawImage(sunMeter.scaled.cnv,0,0);

		// draw bar for sun-meter
		var barY2 = Math.ceil(sunMeterBar.bar.y2 * ratio);
		var barHeight = Math.max(0,Math.ceil((sunMeterBar.bar.y2-sunMeterBar.bar.y1+1) * ratio * gameState.sunRatio) - sunMeterBarTop.scaled.cnv.height);

		tmpCtx.save();
		tmpCtx.beginPath();
		tmpCtx.rect(0,barY2-barHeight,sunMeter.scaled.width,barHeight);
		tmpCtx.clip();
		tmpCtx.drawImage(sunMeterBar.scaled.cnv,0,0);
		tmpCtx.restore();
		tmpCtx.drawImage(sunMeterBarTop.scaled.cnv,0,barY2-barHeight-sunMeterBarTop.scaled.cnv.height);

		sceneCtx.globalAlpha = 0.9;
		sceneCtx.drawImage(tmpCnv,sunMeterX,sunMeterY);
		sceneCtx.globalAlpha = 1;
	}

	function drawRetry(fallingPosition,gameOverPosition,screenPosition,leavingOffsetX,leavingOffsetY) {
		var cloud, bird;

		clearScene();

		// offset scene drawing for shaking
		if (gameState.sceneShaking) {
			sceneCtx.save();
			sceneCtx.translate(gameState.shakeOffsetX,gameState.shakeOffsetY);
		}

		if (fallingPosition != null) {
			var height = Browser.viewportDims.height;
			if (gameState.foregroundCloud.length > 0) {
				height = Math.max(height,gameState.foregroundCloud[0].y+gameState.foregroundCloud[0].cnv.height);
			}
			var yOffset = fallingPosition * -height;
			sceneCtx.save();
			sceneCtx.translate(0,yOffset);

			for (var i=0; i<gameState.backgroundClouds.length; i++) {
				cloud = gameState.backgroundClouds[i];
				sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
			}

			for (var i=0; i<gameState.gameClouds.length; i++) {
				cloud = gameState.gameClouds[i];
				if (!cloud.hit) {
					sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
				}
				else {
					sceneCtx.drawImage(cloud.exploding.cnv,cloud.x,cloud.y);
				}
			}

			if (gameState.birds.length > 0) {
				bird = gameState.birds[0];
				sceneCtx.drawImage(bird.cnv,bird.x,bird.y + bird.flappingOffsetY);
			}

			if (gameState.foregroundCloud.length > 0) {
				cloud = gameState.foregroundCloud[0];
				sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
			}

			sceneCtx.restore();
		}

		// gray out screen to simulate clouding out the sun
		darkenScene();

		// offset scene for retry-leaving
		if (leavingOffsetX != null && leavingOffsetY != null) {
			sceneCtx.save();
			sceneCtx.translate(leavingOffsetX,leavingOffsetY);
		}

		// draw retry screen
		var screen = Screens.getRetryScreen();
		var startY = Browser.viewportDims.height;
		var endY = (Browser.viewportDims.height - screen.height) / 2;

		if (screenPosition != null) {
			screen.x = (Browser.viewportDims.width - screen.width) / 2;
			screen.y = startY + (screenPosition * (endY - startY));
			sceneCtx.drawImage(screen.cnv,screen.x,screen.y,screen.width,screen.height);

			// calculate best-score dimensions
			var bestScoreBadgeX = screen.x + screen.hitAreas[0].x1;
			var bestScoreBadgeY = screen.y + screen.hitAreas[0].y1;
			var bestScoreBadgeWidth = screen.hitAreas[0].x2 - screen.hitAreas[0].x1 + 1;
			var bestScoreBadgeHeight = screen.hitAreas[0].y2 - screen.hitAreas[0].y1 + 1;

			var tmp0 = Text.getText("small","0")[0];
			var bestScoreDigits = Text.getText("small",String(gameState.bestCloudScore[gameState.difficulty]));

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
			cacheScaledDigits("small","bestscore",ratio,scoreHeight);

			// display best-score text one character at a time
			for (var i=0; i<bestScoreDigits.length; i++) {
				var scoreDigit = String(gameState.bestCloudScore[gameState.difficulty]).charAt(i);
				var digitWidth = Math.ceil(bestScoreDigits[i].width * ratio);
				var scaledCachedDigit = Text.getCachedCharacter("bestscore:" + scoreDigit);

				// draw best-score character
				sceneCtx.drawImage(scaledCachedDigit.cnv,scoreX,scoreY);
				scoreX += digitWidth;
			}
		}

		// draw game-over text
		if (gameOverPosition != null) {
			var gameOver = Screens.getElement("gameover");
			startY = -gameOver.scaled.height;
			endY = endY + gameOver.scaled.height;
			gameOver.y = startY + (gameOverPosition * (endY - startY));
			sceneCtx.drawImage(gameOver.scaled.cnv,gameOver.x,gameOver.y);
		}

		// scoreboard and sun-meter
		drawGameStatus();

		// offset scene for retry-leaving
		if (leavingOffsetX != null && leavingOffsetY != null) {
			sceneCtx.restore();
		}

		// offset scene drawing for shaking
		if (gameState.sceneShaking) {
			sceneCtx.restore();
		}

		showDebugInfo();
	}

	function cacheScaledDigits(textType,cacheIDPrefix,scaleRatio,digitHeight) {
		var digits = Text.getText(textType,"0123456789");

		for (var i=0; i<=9; i++) {
			var digit = String(i);
			var cacheItem = Text.getCachedCharacter(cacheIDPrefix + ":" + digit);
			var digitImg = digits[i];
			var digitWidth = Math.ceil(digitImg.width * scaleRatio);

			// need to (re)cache digit?
			if (cacheItem.cnv.width != digitWidth || cacheItem.cnv.height != digitHeight) {
				cacheItem.cnv.width = digitWidth;
				cacheItem.cnv.height = digitHeight;
				cacheItem.ctx.drawImage(digitImg,0,0,digitWidth,digitHeight);
			}
			// digits already cached for this size, so bail
			else {
				return;
			}
		}
	}

	function shakeScene() {
		gameState.sceneShaking = true;
	}

	function positionPlane() {
		gameState.altitude = constrainAltitude(
			// snap to 0.5 increments
			Math.round(2 * (gameState.altitude + gameState.velocity)) / 2
		);
		gameState.planeY = altitudeToViewport(gameState.altitude);

		gameState.displayVelocity = constrainDisplayVelocity(gameState.velocity);

		// set angle of plane -- moving upward?
		if (gameState.velocity >= 0) {
			gameState.planeAngle = gameState.maxPlaneAngle * (gameState.displayVelocity / gameState.maxVelocity);
		}
		// moving downward
		else {
			gameState.planeAngle = gameState.minPlaneAngle * (gameState.displayVelocity / gameState.minVelocity);
		}

		Plane.setAngle(gameState.planeAngle);
	}

	function checkAltitude() {
		return (gameState.altitude >= 0.5);
	}

	function checkSun() {
		return (gameState.sunRatio >= gameState.sunRatioThreshold);
	}

	function checkPlane() {
		var planeHitAreas = Plane.getHitAreas(), pha;

		// any bird(s) that could run into the plane?
		for (var i=0; i<gameState.birds.length; i++) {
			var bird = gameState.birds[i];

			// bird near the plane?
			if (
				(bird.x > (gameState.planeX - 20)) &&
				(bird.x < (gameState.planeX + gameState.planeSize + 20))
			) {
				var birdHitAreas = Bird.getHitAreas(), bha;
				for (var j=0; j<planeHitAreas.length; j++) {
					pha = planeHitAreas[j];
					for (var k=0; k<birdHitAreas.length; k++) {
						bha = birdHitAreas[k];
						if (Utils.rectangleCollision(
							gameState.planeX + pha.x1, gameState.planeY + pha.y1, gameState.planeX + pha.x2, gameState.planeY + pha.y2,
							bird.x + bha.x1, bird.y + bird.flappingOffsetY + bha.y1, bird.x + bha.x2, bird.y + bird.flappingOffsetY + bha.y2
						)) {
							bird.dead = true;
							gameState.birdSpeed *= 2;
							gameState.playing = false;
							shakeScene();
							return false;
						}
					}
				}
			}
		}

		// plane's propeller
		pha = planeHitAreas[0];

		// any clouds that could be hit by the plane's propeller
		for (var i=0; i<gameState.gameClouds.length; i++) {
			var cloud = gameState.gameClouds[i];

			for (var j=0; j<cloud.hitAreas.length; j++) {
				var cha = cloud.hitAreas[j];
				if (Utils.rectangleOcclusion(
					gameState.planeX + pha.x1, gameState.planeY + pha.y1, gameState.planeX + pha.x2, gameState.planeY + pha.y2,
					cloud.x + cha.x1, cloud.y + cha.y1, cloud.x + cha.x2, cloud.y + cha.y2
				)) {
					cloud.propHit = (cloud.propHit || 0) + 1;
				}
			}

			if (cloud.propHit >= gameState.gameCloudHitThreshold && !cloud.hit) {
				cloud.hit = true;

				// start exploding cloud
				gameState.gameClouds[i].explodeTickCount = 0;
				updateExplodingCloud(gameState.gameClouds[i]);

				gameState.cloudScore++;
				updateCloudHistory(/*killedCloud=*/true);
			}
		}

		return true;
	}

	function constrainValueToRange(val,min,max) {
		return Math.max(min,Math.min(max,val));
	}

	function constrainAltitude(altd) {
		return constrainValueToRange(
			altd,
			gameState.minAltitude,
			gameState.maxAltitude
		);
	}

	function constrainVelocity(vel) {
		vel = constrainValueToRange(
			vel,
			gameState.minVelocity,
			gameState.maxVelocity
		);

		// level off plane as it approaches the top?
		if (gameState.engineRunning &&
			vel >= gameState.gravity &&
			gameState.altitude >= gameState.altitudeLevelOffThreshold
		) {
			vel = Math.max(
				-gameState.gravity,
				vel + (-(vel+gameState.gravity) * ease(gameState.altitude - gameState.altitudeLevelOffThreshold,gameState.maxAltitude))
			);

			if (gameState.altitude == gameState.maxAltitude) {
				vel = -gameState.gravity;
			}
		}

		return vel;
	}

	function constrainDisplayVelocity(vel) {
		// level off plane as it approaches the top?
		if (gameState.engineRunning &&
			vel >= 0 &&
			gameState.altitude >= gameState.altitudeLevelOffThreshold
		) {
			vel = Math.max(
				0,
				vel +
					(-vel * ease(
						gameState.altitude -
						gameState.altitudeLevelOffThreshold,gameState.maxAltitude -
						gameState.altitudeLevelOffThreshold +
						/*fudgingFactor=*/100
					))
			);

			if (gameState.altitude == gameState.maxAltitude) {
				vel = 0;
			}
		}

		return vel;
	}

	function ease(t,d) {
		return (t / d);
	}

	function snapToViewport() {
		Browser.updateViewportDims();

		if (!Browser.orientationLocked) {
			var minRatio = 0.5;
			var maxRatio = 0.75;
			var ratio = Browser.viewportDims.height / Browser.viewportDims.width;

			if (ratio > maxRatio) {
				Browser.viewportDims.height = Math.floor(Browser.viewportDims.width * maxRatio);
			}
			else if (ratio < minRatio) {
				Browser.viewportDims.width = Math.floor(Browser.viewportDims.height / minRatio);
			}

			scene.style.width = Browser.viewportDims.width + "px";
			scene.style.height = Browser.viewportDims.height + "px;";
		}

		if (sceneCnv.width !== Browser.viewportDims.width || sceneCnv.height !== Browser.viewportDims.height) {
			sceneCnv.width = Browser.viewportDims.width;
			sceneCnv.height = Browser.viewportDims.height;
		}
	}

	function onViewportSize() {
		snapToViewport();

		// recalc some metrics
		gameState.speedRatio = Browser.viewportDims.width / 1200;
		gameState.planeSize = Math.floor(Browser.viewportDims.height / 3);
		gameState.planeXThreshold = Math.round(gameState.planeSize / 1.8);

		// scale stuff
		Screens.scaleTo(
			Math.floor(Browser.viewportDims.width * 0.95),
			Math.floor(Browser.viewportDims.height * 0.95)
		);

		Plane.scaleTo(gameState.planeSize);

		var planeHeight = Plane.getScaledHeight();
		Browser.viewportDims.playHeight = Browser.viewportDims.height - (planeHeight / 2);
		Browser.viewportDims.playHeightRatio = Browser.viewportDims.playHeight / gameState.maxAltitude;

		Bird.scaleTo(Math.floor(gameState.planeSize / 3.5));

		// scale (and cache!) scoreboard
		var scoreboard = Screens.getElement("scoreboard");
		scoreboard.x = scoreboard.y = 5;
		scoreboard.scaled.size = Math.ceil(gameState.planeXThreshold * 0.8);
		scoreboard.scaled.cnv.width = scoreboard.scaled.cnv.height = scoreboard.scaled.size;
		scoreboard.scaled.ctx.drawImage(scoreboard.img,0,0,scoreboard.scaled.size,scoreboard.scaled.size);

		// scale (and cache!) sun-meter, sun-meter-bar, and sun-meter-bar-top
		var sunMeter = Screens.getElement("sunMeter");
		var sunMeterBar = Screens.getElement("sunMeterBar");
		var sunMeterBarTop = Screens.getElement("sunMeterBarTop");
		sunMeter.scaled.height = Math.ceil((Browser.viewportDims.height - scoreboard.scaled.size - scoreboard.y) * 0.7);
		sunMeter.scaled.width = Math.ceil(sunMeter.width * (sunMeter.scaled.height / sunMeter.height));
		sunMeter.scaled.cnv.width = sunMeterBar.scaled.cnv.width = sunMeter.scaled.width;
		sunMeter.scaled.cnv.height = sunMeterBar.scaled.cnv.height = sunMeter.scaled.height;
		sunMeterBarTop.scaled.cnv.width = sunMeter.scaled.width;
		sunMeterBarTop.scaled.cnv.height = Math.ceil(sunMeterBarTop.height * (sunMeter.scaled.width / sunMeterBarTop.width));
		sunMeter.scaled.ctx.drawImage(sunMeter.img,0,0,sunMeter.scaled.width,sunMeter.scaled.height);
		sunMeterBar.scaled.ctx.drawImage(sunMeterBar.img,0,0,sunMeter.scaled.width,sunMeter.scaled.height);
		sunMeterBarTop.scaled.ctx.drawImage(sunMeterBarTop.img,0,0,sunMeterBarTop.scaled.cnv.width,sunMeterBarTop.scaled.cnv.height);

		// scale (and cache!) game-over text
		var screen = Screens.getRetryScreen();
		var gameOver = Screens.getElement("gameover");
		gameOver.scaled.width = screen.width * 0.71;
		gameOver.scaled.height = (gameOver.scaled.width / gameOver.width) * gameOver.height;
		gameOver.scaled.cnv.width = gameOver.scaled.width;
		gameOver.scaled.cnv.height = gameOver.scaled.height;
		gameOver.x = (Browser.viewportDims.width - gameOver.scaled.width) / 2;
		gameOver.scaled.ctx.drawImage(gameOver.img,0,0,gameOver.scaled.width,gameOver.scaled.height);

		// scale and cache all countdown digits, if needed
		var tmp0 = Text.getText("big","0")[0];
		var ratio = gameState.planeSize / tmp0.width / 2.5;
		cacheScaledDigits("big","countdown",ratio,Math.ceil(tmp0.height * ratio));

		// resize during animation not supported
		if (gameState.playEntering || gameState.playing || gameState.playLeaving ||
			gameState.retryEntering || gameState.retryWaiting || gameState.retryLeaving
		) {
			if (gameState.playing) {
				teardownPlayInteraction();
			}
			gameState.playEntering = false;
			gameState.playing = false;
			gameState.playLeaving = false;
			gameState.retryEntering = false;
			gameState.retryLeaving = false;

			// cancel queued tick action, if any
			if (gameState.RAFhook) {
				cancelAnimationFrame(gameState.RAFhook);
				gameState.RAFhook = null;
			}

			waitAtRetryScreen();
		}
		else if (gameState.welcomeEntering || gameState.welcomeWaiting || gameState.welcomeLeaving) {
			gameState.welcomeEntering = false;
			gameState.welcomeLeaving = false;

			// cancel queued tick action, if any
			if (gameState.RAFhook) {
				cancelAnimationFrame(gameState.RAFhook);
				gameState.RAFhook = null;
			}

			waitAtWelcomeScreen();
		}
	}

	function altitudeToViewport(altd) {
		var planeHeight = Plane.getScaledHeight();

		return Math.floor(
			Browser.viewportDims.playHeight -
			(altd * Browser.viewportDims.playHeightRatio) -
			(planeHeight / 4)
		);
	}

	function gravity() {
		gameState.velocity = constrainVelocity(
			gameState.velocity + gameState.gravity
		);
	}

	function runEngine() {
		gameState.velocity = constrainVelocity(
			gameState.velocity + gameState.engine
		);
	}

	function calcSunRatio(immed) {
		var newRatio;

		if (gameState.difficulty === GAME_EASY) {
			newRatio = Math.min(
				1,
				Math.max(0,gameState.cloudHistory.length / gameState.cloudHistorySize)
			);
		}
		else {
			var count = 0;
			var max = 0;
			for (var i=0; i<gameState.cloudHistory.length; i++) {
				var credit = (i+1) / (gameState.cloudHistory.length+1);
				max += credit;
				count += (gameState.cloudHistory[i] * credit);
			}
			newRatio = Math.min(1,Math.max(0,count / max));
		}

		if (immed) {
			gameState.sunRatio = newRatio;
		}
		else if (newRatio != gameState.sunRatio) {
			gameState.sunRatioBefore = gameState.sunRatio;
			gameState.sunRatioAfter = newRatio;
		}
	}

	function sunRatioTick() {
		if (gameState.sunRatioBefore != null && gameState.sunRatioAfter != null) {
			gameState.sunRatioTickCount++;

			if (gameState.sunRatioTickCount >= gameState.sunRatioTickThreshold) {
				gameState.sunRatio = gameState.sunRatioAfter;
				gameState.sunRatioBefore = gameState.sunRatioAfter = null;
				gameState.sunRatioTickCount = 0;
			}
			else {
				gameState.sunRatio = gameState.sunRatioBefore + (
					(gameState.sunRatioAfter - gameState.sunRatioBefore) *
					(gameState.sunRatioTickCount / gameState.sunRatioTickThreshold)
				);
			}
		}
	}

	function updateCloudHistory(killedCloud) {
		if (gameState.difficulty === GAME_EASY) {
			if (killedCloud) {
				gameState.cloudHistory.length = Math.min(gameState.cloudHistorySize,gameState.cloudHistory.length+1);
			}
			else {
				gameState.cloudHistory.length = Math.max(0,gameState.cloudHistory.length-1);
			}
		}
		else {
			gameState.cloudHistory.shift();
			gameState.cloudHistory.push(
				killedCloud ?
					gameState.cloudKilledCredit :
					gameState.cloudMissedCredit
			);
		}
	}

	function positionBackgroundCloud(cloud,origCx,origCy) {
		var overrunCount = 0, cx = origCx, cy = origCy;

		// find a non-overlapping position for the new cloud (to look nicer)
		do {
			var overlapping = false;
			if (origCx == null) {
				cx = Utils.getRandomInRange(-20,Browser.viewportDims.width-20);
			}
			if (origCy == null) {
				cy = Utils.getRandomInRange(-30,Browser.viewportDims.height-30);
			}
			for (var j=0; j<gameState.backgroundClouds.length; j++) {
				var tc = gameState.backgroundClouds[j];

				if (Utils.rectangleCollision(
					cx, cy, cx + cloud.cnv.width - 1, cy + cloud.cnv.height - 1,
					tc.x - 20, tc.y - 20, tc.x + tc.cnv.width + 19, tc.y + tc.cnv.height + 19
				)) {
					overlapping = true;
					break;
				}
			}
			overrunCount++;
		} while (overlapping && overrunCount < 1000);

		// save the new cloud position
		cloud.x = cx;
		cloud.y = cy;
	}

	function removeOldElements(elemList,elemCloud) {
		// cull old, now out-of-view elements
		for (var i=0; i<elemList.length; i++) {
			var elem = elemList[i];
			if (!Utils.rectangleCollision(
				elem.x, elem.y, elem.x + elem.cnv.width - 1, elem.y + elem.cnv.height - 1,
				0, 0, Browser.viewportDims.width - 1, Browser.viewportDims.height - 1
			)) {
				if (elemCloud) {
					if (elem.target && !elem.hit) {
						shakeScene();
						updateCloudHistory(/*killedCloud=*/false);
					}
					Clouds.recycleCloudObject(elem);
				}
				elemList.splice(i,1);
				i--;
			}
		}
	}

	function moveCloud(cloud,horzSpeed,vertSpeed) {
		horzSpeed = horzSpeed != null ? horzSpeed : 0.5;
		vertSpeed = vertSpeed != null ? vertSpeed : 0.5;
		cloud.x -= horzSpeed;
		var vert = Utils.getRandomInRange(0,20);
		if (vert > 16) {
			if (vert <= 18) cloud.y += vertSpeed;
			else cloud.y -= vertSpeed;
		}
	}

	function backgroundTick() {
		var cloud;

		gameState.backgroundTickCount++;

		// move the clouds
		for (var i=0; i<gameState.backgroundClouds.length; i++) {
			moveCloud(gameState.backgroundClouds[i],gameState.backgroundCloudSpeed);
		}

		// time for another background cloud?
		if (gameState.backgroundTickCount > gameState.backgroundNewCloudThreshold) {
			gameState.backgroundNewCloudThreshold = Utils.getRandomInRange(
				gameState.backgroundNewCloudThresholdMin,
				gameState.backgroundNewCloudThresholdMax
			);
			gameState.backgroundTickCount = 0;

			// cull old, now out-of-view clouds
			removeOldElements(gameState.backgroundClouds,/*cloudElem=*/true);

			// generate a new cloud
			cloud = Clouds.getCloud(BACKGROUND_CLOUD);

			// find a non-overlapping position for the new cloud
			// (to look nicer at start)
			positionBackgroundCloud(cloud,Browser.viewportDims.width-2);

			// save the new cloud (and position)
			gameState.backgroundClouds.push(cloud);
		}
	}

	function updateExplodingCloud(cloud) {
		if (cloud.explodeTickCount < 10) {
			Clouds.explodeCloud(cloud);
		}
		else {
			// move offscreen so it's removed
			cloud.x = -1000;
			cloud.explodeTickCount = false;
		}
	}

	function gameCloudTick() {
		var cloud;

		gameState.gameCloudTickCount++;

		if (gameState.gameClouds.length > 0) {
			// move the clouds
			for (var i=0; i<gameState.gameClouds.length; i++) {
				moveCloud(gameState.gameClouds[i],gameState.gameCloudSpeed,1);
				if (gameState.gameClouds[i].hit) {
					if (gameState.gameClouds[i].explodeTickCount !== false) {
						gameState.gameClouds[i].explodeTickCount++;
						updateExplodingCloud(gameState.gameClouds[i]);
					}
				}
				else {
					// handle target on cloud
					if (gameState.difficulty == GAME_EASY ||
						(gameState.gameClouds[i].x <= (Browser.viewportDims.width / 2))
					) {
						gameState.gameClouds[i].target.scale = gameState.gameClouds[i].target.scale || 1;
						gameState.gameClouds[i].target.scaleDelta = gameState.gameClouds[i].target.scaleDelta || 0.008;
						gameState.gameClouds[i].target.scale = gameState.gameClouds[i].target.scale + gameState.gameClouds[i].target.scaleDelta;
						if (Math.abs(gameState.gameClouds[i].target.scale - 1) >= 0.05) {
							gameState.gameClouds[i].target.scaleDelta *= -1;
						}
					}
				}
			}

			// cull old, now out-of-view clouds
			removeOldElements(gameState.gameClouds,/*cloudElem=*/true);
		}

		if (gameState.gameCloudTickCount > gameState.gameCloudNewCloudThreshold) {
			gameState.gameCloudNewCloudThreshold = Utils.getRandomInRange(
				gameState.gameCloudNewCloudThresholdMin,
				gameState.gameCloudNewCloudThresholdMax
			);
			gameState.gameCloudTickCount = 0;

			// generate a new cloud
			cloud = Clouds.getCloud(GAME_CLOUD);
			var cloudHeight = cloud.cnv.height;
			var cloudHeightThird = Math.floor(cloudHeight / 3);

			// position cloud
			cloud.x = Browser.viewportDims.width - 2;
			cloud.y = Utils.getRandomInRange(-cloudHeightThird,Browser.viewportDims.height-cloudHeight+cloudHeightThird);

			// save the new cloud (and position)
			gameState.gameClouds.push(cloud);
		}
	}

	function foregroundTick() {
		if (gameState.foregroundNewCloudThreshold > 0) {
			gameState.foregroundTickCount++;

			// move the foreground cloud?
			if (gameState.foregroundCloud.length > 0) {
				moveCloud(gameState.foregroundCloud[0],gameState.foregroundCloudSpeed);

				// cull old, now out-of-view cloud
				removeOldElements(gameState.foregroundCloud,/*cloudElem=*/true);
			}

			if (gameState.foregroundTickCount > gameState.foregroundNewCloudThreshold) {
				gameState.foregroundNewCloudThreshold = Utils.getRandomInRange(
					gameState.foregroundNewCloudThresholdMin,
					gameState.foregroundNewCloudThresholdMax
				);
				gameState.foregroundTickCount = 0;

				// generate a new cloud
				var cloud = Clouds.getCloud(FOREGROUND_CLOUD);
				var cloudHeight = cloud.cnv.height;
				var cloudHeightHalf = Math.floor(cloudHeight / 2);

				cloud.x = Browser.viewportDims.width - 2;
				if (Utils.getRandomInRange(0,6) < 5) {
					cloud.y = -cloudHeightHalf;
				}
				else {
					cloud.y = Browser.viewportDims.height - cloudHeightHalf;
				}

				// save the new cloud (and position)
				gameState.foregroundCloud[0] = cloud;
			}
		}
	}

	function birdTick() {
		var bird;

		gameState.birdTickCount++;

		// move the bird?
		if (gameState.birds.length > 0) {
			bird = gameState.birds[0];
			bird.x -= gameState.birdSpeed;

			// bounce bird up and down
			if (Math.abs(bird.flappingOffsetY) > bird.flappingOffsetThreshold) {
				bird.flappingOffsetY = bird.flappingOffsetDirection * bird.flappingOffsetThreshold;
				bird.flappingOffsetDirection *= -1;
			}
			else {
				bird.flappingOffsetY += (bird.flappingOffsetDirection * gameState.birdFlappingVelocity);
			}

			// cull old, now out-of-view birds
			removeOldElements(gameState.birds);
		}

		if (gameState.birds.length > 0) {
			Bird.tick();
			Bird.getBird();
		}
		else if (gameState.birdTickCount > gameState.newBirdThreshold) {
			gameState.newBirdThreshold = Utils.getRandomInRange(
				gameState.newBirdThresholdMin,
				gameState.newBirdThresholdMax
			);
			gameState.birdTickCount = 0;

			// generate a new bird
			bird = Bird.getBird();
			var birdHeight = bird.cnv.height;

			// position bird
			bird.x = Browser.viewportDims.width - 2;
			bird.y = Utils.getRandomInRange(
				birdHeight,
				Browser.viewportDims.height - (2 * birdHeight)
			);

			// setup bird
			bird.angle = 0;
			bird.flappingOffsetY = 0;
			bird.flappingOffsetDirection = -1;
			bird.flappingOffsetThreshold = Math.floor(birdHeight * gameState.birdFlappingThresholdRatio);
			bird.dead = false;

			// save the new bird (and position)
			gameState.birds[0] = bird;
		}
	}

	function killBirdTick() {
		var bird;

		gameState.birdTickCount++;

		// move/spin the dead bird?
		if (gameState.birds.length > 0) {
			bird = gameState.birds[0];

			bird.x -= gameState.birdSpeed;
			bird.angle += 0.4;

			// cull old, now out-of-view birds
			removeOldElements(gameState.birds);
		}
	}

	function shakeTick() {
		if (gameState.sceneShaking) {
			gameState.shakeTickCount++;

			if (gameState.shakeTickCount < gameState.shakeTickThreshold) {
				gameState.shakeOffsetX = Math.floor((gameState.shakeOffsetX + gameState.shakeDeltaX) * 10) / 10;
				gameState.shakeOffsetY = Math.floor((gameState.shakeOffsetY + gameState.shakeDeltaY) * 10) / 10;

				gameState.shakeDeltaX *= -0.9;
				gameState.shakeDeltaY *= -0.9;
			}
			else {
				gameState.sceneShaking = false;
				gameState.shakeTickCount = 0;
				gameState.shakeOffsetX = 0;
				gameState.shakeOffsetY = 0;
				gameState.shakeDeltaX = Math.min(-8,Math.round(-12 * gameState.speedRatio));
				gameState.shakeDeltaY = Math.min(-5,Math.round(-8 * gameState.speedRatio));
			}
		}
	}

	function resetFramerate() {
		framerate = "--";
	}

	function trackFramerate() {
		if (DEBUG) {
			if (framerateTimestamp == null) {
				framerateTimestamp = Date.now();
				frameCount = 0;
			}
			else {
				frameCount++;

				var now = Date.now();
				if ((now - framerateTimestamp) >= 1000) {
					var rate = frameCount / ((now - framerateTimestamp) / 1000);
					framerate = rate.toFixed(1);
					frameCount = 0;
					framerateTimestamp = Date.now();
				}
			}
		}
	}

	function escapeCancelGame(evt) {
		if (Interaction.detectKey(evt) == Interaction.KEYBOARD_ESC) {
			evt.preventDefault();
			gameState.playEntering = false;
			waitAtRetryScreen();
		}
	}

})();
