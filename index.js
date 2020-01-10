const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-flash')());

const http = require("https");
const fs = require("fs");
const path = require("path");


// (async () => {
//     const browser = await puppeteer.launch({
//         headless: false,
//         allowFlash: true,
//         args: [
//             '--window-size=800,600',
//           '--enable-webgl',
//           '--enable-accelerated-2d-canvas',
//         ]
//     });
//     const page = await browser.newPage();

//     page.on('console', m => {
//         // console.log(m.text());
//     });

//     var hostUrl,jsonDataStr;
//     var checkDataString = '<script>window.__playinfo__=';

//     await page.setRequestInterception(true);

//     await page.setViewport({
//         width: 1243, height: 882
//     });

//     page.on('request', async req => {
//         if(req.resourceType() === 'document'){
//             hostUrl = req.url();
//         }
//         await req.continue();

//     });

//     page.on('response', async res => {
//         if (res.url() === hostUrl) {
//             if(res.status() === 200){
//                 jsonDataStr = await res.text();
//                 var startIndex = jsonDataStr.indexOf(checkDataString) + checkDataString.length;
//                 jsonDataStr = jsonDataStr.slice(startIndex);
//                 var endIndex = jsonDataStr.indexOf('</script>');
//                 jsonDataStr = jsonDataStr.slice(0, endIndex);
//                 console.log(jsonDataStr);
//             }

//         }
//     });

//     await page.goto('https://www.bilibili.com/video/av82051548?spm_id_from=333.5.b_686967685f656e65726779.1',{ 
//         waitUntil: 'networkidle2' 
//     });



//     await browser.close();
// })();

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
    var checkDataString = '<script>window.__playinfo__=';

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

    await page.goto(webUrl, {
        waitUntil: 'networkidle2'
    });

    await browser.close();
    return JSON.parse(jsonDataStr);
}





// https://cn-zjjh5-dx-v-07.bilivideo.com/upgcxcode/52/50/71395052/71395052-1-30112.m4s?expires=1578194400&platform=pc&ssig=dYo-mSoMI8xUseRwtslsVA&oi=3030726060&trid=f4af8b75b6d94df08d561c254c13d58eu&nfc=1&nfb=maPYqpoel5MI3qOUX6YpRA==&mid=9303600


var saveFile = function (jsonObj, maxQuality, Referer, step) {
    let start = 0; // 请求初始值
    // step = 5000000; // 每次请求字符个数
    let total; // 文件总长度

    let ws; // 创建可写流


    // var filePath = '/upgcxcode/52/50/71395052/71395052-1-30112.m4s';
    // 请求配置
    let config;
    // let config = {
    //     hostname: 'cn-zjjh5-dx-v-07.bilivideo.com',
    //     path: '/upgcxcode/52/50/71395052/71395052-1-30112.m4s?expires=1578194700&platform=pc&ssig=M_Cl_mtVGmhp7t6bJmPVpw&oi=3030726060&trid=aa4dfc358fdd4f7780d502385690e001u&nfc=1&nfb=maPYqpoel5MI3qOUX6YpRA==&mid=9303600',
    //     headers: {
    //         'Connection': 'keep-alive',
    //         'Origin': 'https://www.bilibili.com',
    //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
    //         'Accept': '*/*',
    //         'Referer': 'https://www.bilibili.com/video/av40654529?from=search&seid=6147326575376036836',
    //         'Accept-Encoding': 'identity',
    //         'Accept-Language': 'zh-CN,zh;q=0.9',
    //         'If-Range': '5dee53ca-80854b80'
    //     }
    // };

    var setOptions = function(jsonObj,maxQuality){
        for(var o of jsonObj){
            if(o.id === maxQuality){
                obj = o;
            }
        }

        var hostName = obj.baseUrl.split('/')[2];

        var configPath = obj.baseUrl.slice(find(obj.baseUrl,'/',2));

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
        var fileName = configPath.slice(configPath.lastIndexOf('/') + 1,configPath.indexOf('?'));
        ws = fs.createWriteStream(path.resolve(__dirname, fileName));
    }

    var find = (str,cha,num) => {
        var x=str.indexOf(cha);
        for(var i=0;i<num;i++){
            x=str.indexOf(cha,x+1);
        }
        return x;
    }

    // 下载函数
    var download = ()=> {
        console.log('start/start+step:', `bytes=${start}-${start + step - 1}`);
        // 配置，每次范围请求 step 个字节
        config.headers.Range = `bytes=${start}-${start + step - 1}`;

        // 维护下次 start 的值
        start += step;

        console.log('config:', config);

        // 发送请求
        http.get(config, res => {

            console.log('res.headers:', res.headers);
            console.log('res.headers["content-range"]:', res.headers["content-range"]);
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

    setOptions(jsonObj, maxQuality);
    download();
}



// download();

var getMaxQuality = (josnData) => {
    var maxQuality;
    for(var o of josnData.data.accept_quality){
        if(maxQuality){
            if(o > maxQuality){
                maxQuality = o;
            }
        }else{
            maxQuality = o;
        }
    }
    return maxQuality;
}




var start = async function (webUrl,step) {
    var josnData = await getBilibiliJsonData(webUrl);
    console.log(josnData);

    var maxQuality = getMaxQuality(josnData);

    saveFile(josnData.data.dash.video, maxQuality, webUrl, step);
    saveFile(josnData.data.dash.audio, maxQuality, webUrl, step);
}

var webUrl = 'https://www.bilibili.com/video/av82051548?spm_id_from=333.5.b_686967685f656e65726779.1';
var step = 5000000;
start(webUrl, step);;

