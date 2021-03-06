/* 
 * #######################################
 * #############    SETUP    #############
 * #######################################
 */
var path = window.location.href.substring(0, window.location.href.lastIndexOf('/')+1);
var scale = 20; // px per tile
var deadline = 60; // seconds left in turn after solution was found
var colors = ["red", "blue", "yellow", "green", "black"];
var directions = ["up", "left", "down", "right"];

var turn; // gets set every turn
var map; // gets set on map creation
var game; // gets set on game start

var ajaxtime = Date.now(); // time the last ajax request was sent
var ajaxspeed = 5000; // milliseconds between ajax requests

var data = { // ajax data
  game: {robots: null, pieces: null, seed: 0, round: 0, solved: null, solution: null},
  me: {name: "Gast", targets: 0, points: 0, round: 0, solved: null, solution: null}
}

var playback = null; // holds the solution for playback after turn has ended
var ismine = false; // whether or not the found solution is by the player

var players = []; // received data from other players

if (document.readyState === "complete" ||
    (document.readyState !== "loading" && !document.documentElement.doScroll)) {
  ajax("init", {}, init, solo);
} else {
  document.addEventListener("DOMContentLoaded", function(){ajax("init", {}, init, solo);});
}

/* 
 * #######################################
 * #############    AJAX    ##############
 * #######################################
 */

function ajax(get, data, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.open('PUT', path+'ajax.php?do='+get);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    if (xhr.status === 200) {
        var response = JSON.parse(xhr.responseText);
        if (undefined!=response && null!=response && response.hasOwnProperty("error")) 
          for (var i=0; i<response.error.length; i++) {console.log(response.error[i]);}
	success(response);
    } else error();
  };
  xhr.ontimeout = solo;
  xhr.onerror = solo;
  xhr.send(JSON.stringify(data));
}

function loop() {
  if (Date.now()-ajaxtime>ajaxspeed) {
    ajaxtime = Date.now(); 
    ajax("play", {data}, play, solo);
  }
  window.requestAnimationFrame(loop);
}

function nothing(response) {}

function solo(response) {
  console.log("Netzwerkproblem, von nun an Singleplayer.");
  console.log(response);
  document.querySelector(".ricochetrobots .players").innerHTML="Netzwerkfehler oder keine Netzwerkverbindung!";
  ajax = nothing;
  showLobby = startGame;
  if (null==data.game || 0==data.game.seed) showLobby();
}

function init(response) {
  ajaxtime = Date.now();
  window.requestAnimationFrame(loop); 
  if (null==response.gamedata || null==response.gamedata.json) {showLobby(); return;}
  restoreGame(response);
  display("Laufendem Spiel beigetreten!");
}

