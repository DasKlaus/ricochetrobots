<?php
# The interface language. $ui holds labels and messages and is handed to the client by board.php, so
# it stays plain text; $text holds prose and markup and never leaves the server. identity.php and
# legal.php carry their own texts, being shared with projects that know nothing of this file.

function browserlanguage()
{
	foreach (explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '') as $entry)
	{
		$tag = strtolower(trim(strtok($entry, ';')));
		if (str_starts_with($tag, 'de')) { return 'de'; }
		if (str_starts_with($tag, 'en')) { return 'en'; }
	}
	return 'en';
}

$ui = [
'de' => [
	'guest' => 'Gast',
	'profile' => 'Profil',
	'instructions' => 'Anleitung',
	'legal' => 'Impressum',
	'gameid' => 'Spiel-ID',
	'multiplayer' => 'Mehrspieler',
	'joingame' => 'Spiel beitreten',
	'join' => 'Beitreten',
	'newgame' => 'Neues Spiel',
	'startgame' => 'Spiel starten',
	'playalong' => 'Mitspielen',
	'stepback' => 'letzten Zug zurücknehmen',
	'stepallback' => 'alle Züge zurücknehmen',
	'targetback' => 'letztes Ziel zurücknehmen',
	'targetallback' => 'alle Ziele zurücknehmen',
	'daily' => 'Rätsel des Tages',
	'play' => 'Spielen',
	'copy' => 'Kopieren',
	'understood' => 'Verstanden',
	'showbest' => 'Eigene beste Lösung anzeigen',
	'showlatest' => 'Zur aktuellen Lösung zurückkehren',

	'nogame' => 'Dieses Spiel gibt es nicht.',
	'creategamefailed' => 'Das Spiel konnte nicht erstellt werden.',
	'ratelimitminute' => 'Du hast gerade eben ein Spiel gestartet. Warte eine Minute, bevor du das nächste startest.',
	'ratelimithour' => 'Du hast in der letzten Stunde zehn Spiele gestartet. Versuch es später noch einmal.',

	'servererror' => 'Serverfehler',
	'networkerror' => 'Netzwerkfehler oder keine Netzwerkverbindung!',
	'singleplayer' => 'Netzwerkproblem, von nun an Singleplayer.',
	'foundsolution' => '%1 hat eine Lösung gefunden',
	'better' => '%1 war besser!',
	'pointself' => 'Punkt für dich!',
	'pointother' => 'Punkt für %1',
	'knownsolution' => 'Diese Lösung hattest du schon!',
	'first' => 'Erster!',
	'done' => 'Geschafft!',
	'reached' => 'Ziel erreicht!',
	'record' => 'Rekord!',
	'improved' => 'Schon besser!',
	'gameover' => 'Spiel beendet',
	'headtargets' => 'Ziele',
	'headmoves' => 'Züge',
	'headsolutions' => 'Lösungen',
	'home' => 'Zur Startseite',
	'target' => ['Ziel', 'Ziele'],
	'move' => ['Zug', 'Züge'],
	'sharemoves' => '%1 = %2 Züge',
	'sharestreak' => '🔥 %1 Tage in Folge',

	'metadescription' => 'Führe die Roboter zum Ziel. Nach dem Brettspiel von Alex Randolph',
],
'en' => [
	'guest' => 'Guest',
	'profile' => 'Profile',
	'instructions' => 'Instructions',
	'legal' => 'Legal notice',
	'gameid' => 'Game ID',
	'multiplayer' => 'Multiplayer',
	'joingame' => 'Join a game',
	'join' => 'Join',
	'newgame' => 'New game',
	'startgame' => 'Start game',
	'playalong' => 'Join in',
	'stepback' => 'undo the last move',
	'stepallback' => 'undo all moves',
	'targetback' => 'undo the last target',
	'targetallback' => 'undo all targets',
	'daily' => 'Puzzle of the day',
	'play' => 'Play',
	'copy' => 'Copy',
	'understood' => 'Understood',
	'showbest' => 'Show personal best',
	'showlatest' => 'Back to current solution',

	'nogame' => 'This game does not exist.',
	'creategamefailed' => 'The game could not be created.',
	'ratelimitminute' => 'You started a game a moment ago. Wait a minute before starting the next one.',
	'ratelimithour' => 'You have started ten games in the last hour. Try again later.',

	'servererror' => 'Server error',
	'networkerror' => 'Network error or no network connection!',
	'singleplayer' => 'Network problem, single player from now on.',
	'foundsolution' => '%1 found a solution',
	'better' => '%1 was better!',
	'pointself' => 'Point for you!',
	'pointother' => 'Point for %1',
	'knownsolution' => 'You had this solution already!',
	'first' => 'First!',
	'done' => 'Made it!',
	'reached' => 'Target reached!',
	'record' => 'Record!',
	'improved' => 'Better already!',
	'gameover' => 'Game over',
	'headtargets' => 'Targets',
	'headmoves' => 'Moves',
	'headsolutions' => 'Solutions',
	'home' => 'To the start page',
	'target' => ['target', 'targets'],
	'move' => ['move', 'moves'],
	'sharemoves' => '%1 = %2 moves',
	'sharestreak' => '🔥 %1 days in a row',

	'metadescription' => 'Guide the robots to the target. After the board game by Alex Randolph',
],
];

