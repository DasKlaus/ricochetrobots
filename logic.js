function display(text) {
  d3.selectAll(".display").remove();
  var display = d3.select("body").append("div").attr("class","display").text(text);
  display.attr("style", "opacity: 1;");
  setTimeout(function(){display.attr("style", "opacity: 0;");},200);
  setTimeout(function(){display.remove();}, 2500);
}

function count() {
  var m = ("0"+Math.floor(game.timeleft/60)).slice(-2);
  var s = ("0"+game.timeleft%60).slice(-2);
  var time = document.getElementById("time");
  time.innerHTML = m+":"+s;
  if (game.timeleft>120) time.className="g120";
  else if (game.timeleft>60) time.className="g60";
  else if (game.timeleft>30) time.className="g30";
  else if (game.timeleft>10) time.className="g10";
  else time.className="l10";
  if (game.timeleft < 1) {
    clearInterval(game.timer);
    display("Zeit abgelaufen");
    game.running = false;
    game.points += turn.points; // TODO: if player had no own solution, this needs to be the length of the best solution plus penalty, I guess ten
    document.querySelector("#fullpoints").innerHTML = game.points;
    game.targetsWon++; // TODO if solution is own
    // TODO: if player was best, display something, if another player was best/first, display something else
    stepAllBack();
    playSolution();
    deactivateRobot();
  }
  game.timeleft--;
}

function countdown(seconds) {
  game.timeleft = seconds;
  game.timer = setInterval(count,1000);
}

function playSolution() { // TODO playback from global best solution. Needs to not go over objects, but colors and dirs.
  function playStep(i) {
    var step = turn.solutions[turn.fastest][i];
    setTimeout(function(){
      moveTo(step.robot, step.end);
    },(1000*i));
  }
  var delay = 200;
  if (null==turn.fastest) display("Keine Lösung gefunden");
  else {
    for (var i=0; i<turn.solutions[turn.fastest].length; i++) {
      playStep(i);
      delay += 1000;
    }
  }
  setTimeout(activateNextTarget, delay);
}

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
  this.__data__.robot.move(this.__data__.dir);
}

function setActive() {
  if (!game.running) return;
  var robot = this.__data__ || this;
  if (turn.robot == robot) return;
  if (null !== turn.robot) document.querySelector(".robot.active").classList.remove("active");
  turn.robot = robot;
  exorcise();
  robot.show();
  document.querySelector(".robot."+colors[robot.color]).classList.add("active");
}

function exorcise() { // remove ghosts
  d3.selectAll(".ghost").filter(function(){
	return (null === turn.robot) ? 1 : (!this.classList.contains(colors[turn.robot.color]));
}).remove();
  d3.selectAll(".arrow").filter(function(){
	return (null === turn.robot) ? 1 : (!this.classList.contains(colors[turn.robot.color]));
}).remove();
}

function Solution(steps) {
  for (var i=0; i<steps.length; i++) {
    this[i] = steps[i];
  }
  this.length = steps.length;
}

function moveTo (robot, tile) {
  robot.tile.robot = null;
  tile.robot = robot;
  robot.tile = tile;
  robot.x = tile.x;
  robot.y = tile.y;
  d3.select(".robot."+colors[robot.color]).attr("style", "top: "+scale*robot.y+"px; left: "+scale*robot.x+"px;");
}

function moveRobot(dir) {
  if (!game.running) return;
  var robot = this;
  var endpoint = robot.tile.getTile(dir);
  if (endpoint == robot.tile) return;
  turn.solution.push({color: robot.color, dir: dir, robot: robot, start: robot.tile, end: endpoint});
  document.querySelector("#solution #current").innerHTML += '<div class="move fa fa-arrow-'+directions[dir]+' '+colors[robot.color]+'"></div>';
  moveTo(robot, endpoint);
  //check if target is reached TODO make this a function
  if (null !== turn.target && endpoint.target == map.targets[turn.target] && 
     (robot.color == map.targets[turn.target].color || map.targets[turn.target].color == 4)) {
    if (turn.solutions.length==0) countdown(60); // TODO: solutions of enemy, too
    deactivateRobot();
    if (!isDuplicate(turn.solution, turn.solutions, [])) {
      if (null == turn.fastest || turn.solution.length<turn.solutions[turn.fastest].length) {
        if (null == turn.fastest) display("Geschafft!"); else display("Rekord!");
        turn.fastest = turn.solutions.length;
        turn.points = turn.solution.length;
        document.querySelector("#points #turn").innerHTML = turn.solution.length;
        document.querySelector("#solution #best").innerHTML = document.querySelector("#solution #current").innerHTML;
      } else display("Ziel erreicht!")
      turn.solutions.push(new Solution(turn.solution));
      d3.select("#solution #all").insert("div",":first-child").attr("class", "solution").node().innerHTML = document.querySelector("#solution #current").innerHTML;
    } else display("Diese Lösung hattest du schon!");
    // set all robots to beginning
    stepAllBack();
    turn.solution = [];
  }
  //show next moves again
  d3.selectAll(".ghost").remove(); d3.selectAll(".arrow").remove();
  if (null !== turn.robot) turn.robot.show();
}

