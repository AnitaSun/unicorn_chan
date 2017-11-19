const vars    = require('./vars');

const Discord = require('discord.js');
let   unicorn = new Discord.Client();
const Twitter = require('twitter');
const twitter = new Twitter(vars.twitter);
const knex    = require('knex')(vars.database);


// --------------------------------
async function getIllustrators() {
	try {
		let table = await knex('illustrators');
		let illustrators = [];
		Object.keys(table).forEach(line => {
			illustrators.push(table[line].name);
		});

		return illustrators;

	} catch(e) {
		if(createTable())
			return [];

		console.log('table creation failed');
		process.exit(1);
	}
}


async function save(name) {
	try {
		let exist = await knex('illustrators').where('name', '=', name);

		if(exist.length == 0) {
			unicorn.illustrators.push(name);
			await knex('illustrators').insert({name: name});
		}

	} catch(e) {
		console.log('saving failed');
		process.exit(1);
	}
}


async function remove(name) {
	try {
		let exist = await knex('illustrators').where('name', '=', name);

		if(exist.length != 0) {
			unicorn.illustrators.splice(unicorn.illustrators.indexOf(name), 1);
			
			await knex('illustrators').where({name: name}).del();
		}

	} catch(e) {
		console.log('deletion failed');
		process.exit(1);
	}
}


async function createTable() {
	try {
		await knex.schema.createTable('illustrators', function(table) {
			table.increments();
			table.string('name', 32);
			table.timestamps();
		});

		return true;

	} catch (e) {
		return false;
	}
}



// ----------------------------------------------
unicorn.on('ready', async () => {
	unicorn.tweetedIds   = [];
	unicorn.illustrators = await getIllustrators();
	unicorn.herRoom      = unicorn.channels.get(vars.discord.channelId);
	
	fav();
	setInterval(
		() => { fav(); },
		1000 * 60
	);
	
	function fav() {
		twitter.get('favorites/list', (error, tweets, response) => {
			tweets.forEach(tweet => {
				if(-1 === unicorn.tweetedIds.indexOf(tweet.id)) {
					if(
						-1 < unicorn.illustrators.indexOf(tweet.user.screen_name.toLowerCase())  &&
						-1 < tweet.text.indexOf('https://t.co/')
					) {
						unicorn.herRoom.send(`https://twitter.com/${tweet.user.screen_name}/status/` + tweet.id_str);
						unicorn.tweetedIds.push(tweet.id);
					}
				}
			});
		});
	}
});
	


// ----------------------------------------------
unicorn.on('message', message => {
	const kawaii  = /^[!]kawaii\s*/;
	const watch   = /^[!]watch @([0-9a-zA-Z_]+)\s*/;
	const unwatch = /^[!]unwatch @([0-9a-zA-Z_]+)\s*/;
	const list    = /^[!]list\s*/;

	if(kawaii.test(message)) {
		message.reply('Thank you, Oni-chan!');
	}

	if(watch.test(message)) {
		let name = watch.exec(message)[1].toLowerCase();
		save(name);
		message.reply(`Yes, I'm watching ${name}, Oni-chan!`);
	}

	if(unwatch.test(message)) {
		let name = unwatch.exec(message)[1].toLowerCase();
		remove(name);
		message.reply(`Yes, I'm unwatching ${name}, Oni-chan!`);
	}

	if(list.test(message)) {
		let list = '';
		
		unicorn.illustrators.forEach(name => {
			list += `${name}\n`;
		});

		message.reply(`I am watching these illustratos\n${list}`);
	}
});



// ----------------------------------------------
unicorn.login(vars.discord.token);


