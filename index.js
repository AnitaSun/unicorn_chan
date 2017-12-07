const vars    = require('./vars');

const Discord = require('discord.js');
let   unicorn = new Discord.Client();
const Twitter = require('twitter');
const twitter = new Twitter(vars.twitter.keys);
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
		if(createIllustratorTable())
			return [];

		console.log('illustrator table creation failed');
		process.exit(1);
	}
}


async function saveIllustrator(name) {
	try {
		let exist = await knex('illustrators').where('name', '=', name);

		if(exist.length == 0) {
			unicorn.illustrators.push(name);
			await knex('illustrators').insert({name: name});
		}

	} catch(e) {
		console.log('illustrator saving failed');
		process.exit(1);
	}
}


async function removeIllustrator(name) {
	try {
		let exist = await knex('illustrators').where('name', '=', name);

		if(exist.length != 0) {
			unicorn.illustrators.splice(unicorn.illustrators.indexOf(name), 1);
			
			await knex('illustrators').where({name: name}).del();
		}

	} catch(e) {
		console.log('illustrator deletion failed');
		process.exit(1);
	}
}


async function createIllustratorTable() {
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


async function getTweetedIds() {
	try {
		let table = await knex('tweeted_ids');
		let tweetedIds = [];
		Object.keys(table).forEach(line => {
			tweetedIds.push(table[line].tweeted_id);
		});

		return tweetedIds;

	} catch(e) {
		if(createTweetedIdsTable())
			return [];

		console.log('tweetid table creation failed');
		process.exit(1);
	}
}


async function saveTweetedId(tweeted_id) {
	try {
		let exist = await knex('tweeted_ids').where('tweeted_id', '=', tweeted_id);

		if(exist.length == 0) {
			unicorn.tweetedIds.push(tweeted_id.toString());
			await knex('tweeted_ids').insert({tweeted_id: tweeted_id});
		}

	} catch(e) {
		console.log('tweetid saving failed');
		process.exit(1);
	}
}


async function createTweetedIdsTable() {
	try {
		await knex.schema.createTable('tweeted_ids', function(table) {
			table.increments();
			table.string('tweeted_id', 128);
			table.timestamps();
		});

		return true;

	} catch (e) {
		return false;
	}
}




// ----------------------------------------------
unicorn.on('ready', async () => {
	unicorn.tweetedIds   = await getTweetedIds();
	unicorn.illustrators = await getIllustrators();
	unicorn.herRoom      = unicorn.channels.get(vars.discord.channelId);
	
	setInterval(
		() => { fav(); },
		vars.twitter.interval
	);
	
	async function fav() {
		twitter.get('favorites/list', {count: `${vars.twitter.count}`}, (error, tweets, response) => {
			tweets.forEach(async (tweet) => {

				if(-1 === unicorn.tweetedIds.indexOf(tweet.id.toString())) {
					if(
						-1 < unicorn.illustrators.indexOf(tweet.user.screen_name.toLowerCase())  &&
						-1 < tweet.text.indexOf('https://t.co/')
					) {
						unicorn.herRoom.send(`https://twitter.com/${tweet.user.screen_name}/status/` + tweet.id_str);
						await saveTweetedId(tweet.id);
					}
				}
			});
		});
	}
});
	


// ----------------------------------------------
unicorn.on('message', message => {
	const kawaii   = /^[!]kawaii$/;
	const kawaiine = /^[!]kawaiine$/;
	const nya      = /^[!]nya$/;
	const watch    = /^[!]watch @([0-9a-zA-Z_]+)\s*/;
	const unwatch  = /^[!]unwatch @([0-9a-zA-Z_]+)\s*/;
	const list     = /^[!]list\s*/;

	if(kawaii.test(message)) {
		message.reply('Thank you, Oni-chan!');
	}

	if(kawaiine.test(message)) {
		message.reply('Thank you, One-chan!');
	}

	if(nya.test(message)) {
		message.reply('Nya!');
	}

	if(watch.test(message)) {
		let name = watch.exec(message)[1].toLowerCase();
		saveIllustrator(name);
		message.reply(`Yes, I'm watching ${name}, Oni-chan!`);
	}

	if(unwatch.test(message)) {
		let name = unwatch.exec(message)[1].toLowerCase();
		removeIllustrator(name);
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