function showMoves() {
  if (!game.running) return;
  var robot = this.__data__ || this;
  if (turn.robot == robot && this.constructor != Robot) return;
  exorcise();
  for (var dir=0; dir<4; dir++) {
    var endpoint = robot.tile.getTile(dir);
    if (robot.tile == endpoint) continue; // nothing to do here
    d3.select("#map").append("div").attr("class", "arrow "+colors[robot.color])
      .attr("style", "top: "+scale*(d3.min([endpoint.y,robot.tile.y])+0.45)+"px; left: "+scale*(d3.min([endpoint.x,robot.tile.x])+0.45)+"px; width: "+scale*(Math.abs(endpoint.x-robot.tile.x)+0.1)+"px; height: "+scale*(Math.abs(endpoint.y-robot.tile.y)+0.1)+"px;");
    d3.select("#map").selectAll("ghost").data([{robot: robot, dir: dir}]).enter().append("div").attr("class", "ghost "+colors[robot.color])
      .attr("style", "top: "+scale*endpoint.y+"px; left: "+scale*endpoint.x+"px;")
      .on("click", moveHere);
  }
}

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
    d3.select(".target")
      .attr("class","target fa fa-star "+colors[color])
      .attr("style","top: "+scale*this.y+"px; left: "+scale*this.x+"px;");
    turn.target = map.targets.indexOf(this);
  }
  this.dir = dir; // first wall counterclockwise
}

function activateNextTarget() {
  game.timeleft = null;
  clearInterval(game.timer);
  game.timer = null;
  document.querySelector("#solution #best").innerHTML = "";
  document.querySelector("#solution #current").innerHTML = "";
  document.querySelector("#solution #all").innerHTML = "";
  document.querySelector("#points #turn").innerHTML = "&nbsp;";
  document.querySelector("#time").innerHTML = "&nbsp;";
  if (null == turn) {
    turn = {solutions: [], solution: [], fastest: null, target: null, robot: null, points: 0};
    map.targets[0].activate(); return;
  }
  if (turn.target+1<map.targets.length) {
    turn = {solutions: [], solution: [], fastest: null, target: turn.target, robot: null, points: 0};
    map.targets[turn.target+1].activate();
    document.querySelector("#round").innerHTML = turn.target+1;
    //countdown(60);
    game.running = true;
  } else endGame();
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
    document.querySelector(".robot.active").classList.remove("active");
  turn.robot = null;
  exorcise();
}

