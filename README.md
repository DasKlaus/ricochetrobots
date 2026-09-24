# Ricochet Robots

A multiplayer board game implementation
* [Game](https://www.boardgameprices.com/prices/ricochetrobot) can be bought here
* [Rules](https://www.zmangames.com/en/products/ricochet-robots/) can be downloaded here
* [Singleplayer](http://www.robotreboot.com/challenge) with highscores can be played here
* [Play](http://wollmilchmedien.com/ricochetrobots/) this (unfinished) implementation here

## Setup

* put everything on a server
* create the game database from `schema.sql` and the shared identity database from `identity.sql`
* enter the mysql credentials in `config.php` and in `identity.php`
* the puzzle of the day's address `daily` needs Apache's mod_rewrite (`ricochetrobots/.htaccess`)
* put a `.user.ini` above the document root switching `display_errors` off and `log_errors` on, with
  `error_log` pointing outside the document root — `config.php` runs too late to catch a parse error

## Play

Pick a name on the profile page, then start a game or join one by its code. The code is also the URL, so sharing the link invites others.
Once someone finds a solution, the round ends 60 seconds later: the shortest solution wins the target, the earlier one among equals, and the robots stay where it left them. After 17 targets the game is over. If the connection to the server drops, the game continues alone.
In a game, the round is displayed at the upper right, the countdown after a solution is found at the upper left corner. The left square shows the map, the right one your solutions - the one in progress at the bottom, all solutions found so far in the middle, and the round's best one at the top, as question marks if it isn't yours.

### with mouse

* hover over a robot to show its moves
* click on a robot to activate it
* click on the ghost robots showing possible end positions of a move to move it
* click an empty tile to deactivate the robot
* click the rewind buttons at the down right corner of the solution window to undo a turn or start over

### with keyboard

* numbers 1 to 5 activate the robots, 0 deactivates them again
* arrow keys move the active robot
* backspace to undo the last turn
* escape to start over

## Puzzle of the day

A new board with five targets every day at `daily`, the same for everyone: one target of each colour, the grey one last.
A target's first solution counts, and the robots stay where it left them. Two more buttons in the solution window undo the last target or all of them, also after the fifth, which is how a finished run is retried. The clock runs from first opening the puzzle; visitors without a name see the rules first, and their clock starts when they close them.
A finished run is saved under a name. Guests are asked for one at the end, and without it the run lasts only for the session. A later run replaces the saved one if it needs fewer moves, its time still counted from the first opening. The newest run is the one shown; where it needed more moves than the saved one, a button switches between the two.
The result is a plain-text share line with a copy button: moves per target, the total, the time and, from two days in a row on, the streak.

## Notes

The board is derived from the six-letter game code, so the server stores solutions and nothing else about a board. The puzzle of the day's board is derived from the date, and only finished runs reach the server. Data gets stored, received and sent in json format.

## People

* **Alex Randolph** designed the original board game
* **Klaus Hilgenfelder** made this implementation
