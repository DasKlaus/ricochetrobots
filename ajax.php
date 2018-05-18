<?php 
header('Content-Type: application/json');
session_start();
$room = (isset($_GET["room"])) ? $_GET["room"] : "?";
$do = (isset($_GET["do"])) ? $_GET["do"] : "init";
$players = array();
$game;

// connect
$db = new mysqli('localhost','root','pass','ricochetrobots');
$error = array();
if ($db->connect_errno) $error[]=mysqli_connect_error();

// cleanup 
if ($db->query("DELETE FROM players WHERE room='".$room."' AND time<(
		DATE_SUB(IF(ISNULL((select time from games where room='".$room."')), 
			'2000-01-01 00:00:00', (select time from games where room='".$room."')), 
		INTERVAL 2 second)) AND sessionid!='".session_id()."'") !== TRUE) // deletes players that were offline since this game was started
	$error[]=$db->error;

$receive = json_decode(file_get_contents('php://input'), true)["data"];
if (json_last_error() != JSON_ERROR_NONE) $error[] = json_last_error_msg();

//update name
if (isset($receive["me"]) && $receive["me"]["name"] != "Gast") $_SESSION['name'] = $receive["me"]["name"];
if (!isset($_SESSION['name'])) $_SESSION['name'] = "Gast";

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
			$obj->me = true;
			if ($_SESSION["name"] == "Gast" && $obj->name != "Gast") 
				$_SESSION["name"] = $obj->name; // update name from db
		}
		$players[] = $obj;
	}
 	$result->close();
}
if (json_last_error() != JSON_ERROR_NONE) $error[] = json_last_error_msg();

if (!$iamhere) {
	$error[]="Player entered into db";
	if($db->query("INSERT INTO players (sessionid, name, room) 
			VALUES ('".session_id()."','".$_SESSION['name']."','".$room."')") !==TRUE)
		$error[]=$db->error;
}

// action
switch ($do) {
	case "init": 
		$error[]="Initialisierung";
		break;
	case "start": 
		$error[]="Spiel begonnen";
		if($db->query("INSERT INTO games (room, json) 
				VALUES ('".$room."','".json_encode($receive["game"])."')") !==TRUE)
			$error[]=$db->error;
		if (json_last_error() != JSON_ERROR_NONE) $error[] = json_last_error_msg();
		// get game again
		if ($result = $db->query('SELECT * FROM games WHERE room="'.$room.'"')) {
			while ($obj = $result->fetch_object()) {
				$game = $obj;
				$game->json = json_decode($obj->json, true);
			}
		 	$result->close();
		} else $error[]=$db->error;
		if (json_last_error() != JSON_ERROR_NONE) $error[] = json_last_error_msg();
		break;
	case "end":
		$error[]="Spiel beendet";
		if($db->query("DELETE FROM games WHERE room='".$room."'") !==TRUE)
			$error[]=$db->error;
		$game = null;
		break;
	case "play": 
		if (null != $game) {
			if ($db->query("UPDATE games SET json='".json_encode($receive["game"])."' 
				WHERE room='".$room."'") !== TRUE) 
			$error[]=$db->error;
		}
		if (json_last_error() != JSON_ERROR_NONE) $error[] = json_last_error_msg();
		if ($db->query("UPDATE players SET name='".$_SESSION['name']."', 
				json='".json_encode($receive["me"])."', time=NOW() 
				WHERE sessionid='".session_id()."'") !== TRUE) 
			$error[]=$db->error;
		if (json_last_error() != JSON_ERROR_NONE) $error[] = json_last_error_msg();
		break;
}

// close
$db->close();

// output
$return = (object) ['gamedata' => $game, 'playerdata' => $players, 'error' => $error];
print_r(json_encode($return));
?>
