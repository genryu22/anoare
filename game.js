export class GameLoader {

	constructor() {
		this.resourceRoot = "/";
	}

	async createGame() {
		let wordsList = await this.fetchWordsJson();
		let words = []
		for (let list of wordsList) {
			for (let w of list.words) {
				words.push(w);
			}
		}
		return new Game(words);
	}

	fetchWordsJson() {
		let urlList = [this.resourceRoot + "words.json"];
		let promises = [];
		for (let i in urlList) {
			let request = new XMLHttpRequest();
			request.open('GET', urlList[i]);
			request.responseType = 'json';
			request.send();
			promises.push(new Promise(r => {
				request.onload = function() {
					r(request.response);
				}
			}));
		}
		return Promise.all(promises);
	}
}

class Game {

	constructor(words) {
		this.words = words;
		console.log(words);

		this.pages = this.loadPages();
		this.switchPageTo(0);

		history.pushState(null, null, null);
		let game = this;
		window.addEventListener('popstate', e => {
			history.pushState(null, null, null);
			if (game.currentPage !== undefined) {
				game.currentPage.popstate.call(game.currentPage);
			}
		}); 
	}

	loadPages() {
		let mainMenu = new MainMenuPage(() => {
			this.switchPageTo(1);
		});
		let setting = new SettingPage((players, gameTime, gameNumber) => {
			this.switchPageTo(2, {players:players, time: gameTime, number: gameNumber});
		});
		let theme = new ThemePage(this.words, (players, points, option) => {
			this.switchPageTo(3, {players:players, points: points, gameOption: option});
		});
		let result = new ResultPage(option => {
			//this.switchPageTo(2, option);
			this.switchPageTo(1);
		});
		return [mainMenu, setting, theme, result];
	}

	switchPageTo(to, option={}) {
		for (let page of this.pages) {
			page.hide();
		}
		this.pages[to].show(option);
		this.currentPage = this.pages[to];
	}
}

class Page {

	constructor(id) {
		this.element = document.getElementById(id);
	}

	show(option) {
		this.element.style.display = 'block';
		this.shown(option);
	}

	shown(option) {

	}

	hide() {
		this.element.style.display = 'none';
	}

	popstate() {

	}
}

class MainMenuPage extends Page {

	constructor(endCallback) {
		super("mainMenu");

		document.getElementById("startButton").onclick = () => {
			endCallback();
		};
	}
}

class SettingPage extends Page {

	constructor(endCallback) {
		super("setting");

		this.set1 = document.getElementById("setting1");
		this.set2 = document.getElementById("setting2");

		this.showPage(0);

		document.getElementById("setting1NextButton").onclick = () => {
			this.showPage(1);
		}

		this.initInputs();
		this.setController("playerNumberController", "", 2, () => {return this.playerNumber}, v => this.setNumber(v));
		this.setController("timerController", "分", 1, () => {return this.gameTime});
		this.setController("gameNumberController", "周", 1, () => {return this.gameNumber});

		document.getElementById("setting2NextButton").onclick = () => {
			endCallback(this.players, this.gameTime, this.gameNumber);
		}
	}

	showPage(page) {
		if (page == 0) {
			this.set1.style.display = "block";
			this.set2.style.display = "none";
		} else {
			this.set2.style.display = "block";
			this.set1.style.display = "none";
		}
	}

	popstate() {
		this.showPage(0);
	}

	setController(id, unit, minimum, currentValue, callback=(v => {})) {
		let controller = document.getElementById(id);
		let valueElement = controller.getElementsByTagName("span").item(1);
		let down = controller.getElementsByClassName("down").item(0);
		down.onclick = () => {
			let newValue = currentValue() - 1;
			if (newValue < minimum) {
				return;
			}
			valueElement.innerText = newValue + unit;
			callback(newValue);
		}
		let up = controller.getElementsByClassName("up").item(0);
		up.onclick = () => {
			let newValue = currentValue() + 1;
			valueElement.innerText = newValue + unit;
			callback(newValue);
		}
	}

