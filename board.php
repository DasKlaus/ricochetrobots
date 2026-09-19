<?php
$currentgame = $mysql->execute_query("select seed, round from game where seed = ?", [$seed])->fetch_assoc();
if (!$currentgame)
{
	echo '<div class="content">';
	identityMessage();
	echo '<p class="warning">Dieses Spiel gibt es nicht.</p></div>';
	return;
}
$isplayer = $mysql->execute_query("select 1 from player where seed = ? and user_id = ?", [$seed, $_SESSION['user_id']])->fetch_column();
?>
<div class="wrap">
	<div class="map"></div>
	<div class="solutionwrapper">
		<div class="best"></div><div class="all"></div><div class="current"></div>
		<div class="btn" title="letzten Zug zur&uuml;cknehmen" onclick="stepBack();">&lsaquo;</div>
		<div class="btn" title="alle Z&uuml;ge zur&uuml;cknehmen" onclick="stepAllBack();">&laquo;</div>
	</div>
</div>
<div class="players"></div>
<script>
  var seed = <?php echo json_encode($currentgame['seed']); ?>;
  var selfid = <?php echo json_encode((int)$_SESSION['user_id']); ?>;
  var isplayer = <?php echo json_encode((bool)$isplayer); ?>;
</script>
<script src="logic.js"></script>
<div class="content">
<?php
identityMessage();
if (!$_SESSION['user_id'] and $currentgame['round'] < TARGETS)
{
	echo '<p>Vergib einen Namen, um mitzuspielen, oder lass das Feld frei, um anonym zu spielen. Wenn du einen Authentifizierungs-Code hast, kannst du dich mit diesem anmelden.</p>';
	identityForm();
}
elseif (!$isplayer and $currentgame['round'] < TARGETS)
	echo '<form method="post">
			<button type="submit" name="do" value="join">Mitspielen</button>
		</form>';
?>
</div>
