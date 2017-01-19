/**
 * This is the file where the bot commands are located
 *
 * @license MIT license
 */

/*
Problem is if you want to add monsters for pve youll have to create a "monsters" object in the squad.json
Ie. Every single squad json file lol
Then rewrite whatever the current addmonster command does ao that it adds it to the monster object in the squad json
Then make the map function look at the monster object and write over the map tile
Likewise for adding the ability to change tiles, like for windwallll or ice wall
Youllll have to edit the map referenced and change the colour code

Well just look at the add player command
just copy addplayer and make sure the monsters exist
And write it so that it pulls from a monster database instead of the player database
Problem with that is you have to make all monsters have unique names
But unique in the sense that zephyrkite1 and zephyrkite2 will suffice
*/

//%custom [battledome] /addhtmlbox <html><body><p style=background-color:#A9F5A9>One</p><p style=background-color:#81F781>Two</p><p style=background-color:#BCF5A9>Three</p><body>
//[11:28] MMM ☾: normal: #a9f5a9 | lava: #8b0000 | wind wall: #93ccea | ice wall: #57d3ee | stop: #a9a9a9 | sticky: #cccc00
var http = require('http');

// Things
var ref = require('origindb')('reference');
var mailbox = require('origindb')('mailbox');
var players = require('origindb')('players');
var monsters = require('origindb')('monsters');
var weapon = require('origindb')('weapon');
var sect = require('origindb')('sect');
var group = require('origindb')('group');
var maps = require('origindb')('maps');
var BDcom = require('Wonto/BDcom');
var Create = require('Wonto/Create');
var CreatePvE = require('Wonto/CreatePvE');
var clearance = ['aelita','asthmeresivolisk','pancake','galom','formerhope','microwavable','mmm','taistelu','felzauber','henka','hirl123','moq','rssp1','lucyheartfillia','kingm0b'];
var tcgclearance = ['mmm','lightningvikavolt','pacificpopplio'];
var publicroom = ['competitivetutoring','mafia','pokemongo','cafelewow'];
var lastgen = '';
var cuddle = true;

if (Config.serverid === 'showdown') {
	var https = require('https');
	var csv = require('csv-parse');
}

// .set constants
const CONFIGURABLE_COMMANDS = {
	autoban: true,
	banword: true,
	say: true,
	joke: true,
	usagestats: true,
	'8ball': true,
	guia: true,
	studio: true,
	wifi: true,
	monotype: true,
	survivor: true,
	happy: true,
	buzz: true
};

const CONFIGURABLE_MODERATION_OPTIONS = {
	flooding: true,
	caps: true,
	stretching: true,
	bannedwords: true
};

const CONFIGURABLE_COMMAND_LEVELS = {
	off: false,
	disable: false,
	'false': false,
	on: true,
	enable: true,
	'true': true
};

for (let i in Config.groups) {
	if (i !== ' ') CONFIGURABLE_COMMAND_LEVELS[i] = i;
}

