var Debug = (function Debug(){
	"use strict";

	var frameCount,
		framerate,
		framerateTimestamp,
		publicAPI;


	publicAPI = {
		showInfo: showInfo,
		trackFramerate: trackFramerate,
		resetFramerate: resetFramerate,

		ON: true,
		BUILD_VERSION: null,
	};

	return publicAPI;


	// ******************************

	function showFramerate() {
		Game.sceneCtx.fillText(framerate + " fps",275,20);
	}

	function showBuild() {
		Game.sceneCtx.fillText("Build: " + publicAPI.BUILD_VERSION,150,20);
	}

	function showInfo() {
		if (publicAPI.ON) {
			Game.sceneCtx.font = "20px sans-serif";
			Game.sceneCtx.fillStyle = "white";

			showFramerate(Game.sceneCtx);
			showBuild(Game.sceneCtx);
		}
	}

	function resetFramerate() {
		framerateTimestamp = frameCount = null;
		framerate = "--";
	}

	function trackFramerate() {
		if (publicAPI.ON) {
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

})();
