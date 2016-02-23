var Utils = (function Utils(){
	"use strict";

	var publicAPI,
		digits;

	// polyfill ES6 `Math.sign`
	if (!Math.sign) {
		Math.sign = function sign(x) {
			x = Number(x);
			if (!x) return x;
			return x < 0 ? -1 : 1;
		};
	}

	digits = {
		"small": null,
		"big": null,
	};

	publicAPI = {
		loadImgOnEntry: loadImgOnEntry,
		rotateCanvas: rotateCanvas,
		scaleCanvas: scaleCanvas,
		getRandomInRange: getRandomInRange,
		rectangleCollision: rectangleCollision,
		rectangleOcclusion: rectangleOcclusion,
		pointInArea: pointInArea,
		debounce: debounce,
		onEvent: onEvent,
		offEvent: offEvent,
		cacheScaledDigits: cacheScaledDigits,
		deepMerge: deepMerge,
	};

	return publicAPI;


	// ******************************

	function loadImgOnEntry(entry) {
		if (!entry.img) {
			entry.img = new Image();
			entry.img.src = entry.src;
			return new Promise(function executor(resolve){
				entry.img.onload = resolve;
			});
		}
	}

	function rotateCanvas(ctx,originX,originY,angle) {
		ctx.translate(originX,originY);
		ctx.rotate(0-angle);
		ctx.translate(0-originX,0-originY);
	}

	function scaleCanvas(ctx,originX,originY,scaleX,scaleY) {
		ctx.translate(originX,originY);
		ctx.scale(scaleX,scaleY);
		ctx.translate(0-originX,0-originY);
	}

	function getRandomInRange(min,max) {
		var diff = max - min + 1;
		return (Math.ceil(Math.random() * diff * 10) % diff) + min;
	}

	function rectangleCollision(Ax1,Ay1,Ax2,Ay2,Bx1,By1,Bx2,By2) {
		return (Ax1 < Bx2 && Ax2 > Bx1 && Ay1 < By2 && Ay2 > By1);
	}

	function rectangleOcclusion(Ax1,Ay1,Ax2,Ay2,Bx1,By1,Bx2,By2) {
		return (Ax1 >= Bx1 && Ax2 <= Bx2 && Ay1 >= By1 && Ay2 <= By2);
	}

	function pointInArea(x,y,area) {
		return (x >= area.x1 && x <= area.x2 && y >= area.y1 && y <= area.y2);
	}

	// Adapted from: https://davidwalsh.name/javascript-debounce-function
	function debounce(func,wait,immediate) {
		var timeout;
		return fnDebounced;

		// ******************************

		function fnDebounced() {
			var context = this,
				args = arguments,
				callNow = immediate && !timeout
			;
			clearTimeout(timeout);
			timeout = setTimeout(later,wait);
			if (callNow) {
				func.apply(context,args);
			}

			// ******************************

			function later() {
				timeout = null;
				if (!immediate) {
					func.apply(context,args);
				}
			}
		}
	}

	function onEvent(elem,evtNames,handler) {
		// elem not passed?
		if (!handler) {
			handler = evtNames;
			evtNames = elem;
			elem = Browser.eventRoot;
		}

		evtNames = evtNames.split(" ");
		for (var i=0; i<evtNames.length; i++) {
			Browser.eventRoot.addEventListener(evtNames[i],handler,/*capturing=*/false);
		}
	}

	function offEvent(elem,evtNames,handler) {
		// elem not passed?
		if (!handler) {
			handler = evtNames;
			evtNames = elem;
			elem = Browser.eventRoot;
		}

		evtNames = evtNames.split(" ");
		for (var i=0; i<evtNames.length; i++) {
			Browser.eventRoot.removeEventListener(evtNames[i],handler,/*capturing=*/false);
		}
	}

	function cacheScaledDigits(textType,cacheIDPrefix,scaleRatio,digitHeight) {
		if (!digits[textType]) {
			digits[textType] = Text.getText(textType,"0123456789",[]);
		}

		for (var i=0; i<=9; i++) {
			var digit = String(i);
			var cacheItem = Text.getCachedCharacter(cacheIDPrefix + ":" + digit);
			var digitImg = digits[textType][i];
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

	function deepMerge(target,source) {
		if (Array.isArray(source)) {
			for (var i=0; i<source.length; i++) {
				mergeSlot(i,target,source);
			}
		}
		else if (source && typeof source == "object") {
			var keys = Object.getOwnPropertyNames(source);
			for (var i=0; i<keys.length; i++) {
				mergeSlot(keys[i],target,source);
			}
		}
	}

	function mergeSlot(key,target,source) {
		if (target && typeof target == "object") {
			if (typeof source[key] == "object") {
				if (!(key in target)) {
					target[key] = Array.isArray(source[key]) ? [] : {};
				}

				deepMerge(target[key],source[key]);
			}
			else if (!(key in target)) {
				target[key] = source[key];
			}
		}
	}

})();
