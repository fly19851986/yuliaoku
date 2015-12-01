/*
* Requires
*/
var Q = require('q');
var fs = require('fs');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
/*
* 数据说明:
* ./data/ 下为数据文件：
* 	c3t1.markdown : 第三章 Test1 的练习
*		a-c3t1.markdown : 第三章 Test1 的答案
*/


/*
* 启动命令为 result ，则查找 ./data/ 下日期最新的 a-* 以及对应的 * 文件
*
*	输出：
* 章节		第几次		正确率
* c3t1   1        60%
* 错误记录
* air=空气=abc
* board=木板=ab
*/


/*
* 启动命令为 result c3t1 ，则核对指定的章节
* 
* 输出：
* 章节		第几次		正确率
* c3t1   1        60%
* 错误记录
* air=空气=abc
* board=木板=ab
*/


/*
* 
* 数据库 - result
* 章节		次数		最新正确率		错误记录(array)
* c3t1   1      60%     [{num:1,date:2015-12-01,rate:30%,body:air=空气=abc/nboard=木板=bd}]
*
* 
*/
var resultSchema = new Schema({
	chapter: String,
	times: Number,
	rate: String,
	record: [{num: Number, date: String, rate: String, body: String}],
});

/*resultSchema.statics.update = function (chapter, callback) {

}*/

var DBresult = mongoose.model('DBresult', resultSchema);

//DBresult.update()
/*
* 数据库 - words
* 单词   章节    次数   正确次数    错误次数    时间记录(array)
* air   c3t1     5     5          0       [2015-11-30,2015-11-30,2015-12-01,2015-12-01,2015-12-01]
*/
var wordSchema = new Schema({
	word: String,
	chapter: String,
	times: Number,
	rtimes: Number,
	wtimes: Number,
	timerecord: [String],
})

var DBword = mongoose.model('DBword', wordSchema);

// 全局变量
var chapterTitle, answerTitle;
var resultString = '';
var totalNum = 0, rightNum = 0;
var rate = 0;

var chapterArray, answerArray;

function printFileContent(src) {
	var defer = Q.defer();
	fs.readFile('./data/' + src + '.markdown','utf8', function(err, data) {
		if (!err && data) {
			if(src.indexOf('a-') !== -1) {

				answerArray = tokenize(data);
				// console.log('答案行数' + answerArray.length);
			} else {

				chapterArray = tokenize(data);
				// console.log('练习行数' + chapterArray.length);
			}

			console.log('file : ' + src + ' success');
			defer.resolve(src + ' success ');
		} else {

			console.log('file : ' + src + ' fail');
			defer.reject(src + ' fail ');
		}

		/*if (err) throw err;

		console.log('read ' + src);
		return data;*/
	});
	return defer.promise;
}

var tokenize = function(value) {
  var retLines = [],
      linesAndNewlines = value.split(/(\n|\r\n)/);

  // Ignore the final empty token that occurs if the string ends with a new line
  var length = linesAndNewlines.length;
  //console.log('length = ' + length);
  for (var i = (length - 1); i >= 0; i --) {
    if(!linesAndNewlines[i]){
	    linesAndNewlines.pop();
    }
  }

  // Merge the content and line separators into single tokens
  for (var i = 0; i < linesAndNewlines.length; i++) {
    var line = linesAndNewlines[i].trim();
  	// line = line.trim();

    if (i % 2 && !false){

    	retLines[retLines.length - 1] += line;
  		
  	} else {
  		if(typeof line === 'string'){
  			if( !( line.startsWith('\n') | line.startsWith('\r\n') | line === '') ){
  				//console.log('will push *' + line + '*');
    			retLines.push(line);
  			}	
  		}
  		
  	}
  }

  return retLines;
};

