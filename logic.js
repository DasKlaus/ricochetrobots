/*
 * setup
 */

var alphabet = "23456789abcdefghjklmnpqrstuvwxyz"; // keep in sync with the seed generation in index.php
var scale = 20; // px per tile
var movetime = 700; // ms per robot move, as the robots' transition in style.css
var deadline = 60; // seconds a round stays open after its first solution, as DEADLINE in receiver.php
var colors = ["red", "blue", "yellow", "green", "black"];
var directions = ["up", "left", "down", "right"];

var map; // the board, derived from the seed
var round; // the round the board shows; undefined until the first payload has arrived
var turn; // the moves in progress and the active robot
var best = null; // the round's leading solution as last rendered
var game = {timer: null, timeleft: null, running: false};
var state = {version: -1, round: 0, history: [], timeleft: null, solutions: [], players: []}; // the last payload
var transition = false; // a round end is being played back
var offline = false;
var pollwait = 5000;
var polltimer;

/*
 * network
 */

function get() {
  fetch("receiver.php?game="+encodeURIComponent(seed)+"&version="+state.version).then(function(response) {
    if (response.status == 304) { pollwait = Math.min(pollwait + 5000, 30000); return; }
    if (!response.ok) { display("Serverfehler"); return; }
    response.json().then(receive);
  }, solo);
}

function post(data) {
  data.game = seed;
  fetch("receiver.php", {method: "POST", body: new URLSearchParams(data)}).then(function(response) {
    if (!response.ok) { display("Serverfehler"); return; }
    response.json().then(receive);
  }, solo);
}

function poll() {
  if (map && round >= map.targets.length) return;
  polltimer = setTimeout(poll, pollwait);
  if (!document.hidden) get();
}

function repoll() {
  if (document.hidden) return;
  clearTimeout(polltimer);
  pollwait = 5000;
  poll();
}

// only a failed transport lands here; a server fault answers with a status that the callers report instead
function solo() {
  offline = true;
  clearTimeout(polltimer);
  // alone, only the player's own solutions count, and without one the round has no deadline
  state.solutions = state.solutions.filter(function(s) { return s.user_id == selfid; });
  if (!state.solutions.length) {
    state.timeleft = null;
    clearInterval(game.timer);
    document.querySelector(".time").textContent = "";
  }
  document.querySelector(".players").textContent = "Netzwerkfehler oder keine Netzwerkverbindung!";
  display("Netzwerkproblem, von nun an Singleplayer.");
  if (round === undefined) init();
}

// offline stand-in for the server: one player, who wins every round they solve
function localstate(moves) {
  if (moves) {
    state.solutions.push({id: state.solutions.length, user_id: selfid, name: "", moves: moves, length: moves.length});
    state.solutions.sort(function(a, b) { return a.length - b.length || a.id - b.id; });
    state.timeleft = state.solutions.length == 1 ? deadline : game.timeleft;
  } else if (state.solutions.length) {
    state.history.push(state.solutions[0]);
    state.round++;
    state.solutions = [];
    state.timeleft = null;
  }
  var me = state.players.find(function(p) { return p.user_id == selfid; }) || {solutions: 0};
  state.players = [{user_id: selfid, name: "", targets: state.history.length,
    points: state.history.reduce(function(sum, h) { return sum + h.moves.length; }, 0), solutions: me.solutions + (moves ? 1 : 0)}];
  receive(state);
}

function receive(next) {
  pollwait = 5000;
  state = next;
  if (round === undefined) init();
  else if (!transition) render();
}

/*
 * game flow
 */

function init() {
  createMap();
  document.querySelectorAll(".time, .points").forEach(function(box) { box.style.visibility = "visible"; });
  state.history.forEach(function(h) { apply(h.moves); });
  drawRobots();
  window.addEventListener("keydown", handleKey);
  startRound();
  render();
}

