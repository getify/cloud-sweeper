var Plane = (function Plane(){
	"use strict";

	var parts = {},
		publicAPI,
		cnv = Browser.createCanvas(),
		ctx,
		dirty = false,
		degrees = 0,
		lastDegrees,
		piece = {},
		hitAreas = [
			{ x1: 520, y1: 150, x2: 560, y2: 290, },
			{ x1: 320, y1: 50, x2: 450, y2: 200, },
			{ x1: 460, y1: 90, x2: 490, y2: 150, },
			{ x1: 340, y1: 270, x2: 510, y2: 350, },
			{ x1: 60, y1: 160, x2: 140, y2: 290, },
		],
		scaledHitAreas = [],
		scaledAndRotatedHitAreas = [];


	ctx = cnv.getContext("2d");

	publicAPI = {
		setAngle: setAngle,
		getAngle: getAngle,
		getScaledWidth: getScaledWidth,
		getScaledHeight: getScaledHeight,
		scaleTo: scaleTo,
		getHitAreas: getHitAreas,
		define: define,
		load: load,
		getPlane: getPlane,
		tick: tick,
	};

	return publicAPI;


	// ******************************

	function setAngle(deg) {
		// snap to 0.5 increments
		degrees = Math.floor(deg * 2) / 2;
	}

	function getAngle() {
		return degrees;
	}

	function getScaledWidth() {
		return parts.body.scaled.width;
	}

	function getScaledHeight() {
		return parts.body.scaled.height;
	}

	function define(partID,part) {
		parts[partID] = part;
	}

	function load() {
		return Promise.all(
			Object.keys(parts)
			.map(function loadPartByID(partID){
				return loadPart(parts[partID]);
			})
		);
	}

	function loadPart(part) {
		if (typeof part.src === "string") {
			return Utils.loadImgOnEntry(part);
		}
		else if (Array.isArray(part.src)) {
			return Promise.all(
				part.src.map(loadPart)
			);
		}
	}

	function scaleTo(pieceSize) {
		dirty = true;
		Object.keys(parts).forEach(function eacher(partID){
			if ("pieceSize" in parts[partID].scaled) {
				scalePartTo(parts[partID],parts[partID].scaled,parts[partID].img,pieceSize);
			}
			else if (Array.isArray(parts[partID].scaled)) {
				parts[partID].scaled.forEach(function eacher(scaled,idx){
					scalePartTo(parts[partID],scaled,parts[partID].src[idx].img,pieceSize);
				});
			}
		});

		hitAreas.forEach(function eacher(hitArea,idx){
			var ratio = parts.body.scaled.ratio;
			scaledHitAreas[idx] = scaledHitAreas[idx] || {};

			scaledHitAreas[idx].x1 = hitArea.x1 * ratio;
			scaledHitAreas[idx].x2 = hitArea.x2 * ratio;
			scaledHitAreas[idx].y1 = hitArea.y1 * ratio;
			scaledHitAreas[idx].y2 = hitArea.y2 * ratio;
		});
	}

	function scalePartTo(part,partScaled,partImg,pieceSize) {
		if (pieceSize !== partScaled.pieceSize) {
			partScaled.pieceSize = pieceSize;

			// recalculate scaled dimensions
			partScaled.ratio = partScaled.pieceSize / part.pieceSize;
			partScaled.width = part.width * partScaled.ratio;
			partScaled.height = part.height * partScaled.ratio;
			partScaled.originX = part.originX * partScaled.ratio;
			partScaled.originY = part.originY * partScaled.ratio;
			partScaled.offsetX = part.offsetX * partScaled.ratio;
			partScaled.offsetY = part.offsetY * partScaled.ratio;

			// update scaled image
			partScaled.cnv.width = partScaled.width;
			partScaled.cnv.height = partScaled.height;
			partScaled.ctx.drawImage(
				partImg,
				0,0,partScaled.width,partScaled.height
			);

			// mark cache as dirty
			partScaled.cache.forEach(function eacher(cacheItem){
				if (cacheItem) cacheItem.dirty = true;
			});
		}
	}

	function getHitAreas() {
		return scaledAndRotatedHitAreas;
	}

	function getPlane() {
		if (dirty || degrees !== lastDegrees) {
			lastDegrees = degrees;
			dirty = false;

			var prop = parts.prop.getPart(degrees);
			var body = parts.body.getPart(degrees);

			var radians = degrees * Math.PI / 180;

			cnv.width = parts.body.scaled.width;
			cnv.height = parts.body.scaled.height;

			// draw propeller
			if (degrees != 0) {
				ctx.save();
				ctx.translate(parts.body.scaled.originX,parts.body.scaled.originY);
				ctx.rotate(-radians);
				ctx.translate(
					prop.offsetX-parts.body.scaled.originX+parts.prop.scaled[0].originX,
					prop.offsetY-parts.body.scaled.originY+parts.prop.scaled[0].originY
				);
				ctx.rotate(radians);
				ctx.translate(0-parts.prop.scaled[0].originX,0-parts.prop.scaled[0].originY);
				ctx.drawImage(prop.cnv,0,0);
				ctx.restore();

				// for rotation around the origin
				var sin = Math.sin(-radians);
				var cos = Math.cos(-radians);

				scaledHitAreas.forEach(function eacher(hitArea,idx){
					scaledAndRotatedHitAreas[idx] = scaledAndRotatedHitAreas[idx] || {};

					// calculate bounding box of hit area
					var tlX = hitArea.x1, tlY = hitArea.y1,
						trX = hitArea.x2, trY = hitArea.y1,
						blX = hitArea.x1, blY = hitArea.y2,
						brX = hitArea.x2, brY = hitArea.y2;

					// translate all points back to origin
					tlX -= parts.body.scaled.originX;
					tlY -= parts.body.scaled.originY;
					trX -= parts.body.scaled.originX;
					trY -= parts.body.scaled.originY;
					blX -= parts.body.scaled.originX;
					blY -= parts.body.scaled.originY;
					brX -= parts.body.scaled.originX;
					brY -= parts.body.scaled.originY;

					// rotate each point about origin
					var ntlX = (tlX * cos) - (tlY * sin);
					var ntlY = (tlX * sin) + (tlY * cos);
					var ntrX = (trX * cos) - (trY * sin);
					var ntrY = (trX * sin) + (trY * cos);
					var nblX = (blX * cos) - (blY * sin);
					var nblY = (blX * sin) + (blY * cos);
					var nbrX = (brX * cos) - (brY * sin);
					var nbrY = (brX * sin) + (brY * cos);

					// calculate min/max bounding box, then translate back to origin
					scaledAndRotatedHitAreas[idx].x1 = Math.min(ntlX,nblX) + parts.body.scaled.originX;
					scaledAndRotatedHitAreas[idx].y1 = Math.min(ntlY,ntrY) + parts.body.scaled.originY;
					scaledAndRotatedHitAreas[idx].x2 = Math.max(ntrX,nbrX) + parts.body.scaled.originX;
					scaledAndRotatedHitAreas[idx].y2 = Math.max(nblY,nbrY) + parts.body.scaled.originY;
				});
			}
			else {
				ctx.drawImage(prop.cnv,prop.offsetX,prop.offsetY);
				scaledHitAreas.forEach(function eacher(hitArea,idx){
					scaledAndRotatedHitAreas[idx] = scaledAndRotatedHitAreas[idx] || {};

					scaledAndRotatedHitAreas[idx].x1 = hitArea.x1;
					scaledAndRotatedHitAreas[idx].y1 = hitArea.y1;
					scaledAndRotatedHitAreas[idx].x2 = hitArea.x2;
					scaledAndRotatedHitAreas[idx].y2 = hitArea.y2;
				});
			}

			// draw plane body
			ctx.drawImage(body.cnv,body.offsetX,body.offsetY);

			piece.cnv = cnv;
			piece.ctx = ctx;
			piece.hitAreas = scaledAndRotatedHitAreas;
		}

		return piece;
	}

	function tick() {
		dirty = true;
		Object.keys(parts).forEach(function eacher(partID){
			parts[partID].tick();
		});
	}

})();
