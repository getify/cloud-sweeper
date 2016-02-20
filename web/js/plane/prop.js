(function PlanePropeller(){
	"use strict";

	var part,
		tickCount = 0,
		frameIdx = 0;

	part = {
		src: [
			{ src: "images/plane/prop/frame-1.svg" },
			{ src: "images/plane/prop/frame-2.svg" },
			{ src: "images/plane/prop/frame-3.svg" }
		],
		pieceSize: 600,
		width: 200,
		height: 200,
		originX: 100,
		originY: 100,
		offsetX: 426,
		offsetY: 128,
		getPart: getPart,
		tick: tick,

		scaled: [],
	};

	part.src.forEach(function eacher(_,idx){
		part.scaled[idx] = {
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
		};

		part.scaled[idx].ctx = part.scaled[idx].cnv.getContext("2d");
	});

	Plane.define("prop",part);


	// ******************************

	function buildCacheItems() {
		part.src.forEach(function eacher(_,idx){
			// cache all degrees in 0.5 snap increments
			for (
				var deg = Game.gameState.minPlaneAngle;
				deg <= Game.gameState.maxPlaneAngle;
				deg += 0.5
			) {
				part.scaled[idx].cache[ cacheIndex(deg) ] = buildCacheItem();
			}
		});
	}

	function buildCacheItem() {
		var item = {
			cnv: Browser.createCanvas(),
			ctx: null,
			dirty: true,
			offsetX: 0,
			offsetY: 0,
		};

		item.ctx = item.cnv.getContext("2d");

		return item;
	}

	// hash degrees into a cache index
	function cacheIndex(degrees) {
		var cacheIdx = Math.abs(degrees * 2);
		if (degrees < 0) {

			cacheIdx += 40;
		}

		return cacheIdx;
	}

	function getPart(degrees) {
		var cacheIdx, cacheItem, radians,
			cnv, ctx, scaled = part.scaled[frameIdx];

		// snap degrees to 0.5 increments
		degrees = Math.floor(degrees * 2) / 2;
		radians = degrees * Math.PI / 180;

		// get cache item
		if (scaled.cache.length == 0) {
			buildCacheItems();
		}
		cacheIdx = cacheIndex(degrees);
		cacheItem = scaled.cache[cacheIdx];
		cacheItem.offsetX = scaled.offsetX;
		cacheItem.offsetY = scaled.offsetY;

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

	function tick() {
		var ratio = 1;
		tickCount = (tickCount + 1) % (part.src.length * ratio);
		frameIdx = Math.floor(tickCount / ratio);
	}

})();
