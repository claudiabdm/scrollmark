(function () {
	if (window.hasRun) {
		return;
	}
	window.hasRun = true;

	function saveScrollPosition(position, { markName, url }) {
		browser.runtime.sendMessage({
			command: 'position',
			value: { position, markName, url },
		});
	}

	function scrollToPosition(position) {
		document.documentElement.scrollTo({
			top: position,
			behavior: 'smooth',
		});
	}

	browser.runtime.onMessage.addListener((message) => {
		if (message.command == 'savePosition') {
			saveScrollPosition(document.documentElement.scrollTop, { ...message });
		}
		if (message.command == 'scrollToPosition') {
			scrollToPosition(message.position);
		}
	});
})();
