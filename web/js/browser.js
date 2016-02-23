var Browser = (function Browser(){

	var publicAPI,
		lockOrientation,
		ls;

	lockOrientation =
		(window.screen.lockOrientation ?
			window.screen.lockOrientation.bind(window.screen) : null
		) ||
		(window.screen.mozLockOrientation ?
			window.screen.mozLockOrientation.bind(window.screen) : null
		) ||
		(window.screen.msLockOrientation ?
			window.screen.msLockOrientation.bind(window.screen) : null
		) ||
		((window.screen.orientation && window.screen.orientation.lock) ?
			window.screen.orientation.lock.bind(window.screen.orientation) : null
		) ||
		null;

	ls = window.localStorage || null;


	publicAPI = {
		setupEvents: setupEvents,
		checkOrientation: checkOrientation,
		getElement: getElement,
		createCanvas: createCanvas,
		onDOMReady: onDOMReady,
		updateViewportDims: updateViewportDims,

		eventRoot: document,
		DOMReady: (document.readyState == "complete"),
		viewportDims: {},
		orientationLocked: false,
		localStorage: ls,
	};

	return publicAPI;


	// ******************************

	function setupEvents(onResize) {
		// respond to window resizes/reorientation
		Utils.onEvent(window,"resize",Utils.debounce(onResize,100));

		// normalize long-touch/drag on canvas
		Utils.onEvent(window,"contextmenu",Interaction.disableEvent);
		Utils.onEvent("selectstart",Interaction.disableEvent);
	}

	function checkOrientation() {
		return Promise.resolve(
				lockOrientation ?
					lockOrientation("landscape") :
					Promise.reject()
			)
			.then(
				function onLocked() {
					publicAPI.orientationLocked = true;
				},
				function onNotLocked() {}
			);
	}

	function getElement(selector) {
		return document.querySelectorAll(selector)[0];
	}

	function createCanvas() {
		return document.createElement("canvas");
	}

	function onDOMReady(onReady) {
		Utils.onEvent("DOMContentLoaded",onReady);
	}

	function updateViewportDims() {
		publicAPI.viewportDims.width = window.innerWidth;
		publicAPI.viewportDims.height = window.innerHeight;
	}

})();
