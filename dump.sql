-- phpMyAdmin SQL Dump
-- version 4.3.12
-- http://www.phpmyadmin.net
--
-- Host: localhost:3306
-- Erstellungszeit: 14. Mai 2018 um 23:47
-- Server-Version: 10.1.26-MariaDB-1~wheezy
-- PHP-Version: 5.6.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Datenbank: `DasKlaussql20`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `games`
--

CREATE TABLE IF NOT EXISTS `games` (
  `room` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `json` text CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Daten für Tabelle `games`
--

INSERT INTO `games` (`room`, `json`, `time`) VALUES
('?', '{"robots":[{"x":0,"y":6,"color":0},{"x":14,"y":12,"color":1},{"x":6,"y":12,"color":2},{"x":0,"y":8,"color":3},{"x":10,"y":2,"color":4}],"pieces":[0,9,7,5],"seed":"9360856403494700","round":0,"solved":1526334084302}', '2018-05-14 21:40:39');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `players`
--

CREATE TABLE IF NOT EXISTS `players` (
  `sessionid` varchar(255) COLLATE utf8_bin NOT NULL,
  `name` varchar(255) COLLATE utf8_bin NOT NULL,
  `room` varchar(255) COLLATE utf8_bin NOT NULL,
  `json` text COLLATE utf8_bin NOT NULL,
  `time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Daten für Tabelle `players`
--

INSERT INTO `players` (`sessionid`, `name`, `room`, `json`, `time`) VALUES
('ac9954f55d9567f2af5bf5dccd7e78eb', 'Gast', '?', '{"name":"Gast","targets":0,"points":0,"round":0,"solution":{"0":{"color":3,"dir":2},"1":{"color":1,"dir":1},"2":{"color":1,"dir":0},"3":{"color":1,"dir":1},"4":{"color":4,"dir":1},"5":{"color":4,"dir":2},"6":{"color":1,"dir":0},"7":{"color":1,"dir":1},"8":{"color":1,"dir":2},"9":{"color":1,"dir":3},"length":10}}', '2018-05-14 21:42:37');

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `games`
--
ALTER TABLE `games`
  ADD UNIQUE KEY `room` (`room`);

--
-- Indizes für die Tabelle `players`
--
ALTER TABLE `players`
  ADD UNIQUE KEY `sessionid` (`sessionid`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
