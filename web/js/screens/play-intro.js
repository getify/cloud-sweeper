var PlayIntroScreen = (function PlayIntroScreen(){
	"use strict";

	var publicAPI,
		dirty = false,
		tickCount = -1,
		frameIdx = 0,
		cnv = Browser.createCanvas(),
		ctx = cnv.getContext("2d"),
		frames,
		text,
		scaledFrames = [],
		cache,
		frameWidth = 300,
		frameHeight = 200;

	frames = [
		{ src: "images/screens/play-hint/frame-1.svg", },
		{ src: "images/screens/play-hint/frame-2.svg", },
		{ src: "images/screens/play-hint/frame-3.svg", },
		{ src: "images/screens/play-hint/frame-4.svg", },
		{ src: "images/screens/play-hint/frame-5.svg", },
		{ src: "images/screens/play-hint/frame-6.svg", },
		{ src: "images/screens/play-hint/frame-7.svg", },
		{ src: "images/screens/play-hint/frame-8.svg", },
		{ src: "images/screens/play-hint/frame-9.svg", },
		{ src: "images/screens/play-hint/frame-10.svg", },
		{ src: "images/screens/play-hint/frame-11.svg", },
		{ src: "images/screens/play-hint/frame-12.svg", },
		{ src: "images/screens/play-hint/frame-13.svg", },
		{ src: "images/screens/play-hint/frame-14.svg", },
		{ src: "images/screens/play-hint/frame-15.svg", },
	];

	text = {
		src: "images/screens/play-hint/text.svg",
		width: 340,
		height: 80,
	};

	cache = {
		cnv: cnv,
		ctx: ctx,
	};

	Screens.defineElement("play-hint",frames);
	Screens.defineElement("play-hint-text",text);


	publicAPI = {
		start: startPlayIntro,
	};

	return publicAPI;


	// ******************************

	function scaleTo(hintWidth) {
		dirty = true;
		tickCount = -1;
		frameIdx = 0;

		frames.forEach(function eacher(frame,frameIdx){
			scaleHint(frame,frameIdx,hintWidth);
		});
	}

	function scaleHint(hintFrame,frameIdx,hintWidth) {
		var scaledHint = (scaledFrames[frameIdx] = scaledFrames[frameIdx] || {});

		if (hintWidth !== scaledHint.hintWidth) {
			if (!scaledHint.cnv) {
				scaledHint.cnv = Browser.createCanvas();
				scaledHint.ctx = scaledHint.cnv.getContext("2d");
			}
			scaledHint.hintWidth = hintWidth;

			// recalculate scaled dimensions
			scaledHint.ratio = scaledHint.hintWidth / frameWidth;
			scaledHint.width = frameWidth * scaledHint.ratio;
			scaledHint.height = frameHeight * scaledHint.ratio;

			var hintTextRatio = scaledHint.width / text.width;

			// update scaled image
			scaledHint.cnv.width = scaledHint.width;
			scaledHint.cnv.height = scaledHint.height + (text.height * hintTextRatio);
			scaledHint.ctx.drawImage(
				hintFrame.img,
				0,
				0,
				scaledHint.width,
				scaledHint.height
			);

			// draw hint text?
			scaledHint.ctx.drawImage(
				text.img,
				0,
				scaledHint.height,
				Math.floor(text.width * hintTextRatio),
				Math.floor(text.height * hintTextRatio)
			);

			scaledHint.height = scaledHint.cnv.height;
		}
	}

	function getHint() {
		if (dirty) {
			var scaledHint = scaledFrames[frameIdx];

			dirty = false;
			cache.cnv.width = scaledHint.width;
			cache.cnv.height = scaledHint.height;
			cache.ctx.drawImage(scaledHint.cnv,0,0);
		}

		return cache;
	}

	function hintTick() {
		tickCount++;
		// run hint animation frames at 1/6 the tick speed
		if (tickCount == 6) {
			dirty = true;
			tickCount = 0;
			frameIdx = (frameIdx + 1) % frames.length;
		}
	}

	function startPlayIntro() {
		// disable any touch for right now
		Interaction.disableTouch();

		EVT.emit("game:listen-keyboard-esc");
		EVT.emit("game:clear-scene");
		EVT.emit("game:init-clouds");

		Game.gameState.welcomeWaiting = false;
		Game.gameState.retryLeaving = false;
		Game.gameState.playEntering = true;
		Game.gameState.planeXStart = (Game.gameState.planeX = -Game.gameState.planeSize);

		Plane.setAngle(Game.gameState.planeAngle);
		scaleTo(Game.gameState.planeSize * 1.5);

		Game.gameState.RAFhook = requestAnimationFrame(runPlayIntro);
	}

	function runPlayIntro() {
		Debug.trackFramerate();

		Game.gameState.RAFhook = null;

		if (Game.gameState.playEntering) {
			Game.gameState.playEnteringTickCount++;

			if (Game.gameState.playEnteringTickCount <= Game.gameState.playEnteringTickThreshold) {
				if (!Game.gameState.playHintShown) {
					var opacityTickThreshold = 60;
					var planeTickThreshold = opacityTickThreshold + 60;
					var hintTickThreshold = planeTickThreshold + 6;
					var hintCompleteThreshold = hintTickThreshold + 90;
					var hintFadeThreshold = hintCompleteThreshold + 30;
					var hintFadeCompleteThreshold = hintFadeThreshold + 30;
					var countdownTickThreshold = Game.gameState.playEnteringTickThreshold - 180;

					var showSunMeter = Game.gameState.playEnteringTickCount >= hintTickThreshold;
				}
				else {
					Game.gameState.playEnteringTickThreshold = 210;

					var opacityTickThreshold = 60;
					var planeTickThreshold = opacityTickThreshold + 60;
					var hintTickThreshold = -1;
					var hintCompleteThreshold = -1;
					var hintFadeThreshold = -1;
					var hintFadeCompleteThreshold = -1;
					var countdownTickThreshold = Game.gameState.playEnteringTickThreshold - 180;

					var showSunMeter = Game.gameState.playEnteringTickCount >= planeTickThreshold;
				}

				var sceneOpacity = 1;
				// fade in the clouds?
				if (Game.gameState.playEnteringTickCount < opacityTickThreshold) {
					sceneOpacity = Game.gameState.playEnteringTickCount / opacityTickThreshold;
				}
				// slide in the plane?
				else if (Game.gameState.playEnteringTickCount < planeTickThreshold) {
					Game.gameState.planeX = Math.ceil(
						Game.gameState.planeXStart +
						(
							(Game.gameState.planeXThreshold - Game.gameState.planeXStart) *
							(
								(Game.gameState.playEnteringTickCount-opacityTickThreshold) /
								(planeTickThreshold-opacityTickThreshold)
							)
						)
					);
				}

				var hintOpacity = 0;
				if (Game.gameState.playEnteringTickCount >= hintTickThreshold) {
					if (Game.gameState.playEnteringTickCount < hintCompleteThreshold) {
						hintOpacity = 1;
						hintTick();
					}
					else if (Game.gameState.playEnteringTickCount < hintFadeThreshold) {
						hintOpacity = 1;
					}
					else if (Game.gameState.playEnteringTickCount < hintFadeCompleteThreshold) {
						hintOpacity = (hintFadeCompleteThreshold - Game.gameState.playEnteringTickCount) / (hintFadeCompleteThreshold - hintFadeThreshold);
					}
				}

				// start countdown?
				var countdown = 0;
				if (Game.gameState.playEnteringTickCount >= countdownTickThreshold) {
					countdown = Math.min(Math.max(
						Math.ceil(
							(Game.gameState.playEnteringTickThreshold-Game.gameState.playEnteringTickCount) / 60
						),
						1
					),3);
				}

				Plane.tick();
				EVT.emit("game:background-tick");

				drawPlayIntro(sceneOpacity,countdown,hintOpacity,showSunMeter);

				Game.gameState.RAFhook = requestAnimationFrame(runPlayIntro);
			}
			else {
				EVT.emit("game:play");
			}
		}
	}

	function drawPlayIntro(drawOpacity,countdown,hintOpacity,showSunMeter) {
		EVT.emit("game:clear-scene");

		Game.sceneCtx.globalAlpha = drawOpacity;

		for (var i=0; i<Game.gameState.backgroundClouds.length; i++) {
			var cloud = Game.gameState.backgroundClouds[i];
			Game.sceneCtx.drawImage(cloud.cnv,cloud.x,cloud.y);
		}

		Game.sceneCtx.globalAlpha = 1;

		var plane = Plane.getPlane();
		Game.sceneCtx.drawImage(plane.cnv,Game.gameState.planeX,Game.gameState.planeY);

		// gray out screen to simulate clouding out the sun
		EVT.emit("game:darken-scene",drawOpacity);

		if (hintOpacity > 0) {
			Game.sceneCtx.globalAlpha = hintOpacity;
			var hint = getHint();
			var planeHeight = Plane.getScaledHeight();
			Game.sceneCtx.drawImage(hint.cnv,Game.gameState.planeXThreshold + Game.gameState.planeSize,Game.gameState.planeY + (planeHeight / 3));
			Game.sceneCtx.globalAlpha = 1;
		}

		if (showSunMeter) {
			// scoreboard and sun-meter
			EVT.emit("game:draw-status");
		}

		if (countdown) {
			var numChar = Text.getCachedCharacter("countdown:" + countdown);
			var x = ((Browser.viewportDims.width - numChar.cnv.width) / 2);
			var y = 25;

			Game.sceneCtx.drawImage(numChar.cnv,x,y,numChar.cnv.width,numChar.cnv.height);
		}

		Debug.showInfo();
	}

})();