function play(response) {
  function getOwner() {
    var owner = "Jemand";
    if (null != response.gamedata.json.firstSolved) {
      for (var i=0; i<players.length; i++) {
        if (players[i].solved == response.gamedata.json.solved) owner = players[i].name;
      }
    }
    return owner;
  }
  players = [];
  var names = [];
  for (var i=0; i<response.playerdata.length; i++) {
    var player = response.playerdata[i];
    if (!player.hasOwnProperty("json") || null == player["json"] || "" == player["json"]) 
      continue;
    if (player.hasOwnProperty("me") && player["me"]) {
      if (data.me.name=="Gast" && player["name"]!="Gast") {
        data.me.name = player["name"];
        if (null!=document.querySelector(".ricochetrobots input.name")) document.querySelector(".ricochetrobots input.name").value=data.me.name;
      }
      continue;
    }
    players.push(player["json"]);
    if ((Date.now()-(new Date(player["time"]))<(5*ajaxspeed) && 
       (null==response.gamedata || null==response.gamedata.json || data.game.round==player["json"].round)))
       {names.push(player["json"].name);}
  }
  text = (names.length>0) ? "Mitspieler: "+names.join(", ") : "";
  document.querySelector(".ricochetrobots .players").innerHTML=text;
  if (0==data.game.seed) { // currently not in a game
    if (null!=response.gamedata && null!= response.gamedata.json && 0!=response.gamedata.seed) { 
      // ... but there is a game
      restoreGame(response);
      display("Ein Spiel wurde gestartet!");
    }
  }
  else { // currently in a game
    if (null==response.gamedata || null== response.gamedata.json || 0==response.gamedata.seed) {
      // ... but game has ended
      endGame(); return;
    }
    if (data.me.round==response.gamedata.json.round) { // we are in the same turn as the rest of the game
      if ((response.gamedata.json.seed != data.game.seed && 0!=response.gamedata.json.seed)
          || divergingRobots(response.gamedata.json.robots, data.game.robots)) {
        // ... but there's a different game running
        display("Spiel weicht vom Stand im Netzwerk ab und wird wiederhergestellt.");
        restoreGame(response); 
        return;
      }
      if (null!=response.gamedata.json.firstSolved) { // there is a solution
        if (null==data.game.firstSolved) { // first solution found
          var owner = getOwner();
          ismine = false;
	  data.game.firstSolved = response.gamedata.json.firstSolved;
	  data.game.solved = response.gamedata.json.solved;
	  data.game.solution = response.gamedata.json.solution;
	  document.querySelector(".ricochetrobots .points .turn").classList.add("stranger");
          document.querySelector(".ricochetrobots .points .turn").innerHTML = response.gamedata.json.solution.length;
	  display(owner+" hat eine Lösung gefunden");
	  game.timeleft = deadline-Math.round((Date.now()-response.gamedata.json.firstSolved)/1000);
	  if (game.timeleft<0) game.timeleft=1; // out of time (just in case of network problems)
	  countdown(game.timeleft);
        }
        else if (response.gamedata.json.firstSolved!=data.game.firstSolved) { // simultaneous solutions
          if (response.gamedata.json.firstSolved<data.game.firstSolved) { // player wasn't first
            var owner = getOwner();
            display(owner+" war zuerst da!");
	    data.game.firstSolved = response.gamedata.json.firstSolved;
            game.timeleft = deadline-Math.round((Date.now()-response.gamedata.json.firstSolved)/1000);
	    if (game.timeleft<0) game.timeleft=1; // out of time (just in case of network problems)
	    countdown(game.timeleft);
            if (data.game.solution.length>=response.gamedata.json.solution) { // player was not best, either
              ismine = false;
	      data.game.solved = response.gamedata.json.solved;
	      data.game.solution = response.gamedata.json.solution;
	      document.querySelector(".ricochetrobots .points .turn").classList.add("stranger");
              document.querySelector(".points .turn").innerHTML = response.gamedata.json.solution.length;
            }
          }
        }
        else if (response.gamedata.json.solution.length<data.game.solution.length) { // faster solution
          var owner = getOwner();
          ismine = false;
	  data.game.solved = response.gamedata.json.solved;
	  data.game.solution = response.gamedata.json.solution;
	  turn.points = 0;
	  document.querySelector(".ricochetrobots .points .turn").classList.add("stranger");
          document.querySelector(".ricochetrobots .points .turn").innerHTML = response.gamedata.json.solution.length;
	  display(owner+" war besser!");
        }
        if (Math.abs(deadline-Math.round((Date.now)-response.gamedata.json.firstSolved)/1000)-game.timeleft>1) { 
          // check timer
          var timeleft = deadline-Math.round(((Date.now)-response.gamedata.json.firstSolved)/1000);
          if (timeleft < 0) timeleft = 0;
          countdown(timeleft);
        }
      } else if (null==data.game.firstSolved) {
        clearInterval(game.timer); // make sure timer is not running.
      }
    }
    else if (data.me.round==response.gamedata.json.round-1) { // we are one turn off
      console.log("Der Server ist schon eine Runde weiter");
      clearInterval(game.timer); // make sure the clock is no longer ticking
      endTurn(); 
    }
    else if (data.me.round!=response.gamedata.json.round+1) { // off by more than one turn, or magically ahead
      clearInterval(game.timer);
      data.game = response.gamedata.json;
      restoreGame(response); // best to redraw completely
      display("Spiel neu geladen");
    }
  }  
}

function divergingRobots(a, b) {
  for (var i=0; i<a.length; i++) {
    if (!isDuplicate(a[i], b, ["color","x","y"])) return true;
  }
  return false;
}

function checkGameStart(response) {
  if (undefined!=response && null!=response && response.hasOwnProperty("error")) 
    for (var i=0; i<response.error.length; i++) {
      if (response.error[i]=="Duplicate entry '?' for key 'room'") {
        restoreGame(response);
        display("Ein anderes Spiel wurde früher begonnen.");
      }
    }
  else {
    endGame();
    display("Spiel konnte nicht gestartet werden.");
  }
}

/* 
 * #######################################
 * #########    BASIC CLASSES    #########
 * #######################################
 */

function Tile(x, y) {
  this.x = x;
  this.y = y;
  this.getTile = getTile;
  this.robot = null;
  this.target = null;
  this.walls = [false,false,false,false]; // index is direction
}

function Target(x,y,color,dir) {
  this.x = x;
  this.y = y;
  this.tile = map.nested[x][y];
  this.color = color;
  this.activate = function() {
    document.querySelector(".ricochetrobots .target").className="target fa fa-star "+colors[color];
    document.querySelector(".ricochetrobots .target").style="top: "+scale*this.y+"px; left: "+scale*this.x+"px;";
    turn.target = map.targets.indexOf(this);
  }
  this.dir = dir; // first wall counterclockwise
}

function Robot(x,y,color) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.tile = map.nested[x][y];
  this.tile.robot = this;
  this.move = moveRobot;
  this.show = showMoves;
  this.activate = setActive;
}

function deactivateRobot() {
  if (null != turn.robot) 
    document.querySelector(".ricochetrobots .robot.active").classList.remove("active");
  turn.robot = null;
  exorcise();
}

function Solution(steps) {
  for (var i=0; i<steps.length; i++) {
    this[i] = {color: steps[i].color, dir: steps[i].dir};
  }
  this.length = steps.length;
}

/* 
 * #######################################
 * #########    BASIC UTILITY    #########
 * #######################################
 */

