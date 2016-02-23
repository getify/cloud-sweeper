var Storage = (function Storage(){

	var publicAPI,
		defaultSettings,
		settings = {},

		STORAGE_KEY = "cloud-sweeper-settings";


	publicAPI = {
		updateBestScore: updateBestScore,
		loadStoredSettings: loadStoredSettings,
		getSettings: getSettings,
		saveSettings: saveSettings,
	};

	return publicAPI;


	// ******************************

	function loadStoredSettings() {
		defaultSettings = defaultSettings || {
			build_version: Debug.BUILD_VERSION,
			best_scores: [0, 0, 0, ],
		};

		try {
			var storedSettings = JSON.parse(
				Browser.localStorage.getItem(STORAGE_KEY)
			);

			// merge-update the settings structure
			Utils.deepMerge(storedSettings,defaultSettings);
			Utils.deepMerge(settings,storedSettings);

			// if build-version has changed, reset best scores
			resetBestScores();

			// update settings to current build version
			settings.build_version = default_settings.build_version;
		}
		catch (err) {
			if (Browser.localStorage) {
				Browser.localStorage.removeItem(STORAGE_KEY);
			}

			// clone the default-settings object
			Utils.deepMerge(settings,defaultSettings);
		}

		saveSettings();
	}

	function getSettings() {
		return settings;
	}

	function saveSettings() {
		try {
			Browser.localStorage.setItem(STORAGE_KEY,
				JSON.stringify(settings)
			);
		}
		catch (err) {
			console.log(err);
		}
	}

	function resetBestScores() {
		var storedBuildVersion = settings.build_version.split(".");
		var actualBuildVersion = defaultSettings.build_version.split(".");

		// has there been a minor/major version update?
		if (storedBuildVersion[0] !== actualBuildVersion[0] ||
			storedBuildVersion[1] !== actualBuildVersion[1]
		) {
			// reset all best scores
			settings.best_scores[0] = settings.best_scores[1] =
				settings.best_scores[2] = 0;
		}
	}

	function updateBestScore(difficulty,score) {
		if (score != settings.best_scores[difficulty]) {
			settings.best_scores[difficulty] = score;
			saveSettings();
		}
	}

})();
