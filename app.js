const http = require('http');
const fs = require('fs');
const url = require('url');
const etag = require('etag');
http
  .createServer((req, res) => {
    const {pathname} = url.parse(req.url);
    if (pathname === '/') {
      // 解析路由参数
      const data = fs.readFileSync('./index.html');
      res.end(data);
    } else if (pathname === '/image/hexobg.png') {
      const data = fs.readFileSync('./image/hexobg.png');
      res.writeHead(200, {
        // 指定强制缓存过期时间 （注意：浏览器可以禁用缓存）
        /**
         * ====>缺点:
         * 严重依赖客户端时间，当服务器时间与客户端不一致时就会出现问题
         */
        Expires: new Date('2022-12-21 23:59:59').toUTCString() // 绝对时间
      });
      res.end(data);
    } else if (pathname === '/image/01.jpg') {
      const data = fs.readFileSync('./image/01.jpg');
      res.writeHead(200, {
        /**
         * HTTP/1.1 新增了 cache-control字段 相对时间
         */
        'Cache-Control': 'max-age=5' // 相对客户端时间往后多少秒 单位是秒
      });
      res.end(data);
      /* ==========协商缓存开始=========== */
    } else if (pathname === '/image/02.jpg') {
      const {mtime} = fs.statSync('./image/02.jpg');
      /**
       *  mtime 文件最后修改的时间
       * 后续的请求头中都会自动携带If-Modified-Since服务端返回给他的时间(last-modified)
       * 然后 这里再进行判断 时间是否一致，是否需要返回新数据
       * =====>缺点：
       * 1.仅针对文件最后修改的时间来进行判断，若文件虽然进行了编辑但是内容并未发生改变，此时就会导致协商缓存判断失败
       * 2.它针对修改时间的时间戳单位只能精确到秒，如果在1s内完成修改，此时便会判断失败，导致文件无法更新
       */
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince === mtime.toUTCString()) {
        // 缓存生效，表示文件并未修改
        res.statusCode = 304;
        res.end();
        return;
      }
      const data = fs.readFileSync('./image/02.jpg');
      res.setHeader('last-modified', mtime.toUTCString());
      res.setHeader('Cache-Control', 'no-cache');
      res.end(data);
    } else if (pathname === '/image/03.jpg') {
      /**
       * 基于etag来进行协商缓存
       * 基于不同资源进行哈希运算所生成的一个字符串
       * 该字符串只要文件内容编码存在差异，etag必定发生改变
       * 后续所有请求都会携带请求头 If-None-Match 将响应传递的etag值带过来
       * =====>缺点：
       * 生成etag需要消耗额外的性能
       * 强验证（需要完全匹配）和弱验证（自定义部分匹配，但这样又可能匹配不上）按需选择
       */
      const data = fs.readFileSync('./image/03.jpg');
      const etagContent = etag(data);
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch === etagContent) {
        res.statusCode = 304;
        res.end();
        return;
      }
      res.setHeader('etag', etagContent);
      res.setHeader('Cache-Control', 'no-cache');
      res.end(data);
    } else {
      /**
       * 如果直接将Cache-Control设置为 no-store 则表示不适用缓存
       */
      res.statusCode = 404;
      res.end();
    }
  })
  .listen(3000, () => {
    console.log('http://localhost:3000');
  });