$text = [
'de' => [
	'guestjoin' => '<p>Vergib einen Namen, um mitzuspielen, oder lass das Feld frei, um anonym zu spielen. Wenn du einen Authentifizierungs-Code hast, kannst du dich mit diesem anmelden.</p>',
	'guestcreate' => '<p>Vergib einen Namen, um im Mehrspielermodus zu spielen. Du kannst das Namensfeld freilassen, um anonym zu spielen. Wenn du einen Authentifizierungs-Code hast, kannst du dich mit diesem anmelden.</p>',
	'dailyguest' => '<p>Das Ergebnis wird gespeichert, sobald ein Name gesetzt ist, bei leerem Feld anonym. Mit einem Authentifizierungs-Code ist auch eine Anmeldung möglich. Ohne beides geht das Ergebnis mit dem Ende der Sitzung verloren.</p>',
	'dailytext' => '<p>Jeden Tag ein neues Puzzle mit fünf Zielen.</p>',

	'instructionstext' => '<p>Nach dem Brettspiel von Alex Randolph.</p>
		<p>Ziel ist, das markierte Ziel <span class="target red">★</span> mit dem Roboter der gleichen Farbe <span class="robot red">1</span> zu erreichen, in so wenig Zügen wie möglich.
		Das bunte Ziel <span class="target black">★</span> darf jeder Roboter erreichen.
		Roboter können nicht anhalten: sie bewegen sich in die entsprechende Richtung, bis sie an eine Wand oder einen anderen Roboter stoßen.
		Auch die anderen Roboter dürfen gezogen werden, um als Hindernis zu dienen.</p>
		<h3>Spiel mit der Maus</h3>
		<ul>
			<li>&Uuml;ber einen Roboter fahren zeigt seine m&ouml;glichen Z&uuml;ge.</li>
			<li>Ein Klick auf einen Roboter w&auml;hlt ihn aus.</li>
			<li>Ein Klick auf einen der blassen Roboter an den Endpunkten zieht ihn dorthin.</li>
			<li>Ein Klick auf ein leeres Feld hebt die Auswahl auf.</li>
			<li>Die Kn&ouml;pfe unten rechts im L&ouml;sungsfenster nehmen den letzten oder alle Z&uuml;ge zur&uuml;ck.</li>
		</ul>
		<h3>Spiel mit der Tastatur</h3>
		<ul>
			<li>1 bis 5 w&auml;hlt einen Roboter, 0 hebt die Auswahl auf.</li>
			<li>Die Pfeiltasten ziehen den gew&auml;hlten Roboter.</li>
			<li>Die R&uuml;cktaste nimmt den letzten Zug zur&uuml;ck.</li>
			<li>Escape nimmt alle Z&uuml;ge zur&uuml;ck.</li>
		</ul>',
	'multiplayertext' => '<p>Sobald ein Spieler eine L&ouml;sung gefunden hat, bleiben 60 Sekunden, um eine noch k&uuml;rzere zu finden.
		Die k&uuml;rzeste L&ouml;sung gewinnt das Ziel, bei gleicher L&auml;nge die zuerst gefundene. Das Spiel endet nach 17 Runden.</p>
		<p>Es gewinnt der Spieler mit den meisten erreichten Zielen, bei Gleichstand derjenige mit den wenigsten benötigten Z&uuml;gen.
		Wer ein Ziel erreicht, bekommt die Z&uuml;ge seiner kürzesten L&ouml;sung, alle anderen die der l&auml;ngsten gefundenen L&ouml;sung plus zehn.</p>
		<p>Mitspieler können durch Teilen der Spiel-ID oder URL eingeladen werden.</p>',
],
'en' => [
	'guestjoin' => '<p>Pick a name to join in, or leave the field empty to play anonymously. If you have an authentication code, you can sign in with it.</p>',
	'guestcreate' => '<p>Set a name to play multiplayer. You can leave the field empty to play anonymously. If you have an authentication code, you can sign in with it.</p>',
	'dailyguest' => '<p>The result is saved once a name is set, anonymously if the field is left empty. An authentication code signs in instead. Without either, the result is lost when the session ends.</p>',
	'dailytext' => '<p>A new board with five targets every day.</p>',

	'instructionstext' => '<p>After the board game by Alex Randolph.</p>
		<p>The aim is to reach the marked target <span class="target red">★</span> with the robot of the same colour <span class="robot red">1</span>, in as few moves as possible.
		The multicoloured target <span class="target black">★</span> may be reached by any robot.
		Robots cannot stop: they travel in the given direction until they hit a wall or another robot.
		The other robots may be moved as well, to act as blockers.</p>
		<h3>Playing with the mouse</h3>
		<ul>
			<li>Hovering over a robot shows its possible moves.</li>
			<li>A click on a robot selects it.</li>
			<li>A click on one of the pale robots at the end points moves it there.</li>
			<li>A click on an empty tile clears the selection.</li>
			<li>The buttons at the bottom right of the solution window undo the last move or all of them.</li>
		</ul>
		<h3>Playing with the keyboard</h3>
		<ul>
			<li>1 to 5 select a robot, 0 clears the selection.</li>
			<li>The arrow keys move the selected robot.</li>
			<li>Backspace undoes the last move.</li>
			<li>Escape undoes all moves.</li>
		</ul>',
	'multiplayertext' => '<p>Once a player has found a solution, 60 seconds remain to find a shorter one.
		The shortest solution wins the target, among equals the one found first. The game ends after 17 rounds.</p>
		<p>The player with the most targets wins, on a tie the one who needed the fewest moves.
		Whoever reaches a target scores the moves of their shortest solution, everyone else those of the longest solution found plus ten.</p>
		<p>Fellow players can be invited by sharing the game ID or the URL.</p>',
],
];

$language = in_array($_SESSION['language'] ?? '', ['de', 'en'], true) ? $_SESSION['language'] : browserlanguage();
$strings = $ui[$language] + $text[$language];

# Only the client's strings carry placeholders or plurals; logic.js formats those itself.
function t($key)
{
	global $strings;
	return $strings[$key];
}