function render() {
  if (state.round > round) { endRound(); return; }
  if (round >= map.targets.length) return;
  writeplayers();
  var leader = state.solutions[0] || null;
  if (leader && leader.user_id != selfid && (!best || leader.length < best.length))
    display((leader.name || "Gast")+(best ? " war besser!" : " hat eine Lösung gefunden"));
  best = leader;
  var bestbox = document.querySelector(".best");
  bestbox.textContent = "";
  if (leader) {
    if (leader.user_id == selfid) writeMoves(bestbox, leader.moves);
    else for (var i = 0; i < leader.length; i++) {
      var mark = document.createElement("span");
      mark.className = "unknown";
      mark.textContent = "?";
      bestbox.appendChild(mark);
    }
    var length = document.createElement("span");
    length.className = "length";
    length.textContent = leader.length;
    bestbox.appendChild(length);
  }
  var mine = state.solutions.filter(function(s) { return s.user_id == selfid; });
  var all = document.querySelector(".all");
  all.textContent = "";
  mine.sort(function(a, b) { return b.id - a.id; }).forEach(function(s) {
    var row = document.createElement("div");
    row.className = "singlesolution";
    writeMoves(row, s.moves);
    all.appendChild(row);
  });
  if (state.timeleft !== null) countdown(Math.max(state.timeleft, 1));
}

function startRound() {
  round = state.round;
  best = null;
  turn = {solution: [], robot: null};
  clearInterval(game.timer);
  var time = document.querySelector(".time");
  time.className = "time";
  time.textContent = " ";
  if (round >= map.targets.length) { endGame(); return; }
  document.querySelector(".points").textContent = (round + 1)+"/"+map.targets.length;
  map.targets[round].activate();
  game.running = isplayer;
}

function endRound() {
  transition = true;
  game.running = false;
  deactivateRobot();
  stepAllBack();
  clearInterval(game.timer);
  // rounds missed while away are applied at once, only the last one is played
  for (var r = round; r < state.round - 1; r++) apply(state.history[r].moves);
  var winner = state.history[state.round - 1];
  display(winner.user_id == selfid ? "Punkt für dich!" : "Punkt für "+(winner.name || "Gast"));
  play(winner.moves, function() {
    transition = false;
    // the finished game comes from the server; replace() rather than reload() as the page may answer a form
    if (state.round >= map.targets.length && !offline) location.replace(location.href);
    else { startRound(); render(); }
  });
}

function endGame() {
  game.running = false;
  var wrapper = document.querySelector(".solutionwrapper");
  wrapper.textContent = "";
  var box = document.createElement("div");
  box.className = "text";
  var head = document.createElement("h3");
  head.textContent = "Spiel beendet";
  box.appendChild(head);
  var table = document.createElement("table");
  table.innerHTML = "<tr><th></th><th>Ziele</th><th>Züge</th><th>Lösungen</th></tr>";
  state.players.slice().sort(function(a, b) { return b.targets - a.targets || a.points - b.points; }).forEach(function(p) {
    var row = table.insertRow();
    if (p.user_id == selfid) row.className = "me";
    [p.name || "Gast", p.targets, p.points, p.solutions].forEach(function(value) { row.insertCell().textContent = value; });
  });
  box.appendChild(table);
  wrapper.appendChild(box);
  var home = document.createElement("button");
  home.className = "home";
  home.textContent = "Zur Startseite";
  home.addEventListener("click", function() { location.href = "."; });
  document.querySelector(".players").replaceWith(home);
  replay(0);
}

// the finished game on a loop, each round's winning solution played as at its end
function replay(r) {
  if (r == 0) { // every robot leaves its tile before any returns, as one may stand on another's start
    map.robots.forEach(function(robot) { robot.tile.robot = null; robot.tile = robot.start; });
    map.robots.forEach(function(robot) { moveTo(robot, robot.start); });
  }
  document.querySelector(".points").textContent = (r + 1)+"/"+state.history.length;
  map.targets[r].activate();
  play(state.history[r].moves, function() { replay((r + 1) % state.history.length); });
}

function targetReached() {
  game.running = false;
  deactivateRobot();
  var moves = turn.solution.map(function(step) { return {color: step.color, dir: step.dir}; });
  var mine = state.solutions.filter(function(s) { return s.user_id == selfid; });
  var known = mine.some(function(s) {
    return s.length == moves.length && s.moves.every(function(m, i) { return m.color == moves[i].color && m.dir == moves[i].dir; });
  });
  if (known) display("Diese Lösung hattest du schon!");
  else {
    display(!mine.length ? (best ? "Geschafft!" : "Erster!")
      : moves.length >= mine[0].length ? "Ziel erreicht!"
      : moves.length < best.length ? "Rekord!" : "Schon besser!");
    if (offline) localstate(moves);
    else post({action: "solve", round: round, moves: JSON.stringify(moves)});
  }
  // the robots return once the last move has animated
  setTimeout(function() { stepAllBack(); if (!transition) game.running = true; }, movetime);
}