	setNumber(n) {
		if (n < 2) {
			return;
		}

		let inputs = document.getElementById("playerNameInputList").children;

		if (n == inputs.length) {
			return;
		}

		if (n > inputs.length) {
			for (let i = inputs.length; i < n; ++i) {
				document.getElementById("playerNameInputList").appendChild(this.createInput(i));
			}
		} else if (n < inputs.length) {
			let inputToRemove = [];
			for (let i in inputs) {
				if (i >= n) {
					inputToRemove.push(inputs[i]);
				}
			}
			for (let i of inputToRemove) {
				i.remove();
			}
		}

		document.getElementById("playerNumber").innerText = n.toString();
	}

	initInputs() {
		for (let i = 0; i < this.playerNumber; ++i) {
			document.getElementById("playerNameInputList").appendChild(this.createInput(i));
		}
	}

	createInput(i) {
		let nameInput = document.createElement("div");
		nameInput.setAttribute("class", "playerNameInput");
		let input = document.createElement("input");
		input.setAttribute("type", "text");
		input.setAttribute("placeholder", "プレイヤー" + (i + 1));
		nameInput.appendChild(input);
		return nameInput;
	}

	get players() {
		let playerList = [];
		for (let i of document.getElementById("playerNameInputList").getElementsByTagName("input")) {
			let v = i.value;
			if (v.length == 0) {
				v = i.getAttribute("placeholder");
			}
			playerList.push(v);
		};
		return playerList;
	}

	get playerNumber() {
		return Number(document.getElementById("playerNumber").innerText);
	}

	get gameTime() {
		return Number(document.getElementById("time").innerText.substring(0, document.getElementById("time").innerText.length - 1));
	}

	get gameNumber() {
		return Number(document.getElementById("gameNumber").innerText.substring(0,  document.getElementById("gameNumber").innerText.length - 1));
	}
}

class ThemePage extends Page {
	constructor(words, endCallback) {
		super("theme");

		this.endCallback = endCallback;

		this.words = words;
		this.themeHistory = [];

		this.theme1 = document.getElementById("theme1");
		this.theme2 = document.getElementById("theme2");

		document.getElementById("yesButton").onclick = () => {
			this.showThemePage();
		};

		this.innerPages = [];
		
		this.innerPages.push(document.getElementById("themeButtonInnerPage"));
		this.innerPages.push(document.getElementById("correntAnswerInnerPage"));
		this.innerPages.push(document.getElementById("wrongAnswerInnerPage"));
		this.innerPages.push(document.getElementById("katakanaInnerPage"));

		document.getElementById("choosePerson").onclick = () => {
			this.showPlayerList();
			this.showInnerPage(1);
		};
		document.getElementById("wrongAnswer").onclick = () => {
			this.showInnerPage(2);
		};
		document.getElementById("kanakana").onclick = () => {
			this.showPlayerList();
			this.showInnerPage(3);
		};

		for (let b of document.getElementsByClassName("cancelButton")) {
			b.onclick = () => {
				this.showInnerPage(0);
			}
		}

		document.getElementById("reselectTheme").onclick = () => {
			this.showThemePage();
		}
	}

	showPlayerList() {
		let listElements = document.getElementsByClassName("playerNameList");
		for (let i = 0; i < listElements.length; ++i) {
			let listElement = listElements[i];
			listElement.innerHTML = "";
			for (let j in this.players) {
				let p = this.players[j];
				if (j == this.currentPlayer) {
					continue;
				}

				let div = document.createElement("div");
				div.setAttribute("class", "playerNameButtonContainer");
				let button = document.createElement("button");
				button.setAttribute("class", "playerNameButton");
				button.innerText = p;
				switch (i) {
					case 0:
						button.onclick = () => {
							this.points[j] += 1;
							this.readyNextPlayer();			
						}
						break;
					case 1:
						button.onclick = () => {
							this.points[j] += 1;
							this.points[this.currentPlayer] -= 1;
							this.readyNextPlayer();			
						}
						break;
				}	
				div.appendChild(button);

				listElement.appendChild(div);
			}
		}
	}

	readyNextPlayer() {
		console.log(this.points);
		this.currentPlayer += 1;
		if (this.currentPlayer == this.players.length) {
			this.currentPlayer = 0;
			this.currentRound += 1;
			if (this.currentRound == this.number) {
				if (this.timer !== undefined) {
					clearInterval(this.timer);
				}
				this.endCallback(this.players, this.points, this.gameOption);
			}
		}

		this.showCheckPage();
	}

	showCheckPage() {
		document.getElementById("checkMessage").innerText = this.currentPlayerName + "さんですか？";
		this.showPage(0);
	}

