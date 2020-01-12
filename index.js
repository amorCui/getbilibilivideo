const puppeteer = require('puppeteer');

const http = require("https");
const fs = require("fs");
const path = require("path");

const cookiesObj = require("./cookies");

const ffmpeg = require('fluent-ffmpeg');

/**
 * get message in webDriver by url using puppeteer
 * @param {*} webUrl 
 */
var getBilibiliJsonData = async function (webUrl) {
    const browser = await puppeteer.launch({
        headless: false,
        allowFlash: true,
        args: [
            '--window-size=800,600',
            '--enable-webgl',
            '--enable-accelerated-2d-canvas',
        ]
    });
    const page = await browser.newPage();

    page.on('console', m => {
        // console.log(m.text());
    });

    var hostUrl;
    var playInfoDataStrSubStart = '<script>' + 'window.__playinfo__=';
    var playInfoDataStrSubEnd = '</script>';
    var initialStateDataStrSubStart = '<script>' + 'window.__INITIAL_STATE__=';
    var initialStateDataStrSubEnd = ';(function()';

    var playInfoDataStr,initialStateDataStr;

    await page.setRequestInterception(true);

    await page.setViewport({
        width: 1243, height: 882
    });

    page.on('request', async req => {
        if (req.resourceType() === 'document') {
            hostUrl = req.url();
        }
        await req.continue();

    });

    page.on('response', async res => {
        if (res.url() === hostUrl) {
            if (res.status() === 200) {
                var dataStr = await res.text();
                // var playInfoStartIndex = dataStr.indexOf(playInfoDataStrSubStart) + playInfoDataStrSubStart.length;
                // playInfoDataStr = dataStr.slice(playInfoStartIndex);
                // var playInfoEndIndex = playInfoDataStr.indexOf('</script>');
                // playInfoDataStr = playInfoDataStr.slice(0, playInfoEndIndex);
                
                playInfoDataStr = getJsonDataStr(playInfoDataStrSubStart, playInfoDataStrSubEnd, dataStr);
                initialStateDataStr = getJsonDataStr(initialStateDataStrSubStart, initialStateDataStrSubEnd, dataStr);
                // var initialStateStartIndex = 
                // console.log(jsonDataStr);
            }

        }
    });

    await addCookies(cookiesObj.str, page, webUrl.split('/')[2]);

    await page.goto(webUrl, {
        waitUntil: 'networkidle2'
    });

    await browser.close();

    // console.log('initialStateDataStr',initialStateDataStr);
    var rstJson = {
        playInfo: JSON.parse(playInfoDataStr),
        initialState: JSON.parse(initialStateDataStr)
    }

    return rstJson;
}

/**
 * 
 * @param {*} subStart  截取字符串的头
 * @param {*} subEnd    截取字符串的尾部
 * @param {*} dataStr 数据字符串
 */
var getJsonDataStr = (subStart, subEnd, dataStr) =>{
    var dataStr;
    var startIndex = dataStr.indexOf(subStart) + subStart.length;
    dataStr = dataStr.slice(startIndex);
    var endIndex = dataStr.indexOf(subEnd);
    dataStr = dataStr.slice(0, endIndex);
    return dataStr;
}

/**
 * add cookies by cookies string
 * @param {*} cookies_str cookies string
 * @param {*} page page of puppeteer
 * @param {*} domain domain url
 */
var addCookies = async function (cookies_str, page, domain) {
    let cookies = cookies_str.split(';').map(
        pair => {
            let name = pair.trim().slice(0, pair.trim().indexOf('='));
            let value = pair.trim().slice(pair.trim().indexOf('=') + 1);
            return { name, value, domain }
        });
    await Promise.all(cookies.map(pair => {
        // console.log(pair);
        return page.setCookie(pair)
    }));
}

/**
 * save audio and video file
 * @param {*} mediaObj  媒体的地址信息，用于下载
 * @param {*} initialState 媒体的文本信息，例如文件名等
 * @param {*} type type 0:video,1 audio
 * @param {*} maxQuality 媒体的最大清晰度
 * @param {*} Referer referer path
 * @param {*} step range step
 */