function countdown(seconds) {
  game.timeleft = seconds;
  clearInterval(game.timer);
  game.timer = setInterval(count, 1000);
  count();
}

function count() {
  var time = document.querySelector(".time");
  time.textContent = ("0"+Math.floor(game.timeleft/60)).slice(-2)+":"+("0"+game.timeleft%60).slice(-2);
  time.className = "time "+(game.timeleft > 30 ? "g30" : game.timeleft > 10 ? "g10" : "l10");
  if (game.timeleft < 1) {
    clearInterval(game.timer);
    if (offline) localstate();
    else if (isplayer) post({action: "advance", round: round});
  }
  game.timeleft--;
}

function writeplayers() {
  if (offline) return;
  var bar = document.querySelector(".players");
  bar.textContent = "";
  state.players.forEach(function(p) {
    var span = document.createElement("span");
    span.className = p.user_id == selfid ? "player me" : "player";
    span.textContent = (p.name || "Gast")+": "+p.targets+(p.targets == 1 ? " Ziel, " : " Ziele, ")+p.points+(p.points == 1 ? " Zug" : " Züge");
    bar.append(span, " ");
  });
}

function display(text) {
  var box = document.createElement("div");
  box.className = "display";
  box.style = "top: -76px;";
  box.textContent = text;
  document.body.appendChild(box);
  setTimeout(function() { box.style = "top: -4px; transition: top .5s;"; }, 200);
  setTimeout(function() { box.style = "top: -76px;"; }, 2000);
  setTimeout(function() { box.remove(); }, 5000);
}

/*
 * moving
 */

function moveTo(robot, tile) {
  robot.tile.robot = null;
  tile.robot = robot;
  robot.tile = tile;
  robot.x = tile.x;
  robot.y = tile.y;
  if (robot.div) robot.div.style = "top: "+scale*robot.y+"px; left: "+scale*robot.x+"px;";
}

function apply(moves) {
  moves.forEach(function(move) {
    var robot = map.robots[move.color];
    moveTo(robot, robot.tile.getTile(move.dir));
  });
}

function play(moves, then) {
  moves.forEach(function(move, i) { setTimeout(function() { apply([move]); }, movetime * (i + 1)); });
  setTimeout(then, movetime * (moves.length + 1));
}

function moveRobot(dir) {
  if (!game.running) return;
  var endpoint = this.tile.getTile(dir);
  if (endpoint == this.tile) return;
  turn.solution.push({color: this.color, dir: dir, robot: this, start: this.tile});
  document.querySelector(".current").appendChild(moveSpan(this.color, dir));
  moveTo(this, endpoint);
  var target = map.targets[round];
  if (endpoint.target == target && (this.color == target.color || target.color == 4)) targetReached();
  exorciseAll();
  if (turn.robot) turn.robot.show();
}

function stepBack() {
  if (!turn || !turn.solution.length) return;
  var step = turn.solution.pop();
  moveTo(step.robot, step.start);
  document.querySelector(".current").lastChild.remove();
  if (turn.robot) { exorciseAll(); turn.robot.show(); }
}

function stepAllBack() {
  while (turn && turn.solution.length) stepBack();
}

function moveSpan(color, dir) {
  var span = document.createElement("span");
  span.className = "move "+colors[color]+" "+directions[dir];
  return span;
}

function writeMoves(container, moves) {
  moves.forEach(function(move) { container.appendChild(moveSpan(move.color, move.dir)); });
}

function moveHere() {
  this.robot.move(this.direction);
}

function setActive() {
  if (!game.running) return;
  var robot = this.robot || this;
  if (turn.robot == robot) return;
  deactivateRobot();
  turn.robot = robot;
  robot.show();
  robot.div.classList.add("active");
}

function deactivateRobot() {
  if (turn.robot) turn.robot.div.classList.remove("active");
  turn.robot = null;
  exorcise();
}

