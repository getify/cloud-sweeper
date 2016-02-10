var Clouds = (function Clouds(){
	"use strict";

	var publicAPI,
		dirty = false,
		cloudScaling = 1,
		forms,
		explodingFrames,
		largeForms,
		smallForms,
		cloudTarget,
		objectPools;

	objectPools = {
		gameClouds: [],
		otherClouds: [],
	};

	cloudTarget = {
		src: "images/clouds/target.svg",
		width: 275,
		height: 275,
		hitAreas: [
			{ x1: 37, y1: 37, x2: 238, y2: 238, },
		],
	};

	forms = [
		{
			src: "images/clouds/cloud-1.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 75, y1: 75, x2: 374, y2: 374, },
			],
		},
		{
			src: "images/clouds/cloud-2.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 125, y1: 100, x2: 424, y2: 399, },
			],
		},
		{
			src: "images/clouds/cloud-3.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 75, y1: 100, x2: 374, y2: 399, },
			],
		},
		{
			src: "images/clouds/cloud-4.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 125, y1: 100, x2: 424, y2: 399, },
			],
		},
		{
			src: "images/clouds/cloud-5.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 100, y1: 100, x2: 399, y2: 399, },
			],
		},
		{
			src: "images/clouds/cloud-6.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 100, y1: 100, x2: 399, y2: 399, },
			],
		},
		{
			src: "images/clouds/cloud-7.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 125, y1: 75, x2: 474, y2: 424, },
			],
		},
		{
			src: "images/clouds/cloud-8.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 125, y1: 100, x2: 474, y2: 449, },
			],
		},
		{
			src: "images/clouds/cloud-9.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 100, y1: 75, x2: 449, y2: 424, },
			],
		},
		{
			src: "images/clouds/cloud-10.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 50, y1: 75, x2: 399, y2: 424, },
			],
		},
		{
			src: "images/clouds/cloud-11.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 100, y1: 125, x2: 399, y2: 424, },
			],
		},
		{
			src: "images/clouds/cloud-12.svg",
			width: 500,
			height: 500,
			hitAreas: [
				{ x1: 50, y1: 100, x2: 324, y2: 374, },
			],
		},
	];

	explodingFrames = [
		{ src: "images/clouds/exploding/frame-1.svg", },
		{ src: "images/clouds/exploding/frame-2.svg", },
		{ src: "images/clouds/exploding/frame-3.svg", },
		{ src: "images/clouds/exploding/frame-4.svg", },
		{ src: "images/clouds/exploding/frame-5.svg", },
		{ src: "images/clouds/exploding/frame-6.svg", },
		{ src: "images/clouds/exploding/frame-7.svg", },
		{ src: "images/clouds/exploding/frame-8.svg", },
		{ src: "images/clouds/exploding/frame-9.svg", },
		{ src: "images/clouds/exploding/frame-10.svg", },
	];

	// which clouds are more suitable as large-sized cloud forms?
	largeForms = [ 0, 1, 2, 3, 9, 10, 11, ];

	// which clouds are more suitable as small-sized cloud forms?
	smallForms = [ 4, 5, 6, 7, 8, ];

	seedObjectPools();

	publicAPI = {
		load: load,
		setCloudScaling: setCloudScaling,
		getCloud: getCloud,
		explodeCloud: explodeCloud,
		recycleCloudObject: recycleCloudObject,
	};

	return publicAPI;


	// ******************************

	function load() {
		return Promise.all(
			forms.concat(explodingFrames,[cloudTarget])
				.map(Utils.loadImgOnEntry)
		);
	}

	function generateGameCloudObj() {
		var obj = {
			cnv: Browser.createCanvas(),
			ctx: null,
			hitAreas: [ { x1: null, y1: null, x2: null, y2: null, }, ],
			target: {
				cnv: Browser.createCanvas(),
				ctx: null,
				x: null,
				y: null,
				scale: null,
				scaleDelta: null,
			},
			exploding: {
				cnv: Browser.createCanvas(),
				ctx: null,
			},
			x: null,
			y: null,
			explodeTickCount: null,
			hit: null,
			propHit: null,
		};

		// get canvas contexts
		obj.ctx = obj.cnv.getContext("2d");
		obj.target.ctx = obj.target.cnv.getContext("2d");
		obj.exploding.ctx = obj.exploding.cnv.getContext("2d");

		return obj;
	}

	function generateOtherCloudObj() {
		var obj = {
			cnv: Browser.createCanvas(),
			ctx: null,
			x: null,
			y: null,
		};

		obj.ctx = obj.cnv.getContext("2d");

		return obj;
	}

	function seedObjectPools() {
		// seed game cloud object pool
		for (var i=0; i<5; i++) {
			objectPools.gameClouds.push(generateGameCloudObj());
		}

		// seed other clouds object pool
		for (var i=0; i<10; i++) {
			objectPools.otherClouds.push(generateOtherCloudObj());
		}
	}

	function recycleCloudObject(cloudObj) {
		// game cloud?
		if (cloudObj.target) {
			cloudObj.explodeTickCount = cloudObj.hit = cloudObj.propHit =
				cloudObj.x = cloudObj.y =
				cloudObj.target.scale = cloudObj.target.scaleDelta =
				cloudObj.target.x = cloudObj.target.y = null;
			objectPools.gameClouds.push(cloudObj);
		}
		else {
			objectPools.otherClouds.push(cloudObj);
		}
	}

	function setCloudScaling(scaling) {
		cloudScaling = scaling;
	}

	function getCloud(layer) {
		if (layer == 0) return getBackgroundCloud();
		else if (layer == 1) return getGameCloud();
		else return getForegroundCloud();
	}

	function getBackgroundCloud() {
		var cloudObj, cnv, ctx;

		// recycle object from object pool?
		if (objectPools.otherClouds.length > 0) {
			cloudObj = objectPools.otherClouds.shift();
		}
		// create a new object (for the pool)
		else {
			cloudObj = generateOtherCloudObj();
		}

		// convenience local refs
		cnv = cloudObj.cnv;
		ctx = cloudObj.ctx;

		var cloud = forms[ largeForms[Utils.getRandomInRange(0,largeForms.length-1)] ];

		var planeWidth = Plane.getScaledWidth();
		var minWidth = Math.floor(planeWidth * 0.4);
		var maxWidth = Math.floor(planeWidth * 1.0);

		var width = Utils.getRandomInRange(minWidth,maxWidth);
		var height = (cloud.height / cloud.width) * width;

		cnv.width = width;
		cnv.height = height;

		var angle = Utils.getRandomInRange(0,25);
		if (Utils.getRandomInRange(0,1)) angle *= -1;

		angle = angle * Math.PI / 180;

		ctx.save();
		ctx.globalAlpha = Utils.getRandomInRange(3,6) / 10;
		Utils.rotateCanvas(ctx,width/2,height/2,angle);
		ctx.drawImage(cloud.img,0,0,cloud.width,cloud.height,0,0,width,height);
		ctx.restore();

		return cloudObj;
	}

	function getGameCloud() {
		var cloudObj, cnv, ctx, targetCnv, targetCtx;

		// recycle object from object pool?
		if (objectPools.gameClouds.length > 0) {
			cloudObj = objectPools.gameClouds.shift();
		}
		// create a new object (for the pool)
		else {
			cloudObj = generateGameCloudObj();
		}

		// convenience local refs
		cnv = cloudObj.cnv;
		ctx = cloudObj.ctx;
		targetCnv = cloudObj.target.cnv;
		targetCtx = cloudObj.target.ctx;

		var cloudForms = (Utils.getRandomInRange(0,1) === 1) ? smallForms : largeForms;
		var cloud = forms[ cloudForms[Utils.getRandomInRange(0,cloudForms.length-1)] ];

		var planeWidth = Plane.getScaledWidth();
		var minWidth = Math.floor(planeWidth * 1.6 * cloudScaling);
		var maxWidth = Math.floor(planeWidth * 1.75 * cloudScaling);

		var width = Utils.getRandomInRange(minWidth,maxWidth);
		var ratio = width / cloud.width;
		var height = ratio * cloud.height;

		cnv.width = width;
		cnv.height = height;

		ctx.globalAlpha = 0.95;
		ctx.drawImage(cloud.img,0,0,cloud.width,cloud.height,0,0,width,height);
		ctx.globalAlpha = 1;

		// scale cloud hit area
		var scaledHitAreas = cloudObj.hitAreas;
		scaledHitAreas[0].x1 = cloud.hitAreas[0].x1 * ratio;
		scaledHitAreas[0].y1 = cloud.hitAreas[0].y1 * ratio;
		scaledHitAreas[0].x2 = cloud.hitAreas[0].x2 * ratio;
		scaledHitAreas[0].y2 = cloud.hitAreas[0].y2 * ratio;

		// calculate target dimensions/position
		var targetX = scaledHitAreas[0].x1;
		var targetY = scaledHitAreas[0].y1;
		var targetWidth = scaledHitAreas[0].x2 - scaledHitAreas[0].x1 + 1;
		var targetHeight = scaledHitAreas[0].y2 - scaledHitAreas[0].y1 + 1;

		targetCnv.width = targetWidth;
		targetCnv.height = targetHeight;

		targetCtx.globalAlpha = 0.65;
		targetCtx.drawImage(cloudTarget.img,0,0,targetWidth,targetHeight);
		targetCtx.globalAlpha = 1;

		var targetRatio = targetWidth / cloudTarget.width;

		// recalibrate cloud hit area to target hit area
		scaledHitAreas[0].x1 = targetX + (cloudTarget.hitAreas[0].x1 * targetRatio);
		scaledHitAreas[0].y1 = targetY + (cloudTarget.hitAreas[0].y1 * targetRatio);
		scaledHitAreas[0].x2 = targetX + (cloudTarget.hitAreas[0].x2 * targetRatio);
		scaledHitAreas[0].y2 = targetY + (cloudTarget.hitAreas[0].y2 * targetRatio);

		cloudObj.target.x = targetX;
		cloudObj.target.y = targetY;

		return cloudObj;
	}

	function getForegroundCloud() {
		var cloudObj, cnv, ctx;

		// recycle object from object pool?
		if (objectPools.otherClouds.length > 0) {
			cloudObj = objectPools.otherClouds.shift();
		}
		// create a new object (for the pool)
		else {
			cloudObj = generateOtherCloudObj();
		}

		// convenience local refs
		cnv = cloudObj.cnv;
		ctx = cloudObj.ctx;

		var cloud = forms[ smallForms[Utils.getRandomInRange(0,smallForms.length-1)] ];

		var planeWidth = Plane.getScaledWidth();
		var minWidth = Math.floor(planeWidth * 3.5);
		var maxWidth = Math.floor(planeWidth * 5);

		var width = Utils.getRandomInRange(minWidth,maxWidth);
		var height = (cloud.height / cloud.width) * width;

		cnv.width = width;
		cnv.height = height;

		ctx.drawImage(cloud.img,0,0,cloud.width,cloud.height,0,0,width,height);

		return cloudObj;
	}

	function explodeCloud(cloud) {
		// size (and clear) canvas
		cloud.exploding.cnv.width = cloud.cnv.width;
		cloud.exploding.cnv.height = cloud.cnv.height;

		cloud.exploding.ctx.save();

		var scale = Math.max(0.3,1 - (cloud.explodeTickCount / 20));
		Utils.scaleCanvas(cloud.exploding.ctx,cloud.exploding.cnv.width/2,cloud.exploding.cnv.height/2,scale,scale);

		var frameIdx = cloud.explodeTickCount;
		if (frameIdx < explodingFrames.length) {
			cloud.exploding.ctx.globalAlpha = 1 - (cloud.explodeTickCount / 10);
			cloud.exploding.ctx.drawImage(explodingFrames[frameIdx].img,0,0,cloud.exploding.cnv.width,cloud.exploding.cnv.height);
		}

		cloud.exploding.ctx.globalAlpha = Math.max(0,0.9 - (cloud.explodeTickCount / 15));;
		cloud.exploding.ctx.drawImage(cloud.cnv,0,0);

		cloud.exploding.ctx.restore();
	}

})();
