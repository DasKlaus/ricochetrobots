<?php
# A game's starting board as its link preview. The board is derived from the code as random(), shuffle() and createMap()
# in logic.js derive it: same generator, same pieces, same draws in the same order. Changing one means changing both.
$seed = $_GET['game'] ?? 'zufall'; # the board every page but a game shows

$originals = [ # colour, wallX, wallY, targets, as originals in logic.js
	[0, 3, 5, [[1,1,0,1], [6,1,3,3], [2,4,1,2], [7,5,2,0]]],
	[0, 3, 4, [[5,1,1,2], [1,4,3,3], [1,6,2,0], [7,5,0,1]]],
	[0, 1, 5, [[4,1,3,3], [1,3,0,1], [5,5,2,0], [2,6,1,2]]],
	[1, 5, 3, [[3,2,2,0], [5,3,1,1], [2,4,0,3], [4,5,3,2]]],
	[1, 4, 4, [[2,1,2,0], [6,3,1,1], [4,5,0,3], [1,6,3,2]]],
	[1, 3, 3, [[1,2,0,1], [5,1,3,2], [6,4,2,0], [2,6,1,3]]],
	[2, 2, 3, [[5,1,1,1], [7,2,4,2], [3,4,0,2], [6,5,3,0], [1,6,2,3]]],
	[2, 3, 6, [[6,1,1,1], [1,3,2,3], [5,4,3,0], [2,5,0,2], [7,5,4,2]]],
	[2, 4, 4, [[2,1,0,2], [1,3,3,1], [6,4,2,0], [5,6,1,3], [3,7,4,2]]],
	[3, 1, 5, [[4,1,0,0], [1,2,3,3], [6,3,2,2], [3,6,1,1]]],
	[3, 4, 5, [[1,2,3,0], [6,1,2,2], [6,5,1,3], [3,6,0,1]]],
	[3, 1, 6, [[1,4,0,1], [3,1,3,0], [6,3,2,2], [4,6,1,3]]],
];

function imul($x, $y) # Math.imul on unsigned 32-bit values, split so the product stays within 64 bits
{
	return ($x * ($y & 0xFFFF) + ((($x * ($y >> 16)) & 0xFFFF) << 16)) & 0xFFFFFFFF;
}

function shuffled($array, $draw)
{
	for ($i = count($array) - 1; $i > 0; $i--)
	{
		$j = (int)floor($draw() * ($i + 1));
		[$array[$i], $array[$j]] = [$array[$j], $array[$i]];
	}
	return $array;
}

function rotate($x, $y, $rotation)
{
	return [[$x, $y], [15 - $y, $x], [15 - $x, 15 - $y], [$y, 15 - $x]][$rotation];
}

$a = 0;
foreach (str_split($seed) as $char) { $a = $a * 32 + strpos('23456789abcdefghjklmnpqrstuvwxyz', $char); }
$draw = function() use (&$a)
{
	$a = ($a + 0x6D2B79F5) & 0xFFFFFFFF;
	$t = imul($a ^ ($a >> 15), 1 | $a);
	$t = (($t + imul($t ^ ($t >> 7), 61 | $t)) & 0xFFFFFFFF) ^ $t;
	return ($t ^ ($t >> 14)) / 4294967296;
};

$walls = []; # [x][y][direction], directions up, left, down, right; starting with the outer walls and the centre block
for ($x = 0; $x < 16; $x++) for ($y = 0; $y < 16; $y++)
	$walls[$x][$y] = [$y == 0 || ($y == 7 || $y == 9) && ($x == 7 || $x == 8), $x == 0 || ($x == 7 || $x == 9) && ($y == 7 || $y == 8),
		$y == 15 || ($y == 6 || $y == 8) && ($x == 7 || $x == 8), $x == 15 || ($x == 6 || $x == 8) && ($y == 7 || $y == 8)];
$wall = function($x, $y, $dir, $rotation) use (&$walls) # a wall sits on both tiles it separates
{
	$dir = (4 + $dir - $rotation) % 4;
	[$x, $y] = rotate($x, $y, $rotation);
	$walls[$x][$y][$dir] = true;
	[$dx, $dy] = [[0, -1], [-1, 0], [0, 1], [1, 0]][$dir];
	$walls[$x + $dx][$y + $dy][($dir + 2) % 4] = true;
};