function getTile(dir) {
  var x = this.x;
  var y = this.y;
  if (this.walls[dir]) return this;
  var tile;
  switch(dir) {
    case 0: tile = map.nested[x][y-1]; break;
    case 1: tile = map.nested[x-1][y]; break;
    case 2: tile = map.nested[x][y+1]; break;
    case 3: tile = map.nested[x+1][y]; break;
    default: return this;
  }
  return (null == tile.robot) ? tile.getTile(dir) : this;
}

function moveHere() {
  this.robot.move(this.direction);
}

function setActive() {
  if (!game.running) return;
  var robot = this.robot || this;
  if (turn.robot == robot) return;
  deactivateRobot();
  exorcise();
  turn.robot = robot;
  robot.show();
  document.querySelector(".ricochetrobots .robot."+colors[robot.color]).classList.add("active");
}

function moveTo (robot, tile) {
  robot.tile.robot = null;
  tile.robot = robot;
  robot.tile = tile;
  robot.x = tile.x;
  robot.y = tile.y;
  document.querySelector(".robot."+colors[robot.color]).style="top: "+scale*robot.y+"px; left: "+scale*robot.x+"px;";
}

function moveRobot(dir) {
  if (!game.running) return;
  var robot = this;
  var endpoint = robot.tile.getTile(dir);
  if (endpoint == robot.tile) return;
  turn.solution.push({color: robot.color, dir: dir, robot: robot, start: robot.tile, end: endpoint});
  document.querySelector(".ricochetrobots .solution .current").innerHTML += '<div class="move fa fa-arrow-'+directions[dir]+' '+colors[robot.color]+'"></div>';
  moveTo(robot, endpoint);
  //check if target is reached
  if (null !== turn.target && endpoint.target == map.targets[turn.target] && 
     (robot.color == map.targets[turn.target].color || map.targets[turn.target].color == 4)) {
    targetReached();
  }
  //show next moves again
  exorciseAll();
  if (null !== turn.robot) turn.robot.show();
}

function stepBack() {
  if (turn.solution.length==0) return;
  step = turn.solution[turn.solution.length-1];
  var dir = (step.dir>1) ? step.dir-2 : step.dir+2;
  moveTo(step.robot, step.start);
  turn.solution.pop();
  if (null != turn.robot) {
    exorciseAll();
    turn.robot.show();
  }
  var moves = document.querySelectorAll(".ricochetrobots .solution .move");
  moves[moves.length-1].remove();
}

function stepAllBack() {
  if (null == turn || null == turn.solution) return;
  var count = turn.solution.length;
  for (var i=0; i<count; i++) stepBack();
}

/* 
 * #######################################
 * ##########    GUI HELPERS    ##########
 * #######################################
 */

function display(text) {
  console.info(text);
  var box = document.createElement("div");
  box.className = "display";
  box.style = "top: -88px;";
  var div = document.createElement("div");
  var span = document.createElement("span");
  span.innerHTML = text;
  div.appendChild(span);
  box.appendChild(div)
  document.querySelector(".ricochetrobots").appendChild(box);
  setTimeout(function(){box.style="top: -4px; transition: top .5s;";},200);
  setTimeout(function(){box.style="top: -88px;";},2000);
  setTimeout(function(){box.remove();}, 5000);
}

function handleKey(e) {
  if (!game.running) return;
  var key = e.keyCode;
  if (key>48 && key<54) { // num keys 1-4
    if (key-49<map.robots.length) map.robots[key-49].activate();
  }
  if (key>36 && key<41 && null!=turn.robot) { // arrow keys
    switch (key) {
      case 37: turn.robot.move(1); break;
      case 38: turn.robot.move(0); break;
      case 39: turn.robot.move(3); break;
      case 40: turn.robot.move(2); break;
    }
  }
  if (key==48) { // num key 0
    deactivateRobot();
  }
  if (key==8) { // backspace
    stepBack();
  }
  if (key==27) { // escape
    stepAllBack();
  }
}

function showMoves() {
  if (!game.running) return;
  var robot = this.robot || this;
  if (turn.robot == robot && this.constructor != Robot) return;
  exorcise();
  for (var dir=0; dir<4; dir++) {
    var endpoint = robot.tile.getTile(dir);
    if (robot.tile == endpoint) continue; // nothing to do here
    var arrow = document.createElement("div");
    arrow.className = "arrow "+colors[robot.color];
    arrow.style = "top: "+scale*(Math.min(endpoint.y,robot.tile.y)+0.45)+"px; "
        +"left: "+scale*(Math.min(endpoint.x,robot.tile.x)+0.45)+"px; "
        +"width: "+scale*(Math.abs(endpoint.x-robot.tile.x)+0.1)+"px; "
        +"height: "+scale*(Math.abs(endpoint.y-robot.tile.y)+0.1)+"px;";
    document.querySelector(".ricochetrobots .map").appendChild(arrow);
    var pointer = document.createElement("div");
    pointer.className = "arrow head "+colors[robot.color]+" "+directions[dir];
    pointer.style = "top: "+scale*endpoint.y+"px; left: "+scale*endpoint.x+"px;";
    document.querySelector(".ricochetrobots .map").appendChild(pointer);
    var ghost = document.createElement("div");
    ghost.className = "ghost "+colors[robot.color];
    ghost.style = "top: "+scale*endpoint.y+"px; left: "+scale*endpoint.x+"px;";
    ghost.robot = robot;
    ghost.direction = dir;
    ghost.addEventListener("click", moveHere);
    document.querySelector(".ricochetrobots .map").appendChild(ghost);
  }
}

