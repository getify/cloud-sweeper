(function PlaneBody(){
	"use strict";

	var part;

	part = {
		src: "images/plane/body.svg",
		pieceSize: 600,
		width: 600,
		height: 425,
		originX: 350,
		originY: 200,
		offsetX: 0,
		offsetY: 0,
		getPart: getPart,
		tick: tick,

		scaled: {
			pieceSize: 0,
			width: 0,
			height: 0,
			ratio: 1,
			originX: 0,
			originY: 0,
			offsetX: 0,
			offsetY: 0,
			cnv: Browser.createCanvas(),
			ctx: null,
			cache: []
		}
	};

	part.scaled.ctx = part.scaled.cnv.getContext("2d");

	Plane.define("body",part);


	// ******************************

	function getPart(degrees) {
		var cacheIdx, cacheItem, radians,
			cnv, ctx, scaled = part.scaled;

		// snap to 0.5 increments
		degrees = Math.floor(degrees * 2) / 2;
		radians = degrees * Math.PI / 180;

		// hash the clamped degrees into a cache index
		cacheIdx = Math.abs(degrees * 2);
		if (degrees < 0) cacheIdx += 40;

		cacheItem = (scaled.cache[cacheIdx] = scaled.cache[cacheIdx] || {});

		if (!cacheItem.cnv) {
			cacheItem.cnv = Browser.createCanvas();
			cacheItem.ctx = cacheItem.cnv.getContext("2d");
			cacheItem.dirty = true;
			cacheItem.offsetX = scaled.offsetX;
			cacheItem.offsetY = scaled.offsetY;
		}

		cnv = cacheItem.cnv;
		ctx = cacheItem.ctx;

		if (cacheItem.dirty) {
			cacheItem.dirty = false;
			cacheItem.cnv.width = scaled.width;
			cacheItem.cnv.height = scaled.height;

			ctx.save();
			ctx.beginPath();

			if (degrees !== 0) {
				Utils.rotateCanvas(
					ctx,
					scaled.originX,
					scaled.originY,
					radians
				);
			}

			cacheItem.offsetX = scaled.offsetX;
			cacheItem.offsetY = scaled.offsetY;

			ctx.drawImage(scaled.cnv,0,0);
			ctx.restore();
		}

		return cacheItem;
	}

	function tick() {}

})();
