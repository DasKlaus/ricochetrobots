DROP TABLE IF EXISTS `games`, `players`;

DROP TABLE IF EXISTS `solution`;
DROP TABLE IF EXISTS `player`;
DROP TABLE IF EXISTS `game`;

CREATE TABLE `game` (
	`seed` varchar(8) NOT NULL,
	`round` int(10) NOT NULL DEFAULT 0,
	`version` int(10) NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	PRIMARY KEY (`seed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `player` (
	`seed` varchar(8) NOT NULL,
	`user_id` bigint(20) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`joined_at` datetime NOT NULL,
	PRIMARY KEY (`seed`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `solution` (
	`id` bigint(20) NOT NULL AUTO_INCREMENT,
	`seed` varchar(8) NOT NULL,
	`round` int(10) NOT NULL,
	`user_id` bigint(20) NOT NULL,
	`moves` json NOT NULL,
	`length` int(10) NOT NULL,
	`created_at` datetime NOT NULL,
	PRIMARY KEY (`id`),
	KEY `game_round` (`seed`, `round`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