function exorcise() { // remove ghosts of inactive Robots
  var ghosts = document.querySelectorAll(".ricochetrobots .ghost, .ricochetrobots .arrow");
  for (var i=0; i<ghosts.length; i++) {
    if (null===turn.robot || !ghosts[i].classList.contains(colors[turn.robot.color]))
      ghosts[i].remove();
  }
}

function exorciseAll() { // remove ghosts
  var ghosts = document.querySelectorAll(".ricochetrobots .ghost, .ricochetrobots .arrow");
  for (var i=0; i<ghosts.length; i++) {
    ghosts[i].remove();
  }
}

/* 
 * #######################################
 * #########    GAMEPLAY    #########
 * #######################################
 */

function targetReached() {
  game.running = false;
  deactivateRobot();
  if (!isDuplicate(turn.solution, turn.solutions, ["color", "dir"], false)) {
    if (null == turn.fastest || turn.solution.length<turn.solutions[turn.fastest].length) { // new personal "fastest"
      if (null == turn.fastest && null==data.game.solution) display("Erster!");
      else if (null == turn.fastest) display("Geschafft!");
      else if (null==data.game.solution || turn.solution.length<data.game.solution.length) display("Rekord!"); 
      else display("Schon besser!"); 
      turn.fastest = turn.solutions.length;
      turn.points = turn.solution.length;
      if (null==data.game.solution || turn.solution.length<data.game.solution.length) {
        document.querySelector(".ricochetrobots .points .turn").classList.remove("stranger");
        document.querySelector(".ricochetrobots .points .turn").innerHTML = turn.solution.length;
      }
      document.querySelector(".ricochetrobots .solution .best").innerHTML = document.querySelector(".ricochetrobots .solution .current").innerHTML
        +'<span class="ownpoints">'+turn.solution.length+'</span>';
      data.me.solution = new Solution(turn.solution);
      if (null==data.game.solution || turn.solution.length<data.game.solution.length) {
	ismine = true;
	var solved = Date.now();
	data.game.solved = solved;
	data.me.solved = solved;
	if (null==data.game.solution) {
          countdown(deadline);
          data.game.firstSolved = solved;
        }
        data.game.solution = new Solution(turn.solution);
      }
    } else display("Ziel erreicht!");
    turn.solutions.push(new Solution(turn.solution));
    var archivedsolution = document.createElement("div");
    archivedsolution.className="singlesolution";
    archivedsolution.innerHTML=document.querySelector(".ricochetrobots .solution .current").innerHTML;
    document.querySelector(".ricochetrobots .solution .all").prepend(archivedsolution);
  } else display("Diese Lösung hattest du schon!");
  // set all robots to beginning after a moment of time so the animation finishes first
  setTimeout(function(){
      stepAllBack();
      turn.solution = [];
      game.running = true;
    },1000);
}

function countdown(seconds) {
  game.timeleft = seconds;
  clearInterval(game.timer);
  game.timer = setInterval(count,1000);
}

function count() {
  var m = ("0"+Math.floor(game.timeleft/60)).slice(-2);
  var s = ("0"+game.timeleft%60).slice(-2);
  var time = document.querySelector(".ricochetrobots .time");
  time.innerHTML = m+":"+s;
  if (game.timeleft>120) time.className="time g120";
  else if (game.timeleft>60) time.className="time g60";
  else if (game.timeleft>30) time.className="time g30";
  else if (game.timeleft>10) time.className="time g10";
  else time.className="time l10";
  if (game.timeleft < 1) {
    clearInterval(game.timer);
    endTurn();
  }
  game.timeleft--;
}

function endTurn() {
  game.running = false;
  game.points += calculateTurnPoints();
  if (ismine) game.targetsWon++;
  data.me.targets = game.targetsWon;
  data.me.points = game.points;
  document.querySelector(".ricochetrobots .fullpoints").innerHTML = game.points;
  document.querySelector(".ricochetrobots .targets").innerHTML = game.targetsWon;
  if (ismine) display("Punkt für dich!"); else display("Zeit abgelaufen"); // TODO write "Punkt für $name"
  stepAllBack();
  turn.target++;
  playback = data.game.solution;
  turn.solved = null;
  turn.solution = null;
  playSolution();
  deactivateRobot();
}

function calculateTurnPoints() {
  if (null == data.game.solution) return 0;
  if (ismine) return data.game.solution.length;
  var longest=0;
  for (var i=0; i<players.length; i++) {
    if (players[i].round == data.game.round 
       && players[i].solution != null 
       && players[i].solution.length>longest)
      longest = players[i].solution.length;
  }
  return longest+10;
}

function playSolution() {
  function playStep(i) {
    var step = playback[i];
    setTimeout(function(){
      moveTo(map.robots[step.color], map.robots[step.color].tile.getTile(step.dir));
    },(1000*(i+2)));
  }
  var delay = 2100;
  if (null==playback) display("Keine Lösung");
  else {
    for (var i=0; i<playback.length; i++) {
      playStep(i);
      delay += 1000;
    }
  }
  setTimeout(activateNextTarget, delay);
}

