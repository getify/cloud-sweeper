var Interaction = (function Interaction(){
	"use strict";

	var publicAPI,
		touchDisabled = false;

	publicAPI = {
		setupPlayInteraction: setupPlayInteraction,
		teardownPlayInteraction: teardownPlayInteraction,
		disableEvent: disableEvent,
		disableTouch: disableTouch,
		enableTouch: enableTouch,
		fixTouchCoords: fixTouchCoords,
		detectKey: detectKey,

		KEYBOARD_SPACE: 1,
		KEYBOARD_ENTER: 2,
		KEYBOARD_ESC: 3,
		KEYBOARD_1: 4,
		KEYBOARD_2: 5,
		KEYBOARD_3: 6,

		EVENT_KEY_DOWN: "keydown",
		EVENT_KEY: "keydown keypress",
		EVENT_PRESS: "keydown keypress mousedown touchstart pointerstart"
	};

	return publicAPI;


	// ******************************

	function setupPlayInteraction(onPlayPress,onPlayRelease) {
		Utils.onEvent("keydown mousedown touchstart pointerdown",onPlayPress);
		Utils.onEvent("keyup mouseup touchcancel touchend pointercancel pointerup",onPlayRelease);
	}

	function teardownPlayInteraction(onPlayPress,onPlayRelease) {
		Utils.offEvent("keydown mousedown touchstart pointerdown",onPlayPress);
		Utils.offEvent("keyup mouseup touchcancel touchend pointercancel pointerup",onPlayRelease);
	}

	function disableEvent(evt) {
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
	}

	function disableTouch() {
		if (!touchDisabled) {
			touchDisabled = true;
			Utils.onEvent("touchstart touchcancel touchend pointerdown pointercancel pointerend",disableEvent);
		}
	}

	function enableTouch() {
		if (touchDisabled) {
			touchDisabled = false;
			Utils.offEvent("touchstart touchcancel touchend pointerdown pointercancel pointerend",disableEvent);
		}
	}

	// normalize touch event handling
	function fixTouchCoords(evt) {
		if (evt.type == "touchstart" || evt.type == "touchcancel" || evt.type == "touchend") {
			if (evt.touches && evt.touches.length > 0) {
				evt.clientX = evt.touches[0].clientX;
				evt.clientY = evt.touches[0].clientY;
				evt.screenX = evt.touches[0].screenX;
				evt.screenY = evt.touches[0].screenY;
			}
		}
		return evt;
	}

	// normalize keyboard event handling
	function detectKey(evt) {
		if (evt.type == "keydown" || evt.type == "keyup" || evt.type == "keypress") {
			if (
				evt.key == "Spacebar" ||
				evt.key == " " ||
				evt.keyCode == 32 ||
				evt.charCode == 32
			) {
				return publicAPI.KEYBOARD_SPACE;
			}
			else if (
				evt.key == "Enter" ||
				evt.keyCode == 13 ||
				evt.charCode == 13
			) {
				return publicAPI.KEYBOARD_ENTER;
			}
			else if (
				evt.key == "Esc" ||
				evt.key == "Escape" ||
				evt.keyCode == 27 ||
				evt.charCode == 27
			) {
				return publicAPI.KEYBOARD_ESC;
			}
			else if (
				evt.key == "1" ||
				evt.keyCode == 49 ||
				evt.charCode == 49
			) {
				return publicAPI.KEYBOARD_1;
			}
			else if (
				evt.key == "2" ||
				evt.keyCode == 50 ||
				evt.charCode == 50
			) {
				return publicAPI.KEYBOARD_2;
			}
			else if (
				evt.key == "3" ||
				evt.keyCode == 51 ||
				evt.charCode == 51
			) {
				return publicAPI.KEYBOARD_3;
			}
		}
	}

})();
