const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// 允许跨域访问
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 静态文件服务
app.use(express.static('./'));
app.use('/vertopal_51be1960111d4d73b70357734a55109b/media', express.static('vertopal_51be1960111d4d73b70357734a55109b/media'));
app.use('/media', express.static('media'));
app.use('/images', express.static('images'));

// 获取题目内容接口,只处理test.md
app.get('/questions', (req, res) => {
    try {
        const filename = 'test.md'; // 固定为test.md
        
        // 检查文件是否存在
        if (!fs.existsSync(filename)) {
            return res.status(404).json({ error: '题库文件不存在。请确保test.md文件位于程序根目录。' });
        }
        
        const content = fs.readFileSync(filename, 'utf-8');
        res.json({ content });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// 检查题库文件是否有更新的接口
app.get('/check-updates', (req, res) => {
    try {
        const filename = 'test.md'; // 固定为test.md

        // 检查文件是否存在
        if (!fs.existsSync(filename)) {
            return res.status(404).json({ error: 'File not found', lastModified: 0 });
        }

        const stats = fs.statSync(filename);
        const lastModified = stats.mtimeMs;
        res.json({ lastModified });
    } catch (error) {
        console.error('Error checking file updates:', error);
        res.status(500).json({ error: 'Failed to check updates', lastModified: 0 });
    }
});

const defaultPort = 3000;

// 设置服务器启动函数
function startServer(port) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port)
            .on('listening', () => {
                console.log(`服务器成功运行在 http://localhost:${port}`);
                
                // 检查题库文件是否存在 
                if (fs.existsSync('test.md')) {
                    console.log('题库文件已找到: test.md');
                } else {
                    console.warn('警告: 题库文件test.md不存在');
                    console.log('请确保test.md文件位于程序根目录');
                }
                resolve(server);
            })
            .on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`端口 ${port} 已被占用, 尝试其他端口...`);
                    reject(err);
                } else {
                    console.error('服务器启动失败:', err);
                    reject(err);
                }
            });
    });
}

// 尝试在不同端口启动
async function tryStartServer() {
    let port = defaultPort;
    const maxPort = defaultPort + 10; // 尝试10个端口
    
    while (port <= maxPort) {
        try {
            await startServer(port);
            // 如果成功启动，更新客户端连接端口
            return port;
        } catch (error) {
            // 如果是端口被占用错误，尝试下一个端口
            if (error.code === 'EADDRINUSE') {
                port++;
            } else {
                // 其他错误则停止尝试
                console.error('服务器启动失败:', error);
                process.exit(1);
            }
        }
    }
    
    console.error(`无法启动服务器: 端口 ${defaultPort} 到 ${maxPort} 均被占用`);
    process.exit(1);
}

// 启动服务器
tryStartServer().then(port => {
    // 为了允许客户端知道实际使用的端口，可以创建一个端点
    app.get('/server-info', (req, res) => {
        res.json({ port });
    });
}).catch(err => {
    console.error('服务器启动过程中出现错误:', err);
});