function activateNextTarget() {
  document.querySelector(".ricochetrobots .solution .best").innerHTML = "";
  document.querySelector(".ricochetrobots .solution .current").innerHTML = "";
  document.querySelector(".ricochetrobots .solution .all").innerHTML = "";
  document.querySelector(".ricochetrobots .points .turn").innerHTML = "&nbsp;";
  document.querySelector(".ricochetrobots .time").classList.remove("l10");
  document.querySelector(".ricochetrobots .time").innerHTML = "&nbsp;";
  for (var i=0; i<map.robots.length; i++) {
    data.game.robots[i].x = map.robots[i].x;
    data.game.robots[i].y = map.robots[i].y;
  }
  if (null == turn || turn.target<map.targets.length) {
    var current = (null == turn) ? 0 : turn.target;
    turn = {solutions: [], solution: [], fastest: null, target: current, robot: null, points: 0};
    map.targets[turn.target].activate();
    document.querySelector(".ricochetrobots .round").innerHTML = turn.target+1;
    game.running = true;
    data.game.round = turn.target;
    data.me.round = turn.target;
    data.me.solution = null;
    data.game.solution = null;
    data.game.firstSolved = null;
    data.game.solved = null;
    data.me.solved = null;
    ismine = false;
  } else endGame();
}

/* 
 * #######################################
 * #########    OTHER HELPERS    #########
 * #######################################
 */

function isDuplicate(piece, array, properties, obj=true) {
  for (var i=0; i<array.length; i++) {
    var different = false;
    if (!obj) { // looking for an array within an array
      if (piece.length != array[i].length) different = true;
      else {
        for (var elem=0; elem<piece.length; elem++) {
          if (!isDuplicate(piece[elem], [array[i][elem]], properties)) different = true;
        }
      }
    } else
    for (var prop=0; prop<properties.length; prop++) {
      if (piece[properties[prop]] != array[i][properties[prop]]) different = true;
    }
    if (!different) return true;
  }
  return false;
}

function shuffle(array, seed) {
  while (seed.length<array.length) {seed = "0"+seed;}
  var j, x, i;
  for (i = array.length - 1; i > 0; i--) {
    j = Math.floor(seed[i] * 0.1 * (i + 1));
    x = array[i];
    array[i] = array[j];
    array[j] = x;
  }
  return array;
}

/* 
 * #######################################
 * ###    SCREENS & GAME MANAGEMENT    ###
 * #######################################
 */

function showLobby() {
  data = {
    game: {robots: null, pieces: null, seed: 0, round: 0, firstSolved: null, solved: null, solution: null},
    me: {name: function(){return data.me.name;}(), targets: 0, points: 0, round: 0, solved: null, solution: null},
  }
  document.querySelector(".ricochetrobots .map").innerHTML="";
  var lobby = document.createElement("div");
  lobby.className="lobby";
  var button = document.createElement("div");
  button.className="btn start";
  button.onclick=startGame;
  button.innerHTML="Start!";
  lobby.appendChild(button);
  document.querySelector(".ricochetrobots .map").appendChild(lobby);
  var solutionwrapper = document.querySelector(".ricochetrobots .solutionwrapper");
  solutionwrapper.innerHTML='<input type="text" class="name" value="'+data.me.name+'">';
  var renamebutton = document.createElement("div");
  renamebutton.className="rename";
  renamebutton.onclick=rename;
  renamebutton.innerHTML="Umbenennen";
  solutionwrapper.appendChild(renamebutton);
  // TODO: do rooms per get variable
}

function rename() {
  data.me.name = document.querySelector(".ricochetrobots input.name").value;
}

function startGame() {
  data.game = {robots: null, pieces: null, seed: 0, round: 0, firstSolved: null, solved: null, solution: null};
  map = {nested: [], targets: [], robots: null, pieces: null, seed: null};
  game = {timer: null, timeleft: null, running: false, points: 0, targetsWon: 0}
  createMap();
  turn = null;
  window.addEventListener("keydown", handleKey);
  activateNextTarget();
  display("Runde gestartet!");
  game.running = true;
  ajax("start", {data}, checkGameStart, solo);
}