exports.commands = {
	/**
	 * Help commands
	 *
	 * These commands are here to provide information about the bot.
	 */

	credits: 'about',
	about: function (arg, user, room) {
		var text = (room === user || user.hasRank(room.id, '#')) ? '' : '/pm ' + user.id + ', ';
		text += 'A thing made by Wonto, with help from Lux (Lucario), Hawkie, and sparkychild, that is maintained by MMM ☾ / Taistelu / Asth / Convalesce. (Bot Base by: Quinella, TalkTakesTime, and Morfent)';
		this.say(room, text);
	},
	git: function (arg, user, room) {
		var text = (room === user || user.isExcepted()) ? '' : '/pm ' + user.id + ', ';
		text += '**Ice Kyubs** source code: ' + Config.fork;
		this.say(room, text);
	},
	help: 'guide',
	guide: function (arg, user, room) {
		var text = (room === user || user.hasRank(room.id, '%'))  ? '' : '/pm ' + user.id + ', ';
		if (Config.botguide) {
			text += 'A list of commands for this bot can be found here: ' + Config.botguide;
		} else {
			text += 'There is no guide for this bot. PM the owner with any questions.';
		}
		this.say(room, text);
	},

	/**
	 * Dev commands
	 *
	 * These commands are here for highly ranked users (or the creator) to use
	 * to perform arbitrary actions that can't be done through any other commands
	 * or to help with upkeep of the bot.
	 */

	reload: function (arg, user, room) {
		if (!user.isExcepted()) return false;
		try {
			this.uncacheTree('./commands.js');
			Commands = require('./commands.js').commands;
			this.say(room, 'Commands reloaded.');
		} catch (e) {
			error('failed to reload: ' + e.stack);
		}
	},
	c: 'custom',
	custom: function (arg, user, room) {
		if (!user.isExcepted()) return false;
		// Custom commands can be executed in an arbitrary room using the syntax
		// ".custom [room] command", e.g., to do !data pikachu in the room lobby,
		// the command would be ".custom [lobby] !data pikachu". However, using
		// "[" and "]" in the custom command to be executed can mess this up, so
		// be careful with them.
		if (arg.indexOf('[') !== 0 || arg.indexOf(']') < 0) {
			return this.say(room, arg);
		}
		var tarRoomid = arg.slice(1, arg.indexOf(']'));
		var tarRoom = Rooms.get(tarRoomid);
		if (!tarRoom) return this.say(room, Users.self.name + ' is not in room ' + tarRoomid + '!');
		arg = arg.substr(arg.indexOf(']') + 1).trim();
		this.say(tarRoom, arg);
	},
	js: function (arg, user, room) {
		if (!user.isExcepted()) return false;
		try {
			let result = eval(arg.trim());
			this.say(room, JSON.stringify(result));
		} catch (e) {
			this.say(room, e.name + ": " + e.message);
		}
	},
	math: function (arg, user, room) {
		var result = eval(arg.trim());
		if (result === Number()) return result;
	},
	uptime: function (arg, user, room) {
		var text = ((room === user || user.isExcepted()) ? '' : '/pm ' + user.id + ', ') + '**Uptime:** ';
		var divisors = [52, 7, 24, 60, 60];
		var units = ['week', 'day', 'hour', 'minute', 'second'];
		var buffer = [];
		var uptime = ~~(process.uptime());
		do {
			let divisor = divisors.pop();
			let unit = uptime % divisor;
			buffer.push(unit > 1 ? unit + ' ' + units.pop() + 's' : unit + ' ' + units.pop());
			uptime = ~~(uptime / divisor);
		} while (uptime);

		switch (buffer.length) {
		case 5:
			text += buffer[4] + ', ';
			/* falls through */
		case 4:
			text += buffer[3] + ', ';
			/* falls through */
		case 3:
			text += buffer[2] + ', ' + buffer[1] + ', and ' + buffer[0];
			break;
		case 2:
			text += buffer[1] + ' and ' + buffer[0];
			break;
		case 1:
			text += buffer[0];
			break;
		}

		this.say(room, text);
	}, 


	/**
	 * Room Owner commands
	 *
	 * These commands allow room owners to personalise settings for moderation and command use.
	 */

	settings: 'set',
	set: function (arg, user, room) {
		if (room === user || !user.hasRank(room.id, '@')) return false;

		var opts = arg.split(',');
		var cmd = toId(opts[0]);
		var roomid = room.id;
		if (cmd === 'm' || cmd === 'mod' || cmd === 'modding') {
			let modOpt;
			if (!opts[1] || !CONFIGURABLE_MODERATION_OPTIONS[(modOpt = toId(opts[1]))]) {
				return this.say(room, 'Incorrect command: correct syntax is ' + Config.commandcharacter + 'set mod, [' +
					Object.keys(CONFIGURABLE_MODERATION_OPTIONS).join('/') + '](, [on/off])');
			}
			if (!opts[2]) return this.say(room, 'Moderation for ' + modOpt + ' in this room is currently ' +
				(this.settings.modding && this.settings.modding[roomid] && modOpt in this.settings.modding[roomid] ? 'OFF' : 'ON') + '.');

			if (!this.settings.modding) this.settings.modding = {};
			if (!this.settings.modding[roomid]) this.settings.modding[roomid] = {};

			let setting = toId(opts[2]);
			if (setting === 'on') {
				delete this.settings.modding[roomid][modOpt];
				if (Object.isEmpty(this.settings.modding[roomid])) delete this.settings.modding[roomid];
				if (Object.isEmpty(this.settings.modding)) delete this.settings.modding;
			} else if (setting === 'off') {
				this.settings.modding[roomid][modOpt] = 0;
			} else {
				return this.say(room, 'Incorrect command: correct syntax is ' + Config.commandcharacter + 'set mod, [' +
					Object.keys(CONFIGURABLE_MODERATION_OPTIONS).join('/') + '](, [on/off])');
			}

			this.writeSettings();
			return this.say(room, 'Moderation for ' + modOpt + ' in this room is now ' + setting.toUpperCase() + '.');
		}

		if (!(cmd in Commands)) return this.say(room, Config.commandcharacter + '' + opts[0] + ' is not a valid command.');

		var failsafe = 0;
		while (true) {
			if (typeof Commands[cmd] === 'string') {
				cmd = Commands[cmd];
			} else if (typeof Commands[cmd] === 'function') {
				if (cmd in CONFIGURABLE_COMMANDS) break;
				return this.say(room, 'The settings for ' + Config.commandcharacter + '' + opts[0] + ' cannot be changed.');
			} else {
				return this.say(room, 'Something went wrong. PM Morfent or TalkTakesTime here or on Smogon with the command you tried.');
			}

			if (++failsafe > 5) return this.say(room, 'The command "' + Config.commandcharacter + '' + opts[0] + '" could not be found.');
		}

		if (!opts[1]) {
			let msg = '' + Config.commandcharacter + '' + cmd + ' is ';
			if (!this.settings[cmd] || (!(roomid in this.settings[cmd]))) {
				msg += 'available for users of rank ' + ((cmd === 'autoban' || cmd === 'banword') ? '#' : Config.defaultrank) + ' and above.';
			} else if (this.settings[cmd][roomid] in CONFIGURABLE_COMMAND_LEVELS) {
				msg += 'available for users of rank ' + this.settings[cmd][roomid] + ' and above.';
			} else {
				msg += this.settings[cmd][roomid] ? 'available for all users in this room.' : 'not available for use in this room.';
			}

			return this.say(room, msg);
		}

		let setting = opts[1].trim();
		if (!(setting in CONFIGURABLE_COMMAND_LEVELS)) return this.say(room, 'Unknown option: "' + setting + '". Valid settings are: off/disable/false, +, %, @, #, &, ~, on/enable/true.');
		if (!this.settings[cmd]) this.settings[cmd] = {};
		this.settings[cmd][roomid] = CONFIGURABLE_COMMAND_LEVELS[setting];

		this.writeSettings();
		this.say(room, 'The command ' + Config.commandcharacter + '' + cmd + ' is now ' +
			(CONFIGURABLE_COMMAND_LEVELS[setting] === setting ? ' available for users of rank ' + setting + ' and above.' :
			(this.settings[cmd][roomid] ? 'available for all users in this room.' : 'unavailable for use in this room.')));
	},
	blacklist: 'autoban',
	ban: 'autoban',
	ab: 'autoban',
	autoban: function (arg, user, room) {
		if (room === user /*|| !user.canUse('autoban', room.id)*/ || !user.hasRank(room.id, '@')) return false;
		if (!Users.self.hasRank(room.id, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!toId(arg)) return this.say(room, 'You must specify at least one user to blacklist.');

		arg = arg.split(',');
		var added = [];
		var illegalNick = [];
		var alreadyAdded = [];
		var roomid = room.id;
		for (let u of arg) {
			let tarUser = toId(u);
			if (!tarUser || tarUser.length > 18) {
				illegalNick.push(tarUser);
			} else if (!this.blacklistUser(tarUser, roomid)) {
				alreadyAdded.push(tarUser);
			} else {
				added.push(tarUser);
				this.say(room, '/roomban ' + tarUser + ', Blacklisted user');
			}
		}

		var text = '';
		if (added.length) {
			text += 'User' + (added.length > 1 ? 's "' + added.join('", "') + '" were' : ' "' + added[0] + '" was') + ' added to the blacklist.';
			this.say(room, '/modnote ' + text + ' by ' + user.name + '.');
			this.writeSettings();
		}
		if (alreadyAdded.length) {
			text += ' User' + (alreadyAdded.length > 1 ? 's "' + alreadyAdded.join('", "') + '" are' : ' "' + alreadyAdded[0] + '" is') + ' already present in the blacklist.';
		}
		if (illegalNick.length) text += (text ? ' All other' : 'All') + ' users had illegal nicks and were not blacklisted.';
		this.say(room, text);
	},
	unblacklist: 'unautoban',
	unban: 'unautoban',
	unab: 'unautoban',
	unautoban: function (arg, user, room) {
		if (room === user /*|| !user.canUse('autoban', room.id)*/ || !user.hasRank(room.id, '@')) return false;
		if (!Users.self.hasRank(room.id, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!toId(arg)) return this.say(room, 'You must specify at least one user to unblacklist.');

		arg = arg.split(',');
		var removed = [];
		var notRemoved = [];
		var roomid = room.id;
		for (let u of arg) {
			let tarUser = toId(u);
			if (!tarUser || tarUser.length > 18) {
				notRemoved.push(tarUser);
			} else if (!this.unblacklistUser(tarUser, roomid)) {
				notRemoved.push(tarUser);
			} else {
				removed.push(tarUser);
				this.say(room, '/roomunban ' + tarUser);
			}
		}

		var text = '';
		if (removed.length) {
			text += ' User' + (removed.length > 1 ? 's "' + removed.join('", "') + '" were' : ' "' + removed[0] + '" was') + ' removed from the blacklist';
			this.say(room, '/modnote ' + text + ' by user ' + user.name + '.');
			this.writeSettings();
		}
		if (notRemoved.length) text += (text.length ? ' No other' : 'No') + ' specified users were present in the blacklist.';
		this.say(room, text);
	},
	/*rab: 'regexautoban',
	regexautoban: function (arg, user, room) {
		if (room === user || !user.isRegexWhitelisted() || !user.canUse('autoban', room.id)) return false;
		if (!Users.self.hasRank(room.id, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!arg) return this.say(room, 'You must specify a regular expression to (un)blacklist.');

		try {
			new RegExp(arg, 'i');
		} catch (e) {
			return this.say(room, e.message);
		}

		if (/^(?:(?:\.+|[a-z0-9]|\\[a-z0-9SbB])(?![a-z0-9\.\\])(?:\*|\{\d+\,(?:\d+)?\}))+$/i.test(arg)) {
			return this.say(room, 'Regular expression /' + arg + '/i cannot be added to the blacklist. Don\'t be Machiavellian!');
		}

		var regex = '/' + arg + '/i';
		if (!this.blacklistUser(regex, room.id)) return this.say(room, '/' + regex + ' is already present in the blacklist.');

		var regexObj = new RegExp(arg, 'i');
		var users = room.users.entries();
		var groups = Config.groups;
		var selfid = Users.self.id;
		var selfidx = groups[room.users.get(selfid)];
		for (let u of users) {
			let userid = u[0];
			if (userid !== selfid && regexObj.test(userid) && groups[u[1]] < selfidx) {
				this.say(room, '/roomban ' + userid + ', Blacklisted user');
			}
		}

		this.writeSettings();
		this.say(room, '/modnote Regular expression ' + regex + ' was added to the blacklist by user ' + user.name + '.');
		this.say(room, 'Regular expression ' + regex + ' was added to the blacklist.');
	},
	unrab: 'unregexautoban',
	unregexautoban: function (arg, user, room) {
		if (room === user || !user.isRegexWhitelisted() || !user.canUse('autoban', room.id)) return false;
		if (!Users.self.hasRank(room.id, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!arg) return this.say(room, 'You must specify a regular expression to (un)blacklist.');

		arg = '/' + arg.replace(/\\\\/g, '\\') + '/i';
		if (!this.unblacklistUser(arg, room.id)) return this.say(room, '/' + arg + ' is not present in the blacklist.');

		this.writeSettings();
		this.say(room, '/modnote Regular expression ' + arg + ' was removed from the blacklist user by ' + user.name + '.');
		this.say(room, 'Regular expression ' + arg + ' was removed from the blacklist.');
	},*/
	viewbans: 'viewblacklist',
	vab: 'viewblacklist',
	viewautobans: 'viewblacklist',
	viewblacklist: function (arg, user, room) {
		if (room === user || !user.canUse('autoban', room.id)) return false;

		var text = '/pm ' + user.id + ', ';
		if (!this.settings.blacklist) return this.say(room, text + 'No users are blacklisted in this room.');

		var roomid = room.id;
		var blacklist = this.settings.blacklist[roomid];
		if (!blacklist) return this.say(room, text + 'No users are blacklisted in this room.');

		if (!arg.length) {
			let userlist = Object.keys(blacklist);
			if (!userlist.length) return this.say(room, text + 'No users are blacklisted in this room.');
			return this.uploadToHastebin('The following users are banned from ' + roomid + ':\n\n' + userlist.join('\n'), function (link) {
				if (link.startsWith('Error')) return this.say(room, text + link);
				this.say(room, text + 'Blacklist for room ' + roomid + ': ' + link);
			}.bind(this));
		}

		var nick = toId(arg);
		if (!nick || nick.length > 18) {
			text += 'Invalid username: "' + nick + '".';
		} else {
			text += 'User "' + nick + '" is currently ' + (blacklist[nick] || 'not ') + 'blacklisted in ' + roomid + '.';
		}
		this.say(room, text);
	},
	banphrase: 'banword',
	banword: function (arg, user, room) {
		arg = arg.trim().toLowerCase();
		if (!arg) return false;

		var tarRoom = room.id;
		if (room === user) {
			if (!user.isExcepted()) return false;
			tarRoom = 'global';
		} else if (user.canUse('banword', room.id)) {
			tarRoom = room.id;
		} else {
			return false;
		}

		var bannedPhrases = this.settings.bannedphrases ? this.settings.bannedphrases[tarRoom] : null;
		if (!bannedPhrases) {
			if (bannedPhrases === null) this.settings.bannedphrases = {};
			bannedPhrases = (this.settings.bannedphrases[tarRoom] = {});
		} else if (bannedPhrases[arg]) {
			return this.say(room, 'Phrase "' + arg + '" is already banned.');
		}
		bannedPhrases[arg] = 1;

		this.writeSettings();
		this.say(room, 'Phrase "' + arg + '" is now banned.');
	},
	unbanphrase: 'unbanword',
	unbanword: function (arg, user, room) {
		var tarRoom;
		if (room === user) {
			if (!user.isExcepted()) return false;
			tarRoom = 'global';
		} else if (user.canUse('banword', room.id)) {
			tarRoom = room.id;
		} else {
			return false;
		}

		arg = arg.trim().toLowerCase();
		if (!arg) return false;
		if (!this.settings.bannedphrases) return this.say(room, 'Phrase "' + arg + '" is not currently banned.');

		var bannedPhrases = this.settings.bannedphrases[tarRoom];
		if (!bannedPhrases || !bannedPhrases[arg]) return this.say(room, 'Phrase "' + arg + '" is not currently banned.');

		delete bannedPhrases[arg];
		if (Object.isEmpty(bannedPhrases)) {
			delete this.settings.bannedphrases[tarRoom];
			if (Object.isEmpty(this.settings.bannedphrases)) delete this.settings.bannedphrases;
		}

		this.writeSettings();
		this.say(room, 'Phrase "' + arg + '" is no longer banned.');
	},
	viewbannedphrases: 'viewbannedwords',
	vbw: 'viewbannedwords',
	viewbannedwords: function (arg, user, room) {
		var tarRoom = room.id;
		var text = '';
		var bannedFrom = '';
		if (room === user) {
			if (!user.isExcepted()) return false;
			tarRoom = 'global';
			bannedFrom += 'globally';
		} else if (user.canUse('banword', room.id)) {
			text += '/pm ' + user.id + ', ';
			bannedFrom += 'in ' + room.id;
		} else {
			return false;
		}

		if (!this.settings.bannedphrases) return this.say(room, text + 'No phrases are banned in this room.');
		var bannedPhrases = this.settings.bannedphrases[tarRoom];
		if (!bannedPhrases) return this.say(room, text + 'No phrases are banned in this room.');

		if (arg.length) {
			text += 'The phrase "' + arg + '" is currently ' + (bannedPhrases[arg] || 'not ') + 'banned ' + bannedFrom + '.';
			return this.say(room, text);
		}

		var banList = Object.keys(bannedPhrases);
		if (!banList.length) return this.say(room, text + 'No phrases are banned in this room.');

		this.uploadToHastebin('The following phrases are banned ' + bannedFrom + ':\n\n' + banList.join('\n'), function (link) {
			if (link.startsWith('Error')) return this.say(room, link);
			this.say(room, text + 'Banned phrases ' + bannedFrom + ': ' + link);
		}.bind(this));
	},
	
	seen: function (arg, user, room) { // this command is still a bit buggy
		var text = (room === user ? '' : '/pm ' + user.id + ', ');
		arg = toId(arg);
		if (!arg || arg.length > 18) return this.say(room, text + 'Invalid username.');
		if (arg === user.id) {
			text += 'Have you looked in the mirror lately?';
		} else if (arg === Users.self.id) {
			text += 'You might be either blind or illiterate. Might want to get that checked out.';
		} else if (!this.chatData[arg] || !this.chatData[arg].seenAt) {
			text += 'The user ' + arg + ' has never been seen.';
		} else {
			text += arg + ' was last seen ' + this.getTimeAgo(this.chatData[arg].seenAt) + ' ago' + (
				this.chatData[arg].lastSeen ? ', ' + this.chatData[arg].lastSeen : '.');
		}
		this.say(room, text);
	},

	/**
	 * General commands
	 *
	 * Add custom commands here.
	 */
	 mb: 'mailban',
	 mailban: function(arg, user, room){
	 	if (!user.hasRank(room.id, '#')) return false;
	 	if (arg === undefined || arg === ''){
	 		return this.say(room, "Please enter a user to mailban.");
	 	}
	 	var check1 = '';//if mailbanned
	 	var check2 = '';//if empty slot
	 	var slot = '';
	 	var pass = toId(arg);
	 	var obj = mailbox('banlist').get('banlist');
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			if (obj[key] == pass){
	 				check1 = 'Found';
	 			}
	 			if (obj[key] == ''){
	 				check2 = 'Found';
	 				if (slot === ''){
	 					slot = key;
	 				}
	 			}
	 		}
	 	}
	 	if (check1 === 'Found'){
	 		return this.say(room, "User " + arg + " is already mailbanned.");
	 	}
	 	if (check2 === 'Found'){
	 		obj[slot] = pass;
	 	}
	 	else{
	 		slot = Object.keys(obj).length;
	 		obj[slot] = pass;
	 	}
	 	mailbox('banlist').set('banlist', obj);
	 	this.say(room, "User " + arg + " has been mailbanned.");
	 },
	 unmb: 'unmailban',
	 unmailban: function(arg, user, room){
	 	if (!user.hasRank(room.id, '#')) return false;
	 	if (arg === undefined || arg === ''){
	 		return this.say(room, "Please enter a user to unmailban.");
	 	}
	 	var check = '';
	 	var pass = toId(arg);
	 	var obj = mailbox('banlist').get('banlist');
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			if (obj[key] == pass){
	 				obj[key] = '';
	 				check = 'Found';
	 			}
	 		}
	 		if (check === 'Found'){
	 			break;
	 		}
	 	}
	 	mailbox('banlist').set('banlist', obj);
	 	if (check === 'Found'){
	 		return this.say(room, "User " + arg + " has been unmailbanned.");
	 	}
	 	else{
	 		return this.say(room, "Unable to find " + arg + " in the mail banlist.");
	 	}
	 },
	 mail: function(arg, user, room){
	 	var text = ((room === user || user.isExcepted()) ? '' : '/pm ' + user.id + ', ');
	 	var check = '';
	 	var banlist = mailbox('banlist').get('banlist');
	 	for (var key1 in banlist){
	 		if (banlist.hasOwnProperty){
	 			if (banlist[key1] === user.id){
	 				return this.say(room, text + "You are currently banned from use %mail.");
	 			}
	 		}
	 	}
	 	var args = arg.split(',');
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, text + "The correct format is %mail [user], [message]");
	 	}
	 	else if (toId(args[0]).length > 18){
	 		return this.say(room, text + "The correct format is %mail [user], [message]");
	 	}
	 	else if (toId(args[0]) === "icekyubs"){
	 		return this.say(room, text + "Please don't try mailing the bot.");
	 	}
	 	if (args.length < 2){
	 		return this.say(room, text + "Please enter a message to send.");
	 	}
	 	var message = '';
	 	if (args.length > 2){
	 		message = args[1];
	 		for (var n = 2; n < args.length; n++){
	 			message += ',' + args[n];
	 		}
		}
		else{
			message = args[1];
		}
	 	message += " ~" + user.name;
	 	if (message.length > 270){
	 		return this.say(room, text + "Your message is too long.");
	 	}
	 	var pass = toId(args[0]);
	 	var nom = mailbox(toId(args[0])).get('nom');
	 	if (nom === undefined){
	 		mailbox(pass).set('nom', pass);
	 		mailbox(pass).set('messages', {0: '', 1: '',2: '', 3: '',4: '', 5: '',6: '', 7: '',8: '', 9: ''});
	 	}
	 	var obj = mailbox(pass).get('messages');
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			if (obj[key] === ''){
	 				obj[key] = message;
	 				check = 'Found';
	 			}
	 		}
	 		if (check === 'Found'){
	 			break;
	 		}
	 	}
	 	if (check === 'Found'){
	 		mailbox(pass).set('messages', obj);
	 		var maillog = mailbox('maillog').get('list');
	 		var slot = Object.keys(maillog).length;
	 		var now = new Date();
	 		maillog[slot] = "To: " + pass + " || " + message + " | Date: " + now;
	 		mailbox('maillog').set('list', maillog);
	 		return this.say(room, text + "Your message has been sent.");
	 	}
	 	else if (check === ''){
	 		return this.say(room, text + "The user's mailbox is full!");
	 	}
	 },
	 checkmail: function(arg, user, room){
	 	var text = ((room === user || user.isExcepted()) ? '' : '/pm ' + user.id + ', ');
	 	var nom = mailbox(user.id).get('nom');
	 	if (nom === undefined || nom === ''){
	 		mailbox(user.id).set('nom', user.id);
	 		mailbox(user.id).set('messages', {0: '', 1: '',2: '', 3: '',4: '', 5: '',6: '', 7: '',8: '', 9: ''});
	 		return this.say(room, text + "You have no messages.");
	 	}
	 	else{
	 		var obj = mailbox(user.id).get('messages');
	 		var count = 0;
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				if (obj[key] !== ''){
	 					count++;
	 				}
	 			}
	 		}
	 		if (count === 0){
	 			return this.say(room, text + "You have no messages.");
	 		}
	 		else{
	 			return this.say(room, text + "You have ``" + count + "`` messages. Please use %readmail to read the first message.");
	 		}
	 	}
	 },
	 readmail: function(arg, user, room){
	 	var text = ((room === user || user.isExcepted()) ? '' : '/pm ' + user.id + ', ');
	 	var nom = mailbox(user.id).get('nom');
	 	if (nom === undefined || nom === ''){
	 		mailbox(user.id).set('nom', user.id);
	 		mailbox(user.id).set('messages', {0: '', 1: '',2: '', 3: '',4: '', 5: '',6: '', 7: '',8: '', 9: ''});
	 		return this.say(room, text + "You have no messages.");
	 	}
	 	else{
	 		var obj = mailbox(user.id).get('messages');
	 		var check = '';
	 		var message = '';
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				if (obj[key] !== ''){
	 					message = obj[key];
	 					obj[key] = '';
	 					check = 'Found';
	 				}
	 			}
	 			if (check === 'Found'){
	 				break;
	 			}
	 		}
	 		mailbox(user.id).set('messages', obj);
	 		if (check === 'Found'){
	 			var test = message[0] + message[1];
	 			if (test == ' /'){
	 				var output = ['.', message].join('');
		 			return this.say(room, text + output); 
	 			}
	 			else if (message[0] == '/'){
	 				var output = ['.', message].join('');
	 				return this.say(room, text + output);
	 			}
	 			return this.say(room, text + message);
	 		}
	 		else{
	 			return this.say(room, text + "You have no messages.");
	 		}
	 	}
	 },
	 rig: 'pick',
	 choose: 'pick',
	 pick: function (arg, user, room) {
	 	var preface = (room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ';
	 	if (arg === undefined || arg === '') return false;
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) !== -1){
	 		preface = '';
	 	}
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		preface = '/pm ' + user.id + ', ';
	 	}
	 	var choices = arg.split(",");
	 	choices = choices.filter(function (i) {return (toId(i) !== '');});
	 	if (choices.length < 2) return this.say(room, preface + "The correct format is %pick [choice1], [choice2], ...");
	 	var choice = choices[Math.floor(Math.random() * choices.length)];
	 	return this.say(room, preface + "**I randomly picked:** " + choice, 'pick');
	 },
	 
	 /*calculate: 'calc',
	 calc: function (arg, user, room) {
	 	var preface = (room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ';
	 	if (arg === undefined || arg === '') return false;
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) !== -1){
	 		preface = '';
	 	}
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		preface = '/pm ' + user.id + ', ';
	 	}
	 	
	 	return this.say(room, preface + "**Result: ** " + result);
	 },*/
	 
	 wut: 'whatis',
	 wt: 'whatis',
	 wtf: 'whatis',
	 whatis: function(arg, user, room){
	 	var preface = ((room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ');
	 	if (arg === undefined || arg === '') return false;
	 	var hostarray = group('host').get('array');
	 	if(hostarray.indexOf(user.id) !== -1){
	 		preface = '';
	 	}
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		preface = '/pm ' + user.id + ', ';
	 	}
	 	var text = '';
	 	var pass = toId(arg);
	 	var obj = ref('moves').get(pass);
	 	if (obj !== undefined){
			text += '``**' + obj['nom'] + ':**`` **' + obj['Level'] + '** | ``**Freq:**`` **' + obj['Frequency'] + '** | ``**Miss Rate:**`` **' + obj['Accuracy'] + '** | ``**Roll:**`` **' + obj['Roll'] + '** | ``' + obj['Type']+ '`` | ``' + obj['Target'] + '`` | __' + obj['Desc'] + '__';
			if (text.length > 299){
				var text2 = text.slice(text.indexOf('_'));
				text = text.slice(0,(text.indexOf('_') - 3));
				this.say(room, preface + text);
				this.say(room, preface + text2);
				return;
			}
			return this.say(room, preface + text);
	 	}
	 	else{
			obj = ref('text').get(pass);
			if (obj !== undefined){
				text += '__' + obj + '__';
				return this.say(room, preface + text);
	 		}
	 		else{
	 			var reply = ref('reply').get('whatis');
	 			var rdn = Math.floor(Math.random()*(Object.keys(reply).length));
	 			return this.say(room, preface + reply[rdn]);
	 		}
	 	}
	 },
	 rf: 'reference',
	 ref: 'reference',
	 reference: function(arg, user, room){
	 	var text = ((room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ');
	 	if (arg === undefined || arg === '') return false;
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) !== -1){
	 		text = '';
	 	}
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		text = '/pm ' + user.id + ', ';
	 	}
	 	var check = '';
	 	var pass = toId(arg);
	 	var obj = ref('links').get(pass);
	 	if (obj !== undefined){
	 		text += obj;
	 		return this.say(room, text);
	 	}
	 },
	 timer: 'starttimer',
 	 starttimer: function (arg, user, room) {
		if (room === user || room.id !== "battledome") return false;
		var hostarray = group('host').get('array');
		if (!user.hasRank(room.id, '+') && hostarray.indexOf(user.id) == -1) return false;
		if (this.buzzed) return this.say(room, "There is already a timer running.");
		if (isNaN(Number(arg))) return false;
		if (Number(arg) < 10){
			return this.say(room, "The minimum time is 10 seconds.");
		}
		if(Number(arg) > 2000){
			return this.say(room, "The maximum time is 2000 seconds.");
		}

		this.say(room, user.name + ' has set a timer for ' + arg + ' seconds.');
		this.buzzed = user;
		this.buzzer = setTimeout(function (room, buzzMessage) {
			this.say(room, buzzMessage);
			this.buzzed = '';
		}.bind(this), Number(arg) * 1000, room, 'Time is up!');
	 },
	 stop: 'stoptimer',
	 stoptimer: function (arg, user, room) {
	 	if (isNaN(Number(arg))) return false;
		if (!this.buzzed || room === user || room.id !== "battledome") return false;
		var hostarray = group('host').get('array');
		if (!user.hasRank(room.id, '+') && hostarray.indexOf(user.id) == -1) return false;
		clearTimeout(this.buzzer);
		this.buzzed = '';
		this.say(room, 'The timer has been reset.');
	 },
	 	 
	 mk: 'modkilltimer',
	 mktimer: 'modkilltimer',
	 modkilltimer: function (arg, user, room) {	
		if (isNaN(Number(arg))) return false;
	 	if (room === user || room.id !== "battledome") return false;
		var hostarray = group('host').get('array');
		if (!user.hasRank(room.id, '+') && hostarray.indexOf(user.id) == -1) return false;
		clearTimeout(this.buzzer);
		this.buzzed = '';
		if (Number(arg) < 10){
			return this.say(room, "The minimum time is 10 seconds.");
		}
		if(Number(arg) > 1500){
			return this.say(room, "The maximum time is 1500 seconds.");
		}

		this.say(room, user.name + ' has reset the timer for ' + arg + ' seconds.');
		this.buzzed = user;
		this.buzzer = setTimeout(function (room, buzzMessage) {
			this.say(room, buzzMessage);
			this.buzzed = '';
		}.bind(this), Number(arg) * 1000, room, 'Time is up!');
	},
	
	 ut: 'ugmmodkilltimer',
	 ugmmktimer: 'ugmmodkilltimer',
	 ultimategamingmonthmodkilltimer: 'ugmmodkilltimer',
	 ugmmodkilltimer: function (arg, user, room) {
	 	if (room === user || room.id !== "battledome") return false;
		var hostarray = group('host').get('array');
		if (!user.hasRank(room.id, '+') && hostarray.indexOf(user.id) == -1) return false;
		clearTimeout(this.buzzer);
		this.buzzed = '';
		this.say(room, user.name + ' has reset the timer for 120 seconds.');
		this.buzzed = user;
		this.buzzer = setTimeout(function (room, buzzMessage) {
			this.say(room, buzzMessage);
			this.buzzed = '';
		}.bind(this), Number(120) * 1000, room, 'Time is up!');
	},
	 // Player Commands

	 vs: 'viewStats',
	 viewStats: function(arg,user,room){
	 	var text = '/pm ' + user.id + ', ';
	 	var hostarray = group('host').get('array');
	 	if (((room.id === 'battledome' || room.id.indexOf('groupchat') != -1) && (user.hasRank(room.id, '+') || hostarray.indexOf(user.id) !== -1) && !(arg == '' || arg === undefined || arg === ' ')) || room === user) text = "";
	 	var database = players('database').get('list');
	 	var player = database[user.id];
	 	if (arg == '' || arg === undefined || arg === ' '){
	 		if (player == undefined){
	 			return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
	 		}
	 		var weap = player['curWeap'];
	 		var cls = player['curClass'];
	 		var branch = player['curBranch'];
	 		var cLvlObj = player['classLvl'];
	 		var bLvlObj = player['branchLvl'];
	 		var clvl = cLvlObj[toId(cls)];
	 		var blvl = bLvlObj[toId(branch)];
	 		var xp = player['xp'];
	 		//HP, magic, attack, mdef, meva, pdef, peva, mov
		 	var stats = Create.makeStats(clvl,blvl,toId(cls),toId(weap));
	 		return this.say(room, text + "**" + user.name + ":** ``" + stats[0] + "HP`` | ``" + xp + "XP`` | ``" + cls + "(" + clvl + ")/" + weap + "(" + blvl + ")`` | **Attack/Magic:** ``" + stats[2] + "/" + stats[1] + "`` | **Evasion (P/M):** ``" + stats[6] + "/" + stats[4] + "`` | **Movement:** ``" + stats[7] + "``");
	 	}
		else if (room === user || room.id === 'battledome' || room.id.indexOf('groupchat')!=-1){
			var pass = toId(arg);
	 		player = database[pass];
	 		if (player == undefined) {
	 			return this.say(room, text + "That player does not exist.");
	 		}else{
	 			var weap = player['curWeap'];
	 			var cls = player['curClass'];
	 			var branch = player['curBranch'];
	 			var cLvlObj = player['classLvl'];
	 			var bLvlObj = player['branchLvl'];
	 			var clvl = cLvlObj[toId(cls)];
	 			var blvl = bLvlObj[toId(branch)];
				//HP, magic, attack, mdef, meva, pdef, peva, mov
	 			var stats = Create.makeStats(clvl,blvl,toId(cls),toId(weap));
	 			return this.say(room, text + "**" + player['nom'] + ":** ``" + stats[0] + "HP`` | ``" + cls + "(" + clvl + ")/" + weap + "(" + blvl + ")`` | **Attack/Magic:** ``" + stats[2] + "/" + stats[1] + "`` | **Evasion (P/M):** ``" + stats[6] + "/" + stats[4] + "`` | **Movement:** ``" + stats[7] + "``");
	 		}
	 	}
	 	else{
	 		return false;
	 	}

	 },
	 vl: 'viewLevel',
	 viewLevel: function(arg,user,room){
	 	var text = '/pm ' + user.id + ', ';
	 	var database = players('database').get('list');
	 	var player = database[user.id];
	 	if (arg == '' || arg === undefined || arg === ' '){
	 		if (player == undefined){
	 			return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
	 		}
	 		var cls = player['classLvl'];
	 		var branch = player['branchLvl'];
	 		var xp = player['xp'];
	 		return this.say(room, text + "You have ``" + xp + "`` experience points. | **Your class levels are:** ``CryoKinetic:`` " + cls['cryokinetic'] + ", ``PyroKinetic:`` " + cls['pyrokinetic'] + ", ``Skirmisher:`` " + cls['skirmisher'] + ", ``Guardian:`` " + cls['guardian'] + ", ``Bard:`` " + cls['bard'] + ", ``Rifter:`` " + cls['rifter'] + " | **Your weapon branch levels are:** ``Dueler:`` " + branch['dueler'] + ", ``Heavy:`` " + branch['heavy'] + ", ``Archer:`` " + branch['archer'] + ", ``Sorcerer:`` " + branch['sorcerer'] + ", ``Fighter:`` " + branch['fighter'] + ", ``Clairvoyant:`` " + branch['clairvoyant']);
	 	}
	 	else{
	 		var pass = toId(arg);
	 		player = database[pass];
	 		if (player == undefined) return this.say(room, text + "That player does not exist.");
	 		else{
	 			var cls = player['classLvl'];
	 			var branch = player['branchLvl'];
	 			return this.say(room, text + "**" + player['nom'] + "'s class levels are:** ``CryoKinetic:`` " + cls['cryokinetic'] + ", ``PyroKinetic:`` " + cls['pyrokinetic'] + ", ``Skirmisher:`` " + cls['skirmisher'] + ", ``Guardian:`` " + cls['guardian'] + ", ``Bard:`` " + cls['bard'] + ", ``Rifter:`` " + cls['rifter'] + " | **" + player['nom'] + "'s class levels are:** ``Dueler:`` " + branch['dueler'] + ", ``Heavy:`` " + branch['heavy'] + ", ``Archer:`` " + branch['archer'] + ", ``Sorcerer:`` " + branch['sorcerer'] + ", ``Fighter:`` " + branch['fighter'] + ", ``Clairvoyant:`` " + branch['clairvoyant']);
	 		}
	 	}
	 },
	 sw: 'switchWeapon',
	 switchWeapon: function(arg,user,room){
	 	var text = ((room === user || user.hasRank(room.id, '#')) ? '' : '/pm ' + user.id + ', ');
	 	var database = players('database').get('list');
	 	var player = database[user.id];
	 	if (player == undefined){
	 		return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
	 	}
	 	var check = player['battle'];
	 	if (check === true){
	 		return this.say(room, text + "You cannot switch weapons while in battle. Finish your current battle first.");
	 	}
	 	var branch = player['curBranch'];
	 	var branchWeaps = weapon('branch').get(toId(branch));
	 	for (var n = 1; n < branchWeaps.length; n++){
	 		if (toId(branchWeaps[n]) === toId(arg)){
	 			check = true;
	 			break;
	 		}
	 	}
	 	if (check !== true){
	 		return this.say(room, text + "That weapon is not available with your current Weapon Branch.");
	 	}
	 	player['curWeap'] = weapon(toId(arg)).get('nom');
	 	database[user.id] = player;
	 	players('database').set('list', database);
	 	return this.say(room, text + "You have equipped a ``" + weapon(toId(arg)).get('nom') + "``");
	 },
	 sb: 'switchBranch',
	 switchBranch: function(arg,user,room){
	 	var text = ((room === user || user.hasRank(room.id, '#')) ? '' : '/pm ' + user.id + ', ');
	 	var database = players('database').get('list');
	 	var player = database[user.id];
	 	if (player == undefined){
	 		return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
	 	}
	 	var check = player['battle'];
	 	if (check === true){
	 		return this.say(room, text + "You cannot switch weapon branches while in battle. Finish your current battle first.");
	 	}
	 	if (toId(arg)=="moq") arg="clairvoyant";
	 	var newBranch = weapon('branch').get(toId(arg));
	 	if (newBranch === undefined){
	 		return this.say(room, text + "That is not a valid weapon branch.");
	 	}
	 	var oldBranch = player['curBranch'];
	 	var branch = player['branchLvl'];
	 	if (oldBranch === newBranch[0]){
	 		return this.say(room, text + "You are already within the ``" + oldBranch + "`` weapon branch.");
	 	}
	 	else{
	 		player['curBranch'] = newBranch[0];
	 		player['curWeap'] = newBranch[1];
			database[user.id] = player;
			players('database').set('list', database);
			return this.say(room, text + "You have successfully switched to the ``" + newBranch[0] + "`` weapon branch.");
	 	}
	 },
	 sc: 'switchClass',
	 switchClass: function(arg,user,room){
	 	var text = ((room === user || user.hasRank(room.id, '#')) ? '' : '/pm ' + user.id + ', ');
	 	var database = players('database').get('list');
	 	var player = database[user.id];
	 	if (player == undefined){
	 		return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
	 	}
	 	var check = player['battle'];
	 	if (check === true){
	 		return this.say(room, text + "You cannot switch classes while in battle. Finish your current battle first.");
	 	}
	 	var newClass = sect(toId(arg)).get('nom');
	 	if (newClass === undefined){
	 		return this.say(room, text + "That is not a valid class.");
	 	}
	 	if (newClass === "Ice" && toId(user.id) !== "mmm") return this.say(room, text + "Oh no you're not.");
	 	var oldClass = player['curClass'];
	 	var cls = player['classLvl'];
	 	if (oldClass === newClass){
	 		return this.say(room, text + "You are already a ``" + oldClass + "``");
	 	}
	 	else{
	 		player['curClass'] = newClass;
	 		database[user.id] = player;
	 		players('database').set('list', database);
			return this.say(room, text + "You have successfully switched to the ``" + newClass + "`` class.");
	 	}
	 },
	 level: function(arg,user,room){
	 	var text = ((room === user || user.hasRank(room.id, '#')) ? '' : '/pm ' + user.id + ', ');
	 	var database = players('database').get('list');
	 	var player = database[user.id];
	 	if (player == undefined){
	 		return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
	 	}
	 	var check = player['battle'];
	 	if (check === true){
	 		return this.say(room, text + "You cannot level up anything while in battle. Finish your current battle first.");
	 	}
	 	if (toId(arg) !== 'weapon' && toId(arg) !== 'class'){
	 		return this.say(room, text + 'The only things you may level are your current weapon branch, and your current class. Use %level \"weapon\" or %level \"class\"');
	 	}
	 	var branch = player['curBranch'];
	 	var cls = player['curClass'];
	 	var xp = player['xp'];
	 	var chart = players('expchart').get('chart');
	 	if (toId(arg) === 'weapon'){
	 		var lvl = player['branchLvl'];
	 		var pass = lvl[toId(branch)];
	 		if (pass > 6){
	 			return this.say(room, text + "You have reached the maximum weapon level.");
	 		}
	 		var lvl2 = player['classLvl'];
	 		var pass2 = lvl2[toId(cls)];
	 		var difference = Number(pass) - Number(pass2);
	 		if (difference > 0){
	 			return this.say(room, text + "Your weapon branch and class levels may not be more than 1 level apart. Please level up your class, once, first.");
	 		}
	 		var cost = chart[pass];
	 		check = Number(xp) - Number(cost);
	 		if (check >= 0){
	 			player['xp'] =  (Number(xp) - Number(cost));
	 			lvl[toId(branch)] = Number(lvl[toId(branch)]) + 1;
	 			player['branchLvl'] = lvl;
	 			database[user.id] = player;
	 			players('database').set('list', database);
	 			return this.say(room, text + "Your ``" + branch + "`` level has increased by 1.");
	 		}
	 		else{
	 			return this.say(room, text + "You need " + cost + " experience before you can increase your weapon branch level by 1.");
	 		}
	 	}
	 	else if (toId(arg) === 'class'){
	 		var lvl = player['classLvl'];
	 		var pass = lvl[toId(cls)];
	 		if (pass > 6){
	 			return this.say(room, text + "You have reached the maximum class level.");
	 		}
	 		var lvl2 = player['branchLvl'];
	 		var pass2 = lvl2[toId(branch)];
	 		var difference = Number(pass) - Number(pass2);
	 		if (difference > 0){
	 			return this.say(room, text + "Your weapon branch and class levels may not be more than 1 level apart. Please level up your weapon branch, once, first.");
	 		}
	 		var cost = chart[pass];
	 		check = Number(xp) - Number(cost);
	 		if (check >= 0){
	 			player['xp'] = (Number(xp) - Number(cost));
	 			lvl[toId(cls)] = Number(lvl[toId(cls)]) + 1;
	 			player['classLvl'] = lvl;
	 			database[user.id] = player;
	 			players('database').set('list', database);
	 			return this.say(room, text + "Your ``" + cls + "`` level has increased by 1.");
	 		}
	 		else{
	 			return this.say(room, text + "You need " + cost + " experience before you can increase your class level by 1.");
	 		}
	 	}
	 },
	 exp: 'xp',
	 xp: function(arg,user,room){
	 	if (room === user || !user.hasRank(room.id, '+') || room.id !== 'battledome') return false;
	 	var args = arg.split(',');
	 	var people = Number(args.length) - 1;
	 	if (args[0] === '' || args[0] === undefined || isNaN(args[0])){
	 		return this.say(room, "The correct format is %xp [experience gained], [player1], [player2], [player3], ...");
	 	}
	 	if (Math.abs(args[0]) > 15 && !user.hasRank(room.id, '#')){
	 		return this.say(room, "Only Room Owners may grant more than 15 experience at once.");
	 	}
	 	if (people < 1){
	 		return this.say(room, "Please enter the player(s) that are receiving experience.");
	 	}
	 	var database = players('database').get('list');
	 	var failed = [];
	 	var passed = [];
	 	var countf = 0;
	 	var countp = 0;
	 	for (var n = 1; n < args.length; n++){
	 		var pass = toId(args[n]);
	 		var player = database[pass];
	 		if (player == undefined /*|| player['xpTot'] >= player['xpCap']*/){
	 			failed[countf] = args[n].trim();
	 			countf++;
	 		}
	 		else{
	 			player['xp'] = (Number(player['xp']) + Number(args[0]));
				database[pass] = player;
	 			passed[countp] = args[n].trim();
	 			countp++;
	 		}
	 	}
	 	var now = new Date();
	 	if (countf !== 0){
	 		var xplog = players('xplog').get('list');
	 		var slot = Object.keys(xplog).length;
	 		xplog[slot] = user.name + " || " + arg + " || F || " + now;
	 		players('xplog').set('list', xplog);
			players('database').set('list', database);
			var text = '';
			if (countp > 0){
				text += "Experience successfully awarded to: ``" + passed.join(', ') + "``. ";
			}
			text += "Experience unable to be given to: ``" + failed.join(', ') + "``.";
	 		return this.say(room, text);
	 	}
	 	else{
	 		var xplog = players('xplog').get('list');
	 		var slot = Object.keys(xplog).length;
	 		xplog[slot] = user.name + " || " + arg + " || P || " + now;
	 		players('xplog').set('list', xplog);
			players('database').set('list', database);
	 		return this.say(room, "Experience successfully awarded to: ``" + passed.join(', ') + "``.");
	 	}
	 },
	 /*nick: function(arg,user,room){
	 	var text = ((room === user || user.hasRank(room.id, '#')) ? '' : '/pm ' + user.id + ', ');
	 	var database = players('database').get('list');
	 	var player = database[user.id];
	 	if (player == undefined){
	 		return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
	 	}
	 	var check = player['battle'];
	 	if (check === true){
	 		return this.say(room, text + "Please don't try changing your nickname while in a battle, it's confusing~");
	 	}
	 	var pass = toId(arg);
	 	if (pass.length !== 3 || arg.length !== 3){
	 		return this.say(room, text + "Battle nicknames must be 3 characters long. (Letters or Numbers)");
	 	}
	 	var nicklist = players('nicklist').get('list');
	 	var curNick = player['nick'];
	 	var slot = '';
	 	if (nicklist.indexOf(curNick) !== -1){
	 		slot = nicklist.indexOf(curNick);
	 	}
	 	else{
	 		slot = nicklist.length;
	 	}
	 	if (nicklist.indexOf(pass) !== -1){
	 		return this.say(room, text + "That nickname is already taken by someone :(");
	 	}
	 	else{
	 		player['nick'] = arg;
	 		nicklist[slot] = pass;
	 		database[user.id] = player;
	 		players('nicklist').set('list', nicklist);
	 		players('database').set('list', database);
	 		return this.say(room, text + "Your nickname has been changed to ``" + arg + "``");
	 	}
	 },*/

	 // Battle commands
	 host: function(arg, user, room){
	 	if (room === user || !user.hasRank(room.id, '+')) return false;
	 	if (room.id !== "battledome" && room.id !== "groupchat-icekyubs-1v1league") return false;
	 	if (arg === undefined || arg === '') return false;
	 	var pass = toId(arg);
	 	var database = players('database').get('list');
	 	var player = database[pass];
	 	if (player == undefined){
	 		return this.say(room, arg + " does not have a character.");
	 	}
	 	var infrac = player['infraction'];
	 	if (infrac['hostban'] === true){
	 		if (infrac['gameban'] === true) return this.say(room, arg + " is hostbanned until " + infrac['hbLength'] + ". Reason: " + infrac['hbReason'] + ". They're also gamebanned until "  + infrac['gbLength'] + ".");
	 		return this.say(room, arg + " is hostbanned until " + infrac['hbLength'] + ". Reason: " + infrac['hbReason'] + ".");
	 	}
	 	if (infrac['gameban'] === true){
	 		return this.say(room, arg + " is gamebanned until " + infrac['gbLength'] + ". Reason: " + infrac['gbReason'] + ".");
	 	}
	 	var now = Date.now();
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(toId(arg)) == -1){
	 		hostarray.push(toId(arg));
	 		Config.whitelist.push(toId(arg));
	 		var check = '';

	 		var pairing = group('pairing').get('array');
	 		var timer = group('pairing').get('timer');
	 		var squad = '';
	 		for (var n = 0;n < pairing.length; n++){
	 			var raw = pairing[n];
	 			var props = raw.split(',');
	 			if (props[1] === toId(arg)){
	 				squad = 'omega';
	 			}
	 			else if (props[1] === " "){
	 				squad = props[0];
	 			}
	 			if (squad === 'omega'){
		 			return this.say(room, "You're already hosting a battle. You have to finish that one before you can host a new one! If it's over, type %dehost.");
		 		}
		 		var cooldown = now - timer[squad];
		 		if (cooldown > 1 && squad !== ''){
		 			group(squad).set('gchat', false);
		 			check = "Found";
		 			break;
		 		}
		 	}
		 	if (check !== "Found"){
		 		return this.say(room, "No squads available because there are too many battles going on, or all squads down due to groupchat cooldown. Please try again later.");
		 	}

		 	pairing = BDcom.pairingw(pairing, toId(arg), squad);
	 		group('pairing').set('array', pairing);
	 		group('host').set('array', hostarray);
	 		
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				obj[key] = {'nom': ""};
	 			}
	 		}
	 		group(squad).set('entities', obj);
	 		group(squad).set('players', 0);
	 		group(squad).set('kills', "");
	 		group(squad).set('turnorder', "");
	 		group(squad).set('monsters', 0);
	 		group(squad).set('ugm', "false");
	 		group(squad).set('closed', "true");
	 		var text = '/me hands ' + arg + ' the keys to squad ``' + squad + '``, and some dice. May the hax be with you n.n';
	 		var hostlog = players('hostlog').get('list');
	 		var slot = Object.keys(hostlog).length;
	 		var now = new Date();
	 		hostlog[slot] = arg + " was hosted by " + user.name + " | Date: " + now;
	 		players('hostlog').set('list', hostlog);
	 	}
	 	else{
	 		var text = arg + ' already has keys and dice. If their previous battle is over, please dehost them! n.n';
	 	}
	 	return this.say(room, text);
	 },
	 hostugm: function(arg, user, room){
	 	if (room === user || !user.hasRank(room.id, '+') || room.id !== "battledome") return false;
	 	if (arg === undefined || arg === '') return false;
	 	var pass = toId(arg);
	 	var database = players('database').get('list');
	 	var player = database[pass];
	 	if (player == undefined){
	 		return this.say(room, arg + " does not have a character.");
	 	}
	 	var infrac = player['infraction'];
	 	if (infrac['hostban'] === true){
	 		if (infrac['gameban'] === true) return this.say(room, arg + " is hostbanned until " + infrac['hbLength'] + ". Reason: " + infrac['hbReason'] + ". They're also gamebanned until "  + infrac['gbLength'] + ".");
	 		return this.say(room, arg + " is hostbanned until " + infrac['hbLength'] + ". Reason: " + infrac['hbReason'] + ".");
	 	}
	 	if (infrac['gameban'] === true){
	 		return this.say(room, arg + " is gamebanned until " + infrac['gbLength'] + ". Reason: " + infrac['gbReason'] + ".");
	 	}
	 	var now = Date.now();
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(toId(arg)) == -1){
	 		hostarray.push(toId(arg));
	 		Config.whitelist.push(toId(arg));
	 		var check = '';

	 		var pairing = group('pairing').get('array');
	 		var timer = group('pairing').get('timer');
	 		var squad = '';
	 		for (var n = 0;n < pairing.length; n++){
	 			var raw = pairing[n];
	 			var props = raw.split(',');
	 			if (props[1] === toId(arg)){
	 				squad = 'omega';
	 			}
	 			else if (props[1] === " "){
	 				squad = props[0];
	 			}
	 			if (squad === 'omega'){
		 			return this.say(room, "You're already hosting a battle. You have to finish that one before you can host a new one! If it's over, type %dehost.");
		 		}
		 		var cooldown = now - timer[squad];
		 		if (cooldown > 1 && squad !== ''){
		 			group(squad).set('gchat', false);
		 			check = "Found";
		 			break;
		 		}
		 	}
		 	if (check !== "Found"){
		 		return this.say(room, "No squads available because there are too many battles going on, or all squads down due to groupchat cooldown. Please try again later.");
		 	}

		 	pairing = BDcom.pairingw(pairing, toId(arg), squad);
	 		group('pairing').set('array', pairing);
	 		group('host').set('array', hostarray);
	 		
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				obj[key] = {'nom': ""};
	 			}
	 		}
	 		group(squad).set('entities', obj);
	 		group(squad).set('players', 0);
	 		group(squad).set('kills', "");
	 		group(squad).set('turnorder', "");
	 		group(squad).set('monsters', 0);
	 		group(squad).set('ugm', "true");
	 		group(squad).set('closed', "true");
	 		var text = '/me hands ' + arg + ' the keys to squad ``' + squad + '``, and some dice. May the hax be with you n.n';
	 		var hostlog = players('hostlog').get('list');
	 		var slot = Object.keys(hostlog).length;
	 		var now = new Date();
	 		hostlog[slot] = arg + " was hosted by " + user.name + " to host a UGM battle | Date: " + now;
	 		players('hostlog').set('list', hostlog);
	 	}
	 	else{
	 		var text = arg + ' already has keys and dice. If their previous battle is over, please dehost them! n.n';
	 	}
	 	return this.say(room, text);
	 },
	 close: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;

	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	
	 	if (squad === undefined || squad === ''){
	 		return this.say(room, "Something bad happened. D:");
	 	}
	 	
	 	group(squad).set('closed', "true");
 		return this.say(room, "Signups for squad " + squad + " are now closed.");
	 },
	 open: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;

	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	
	 	if (squad === undefined || squad === ''){
	 		return this.say(room, "Something bad happened. D:");
	 	}
	 	
	 	group(squad).set('closed', "false");
 		return this.say(room, "Signups for squad " + squad + " are now open.");
	 },
	 resethost: 'dehost',
	 dehost: function(arg, user, room){
	 	if (room.id !== "battledome" && room.id.indexOf("groupchat") == -1) return false;
	 	var hostarray = group('host').get('array');
	 	if (!user.hasRank("battledome", '+') && hostarray.indexOf(user.id) == -1) return false;
	 	var x = toId(arg);
	 	var check = '';
	 	if (x === '' && hostarray.indexOf(user.id) !== -1){
			var slot = hostarray.indexOf(user.id);
			hostarray.splice(slot, 1);
	 		if (Config.whitelist.indexOf(user.id) !== -1){
				var list = Config.whitelist.indexOf(user.id);
				Config.whitelist.splice(list, 1);
			}
			var pairing = group('pairing').get('array');
	 		var squad = BDcom.pairlu(pairing, user.id);
	 		
		 	if (squad === undefined || squad === ''){
		 		return false;
		 	}
		 	else{
		 		check = group(squad).get('gchat');
		 		if (check === true){
		 			var now = Date.now();
		 			var timer = group('pairing').get('timer');
		 			timer[squad] = now;
		 			group(squad).set('gchat',false);
		 			var tarRoomid = "groupchat-icekyubs-" + squad;
		 			var tarRoom = Rooms.get(tarRoomid);
		 			if (tarRoom != undefined) this.say(tarRoom, "/deletegroupchat " + tarRoom.id);
		 		}
		 	}

		 	for (var index in pairing){
		 		if (pairing.hasOwnProperty){
	 				var raw = pairing[index];
	 				var props = raw.split(',');
	 				if (props[0] === squad){
	 					pairing[index] = props[0] + ',' + " ";
	 				}
	 			}
	 		}
	 		group('pairing').set('array', pairing);
	 		var obj = group(squad).get('entities');
	 		var database = players('database').get('list');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var slot = obj[key];
	 				if (slot['nom'] !== "" && slot['party']=="P"){
	 					var pass = toId(slot['nom']);
	 					var player = database[pass];
	 					player['battle'] = false;
	 					player['squad'] = "None";
	 					database[pass] = player;
	 				}
	 				obj[key] = {'nom': ""};
	 			}
	 		}
	 		players('database').set('list', database);
		 	group(squad).set('players', 0);
	 		group(squad).set('monsters', 0);
	 		group(squad).set('mLevel', 0);
	 		group(squad).set('pl', 0);
	 		var kills = group(squad).get('kills');
	 		group(squad).set('kills', "");
	 		group(squad).set('turnorder', "");
	 		group(squad).set('mapid', "None");
	 		group(squad).set('map', []);
	 		group(squad).set('entities', obj);
			group('host').set('array', hostarray);
			this.say(room, "The battle has ended. I'll be taking my dice back :D");
			return this.say(room, "Kills: " + kills);
		}
		else if (x === ''){
			return this.say(room, "Target is not hosted right now.");
		}
		else if (x !== '' && hostarray.indexOf(x) !== -1){
			if (!user.hasRank("battledome", '+')) return false;
	 		var slot = hostarray.indexOf(x);
	 		hostarray.splice(slot, 1);
	 		if (Config.whitelist.indexOf(x) !== -1){
	 			var list = Config.whitelist.indexOf(x);
	 			Config.whitelist.splice(list, 1);
	 		}
	 		var pairing = group('pairing').get('array');
		 	var squad = BDcom.pairlu(pairing, toId(x));
	 	
		 	if (squad === undefined || squad === ''){
		 		return false;
		 	}
		 	else{
		 		check = group(squad).get('gchat');
		 		if (check === true){
		 			var now = Date.now();
		 			var timer = group('pairing').get('timer');
		 			timer[squad] = now;
		 			group(squad).set('gchat',false);
		 			var tarRoomid = "groupchat-icekyubs-" + squad;
		 			var tarRoom = Rooms.get(tarRoomid);
		 			if (tarRoom != undefined) this.say(tarRoom, "/deletegroupchat " + tarRoom.id);
		 		}
		 	}

		 	for (var index in pairing){
	 			if (pairing.hasOwnProperty){
	 				var raw = pairing[index];
	 				var props = raw.split(',');
	 				if (props[0] === squad){
	 					pairing[index] = props[0] + ',' + " ";
	 				}
	 			}
	 		}
	 		group('pairing').set('array', pairing);

	 		var obj = group(squad).get('entities');
	 		var database = players('database').get('list');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var slot = obj[key];
	 				if(slot['nom'] !== "" && slot['party']=="P"){
	 					var pass = toId(slot['nom']);
	 					var player = database[pass];
	 					player['battle'] = false;
	 					player['squad'] = "None";
						database[pass] = player;
	 				}
	 				obj[key] = {'nom': ""};
	 			}
	 		}
	 		players('database').set('list', database);
		 	group(squad).set('players', 0);
	 		group(squad).set('monsters', 0);
	 		group(squad).set('mLevel', 0);
	 		group(squad).set('pl', 0);
	 		var kills = group(squad).get('kills');
	 		group(squad).set('kills', "");
	 		group(squad).set('turnorder', "");
	 		group(squad).set('mapid', "None");
	 		group(squad).set('map', []);
	 		group(squad).set('entities', obj);
			group('host').set('array', hostarray);
			this.say(room, '/me takes the dice away from ' + arg);
			return this.say(room, "Kills: " + kills);
		}
		else{
			return this.say(room, "User is not hosted.");
		}
	 },
	 gchat: 'groupchat',
	 groupchat: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room.id !== 'battledome') return false;
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);

	 	if (arg === '' || arg === undefined){
	 		if (group(squad).get('gchat') == true) return this.say(room, "/pm " + user.id + ", <<groupchat-icekyubs-" + squad + ">>");
	 		group(squad).set('gchat', true);
	 		var n = 0;
	 		this.say(room, "/makegroupchat " + squad);
	 		while (tarRoom == undefined && n < 5000000){
		 		var tarRoomid = "groupchat-icekyubs-" + squad;
		 		var tarRoom = Rooms.get(tarRoomid);
		 		n++;
	 		}
	 		if (tarRoom != undefined){
				this.say(tarRoom, "/roommod " + user.name);
		 		this.say(room, "<<groupchat-icekyubs-" + squad + ">>");
	 		}
	 		else this.say(room, "Unable to either promote the host or make the groupchat. Try joining <<groupchat-icekyubs-" + squad + ">> and use %promo if you need to be promoted.");
	 	}
	 },
	 promo: 'promote',
	 promote: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1) return false;
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	var gchat = group(squad).get('gchat');
	 	if (gchat === true){
	 		var tarRoomid = "groupchat-icekyubs-" + squad;
	 		var tarRoom = Rooms.get(tarRoomid);
			return this.say(tarRoom, "/roommod " + user.name);
	 	}
	 },
	 hosts: function(arg, user, room){
	 	if (!user.hasRank(room.id, '+')) return false;
	 	var hostarray = group('host').get('array');
	 	var text = "Current host(s): " + hostarray.join(', ');
	 	this.say(room, text);
	 },
	 r: 'dice',
	 roll: 'dice',
	 dice: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '+')) return false;
	 	if (publicroom.indexOf(room.id)!==-1) return false;
	 	if (user.id === 'penguincuddles' && cuddle === true){
	 		if (arg === '1d666' || arg === '666'){
	 			cuddle = false;
	 			return this.say(room, "Rolls: 666 **||** Total: 666");
	 		}
	 	}
	 	var pass = [];
	 	var args = arg.split(' ');
	 	pass[3] = args[1];
	 	var rawRoll = args[0];
	 	var rawSplit = '';
	 	if (rawRoll.indexOf('+') !== -1){
	 		rawSplit = rawRoll.split('+');
	 	}
	 	else{
	 		rawSplit = rawRoll.split('-');
	 		rawSplit[1] = Number(rawSplit[1])*(-1);
	 	}
	 	if (isNaN(rawSplit[1])){
	 		pass[2] = 0;	
	 	}
	 	else{
	 		pass[2] = rawSplit[1];
	 	}
	 	var store = rawSplit[0];
	 	var storeSplit = store.split('d');
	 	if (storeSplit.length == 1){
	 		pass[1] = storeSplit;
	 		pass[0] = 1;
	 	}
	 	else{
	 		pass[1] = storeSplit[1];
	 		pass[0] = storeSplit[0];
	 	}
	 	if (pass[0] > 69){
	 		return this.say(room, "I don't think I gave you more than 69 dice.");
	 	}

	 	var text = BDcom.roll(pass[0],pass[1],pass[2],pass[3]);
	 	this.say(room, text);
	 },
	 gento: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1) return false;
	 	var pairing = group('pairing').get('array');
		var squad = BDcom.pairlu(pairing, user.id);
	 	if (squad === undefined || squad === ''){
	 		return this.say(room, "You must do %start before setting a turn order.");
	 	}

	 	var to = "";
	 	var prio = [[]];
	 	var obj = group(squad).get('entities');
	 	
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			var stats = obj[key];
	 			if (stats['nom'] !== ''){
	 				prio[key] = [Math.floor(Math.random()*8),stats['mov'],stats['nom']];
	 			}
	 		}
	 	}
	 	
	 	function stuff(a,b){
	 		if (a[1]+a[0] > b[1]+b[0]) return -1;
	 		if (b[1]+b[0] > a[1]+a[0]) return 1;
	 		if (a[1]>b[1]) return -1;
	 		if (b[1]>a[1]) return 1;
	 		if (Math.random()>0.5) return -1;
	 		return 1;
	 	}
	 	prio.sort(stuff);
	 	
	 	for (var p in prio){
	 		if (to=="") to = prio[p][2];
	 		else to+=", " + prio[p][2];
	 	}

		group(squad).set('turnorder', to);
	 	this.say(room, "**The following turn order has been generated:** ``" + to + "``");
	 },
	 bsu: function(arg,user,room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room.id !== 'battledome') return false;
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	if (arg == '' || arg == ' ' || arg == undefined){
	 		var reply = ref('reply').get('bsu');
	 		var rdn = Math.floor(Math.random()*Object.keys(reply).length);
	 		var blargh;
	 		if (group(squad).get('closed') == "false") blargh = " %join " + squad;
	 		else blargh = "/me in";
	 		return this.say(room, reply[rdn] + " (join using " + blargh + ")");
	 	}
	 	else if (toId(arg) === 'sub'){
	 		reply = ref('reply').get('bsus');
	 		rdn = Math.floor(Math.random()*Object.keys(reply).length);
	 		return this.say(room, reply[rdn]);
	 	}
	 	else if (toId(arg) === 'ugm'){
	 		return this.say(room, "/wall Battlesignup! This is an official UGM battle. To join, use /me in. If the squad is full, likely another host will appear and you can join their squad~");
	 	}
	 	else{
	 		return false;
	 	}
	 },
	 setmap: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || publicroom.indexOf(room.id) !== -1) return false;
	 	if (room === user) return false;
	 	
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	if (group(squad).get('closed') == "false") return this.say(room, "You need to %close the signups first!");

	 	var args = arg.split(',');
	 	if (arg == '' || arg == ' ' || arg === undefined){
	 		return this.say(room, "The correct format is %setmap [map name], or %setmap [format]. Current formats include: pvp, ntr");
	 	}
	 	var pass = toId(args[0]);
	 	if (clearance.indexOf(user.id) == -1 && group(squad).get('mapid') != "None") return this.say(room, "You already generated a map.");
	 	if (pass == "pvp") return this.say(room, "This command has been updated! Use XpFFA or XvX to set maps, replacing X with the appropriate number (if playing the juggernaut mode, the number of juggernauts goes second.");
	 	var mapid = '';
	 	var formats = maps('properties').get('formats');
	 	if (formats.indexOf(pass) !== -1){
	 		var format = maps(pass).get('list');
	 		var num = format.length;
	 		var rdn = Math.floor(Math.random()*num);
	 		mapid = format[rdn];
	 		group(squad).set('mapid', mapid);
	 		group(squad).set('map', maps('maplist').get(mapid)['tiles']);
	 		return this.say(room, "Map set to: ``" + mapid + "``");
	 	}
	 	else{
	 		var map = maps('maplist').get(pass);
	 		if (map == undefined){
	 			return this.say(room, "Unable to find map.");
	 		}
	 		else{
	 			if (clearance.indexOf(user.id) == -1) return this.say(room, "Please don't set a specific map. Use XpFFA or XvX instead.");
	 			group(squad).set('mapid', pass);
	 			group(squad).set('map', maps('maplist').get(pass)['tiles']);
	 			//console.log("5" + maps('maplist').get(pass)['tiles'][99]);
	 			return this.say(room, "Map set to: ``" + pass + "``");
	 		}
	 	}
	 },

	 Move: 'move',
	 move: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (room === user || publicroom.indexOf(room.id) !== -1) return false;
	 	var args = arg.split(',');
	 	var squad = '';
	 	if (args.length !== 2 && args.length !== 3){
	 		return this.say(room, "The correct format is %move [Letter],[Number] for players, or %move [Letter],[Number],[Player] for hosts.");
	 	}
	 	if (args.length == 2){
	 		if (isNaN(args[1])){
	 			return this.say(room, "The correct format is %move [Letter],[Number] for players, or %move [Letter],[Number],[Player] for hosts.");
	 		}
	 		var numbers = maps('properties').get('numbers');
	 		var pass = args[0].toUpperCase();
	 		if (numbers[pass] === undefined){
	 			return this.say(room, "The correct format is %move [Letter],[Number] for players, or %move [Letter],[Number],[Player] for hosts.");
	 		}
	 		var database = players('database').get('list');
	 		var player = database[user.id];
	 		if (player === undefined) return false;
	 		squad = player['squad'];
	 		if (squad === "None"){
	 			return false;
	 		}

	 		var check = '';
		 	var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var stats = obj[key];
	 				if (toId(stats['nom']) === user.id){
	 					stats['location'] = [pass,(Number(args[1])-1)];
	 					obj[key] = stats;
	 					check = 'Found';
	 				}
	 			}
	 			if (check === 'Found'){
	 				break;
	 			}
	 		}
	 		if (check !== 'Found'){
	 			return this.say(room, "You aren't in a battle.");
	 		}
	 		return group(squad).set('entities', obj);
	 	}
	 	else if (args.length == 3){
	 		if (hostarray.indexOf(user.id) == -1) return false;
	 		if (isNaN(args[1])){
	 			return this.say(room, "The correct format is %move [Letter],[Number] for players, or %move [Letter],[Number],[Player] for hosts.");
	 		}

	 		var pairing = group('pairing').get('array');
	 		if (squad === undefined || squad === ''){
	 			squad = BDcom.pairlu(pairing, user.id);
	 		}
			if (squad === undefined || squad === ''){
				return this.say(room, "You are not currently hosting any battles.");
	 		}

	 		var numbers = maps('properties').get('numbers');
	 		var pass = args[0].toUpperCase();
	 		if (numbers[pass] === undefined){
	 			return this.say(room, "The correct format is %move [Letter],[Number] for players, or %move [Letter],[Number],[Player] for hosts.");
	 		}
	 		var check = '';
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var stats = obj[key];
	 				if (toId(stats['nom']) === toId(args[2])){
	 					stats['location'] = [pass,(Number(args[1])-1)];
	 					obj[key] = stats;
	 					check = 'Found';
	 				}
	 			}
	 			if (check === 'Found'){
	 				break;
	 			}
	 		}
	 		if (check !== 'Found'){
	 			return this.say(room, "Target not found.");
	 		}
	 		if (stats['party']=='M') return this.say(room, "Use %movem to move monsters.");
	 		return group(squad).set('entities', obj);	
	 	}
	 },
	 movem: 'movemonster',
	 movemonster: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (room === user || publicroom.indexOf(room.id) !== -1) return false;
	 	var args = arg.split(',');
	 	var squad = '';
	 	if (args.length !== 3){
	 		return this.say(room, "The correct format is %movem [Letter],[Number],[Monster] for hosts.");
	 	}
	 	else if (args.length == 3){
	 		if (hostarray.indexOf(user.id) == -1) return false;
	 		if (isNaN(args[1])){
	 			return this.say(room, "The correct format is %movem [Letter],[Number],[Monster] for hosts.");
	 		}

	 		var pairing = group('pairing').get('array');
	 		if (squad === undefined || squad === ''){
	 			squad = BDcom.pairlu(pairing, user.id);
	 		}
			if (squad === undefined || squad === ''){
				return this.say(room, "You are not currently hosting any battles.");
	 		}

	 		var numbers = maps('properties').get('numbers');
	 		var pass = args[0].toUpperCase();
	 		if (numbers[pass] === undefined){
	 			return this.say(room, "The correct format is %movem [Letter],[Number],[Monster] for hosts.");
	 		}
	 		var check = '';
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var stats = obj[key];
	 				if (toId(stats['nom']) === toId(args[2])){
	 					stats['location'] = [pass,(Number(args[1])-1)];
	 					obj[key] = stats;
	 					check = 'Found';
	 				}
	 			}
	 			if (check === 'Found'){
	 				break;
	 			}
	 		}
	 		if (check !== 'Found'){
	 			return this.say(room, "Target not found.");
	 		}
	 		if (stats['party']=='P') return this.say(room, "Use %move to move players.");
	 		return group(squad).set('entities', obj);	
	 	}
	 },
	 map: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '%') && room.id == "battledome") return false;
	 	if (publicroom.indexOf(room.id) !== -1) return false;
	 	var check = '';
		var pairing = group('pairing').get('array');
	 	var squad = toId(arg);

	 	if (squad === undefined || squad === ''){
	 		squad = BDcom.pairlu(pairing, user.id);
	 	}
		if (squad === undefined || squad === ''){
			return this.say(room, "You must enter a target squad."); 
		}
		
		var mapid = group(squad).get('mapid');
		var map = maps('maplist').get(mapid);
		
		if (map === undefined){
			return this.say(room, "Map not found.");
		}
		var wd = map['width'];
		var ht = map['height'];
		
		var text = '<html><body><table align="center" border="2">';
	 	var tiles = group(squad).get('map'); //blank map array
	 	//"clean" the map
	 	for (var n = 0; n < tiles.length; n++){
	 		if (tiles[n] === undefined) break;
	 		var initial = tiles[n];
	 		var piece = [initial.slice(0,102),'   ',initial.slice(104)];
	 		var inject = [piece[0],piece[1],piece[2]].join('');
	 		tiles[n] = inject;
	 	}
	 	//add players
	 	var players = group(squad).get('entities');
	 	var p = 0;
	 	var m = 0;
	 	for (var key in players){
	 		if (players.hasOwnProperty){
	 			var player = players[key];
	 			if (player['nom'] !== ''){
	 				if (player['curHP'] <= 0) {
	 					if (aff=="P") p++;
	 					else if (aff=="M") m++;
	 					continue;
	 				}
	 				var location = player['location'];
	 				var numbers = maps('properties').get('numbers');
	 				var X = numbers[location[0]];
	 				var tarLoc = Number(X)*Number(wd) + Number(location[1]);
	 				var original = tiles[tarLoc];
	 				if (tarLoc > tiles.length){
	 					return this.say(room, "A Player is out of bounds.");
	 				}
	 				var pieces = [original.slice(0,102),original.slice(104)];
	 				var stats = players[key];
	 				var aff = stats['party'];
	 				if (aff=="P") {p++; pieces[2] = stats['party'] + p;}
	 				else if (aff=="M") {m++; pieces[2] = stats['party'] + m;}
	 				var insert = [pieces[0],pieces[2],pieces[1]].join('');
	 				tiles[tarLoc] = insert;
	 			}
	 		}
	 	}
	 	//tiling
	 	var letters = maps('properties').get('letters');
	 	for (var row = 0; row < ht+1; row++){
	 		text += '<tr>';
	 		for (var col = 0; col < wd+1; col++){
	 			if (row == 0 && col == 0){
	 				text += "<td style=background-color:#FFFFFF; width=\"20px\" height=\"20px\"; align=\"center\"><b>  </b></td>";
	 			}
	 			else if (row == 0 && col !==0){
	 				text += "<td style=background-color:#FFFFFF; width=\"20px\" height=\"20px\"; align=\"center\"><b style=\"color:black\">" + Number(col) + "</b></td>";
	 			}
	 			else if (col == 0 && row !== 0){
	 				text += "<td style=background-color:#FFFFFF; width=\"20px\" height=\"20px\"; align=\"center\"><b style=\"color:black\">" + letters[(Number(row) - 1)] + "</b></td>";
	 			}
	 			else{
	 				var place = (Number(row)-1)*Number(wd) + Number(col) - 1;
	 				text += tiles[place];
	 			}
	 		}
	 		text += '</tr>';
	 	}
	 	text += '</table></body></html>';
	 	if (room.id === 'battledome') return this.say(room, '/addhtmlbox ' + text);
	 	else if (room === user) return this.say({id: 'battledome'}, '/pminfobox ' + user.id + ", " + text);
	 	else return this.say(room, '!htmlbox ' + text);
	 },
	 settile: 'tile',
	 tile: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || publicroom.indexOf(room.id) !== -1) return false;
	 	if (room === user) return false;
	 	
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);

	 	var args = arg.split(',');
	 	if (arg == '' || arg == ' ' || arg === undefined){
	 		return this.say(room, "The correct format is %tile [type], [letter], [number].");
	 	}

	 	var type = maps('properties').get('terrain')[toId(args[0])];
	 	if (type == undefined) return this.say(room, "Invalid terrain type. Valid terrain types are: Normal, Sticky, Lava, Stop, Air, Ice, Broken.");
	 	
		 	
	 	var text = "";
	 	var n = 1;
	 	var success = [];
	 	var scount = 0;
	 	var failure = [];
	 	var fcount = 0;
	 	var index = 0;
	 	var tiles = group(squad).get('map');
	 	var mapid = group(squad).get('mapid');
	 	//console.log("1" + maps('maplist').get(mapid)['tiles'][99]);
	 	if (mapid == "None") return this.say(room, "Set a map first.");
	 	var width = maps('maplist').get(mapid)['width'];
	 	if (args.length%2==0) return this.say(room, "You might want to double check your arguments, especially for missing commas.");
	 	while (n < args.length)
	 	{
	 		if ("abcdefghijklmnopqrstuvwxyz".indexOf(toId(args[n])) == -1 || isNaN(toId(args[n+1])) || width < toId(args[n+1])) {
	 			failure[fcount] = toId(args[n]).toUpperCase()+toId(args[n+1]);
	 			fcount++; 
	 			n+=2; 
	 			continue;
	 		}
		 	index = "abcdefghijklmnopqrstuvwxyz".indexOf(toId(args[n]));
		 	index = index * width + Number(toId(args[n+1])) - 1;
		 	tiles = group(squad).get('map');
		 	if (tiles[index] == undefined) {
		 		failure[fcount] = toId(args[n]).toUpperCase()+toId(args[n+1]); 
		 		fcount++; 
		 		n+=2; 
		 		continue;
		 	}
		 	success[scount] = toId(args[n]).toUpperCase()+toId(args[n+1])+"(" + maps('properties').get('reverse')[tiles[index].substr(27,7)] + ")";
		 	//console.log("2" + maps('maplist').get(mapid)['tiles'][99]);
		 	tiles[index] = tiles[index].substr(0,27) + type + tiles[index].substr(34);
		 	//console.log("3" + maps('maplist').get(mapid)['tiles'][99]);
		 	group(squad).set('map', tiles);
		 	//console.log("4" + maps('maplist').get(mapid)['tiles'][99]);
		 	scount++;
	 		n+=2;
	 	}
	 	if (scount > 0) text += "Tile(s) ``" + success.join(', ') + "`` were replaced with ``" + toId(args[0]) + "`` tiles.";
	 	if (fcount > 0) text += "Tile(s) ``" + failure.join(', ') + "`` were unable to be replaced.";
	 	return this.say(room, text);
	 },
	 /*gen: 'genmonster',
	 genmon: 'genmonster',
	 genmonster: function(arg, user, room){//difficulty, players
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '%') && room !== user) return false;
	 	var text = '';
	 	var args = arg.split(',');

	 	if (!isNaN(args[0])){
	 		return this.say(room, "The correct format is %genmon [difficulty], [party size]");
	 	}
	 	if (args[1] > 5 || args[1] < 3 || isNaN(args[1])){
	 		return this.say(room, "Please specify a party size between 3-5, inclusive");
	 	}

	 	switch(toId(args[0])){
	 		case 'novice':
		 		text = BDcom.gennovice(args[1]);
		 		break;
	 		case 'basic':
		 		text = BDcom.genbasic(args[1]);
		 		break;
		 	case 'adept':
		 		text = BDcom.genadept(args[1]);
		 		break;
		 	case 'adv':
		 	case 'advanced':
		 		text = BDcom.genadvanced(args[1]);
		 		break;
		 	case 'exp':
		 	case 'expert':
		 		text = BDcom.genexpert(args[1]);
		 		break;
		 	case 'urmom':
		 	case 'brutal':
		 		text = BDcom.genbrutal(args[1]);
		 		break;
		 	default:
		 		text += "That is not a valid difficulty.";
	 	}
	 	if (text !== "That is not a valid difficulty."){
	 		lastgen = text;
	 	}
	 	this.say(room, text);
	 },
	 repost: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '+')) return false;
	 	this.say(room, lastgen);
	 },*/
	 bp: 'batonpass',
	 batonpass: function(arg, user, room){//bp [to user], [from user]
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '+')) return false;
	 	if (room.id!=="battledome") return false;
	 	if (arg === undefined || arg === ' ' || arg === ''){
	 		return this.say(room, "The correct format is %bp [to], [from].");
	 	}
	 	
	 	var args = arg.split(',');
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	if (squad === undefined || squad === ''){
	 		if (args[1] === undefined) return false //for now
	 		squad = BDcom.bpass(pairing, args[1]);
	 		if (squad === undefined){
	 			return this.say(room, "Host not found.");
	 		}
	 		if (hostarray.indexOf(toId(args[1])) !== -1){
				var slot = hostarray.indexOf(toId(args[1]));
				hostarray.splice(slot, 1);
				if (Config.whitelist.indexOf(toId(args[1])) !== -1){
					var list = Config.whitelist.indexOf(toId(args[1]));
					Config.whitelist.splice(list, 1);
				}
			}
			if (hostarray.indexOf(toId(args[0])) == -1){
	 			hostarray.push(toId(args[0]));
	 			Config.whitelist.push(toId(args[0]));
	 		}
	 	}
	 	else if(hostarray.indexOf(toId(arg)) == -1){
	 		if (hostarray.indexOf(user.id) !== -1){
				var slot = hostarray.indexOf(user.id);
				hostarray.splice(slot, 1);
				if (Config.whitelist.indexOf(user.id) !== -1){
					var list = Config.whitelist.indexOf(user.id);
					Config.whitelist.splice(list, 1);
				}
				if (hostarray.indexOf(toId(arg)) == -1 && args.length < 2){
	 				hostarray.push(toId(arg));
	 				Config.whitelist.push(toId(arg));
		 		}
		 		else if (hostarray.indexOf(toId(args[0])) == -1){
	 				hostarray.push(toId(args[0]));
	 				Config.whitelist.push(toId(args[0]));
		 		}
			}
	 	}
	 	else return this.say(room, "Target is already hosted.");
		group('host').set('array', hostarray);
	 	pairing = BDcom.bpassw(pairing, args[0], squad);
	 	group('pairing').set('array', pairing);
	 	return this.say(room, args[0] + " now has control over squad ``" + squad + "``");
	 },
	 addp: 'addplayer',
	 addplayer: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;

	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);	

	 	if (squad === undefined || squad === ''){
	 		return this.say(room, "You must do %start before adding players or monsters.");
	 	}
	 	var args = arg.split(',');
	 	var pass = '';
	 	var database = players('database').get('list');
	 	var p = [];
	 	var pcount = 0;
	 	var f = [];
	 	var fcount = 0;
	 	var b = [];
	 	var bcount = 0;
	 	var text = '';
 		for (var n = 0; n < args.length; n++){
 			pass = toId(args[n]);
 			var player = database[pass];
 			if (player == undefined){
 				f[fcount] = args[n].trim();
 				fcount++;
 				continue;
 			}
 			var infrac = player['infraction'];
 			if (infrac['gameban'] === true){
 				b[bcount] = args[n].trim();
 				bcount++;
 				continue;
 			}
 			var check = player['battle'];
 			if (check === true){
 				f[fcount] = args[n].trim();
 				fcount++;
 				continue;
 			}
 			var weap = player['curWeap'];
 			var cls = player['curClass'];
 			var branch = player['curBranch'];
 			var cLvlObj = player['classLvl'];
 			var bLvlObj = player['branchLvl'];
 			var clvl = cLvlObj[toId(cls)];
 			var blvl = bLvlObj[toId(branch)];
 			//HP, magic, attack, mdef, meva, pdef, peva, mov
 			
 			var stats = Create.makeStats(((group(squad).get('ugm')=="true")?5:clvl),((group(squad).get('ugm')=="true")?5:blvl),toId(cls),toId(weap));

	 		//upper limit of players (temp before modes)
	 		var limitp = group(squad).get('players');
	 		if (limitp >= 8){
	 			f[fcount] = args[n];
 				fcount++;
 				continue;
	 		}
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			var slot = obj[key];
	 			if (obj.hasOwnProperty){
	 				if (slot['nom'] === ""){
	 					obj[key] = {'nom': player['nom'], 'maxHP': stats[0], 'curHP': stats[0],'attack': stats[2], 'magic': stats[1], 'md': stats[3], 'me': stats[4], 'pd': stats[5], 'pe': stats[6],'mov': stats[7],'location':["A",0],'party':'P'};
	 					check = 'Found';
	 					limitp++;
	 				}
	 			}
	 			if (check === 'Found'){
	 				break;
	 			}
	 		}
	 		if (check === 'Found'){
	 			group(squad).set('entities', obj);
	 			group(squad).set('players', group(squad).get('players') + 1);
	 			player['battle'] = true;
	 			player['squad'] = squad;
	 			database[pass] = player;
	 			players('database').set('list', database);
	 			p[pcount] = args[n].trim();
	 			pcount++;
 			}
 		}
 		if (pcount > 0){
 			text += "Player(s) ``" + p.join(', ') + "`` have been successfully added to the battle.";
 		}
 		if (fcount > 0){
 			text += " Player(s) ``" + f.join(', ') + "`` were unable to be added to the battle.";
 		}
 		if (bcount > 0){
 			text += " Player(s) ``" + b.join(', ') + "`` are gamebanned.";
 		}
 		return this.say(room, text);
	 },
	 j: 'join',
	 join: function(arg, user, room){
	 	if (room.id!=="battledome" && room.id!=="groupchat-icekyubs-test") return false;
	 	
	 	var text = '/pm ' + user.id + ', ';
	 	var squad = toId(arg);
	 	if (group(squad).get('closed') !== "false"){
	 		return this.say(room, text + "Either this squad does not exist or its signups are closed.");
	 	}
	 	
	 	var database = players('database').get('list');
 		var pass = user.id;
 		var player = database[pass];
 		if (player == undefined){
 			return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
 		}
 		var infrac = player['infraction'];
 		if (infrac['gameban'] === true){
 			return this.say(room, text + "You are gamebanned and therefore cannot participate.");
 		}
 		var check = player['battle'];
 		if (check === true){
 			return this.say(room, text + "You are already in a battle. Finish it first before joining!");
 		}
 		var weap = player['curWeap'];
 		var cls = player['curClass'];
 		var branch = player['curBranch'];
 		var cLvlObj = player['classLvl'];
 		var bLvlObj = player['branchLvl'];
 		var clvl = cLvlObj[toId(cls)];
 		var blvl = bLvlObj[toId(branch)];
 		//HP, magic, attack, mdef, meva, pdef, peva, mov
 		var stats = Create.makeStats((group(squad).get('ugm')=="true")?5:clvl,(group(squad).get('ugm')=="true")?5:blvl,toId(cls),toId(weap));

 		//upper limit of players (temp before modes)
 		var limitp = group(squad).get('players');
 		if (limitp >= 8){
 			return this.say(room, text + "The squad you tried to join is full!")
 		}
 		var obj = group(squad).get('entities');
 		for (var key in obj){
 			var slot = obj[key];
 			if (obj.hasOwnProperty){
 				if (slot['nom'] === ""){
 					obj[key] = {'nom': player['nom'], 'maxHP': stats[0], 'curHP': stats[0],'attack': stats[2], 'magic': stats[1], 'md': stats[3], 'me': stats[4], 'pd': stats[5], 'pe': stats[6],'mov': stats[7],'location':["A",0],'party':'P'};
 					check = 'Found';
 				}
 			}
 			if (check === 'Found'){
 				break;
 			}
 		}
 		if (check === 'Found'){
 			group(squad).set('entities', obj);
 			group(squad).set('players', group(squad).get('players') + 1);
 			player['battle'] = true;
 			player['squad'] = squad;
 			database[pass] = player;
 			players('database').set('list', database);
 		}
 		if (limitp==7) this.say(room, "Squad " + squad + " is now full!");
 		return this.say(room, text + "You have successfully entered the battle in squad " + squad + ".");
	 },
	 addm: 'addmonster',
	 addmonster: function(arg, user, room){
	 	var hostarray = group('host').get('array');
		if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;
		
	 	if (room.id !== "battledome" && room.id.indexOf("groupchat")==-1) return false;
	 	
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	
	 	if (squad === undefined || squad === ''){
			return this.say(room, "You must do %start and add all participants before generating monsters.");
	 	}
	 	
	 	var pl = group(squad).get('pl');
	 	var p = 0;
	 	var partyLevel = 0;
	 	var obj = group(squad).get('entities');
	 	var database = players('database').get('list');
	 	for (var key in obj){
			if (obj.hasOwnProperty){
				var stats = obj[key];
				if (stats['nom'] !== '' && stats['party'] == "P"){
 					if (user.id == toId(stats['nom']) && clearance.indexOf(user.id)==-1) return this.say(room, "Hosts may not participate in PvE battles.");
					var player = database[toId(stats['nom'])];
					var curClass = player['curClass'];
					var curBranch = player['curBranch'];
					var classLevels = player['classLvl'];
					var branchLevels = player['branchLvl'];
					var cls = classLevels[toId(curClass)];
					var branch = branchLevels[toId(curBranch)];
					partyLevel += Number(cls);
					partyLevel += Number(branch);
					p++;
				}
			}
	 	}
	 	if (pl==0 || pl == undefined) pl = p;
	 	else p = pl;
	 	group(squad).set('pl', p);
	 	
	 	arg = toId(arg);
	 	
	 	if (arg == '' || arg == ' ' || arg == undefined) return this.say(room, "The correct format is %addm [format or monster].");
	 	if ((p < 3 || p > 5) && arg == 'pve')    return this.say(room, "PvE Monsters can only be generated for a party size between 3 and 5 inclusive. If you want to generate a 1v1 or PvE FFA monster, use %addm 1v1/PvEFFA, respectively.");
	 	if ( p < 3           && arg == "pveffa") return this.say(room, "You need at least 3 players to generate monsters for PvE FFA battles.");
	 	if ( p != 1          && arg === '1v1')   return this.say(room, "You can't generate a 1v1 monster unless you only have one player in the party.");
	 	
	 	var text = '';
	 	var mLevel = group(squad).get('mLevel');
	 	if (mLevel==0) mLevel = Math.round(partyLevel/(2*p));
	 	var mode = monsters('database').get(arg);
	 	var mon = monsters(arg);
	 	var m = 1;
	 	var x = 0;
	 	for (var key in obj){
 			slot = obj[key];
 			if (obj.hasOwnProperty){
 				if (slot['nom'].indexOf(mon.get('nom')) !== -1){
 					x = slot['nom'].replace(mon.get('nom'),"");
 					if (x != undefined && x==m) m = x + 1;
 				}
 			}
 		}
	 	
	 	if (mode === undefined){
	 		if (mon.get('nom') == undefined) return this.say(room, "Please enter a gamemode (valid inputs are PvE, PvE FFA, 1v1) or a monster name.");
	 		else {
		 		var stats = CreatePvE.makeStats(mLevel,p,arg,mon['mode']);
		 		var check = '';
		 		
		 		for (var key in obj){
		 			slot = obj[key];
		 			if (obj.hasOwnProperty){
		 				if (slot['nom'] === ""){
		 					obj[key] = {'nom': mon.get('nom') + String(m), 'maxHP': stats[0], 'curHP': stats[0],'attack': stats[2], 'magic': stats[1], 'me': stats[3], 'pe': stats[4],'mov': stats[5],'location':["A",0],'party':'M'};
		 					check = 'Found';
		 				}
		 			}
		 			if (check === 'Found'){
		 				break;
		 			}
		 		}
		 		if (check === 'Found'){
		 			group(squad).set('entities', obj);
		 			group(squad).set('monsters', group(squad).get('monsters') + 1);
		 			group(squad).set('mLevel', mLevel);
		 		}
		 		return this.say(room, "Monster ``" + arg + "`` has been successfully added to the battle.");
	 		}
	 	}
 		
	 	var rdn = Math.floor(Math.random()*Object.keys(mode).length);
 		
 		mon = mode[rdn];
 		var name = mon['nom'];
 		var n = 0;
 		var length = Object.keys(name).length;
 		var fails = 0;
 		
 		for (var key in obj){
 			var slot = obj[key];
 			if (obj.hasOwnProperty){
	 			if (slot['party']=="P" && slot['nom'] != ""){
	 				if (p==4 && parseInt(key)>1+fails) {
	 					slot['location'] = mon['players'][parseInt(key) + 1 - fails];
	 				}
	 				else if (p==6 && parseInt(key)>1+fails) {
	 					slot['location'] = mon['players'][parseInt(key) + 3 - fails];
	 				}
	 				else if (p==7 && parseInt(key)>2+fails) {
	 					slot['location'] = mon['players'][parseInt(key) + 6 - fails];
	 				}
	 				else if (p==8 && parseInt(key)>1+fails) {
	 					slot['location'] = mon['players'][parseInt(key) + 11 - fails];
	 				}
	 				else {
	 					slot['location'] = mon['players'][parseInt(key) - fails];
	 				}
	 				obj[key] = slot;
	 				group(squad).set('entities', obj);
	 			}
	 			else fails++;
 			}
 		}
 		
 		while (n < length){
	 		var stats = CreatePvE.makeStats(mLevel,p,toId(name[n]),arg);
	 		var check = '';
	 		
	 		for (var key in obj){
	 			slot = obj[key];
	 			if (obj.hasOwnProperty){
	 				if (slot['nom'] === ""){
	 					obj[key] = {'nom': name[n], 'maxHP': stats[0], 'curHP': stats[0],'attack': stats[2], 'magic': stats[1], 'me': stats[3], 'pe': stats[4],'mov': stats[5],'location':mon['positions'][n],'party':'M'};
	 					check = 'Found';
	 				}
	 			}
	 			if (check === 'Found'){
	 				break;
	 			}
	 		}
	 		if (check === 'Found'){
	 			group(squad).set('entities', obj);
	 			group(squad).set('monsters', group(squad).get('monsters') + 1);
	 			group(squad).set('mLevel', mLevel);
	 		}
	 		if (n==0) text += name[n];
	 		else text += ", " + name[n];
	 		n++;
 		}
 		
 		var pass = mon['map'];
 		if (mon['map']=="pvp") pass = String(p) + "pveffa";
 		var mapid = "";
 		var formats = maps('properties').get('formats');
	 	if (formats.indexOf(pass) !== -1){
	 		var format = maps(pass).get('list');
	 		var num = format.length;
	 		rdn = Math.floor(Math.random()*num);
	 		mapid = format[rdn];
	 		group(squad).set('mapid', mapid);
	 		group(squad).set('map', maps('maplist').get(mapid)['tiles']);
	 	}
	 	else{
	 		var map = maps('maplist').get(pass);
	 		if (map == undefined){
	 			mapid == "404 Not Found";
	 		}
	 		else{
	 			group(squad).set('mapid', pass);
	 			group(squad).set('map', maps('maplist').get(pass)['tiles']);
	 			mapid = pass;
	 		}
	 	}
	 	
	 	return this.say(room, "Monster(s) ``" + text + "`` successfully added to the battle. The map has been set to ``" + mapid + "``. This is a ``" + arg + "`` fight.");
	 },
	 remp: 'removeplayer',
	 removeplayer: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1) return false;
	 	var check = '';
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);

	 	if (arg === undefined || arg === ' ' || arg === ''){
	 		return this.say(room, "The correct format is %remp [Player].");
	 	}
	 	
	 	var pass = toId(arg);
	 	var obj = group(squad).get('entities');
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			var slot = obj[key];
	 			if (slot !== undefined && pass === toId(slot['nom']) && slot['party'] == "P"){
					obj[key] = {'nom': ""};
	 				check = 'Found';
	 			}
	 		}
	 		if (check === 'Found'){
	 			break;
	 		}
	 	}
	 	
	 	if (check !== 'Found'){
	 		return this.say(room, "Player not found.");
	 	}
	 	else{
	 		var to = group(squad).get('turnorder');
	 		to = to.replace(slot['nom'], slot['nom'] + " (RIP)");
	 		group(squad).set('turnorder', to);
	 		group(squad).set('entities', obj);
	 		group(squad).set('players', group(squad).get('players') - 1);
	 		var database = players('database').get('list');
	 		var player = database[pass];
	 		player['battle'] = false;
	 		player['squad'] = "None";
	 		database[pass] = player;
	 		players('database').set('list', database);
	 		return this.say(room, "Player " + arg + " removed from the battle.");
	 	}
	 },
	 leave: function(arg, user, room){
	 	if (room.id!=="battledome" && room.id!=="groupchat-icekyubs-test") return false;
	 	
	 	var text = '/pm ' + user.id + ', ';
	 	
	 	var database = players('database').get('list');
 		var pass = user.id;
 		var player = database[pass];
 		if (player == undefined){
 			return this.say(room, text + "You don't seem to have a character. Ask any battledome auth to register you.");
 		}
 		var check = player['battle'];
 		if (check === false){
 			return this.say(room, text + "You are not in a battle right now.");
 		}
	 	var squad = player['squad'];
	 	if (group(squad).get('closed') !== "false"){
	 		return this.say(room, text + "You cannot leave a battle after signups are closed.");
	 	}
 		var obj = group(squad).get('entities');
 		
 		for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			var slot = obj[key];
	 			if (slot !== undefined && pass === toId(slot['nom']) && slot['party'] == "P"){
					obj[key] = {'nom': ""};
	 				check = 'Found';
	 			}
	 		}
	 		if (check === 'Found'){
	 			break;
	 		}
	 	}
	 	
	 	if (check !== 'Found'){
	 		return this.say(room, "Player not found.");
	 	}
	 	else{
	 		group(squad).set('players', group(squad).get('players') - 1);
	 		var database = players('database').get('list');
 			group(squad).set('entities', obj);
	 		var player = database[pass];
	 		player['battle'] = false;
	 		player['squad'] = "None";
	 		database[pass] = player;
	 		players('database').set('list', database);
 		}
 		return this.say(room, text + "You have successfully left the battle in squad " + squad + ".");
	 },
	 remm: 'removemonster',
	 removemonster: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1) return false;
	 	var check = '';
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);

	 	if (arg === undefined || arg === ' ' || arg === ''){
	 		return this.say(room, "The correct format is %remm [Monster].");
	 	}
	 	
	 	var pass = toId(arg);
	 	var obj = group(squad).get('entities');
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			var slot = obj[key];
	 			if (slot !== undefined && pass === toId(slot['nom']) && slot['party'] == "M"){
	 				obj[key] = {'nom': ""};
	 				check = 'Found';
	 			}
	 		}
	 		if (check === 'Found'){
	 			break;
	 		}
	 	}
	 	
	 	if (check !== 'Found'){
	 		return this.say(room, "Monster not found.");
	 	}
	 	else{
	 		var to = group(squad).get('turnorder');
	 		to = to.replace(arg, "RIP");
	 		group(squad).set('turnorder', to);
	 		group(squad).set('entities', obj);
	 		group(squad).set('monsters', group(squad).get('monsters') - 1);
	 		return this.say(room, "Monster " + arg + " removed from the battle.");
	 	}
	 },
	 addk: 'addkill',
	 kill: 'addkill',
	 addkill: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;
	 	
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);

	 	if (arg === '' || arg === ' ' || arg === undefined){
	 		return this.say(room, "The correct format is %addkill [player].");
	 	}

 		var obj = group(squad).get('kills');
 		if (obj == "" || obj == " ") obj = arg;
 		else obj = arg + ", " + obj;
 		group(squad).set('kills', obj);
 		return this.say(room, "Kill added to ``" + arg + "`` in squad ``" + squad + "``.");
	 },
	 remk: 'removekill',
	 remkill: 'removekill',
	 removekill: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;
	 	
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	
	 	if (arg === '' || arg === ' ' || arg === undefined){
	 		return this.say(room, "The correct format is %remkill [player].");
	 	}

 		var obj = group(squad).get('kills');
 		var objcopy = obj;
 		obj = obj.replace(arg + ", ", "");
 		if (obj == objcopy) obj = obj.replace(arg, "");
 		if (obj == objcopy) return this.say(room, "This player didn't have any kills.");
 		group(squad).set('kills', obj);
 		return this.say(room, "Kill removed from ``" + arg + "`` in squad ``" + squad + "``.");
	 },
	 kills: 'getkills',
	 killlist: 'getkills',
	 listkills: 'getkills',
	 getkills: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '+') && room.id!='battledome' && room.id.indexOf('groupchat') == -1  && room != user) return false;
	 	var pairing = group('pairing').get('array');
	 	var squad = toId(arg);

	 	if (squad === undefined || squad === ''){
	 		squad = BDcom.pairlu(pairing, user.id);
	 	}
		if (squad === undefined || squad === ''){
			return this.say(room, "You must enter a target squad.");
	 	}	 	
		
		var obj = group(squad).get('kills');
		if (obj == "" || obj == " ") return this.say (room, "Nobody got a kill yet.");
		return this.say(room, "List of kills (most recent first) for squad ``" + squad + "``: " + obj);
	 },
	 substitute: 'sub',
	 sub: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;

	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);	

	 	if (squad === undefined || squad === ''){
	 		return this.say(room, "You must do %start before adding players or monsters.");
	 	}
	 	var args = arg.split(',');
	 	if (args.length!=2) return this.say(room, "The correct format is %sub [player], [sub].");
	 	
	 	var pl = group(squad).get('pl');
	 	var text = '';
	 	var pass = toId(args[0]);
	 	var obj = group(squad).get('entities');
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			var slot = obj[key];
	 			if (slot !== undefined && pass === toId(slot['nom']) && slot['party'] == "P"){
	 				obj[key] = {'nom': ""};
	 				check = 'Found';
	 				var pos = slot['location'];
	 				var ratio = slot['curHP'] / slot['maxHP'];
	 			}
	 		}
	 		if (check === 'Found'){
	 			var subbed = slot['nom'];
	 			break;
	 		}
	 	}
	 	
	 	if (check !== 'Found'){
	 		return this.say(room, "Player not found.");
	 	}
	 	else{
	 		group(squad).set('entities', obj);
	 		group(squad).set('players', group(squad).get('players') - 1);
	 		var database = players('database').get('list');
	 		var player = database[pass];
	 		player['battle'] = false;
	 		player['squad'] = "None";
	 		database[pass] = player;
	 		players('database').set('list', database);
	 		text+=(room, "Player ``" + subbed + "`` removed from the battle. ");
	 	}
	 	
	 	var p = [];
	 	var pcount = 0;
	 	var f = [];
	 	var fcount = 0;
	 	var b = [];
	 	var bcount = 0;
 		for (var n = 1; n < args.length; n++){
 			pass = toId(args[n]);
 			var player = database[pass];
 			if (player == undefined){
 				f[fcount] = args[n].trim();
 				fcount++;
 				continue;
 			}
 			var infrac = player['infraction'];
 			if (infrac['gameban'] === true){
 				b[bcount] = args[n].trim();
 				bcount++;
 				continue;
 			}
 			var check = player['battle'];
 			if (check === true){
 				f[fcount] = args[n].trim();
 				fcount++;
 				continue;
 			}
 			var weap = player['curWeap'];
 			var cls = player['curClass'];
 			var branch = player['curBranch'];
 			var cLvlObj = player['classLvl'];
 			var bLvlObj = player['branchLvl'];
 			var clvl = cLvlObj[toId(cls)];
 			var blvl = bLvlObj[toId(branch)];
 			//HP, magic, attack, mdef, meva, pdef, peva, mov
 			var stats = Create.makeStats(((group(squad).get('ugm')=="true")?5:clvl),((group(squad).get('ugm')=="true")?5:blvl),toId(cls),toId(weap));

			var mult = 1;
			if (subbed.indexOf("*")!=-1) {
				mult = (pl+1)*0.5;
				player['nom'] += "*";
			}
			var to = group(squad).get('turnorder');
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			var slot = obj[key];
	 			if (obj.hasOwnProperty){
	 				if (slot['nom'] === ""){
	 					obj[key] = {'nom': player['nom'], 'maxHP': stats[0] * mult, 'curHP': Math.round(stats[0] * ratio * mult),'attack': stats[2], 'magic': stats[1], 'md': stats[3], 'me': stats[4], 'pd': stats[5], 'pe': stats[6],'mov': stats[7],'location':pos,'party':'P'};
	 					check = 'Found';
	 				}
	 			}
	 			if (check === 'Found'){
	 				break;
	 			}
	 		}
	 		if (check === 'Found'){
		 		to = to.replace(subbed, player['nom']);
		 		group(squad).set('turnorder', to);
	 			group(squad).set('entities', obj);
	 			group(squad).set('players', group(squad).get('players') + 1);
	 			player['battle'] = true;
	 			player['squad'] = squad;
	 			database[pass] = player;
	 			players('database').set('list', database);
	 			p[pcount] = args[n].trim();
	 			pcount++;
 			}
 			else {
		 		to = to.replace(args[0], args[1]);
		 		group(squad).set('turnorder', to);
 			}
 		}
 		if (pcount > 0){
 			text += "Player ``" + p.join(', ') + "`` has been successfully added to the battle.";
 		}
 		if (fcount > 0){
 			text += "Player ``" + f.join(', ') + "`` was unable to be added to the battle.";
 		}
 		if (bcount > 0){
 			text += "Player ``" + b.join(', ') + "`` is gamebanned.";
 		}
 		return this.say(room, text);
	 },
	 jugg: 'juggernaut',
	 juggernaut: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || (room.id !== "battledome" && room.id.indexOf("groupchat")==-1)) return false;
	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	if (squad === undefined || squad === ''){
	 		return this.say(room, "You must do %start before adding players or monsters.");
	 	}
	 	
	 	var count = 0;
	 	var pl = [];
	 	var database = players('database').get('list');
	 	var obj = group(squad).get('entities');
 		for (var key in obj){
 			if (obj.hasOwnProperty){
 				var stats = obj[key];
 				var pass = (toId(stats['nom']));
 				if (pass != ''){
		 			var player = database[pass];
		 			var cls = player['curClass'];
		 			var branch = player['curBranch'];
		 			var cLvlObj = player['classLvl'];
		 			var bLvlObj = player['branchLvl'];
		 			var clvl = cLvlObj[toId(cls)];
		 			var blvl = bLvlObj[toId(branch)];
		 			pl[count]=[player['nom'],Number(clvl+blvl)];
		 			count++;
 				}
 			}
 		}
 		group(squad).set('pl', pl.length);
	 	
	 	if (count < 3) return this.say(room, "You require a minimum of 3 players to play Juggernaut.");
	 	if (count > 8) return this.say(room, "You can't play Juggernaut with more than 8 players.");
	 	
	 	function stuff(a,b){
	 		if (a[1] > b[1]) return -1;
	 		if (b[1] > a[1]) return 1;
	 		return 0;
	 	}
	 	pl.sort(stuff);
	 	
	 	var mult;
	 	var jugg = [];
	 	var n = 0;
	 	var maxlvl = 0;
	 	var text = "";
	 	
	 	if (count < 6) {
	 		mult = (count+1)*0.5;
	 		while (n < count){
	 			if (pl[n][1] > maxlvl){
	 				maxlvl = pl[n][1];
	 				jugg[0] = pl[n];
	 				n=1;
	 			}
	 			else if (pl[n][1] == maxlvl){
	 				jugg[n] = pl[n];
	 				n++;
	 			}
	 			else break;
	 		}
	 		jugg = [jugg[Math.floor(Math.random()*jugg.length)]];
	 		text = "This battle's juggernaut is: ``" + jugg[0][0] + "``.";
	 	}
	 	
	 	else if (count < 9){
	 		mult = (count+1)*0.2;
	 		while (n < count){
	 			if (pl[n][1] > maxlvl){
	 				maxlvl = pl[n][1];
	 				jugg[0] = pl[n][0];
	 				n=1;
	 			}
	 			else if (pl[n][1] == maxlvl){
	 				jugg[n] = pl[n][0];
	 				n++;
	 			}
	 			else break;
	 		}
	 		var jugg1 = [jugg[Math.floor(Math.random()*jugg.length)]];
	 		var check = false;
	 		var m = 0;
	 		var alt = [];
	 		for (var j in jugg){
	 			if (check == true) alt[m-1] = jugg[j];
	 			if (jugg[j] == jugg1) check = true;
	 			if (check == false) alt[m] = jugg[j];
	 			m++;
	 		}
	 		if (alt.length > 0) var jugg2 = [alt[Math.floor(Math.random()*alt.length)]];
	 		else {
	 			maxlvl=0;
	 			while (n < count){
		 			if (pl[n][1] > maxlvl){
		 				maxlvl = pl[n][1];
		 				alt[0] = pl[n];
		 				n=1;
		 			}
		 			else if (pl[n][1] == maxlvl){
		 				alt[n] = pl[n];
		 				n++;
		 			}
		 			else break;
		 		}
		 		jugg2 = alt[Math.floor(Math.random()*alt.length)];
	 		}
	 		jugg = [jugg1, jugg2];
	 		text = "This battle's juggernauts are: ``" + jugg[0][0] + ", " + jugg[1][0] + "``.";
		}
		
		for (var key in obj){
 			if (obj.hasOwnProperty){
 				stats = obj[key];
 				if (count<6){
	 				if ( (toId(jugg[0][0]).indexOf(toId(stats['nom'])) != -1) && stats['party'] == 'P'){
	 					stats['curHP'] = Math.round(stats['curHP'] * mult);
	 					stats['maxHP'] = Math.round(stats['maxHP'] * mult);
	 					stats['nom'] += "*";
	 					obj[key] = stats;
	 					group(squad).set('entities', obj);
	 				}
 				}
 				else{
 					if (toId(stats['nom']) != ""){
	 					if ( toId(jugg[0][0]).indexOf(toId(stats['nom'])) != -1 || (toId(jugg[1][0]).indexOf(toId(stats['nom'])) != -1) && stats['party'] == 'P'){
		 					stats['curHP'] = Math.round(stats['curHP'] * mult);
		 					stats['maxHP'] = Math.round(stats['maxHP'] * mult);
		 					stats['nom'] += "*";
		 					obj[key] = stats;
		 					group(squad).set('entities', obj);
	 					}
	 				}
 				}
 			}
 		}
 		return this.say(room, text);
	 },
	 HP: 'hp',
	 Hp: 'hp',
	 hp: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (room === user || publicroom.indexOf(room.id) !== -1) return false;
	 	var args = arg.split(',');
	 	var squad = '';
	 	if (args.length < 1){
	 		return this.say(room, "The correct format is %hp [Amount] for players, or %hp [Amount],[Player],[Player],... for hosts.");
	 	}
	 	if (args.length == 1){
	 		if (isNaN(args[0])){
	 			return this.say(room, "The correct format is %hp [Amount] for players, or %hp [Amount],[Player],[Player],... for hosts.");
	 		}
	 		var database = players('database').get('list');
	 		var player = database[user.id];
	 		if (player === undefined) return false;
	 		squad = player['squad'];
	 		if (squad === "None") return false;

	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var stats = obj[key];
	 				if (toId(stats['nom']) === user.id){
	 					stats['curHP'] = Number(stats['curHP']) + Number(args[0]);
	 					obj[key] = stats;
	 					return group(squad).set('entities', obj);
	 				}		
	 			}
	 		}
	 	}
	 	else if (args.length > 1){
	 		if (hostarray.indexOf(user.id) == -1) return false;
	 		if (isNaN(args[0])) return this.say(room, "The correct format is %hp [Amount] for players, or %hp [Amount],[Player],[Player],... for hosts.");
			var pairing = group('pairing').get('array');
	 		if (squad === undefined || squad === ''){
	 			squad = BDcom.pairlu(pairing, user.id);
	 		}
			if (squad === undefined || squad === ''){
				return this.say(room, "You are not currently hosting any battles.");
	 		}
	 		var n = 1;
	 		while (n < args.length){
	 			args[n] = toId(args[n]);
	 			n++;
	 		}
	 		
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var stats = obj[key];
	 				if (args.indexOf(toId(stats['nom'])) != -1 && stats['party'] == 'P'){
	 					stats['curHP'] = Number(stats['curHP']) + Number(args[0]);
	 					obj[key] = stats;
	 					group(squad).set('entities', obj);
	 				}
	 				else if (args.indexOf(toId(stats['nom'])) != -1 && stats['party'] == "M") return this.say(room, "To deduct HP from monsters use %hpm.");
	 			}
	 		}
	 	}
	 },
	 hpm: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (room === user || publicroom.indexOf(room.id) !== -1) return false;
	 	var args = arg.split(',');
	 	var squad = '';
	 	if (args.length < 2){
	 		return this.say(room, "The correct format is %hpm [Amount],[Monster],[Monster],...");
	 	}
	 	else if (args.length > 1){
	 		if (hostarray.indexOf(user.id) == -1) return false;
	 		if (isNaN(args[0])) return this.say(room, "The correct format is %hpm [Amount],[Monster],[Monster],...");
			var pairing = group('pairing').get('array');
	 		if (squad === undefined || squad === ''){
	 			squad = BDcom.pairlu(pairing, user.id);
	 		}
			if (squad === undefined || squad === ''){
				return this.say(room, "You are not currently hosting any battles.");
	 		}
	 		var n = 1;
	 		while (n < args.length){
	 			args[n] = toId(args[n]);
	 			n++;
	 		}
	 		
	 		var obj = group(squad).get('entities');
	 		for (var key in obj){
	 			if (obj.hasOwnProperty){
	 				var stats = obj[key];
	 				if (args.indexOf(toId(stats['nom'])) != -1 && stats['party'] == 'M'){
	 					stats['curHP'] = Number(stats['curHP']) + Number(args[0]);
	 					obj[key] = stats;
	 					group(squad).set('entities', obj);
	 				}
	 			}
	 		}
	 	}
	 },
	 to: 'turnorder',
	 turnorder: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	text = "";
	 	if ( (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '+') ) && room != user ) var text = "/pm " + user + ", ";
	 	if (publicroom.indexOf(room.id) !== -1 && room.id.indexOf("groupchat")==-1) return false;
	 	var pairing = group('pairing').get('array');
	 	var squad = toId(arg);

	 	if (squad === undefined || squad === ''){
	 		squad = BDcom.pairlu(pairing, user.id);
	 	}
		if (squad === undefined || squad === ''){
			return this.say(room, text + "You must enter a target squad.");
	 	}
	 	if (room==user) return this.say(room, text + "Turn order for squad ``" + squad + "``: " + group(squad).get('turnorder'));
	 	else if (room.id=="battledome") return this.say(room, "/addhtmlbox <html><body><table align=\"center\" border=\"1\"> <tr><td style=background-color:#A9A9F5; width=\"600px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + group(squad).get('turnorder') + "</b></td></tr>");
	 	else return this.say(room, "!htmlbox <html><body><table align=\"center\" border=\"1\"> <tr><td style=background-color:#A9A9F5; width=\"600px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + group(squad).get('turnorder') + "</b></td></tr>");
	 },
	 status: 'info',
	 INFO: 'info',
	 INFo: 'info',
	 INfo: 'info',
	 Info: 'info',
	 info: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '%')) return false;
	 	if (room === user || publicroom.indexOf(room.id) !== -1) return false;
	 	var check = '';
		var pairing = group('pairing').get('array');
	 	var squad = toId(arg);

	 	if (squad === undefined || squad === ''){
	 		squad = BDcom.pairlu(pairing, user.id);
	 	}
		if (squad === undefined || squad === ''){
			return this.say(room, "You must enter a target squad."); 
		}
		
		//MAP
		var mapid = group(squad).get('mapid');
		var map = maps('maplist').get(mapid);
		
		if (map === undefined){
			return this.say(room, "Map not found.");
		}
		else{
			var wd = map['width'];
			var ht = map['height'];
			
			var text = '<html><body><table align="center" border="2">';
		 	var tiles = group(squad).get('map'); //blank map array
		 	//"clean" the map
		 	for (var n = 0; n < tiles.length; n++){
		 		if (tiles[n] === undefined) break;
		 		var initial = tiles[n];
		 		var piece = [initial.slice(0,102),'   ',initial.slice(104)];
		 		var inject = [piece[0],piece[1],piece[2]].join('');
		 		tiles[n] = inject;
		 	}
		 	//add players
		 	var pl = group(squad).get('entities');
		 	var p = 0;
		 	var m = 0;
		 	for (var key in pl){
		 		if (pl.hasOwnProperty){
		 			var player = pl[key];
		 			if (player['nom'] !== ''){
		 				if (player['curHP'] <= 0) {
		 					if (aff=="P") p++;
		 					else if (aff=="M") m++;
		 					continue;
		 				}
		 				var location = player['location'];
		 				var numbers = maps('properties').get('numbers');
		 				var X = numbers[location[0]];
		 				var tarLoc = Number(X)*Number(wd) + Number(location[1]);
		 				var original = tiles[tarLoc];
		 				if (tarLoc > tiles.length){
		 					return this.say(room, "A Player is out of bounds.");
		 				}
		 				var pieces = [original.slice(0,102),original.slice(104)];
		 				var stats = pl[key];
		 				var aff = stats['party'];
		 				if (aff=="P") {p++; pieces[2] = stats['party'] + p;}
		 				else if (aff=="M") {m++; pieces[2] = stats['party'] + m;}
		 				var insert = [pieces[0],pieces[2],pieces[1]].join('');
		 				tiles[tarLoc] = insert;
		 			}
		 		}
		 	}
		 	//tiling
		 	var letters = maps('properties').get('letters');
		 	for (var row = 0; row < ht+1; row++){
		 		text += '<tr>';
		 		for (var col = 0; col < wd+1; col++){
		 			if (row == 0 && col == 0){
		 				text += "<td style=background-color:#FFFFFF; width=\"20px\" height=\"20px\"; align=\"center\"><b>  </b></td>";
		 			}
		 			else if (row == 0 && col !==0){
		 				text += "<td style=background-color:#FFFFFF; width=\"20px\" height=\"20px\"; align=\"center\"><b style=\"color:black\">" + Number(col) + "</b></td>";
		 			}
		 			else if (col == 0 && row !== 0){
		 				text += "<td style=background-color:#FFFFFF; width=\"20px\" height=\"20px\"; align=\"center\"><b style=\"color:black\">" + letters[(Number(row) - 1)] + "</b></td>";
		 			}
		 			else{
		 				var place = (Number(row)-1)*Number(wd) + Number(col) - 1;
		 				text += tiles[place];
		 			}
		 		}
		 		text += '</tr>';
		 	}
		 	text += '</table></body></html>';
		}
		
		
		//PL
		var database = players('database').get('list');
	 	var obj = group(squad).get('entities');
		m = 0;
	 	p = 0;
	 	
		text += '<html><body><table align="center" border="1"> <tr><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\"> </b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">Name</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">Class + Weapon</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">HP</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">A</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">M</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">PE</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">ME</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">MP</b></td></tr>';
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			stats = obj[key];
	 			if (stats['nom'] !== ''){
	 				aff = stats['party'];
	 				if (aff=="P") {
	 					p++; var tag = stats['party'] + p;
						var player = database[toId(stats['nom'])]
			 			var weap = player['curWeap'];
			 			var cls = player['curClass'];
			 			var branch = player['curBranch'];
			 			var cLvlObj = player['classLvl'];
			 			var bLvlObj = player['branchLvl'];
			 			var cLvl = cLvlObj[toId(cls)];
			 			var bLvl = bLvlObj[toId(branch)];
			 			switch(cls){
			 				case "CryoKinetic": cls = "Cryo"; break;
			 				case "PyroKinetic": cls = "Pyro"; break;
			 				case "Skirmisher": cls = "Skirm"; break;
			 				case "Guardian": cls = "Guard"; break;
			 			}
			 			switch(weap){
			 				case "Tarot Cards": weap = "Cards"; break;
			 				case "Star Rod": weap = "Rod"; break;
			 				case "Crossbow": weap = "CBow"; break;
			 				case "Longbow": weap = "LBow"; break;
			 				case "Shortbow": weap = "SBow"; break;
			 			}
	 			 		text += "<tr><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + "(" + tag + ")</b></td><td style=background-color:#A9A9F5; width=\"80px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['nom'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + cls + "(" + ((group(squad).get('ugm')=="true")?5:cLvl) + ")/" + weap + "(" + ((group(squad).get('ugm')=="true")?5:bLvl) + ")" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['curHP'] + "/" + stats['maxHP'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['attack'] + "<td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['magic'] + "</b></td>" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['pe'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['me'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['mov'] + ' </b></td></tr>';
	 				}
	 				else if (aff=="M") {
	 					m++;
	 					tag = stats['party'] + m;
	 					var mLevel = group(squad).get('mLevel');
	 					text += "<tr><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + "(" + tag + ")</b></td><td style=background-color:#A9A9F5; width=\"80px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['nom'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + "Monster" + "(" + mLevel + ")" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['curHP'] + "/" + stats['maxHP'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['attack'] + "<td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['magic'] + "</b></td>" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['pe'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['me'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['mov'] + ' </b></td></tr>';
	 				}
	 			}
	 		}
	 	}
	 	text += '</table></body></html>';
	 	
	 	//TO
	 	text += "<html><body><table align=\"center\" border=\"1\"> <tr><td style=background-color:#A9A9F5; width=\"600px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">Turnorder: " + group(squad).get('turnorder') + "</b></td></tr>";
	 	
	 	if (room.id !== 'battledome'){
	 		return this.say(room, '!htmlbox ' + text);
	 	}
	 	else{
	 		return this.say(room, '/addhtmlbox ' + text);
	 	}
	 },
	 setto: 'setturnorder',
	 setturnorder: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (hostarray.indexOf(user.id) == -1 || room === user || publicroom.indexOf(room.id) !== -1) return false;

	 	var pairing = group('pairing').get('array');
	 	var squad = BDcom.pairlu(pairing, user.id);
	 	
	 	if (arg === '' || arg === ' ' || arg === undefined){
	 		return this.say(room, "The correct format is %setturnorder [player1], [player2], [...]");
	 	}
	 	
	 	if (squad === undefined || squad === ''){
	 		return this.say(room, "You must do %start before setting a turn order.");
	 	}
	 	
	 	group(squad).set('turnorder', arg);
 		return this.say(room, "Turn order for squad ``" + squad + "`` has been set.");
	 },
	 PL: 'pl',
	 Pl: 'pl',
	 playerlist: 'pl',
	 pl: function(arg, user, room){
	 	var hostarray = group('host').get('array');
		if ( (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '+') ) && room != user ) return false;
	 	if (publicroom.indexOf(room.id) !== -1) return false;
	 	
		var pairing = group('pairing').get('array');
	 	var squad = toId(arg);

	 	if (squad === undefined || squad === ''){
	 		squad = BDcom.pairlu(pairing, user.id);
	 	}
		if (squad === undefined || squad === ''){
			return this.say(room, "You must enter a target squad.");
	 	}	 	

	 	var database = players('database').get('list');
	 	var obj = group(squad).get('entities');
	 	var m = 0;
	 	var p = 0;
	 	var text = '|| ';
		var text2 = '|| ';
		var text3 = '|| ';
		
	 	if (room == user){
		 	for (var key in obj){
		 		if (obj.hasOwnProperty){
		 			var stats = obj[key];
		 			if (stats['nom'] !== ''){
		 				var aff = stats['party'];
		 				if (aff=="P") {p++; var tag = stats['party'] + p;}
		 				else if (aff=="M") {m++; var tag = stats['party'] + m;}
		 				if (text.length < 210){
		 					text += "``**(" + tag + ")**`` **" + stats['nom'] + ":** ``**HP:**" + stats['curHP'] + "/" + stats['maxHP'] + " **Atk/Mag:** " + stats['attack'] + "/" + stats['magic'] + " **PE/ME:** " + stats['pe'] + "/" + stats['me'] + " **MP:** " + stats['mov'] + /*" **Location:** " + stats['location'] + */"`` || ";
		 				}
		 				else if (text2.length < 210){
		 					text2 += "``**(" + tag + ")**`` **" + stats['nom'] + ":** ``**HP:**" + stats['curHP'] + "/" + stats['maxHP'] + " **Atk/Mag:** " + stats['attack'] + "/" + stats['magic'] + " **PE/ME:** " + stats['pe'] + "/" + stats['me'] + " **MP:** " + stats['mov'] + /*" **Location:** " + stats['location'] + */"`` || ";
		 				}
		 				else {
		 					text3 += "``**(" + tag + ")**`` **" + stats['nom'] + ":** ``**HP:**" + stats['curHP'] + "/" + stats['maxHP'] + " **Atk/Mag:** " + stats['attack'] + "/" + stats['magic'] + " **PE/ME:** " + stats['pe'] + "/" + stats['me'] + " **MP:** " + stats['mov'] + /*" **Location:** " + stats['location'] + */"`` || ";
		 				}
		 			}
		 		}
		 	}
		 	if (text3.length > 3){
		 		this.say(room, text);
		 		this.say(room, text2);
		 		return this.say(room, text3);
		 	}
		 	else if (text2.length > 3){
		 		this.say(room, text);
		 		return this.say(room, text2);
		 	}
		 	else{
		 		return this.say(room, text);
		 	}
	 	}
	 	
		text = '<html><body><table align="center" border="1"> <tr><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\"> </b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">Name</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">Class + Weapon</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">HP</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">A</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">M</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">PE</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">ME</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">MP</b></td></tr>';
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			var stats = obj[key];
	 			if (stats['nom'] !== ''){
	 				var aff = stats['party'];
	 				if (aff=="P") {
	 					p++; var tag = stats['party'] + p;
						var player = database[toId(stats['nom'])]
			 			var weap = player['curWeap'];
			 			var cls = player['curClass'];
			 			var branch = player['curBranch'];
			 			var cLvlObj = player['classLvl'];
			 			var bLvlObj = player['branchLvl'];
			 			var cLvl = cLvlObj[toId(cls)];
			 			var bLvl = bLvlObj[toId(branch)];
			 			switch(cls){
			 				case "CryoKinetic": cls = "Cryo"; break;
			 				case "PyroKinetic": cls = "Pyro"; break;
			 				case "Skirmisher": cls = "Skirm"; break;
			 				case "Guardian": cls = "Guard"; break;
			 			}
			 			switch(weap){
			 				case "Tarot Cards": weap = "Cards"; break;
			 				case "Star Rod": weap = "Rod"; break;
			 				case "Crossbow": weap = "CBow"; break;
			 				case "Longbow": weap = "LBow"; break;
			 				case "Shortbow": weap = "SBow"; break;
			 			}
	 			 		text += "<tr><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + "(" + tag + ")</b></td><td style=background-color:#A9A9F5; width=\"80px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['nom'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + cls + "(" + ((group(squad).get('ugm')=="true")?5:cLvl) + ")/" + weap + "(" + ((group(squad).get('ugm')=="true")?5:bLvl) + ")" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['curHP'] + "/" + stats['maxHP'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['attack'] + "<td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['magic'] + "</b></td>" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['pe'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['me'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['mov'] + ' </b></td></tr>';
	 				}
	 				else if (aff=="M") {
	 					m++;
	 					var tag = stats['party'] + m;
	 					var mLevel = group(squad).get('mLevel');
	 					text += "<tr><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + "(" + tag + ")</b></td><td style=background-color:#A9A9F5; width=\"80px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['nom'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + "Monster" + "(" + mLevel + ")" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['curHP'] + "/" + stats['maxHP'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['attack'] + "<td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['magic'] + "</b></td>" + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['pe'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['me'] + "</b></td><td style=background-color:#A9A9F5; width=\"20px\" height=\"15px\"; align=\"center\"><b style=\"color:black\">" + stats['mov'] + ' </b></td></tr>';
	 				}
	 			}
	 		}
	 	}
	 	text += '</table></body></html>';
	 	if (room.id !== 'battledome'){
	 		return this.say(room, '!htmlbox ' + text);
	 	}
	 	else{
	 		return this.say(room, '/addhtmlbox ' + text);
	 	}
	 },
	win: function(arg, user, room){
        if (room.id !== 'battledome' && room.id !== 'groupchat-icekyubs-1v1league') return false;
        if (room.id == 'groupchat-icekyubs-1v1league' && !user.hasRank(room.id, '%')) return false;
        if (room.id == 'battledome' && !user.hasRank(room.id, '+')) return false;
        var database = players('database').get('list');
        var args = arg.split(',')
        if (args.length !== 2) return this.say(room, "The correct format is %win [winner], [loser]");
        var pass1 = toId(args[0]);
        var pass2 = toId(args[1]);
        var winner = database[pass1];
        var loser = database[pass2];
        if (winner == undefined || loser == undefined)  return this.say(room, "One of these players does not have a character.");
        if (winner['wins'] == undefined){
            winner['wins'] = 0;
            winner['losses'] = 0;
            winner['elo'] = 1000;
            players('database').set('list', database);
        }
        if (loser['wins'] == undefined){
            loser['wins'] = 0;
            loser['losses'] = 0;
            loser['elo'] = 1000;
            players('database').set('list', database);
        }
        var winelo = winner['elo'];
        var loseelo = loser['elo'];
        winner['oldelo'] = winelo
        loser['oldelo'] = loseelo
        var win1 = winner['wins'];
        var lose1 = winner['losses'];
        var win2 = loser['wins'];
        var lose2 = loser['losses'];
        var winpercentage = 1/(1+(Math.pow(10, (loseelo-winelo)/400)));
        var losepercentage = 1.0 - winpercentage;
        if (win1+lose1 < 15) var winkfactor = 40 - win1 - lose1;
        else var winkfactor = 25;
        if (win2+lose2 < 15) var losekfactor = 40 - win1 - lose1;
        else var losekfactor = 25;
        if (winkfactor === undefined) var losekfactor = 25;
        winner['elo'] = winelo + ((1-winpercentage) * winkfactor);
        loser['elo'] = loseelo + ((0-losepercentage) * losekfactor);
        win1++;
        lose2++;
        winner['wins'] = win1;
        loser['losses'] = lose2;
        return this.say(room, "The battle has been updated.");
     },
     rwin: 'resetwin',
     resetwin: function(arg, user, room){
     	if (room.id !== 'battledome' && room.id !== 'groupchat-icekyubs-1v1league') return false;
        if (room.id == 'groupchat-icekyubs-1v1league' && !user.hasRank(room.id, '%')) return false;
        if (room.id == 'battledome' && !user.hasRank(room.id, '+')) return false;
     	var database = players('database').get('list');
     	var args = arg.split(',');
     	if (args.length != 2) return this.say(room, "The correct format is %resetwin (false winner), (false loser)");
     	var pass1 = toId(args[0]);
     	var pass2 = toId(args[1]);
     	var fwinner = database[pass1];
     	var floser = database[pass2];
     	if (fwinner == undefined || floser == undefined) return this.say(room, "One or more of these players do not exist.");
     	var elo1 = fwinner['oldelo'];
     	var elo2 = floser['oldelo'];
     	var wins = fwinner['wins'];
     	var losses = floser['losses'];
     	wins--;
     	losses--;
     	fwinner['elo'] = elo1;
     	floser['elo'] = elo2;
     	fwinner['wins'] = wins;
     	floser['losses'] = losses;
     },
     elo: 'showelo',
     showelo: function(arg, user, room){
        var text = '/pm ' + user.id + ', ';
        var database = players('database').get('list');
        var player = database[user.id];
        if (arg == '' || arg === undefined || arg === ' '){
            if (database[user.id] === undefined) return this.say(room, text + 'You are not registered for Battle Dome.  PM anyone with a symbol by their name to get started.');
            if (player['wins'] === undefined) return this.say(room, text + 'You have not played a match yet.');
            var wins = player['wins'];
            var losses = player['losses'];
            var elo = Math.round(player['elo']);
            return this.say(room, text + 'Wins: ' + wins + ' | Losses: ' + losses + ' | Elo: ' + elo + ' |');
        }
        else if (room === user || room.id === 'battledome' || room.id.indexOf('groupchat')!=-1){
            var pass = toId(arg);
            player = database[pass];
            if (player == undefined) {
                return this.say(room, text + "That player does not exist.");
            }
            if (player['wins'] == undefined) {
                return this.say(room, text + "This player has not played any matches.");
            }
            var wins = player['wins'];
            var losses = player['losses'];
            var elo = Math.round(player['elo']);
            var text2 = 'Wins: ' + wins + ' | Losses: ' + losses + ' | Elo: ' + elo + ' |'
            if (room !== user && !user.hasRank(room.id, '+')) return this.say(room, text + text2);
            else return this.say (room, 'Wins: ' + wins + ' | Losses: ' + losses + ' | Elo: ' + elo + ' |');
        }
        return false;
     },
     
	 /*PL: 'playerlist',
	 Pl: 'playerlist',
	 pl: 'playerlist',
	 squad: 'playerlist',
	 playerlist: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if ( (hostarray.indexOf(user.id) == -1 && !user.hasRank(room.id, '+') ) && room != user ) return false;
	 	if (publicroom.indexOf(room.id) !== -1) return false;
	 	var check = '';
		var text = '|| ';
		var text2 = '|| ';
		var text3 = '|| ';
		var pairing = group('pairing').get('array');
	 	var squad = toId(arg);

	 	if (squad === undefined || squad === ''){
	 		squad = BDcom.pairlu(pairing, user.id);
	 	}
		if (squad === undefined || squad === ''){
			return this.say(room, "You must enter a target squad.");
	 	}	 	

	 	var obj = group(squad).get('entities');
	 	var m = 0;
	 	var p = 0;
	 	for (var key in obj){
	 		if (obj.hasOwnProperty){
	 			var stats = obj[key];
	 			if (stats['nom'] !== ''){
	 				var aff = stats['party'];
	 				if (aff=="P") {p++; var tag = stats['party'] + p;}
	 				else if (aff=="M") {m++; var tag = stats['party'] + m;}
	 				if (text.length < 210){*/
	 					//text += "``**(" + tag + ")**`` **" + stats['nom'] + ":** ``**HP:**" + stats['curHP'] + "/" + stats['maxHP'] + " **Atk/Mag:** " + stats['attack'] + "/" + stats['magic'] + " **PE/ME:** " + stats['pe'] + "/" + stats['me'] + " **MP:** " + stats['mov'] + /*" **Location:** " + stats['location'] + */"`` || ";
	 				/*}
	 				else if (text2.length < 210){*/
	 					//text2 += "``**(" + tag + ")**`` **" + stats['nom'] + ":** ``**HP:**" + stats['curHP'] + "/" + stats['maxHP'] + " **Atk/Mag:** " + stats['attack'] + "/" + stats['magic'] + " **PE/ME:** " + stats['pe'] + "/" + stats['me'] + " **MP:** " + stats['mov'] + /*" **Location:** " + stats['location'] + */"`` || ";
	 				/*}
	 				else {*/
	 					//text3 += "``**(" + tag + ")**`` **" + stats['nom'] + ":** ``**HP:**" + stats['curHP'] + "/" + stats['maxHP'] + " **Atk/Mag:** " + stats['attack'] + "/" + stats['magic'] + " **PE/ME:** " + stats['pe'] + "/" + stats['me'] + " **MP:** " + stats['mov'] + /*" **Location:** " + stats['location'] + */"`` || ";
	 				/*}
	 			}
	 		}
	 	}
	 	if (text3.length > 3){
	 		this.say(room, text);
	 		this.say(room, text2);
	 		return this.say(room, text3);
	 	}
	 	else if (text2.length > 3){
	 		this.say(room, text);
	 		return this.say(room, text2);
	 	}
	 	else{
	 		return this.say(room, text);
	 	}
	 },*/

	 // Test & Staff general commands
	 testfun: function(arg, user, room){
	 	if (!user.isExcepted()) return false;
	 	//var text = '<html><body><table align="center"><tr><td style=background-color:#cc33ff; width="30px" height="30px"; align="center"><b>P1</b></td><td style=background-color:#58FA82; width="30px" height="30px"; align="center"></td><td style=background-color:#58FA82; width="30px" height="30px"></td></tr><tr><td style=background-color:#58FA82; width="30px" height="30px"></td><td style=background-color:#58FA82; width="30px" height="30px"></td><td style=background-color:#81BEF7; width="30px" height="30px"; align="center">P2</td></tr><tr><td style=background-color:#58FA82; width="30px" height="30px"></td><td style=background-color:#58FA82; width="30px" height="30px"></td><td style=background-color:#58FA82; width="30px" height="30px"></td></tr></table></body></html>'
	 	//return this.say(room, "!htmlbox " + text);
	 	var text = "<td style=background-color:#58FA82; width=\"25px\" height=\"25px\"; align=\"center\"><b style=\"color:black\"></b></td>";
	 	console.log(text[8]);
	 	console.log(room);
	 },
	 /*update: function(arg, user, room){
	 	if (!user.isExcepted()) return false;
	 	var database = players('database').get('list');
	 	for (var key in database){
	 		if (database.hasOwnProperty){
	 			var oldData = database[key];
	 			oldData['nick'] = "None";
	 			database[key] = oldData;
	 		}
	 	}
	 	return players('database').set('list', database);
	 },*/
	 /*transfer: function(arg, user, room){
	 	if (!user.isExcepted()) return false;
	 	var pass = toId(arg);
	 	var check = players(pass).get('nom');
	 	if (check === undefined){
	 		return this.say(room, "Nope");
	 	}
	 	var player = {};
	 	player['nom'] = players(pass).get('nom');
		player['signupDate'] = players(pass).get('signupDate');
		player['curClass'] = players(pass).get('curClass');
		player['curBranch'] = players(pass).get('curBranch');
		player['curWeap'] = players(pass).get('curWeap');
		player['classLvl'] = players(pass).get('classLvl');
		player['branchLvl'] = players(pass).get('branchLvl');
		player['xp'] = players(pass).get('xp');
		player['infraction'] = players(pass).get('infraction');
		player['battle'] = players(pass).get('battle');
	 
	 	var database = players('database').get('list');
	 	database[pass] = player;
	 	players('database').set('list', database);
	 	return this.say(room, "Okay");
	 },
	 /*sn: 'statsnow',
	 statsnow: function(arg, user, room){
	 	if (!user.isExcepted()) return false;
	 	console.log(JSON.stringify(pairing));
	 	console.log(JSON.stringify(alpha));
	 	console.log(JSON.stringify(beta));
	 	console.log(JSON.stringify(gamma));
	 	console.log(JSON.stringify(delta));
	 	console.log(JSON.stringify(epsilon));
	 },*/
	 logs: function(arg, user, room){
	 	if (!user.isExcepted() && clearance.indexOf(user.id) == -1) return false;
	 	var pass = toId(arg);
	 	var text = '/pm ' + user.id + ', ';
	 	if (room === user){
	 		text = '';
	 	}
	 	if (pass === 'mail' || pass === 'host' || pass === 'xp' || pass === 'ban'){
	 		var obj = {};
	 		var log = [];
	 		if (pass === 'mail'){
	 			if (!user.isExcepted()) return this.say(room, "I don't have logs for that.");
	 			obj = mailbox('maillog').get('list');
	 		}
	 		else if (pass === 'host'){
	 			obj = players('hostlog').get('list');
	 		}
	 		else if (pass === 'xp'){
	 			obj = players('xplog').get('list');
	 		}
	 		else if (pass === 'ban' || pass === 'bans' || pass === 'gamebans' || pass === 'hostbans' || pass === 'gameban' || pass === 'hostban'){
	 			obj = mailbox('banlist').get('log');
	 			pass = 'ban';
	 		}
	 		for (var n = 0; n < Object.keys(obj).length; n++){
	 			log[n] = obj[n] + "\n";
	 		}
	 		return this.uploadToHastebin(log.join(''), function (link) {
	 			console.log(link);
				if (link.startsWith('Error')) this.say(room, "Error: Probably failed to upload to hastebin.");
				else this.say(room, text + "Here's the " + pass + 'log. (Though you may have to sift through it): ' + link);
			}.bind(this));
	 	}
	 	else{
	 		return this.say(room, "I don't have logs for that.");
	 	}
	 },
	 sd: 'statistics',
	 statistics: function(arg, user, room){
	 	if (!user.isExcepted && clearance.indexOf(user.id) == -1) return false;
	 	var text = '/pm ' + user.id + ', ';
	 	if (room === user){
	 		text = '';
	 	}
	 	var database = players('database').get('list');
	 	var cls = {'CryoKinetic': 0, 'PyroKinetic': 0, 'Skirmisher': 0, 'Bard': 0, 'Guardian': 0, 'Rifter': 0};
	 	var branch = {'Dueler': 0, 'Heavy': 0, 'Archer': 0, 'Sorcerer': 0, 'Fighter': 0, 'Clairvoyant': 0};
	 	var weap = {'Katana': 0, 'Rapier': 0,'Gladius': 0,'Hammer': 0,'Axe': 0,'Polearm': 0,'Longbow': 0,'Shortbow': 0,'Crossbow': 0,'Spellbook': 0,'Wand': 0,'Stave': 0,'Tonfa': 0,'Claws': 0,'Bo Staff': 0,'Orb':0,'Tarot Cards':0,'Star Rod':0};
	 	var player = {};
	 	var count = 0;
	 	for (var key in database){
	 		if (database.hasOwnProperty){
	 			player = database[key];
	 			var curClass = player['curClass'];
	 			var curBranch = player['curBranch'];
	 			var curWeap = player['curWeap'];
	 			cls[curClass] = Number(cls[curClass]) + 1;
	 			branch[curBranch] = Number(branch[curBranch]) + 1;
	 			weap[curWeap] = Number(weap[curWeap]) + 1;
	 			count++;
	 		}
	 	}
	 	var paste = [];
	 	paste[0] = "Total Players: " + count + "\n";
	 	var slot = Object.keys(paste).length;
	 	paste[slot] = "Class distribution:\n";
	 	for (var key1 in cls){
	 		slot++;
	 		paste[slot] = key1 + ": " + cls[key1] + "\n";
	 	}
	 	slot = Object.keys(paste).length;
	 	paste[slot] = "Branch distribution:\n";
	 	for (var key2 in branch){
	 		slot++;
	 		paste[slot] = key2 + ": " + branch[key2] + "\n";
	 	}
	 	slot = Object.keys(paste).length;
	 	paste[slot] = "Weapon distribution:\n";
	 	for (var key3 in weap){
	 		slot++;
	 		paste[slot] = key3 + ": " + weap[key3] + "\n";
	 	}
	 	return this.uploadToHastebin(paste.join(''), function (link) {
				if (link.startsWith('Error')) return false;
				this.say(room, text + 'Here\'s the current Class/Branch/Weapon distribution data (Beware of Alts): ' + link);
			}.bind(this));
	 },
	 xprank: 'xprankings',
	 xprankings: function(arg, user, room){
	 	if (room !== user && room.id !== "battledome" && room.id.indexOf("groupchat")==-1) return false;
	 	var text = '/pm ' + user.id + ', ';
	 	if ((user.hasRank(room.id, '+')) && room.id == "battledome") text = "";
	 	if (room === user) text = '';
	 	var database = players('database').get('list');
	 	var player = {};
	 	var classes = ['cryokinetic', 'pyrokinetic', 'guardian', 'skirmisher', 'bard', 'rifter'];
	 	var branches = ['dueler', 'heavy', 'archer', 'sorcerer', 'fighter', 'clairvoyant'];
	 	var eqxp = [0, 20, 45, 75, 110, 150, 195, 245, 300, 360];
	 	var xp = 0;
	 	var count = 0;
	 	var list = [];
	 	for (var key in database){
	 		if (database.hasOwnProperty){
	 			xp = 0;
	 			player = database[key];
	 			var cLvlObj = player['classLvl'];
	 			var bLvlObj = player['branchLvl'];
	 			for (var c in classes) {
	 				var clvl = cLvlObj[classes[c]];
	 				xp+=eqxp[clvl-1];
	 			}
	 			for (var b in branches) {
	 				var blvl = bLvlObj[branches[b]];
	 				xp+=eqxp[blvl-1];
	 			}
	 			xp += player['xp'];
	 			list[count]=[player['nom'],xp];
	 			count++;
	 		}
	 	}
	 	function stuff(a,b){
	 		if (a[1] > b[1]) return -1;
	 		if (b[1] > a[1]) return 1;
	 		return 0;
	 	}
	 	list.sort(stuff);
	 	
	 	var paste = [];
	 	var slot = Object.keys(paste).length;
	 	paste[0] = "All time EXP rankings. This list includes EXP locked in levels:\n";
	 	while (slot<count){
	 		slot++;
	 		var spacings = "";
	 		var spacings2 = "";
	 		var spacings3 = "";
	 		var num = 3-(Math.log10(Number(slot)));
	 		while (num>0){
	 			spacings += " ";
	 			num--;
	 		}
	 		num = 19-(list[slot-1][0].length);
	 		while (num>0){
	 			spacings2 += " ";
	 			num--;
	 		}
	 		num = 4-(Math.log10(Number(list[slot-1][1] == 0 ? 1 : (list[slot-1][1] < 0 ? -list[slot-1][1] : list[slot-1][1]))));
	 		if (list[slot-1][1] < 0) num-=1;
	 		while (num>0){
	 			spacings3 += " ";
	 			num--;
	 		}
	 		paste[slot] = spacings + String(slot) + ". " + list[slot-1][0] + spacings2 + ": " + list[slot-1][1] + spacings3 + "XP\n";
	 	}
	 	return this.uploadToHastebin(paste.join(''), function (link) {
				if (link.startsWith('Error')) return false;
				this.say(room, text + 'Here\'s the current XP rankings: ' + link);
			}.bind(this));
	 },
	 elorank: 'elorankings',
	 elorankings: function(arg, user, room){
	 	if (room !== user && room.id !== "battledome" && room.id.indexOf("groupchat")==-1) return false;
	 	var text = '/pm ' + user.id + ', ';
	 	if ((user.hasRank(room.id, '+')) && room.id == "battledome") text = "";
	 	if (room === user) text = '';
	 	var database = players('database').get('list');
	 	var player = {};
	 	var elo = 0;
	 	var wins = 0;
	 	var losses = 0;
	 	var count = 0;
	 	var list = [];
	 	for (var key in database){
	 		if (database.hasOwnProperty){
	 			player = database[key];
	 			elo = Math.round(player['elo']);
	 			wins = player['wins']
	 			losses = player['losses']
	 			if (isNaN(elo)) continue;
	 			list[count]=[player['nom'],elo,wins,losses];
	 			count++;
	 		}
	 	}
	 	function stuff(a,b){
	 		if (a[1] > b[1]) return -1;
	 		if (b[1] > a[1]) return 1;
	 		return 0;
	 	}
	 	list.sort(stuff);
	 	
	 	var paste = [];
	 	var slot = Object.keys(paste).length;
	 	paste[0] = "ELO rankings for 4.0 beta.:\n";
	 	while (slot<count){
	 		slot++;
	 		var spacings = "";
	 		var spacings2 = "";
	 		var spacings3 = "";
	 		var spacings4 = "";
	 		var num = 3-(Math.log10(Number(slot)));
	 		while (num>0){
	 			spacings += " ";
	 			num--;
	 		}
	 		num = 19-(list[slot-1][0].length);
	 		while (num>0){
	 			spacings2 += " ";
	 			num--;
	 		}
	 		num = 4-(Math.log10(Number(list[slot-1][1] == 0 ? 1 : (list[slot-1][1] < 0 ? -list[slot-1][1] : list[slot-1][1]))));
	 		if (list[slot-1][1] < 0) num-=1;
	 		while (num>0){
	 			spacings3 += " ";
	 			num--;
	 		}
	 		num = 4-(Math.log10(Number(list[slot-1][2] == 0 ? 1 : (list[slot-1][2] < 0 ? -list[slot-1][2] : list[slot-1][2]))));
	 		if (list[slot-1][2] < 0) num-=1;
	 		while (num>0){
	 			spacings4 += " ";
	 			num--;
	 		}
	 		paste[slot] = spacings + String(slot) + ". " + list[slot-1][0] + spacings2 + ": " + list[slot-1][1] + spacings3 + "ELO | Wins: " + list[slot-1][2] + spacings4 + " | Losses: " + list[slot-1][3] + "\n";
	 	}
	 	return this.uploadToHastebin(paste.join(''), function (link) {
				if (link.startsWith('Error')) return false;
				this.say(room, text + 'Here\'s the current ELO rankings: ' + link);
			}.bind(this));
	 },
	 modchat: function(arg, user, room){
	 	if (!user.hasRank(room.id, '%')) return false;
	 	if (arg == '+'){
	 		if (!user.hasRank(room.id, '@')) return false;
	 		else{
	 			return this.say(room, '/modchat +');
	 		}
	 	}
	 	else if (arg == 'ac'){
	 		return this.say(room, '/modchat ac');
	 	}
	 	else if (arg == 'off'){
	 		return this.say(room, '/modchat off');
	 	}
	 	else{
	 		return this.say(room, 'Valid inputs are +, ac and off.');
	 	}
	 },
	 makemap: function(arg, user, room){ // name, format, terrain|x|y, terrain|x|y, terrain|x|y, ...
	 	if (!user.isExcepted()) return false;
	 	var args = arg.split(',');
	 	if (args.length < 2) return false;
	 	var ht = '';
	 	var wd = '';
	 	var tiles = [];
	 	if (args.length == 2){
	 		if (args[1] == "ntr"){
	 			ht = 5;
	 			wd = 5;
	 		}
	 		else if (toId(args[1]) == 'pvp' || toId(args[1]) == 'pve' || toId(args[1]) == 'ffa'){
	 			ht = 10;
	 			wd = 10;
	 		}
	 		else{
	 			return false;
	 		}
	 		for (var n = 0; n < (ht*wd); n++){
	 			tiles[n] = "<td style=background-color:#A9F5A9; width=\"20px\" height=\"20px\"; align=\"center\"><b style=\"color:black\">  </b></td>";
	 		}
	 		maps('maplist').set(toId(args[0]), {"width": wd, "height": ht, "tiles": tiles});
	 		var format = maps(toId(args[1])).get('list');
	 		var slot = format.length;
	 		format[slot] = toId(args[0]);
	 		maps(toId(args[1])).set('list', format);
	 		return this.say(room, "Map ``" + args[0] + "`` added.");
	 	}
	 	else{
	 		if (args[1] == "ntr"){
	 			ht = 5;
	 			wd = 5;
	 		}
	 		else if (toId(args[1]) == 'pvp' || toId(args[1]) == 'pve' || toId(args[1]) == 'ffa'){
	 			ht = 10;
	 			wd = 10;
	 		}
	 		else{
	 			return false;
	 		}
	 		for (var n = 0; n < (ht*wd); n++){
	 			tiles[n] = "<td style=background-color:#A9F5A9; width=\"20px\" height=\"20px\"; align=\"center\"><b style=\"color:black\">  </b></td>";
	 		}
	 		var terrain = maps('properties').get('terrain');
	 		var num = args.length;
	 		for (var n = 2; n < args.length; n++){
	 			var props = args[n].split('|');
	 			var tile = props[0];
	 			var x = Number(props[1]);
	 			var y = Number(props[2]);
	 			var location = x*wd + y;
	 			tiles[location] = "<td style=background-color:" + terrain[tile] + "; width=\"20px\" height=\"20px\"; align=\"center\"><b style=\"color:black\">  </b></td>";
	 		}
	 		maps('maplist').set(toId(args[0]), {"width": wd, "height": ht, "tiles": tiles});
	 		var format = maps(toId(args[1])).get('list');
	 		var slot = format.length;
	 		format[slot] = toId(args[0]);
	 		maps(toId(args[1])).set('list', format);
	 		return this.say(room, "Map ``" + args[0] + "`` added.");
	 	}
	 },
	 /*loot: 'itemdrop',
	 itemdrop: function(arg, user, room){
	 	var hostarray = group('host').get('array');
	 	if (room.id !== "battledome") return false;
	 	else if (user.hasRank(room.id, '+') || hostarray.indexOf(user.id) !== -1){
		 	var pass = toId(arg);
		 	var items = ref('itemdrops').get(pass);
		 	if (items === undefined){
		 		return this.say(room, "That is not a valid class/subclass.");
		 	}

	 		var gen = Math.floor(Math.random()*20);
	 		var result = items[gen];
	 		this.say(room, "You got a ``" + result + "``!");
	 	}
	 },*/
	 regp: 'createplayer',
	 createplayer: function(arg, user, room){// regp player, class
	 	if (room === user || !user.hasRank(room.id, '+')) return false;
	 	if (room.id !== 'battledome') return false;
	 	var args = arg.split(',');
	 	var pass = toId(args[0]);
	 	var database = players('database').get('list');
	 	var player = database[pass];
	 	if (player !== undefined){
	 		return this.say(room, "That user already has a character.");
	 	}
	 	else if (args[2] === undefined){
	 		return this.say(room, "Please use the format %regp [PS username], [Starting Class], [Starting Weapon]");
	 	}
	 	else{
	 		player = {};
	 	}
	 	var cls = sect(toId(args[1])).get('nom');
	 	if (cls === undefined){
	 		return this.say(room, "That isn't a starting class. Try CryoKinetic/PyroKinetic/Skirmisher/Guardian/Bard/Rifter.");
	 	}
	 	var branch;
	 	var weapon = toId(args[2]);
	 	switch (weapon){
	 		case "katana": branch = "Dueler"; weapon = "Katana"; break;
	 		case "rapier": branch = "Dueler"; weapon = "Rapier"; break;
	 		case "gladius": branch = "Dueler"; weapon = "Gladius"; break;
	 		case "hammer": branch = "Heavy"; weapon = "Hammer"; break;
	 		case "axe": branch = "Heavy"; weapon = "Axe"; break;
	 		case "polearm": branch = "Heavy"; weapon = "Polearm"; break;
	 		case "longbow": branch = "Archer"; weapon = "Longbow"; break;
	 		case "shortbow": branch = "Archer"; weapon = "Shortbow"; break;
	 		case "crossbow": branch = "Archer"; weapon = "Crossbow"; break;
	 		case "spellbook": branch = "Sorcerer"; weapon = "Spellbook"; break;
	 		case "wand": branch = "Sorcerer"; weapon = "Wand"; break;
	 		case "stave": branch = "Sorcerer"; weapon = "Stave"; break;
	 		case "tonfa": branch = "Fighter"; weapon = "Tonfa"; break;
	 		case "claws": branch = "Fighter"; weapon = "Claws"; break;
	 		case "bostaff": branch = "Fighter"; weapon = "Bo Staff"; break;
	 		case "orb": branch = "Clairvoyant"; weapon = "Orb"; break;
	 		case "tarotcards": branch = "Clairvoyant"; weapon = "Tarot Cards"; break;
	 		case "starrod": branch = "Clairvoyant"; weapon = "Star Rod"; break;
	 	}
	 	if (branch === undefined){
	 		return this.say(room, "That isn't a starting weapon. Try Katana/Rapier/Gladius/Hammer/Axe/Polearm/Longbow/Shortbow/Crossbow/Spellbook/Wand/Stave/Tonfa/Claws/Bo Staff/Orb/Tarot Cards/Star Rod.");
	 	}
	 	var now = new Date();
	 	//creating
		player['nom'] = args[0];
		player['nick'] = "None";
		player['signupDate'] = now;
		player['curClass'] = cls;
		player['curBranch'] = branch;
		player['curWeap'] = weapon;
		player['classLvl'] = {'cryokinetic': 1, 'pyrokinetic': 1, 'skirmisher': 1, 'guardian': 1, 'bard': 1, 'rifter': 1};
		player['branchLvl'] = {'dueler': 1, 'heavy': 1, 'archer': 1, 'sorcerer': 1, 'fighter': 1, 'clairvoyant': 1};
		player['xp'] = 0;
		player['infraction'] = {'gameban': false, 'gbReason': "", 'gbLength': "", 'hostban': false, 'hbReason': "", 'hbLength': ""};
		player['battle'] = false;
		player['squad'] = "None";
		//adding
		database[pass] = player;
		players('database').set('list', database);
		return this.say(room, "Player ``" + args[0] + "`` added.");
	 },
	 gb: 'gameban',
	 gameban: function(arg,user,room){
	 	if (!user.hasRank(room.id, '%') || room.id !== 'battledome') return false;
	 	var args = arg.split(',');
	 	if (args[2] === undefined || args[2] === ''){
	 		return this.say(room, "The correct format is: %gameban [username], [reason], [end date of ban]");
	 	}
	 	var pass = toId(args[0]);
	 	var database = players('database').get('list');
	 	var player = database[pass];
	 	if (player == undefined){
	 		return this.say(room, "That person does not have a character");
	 	}
	 	else{
	 		var now = new Date();
	 		var infrac = player['infraction'];
	 		infrac['gameban'] = true;
	 		infrac['gbReason'] = args[1];
	 		infrac['gbLength'] = args[2];
	 		player['infraction'] = infrac;
	 		database[pass] = player;
	 		players('database').set('list', database);
	 		var log = mailbox('banlist').get('log');
	 		var slot = Object.keys(log).length;
	 		log[slot] = user.name + " || " + arg + " || Gameban || " + now;
	 		mailbox('banlist').set('log', log);
	 		return this.say(room, "The player ``" + args[0] + "`` has been gamebanned.");
	 	}
	 },
	 ungb: 'ungameban',
	 ungameban: function(arg,user,room){
	 	if (!user.hasRank(room.id, '%') || room.id !== 'battledome') return false;
	 	var pass = toId(arg);
	 	var database = players('database').get('list');
	 	var player = database[pass];
	 	if (player === undefined){
	 		return this.say(room, "That person does not have a character");
	 	}
	 	var infrac = player['infraction'];
	 	if (infrac['gameban'] === true){
	 		infrac['gameban'] = false;
	 		infrac['gbReason'] = '';
	 		infrac['gbLength'] = '';
	 		player['infraction'] = infrac;
	 		database[pass] = player;
	 		players('database').set('list', database);
	 		return this.say(room, arg + " has been ungamebanned.");
	 	}
	 	else{
	 		return this.say(room, "That person is not gamebanned.");
	 	}
	 },
	 vgb: 'viewgamebans',
	 viewgamebans: function(arg,user,room){
	 	if (!user.isExcepted() && clearance.indexOf(user.id) == -1) return false;
	 	var text = '/pm ' + user.id + ', ';
	 	if (room === user){
	 		text = '';
 		}
 		
 		var database = players('database').get('list');
	 	var player = {};
	 	var count = 0;
	 	var paste = [];
	 	for (var key in database){
	 		if (database.hasOwnProperty){
	 			player = database[key];
	 			var infrac = player['infraction'];
	 			if (infrac['gameban'] === true){
	 				paste[count + 1] = player['nom'] + " | Gamebanned for: " + infrac['gbReason'] + " | End date of ban: " + infrac['gbLength'] + "\n";
	 				count++;
	 			}
	 		}
	 	}
	 	paste[0] = "Total gamebans: " + count + "\n";
	 	
	 	return this.uploadToHastebin(paste.join(''), function (link) {
				if (link.startsWith('Error')) return false;
				this.say(room, text + 'Here\'s the current list of gamebans: ' + link);
			}.bind(this));
	 },
	 hb: 'hostban',
	 hostban: function(arg,user,room){
	 	if (!user.hasRank(room.id, '%') || room.id !== 'battledome') return false;
	 	var args = arg.split(',');
	 	if (args[2] === undefined || args[2] === ''){
	 		return this.say(room, "The correct format is: %hostban [username], [reason], [end date of ban]");
	 	}
	 	var pass = toId(args[0]);
	 	var database = players('database').get('list');
	 	var player = database[pass];
	 	if (player == undefined){
	 		return this.say(room, "That person does not have a character");
	 	}
	 	else{
	 		var now = new Date();
	 		var infrac = player['infraction'];
	 		infrac['hostban'] = true;
	 		infrac['hbReason'] = args[1];
	 		infrac['hbLength'] = args[2];
	 		player['infraction'] = infrac;
	 		database[pass] = player;
	 		players('database').set('list', database);
	 		var log = mailbox('banlist').get('log');
	 		var slot = Object.keys(log).length;
	 		log[slot] = user.name + " || " + arg + " || Hostban || " + now;
	 		mailbox('banlist').set('log', log);
	 		return this.say(room, "The player ``" + args[0] + "`` has been hostbanned.");
	 	}
	 },
	 unhb: 'unhostban',
	 unhostban: function(arg,user,room){
	 	if (!user.hasRank(room.id, '%') || room.id !== 'battledome') return false;
	 	var pass = toId(arg);
	 	var database = players('database').get('list');
	 	var player = database[pass];
	 	if (player == undefined){
	 		return this.say(room, "That person does not have a character");
	 	}
	 	var infrac = player['infraction'];
	 	if (infrac['hostban'] === true){
	 		infrac['hostban'] = false;
	 		infrac['hbReason'] = '';
	 		infrac['hbLength'] = '';
	 		player['infraction'] = infrac;
	 		database[pass] = player;
	 		players('database').set('list', database);
	 		return this.say(room, arg + " has been unhostbanned.");
	 	}
	 	else{
	 		return this.say(room, "That person is not hostbanned.");
	 	}
	 },
	 vhb: 'viewhostbans',
	 viewhostbans: function(arg,user,room){
	 	if (!user.isExcepted() && clearance.indexOf(user.id) == -1) return false;
	 	var text = '/pm ' + user.id + ', ';
	 	if (room === user){
	 		text = '';
 		}
 		
 		var database = players('database').get('list');
	 	var player = {};
	 	var count = 0;
	 	var paste = [];
	 	for (var key in database){
	 		if (database.hasOwnProperty){
	 			player = database[key];
	 			var infrac = player['infraction'];
	 			if (infrac['hostban'] === true){
	 				paste[count + 1] = player['nom'] + " | Hostbanned for: " + infrac['hbReason'] + " | End date of ban: " + infrac['hbLength'] + "\n";
	 				count++;
	 			}
	 		}
	 	}
	 	paste[0] = "Total hostbans: " + count + "\n";
	 	
	 	return this.uploadToHastebin(paste.join(''), function (link) {
				if (link.startsWith('Error')) return false;
				this.say(room, text + 'Here\'s the current list of hostbans: ' + link);
			}.bind(this));
	 },
	 addw: function(arg,user,room){
	 	if (!user.isExcepted()) return false;
	 	var args = arg.split('/');
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, 'Please enter a weapon name.')
	 	}
	 	var pass = toId(args[0]);
	 	if (args[1] === undefined || args[1] === '' || args[8] === undefined){
	 		return this.say(room, "The correct format is %addw [hp], [magic], [attack], [mdef], [meva], [pdef], [peva], [mov]");
	 	}
	 	weapon(pass).set(pass, {'nom': args[0], 'hp': args[1], 'magic': args[2], 'atk': args[3], 'mdef': args[4], 'meva': args[5], 'pdef': args[6], 'peva': args[7], 'mov': args[8]});
	 	return this.say(room, "The weapon ``" + args[0] + "`` has been updated.");
	 },
	 addc: function(arg,user,room){
	 	if (!user.isExcepted()) return false;
	 	var args = arg.split('/');
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, 'Please enter a class name.')
	 	}
	 	var pass = toId(args[0]);
	 	if (args[1] === undefined || args[1] === '' || args[8] === undefined){
	 		return this.say(room, "The correct format is %addc [hp], [magic], [attack], [mdef], [meva], [pdef], [peva], [mov]");
	 	}
	 	sect(pass).set(pass, {'nom': args[0], 'hp': args[1], 'magic': args[2], 'atk': args[3], 'mdef': args[4], 'meva': args[5], 'pdef': args[6], 'peva': args[7], 'mov': args[8]});
	 	return this.say(room, "The class ``" + args[0] + "`` has been updated.");
	 },
	 editmove: 'addmove',
	 addmove: function(arg, user, room){// name cost roll target type element desc
	 	if (!user.isExcepted() && clearance.indexOf(user.id) == -1) return false;
	 	var args = arg.split(',');
	 	if (args[1] === undefined || args[1] === '' || args[7] === undefined){
	 		return this.say(room, "The correct format is %addmove [name], [class and level], [frequency], [missrate], [roll], [damage type/action type], [number of targets (Range for AoE)/target group (Foe, Ally or Any)/range], [description].");
	 	}
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, "Please enter a move name.");
	 	}
	 	if (args.length > 8){
	 		for (var n = 8; n < args.length; n++){
	 			args[7] += ',' + args[n];
	 		}
	 	}
	 	for (var m = 0; m < 8; m++){
	 		if (args[m].substr(0,1)==" ") args[m] = args[m].replace(" ","");
 		}
	 	ref('moves').set(toId(args[0]), {'nom': args[0], 'Level': args[1], 'Frequency': args[2], 'Accuracy': args[3], 'Roll': args[4], 'Type': args[5],'Target': args[6], 'Desc': args[7]});
	 	this.say(room, "The move ``" + args[0] + "`` has been added/edited.");
	 },
	 addcard: function(arg, user, room){// name cost roll target type element desc
	 	if (!user.isExcepted() && tcgclearance.indexOf(user.id) == -1) return false;
	 	var args = arg.split(',');
	 	if (args[1] === undefined || args[1] === '' || args[9] === undefined){
	 		return this.say(room, "The correct format is %addmove [name], [category], [rank], [hp], [attack], [magic], [defense], [magic defense], [ability (no commas here)], [move].");
	 	}
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, "Please enter a move name.");
	 	}
	 	if (args.length > 10){
	 		for (var n = 10; n < args.length; n++){
	 			args[9] += ',' + args[n];
	 		}
	 	}
	 	for (var m = 0; m < 10; m++){
	 		if (args[m].substr(0,1)==" ") args[m] = args[m].replace(" ","");
 		}
	 	ref('cards').set(toId(args[0]), {'nom': args[0], 'Category': args[1], 'Rank': args[2], 'HP': args[3], 'A': args[4], 'M': args[5],'D': args[6], 'MD': args[7], 'Ability': args[8], 'Move': args[9]});
	 	this.say(room, "The card ``" + args[0] + "`` has been added/edited.");
	 },
	 addcardability: function(arg, user, room){// name cost roll target type element desc
	 	if (!user.isExcepted() && tcgclearance.indexOf(user.id) == -1) return false;
	 	var args = arg.split(',');
	 	if (args[1] === undefined || args[1] === ''){
	 		return this.say(room, "The correct format is %addcardability [name], [ability].");
	 	}
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, "The correct format is %addcardability [name], [ability].");
	 	}
	 	if (args.length > 2){
	 		for (var n = 2; n < args.length; n++){
	 			args[1] += ',' + args[n];
	 		}
	 	}
	 	for (var m = 0; m < 2; m++){
	 		if (args[m].substr(0,1)==" ") args[m] = args[m].replace(" ","");
 		}
 		var card = ref('cards').get(toId(args[0]));
 		if (card==undefined) return this.say(room, "Invalid card.");
	 	card['Ability'] = args[1];
 		ref('cards').set(toId(args[0]), card);
	 	this.say(room, "The card ``" + args[0] + "`` has been added/edited.");
	 },
	 addcardmove: function(arg, user, room){// name cost roll target type element desc
	 	if (!user.isExcepted() && tcgclearance.indexOf(user.id) == -1) return false;
	 	var args = arg.split(',');
	 	if (args[1] === undefined || args[1] === ''){
	 		return this.say(room, "The correct format is %addcardmove [name], [move].");
	 	}
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, "The correct format is %addcardmove [name], [move].");
	 	}
	 	if (args.length > 2){
	 		for (var n = 2; n < args.length; n++){
	 			args[1] += ',' + args[n];
	 		}
	 	}
	 	for (var m = 0; m < 2; m++){
	 		if (args[m].substr(0,1)==" ") args[m] = args[m].replace(" ","");
 		}
 		var card = ref('cards').get(toId(args[0]));
 		if (card==undefined) return this.say(room, "Invalid card.");
	 	card['Move'] = args[1];
 		ref('cards').set(toId(args[0]), card);
	 	this.say(room, "The card ``" + args[0] + "`` has been added/edited.");
	 },
	 card: function(arg, user, room){
	 	var preface = ((room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ');
	 	if (arg === undefined || arg === '') return false;
	 	var hostarray = group('host').get('array');
	 	if(hostarray.indexOf(user.id) !== -1){
	 		preface = '';
	 	}
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		preface = '/pm ' + user.id + ', ';
	 	}
	 	var text = '';
	 	var pass = toId(arg);
	 	var obj = ref('cards').get(pass);
	 	if (obj !== undefined){
			text += '``**' + obj['nom'] + ':**`` **' + obj['Category'] + '** | ``**Rank:**`` **' + obj['Rank'] + '** | ``**HP:**`` **' + obj['HP'] + '** | ``**Attack:**`` **' + obj['A'] + '** | ``**Magic:**`` **' + obj['M'] + '** | ``**Defense:**`` **' + obj['D'] + '** | ``**Magic Defense:**`` **' + obj['MD'] + '** | ``**Ability:**`` __' + obj['Ability'] + '__ | ``**Move:**`` __' + obj['Move'] + '__';
			if (text.length > 299){
				var text2 = text.slice(text.indexOf('``**Ability:**``'));
				text = text.slice(0,(text.indexOf('``**Ability:**``') - 3));
				if (text2.length > 293){
					var text3 = text2.slice(text2.indexOf('``**Move:**``'));
					text2 = text2.slice(0,(text2.indexOf('``**Move:**``') - 3));
					this.say(room, preface + text);
					this.say(room, preface + text2);
					this.say(room, preface + text3);
					return;
				}
				this.say(room, preface + text);
				this.say(room, preface + text2);
				return;
			}
			return this.say(room, preface + text);
	 	}
	 	else{
 			var reply = ref('reply').get('whatis');
 			var rdn = Math.floor(Math.random()*(Object.keys(reply).length));
 			return this.say(room, preface + reply[rdn]);
 		}
	 },
	 addlink: function(arg, user, room){
	 	if (!user.isExcepted() && clearance.indexOf(user.id) == -1) return false;
	 	var args = arg.split(',');
	 	var text = "";
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, "Please enter a link name.");
	 	}
	 	if (args[1] === undefined || args[1] === ''){
	 		return this.say(room, "Please enter a URL.");
	 	}
	 	if (ref('links').get(toId(args[0])) !== undefined)  text+=" added.";
	 	else text+=" replaced.";
	 	
 		ref('links').set(toId(args[0]), args[1]);
 		return this.say(room, "The link ``" + args[0] + "`` was successfully" + text);
	 },
	 addtext: function(arg, user, room){
	 	if (!user.isExcepted() && clearance.indexOf(user.id) == -1) return false;
	 	var args = arg.split(',');
	 	var text = "";
	 	if (args[0] === undefined || args[0] === ''){
	 		return this.say(room, "Please enter a name for the database entry.");
	 	}
	 	if (args[1] === undefined || args[1] === ''){
	 		return this.say(room, "Please enter a description.");
	 	}
	 	if (ref('text').get(toId(args[0])) !== undefined) text+="Replaced";
	 	else text += "Added";
	 	
 		var result = args[1].replace(" ","");
 		if (args.length > 2){
 			var count = args.length;
 			for (var n = 2; n < count; n++){
 				result += "," + args[n];
 			}
 		}
 		ref('text').set(toId(args[0]), result);
 		return this.say(room, text + " entry for " + args[0] + ".");
 	
	 },
	 /*sweephost: function(arg, user, room){
	 	if(room === user || !user.hasRank(room.id, '%') || room.id !== "battledome") return false;
	 	hostarray.length = 0;
	 	Config.whitelist.length = 0;
	 },*/
	 wlist: function(arg, user, room){
	 	if (room === user || !user.isExcepted()) return false;
	 	if (arg === undefined || arg === '') return false;
	 	Config.whitelist.push(toId(arg));
	 },
	 quote: function(arg, user, room) {
	 	var preface = ((room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ');
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		preface = '/pm ' + user.id + ', ';
	 	}
		var reply = ref('reply').get('quote');
	 	if (arg == '' || arg == ' ') arg = Math.floor(Math.random()*Object.keys(reply).length);
	 	var text = reply[arg];
	 	if (text==undefined) return this.say(room, "Quote not found.");
	 	return this.say(room, preface + text);
	},
	joke: function(arg, user, room) {
	 	var preface = ((room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ');
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		preface = '/pm ' + user.id + ', ';
	 	}
		var reply = ref('reply').get('joke');
	 	if (arg == '' || arg == ' ') arg = Math.floor(Math.random()*Object.keys(reply).length);
	 	var text = reply[arg];
	 	if (text==undefined) return this.say(room, "Joke not found.");
	 	return this.say(room, preface + text);
	},
	l: "lynch",
	lynch: function(arg, user, room) {
	 	var preface = ((room === user || user.hasRank(room.id, '+')) ? '' : '/pm ' + user.id + ', ');
	 	if (room !== user && room.id !== 'battledome' && room.id.indexOf('groupchat') == -1){
	 		preface = '/pm ' + user.id + ', ';
	 	}
	 	if (room.id=="mafia") return false;
	 	
		var reply = ref('reply').get('lynch');
	 	var rand = Math.floor(Math.random()*Object.keys(reply).length);
	 	var text = reply[rand];
	 	//this will obviously never come up, but just in case
	 	if (text==undefined) return this.say(room, "If you see this, lynch MMM instead because he sucks at coding.");
	 	return this.say(room, preface + arg + text);
	}
};