var saveFile = async function (mediaObj, initialState, type, maxQuality, Referer, step) {
    var fileName;
    let start = 0; // 请求初始值
    // step = 5000000; // 每次请求字符个数
    let total; // 文件总长度

    let ws; // 创建可写流

    // 请求配置
    let config;

    var setOptions = function (jsonObj, maxQuality) {
        var obj;
        var maxObj;
 
        for (var o of jsonObj) {
            if (o.id === maxQuality) {
                obj = o;
            }
            if(!maxObj){
                maxObj = o;
            }else{
                if(o > maxObj){
                    maxObj = o;
                }
            }
        }

        //不存在对应id的话，取id最大的
        if(!obj){
            obj = maxObj;
        }

        var baseUrl;
        // console.log('obj',obj);
        if(obj.baseUrl){
            baseUrl = obj.baseUrl;
        }else if(obj.base_url){
            baseUrl = obj.base_url;
        }

        var hostName = baseUrl.split('/')[2];

        var configPath = baseUrl.slice(find(baseUrl, '/', 2));

        config = {
            hostname: hostName,
            path: configPath,
            headers: {
                'Connection': 'keep-alive',
                'Origin': 'https://www.bilibili.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
                'Accept': '*/*',
                'Referer': Referer,
                'Accept-Encoding': 'identity',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'If-Range': '5dee53ca-80854b80'
            }
        }
        // fileName = configPath.slice(configPath.lastIndexOf('/') + 1, configPath.indexOf('?')) + '.mp4';
        fileName = initialState.h1Title;
        fileName += type === 0? '_video': '_audio';
        fileName += type === 0? '.mp4': '.mp3';
        ws = fs.createWriteStream(path.resolve(__dirname, fileName));

        // ws.on('drain',function () {
        //     console.error("内存炸了");
        // });
    }

    var find = (str, cha, num) => {
        var x = str.indexOf(cha);
        for (var i = 0; i < num; i++) {
            x = str.indexOf(cha, x + 1);
        }
        return x;
    }

    // 下载函数
    var download = () => {
        // 配置，每次范围请求 step 个字节
        config.headers.Range = `bytes=${start}-${start + step - 1}`;

        // 维护下次 start 的值
        start += step;
        // console.log('config:', config);
        // 发送请求
        http.get(config,res => {
            // console.log('res.headers:', res.headers);
            // console.log('res.headers["content-range"]:', res.headers["content-range"]);
            // 获取文件总长度
            if (typeof total !== "number") {
                total = res.headers["content-range"].match(/\/(\d*)/)[1];
            }

            // 读取返回数据
            let buffers = [];
            res.on("data", data => buffers.push(data));
            res.on("end", () => {
                // 合并数据并写入文件
                let buf = Buffer.concat(buffers);
                ws.write(buf);

                // 递归进行下一次请求
                // if (!pause && start < total) {
                if (start < total) {
                    download();
                }else{
                    switch (type){
                        case 0:
                            console.log('video download finish');
                            ws.end();//结束，如果调用end,会强制将内存中的内容全部写入，然后关闭文件
                            break;
                        case 1:
                            console.log('audio download finish');
                            ws.end();
                            break;
                        default:
                            break;
                    }
                }
            });
        }).end();
    }
    switch (type) {
        case 0:
            setOptions(mediaObj.dash.video, maxQuality);
            break;
        case 1:
            setOptions(mediaObj.dash.audio, maxQuality);
            break;
        default:
            break;
    }

    download();
    return fileName;
}



// download();

var getMaxQuality = (josnData) => {
    var maxQuality;
    for (var o of josnData.data.accept_quality) {
        if (maxQuality) {
            if (o > maxQuality) {
                maxQuality = o;
            }
        } else {
            maxQuality = o;
        }
    }
    return maxQuality;
}

var mergeFile = function(videoPath,audioPath,outputPath){
    var command = ffmpeg();

    var flagOptions = [
        {
            flag: 25,
            value : true
        },
        {
            flag: 50,
            value : true
        },
        {
            flag: 75,
            value : true
        },
        {
            flag: 100,
            value : true
        }
    ];
    // console.log(command);
    
    command.input(videoPath)
        .input(audioPath)
        .ffprobe(0,
          function(err, data) {
            // console.log('file1 metadata:');
            // console.dir(data);
          });
    
    command
        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', function (err, stdout, stderr) {
            console.log('Cannot process video: ' + err.message);
            console.log('Cannot process video: ' + err.stack);
        })
        .on('progress', function(progress) {
            for(var flagOption of flagOptions){
                if( flagOption.value && progress.percent >= flagOption.flag ){
                    console.log('Processing: ' + flagOption.flag + '% done');
                    flagOption.value = false;
                }
            }
        })
        .save(path.resolve(__dirname, outputPath));
}


var start = async function (webUrl, step) {
    var josnData = await getBilibiliJsonData(webUrl);
    var playInfo = josnData.playInfo;
    var initialState = josnData.initialState;
    var maxQuality = getMaxQuality(playInfo);
    console.log('download video');
    var videoName = await saveFile(playInfo.data, initialState, 0, maxQuality, webUrl, step);
    console.log('video Name:', videoName);
    console.log('download audio');
    var audioName = await saveFile(playInfo.data, initialState, 1, maxQuality, webUrl, step);
    console.log('audio Name:', audioName);

    // mergeFile(videoName, audioName, initialState.h1Title);
}

var webUrl = 'https://www.bilibili.com/bangumi/play/ep292951';
var step = 5000000;
start(webUrl, step);;

