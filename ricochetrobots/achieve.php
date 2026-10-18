<?php
// the conditions of this project's achievements, shared by the live grants (receiver.php, index.php) and badgefill.php,
// and the handing out of new ones (board.php, receiver.php)

const TARGETS = 17; // 16 coloured targets and the vortex
const DEADLINE = 60; // seconds a round stays open after its first solution, as deadline in logic.js
const MOVETIME = 0.7; // seconds per robot move played back, as movetime in logic.js

// the level $n reaches on $key's thresholds; fewer is better for the par and speed achievements
function achievementlevel($key, $n)
{
	static $catalogue = require "../achievements.php";
	$level = 0;
	foreach ($catalogue['ricochetrobots']['badges'][$key]['levels'] as $threshold)
		if (in_array($key, ['rr_par_game', 'rr_par_daily', 'rr_speed']) ? $n <= $threshold : $n >= $threshold) { $level++; }
	return $level;
}

function achieve($user, $key, $n)
{
	$level = achievementlevel($key, $n);
	if ($level) { grantAchievement($user, $key, $level); }
}

// this player's unseen achievements as their descriptions, marked seen as they are handed out
function newachievements($language)
{
	$unseen = unseenAchievements($language, 'ricochetrobots');
	confirmAchievements(array_column($unseen, 'level', 'badge'));
	return array_column($unseen, 'description');
}

// a solution without the moves undone at once: a robot's move cancels its previous one if it goes the opposite way
// and no other robot moved in between, repeatedly
function cancelled($moves)
{
	$kept = [];
	foreach ($moves as $move)
		if ($kept and end($kept)['color'] == $move['color'] and end($kept)['dir'] == ($move['dir'] + 2) % 4) { array_pop($kept); }
		else { $kept[] = $move; }
	return $kept;
}

function robots($cancelled)
{
	return count(array_unique(array_column($cancelled, 'color')));
}

// a game's events, each [user, key, n, unix time, solution id]. Per solution: its robots, its author's different
// solutions of the round so far and, for four moves or more, the seconds since the round started for them. A round
// starts at the game's creation or at the previous round's first solution plus the deadline plus the playback of its
// winning solution, for a later joiner at joining. Per player of a full game, without a solution id: points (per round
// the shortest own solution, else the longest plus ten), a beaten Klaus, a solution in every round.
function gameevents($mysql, $seed)
{
	$game = $mysql->execute_query("select round, unix_timestamp(created_at) as at from game where seed = ?", [$seed])->fetch_assoc();
	$joined = array_column($mysql->execute_query("select user_id, unix_timestamp(joined_at) from player where seed = ?", [$seed])->fetch_all(), 1, 0);
	$rounds = [];
	foreach ($mysql->execute_query("select id, round, user_id, moves, length, unix_timestamp(created_at) as at from solution where seed = ? order by round, id", [$seed]) as $row)
		$rounds[$row['round']][] = $row;
	$events = [];
	$start = $game['at'];
	foreach ($rounds as $list)
	{
		$variants = [];
		foreach ($list as $s)
		{
			$moves = cancelled(json_decode($s['moves'], true));
			$variants[$s['user_id']][json_encode($moves)] = true;
			$events[] = [$s['user_id'], 'rr_robots', robots($moves), $s['at'], $s['id']];
			$events[] = [$s['user_id'], 'rr_variants', count($variants[$s['user_id']]), $s['at'], $s['id']];
			if (count($moves) >= 4) { $events[] = [$s['user_id'], 'rr_speed', $s['at'] - max($start, $joined[$s['user_id']]), $s['at'], $s['id']]; }
		}
		$start = min(array_column($list, 'at')) + DEADLINE + (min(array_column($list, 'length')) + 1) * MOVETIME;
	}
	if ($game['round'] < TARGETS) { return $events; }
	$end = max(array_column(end($rounds), 'at'));
	$points = [];
	foreach ($joined as $user => $at)
	{
		$points[$user] = 0;
		$solved = 0;
		foreach ($rounds as $list)
		{
			$own = array_filter($list, fn($s) => $s['user_id'] == $user);
			$points[$user] += $own ? min(array_column($own, 'length')) : max(array_column($list, 'length')) + 10;
			if ($own) { $solved++; }
		}
		$events[] = [$user, 'rr_par_game', $points[$user], $end, null];
		if ($solved == TARGETS) { $events[] = [$user, 'rr_perfect', 1, $end, null]; }
	}
	foreach ($points as $user => $p)
		if (isset($points[1]) and $user != 1 and $p < $points[1]) { $events[] = [$user, 'rr_klaus', 1, $end, null]; }
	return $events;
}

// a saved daily's events, each [key, n]: its length, its streak, and per target its robots and, for four moves or more,
// the time it took if recorded
function dailyevents($row)
{
	$events = [['rr_par_daily', $row['length']], ['rr_streak', $row['streak']]];
	foreach (json_decode($row['moves'], true) as $target)
	{
		$moves = cancelled($target['moves']);
		$events[] = ['rr_robots', robots($moves)];
		if (isset($target['time']) and count($moves) >= 4) { $events[] = ['rr_speed', $target['time']]; }
	}
	return $events;
}

// the winners of the dailies before $day on which more than one played, as [user, unix time of the winning run] in day order:
// the fewest moves, the earliest among equals
function topdailies($mysql, $day)
{
	return $mysql->execute_query("select user_id, unix_timestamp(found_at) from (select day, user_id, found_at,
			row_number() over (partition by day order by length, found_at) as place, count(*) over (partition by day) as players
		from daily where day < ?) d where place = 1 and players > 1 order by day", [$day])->fetch_all();
}