function handleKey() {
  if (!game.running) return;
  var key = d3.event.keyCode;
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

function stepBack() {
  if (turn.solution.length==0) return;
  step = turn.solution[turn.solution.length-1];
  var dir = (step.dir>1) ? step.dir-2 : step.dir+2;
  moveTo(step.robot, step.start);
  turn.solution.pop();
  if (null != turn.robot) {
    d3.selectAll(".ghost").remove();
    d3.selectAll(".arrow").remove();
    turn.robot.show();
  }
  var moves = document.querySelectorAll("#solution .move");
  d3.select(moves[moves.length-1]).remove();
}

function stepAllBack() {
  var count = turn.solution.length;
  for (var i=0; i<count; i++) stepBack();
}

function isDuplicate(piece, array, properties) {
  for (var i=0; i<array.length; i++) {
    var different = false;
    if (properties.length==0) { // looking for an array within an array
      if (piece.length != array[i].length) different = true;
      else {
        for (var elem=0; elem<piece.length; elem++) {
          if (!isDuplicate(piece[elem], [array[i][elem]], Object.getOwnPropertyNames(piece[elem]))) different = true;
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

function rename() {
  display(document.querySelector("input.name").value); // TODO: change it in to-send array
}

function startGame() { // TODO how to start a game that's in the middle of being played?
  // initiate all vars
  game = {timer: null, timeleft: null, running: false, points: 0, targetsWon: 0}
  turn = null;
  d3.select(window).on("keydown", handleKey);
  activateNextTarget();
  display("Runde gestartet!");
  //countdown(60);
  game.running = true;
  // TODO: ajax here
}

function endGame() {
  // TODO: set all or most vars back (why? get resetted on redraw anyway)
  clearInterval(game.timer);
  game.timer = null;
  d3.select(window).on("keydown", function(){});
  d3.select("#points").attr("style", "");
  d3.select("#time").attr("style", "");
  document.querySelector("#map").innerHTML="";
  d3.select("#map").append("div").attr("id", "lobby").append("div").text("Spiel beendet! Hier kommen die Scores! Points: "+game.points+", Targets won: "+game.targetsWon)
    .append("div").attr("class", "btn start").on("click", showLobby).text("Zur Lobby!");
  // TODO: game stats: how many players at whole, how many points each player reached, how many targets
  // TODO: ajax here
}

function showLobby() {
  // TODO: set all vars back (why? get resetted on redraw anyway)
  document.querySelector("#map").innerHTML="";
  d3.select("#map").append("div").attr("id", "lobby").append("div").attr("class", "btn start").on("click", createMap).text("Start!");
  document.querySelector("#solutionwrapper").innerHTML="";
  d3.select("#solutionwrapper").append("input").attr("class", "name").attr("type", "text").attr("value", "Gast"); //TODO put sessionid-seeded name here
  d3.select("#solutionwrapper").append("div").attr("class", "rename").on("click", rename).text("Umbenennen");
  // TODO: #map holds buttons and interaction, #solutionwrapper holds names of players in this lobby, maximum of 16 or something
  // TODO: ajax here (no, ajax alllll the time!)
  // TODO: show people
  // TODO: do rooms - per get-variable?
  // TODO: just show names
  // TODO: all players get a guest name from php and can change it
  // TODO: during a game there needs to be a button for ending the game prematurely - returning to the lobby
  // TODO: php-side: just one file - returns names of players in room, and if a game happens, the map object and the fastest solution for every player or something. map object needs to be the current state since last target setting. So maybe send the state at activatenewtarget, and if the. state should include map, activetarget ... why even map? createmap from pieces, more like it, and robots, and active target? or i of active target? yes, yes ...
}

function createMap() { // or create from!
  map = {nested: [], tiles: [], targets: [], robots: [], pieces: [], seed: 0};
  d3.select("#time").attr("style", "visibility: visible;");
  d3.select("#points").attr("style", "visibility: visible;");
  d3.select("#map").selectAll("*").remove();
  var solutionwrapper = d3.select("#solutionwrapper");
  solutionwrapper.selectAll("*").remove();
  var sol = solutionwrapper.append("div").attr("id", "solution");
  sol.append("div").attr("id", "best");
  sol.append("div").attr("id", "all");
  sol.append("div").attr("id", "current");
  solutionwrapper.append("div").attr("class", "btn fa fa-step-backward").on("click", stepBack);
  solutionwrapper.append("div").attr("class", "btn fa fa-fast-backward").on("click", stepAllBack);
  // generate raw tiles
  map.tiles = [];
  map.nested = [];
  for (var x=0; x<16; x++) {
    var col = [];
    map.nested.push(col);
    for (var y=0; y<16; y++) {
      var tile = new Tile(x,y);
      col.push(tile);
      map.tiles.push(tile);
    }
  }
  // TODO: if targets are raw data and only get created later, then this can be defined outside of createMap
  // TODO: diagonal color-coded walls - drawing and moving according to color and drawing correct arrow in robot.show
  var originals = [ // contains targets and walls (position from upper left corner)
    {color: 0, wallX: 3, wallY: 5, targets: [new Target(1,1,0,1), new Target(6,1,3,3), new Target(2,4,1,2), new Target(7,5,2,0)]},
    {color: 0, wallX: 3, wallY: 4, targets: [new Target(5,1,1,2), new Target(1,4,3,3), new Target(1,6,2,0), new Target(7,5,0,1)]},
    {color: 0, wallX: 1, wallY: 5, targets: [new Target(4,1,3,3), new Target(1,3,0,1), new Target(5,5,2,0), new Target(2,6,1,2)]},
  //{color: 0, wallX: 4, wallY: 2, targets: [new Target(6,1,1,2), new Target(1,4,3,3), new Target(2,4,0,1), new Target(5,6,2,0)]}, // plus diagonals in blue downwards at 4,1 and in yellow downwards at 6,2
    {color: 1, wallX: 5, wallY: 3, targets: [new Target(3,2,2,0), new Target(5,3,1,1), new Target(2,4,0,3), new Target(4,5,3,2)]},
    {color: 1, wallX: 4, wallY: 4, targets: [new Target(2,1,2,0), new Target(6,3,1,1), new Target(4,5,0,3), new Target(1,6,3,2)]},
    {color: 1, wallX: 3, wallY: 3, targets: [new Target(1,2,0,1), new Target(5,1,3,2), new Target(6,4,2,0), new Target(2,6,1,3)]},
  //{color: 1, wallX: 2, wallY: 6, targets: [new Target(5,1,3,2), new Target(6,1,2,0), new Target(1,5,0,1), new Target(7,4,1,3)]}, // plus diagonals in blue upwards at 2,1 and in red downwards at 7,4
    {color: 2, wallX: 2, wallY: 3, targets: [new Target(5,1,1,1), new Target(7,2,4,2), new Target(3,4,0,2), new Target(6,5,3,0), new Target(1,6,2,3)]},
    {color: 2, wallX: 3, wallY: 6, targets: [new Target(6,1,1,1), new Target(1,3,2,3), new Target(5,4,3,0), new Target(2,5,0,2), new Target(7,5,4,2)]},
    {color: 2, wallX: 4, wallY: 4, targets: [new Target(2,1,0,2), new Target(1,3,3,1), new Target(6,4,2,0), new Target(5,6,1,3), new Target(3,7,4,2)]},
  //{color: 2, wallX: 4, wallY: 6, targets: [new Target(2,3,1,3), new Target(3,3,3,1), new Target(6,2,2,0), new Target(1,5,0,2), new Target(5,7,4,2)]}, // plus diagonals in red downwards at 2,1 and in green downwards at 3,6
    {color: 3, wallX: 1, wallY: 5, targets: [new Target(4,1,0,0), new Target(1,2,3,3), new Target(6,3,2,2), new Target(3,6,1,1)]},
    {color: 3, wallX: 4, wallY: 5, targets: [new Target(1,2,3,0), new Target(6,1,2,2), new Target(6,5,1,3), new Target(3,6,0,1)]},
    {color: 3, wallX: 1, wallY: 6, targets: [new Target(1,4,0,1), new Target(3,1,3,0), new Target(6,3,2,2), new Target(4,6,1,3)]}
  //{color: 3, wallX: 5, wallY: 5, targets: [new Target(1,3,0,0), new Target(6,4,2,2), new Target(2,6,3,3), new Target(3,6,1,1)]}, // plus diagonals in green upwards at 4,1 and in yellow downwards at 5,7
  ];
  // take four originals of four colours at random
  var pieces = [];
  while (pieces.length<4) {
    var i = Math.floor(Math.random()*originals.length);
    var next = originals[i];
    if (!isDuplicate(next, pieces, ["color"])) {
      pieces.push(next);
      map.pieces.push(i);
    }
  }
  // set walls
  for (var i=0; i<map.tiles.length; i++) {
    var tile = map.tiles[i];
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
    for (var t=0; t<pieces[i].targets.length; t++) {
      var target = pieces[i].targets[t];
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
  map.targets = shuffle(map.targets, Math.floor(Math.random()*Math.pow(10, map.targets.length)).toString());
  // draw map
  d3.select("#map").selectAll("tiles").data(map.tiles).enter()
    .append("div")
      .attr("class", function(tile){
          var classes = "tile";
          for (var wall=0; wall<4; wall++) {
	    if (tile.walls[wall]) classes += " wall"+directions[wall];
          }
          if ((tile.x == 7 && tile.y == 7) ||
              (tile.x == 7 && tile.y == 8) ||
              (tile.x == 8 && tile.y == 7) ||
              (tile.x == 8 && tile.y == 8)) classes += " center";
          return classes;
        })
      .attr("style", function(tile){
          return "top: "+scale*tile.y+"px; left: "+scale*tile.x+"px;";
        })
      .on("click", deactivateRobot);
  // generate robots
  map.robots = [];
  for (var color=0; color<5; color++) {
    var x, y, robot;
    do {
      x = Math.floor(Math.random()*16);
      y = Math.floor(Math.random()*16);
      robot = new Robot(x,y,color);
    } while (((x==7 || x==8) && (y==7 || y==8)) || isDuplicate(robot, map.robots, ["x","y"]))
    map.robots.push(robot);
    map.nested[x][y].robot = robot;
  }
  // draw robots
  d3.select("#map").selectAll("robots").data(map.robots).enter()
    .append("div")
      .attr("class", function(robot){
        return classes = "robot "+colors[robot.color];
      })
      .attr("style", function(robot){
        return "top: "+scale*robot.y+"px; left: "+scale*robot.x+"px;";
      })
      .on("mouseover", showMoves)
      .on("mouseout", exorcise)
      .on("click", setActive)
    .text(function(d,i){return i+1;});
  // create first target
  d3.select("#map").append("div").attr("class", "target");
  startGame();
}