function endGame() {
  ajax("end", {}, nothing, solo);
  clearInterval(game.timer);
  game.timer = null;
  window.addEventListener("keydown", function(){});
  document.querySelector(".ricochetrobots .points").style="";
  document.querySelector(".ricochetrobots .time").style="";
  document.querySelector(".ricochetrobots .map").innerHTML="";
  document.querySelector(".ricochetrobots .solutionwrapper").innerHTML="";
  var pointspace = document.createElement("div");
  pointspace.className = "text";
  pointspace.innerHTML = "<h3>Punkte</h3>"
  // add self
  players.push(data.me);
  // get worst score for calculations
  var worst = 0;
  for (var i=0; i<players.length; i++) {
    if (null!=players[i].points && players[i].points > worst) worst = players[i].points;
  }
  // sort
  players.sort(function(a, b){
    if (a.targets < b.targets) return 1;
    if (a.targets > b.targets) return -1;
    if (a.points > b.points) return 1;
    if (a.points < b.points) return -1;
    return 0;
  });
  // loop again to display
  for (var i=0; i<players.length; i++) {
    player = players[i];
    // calculate score if player not active anymore
    if (player.round==data.game.round-1) { // last seen last round
      if (null != player.solution) player.points = player.points+player.solution.length;
      else if (null != data.game.solution) {ismine=false; player.points += calculateTurnPoints();}
    }
    if (player.round==data.game.round) { // last seen this round
      player.points = player.points;
    }
    else { // too long ago, new points set
      player.points = worst+(10*(data.game.round-player.round)); // TODO can escalate points because penalty could get added again and again
    }
    var className = (player==data.me) ? "score me" : "score";
    pointspace.innerHTML += '<div class="'+className+'">'+player.name
        +'<span class="pts">'+player.targets+'</span><span class="pts">'+player.points+'</span></div>';
  }
  document.querySelector(".ricochetrobots .solutionwrapper").appendChild(pointspace);
  var lobby = document.createElement("div");
  lobby.className="lobby";
  lobby.innerHTML="<br><br><br><span>Spiel beendet!</span>";
  var button = document.createElement("div");
  button.className="btn start";
  button.onclick=showLobby;
  button.innerHTML = "Zur Lobby!";
  lobby.appendChild(button);
  document.querySelector(".ricochetrobots .map").appendChild(lobby);
  data = {
    game: {robots: null, pieces: null, seed: 0, round: 0, firstSolved: null, solved: null, solution: null},
    me: {name: data.me.name, targets: 0, points: 0, round: 0, solved: null, solution: null},
  }
}

/* 
 * #######################################
 * #########    GAME CREATION    #########
 * #######################################
 */

function restoreGame(response) {
  console.log("Spiel wiederhergestellt");
  // restoreGame will reset these, so I need to collect it before
  var firstSolved = response.gamedata.json.firstSolved;
  var solved = response.gamedata.json.solved;
  var gamesolution = response.gamedata.json.solution;
  enterGame(response);
  data.game.firstSolved = firstSolved;
  data.game.solved = solved;
  data.game.solution = gamesolution;
  if (null != firstSolved) {
    game.timeleft = deadline-Math.round((Date.now()-firstSolved)/1000);
    if (game.timeleft<0) game.timeleft=0; // everyone left the game before the timer run out
    countdown(game.timeleft);
    document.querySelector(".ricochetrobots .points .turn").innerHTML = data.game.solution.length;
  }
}

function enterGame(response) {
  data.game = response.gamedata.json;
  map = {nested: [], targets: [], 
         robots: response.gamedata.json.robots, 
	 pieces: response.gamedata.json.pieces, 
	 seed: response.gamedata.json.seed};
  game = {timer: null, timeleft: null, running: false, points: 0, targetsWon: 0}
  turn = {solutions: [], solution: [], fastest: null, target: data.game.round, robot: null, points: 0};
  var me = null;
  var worst = 0;
  for (var i=0; i<response.playerdata.length; i++) {
    var player = response.playerdata[i];
    if (player.hasOwnProperty("me") && player.me) {
      if (null!=player.solution && null!=data.game.solution 
	  && null!=data.game.solved && null!=player.solved 
	  && data.game.solved==player.solved) 
	isMine=true; // best solution found was own
      me = player;
    } else {
      if (null!=response.playerdata[i]["json"] && null!=response.playerdata[i]["json"].points 
	  && response.playerdata[i]["json"].points > worst) 
        worst = response.playerdata[i]["json"].points;
      players.push(player["json"]);
    }
  }
  if (null != me && null != me.json && null != me.json.points && null != game.points) {
    if (data.me.name == "Gast") data.me.name = (me.json.name == "Gast") ? me.name : me.json.name;
    data.me.targets = me.json.targets;
    game.targetsWon = me.json.targets;
    if (me.json.round==data.game.round-1) { // last seen last round
      game.points = me.json.points;
      data.me.points = game.points;
    }
    if (me.json.round==data.game.round) { // last seen this round
      game.points = me.json.points;
      data.me.points = game.points;
      data.me.solution = me.json.solution;
      if (me.json.solution!=null) turn.points = me.json.solution.length;
    }
    else { // too long ago, new points set
      game.points = worst+(10*(data.game.round-me.json.round)); // TODO can escalate points because penalty could get added again and again
      data.me.points = game.points;
    }
  } else if (null != game.points && null != data.game.round) {
    game.points = worst+(10*data.game.round); // TODO can escalate points because penalty could get added again and again
    data.me.points = game.points;
  } else {data.me.points = 0;}
  createMap();
  window.addEventListener("keydown", handleKey);
  activateNextTarget();
  game.running = true;
}

