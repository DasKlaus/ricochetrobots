<?php 
header('Content-Type: application/json');
session_start();
$room = (isset($_GET["room"])) ? $_GET["room"] : "?";
$do = (isset($_GET["do"])) ? $_GET["do"] : "init";
$players = array();
$game;
$deletePlayerTime = 600; // in seconds

// TODO detect name change

// connect
$db = new mysqli('localhost','###','###','###');
$error = array();
if ($db->connect_errno) $error[]=mysqli_connect_error();

// initialize player
if (!isset($_SESSION['init'])) {
	$error[]="Player session initialized";
	if ($db->query("INSERT INTO players (sessionid, room, name) VALUES ('".session_id()."', '".$room."', 'Gast')") !==TRUE) {
		$error[]=$db->error;
	} else {
		$_SESSION['init'] = TRUE;
		$_SESSION['name'] = 'Gast';
	}
}

// cleanup 
if ($db->query("DELETE FROM players WHERE sessionid!='".session_id()."' 
	AND room='".$room."' AND TIMESTAMPDIFF(SECOND, time, NOW()) > ".$deletePlayerTime) !== TRUE)
	$error[]=$db->error;
if ($db->query("DELETE FROM players WHERE room='".$room."' AND time<(IF(ISNULL((select time from games where room='".$room."')), 0, (select time from games where room='".$room."')))") !== TRUE)
	$error[]=$db->error;

$receive = json_decode(file_get_contents('php://input'), true)["data"];

// read from db 
// get game
if ($result = $db->query('SELECT * FROM games WHERE room="'.$room.'"')) {
	while ($obj = $result->fetch_object()) {
		$obj->json = json_decode($obj->json, true);
		$game = $obj;
	}
 	$result->close();
}
$iamhere=false;
// get all available players on the server
if ($result = $db->query('SELECT * FROM players')) {
	while ($obj = $result->fetch_object()) {
		$obj->json = json_decode($obj->json, true);
		if ($obj->sessionid == session_id()) {
			$iamhere=true;
			if ($_SESSION['name'] == 'Gast') $_SESSION['name'] = $obj->name;
		}
		$players[] = $obj;
	}
 	$result->close();
}
if ($iamhere) {
	if ($db->query("UPDATE players SET room='".$room."', name='".$_SESSION['name']."' WHERE sessionid='".session_id()."'") !== TRUE) 
	$error[]=$db->error;
}
else {
	$error[]="Player entered into db";
	if($db->query("INSERT INTO players (sessionid, name) VALUES ('".session_id()."','".$_SESSION['name']."')") !==TRUE)
	$error[]=$db->error;
}

// action
switch ($do) {
	case "init": 
		$error[]="Initialisierung";
		break;
	case "start": 
		$error[]="Spiel begonnen";		
		if($db->query("INSERT INTO games (room, json) VALUES ('".$room."','".json_encode($receive["game"])."')") !==TRUE)
			$error[]=$db->error;
		break;
	case "end":
		$error[]="Spiel beendet";
		if($db->query("DELETE FROM games WHERE room='".$room."'") !==TRUE)
			$error[]=$db->error;
		break;
	case "play": 
		if (null != $game) {
			if ($db->query("UPDATE games SET json='".json_encode($receive["game"])."' WHERE room='".$room."'") !== TRUE) 
			$error[]=$db->error;
		}
		if ($db->query("UPDATE players SET name='".$_SESSION['name']."', 
				json='".json_encode($receive["me"])."' WHERE sessionid='".session_id()."'") !== TRUE) 
			$error[]=$db->error;
		break;
}

// read from db again TODO only read again if necessary
// get game
if ($result = $db->query('SELECT * FROM games WHERE room="'.$room.'"')) {
	while ($obj = $result->fetch_object()) {
		$game = $obj;
		$game->json = json_decode($obj->json, true);
	}
 	$result->close();
}
$players = array();
// get all available players on the server
if ($result = $db->query('SELECT * FROM players WHERE room="'.$room.'"')) {
	while ($obj = $result->fetch_object()) {
		$obj->json = json_decode($obj->json, true);
		if ($obj->sessionid == session_id()) $obj->me = true;
		$players[] = $obj;
	}
 	$result->close();
}

if (json_last_error() != JSON_ERROR_NONE) $error[] = json_last_error();
// close
$db->close();
$return = (object) ['game' => $game, 'players' => $players, 'sent' => $receive, 'error' => $error];
// output
print_r(json_encode($return));
?>