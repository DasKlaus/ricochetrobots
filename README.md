# Ricochet Robots

A multiplayer board game implementation
* [Game](https://www.boardgameprices.com/prices/ricochetrobot) can be bought here
* [Rules](https://www.zmangames.com/en/products/ricochet-robots/) can be downloaded here
* [Singleplayer](http://www.robotreboot.com/challenge) with highscores can be played here

## Setup

* put everything on a server
* create database from dump
* update path variable in the script tag of html file (path to your server)
* enter mysql credentials in php file

## Play

If you have no network connection to the ajax, you'll start a singleplayer game instantly, otherwise you'll start in the lobby, where you can pick a name, wait for players displayed at the bottom and start a game (you can start one alone at any time, too). If another client is already in a game, you'll enter that one.
In a game, your score is displayed at the upper right, the countdown after a solution is found at the upper left corner. The left square shows the map, the right one your solutions - the one in progress at the bottom, the best one at the top, and all solutions found so far in the middle.

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

## Notes

The php and database can be re-used for just about any real-time multiplayer board game. Data gets stored, received and sent in json format.

## People

* **Alex Randolph** designed the original board game
* **Klaus Hilgenfelder** made this implementation
