var Debug = (function Debug(){

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

	function showFramerate(ctx) {
		ctx.fillText(framerate + " fps",275,20);
	}

	function showBuild(ctx) {
		ctx.fillText("Build: " + publicAPI.BUILD_VERSION,150,20);
	}

	function showInfo(ctx) {
		if (publicAPI.ON) {
			ctx.font = "20px sans-serif";
			ctx.fillStyle = "white";

			showFramerate(ctx);
			showBuild(ctx);
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
