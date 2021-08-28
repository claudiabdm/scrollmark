const positionsListElem = document.querySelector('.scrollmark__positions');
const savePositionForm = document.getElementById('savePositionForm');

browser.runtime.onMessage.addListener((message) => {
	if (message.command == 'position') {
		addNewPosition({ ...message.value });
	}
});

browser.tabs.executeScript({ file: '/content_script.js' }).then(listenToClicks);

loadSavedPositionsList();

function listenToClicks() {
	savePositionForm.addEventListener('submit', handleSave);
	positionsListElem.addEventListener('click', handleListClicks);

	async function handleSave(e) {
		e.preventDefault();
		const value = e.target.elements['markName'].value;
		const markName = value === '' ? 'Last saved' : value;
		const activeTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
		browser.tabs.sendMessage(activeTab.id, {
			command: 'savePosition',
			url: activeTab.url,
			markName,
		});
		e.target.reset();
	}

	async function handleListClicks(e) {
		const position = e.target.id;

		if (position) {
			if (e.target.id.includes('delete')) {
				deletePosition(e.target.parentNode);
			}
			if (e.target.id.includes('go-to')) {
				await goToPosition(e.target.parentNode.id);
			}
		}

		async function deletePosition(li) {
			const { savedPositionsList, activeTab } = await getSavedPositionsActiveTabFromStorage();
			const updatedPositions = savedPositionsList.filter(
				(obj) => Number(obj.position) !== Number(li.id)
			);
			browser.storage.local.set({ [activeTab.url]: updatedPositions });
			positionsListElem.removeChild(li);
		}

		async function goToPosition(position) {
			const activeTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
			browser.tabs.sendMessage(activeTab.id, {
				command: 'scrollToPosition',
				position,
			});
		}
	}
}

async function loadSavedPositionsList() {
	const { savedPositionsList } = await getSavedPositionsActiveTabFromStorage();
	createPositionsList(savedPositionsList);
}

async function getSavedPositionsActiveTabFromStorage() {
	const activeTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
	const savedPositions = await browser.storage.local.get(`${activeTab.url}`);
	const savedPositionsList = !savedPositions.hasOwnProperty(activeTab.url)
		? []
		: savedPositions[activeTab.url];
	return { savedPositionsList, activeTab };
}

function createPositionsList(positionsList) {
	const fragement = document.createDocumentFragment();
	for (let obj of positionsList) {
		const li = createLi({ ...obj });
		fragement.appendChild(li);
	}
	positionsListElem.appendChild(fragement);
}

function createLi({ position, markName }) {
	const li = document.createElement('li');
	li.classList.add('scrollmark__position');
	li.id = position;

	const goToButton = createGoToButton(position, markName);
	const deleteButton = createDeleteButton(position);

	li.appendChild(goToButton);
	li.appendChild(deleteButton);
	return li;
}

function createGoToButton(position, markName) {
	const goToButton = document.createElement('button');
	goToButton.classList.add('scrollmark__btn', 'scrollmark__btn--position');
	goToButton.type = 'button';
	goToButton.textContent = markName;
	goToButton.id = `go-to-${position}`;
	return goToButton;
}

function createDeleteButton(position) {
	const deleteButton = document.createElement('button');
	deleteButton.classList.add('scrollmark__btn', 'scrollmark__btn--delete');
	deleteButton.type = 'button';
	deleteButton.ariaLabel = 'Delete mark';
	deleteButton.id = `delete-${position}`;

	const deleteSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	deleteSvg.classList.add('scrollmark__icon');
	deleteSvg.ariaHidden = 'true';

	const useSvg = document.createElementNS('http://www.w3.org/2000/svg', 'use');
	useSvg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'sprite.svg#delete');

	deleteSvg.appendChild(useSvg);
	deleteButton.appendChild(deleteSvg);
	return deleteButton;
}

async function addNewPosition({ position, markName, url }) {
	const savedPositions = await browser.storage.local.get(`${url}`);
	if (!savedPositions.hasOwnProperty(url)) {
		browser.storage.local.set({ [url]: [{ position, markName }] });
		const newLi = createLi({ position, markName });
		positionsListElem.appendChild(newLi);
	} else {
		const updatedPositions = [...savedPositions[url]];
		const positionSavedIdx = updatedPositions.findIndex((obj) => obj.position == position);
		if (positionSavedIdx < 0) {
			const newLi = createLi({ position, markName });
			positionsListElem.appendChild(newLi);
			updatedPositions.push({ position, markName });
		} else {
			const goToButton = document.getElementById(`go-to-${position}`);
			goToButton.textContent = markName;
			updatedPositions[positionSavedIdx] = { position, markName };
		}
		browser.storage.local.set({ [url]: updatedPositions });
	}
}