function handleDatas(){
		console.log('start handle datas');

		if(chapterArray.length === answerArray.length) {

			totalNum = chapterArray.length;
			//console.log('行数 = ' + totalNum);
			//DBresult
			var dbresult = {
				chapter: chapterTitle,
				rate: '',
				record: '',
			};
			// array of DBword
			var dbwords = [
			// {
				// word: '',
				// chapter: chapterTitle,
				// rtimes: 0,
				// wtimes: 0,
				// time: '',
			// }
			];

			for(var i = 0; i < totalNum; i ++) {
				//air=空气
				var answerWord = answerArray[i].split('=');
				//2015-12-01
				var today = new Date(Date.now());
				var dbword = {
					word: answerWord[0],
					chapter: chapterTitle,
					rtimes: 0,
					wtimes: 0,
					time: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
				};

				if(chapterArray[i] !== answerWord[0]) {
					//console.log('chapter ' + i + ':' + chapterArray[i] +' '+ answerWord[0]);
					//air=空气=abc/n
					dbword.wtimes = 1;
					resultString = resultString + answerArray[i] + '=' + chapterArray[i] + '\n';
				} else {
					dbword.rtimes = 1;
					rightNum ++;
				}

				dbwords.push(dbword);

			}

			if(rightNum) {
				rate = (( rightNum / totalNum ) * 100).toFixed(1);
			} else {
				rate = 0;
			}
			dbresult.rate = rate;
			dbresult.record = resultString;
			//console.log('正确率 = ' + rate + '%');
			//console.log(resultString);
			console.log('hadle data success');
			try {
				saveToDB(dbresult, dbwords); 

			} catch (e) {
				console.error(e);
			}
		} else {
			console.log('两个文件行数不同');
		}
}
/*
* save data to db:
* params:
* 	
*/
function saveToDB(dbresult, dbwords) {
	//数据库
	mongoose.connect('mongodb://localhost/ylkdb');

	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function (callback) {
		//
		console.log('db connect success');

		Q.all([saveToDBresult(dbresult), saveToDBword(dbwords)])
			.then(function(success) {
				console.log('db save all success');
				db.close();
				mongoose.disconnect();
			})


		/*var defer = Q.defer();

		if( ) {
			defer.resolve('saveToDBresult success ');
		} else {
			defer.reject('saveToDBresult fail ');
		}

		return defer.promise;*/
		
	});
}

function saveToDBresult(dbresult) {
	var defer = Q.defer();

	DBresult.findOne({ chapter: dbresult.chapter }, function (err, result) {

			if (err) return console.error(err);
			
			var today = new Date(Date.now());
			var todayString = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(); 

			if (result){
				//there's already one record in database.
				console.log("find this : " + result);

				result.times = result.times + 1;
				result.rate = dbresult.rate;
				var temp = {
					num: result.times,
					date: todayString,
					rate: dbresult.rate,
					body: dbresult.record
				};

				result.record.push(temp);

				DBresult.update(
					{ chapter: dbresult.chapter }, 
					{
						times: result.times,
						rate: result.rate,
						record: result.record
					}, 
					function (err, result) {
					if (err) return console.error(err);

					console.log('result saved success. ' );
					
					defer.resolve('saveToDBresult success ');
					
					//db.close();
				});

			} else {
				//there's NOT ANY record in database.
				console.log("cannot find this result : " + dbresult.chapter);
				var temp = new DBresult ({
					chapter: dbresult.chapter,
					times: 1,
					rate: dbresult.rate,
					record: [
						{
							num: 1,
							date: todayString,
							rate: dbresult.rate,
							body: dbresult.record
						}
					]
				});

				temp.save(function (err, result) {
						if (err) return console.error(err);

						console.log('created : ' + result);

						defer.resolve('saveToDBresult success ');
						//db.close();
				});
			}
			

		});
		return defer.promise;

}


function saveToDBword(dbwords) {
	var defer = Q.defer();
	defer.resolve('saveToDBwords success ');
	return defer.promise;
}

function main(argv) {

	if(argv[0]) {
		chapterTitle = argv[0];
		
	} else {
		//找日期最近的文件
		chapterTitle = 'c3t1';
	}
		
	answerTitle = 'a-' + chapterTitle;

	Q.all([printFileContent(chapterTitle), printFileContent(answerTitle)])
		.then(function(success) {
			try {
				handleDatas();

			} catch (e) {
				console.error(e);
			}
		});




	
}

main(process.argv.slice(2));












