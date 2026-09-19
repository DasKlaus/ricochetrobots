<?php
header('Content-Type: text/html; charset=UTF-8');
require_once("config.php");
require_once("identity.php");

const TARGETS = 17; // 16 coloured targets and the vortex

$seed = $_GET['game'] ?? '';
$do = $_POST['do'] ?? '';
$warning = '';

if ($do == 'renameall' and $_SESSION['user_id'])
	$mysql->execute_query("update player set display_name = ? where user_id = ?", [$_SESSION['display_name'], $_SESSION['user_id']]);

if (($do == 'create' or $do == 'join') and $_SESSION['user_id'])
{
	if (identityRestriction() !== false) { $_SESSION['display_name'] = ""; }
	if ($do == 'create')
	{
		$recent = $mysql->execute_query("select sum(created_at > now() - interval 1 minute), count(*) from game
			where created_by = ? and created_at > now() - interval 1 hour", [$_SESSION['user_id']])->fetch_row();
		if (($_POST['website'] ?? '') != '')
			$warning = "Das Spiel konnte nicht erstellt werden.";
		elseif ($recent[0] > 0)
			$warning = "Du hast gerade eben ein Spiel gestartet. Warte eine Minute, bevor du das n&auml;chste startest.";
		elseif ($recent[1] >= 10)
			$warning = "Du hast in der letzten Stunde zehn Spiele gestartet. Versuch es sp&auml;ter noch einmal.";
		else
		{
			do
			{
				$seed = '';
				for ($i = 0; $i < 6; $i++) { $seed .= '23456789abcdefghjklmnpqrstuvwxyz'[random_int(0, 31)]; }
				$mysql->execute_query("insert ignore into game (seed, created_by, created_at) values (?, ?, now())", [$seed, $_SESSION['user_id']]);
			}
			while ($mysql->affected_rows == 0);
		}
	}
	if (!$warning)
	{
		$mysql->execute_query("insert ignore into player (seed, user_id, display_name, joined_at)
			select seed, ?, ?, now() from game where seed = ? and round < ?", [$_SESSION['user_id'], $_SESSION['display_name'], $seed, TARGETS]);
		if ($mysql->affected_rows)
			$mysql->execute_query("update game set version = version + 1 where seed = ?", [$seed]);
		header('Location: ?game='.urlencode($seed));
		exit;
	}
}

$go = $_GET['go'] ?? ($seed ? 'game' : '');
?>
<!DOCTYPE html>
<html lang="de">
	<head>
		<title>Ricochet Robots</title>
		<meta name="robots" content="index,nofollow">
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link href="style.css" type="text/css" rel="stylesheet" media="screen">
	</head>
	<body class="ricochetrobots">
	<div class="header">
		<div class="time">&nbsp;</div>
		<h1>Ricochet Robots</h1>
		<div class="points">
			<span class="turn">&nbsp;</span>
			<div>Runde: <span class="round">1</span><br>Ziele: <span class="targets">0</span><br>Z&uuml;ge: <span class="fullpoints">0</span></div>
		</div>
	</div>
	<?php
	if ($go == 'game')
		include_once("board.php");
	else
	{
		echo '<div class="content">';
		identityMessage();
		if ($go == 'impressum')
		{
			require_once("legal.php");
			legalNotice();
		}
		elseif ($go == 'user')
		{
			echo '<h2>Profil</h2>';
			identityForm();
		}
		else
		{
			if ($warning) echo '<p class="warning">'.$warning.'</p>';
			echo '<h2>Spiel beitreten</h2>
				<form method="get" class="identity">
					<input type="text" name="game" value="">
					<button type="submit">Beitreten</button>
				</form>
				<h2>Neues Spiel</h2>';
			if ($_SESSION['user_id'])
				echo '<form method="post" class="identity">
						<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
						<button type="submit" name="do" value="create">Spiel starten</button>
					</form>';
			else
			{
				echo '<p>Vergib einen Namen, um ein Spiel zu starten, oder lass das Feld frei, um anonym zu spielen. Wenn du einen Authentifizierungs-Code hast, kannst du dich mit diesem anmelden.</p>';
				identityForm();
			}
			include_once("instructions.php");
		}
		echo '</div>';
	}
	?>
	<div class="footer">
		<a href="?go=user">Profil<?php if ($_SESSION['user_id']) echo ': '.htmlspecialchars($_SESSION['display_name'] ?: "Gast", ENT_QUOTES, 'UTF-8'); ?></a>
		<a href=".">Anleitung</a>
		<a href="?go=impressum">Impressum</a>
	</div>
	</body>
</html>