	showThemePage() {
		this.startTimer();
		document.getElementById("themeString").innerText = this.generateTheme();
		document.getElementById("themeMessasge").innerText = this.currentPlayerName + "さんはカタカナを使わずにお題を説明してください。";
		this.showInnerPage(0);
		this.showPage(1);
	}

	startTimer() {
		if (this.timer !== undefined) {
			clearInterval(this.timer);
		}

		let left = this.time * 60;
		let func = () => {
			let minute = (left - left % 60) / 60;
			let secound = left - 60 * minute;
			document.getElementById("timer").innerText = minute + " : " + secound;

			if (--left == 0) {
				clearInterval(this.timer);
				alert("時間切れになったのでお題を変更します！");
				this.showThemePage();
			}
		}
		func();
		this.timer = setInterval(func, 1000);
	}

	showPage(page) {
		if (page == 0) {
			this.theme1.style.display = "block";
			this.theme2.style.display = "none";
		} else {
			this.theme2.style.display = "block";
			this.theme1.style.display = "none";
		}
	}

	showInnerPage(page) {
		for (let i in this.innerPages) {
			this.innerPages[i].style.display = i == page ? "block" : "none";
		}
	}

	popstate() {
		this.showInnerPage(0);
	}

	shown(option) {
		console.log(option);
		this.gameOption = option;
		this.players = option.players;
		this.time = option.time;
		this.number = option.number;
		this.currentRound = 0;
		this._currentPlayer = 0;
		this.points = [];
		for (let p in this.players) {
			this.points.push(0);
		}

		this.showCheckPage();
	}

	generateTheme() {
		let generateIndex = () => {return Math.floor(Math.random() * this.words.length)};
		let index;
		while(this.themeHistory.includes(index = generateIndex())) {
		}
		this.themeHistory.push(index);
		if (this.themeHistory.length == this.words.length) {
			this.themeHistory = [];
		}
		return this.words[index];
	}

	get currentPlayerName() {
		return this.players[this.currentPlayer];
	}

	get currentPlayer() {
		return this._currentPlayer;
	}

	set currentPlayer(player) {
		this._currentPlayer = player;
	}
}

class ResultPage extends Page {

	constructor(endCallback) {
		super("result");

		document.getElementById("nextGameButton").onclick = () => {
			endCallback(this.gameOption);
		}

		this.endCallback = endCallback;
	}

	popstate() {
		this.endCallback(this.gameOption);
	}

	shown(option) {
		console.log(option);
		this.gameOption = option.gameOption;
		this.players = option.players;
		this.points = option.points;

		document.getElementById("ranking").innerHTML = "";

		let rankToPoint = Array.from(new Set(this.points.slice().sort().reverse()));

		let pointToPlayers = {};
		for (let player in this.points) {
			let pointStr = this.points[player].toString();
			if (pointToPlayers[pointStr] === undefined) {
				pointToPlayers[pointStr] = [];
			}
			pointToPlayers[pointStr].push(player);
		}

		for (let rank in rankToPoint) {
			for (let player of pointToPlayers[rankToPoint[rank]]) {
				this.addPlayer(Number(rank) + 1, this.players[player], rankToPoint[rank]);
			}
		}
	}

	addPlayer(rank, name, point) {
		let playerOnRanking = document.createElement("div");
		playerOnRanking.setAttribute("class", "playerOnRanking");

		let rankDiv = document.createElement("div");
		rankDiv.setAttribute("class", "rank");
		let rankText = document.createElement("div");
		rankText.innerText = "#" + rank.toString();
		rankDiv.appendChild(rankText);
		playerOnRanking.appendChild(rankDiv);

		let nameDiv = document.createElement("div");
		nameDiv.setAttribute("class", "name");
		let nameText = document.createElement("div");
		nameText.innerText = name;
		nameDiv.appendChild(nameText);
		playerOnRanking.appendChild(nameDiv);

		let pointDiv = document.createElement("div");
		pointDiv.setAttribute("class", "point");
		let pointText = document.createElement("div");
		pointText.innerHTML = point.toString() + "<br>points";
		pointDiv.appendChild(pointText);
		playerOnRanking.appendChild(pointDiv);

		document.getElementById("ranking").appendChild(playerOnRanking);
	}
}