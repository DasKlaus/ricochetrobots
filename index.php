<?php
header('Content-Type: text/html; charset=UTF-8');
require_once("config.php");
require_once("identity.php");
require_once("lang.php"); // after identity.php, which is where a language change lands

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
			$warning = t('creategamefailed');
		elseif ($recent[0] > 0)
			$warning = t('ratelimitminute');
		elseif ($recent[1] >= 10)
			$warning = t('ratelimithour');
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
$preview = (empty($_SERVER['HTTPS']) ? 'http://' : 'https://').$_SERVER['HTTP_HOST'].rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\')
	.'/preview.php'.($go == 'game' ? '?game='.urlencode($seed) : '');
?>
<!DOCTYPE html>
<html lang="<?php echo $language; ?>">
	<head>
		<title>Ricochet Robots</title>
		<meta name="description" content="<?php echo t('metadescription'); ?>">
		<meta name="robots" content="<?php echo $go == 'game' ? 'noindex,nofollow' : 'index,nofollow'; ?>">
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta property="og:type" content="website">
		<meta property="og:locale" content="<?php echo $language == 'en' ? 'en_GB' : 'de_DE'; ?>">
		<meta property="og:title" content="Ricochet Robots">
		<meta property="og:description" content="<?php echo t('metadescription'); ?>">
		<meta property="og:image" content="<?php echo htmlspecialchars($preview, ENT_QUOTES, 'UTF-8'); ?>">
		<meta property="og:image:width" content="1200">
		<meta property="og:image:height" content="628">
		<link rel="stylesheet" href="style.css">
	</head>
	<body>
	<div class="header">
		<div class="time"></div>
		<?php
		if ($go == 'game')
			echo '<div class="gameid">'.t('gameid').':<b>'.htmlspecialchars($seed, ENT_QUOTES, 'UTF-8').'</b></div>';
		else
			echo '<h1>Ricochet Robots</h1>';
		?>
		<div class="points"></div>
	</div>
	<?php
	if ($go == 'game')
		include_once("board.php");
	else
	{
		echo '<div class="content">';
		identityMessage($language);
		if ($go == 'impressum')
		{
			require_once("legal.php");
			legalNotice($language);
		}
		elseif ($go == 'user')
		{
			echo '<h2>'.t('profile').'</h2>';
			identityLanguageForm($language, ['de' => 'Deutsch', 'en' => 'English']);
			identityForm($language);
		}
		else
		{
			if ($warning) echo '<p class="warning">'.$warning.'</p>';
			echo '<h2>'.t('joingame').'</h2>
				<form method="get">
					<input type="text" name="game" value="">
					<button type="submit">'.t('join').'</button>
				</form>
				<h2>'.t('newgame').'</h2>';
			if ($_SESSION['user_id'])
				echo '<form method="post">
						<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
						<button type="submit" name="do" value="create">'.t('startgame').'</button>
					</form>';
			else
			{
				echo t('guestcreate');
				identityForm($language);
			}
			echo '<h2>'.t('instructions').'</h2>'.t('instructionstext');
		}
		echo '</div>';
	}
	?>
	<div class="footer">
		<a href="?go=user"><?php echo t('profile'); if ($_SESSION['user_id']) echo ': '.htmlspecialchars($_SESSION['display_name'] ?: t('guest'), ENT_QUOTES, 'UTF-8'); ?></a>
		<a href="."><?php echo t('instructions'); ?></a>
		<a href="?go=impressum"><?php echo t('legal'); ?></a>
	</div>
	</body>
</html>