function showMoves() {
  if (!game.running) return;
  var robot = this.robot || this;
  if (turn.robot == robot && this.constructor != Robot) return;
  exorcise();
  var mapspace = document.querySelector(".map");
  for (var dir = 0; dir < 4; dir++) {
    var endpoint = robot.tile.getTile(dir);
    if (endpoint == robot.tile) continue;
    var arrow = document.createElement("div");
    arrow.className = "arrow "+colors[robot.color];
    arrow.style = "top: "+scale*(Math.min(endpoint.y, robot.tile.y)+0.45)+"px; "
        +"left: "+scale*(Math.min(endpoint.x, robot.tile.x)+0.45)+"px; "
        +"width: "+scale*(Math.abs(endpoint.x-robot.tile.x)+0.1)+"px; "
        +"height: "+scale*(Math.abs(endpoint.y-robot.tile.y)+0.1)+"px;";
    mapspace.appendChild(arrow);
    var pointer = document.createElement("div");
    pointer.className = "arrow head "+colors[robot.color]+" "+directions[dir];
    pointer.style = "top: "+scale*endpoint.y+"px; left: "+scale*endpoint.x+"px;";
    mapspace.appendChild(pointer);
    var ghost = document.createElement("div");
    ghost.className = "ghost "+colors[robot.color];
    ghost.style = "top: "+scale*endpoint.y+"px; left: "+scale*endpoint.x+"px;";
    ghost.robot = robot;
    ghost.direction = dir;
    ghost.addEventListener("click", moveHere);
    mapspace.appendChild(ghost);
  }
}

function exorcise() { // remove the ghosts of all but the active robot
  document.querySelectorAll(".ghost, .arrow").forEach(function(ghost) {
    if (!turn.robot || !ghost.classList.contains(colors[turn.robot.color])) ghost.remove();
  });
}

function exorciseAll() {
  document.querySelectorAll(".ghost, .arrow").forEach(function(ghost) { ghost.remove(); });
}

function handleKey(e) {
  if (!game.running) return;
  var key = e.keyCode;
  if (key > 48 && key < 54) map.robots[key-49].activate(); // 1 to 5
  if (key == 48) deactivateRobot(); // 0
  if (key > 36 && key < 41 && turn.robot) { // arrows, kept from scrolling the page
    turn.robot.move([38, 37, 40, 39].indexOf(key));
    e.preventDefault();
  }
  if (key == 8) { stepBack(); e.preventDefault(); } // backspace
  if (key == 27) stepAllBack(); // escape
}

/*
 * board
 */

function Tile(x, y) {
  this.x = x;
  this.y = y;
  this.robot = null;
  this.target = null;
  this.walls = [false, false, false, false]; // index is direction
}

Tile.prototype.getTile = function(dir) { // where a robot starting here ends up
  if (this.walls[dir]) return this;
  var tile = dir == 0 ? map.nested[this.x][this.y-1] : dir == 1 ? map.nested[this.x-1][this.y]
    : dir == 2 ? map.nested[this.x][this.y+1] : map.nested[this.x+1][this.y];
  return tile.robot ? this : tile.getTile(dir);
};

function Target(x, y, color, dir) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.dir = dir; // first wall counterclockwise
}

Target.prototype.activate = function() {
  var div = document.querySelector(".target");
  div.className = "target "+colors[this.color];
  div.style = "top: "+scale*this.y+"px; left: "+scale*this.x+"px;";
};

function Robot(x, y, color) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.tile = map.nested[x][y];
  this.tile.robot = this;
  this.start = this.tile;
  this.div = null;
}

Robot.prototype.move = moveRobot;
Robot.prototype.show = showMoves;
Robot.prototype.activate = setActive;

// random(), shuffle(), createMap() and originals have a PHP twin in preview.php, which draws the starting board for link previews
function random(seed) { // mulberry32 over the room code, so every client derives the same board
  var a = 0;
  for (var i = 0; i < seed.length; i++) a = a * 32 + alphabet.indexOf(seed[i]);
  return function() {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, draw) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(draw() * (i + 1));
    var x = array[i];
    array[i] = array[j];
    array[j] = x;
  }
  return array;
}