function createMap() {
  // TODO: break off game, next target buttons
  // prepare html
  document.querySelector(".ricochetrobots .time").style="visibility: visible;";
  document.querySelector(".ricochetrobots .points").style="visibility: visible;";
  document.querySelector(".ricochetrobots .fullpoints").innerHTML = game.points;
  document.querySelector(".ricochetrobots .targets").innerHTML = game.targetsWon;
  document.querySelector(".ricochetrobots .map").innerHTML = "";
  var solutionwrapper = document.querySelector(".ricochetrobots .solutionwrapper");
  solutionwrapper.innerHTML = '<div class="solution">'
      +'<div class="best"></div><div class="all"></div><div class="current"></div>'
      +'<div>';
  var stepBackButton = document.createElement("div");
  stepBackButton.className="btn fa fa-step-backward";
  stepBackButton.onclick=stepBack;
  solutionwrapper.appendChild(stepBackButton);
  var stepAllBackButton = document.createElement("div");
  stepAllBackButton.className="btn fa fa-fast-backward";
  stepAllBackButton.onclick=stepAllBack;
  solutionwrapper.appendChild(stepAllBackButton);
  // build board from four pieces
  var pieces = []; // get actual pieces, not just indices here
  if (null == map.pieces) {
    map.pieces = [];
    // take four originals of four colours at random
    while (pieces.length<4) {
      var i = Math.floor(Math.random()*originals.length);
      var next = originals[i];
      if (!isDuplicate(next, pieces, ["color"])) {
        pieces.push(next);
        map.pieces.push(i);
      }
    }
    data.game.pieces = map.pieces;
  } else {
    for (var i=0; i<map.pieces.length; i++) {
      pieces.push(originals[map.pieces[i]]);
    }
  }
  // generate raw tiles
  map.nested = [];
  for (var x=0; x<16; x++) {
    var col = [];
    map.nested.push(col);
    for (var y=0; y<16; y++) {
      var tile = new Tile(x,y);
      col.push(tile);
    }
  }
  // set walls
  for (var x=0; x<map.nested.length; x++) {
    for (var y=0; y<map.nested[x].length; y++) {
      var tile = map.nested[x][y];
      // set outer walls
      if (tile.y == 0) tile.walls[0] = true;
      if (tile.x == 0) tile.walls[1] = true;
      if (tile.y == 15) tile.walls[2] = true;
      if (tile.x == 15) tile.walls[3] = true;
      // set walls to center
      if ((tile.x == 6 || tile.x == 8) && (tile.y == 7 || tile.y == 8))
        tile.walls[3] = true;
      if ((tile.y == 6 || tile.y == 8) && (tile.x == 7 || tile.x == 8))
        tile.walls[2] = true;
      if ((tile.x == 7 || tile.x == 9) && (tile.y == 7 || tile.y == 8))
        tile.walls[1] = true;
      if ((tile.y == 7 || tile.y == 9) && (tile.x == 7 || tile.x == 8))
        tile.walls[0] = true;
    }
  }
  function rotate(x,y,rotation) {
    var newx = 0; 
    var newy = 0;
    switch (rotation) {
      case 0: newx=x; newy=y; break;
      case 1: newx=15-y; newy=x; break;
      case 2: newx=15-x; newy=15-y; break;
      case 3: newx=y; newy=15-x; break;
    }
    return {x: newx, y: newy};
  }
  function wallRotated(x,y,dir,rotation) {
    var newdir = (4+dir-rotation)%4;
    var pos = rotate(x,y,rotation);
    map.nested[pos.x][pos.y].walls[newdir] = true;
    switch (newdir) {
      case 0: pos.y--; break;
      case 1: pos.x--; break;
      case 2: pos.y++; break;
      case 3: pos.x++; break;
    }
    newdir = (newdir+2)%4;
    map.nested[pos.x][pos.y].walls[newdir] = true;
  }
  for (var i=0; i<pieces.length; i++) {
    wallRotated(pieces[i].wallX,0,3,i);
    wallRotated(0,pieces[i].wallY,2,i);
    // create targets
    for (var t=0; t<pieces[i].targets.length; t++) {
      var p = pieces[i].targets[t]; // parameters for new target
      var target = new Target(p[0],p[1],p[2],p[3]);
      var pos = rotate(target.x, target.y, i);
      wallRotated(target.x, target.y, target.dir, i);
      wallRotated(target.x, target.y, (target.dir+1)%4, i);
      target.x = pos.x;
      target.y = pos.y;
      map.targets.push(target);
      target.tile = map.nested[target.x][target.y];
      map.nested[target.x][target.y].target = target;
    }
  }
  if (null == map.seed) {
    map.seed = Math.floor(Math.random()*Math.pow(10, map.targets.length)).toString();
    data.game.seed = map.seed;
  }
  map.targets = shuffle(map.targets, map.seed);
  // draw map
  var mapspace = document.querySelector(".ricochetrobots .map");
  for (var x=0; x<map.nested.length; x++) {
    for (var y=0; y<map.nested[x].length; y++) {
      var tile = map.nested[x][y];
      var tilediv = document.createElement("div");
      var classes = "tile";
      for (var wall=0; wall<4; wall++) {
	if (tile.walls[wall]) classes += " wall"+directions[wall];
      }
      if ((tile.x == 7 && tile.y == 7) ||
          (tile.x == 7 && tile.y == 8) ||
          (tile.x == 8 && tile.y == 7) ||
          (tile.x == 8 && tile.y == 8)) classes += " center";
      tilediv.className = classes;
      tilediv.style = "top: "+scale*tile.y+"px; left: "+scale*tile.x+"px;";
      tilediv.addEventListener("click", deactivateRobot);
      mapspace.appendChild(tilediv);
    }
  }
  // generate robots
  if (null == map.robots) {
    map.robots = [];
    data.game.robots = [];
    for (var color=0; color<5; color++) {
      var x, y, robot;
      do {
        x = Math.floor(Math.random()*16);
        y = Math.floor(Math.random()*16);
        robot = new Robot(x,y,color);
      } while (((x==7 || x==8) && (y==7 || y==8)) || isDuplicate(robot, map.robots, ["x","y"]))
      data.game.robots.push({x:x, y:y, color: color});
      map.robots.push(robot);
      map.nested[x][y].robot = robot;
    }
  } else {
    data.game.robots = [];
    for (var i=0; i<map.robots.length; i++) {
      data.game.robots.push(map.robots[i]);
      map.robots[i] = new Robot(map.robots[i].x, map.robots[i].y, map.robots[i].color);
      map.nested[map.robots[i].x][map.robots[i].y].robot = map.robots[i];
    }
  }
  // draw robots
  for (var i=0; i<map.robots.length; i++) {
    var robot = map.robots[i];
    var robotdiv = document.createElement("div");
    robotdiv.className="robot "+colors[robot.color];
    robotdiv.style="top: "+scale*robot.y+"px; left: "+scale*robot.x+"px;";
    robotdiv.onmouseenter=showMoves;
    robotdiv.onmouseout=exorcise;
    robotdiv.addEventListener("click",setActive);
    robotdiv.innerHTML=i+1;
    robotdiv.robot=robot;
    mapspace.appendChild(robotdiv);
  }
  // create first target
  var target = document.createElement("div");
  target.className="target";
  mapspace.appendChild(target);
}

