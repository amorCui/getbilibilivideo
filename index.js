const http = require("https");
var fs = require("fs");
const path = require("path");

//expires=1578185100&platform=pc&ssig=JaavIgtG0GYvi1P0rK1h-w&oi=3030726060&trid=893d4d4ee85a424a9b2e70a894cee193u&nfc=1&nfb=maPYqpoel5MI3qOUX6YpRA==&mid=9303600
// var contents = querystring.stringify({
// 	expires: 1578185100,
// 	platform: 'pc',
// 	ssig: 'JaavIgtG0GYvi1P0rK1h-w',
// 	oi: 3030726060,
// 	trid: '893d4d4ee85a424a9b2e70a894cee193u',
// 	nfc: 1,
// 	nfb: 'maPYqpoel5MI3qOUX6YpRA==',
// 	mid: 9303600
// });



https://cn-zjjh5-dx-v-07.bilivideo.com/upgcxcode/52/50/71395052/71395052-1-30112.m4s?expires=1578194400&platform=pc&ssig=dYo-mSoMI8xUseRwtslsVA&oi=3030726060&trid=f4af8b75b6d94df08d561c254c13d58eu&nfc=1&nfb=maPYqpoel5MI3qOUX6YpRA==&mid=9303600
var filePath = '/upgcxcode/52/50/71395052/71395052-1-30112.m4s';
// 请求配置
let config = {
    hostname: 'cn-zjjh5-dx-v-07.bilivideo.com',
	path: '/upgcxcode/52/50/71395052/71395052-1-30112.m4s?expires=1578194700&platform=pc&ssig=M_Cl_mtVGmhp7t6bJmPVpw&oi=3030726060&trid=aa4dfc358fdd4f7780d502385690e001u&nfc=1&nfb=maPYqpoel5MI3qOUX6YpRA==&mid=9303600',
	headers: {
		'Connection': 'keep-alive',
		'Origin': 'https://www.bilibili.com',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
		'Accept': '*/*',
		'Referer': 'https://www.bilibili.com/video/av40654529?from=search&seid=6147326575376036836',
		'Accept-Encoding': 'identity',
		'Accept-Language': 'zh-CN,zh;q=0.9',
		'If-Range': '5dee53ca-80854b80'
	}
};

let start = 0; // 请求初始值
let step = 5000000; // 每次请求字符个数
// let pause = false; // 暂停状态
let total; // 文件总长度



// 创建可写流
let ws = fs.createWriteStream(path.resolve(__dirname, filePath.slice(filePath.lastIndexOf('/') + 1)));


// 下载函数
function download() {
	console.log('start/start+step:',`bytes=${start}-${start + step - 1}`);
    // 配置，每次范围请求 step 个字节
    config.headers.Range =`bytes=${start}-${start + step - 1}`;

    // 维护下次 start 的值
	start += step;
	
	console.log('config:',config);

    // 发送请求
    http.get(config, res => {

		console.log('res.headers:',res.headers);
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

// 监控输入
// process.stdin.on("data", data => {
// 	console.log('data',data);
//     // 获取指令
//     let ins = data.toString().match(/(\w*)\/r/)[1];
//     switch (ins) {
//         case "s":
//         case "r":
// 			pause = false;
// 			console.log('ins',ins);
//             download();
//             break;
//         case "p":
//             pause = true;
//             break;
//     }
// });

download();