var Bird = (function Bird(){
	"use strict";

	var publicAPI,
		dirty = false,
		tickCount = -1,
		frameIdx = 0,
		cnv = Browser.createCanvas(),
		ctx,
		frames,
		scaledFrames = [],
		hitAreas = [
			{ x1: 50, y1: 100, x2: 350, y2: 300, },
		],
		scaledHitAreas = [],
		cache,
		frameWidth = 400,
		frameHeight = 400;

	frames = [
		{ src: "images/birds/frame-1.svg", },
		{ src: "images/birds/frame-2.svg", },
		null, // placeholder for side-reference to `bird-1` entry
		{ src: "images/birds/frame-3.svg", },
	];

	// frame side-reference
	frames[2] = frames[0];

	ctx = cnv.getContext("2d");

	cache = {
		cnv: cnv,
		ctx: ctx
	};

	publicAPI = {
		load: load,
		getBird: getBird,
		scaleTo: scaleTo,
		getHitAreas: getHitAreas,
		tick: tick,
	};

	return publicAPI;


	// ******************************

	function load() {
		return Promise.all(
			frames.map(Utils.loadImgOnEntry)
		);
	}

	function scaleTo(birdWidth) {
		dirty = true;
		tickCount = -1;
		frameIdx = 0;

		frames.forEach(function eacher(frame,frameIdx){
			scaleBird(frame,frameIdx,birdWidth);
		});

		hitAreas.forEach(function eacher(hitArea,idx){
			var ratio = scaledFrames[0].ratio;
			scaledHitAreas[idx] = scaledHitAreas[idx] || {};

			scaledHitAreas[idx].x1 = hitArea.x1 * ratio;
			scaledHitAreas[idx].x2 = hitArea.x2 * ratio;
			scaledHitAreas[idx].y1 = hitArea.y1 * ratio;
			scaledHitAreas[idx].y2 = hitArea.y2 * ratio;
		});
	}

	function getHitAreas() {
		return scaledHitAreas;
	}

	function scaleBird(bird,frameIdx,birdWidth) {
		var scaledBird = (scaledFrames[frameIdx] = scaledFrames[frameIdx] || {});

		if (birdWidth !== scaledBird.birdWidth) {
			if (!scaledBird.cnv) {
				scaledBird.cnv = Browser.createCanvas();
				scaledBird.ctx = scaledBird.cnv.getContext("2d");
			}
			scaledBird.birdWidth = birdWidth;

			// recalculate scaled dimensions
			scaledBird.ratio = scaledBird.birdWidth / frameWidth;
			scaledBird.width = frameWidth * scaledBird.ratio;
			scaledBird.height = frameHeight * scaledBird.ratio;
			scaledBird.originX = scaledBird.width / 2;
			scaledBird.originY = scaledBird.height / 2;

			// update scaled image
			scaledBird.cnv.width = scaledBird.width;
			scaledBird.cnv.height = scaledBird.height;
			scaledBird.ctx.drawImage(
				bird.img,
				0,0,scaledBird.width,scaledBird.height
			);
		}
	}

	function getBird() {
		if (dirty) {
			var scaledBird = scaledFrames[frameIdx];

			dirty = false;
			cache.cnv.width = scaledBird.width;
			cache.cnv.height = scaledBird.height;
			cache.originX = scaledBird.originX;
			cache.originY = scaledBird.originY;
			cache.ctx.drawImage(scaledBird.cnv,0,0);
		}

		return cache;
	}

	function tick() {
		tickCount++;
		if (tickCount == 6) {
			dirty = true;
			tickCount = 0;
			frameIdx = (frameIdx + 1) % frames.length;
		}
	}

})();