// map tiles
// TODO: test if these are accurate (by creating maps with specific ones and matching them with the physical boards)
// TODO: diagonal color-coded walls - drawing and moving according to color and drawing correct arrow in robot.show
var originals = [ // contains targets and walls (position from upper left corner)
  {color: 0, wallX: 3, wallY: 5, targets: [[1,1,0,1], [6,1,3,3], [2,4,1,2], [7,5,2,0]]},
  {color: 0, wallX: 3, wallY: 4, targets: [[5,1,1,2], [1,4,3,3], [1,6,2,0], [7,5,0,1]]},
  {color: 0, wallX: 1, wallY: 5, targets: [[4,1,3,3], [1,3,0,1], [5,5,2,0], [2,6,1,2]]},
  //{color: 0, wallX: 4, wallY: 2, targets: [[6,1,1,2], [1,4,3,3], [2,4,0,1], [5,6,2,0]]}, // plus diagonals in blue downwards at 4,1 and in  yellow downwards at 6,2
  {color: 1, wallX: 5, wallY: 3, targets: [[3,2,2,0], [5,3,1,1], [2,4,0,3], [4,5,3,2]]},
  {color: 1, wallX: 4, wallY: 4, targets: [[2,1,2,0], [6,3,1,1], [4,5,0,3], [1,6,3,2]]},
  {color: 1, wallX: 3, wallY: 3, targets: [[1,2,0,1], [5,1,3,2], [6,4,2,0], [2,6,1,3]]},
//{color: 1, wallX: 2, wallY: 6, targets: [[5,1,3,2], [6,1,2,0], [1,5,0,1], [7,4,1,3]]}, // plus diagonals in blue upwards at 2,1 and in red downwards at 7,4
  {color: 2, wallX: 2, wallY: 3, targets: [[5,1,1,1], [7,2,4,2], [3,4,0,2], [6,5,3,0], [1,6,2,3]]},
  {color: 2, wallX: 3, wallY: 6, targets: [[6,1,1,1], [1,3,2,3], [5,4,3,0], [2,5,0,2], [7,5,4,2]]},
  {color: 2, wallX: 4, wallY: 4, targets: [[2,1,0,2], [1,3,3,1], [6,4,2,0], [5,6,1,3], [3,7,4,2]]},
//{color: 2, wallX: 4, wallY: 6, targets: [[2,3,1,3], [3,3,3,1], [6,2,2,0], [1,5,0,2], [5,7,4,2]]}, // plus diagonals in red downwards at 2,1 and in green downwards at 3,6
  {color: 3, wallX: 1, wallY: 5, targets: [[4,1,0,0], [1,2,3,3], [6,3,2,2], [3,6,1,1]]},
  {color: 3, wallX: 4, wallY: 5, targets: [[1,2,3,0], [6,1,2,2], [6,5,1,3], [3,6,0,1]]},
  {color: 3, wallX: 1, wallY: 6, targets: [[1,4,0,1], [3,1,3,0], [6,3,2,2], [4,6,1,3]]}
//{color: 3, wallX: 5, wallY: 5, targets: [[1,3,0,0], [6,4,2,2], [2,6,3,3], [3,6,1,1]]}, // plus diagonals in green upwards at 4,1 and in yellow downwards at 5,7
];
