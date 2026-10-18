<?php
header('Content-Type: text/plain');
require_once("config.php");
require_once("../identity.php");
require_once("achieve.php");
$catalogue = require "../achievements.php";

// Sets every player's level of each of this project's achievements from history, with the conditions receiver.php and
// index.php grant them by live. Events are [user, n, unix time]: a player holds the highest level any of their events
// reaches, granted when it was first reached. A row this changes is marked seen; one it leaves alone keeps its seen.

$events = [];
foreach ($mysql->execute_query("select seed from game")->fetch_all() as [$seed])
	foreach (gameevents($mysql, $seed) as [$user, $key, $n, $at])
		$events[$key][] = [$user, $n, $at];
foreach ($mysql->execute_query("select user_id, moves, length, streak, unix_timestamp(found_at) as at from daily") as $row)
	foreach (dailyevents($row) as [$key, $n])
		$events[$key][] = [$row['user_id'], $n, $row['at']];
$tops = [];
foreach (topdailies($mysql, date('Y-m-d')) as [$user, $at])
	$events['rr_topdaily'][] = [$user, $tops[$user] = ($tops[$user] ?? 0) + 1, $at];

identityConnect();
foreach (array_keys($catalogue['ricochetrobots']['badges']) as $key)
{
	$list = $events[$key] ?? [];
	usort($list, fn($a, $b) => $a[2] <=> $b[2]);
	$held = [];
	foreach ($list as [$user, $n, $at])
	{
		$level = achievementlevel($key, $n);
		if ($level > ($held[$user][0] ?? 0)) { $held[$user] = [$level, $at]; }
	}
	$current = array_column($identity->execute_query("select user_id, level from achievement where badge = ?", [$key])->fetch_all(), 1, 0);
	$changed = 0;
	foreach ($current as $user => $level)
		if (!isset($held[$user]))
		{
			$identity->execute_query("delete from achievement where user_id = ? and badge = ?", [$user, $key]);
			$changed++;
		}
	foreach ($held as $user => [$level, $at])
		if (($current[$user] ?? 0) != $level)
		{
			$identity->execute_query("insert into achievement (user_id, badge, level, granted_at, seen) values (?, ?, ?, from_unixtime(?), 1)
				on duplicate key update level = values(level), granted_at = values(granted_at), seen = 1", [$user, $key, $level, (int)$at]);
			$changed++;
		}
	echo $key.": ".count($held)." players, ".$changed." changed".PHP_EOL;
}

echo "Done!".PHP_EOL;