function createMap() {
  var draw = random(seed);
  map = {nested: [], targets: [], robots: []};
  // one piece of each colour in a drawn order; a piece's index is its rotation
  var pieces = [];
  shuffle(originals.slice(), draw).forEach(function(piece) {
    if (!pieces.some(function(p) { return p.color == piece.color; })) pieces.push(piece);
  });
  for (var x = 0; x < 16; x++) {
    map.nested.push([]);
    for (var y = 0; y < 16; y++) map.nested[x].push(new Tile(x, y));
  }
  map.nested.forEach(function(col) { col.forEach(function(tile) {
    // outer walls and the centre block
    if (tile.y == 0) tile.walls[0] = true;
    if (tile.x == 0) tile.walls[1] = true;
    if (tile.y == 15) tile.walls[2] = true;
    if (tile.x == 15) tile.walls[3] = true;
    if ((tile.x == 6 || tile.x == 8) && (tile.y == 7 || tile.y == 8)) tile.walls[3] = true;
    if ((tile.y == 6 || tile.y == 8) && (tile.x == 7 || tile.x == 8)) tile.walls[2] = true;
    if ((tile.x == 7 || tile.x == 9) && (tile.y == 7 || tile.y == 8)) tile.walls[1] = true;
    if ((tile.y == 7 || tile.y == 9) && (tile.x == 7 || tile.x == 8)) tile.walls[0] = true;
  }); });
  function rotate(x, y, rotation) {
    switch (rotation) {
      case 0: return {x: x, y: y};
      case 1: return {x: 15-y, y: x};
      case 2: return {x: 15-x, y: 15-y};
      case 3: return {x: y, y: 15-x};
    }
  }
  function wallRotated(x, y, dir, rotation) { // a wall sits on both tiles it separates
    var newdir = (4+dir-rotation)%4;
    var pos = rotate(x, y, rotation);
    map.nested[pos.x][pos.y].walls[newdir] = true;
    switch (newdir) {
      case 0: pos.y--; break;
      case 1: pos.x--; break;
      case 2: pos.y++; break;
      case 3: pos.x++; break;
    }
    map.nested[pos.x][pos.y].walls[(newdir+2)%4] = true;
  }
  pieces.forEach(function(piece, i) {
    wallRotated(piece.wallX, 0, 3, i);
    wallRotated(0, piece.wallY, 2, i);
    piece.targets.forEach(function(p) {
      wallRotated(p[0], p[1], p[3], i);
      wallRotated(p[0], p[1], (p[3]+1)%4, i);
      var pos = rotate(p[0], p[1], i);
      var target = new Target(pos.x, pos.y, p[2], p[3]);
      map.targets.push(target);
      map.nested[pos.x][pos.y].target = target;
    });
  });
  shuffle(map.targets, draw);
  var mapspace = document.querySelector(".map");
  map.nested.forEach(function(col) { col.forEach(function(tile) {
    var div = document.createElement("div");
    div.className = "tile"+tile.walls.map(function(wall, dir) { return wall ? " wall"+directions[dir] : ""; }).join("")
      +((tile.x == 7 || tile.x == 8) && (tile.y == 7 || tile.y == 8) ? " center" : "");
    div.style = "top: "+scale*tile.y+"px; left: "+scale*tile.x+"px;";
    div.addEventListener("click", deactivateRobot);
    mapspace.appendChild(div);
  }); });
  var target = document.createElement("div");
  target.className = "target";
  target.textContent = "★";
  mapspace.appendChild(target);
  for (var color = 0; color < 5; color++) {
    var rx, ry;
    do { rx = Math.floor(draw()*16); ry = Math.floor(draw()*16); }
    while (((rx == 7 || rx == 8) && (ry == 7 || ry == 8)) || map.nested[rx][ry].robot);
    map.robots.push(new Robot(rx, ry, color));
  }
}

function drawRobots() {
  var mapspace = document.querySelector(".map");
  map.robots.forEach(function(robot, i) {
    robot.div = document.createElement("div");
    robot.div.className = "robot "+colors[robot.color];
    robot.div.style = "top: "+scale*robot.y+"px; left: "+scale*robot.x+"px;";
    robot.div.onmouseenter = showMoves;
    robot.div.onmouseout = exorcise;
    robot.div.addEventListener("click", setActive);
    robot.div.textContent = i + 1;
    robot.div.robot = robot;
    mapspace.appendChild(robot.div);
  });
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

document.addEventListener("visibilitychange", repoll);
poll();
