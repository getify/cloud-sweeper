var PlayHint = (function PlayHint(){
	"use strict";

	var publicAPI,
		dirty = false,
		tickCount = -1,
		frameIdx = 0,
		cnv = document.createElement("canvas"),
		ctx,
		frames,
		text,
		scaledFrames = [],
		cache,
		frameWidth = 300,
		frameHeight = 200;

	frames = [
		{ src: "images/play-hint/frame-1.svg", },
		{ src: "images/play-hint/frame-2.svg", },
		{ src: "images/play-hint/frame-3.svg", },
		{ src: "images/play-hint/frame-4.svg", },
		{ src: "images/play-hint/frame-5.svg", },
		{ src: "images/play-hint/frame-6.svg", },
		{ src: "images/play-hint/frame-7.svg", },
		{ src: "images/play-hint/frame-8.svg", },
		{ src: "images/play-hint/frame-9.svg", },
		{ src: "images/play-hint/frame-10.svg", },
		{ src: "images/play-hint/frame-11.svg", },
		{ src: "images/play-hint/frame-12.svg", },
		{ src: "images/play-hint/frame-13.svg", },
		{ src: "images/play-hint/frame-14.svg", },
		{ src: "images/play-hint/frame-15.svg", },
	];

	text = {
		src: "images/play-hint/text.svg",
		width: 340,
		height: 80,
	},

	ctx = cnv.getContext("2d");

	cache = {
		cnv: cnv,
		ctx: ctx
	};

	publicAPI = {
		load: load,
		getHint: getHint,
		scaleTo: scaleTo,
		tick: tick,
	};

	return publicAPI;


	// ******************************

	function load() {
		return Promise.all(
			frames.concat([text]).map(Utils.loadImgOnEntry)
		);
	}

	function scaleTo(hintWidth) {
		dirty = true;
		tickCount = -1;
		frameIdx = 0;

		frames.forEach(function eacher(frame,frameIdx){
			scaleHint(frame,frameIdx,hintWidth);
		});
	}

	function scaleHint(hint,frameIdx,hintWidth) {
		var scaledHint = (scaledFrames[frameIdx] = scaledFrames[frameIdx] || {});

		if (hintWidth !== scaledHint.hintWidth) {
			if (!scaledHint.cnv) {
				scaledHint.cnv = document.createElement("canvas");
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
				hint.img,
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

	function tick() {
		tickCount++;
		if (tickCount == 6) {
			dirty = true;
			tickCount = 0;
			frameIdx = (frameIdx + 1) % frames.length;
		}
	}

})();
