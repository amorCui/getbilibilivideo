const puppeteer = require('puppeteer');

const http = require("https");
const fs = require("fs");
const path = require("path");

const cookiesObj = require("./cookies");

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

    var hostUrl, jsonDataStr;
    var checkDataString = '<script>' + 'window.__playinfo__=';

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
                jsonDataStr = await res.text();
                var startIndex = jsonDataStr.indexOf(checkDataString) + checkDataString.length;
                jsonDataStr = jsonDataStr.slice(startIndex);
                var endIndex = jsonDataStr.indexOf('</script>');
                jsonDataStr = jsonDataStr.slice(0, endIndex);
                // console.log(jsonDataStr);
            }

        }
    });

    await addCookies(cookiesObj.str, page, webUrl.split('/')[2]);

    await page.goto(webUrl, {
        waitUntil: 'networkidle2'
    });

    await browser.close();
    return JSON.parse(jsonDataStr);
}

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

//type 0 video,1 audio
var saveFile = async function (mediaObj, type, maxQuality, Referer, step) {
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
        var fileName = configPath.slice(configPath.lastIndexOf('/') + 1, configPath.indexOf('?'));
        ws = fs.createWriteStream(path.resolve(__dirname, fileName + '.mp4'));
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
        http.get(config, res => {
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




var start = async function (webUrl, step) {
    var josnData = await getBilibiliJsonData(webUrl);

    var maxQuality = getMaxQuality(josnData);
    console.log('download video');
    await saveFile(josnData.data, 0, maxQuality, webUrl, step);
    console.log('download audio');
    await saveFile(josnData.data, 1, maxQuality, webUrl, step);
}

var webUrl = 'https://www.bilibili.com/bangumi/play/ep292951';
var step = 5000000;
start(webUrl, step);;

