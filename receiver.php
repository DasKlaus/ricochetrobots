<?php
header('Content-Type: application/json');
ob_start();
// setting a handler replaces the default one that would log, so this one logs itself
set_exception_handler(function ($e) {
	error_log($e);
	ob_end_clean();
	http_response_code(500);
	echo json_encode(["error" => "Serverfehler"]);
});
require_once("config.php");
require_once("identity.php");

const TARGETS = 17; // 16 coloured targets and the vortex
const DEADLINE = 60; // seconds a round stays open after its first solution, as deadline in logic.js

$seed = $_GET['game'] ?? $_POST['game'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' and $_SESSION['user_id'])
{
	$user = $_SESSION['user_id'];
	$round = (int)($_POST['round'] ?? -1);
	switch ($_POST['action'] ?? '')
	{
		case 'solve':
			$moves = json_decode($_POST['moves'] ?? '', true);
			if (!is_array($moves) or !$moves or count($moves) > 64) { break; }
			$clean = [];
			foreach ($moves as $move)
			{
				if (!is_array($move) or !in_array($move['color'] ?? -1, [0, 1, 2, 3, 4], true) or !in_array($move['dir'] ?? -1, [0, 1, 2, 3], true)) { break 2; }
				$clean[] = ['color' => $move['color'], 'dir' => $move['dir']];
			}
			// only a player, only for the round the board showed, and only while that round is still open
			$mysql->execute_query("insert into solution (seed, round, user_id, moves, length, created_at)
				select g.seed, g.round, ?, ?, ?, now() from game g join player p on p.seed = g.seed and p.user_id = ?
				where g.seed = ? and g.round = ? and g.round < ".TARGETS."
					and not exists (select 1 from solution s where s.seed = g.seed and s.round = g.round and s.created_at <= now() - interval ".DEADLINE." second)",
				[$user, json_encode($clean), count($clean), $user, $seed, $round]);
			if ($mysql->affected_rows) { $mysql->execute_query("update game set version = version + 1 where seed = ?", [$seed]); }
			break;
		// the player whose countdown runs out first closes the round; everyone else finds it closed on the next poll
		case 'advance':
			$mysql->execute_query("update game g join player p on p.seed = g.seed and p.user_id = ?
				set g.round = g.round + 1, g.version = g.version + 1
				where g.seed = ? and g.round = ?
					and exists (select 1 from solution s where s.seed = g.seed and s.round = g.round and s.created_at <= now() - interval ".DEADLINE." second)",
				[$user, $seed, $round]);
			break;
	}
}
elseif (version($mysql, $seed) === (int)($_GET['version'] ?? -1))
{
	ob_end_clean();
	http_response_code(304);
	exit;
}

ob_end_clean();
echo json_encode(gamestate($mysql, $seed));

function version($mysql, $seed)
{
	return (int)$mysql->execute_query("select version from game where seed = ?", [$seed])->fetch_column();
}

// scores are computed here and never stored: a round's winner is its shortest solution, the earliest among
// equals, and takes its length as points; everyone else takes the round's longest plus ten. Fewer is better.
function gamestate($mysql, $seed)
{
	$currentgame = $mysql->execute_query("select round, version from game where seed = ?", [$seed])->fetch_assoc();
	$players = [];
	foreach ($mysql->execute_query("select user_id, display_name as name from player where seed = ? order by joined_at", [$seed])->fetch_all(MYSQLI_ASSOC) as $row)
	{
		$players[$row['user_id']] = $row + ['targets' => 0, 'points' => 0, 'solutions' => 0];
	}
	$rounds = [];
	foreach ($mysql->execute_query("select s.id, s.round, s.user_id, p.display_name as name, s.moves, s.length, timestampdiff(second, s.created_at, now()) as age
			from solution s join player p on p.seed = s.seed and p.user_id = s.user_id
			where s.seed = ? order by s.round, s.length, s.id", [$seed])->fetch_all(MYSQLI_ASSOC) as $row)
	{
		$rounds[$row['round']][] = $row;
		$players[$row['user_id']]['solutions']++;
	}
	$history = [];
	$solutions = [];
	$timeleft = null;
	foreach ($rounds as $r => $list)
	{
		if ($r < $currentgame['round'])
		{
			$winner = $list[0];
			$longest = end($list)['length'];
			$history[] = ['user_id' => $winner['user_id'], 'name' => $winner['name'], 'moves' => json_decode($winner['moves'])];
			foreach (array_keys($players) as $id)
			{
				if ($id == $winner['user_id']) { $players[$id]['targets']++; $players[$id]['points'] += $winner['length']; }
				else { $players[$id]['points'] += $longest + 10; }
			}
		}
		else
		{
			$timeleft = DEADLINE - max(array_column($list, 'age'));
			foreach ($list as $row)
			{
				// an open round's moves go to their author only, everyone else gets the length
				$solutions[] = ['id' => $row['id'], 'user_id' => $row['user_id'], 'name' => $row['name'], 'length' => $row['length']]
					+ ($row['user_id'] == $_SESSION['user_id'] ? ['moves' => json_decode($row['moves'])] : []);
			}
		}
	}
	return ['version' => $currentgame['version'], 'round' => $currentgame['round'], 'history' => $history,
		'timeleft' => $timeleft, 'solutions' => $solutions, 'players' => array_values($players)];
}
