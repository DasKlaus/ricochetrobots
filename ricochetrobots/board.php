<?php
if ($go == 'daily')
{
	$held = $_SESSION['ricochetdaily'] ?? ['day' => ''];
	$latest = $_SESSION['ricochetlatest'] ?? ['day' => ''];
	$run = $_SESSION['user_id']
		? $mysql->execute_query("select moves as history, length, streak from daily where day = ? and user_id = ?", [date('Y-m-d'), $_SESSION['user_id']])->fetch_assoc()
		: ($held['day'] == date('Y-m-d') ? $held : null);
	// the newest run is shown rather than the saved best, which may have needed fewer moves
	$daily = ['number' => $number, 'day' => date('Y-m-d'), 'run' => $run, 'latest' => $run && $latest['day'] == date('Y-m-d') ? $latest : null];
	$isplayer = true;
	$rules = !$run && !$_SESSION['user_id']; // a visitor without a name may come from a shared result, so the rules come first
}
else
{
	$currentgame = $mysql->execute_query("select seed, round from game where seed = ?", [$seed])->fetch_assoc();
	if (!$currentgame)
	{
		echo '<div class="content">';
		identityMessage($language);
		echo '<p class="warning">'.t('nogame').'</p></div>';
		return;
	}
	$seed = $currentgame['seed'];
	$isplayer = $mysql->execute_query("select 1 from player where seed = ? and user_id = ?", [$seed, $_SESSION['user_id']])->fetch_column();
	$daily = null;
	$rules = false;
}
if ($rules)
{
	echo '<div class="content">';
	echo '<h2>'.t('daily').' #'.$number.'</h2>'.t('dailytext');
	echo '<h2>'.t('instructions').'</h2>'.t('instructionstext');
	echo '<button type="button" onclick="this.parentNode.remove(); start();">'.t('understood').'</button>';
	echo '</div>';
}
?>
<div class="wrap"<?php if ($rules) echo ' hidden'; ?>>
	<div class="map"></div>
	<div class="solutionwrapper<?php if ($daily) echo ' daily'; ?>">
		<?php if (!$daily) echo '<div class="best"></div>'; ?><div class="all"></div><div class="current"></div>
		<div class="btn" title="<?php echo t('stepback'); ?>" onclick="stepBack();">&lsaquo;</div>
		<div class="btn" title="<?php echo t('stepallback'); ?>" onclick="stepAllBack();">&laquo;</div>
	</div>
</div>
<?php
if ($daily)
	echo '<div class="result" hidden>
			<div class="share"></div>
			<button type="button" onclick="getSelection().selectAllChildren(this.previousElementSibling); navigator.clipboard.writeText(this.previousElementSibling.textContent);">'.t('copy').'</button>
			<button type="button" class="toggle" onclick="toggle();" hidden></button>
		</div>';
else
	echo '<div class="players"></div>';
?>
<script>
  var seed = <?php echo json_encode($seed); ?>;
  var selfid = <?php echo json_encode((int)$_SESSION['user_id']); ?>;
  var isplayer = <?php echo json_encode((bool)$isplayer); ?>;
  var daily = <?php echo json_encode($daily); ?>;
  var txt = <?php echo json_encode($ui[$language]); ?>;
</script>
<script src="logic.js"></script>
<div class="content">
<?php
identityMessage($language);
if ($daily)
{
	if ($run and !$_SESSION['user_id'])
	{
		echo t('dailyguest');
		identityForm($language);
	}
}
elseif (!$_SESSION['user_id'] and $currentgame['round'] < TARGETS)
{
	echo t('guestjoin');
	identityForm($language);
}
elseif (!$isplayer and $currentgame['round'] < TARGETS)
	echo '<form method="post">
			<button type="submit" name="do" value="join">'.t('playalong').'</button>
		</form>';
?>
</div>