$pieces = []; # one piece of each colour in the drawn order, a piece's index is its rotation
foreach (shuffled($originals, $draw) as $piece) { $pieces[$piece[0]] ??= $piece; }
$targets = [];
foreach (array_values($pieces) as $i => [, $wallx, $wally, $list])
{
	$wall($wallx, 0, 3, $i);
	$wall(0, $wally, 2, $i);
	foreach ($list as [$x, $y, $color, $dir])
	{
		$wall($x, $y, $dir, $i);
		$wall($x, $y, ($dir + 1) % 4, $i);
		$targets[] = [...rotate($x, $y, $i), $color];
	}
}
$target = shuffled($targets, $draw)[0];
$robots = [];
for ($color = 0; $color < 5; $color++)
{
	do { $x = (int)floor($draw() * 16); $y = (int)floor($draw() * 16); }
	while (($x == 7 || $x == 8) && ($y == 7 || $y == 8) || in_array([$x, $y], $robots));
	$robots[] = [$x, $y];
}

# drawn in style.css's board pixels at $u times, three times the size it ends up at so the circles come out smooth
$u = 5;
$colors = [0xd2365d, 0x364d9c, 0xe6b13b, 0x6fca34, 0x888888];
$board = imagecreatetruecolor(324 * $u, 324 * $u); # starts black, which stays as the border
$rect = fn($color, $left, $top, $width, $height) => imagefilledrectangle($board, $left * $u, $top * $u, ($left + $width) * $u - 1, ($top + $height) * $u - 1, $color);
foreach ($walls as $x => $column) foreach ($column as $y => $sides)
{
	$left = 2 + 20 * $x;
	$top = 2 + 20 * $y;
	$rect(0xaaaaaa, $left, $top, 20, 20);
	$rect(($x == 7 || $x == 8) && ($y == 7 || $y == 8) ? 0x000000 : 0xeeeeee, $left + 1, $top + 1, 18, 18);
	foreach (array_filter($sides) as $dir => $side) { $rect(0x000000, ...[[$left, $top, 20, 2], [$left, $top, 2, 20], [$left, $top + 18, 20, 2], [$left + 18, $top, 2, 20]][$dir]); }
}
[$x, $y, $color] = $target;
if ($color == 4) # the any-robot target: a pie of all five colours from the top, as .target.black in style.css, clipped to the square
{
	imagesetclip($board, (3 + 20 * $x) * $u, (3 + 20 * $y) * $u, (21 + 20 * $x) * $u - 1, (21 + 20 * $y) * $u - 1);
	foreach ($colors as $i => $c) { imagefilledarc($board, (12 + 20 * $x) * $u, (12 + 20 * $y) * $u, 26 * $u, 26 * $u, 72 * $i - 90, 72 * $i - 18, $c, IMG_ARC_PIE); }
	imagesetclip($board, 0, 0, 324 * $u - 1, 324 * $u - 1);
}
else $rect($colors[$color], 3 + 20 * $x, 3 + 20 * $y, 18, 18);
$star = [];
for ($i = 0; $i < 10; $i++)
{
	$star[] = (12 + 20 * $x + ($i % 2 ? 2.3 : 6) * sin($i * M_PI / 5)) * $u;
	$star[] = (12 + 20 * $y - ($i % 2 ? 2.3 : 6) * cos($i * M_PI / 5)) * $u;
}
imagefilledpolygon($board, $star, 0xffffff);
$font = __DIR__.'/../fonts/SourceSansPro-Bold.otf';
foreach ($robots as $i => [$x, $y])
{
	imagefilledellipse($board, (12 + 20 * $x) * $u, (12 + 20 * $y) * $u, 16 * $u, 16 * $u, $colors[$i]);
	$box = imagettfbbox(9 * $u, 0, $font, $i + 1);
	imagettftext($board, 9 * $u, 0, (int)((12 + 20 * $x) * $u - ($box[0] + $box[2]) / 2), (int)((12 + 20 * $y) * $u - ($box[1] + $box[7]) / 2),
		0xffffff, $font, $i + 1);
}

# 1200x628 is the ratio link previews crop to
$image = imagecreatetruecolor(1200, 628);
imagefill($image, 0, 0, 0xffffff);
imagecopyresampled($image, $board, 330, 44, 0, 0, 540, 540, 324 * $u, 324 * $u);

header('Content-Type: image/png');
header('Cache-Control: public, max-age=86400');
imagepng($image);
