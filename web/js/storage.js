var Storage = (function Storage() {

	var publicAPI, ls, settings;

	ls = localStorage;
	settings = {
		build_version: Debug.BUILD_VERSION,
		best_score: [0, 0, 0]
	};

	publicAPI = {
		updateBestScore: updateBestScore,
	}

	return publicAPI;

	function updateBestScore(difficulty, score) {
		if (typeof ls === "undefined") {
			return score;
		}
		var maxScore = score;
		var getStorageScore = JSON.parse(ls.getItem("cloud-sweeper-settings"));

		if (getStorageScore) {
			// overwrite the template
			settings = getStorageScore;
			var storedBuildVersion = settings.build_version.split(".");
			var actualBuildVersion = Debug.BUILD_VERSION.split(".");

			if (storedBuildVersion[0] !== actualBuildVersion[0] || storedBuildVersion[1] !== actualBuildVersion[1]) {
				// reset all scores, when there was a minor/major update
				settings.best_score = [0, 0, 0]
			}
			maxScore = Math.max(
				score,
				settings.best_score[difficulty]
			);
		}
		settings.build_version = Debug.BUILD_VERSION;
		settings.best_score[difficulty] = maxScore;
		ls.setItem("cloud-sweeper-settings", JSON.stringify(settings));
		return maxScore;
	}

})();